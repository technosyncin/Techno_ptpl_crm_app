import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/common/Header';
import { SearchBar } from '../../components/common/SearchBar';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import { CommonListCard } from '../../components/cards/CommonListCard';
import { MobileDropdown, DropdownOption } from '../../components/common/MobileDropdown';
import { leadService } from '../../api/leadService';
import { creditService, CreditCustomer } from '../../api/creditService';
import { useCompany } from '../../context/CompanyContext';
import { Colors } from '../../theme/colors';

interface CreditMasterScreenProps {
  navigation: any;
  route?: any;
}

export interface CreditItem {
  creditProfileID?: number;
  leadId: number;
  leadName: string;
  companyName?: string;
  customerCode: string;
  creditLimit: number;
  creditDays: number;
  warningDays: number;
  riskRating: 'Low' | 'Medium' | 'High' | string;
  accountStatus: 'active' | 'hold' | 'blocked' | string;
  referencePersonName?: string;
  referenceMobileNumber?: string;
  usedCredit?: number;
  availableCredit?: number;
  totalOutstanding?: number;
  lastPaymentAmount?: number;
  lastPaymentDate?: string | null;
  hasProfileInDb?: boolean;
}

const RISK_OPTIONS = [
  { label: 'Low', value: 'Low', color: Colors.success, bg: '#e8f5e9' },
  { label: 'Medium', value: 'Medium', color: '#d39e00', bg: '#fffde7' },
  { label: 'High', value: 'High', color: Colors.danger, bg: '#ffebee' },
];

const STATUS_OPTIONS = [
  { label: 'Active', value: 'active', color: Colors.success, bg: '#e8f5e9' },
  { label: 'Hold', value: 'hold', color: '#d39e00', bg: '#fffde7' },
  { label: 'Blocked', value: 'blocked', color: Colors.danger, bg: '#ffebee' },
];

type FilterType = 'ALL' | 'ACTIVE' | 'HOLD' | 'BLOCKED' | 'HIGH_RISK';

export const CreditMasterScreen: React.FC<CreditMasterScreenProps> = ({
  navigation,
  route,
}) => {
  const { selectedCompanyId } = useCompany();

  // List states
  const [items, setItems] = useState<CreditItem[]>([]);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Edit / Configure Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditingExisting, setIsEditingExisting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fetchingDetails, setFetchingDetails] = useState(false);

  // Form Fields
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [formLeadName, setFormLeadName] = useState('');
  const [formCustomerCode, setFormCustomerCode] = useState('');
  const [formCreditLimit, setFormCreditLimit] = useState('0');
  const [formCreditDays, setFormCreditDays] = useState('0');
  const [formWarningDays, setFormWarningDays] = useState('12');
  const [formRiskRating, setFormRiskRating] = useState('Low');
  const [formAccountStatus, setFormAccountStatus] = useState<'active' | 'hold' | 'blocked'>('active');
  const [formRefPerson, setFormRefPerson] = useState('');
  const [formRefMobile, setFormRefMobile] = useState('');
  const [liveUsedCredit, setLiveUsedCredit] = useState(0);
  const [liveTotalOutstanding, setLiveTotalOutstanding] = useState(0);
  const [liveLastPaymentAmt, setLiveLastPaymentAmt] = useState(0);
  const [liveLastPaymentDate, setLiveLastPaymentDate] = useState<string | null>(null);

  // Delete modal state
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletingItem, setDeletingItem] = useState<CreditItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ============================================================
  // LOAD DATA (MERGE LEADS & CREDIT PROFILES)
  // ============================================================
  const loadData = useCallback(async () => {
    try {
      const companyId = Number(selectedCompanyId) || 0;

      // 1. Fetch leads
      const leadParams: any = { page: 1, pageSize: 1000 };
      if (companyId > 0) leadParams.companyId = companyId;

      let rawLeads: any[] = [];
      try {
        const leadRes = await leadService.getLeads(leadParams);
        if (leadRes?.data && Array.isArray(leadRes.data)) {
          rawLeads = leadRes.data;
        } else if (Array.isArray(leadRes)) {
          rawLeads = leadRes;
        }
      } catch (err) {
        console.warn('Lead fetch warning in Credit Master:', err);
      }

      // 2. Fetch existing credit profiles
      let rawProfiles: any[] = [];
      try {
        rawProfiles = await creditService.getAllCreditProfiles(companyId > 0 ? companyId : undefined);
      } catch (err) {
        console.warn('Credit profile fetch warning:', err);
      }

      // Map profiles by LeadID
      const profilesByLeadId = new Map<number, any>();
      rawProfiles.forEach((p) => {
        const lId = p.leadID || p.LeadID || p.leadId;
        if (lId) {
          // If companyId matches or not filtered, record it
          if (!companyId || p.companyID === companyId || p.CompanyID === companyId) {
            profilesByLeadId.set(Number(lId), p);
          } else if (!profilesByLeadId.has(Number(lId))) {
            profilesByLeadId.set(Number(lId), p);
          }
        }
      });

      // 3. Assemble unified list
      const seenLeadIds = new Set<number>();
      const unifiedList: CreditItem[] = [];

      rawLeads.forEach((lead: any) => {
        const lId = Number(lead.leadID || lead.leadId || lead.id);
        if (!lId || seenLeadIds.has(lId)) return;
        seenLeadIds.add(lId);

        const profile = profilesByLeadId.get(lId);
        const name = (lead.leadName || lead.companyName || `Lead #${lId}`).trim();
        const limit = profile ? Number(profile.creditLimit ?? profile.CreditLimit ?? 0) : 0;
        const used = profile ? Number(profile.usedCredit ?? profile.UsedCredit ?? 0) : 0;
        const days = profile ? Number(profile.creditDays ?? profile.CreditDays ?? 0) : 0;
        const warning = profile ? Number(profile.warningDays ?? profile.WarningDays ?? 12) : 12;
        const risk = profile ? (profile.riskRating || profile.RiskRating || 'Low') : 'Low';
        const status = profile ? (profile.accountStatus || profile.AccountStatus || 'active').toLowerCase() : 'active';
        const refPerson = profile ? (profile.referencePersonName || profile.ReferencePersonName || '') : '';
        const refMobile = profile ? (profile.referenceMobileNumber || profile.ReferenceMobileNumber || '') : (lead.mobileNumber || lead.phone || '');

        unifiedList.push({
          creditProfileID: profile?.creditProfileID || profile?.CreditProfileID,
          leadId: lId,
          leadName: name,
          companyName: lead.companyName || '',
          customerCode: `C00${lId}`,
          creditLimit: limit,
          creditDays: days,
          warningDays: warning,
          riskRating: risk,
          accountStatus: status,
          referencePersonName: refPerson,
          referenceMobileNumber: refMobile,
          usedCredit: used,
          availableCredit: profile ? (profile.availableCredit ?? profile.AvailableCredit ?? (limit - used)) : limit,
          totalOutstanding: profile ? (profile.totalOutstanding ?? profile.TotalOutstanding ?? used) : 0,
          lastPaymentAmount: profile ? (profile.lastPaymentAmount ?? profile.LastPaymentAmount ?? 0) : 0,
          lastPaymentDate: profile ? (profile.lastPaymentDate ?? null) : null,
          hasProfileInDb: Boolean(profile?.creditProfileID || profile?.CreditProfileID),
        });
      });

      // Also append any profiles that weren't in the lead list
      profilesByLeadId.forEach((profile, lId) => {
        if (!seenLeadIds.has(lId)) {
          seenLeadIds.add(lId);
          const limit = Number(profile.creditLimit ?? profile.CreditLimit ?? 0);
          unifiedList.push({
            creditProfileID: profile.creditProfileID || profile.CreditProfileID,
            leadId: lId,
            leadName: profile.customerName || profile.CustomerName || `Customer #${lId}`,
            companyName: profile.companyName || '',
            customerCode: `C00${lId}`,
            creditLimit: limit,
            creditDays: Number(profile.creditDays ?? profile.CreditDays ?? 0),
            warningDays: Number(profile.warningDays ?? profile.WarningDays ?? 12),
            riskRating: profile.riskRating || profile.RiskRating || 'Low',
            accountStatus: (profile.accountStatus || profile.AccountStatus || 'active').toLowerCase(),
            referencePersonName: profile.referencePersonName || profile.ReferencePersonName || '',
            referenceMobileNumber: profile.referenceMobileNumber || profile.ReferenceMobileNumber || '',
            usedCredit: profile.usedCredit ?? profile.UsedCredit ?? 0,
            availableCredit: limit - (profile.usedCredit ?? 0),
            hasProfileInDb: true,
          });
        }
      });

      // Sort: configured profiles first, then by name
      unifiedList.sort((a, b) => {
        if (a.hasProfileInDb && !b.hasProfileInDb) return -1;
        if (!a.hasProfileInDb && b.hasProfileInDb) return 1;
        return a.leadName.localeCompare(b.leadName);
      });

      setItems(unifiedList);
    } catch (err) {
      console.error('Failed to load credit master data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCompanyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // ============================================================
  // OPEN CONFIGURE / EDIT MODAL
  // ============================================================
  const openConfigureModal = async (item?: CreditItem) => {
    if (item) {
      setIsEditingExisting(true);
      setSelectedLeadId(item.leadId);
      setFormLeadName(item.leadName);
      setFormCustomerCode(item.customerCode);
      setFormCreditLimit(String(item.creditLimit || 0));
      setFormCreditDays(String(item.creditDays || 0));
      setFormWarningDays(String(item.warningDays || 12));
      setFormRiskRating(item.riskRating || 'Low');
      setFormAccountStatus((item.accountStatus as any) || 'active');
      setFormRefPerson(item.referencePersonName || '');
      setFormRefMobile(item.referenceMobileNumber || '');
      setLiveUsedCredit(item.usedCredit || 0);
      setLiveTotalOutstanding(0);
      setLiveLastPaymentAmt(0);
      setLiveLastPaymentDate(null);
      setModalVisible(true);

      // Fetch live financial balances from DB
      setFetchingDetails(true);
      try {
        const companyId = Number(selectedCompanyId) || 1;
        const liveProfile = await creditService.getByLeadAndCompany(item.leadId, companyId);
        if (liveProfile) {
          if (liveProfile.creditLimit !== undefined && liveProfile.creditLimit !== null) {
            setFormCreditLimit(String(liveProfile.creditLimit));
          }
          if (liveProfile.creditDays !== undefined && liveProfile.creditDays !== null) {
            setFormCreditDays(String(liveProfile.creditDays));
          }
          if (liveProfile.warningDays !== undefined && liveProfile.warningDays !== null) {
            setFormWarningDays(String(liveProfile.warningDays));
          }
          if (liveProfile.riskRating) setFormRiskRating(liveProfile.riskRating);
          if (liveProfile.accountStatus) setFormAccountStatus(liveProfile.accountStatus.toLowerCase());
          if (liveProfile.referencePersonName) setFormRefPerson(liveProfile.referencePersonName);
          if (liveProfile.referenceMobileNumber) setFormRefMobile(liveProfile.referenceMobileNumber);

          setLiveUsedCredit(liveProfile.usedCredit || 0);
          setLiveTotalOutstanding(liveProfile.totalOutstanding || liveProfile.usedCredit || 0);
          setLiveLastPaymentAmt(liveProfile.lastPaymentAmount || 0);
          setLiveLastPaymentDate(liveProfile.lastPaymentDate ? liveProfile.lastPaymentDate.split('T')[0] : null);
        }
      } catch (err) {
        console.warn('Live profile fetch warning:', err);
      } finally {
        setFetchingDetails(false);
      }
    } else {
      // New profile configuration
      setIsEditingExisting(false);
      setSelectedLeadId(null);
      setFormLeadName('');
      setFormCustomerCode('');
      setFormCreditLimit('0');
      setFormCreditDays('0');
      setFormWarningDays('12');
      setFormRiskRating('Low');
      setFormAccountStatus('active');
      setFormRefPerson('');
      setFormRefMobile('');
      setLiveUsedCredit(0);
      setLiveTotalOutstanding(0);
      setLiveLastPaymentAmt(0);
      setLiveLastPaymentDate(null);
      setModalVisible(true);
    }
  };

  // Lead selection in new mode
  const handleSelectLead = async (leadIdVal: any) => {
    const lId = Number(leadIdVal);
    if (!lId) return;
    setSelectedLeadId(lId);

    const found = items.find((i) => i.leadId === lId);
    if (found) {
      setFormLeadName(found.leadName);
      setFormCustomerCode(found.customerCode);
      setFormCreditLimit(String(found.creditLimit || 0));
      setFormCreditDays(String(found.creditDays || 0));
      setFormWarningDays(String(found.warningDays || 12));
      setFormRiskRating(found.riskRating || 'Low');
      setFormAccountStatus((found.accountStatus as any) || 'active');
      setFormRefPerson(found.referencePersonName || '');
      setFormRefMobile(found.referenceMobileNumber || '');

      setFetchingDetails(true);
      try {
        const companyId = Number(selectedCompanyId) || 1;
        const liveProfile = await creditService.getByLeadAndCompany(lId, companyId);
        if (liveProfile) {
          setLiveUsedCredit(liveProfile.usedCredit || 0);
          setLiveTotalOutstanding(liveProfile.totalOutstanding || liveProfile.usedCredit || 0);
          setLiveLastPaymentAmt(liveProfile.lastPaymentAmount || 0);
          setLiveLastPaymentDate(liveProfile.lastPaymentDate ? liveProfile.lastPaymentDate.split('T')[0] : null);
        }
      } catch (e) {
        console.warn('Error fetching lead credit details:', e);
      } finally {
        setFetchingDetails(false);
      }
    }
  };

  // ============================================================
  // SAVE CREDIT PROFILE
  // ============================================================
  const handleSave = async () => {
    if (!selectedLeadId) {
      Alert.alert('Validation', 'Please select a customer/lead');
      return;
    }

    if (formRefMobile && formRefMobile.trim().length > 0 && formRefMobile.trim().length !== 10) {
      Alert.alert('Validation', 'Reference Mobile must be exactly 10 digits');
      return;
    }

    setSaving(true);
    try {
      const companyId = Number(selectedCompanyId) || 1;
      const limitNum = Number(formCreditLimit) || 0;
      const daysNum = Number(formCreditDays) || 0;
      const warningNum = Number(formWarningDays) || 12;

      const payload = {
        companyID: companyId,
        leadID: selectedLeadId,
        creditLimit: limitNum,
        creditDays: daysNum,
        warningDays: warningNum,
        riskRating: formRiskRating,
        accountStatus: formAccountStatus,
        referencePersonName: formRefPerson || undefined,
        referenceMobileNumber: formRefMobile || undefined,
      };

      await creditService.saveCreditProfile(payload);

      // Update in local state
      setItems((prev) =>
        prev.map((item) =>
          item.leadId === selectedLeadId
            ? {
                ...item,
                creditLimit: limitNum,
                creditDays: daysNum,
                warningDays: warningNum,
                riskRating: formRiskRating,
                accountStatus: formAccountStatus,
                referencePersonName: formRefPerson,
                referenceMobileNumber: formRefMobile,
                availableCredit: limitNum - (item.usedCredit || 0),
                hasProfileInDb: true,
              }
            : item
        )
      );

      Alert.alert('Success', 'Credit profile saved successfully!');
      setModalVisible(false);
      loadData();
    } catch (err: any) {
      console.error('Error saving credit profile:', err);
      Alert.alert(
        'Save Failed',
        err?.response?.data?.message || err?.message || 'Could not save credit profile'
      );
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // DELETE / RESET PROFILE
  // ============================================================
  const handleDelete = async () => {
    if (!deletingItem) return;
    setDeleting(true);
    try {
      if (deletingItem.creditProfileID) {
        await creditService.deleteCreditProfile(deletingItem.creditProfileID);
      } else {
        // Reset profile by setting limit to 0
        const companyId = Number(selectedCompanyId) || 1;
        await creditService.saveCreditProfile({
          companyID: companyId,
          leadID: deletingItem.leadId,
          creditLimit: 0,
          creditDays: 0,
          warningDays: 12,
          riskRating: 'Low',
          accountStatus: 'active',
        });
      }

      setDeleteModalVisible(false);
      setDeletingItem(null);
      loadData();
      Alert.alert('Success', 'Credit profile deleted/reset successfully!');
    } catch (err: any) {
      console.error('Error deleting credit profile:', err);
      Alert.alert(
        'Delete Failed',
        err?.response?.data?.message || err?.message || 'Could not delete credit profile'
      );
    } finally {
      setDeleting(false);
    }
  };

  // ============================================================
  // STATS & FILTERING
  // ============================================================
  const counts = useMemo(() => {
    let active = 0;
    let hold = 0;
    let blocked = 0;
    let highRisk = 0;
    let totalLimit = 0;

    items.forEach((item) => {
      const st = (item.accountStatus || 'active').toLowerCase();
      if (st === 'active') active++;
      else if (st === 'hold') hold++;
      else if (st === 'blocked') blocked++;

      if (item.riskRating?.toLowerCase() === 'high') highRisk++;
      totalLimit += item.creditLimit || 0;
    });

    return { total: items.length, active, hold, blocked, highRisk, totalLimit };
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // 1. Search filter
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchesName = (item.leadName || '').toLowerCase().includes(q);
        const matchesCode = (item.customerCode || '').toLowerCase().includes(q);
        const matchesCompany = (item.companyName || '').toLowerCase().includes(q);
        const matchesMobile = (item.referenceMobileNumber || '').includes(q);
        const matchesPerson = (item.referencePersonName || '').toLowerCase().includes(q);
        if (!matchesName && !matchesCode && !matchesCompany && !matchesMobile && !matchesPerson) {
          return false;
        }
      }

      // 2. Segment filter
      const st = (item.accountStatus || 'active').toLowerCase();
      if (activeFilter === 'ACTIVE') return st === 'active';
      if (activeFilter === 'HOLD') return st === 'hold';
      if (activeFilter === 'BLOCKED') return st === 'blocked';
      if (activeFilter === 'HIGH_RISK') return item.riskRating?.toLowerCase() === 'high';

      return true;
    });
  }, [items, search, activeFilter]);

  const leadDropdownOptions: DropdownOption[] = useMemo(() => {
    return items.map((i) => ({
      label: i.leadName,
      value: i.leadId,
    }));
  }, [items]);

  const formatCurrency = (val: number) => {
    const n = Math.round(Number(val) || 0);
    return `₹${n.toLocaleString('en-IN')}`;
  };

  const calculatedAvail = Math.max(
    0,
    (Number(formCreditLimit) || 0) - liveUsedCredit
  );

  return (
    <View style={styles.container}>
      <Header
        title="Credit Master"
        subtitle={`${items.length} Customers`}
        navigation={navigation}
        showBack={true}
        currentRoute="CreditMaster"
        rightIcon="bar-chart-outline"
        onRightPress={() => navigation.navigate('OutstandingReports')}
      />

      {/* Action Row matching CompaniesList & UsersList */}
      <View style={styles.actionRow}>
        <View style={styles.searchContainer}>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Search customer, code..."
          />
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => openConfigureModal()}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={16} color="#ffffff" />
          <Text style={styles.addBtnText}>Configure</Text>
        </TouchableOpacity>
      </View>

      {/* Segmented Filter Pills */}
      <View style={styles.filterBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          <TouchableOpacity
            style={[styles.filterChip, activeFilter === 'ALL' && styles.filterChipActive]}
            onPress={() => setActiveFilter('ALL')}
          >
            <Text style={[styles.filterChipText, activeFilter === 'ALL' && styles.filterChipTextActive]}>
              All ({counts.total})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, activeFilter === 'ACTIVE' && styles.filterChipActive]}
            onPress={() => setActiveFilter('ACTIVE')}
          >
            <View style={[styles.dotIndicator, { backgroundColor: Colors.success }]} />
            <Text style={[styles.filterChipText, activeFilter === 'ACTIVE' && styles.filterChipTextActive]}>
              Active ({counts.active})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, activeFilter === 'HOLD' && styles.filterChipActive]}
            onPress={() => setActiveFilter('HOLD')}
          >
            <View style={[styles.dotIndicator, { backgroundColor: '#d39e00' }]} />
            <Text style={[styles.filterChipText, activeFilter === 'HOLD' && styles.filterChipTextActive]}>
              Hold ({counts.hold})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, activeFilter === 'BLOCKED' && styles.filterChipActive]}
            onPress={() => setActiveFilter('BLOCKED')}
          >
            <View style={[styles.dotIndicator, { backgroundColor: Colors.danger }]} />
            <Text style={[styles.filterChipText, activeFilter === 'BLOCKED' && styles.filterChipTextActive]}>
              Blocked ({counts.blocked})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, activeFilter === 'HIGH_RISK' && styles.filterChipActive]}
            onPress={() => setActiveFilter('HIGH_RISK')}
          >
            <Ionicons name="alert-circle" size={13} color={activeFilter === 'HIGH_RISK' ? '#ffffff' : Colors.danger} />
            <Text style={[styles.filterChipText, activeFilter === 'HIGH_RISK' && styles.filterChipTextActive]}>
              High Risk ({counts.highRisk})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Customer List */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading Credit Master...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => String(item.leadId)}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="card-outline" size={48} color={Colors.slate300} />
              <Text style={styles.emptyTitle}>No Credit Accounts Found</Text>
              <Text style={styles.emptySubtitle}>
                No customer credit records matching your search or filter.
              </Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => openConfigureModal()}
                activeOpacity={0.8}
              >
                <Text style={styles.emptyBtnText}>+ Configure Credit Profile</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => {
            const st = (item.accountStatus || 'active').toLowerCase();
            const badgeVariant: any =
              st === 'hold' ? 'warning' : st === 'blocked' ? 'danger' : 'success';

            const riskBg =
              item.riskRating?.toLowerCase() === 'high'
                ? '#fee2e2'
                : item.riskRating?.toLowerCase() === 'medium'
                ? '#fef3c7'
                : '#dcfce7';

            const riskColor =
              item.riskRating?.toLowerCase() === 'high'
                ? '#b91c1c'
                : item.riskRating?.toLowerCase() === 'medium'
                ? '#b45309'
                : '#15803d';

            return (
              <CommonListCard
                title={item.leadName}
                subtitle={`${item.customerCode}${item.companyName ? ` • ${item.companyName}` : ''}`}
                avatarIcon="card-outline"
                avatarColor={Colors.primary}
                avatarBgColor={Colors.primaryMuted}
                badgeLabel={(item.accountStatus || 'ACTIVE').toUpperCase()}
                badgeVariant={badgeVariant}
                badgeExtra={
                  <View style={[styles.riskBadge, { backgroundColor: riskBg }]}>
                    <Text style={[styles.riskBadgeText, { color: riskColor }]}>
                      {item.riskRating || 'Low'} Risk
                    </Text>
                  </View>
                }
                pills={[
                  {
                    icon: 'cash-outline',
                    text: `Limit: ${formatCurrency(item.creditLimit)}`,
                    iconColor: Colors.primary,
                  },
                  {
                    icon: 'calendar-outline',
                    text: `${item.creditDays || 0} Days`,
                    iconColor: '#6366f1',
                  },
                  {
                    icon: 'alert-circle-outline',
                    text: `Warn: ${item.warningDays || 12}d`,
                    iconColor: '#f59e0b',
                  },
                  item.usedCredit !== undefined && item.usedCredit > 0
                    ? {
                        icon: 'trending-up-outline',
                        text: `Used: ${formatCurrency(item.usedCredit)}`,
                        iconColor: Colors.danger,
                      }
                    : null,
                  item.creditLimit > 0
                    ? {
                        icon: 'shield-checkmark-outline',
                        text: `Avail: ${formatCurrency(item.availableCredit ?? (item.creditLimit - (item.usedCredit || 0)))}`,
                        iconColor: Colors.success,
                      }
                    : null,
                  item.referencePersonName
                    ? {
                        icon: 'person-outline',
                        text: `${item.referencePersonName}${item.referenceMobileNumber ? ` (${item.referenceMobileNumber})` : ''}`,
                      }
                    : null,
                ]}
                footerIcon="barcode-outline"
                footerText={`Lead ID: ${item.leadId}`}
                editLabel="Configure"
                onPress={() => openConfigureModal(item)}
                onEdit={() => openConfigureModal(item)}
                onDelete={
                  item.hasProfileInDb
                    ? () => {
                        setDeletingItem(item);
                        setDeleteModalVisible(true);
                      }
                    : undefined
                }
                deleteLabel="Delete"
              />
            );
          }}
        />
      )}

      {/* ============================================================
          CONFIGURE / EDIT MODAL (MATCHES ADDCOMPANY / ADDUSER THEME)
      ============================================================ */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => !saving && setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {isEditingExisting ? 'Edit Credit Profile' : 'Configure Credit Profile'}
                </Text>
                {formLeadName ? (
                  <Text style={styles.modalSubtitle} numberOfLines={1}>
                    {formLeadName} ({formCustomerCode})
                  </Text>
                ) : null}
              </View>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                disabled={saving}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={22} color={Colors.slate600} />
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={styles.modalScroll}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="none"
              showsVerticalScrollIndicator={false}
            >
              {/* Select Customer if New */}
              {!isEditingExisting ? (
                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Select Customer *</Text>
                  <MobileDropdown
                    selectedValue={selectedLeadId}
                    options={leadDropdownOptions}
                    onSelect={handleSelectLead}
                    placeholder="Search and select customer"
                    searchable
                    searchPlaceholder="Search customer..."
                  />
                </View>
              ) : null}

              {/* Live Financial Metrics Banner */}
              {selectedLeadId ? (
                <View style={styles.kpiContainer}>
                  <View style={styles.kpiRow}>
                    <View style={[styles.kpiBox, { borderLeftColor: Colors.primary }]}>
                      <Text style={styles.kpiLabel}>Credit Limit</Text>
                      <Text style={[styles.kpiValue, { color: Colors.primary }]}>
                        {formatCurrency(Number(formCreditLimit) || 0)}
                      </Text>
                    </View>
                    <View style={[styles.kpiBox, { borderLeftColor: '#f97316' }]}>
                      <Text style={styles.kpiLabel}>Used Credit</Text>
                      <Text style={[styles.kpiValue, { color: '#f97316' }]}>
                        {formatCurrency(liveUsedCredit)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.kpiRow}>
                    <View style={[styles.kpiBox, { borderLeftColor: Colors.success }]}>
                      <Text style={styles.kpiLabel}>Available Credit</Text>
                      <Text style={[styles.kpiValue, { color: Colors.success }]}>
                        {formatCurrency(calculatedAvail)}
                      </Text>
                    </View>
                    <View style={[styles.kpiBox, { borderLeftColor: '#3b82f6' }]}>
                      <Text style={styles.kpiLabel}>Outstanding</Text>
                      <Text style={[styles.kpiValue, { color: '#3b82f6' }]}>
                        {formatCurrency(liveTotalOutstanding)}
                      </Text>
                    </View>
                  </View>
                </View>
              ) : null}

              {fetchingDetails ? (
                <View style={styles.fetchingBox}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                  <Text style={styles.fetchingText}>Refreshing customer balances...</Text>
                </View>
              ) : null}

              {/* Limit & Days Row */}
              <View style={styles.splitRow}>
                <View style={styles.splitCol}>
                  <Text style={styles.inputLabel}>Credit Limit (₹) *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formCreditLimit}
                    onChangeText={(val) => setFormCreditLimit(val.replace(/[^0-9]/g, ''))}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor={Colors.slate400}
                  />
                </View>
                <View style={styles.splitCol}>
                  <Text style={styles.inputLabel}>Credit Days *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formCreditDays}
                    onChangeText={(val) => setFormCreditDays(val.replace(/[^0-9]/g, ''))}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor={Colors.slate400}
                  />
                </View>
              </View>

              {/* Warning Days */}
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Warning Days Before Due</Text>
                <TextInput
                  style={styles.textInput}
                  value={formWarningDays}
                  onChangeText={(val) => setFormWarningDays(val.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                  placeholder="12"
                  placeholderTextColor={Colors.slate400}
                />
              </View>

              {/* Reference Person & Mobile */}
              <View style={styles.splitRow}>
                <View style={styles.splitCol}>
                  <Text style={styles.inputLabel}>Reference Person</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formRefPerson}
                    onChangeText={setFormRefPerson}
                    placeholder="Name"
                    placeholderTextColor={Colors.slate400}
                  />
                </View>
                <View style={styles.splitCol}>
                  <Text style={styles.inputLabel}>Reference Mobile</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formRefMobile}
                    onChangeText={(val) => setFormRefMobile(val.replace(/\D/g, '').slice(0, 10))}
                    keyboardType="phone-pad"
                    maxLength={10}
                    placeholder="10 digits"
                    placeholderTextColor={Colors.slate400}
                  />
                </View>
              </View>

              {/* Risk Rating Selector */}
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Risk Rating</Text>
                <View style={styles.chipsRow}>
                  {RISK_OPTIONS.map((item) => {
                    const isSelected = formRiskRating === item.value;
                    return (
                      <TouchableOpacity
                        key={item.value}
                        style={[
                          styles.chipItem,
                          isSelected && { backgroundColor: item.bg, borderColor: item.color, borderWidth: 1.5 },
                        ]}
                        onPress={() => setFormRiskRating(item.value)}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.chipItemText,
                            isSelected && { color: item.color, fontWeight: '700' },
                          ]}
                        >
                          {item.label} Risk
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Account Status Selector */}
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Account Status</Text>
                <View style={styles.chipsRow}>
                  {STATUS_OPTIONS.map((item) => {
                    const isSelected = formAccountStatus === item.value;
                    return (
                      <TouchableOpacity
                        key={item.value}
                        style={[
                          styles.chipItem,
                          isSelected && { backgroundColor: item.bg, borderColor: item.color, borderWidth: 1.5 },
                        ]}
                        onPress={() => setFormAccountStatus(item.value as any)}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.chipItemText,
                            isSelected && { color: item.color, fontWeight: '700' },
                          ]}
                        >
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={{ height: 20 }} />
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
                disabled={saving}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-outline" size={17} color="#ffffff" />
                    <Text style={styles.saveBtnText}>Save Profile</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Delete / Reset Confirmation Modal */}
      <ConfirmationModal
        visible={deleteModalVisible}
        title="Delete Credit Profile"
        message={`Are you sure you want to delete or reset the credit profile for "${deletingItem?.leadName}"?`}
        confirmText="Delete"
        cancelText="Cancel"
        isDestructive={true}
        loading={deleting}
        icon="trash"
        onConfirm={handleDelete}
        onCancel={() => setDeleteModalVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
  },
  searchContainer: {
    flex: 1,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 8,
    gap: 4,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
    elevation: 2,
  },
  addBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  filterBar: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
    paddingVertical: 8,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.slate100,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.slate600,
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  dotIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: Colors.slate500,
  },
  listContent: {
    padding: 16,
    paddingBottom: 90,
  },
  riskBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  riskBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.slate700,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.slate400,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  emptyBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.slate800,
  },
  modalSubtitle: {
    fontSize: 12,
    color: Colors.slate500,
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalScroll: {
    padding: 20,
    paddingBottom: 220,
  },
  formGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.slate700,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.slate200,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.slate800,
  },
  splitRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  splitCol: {
    flex: 1,
  },
  kpiContainer: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.slate200,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  kpiBox: {
    flex: 1,
    backgroundColor: Colors.surface,
    padding: 8,
    borderRadius: 6,
    borderLeftWidth: 3,
  },
  kpiLabel: {
    fontSize: 10,
    color: Colors.slate500,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  kpiValue: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  fetchingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  fetchingText: {
    fontSize: 12,
    color: Colors.slate500,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  chipItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.slate200,
    backgroundColor: Colors.background,
  },
  chipItemText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.slate700,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.slate100,
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.slate300,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.slate700,
  },
  saveBtn: {
    flex: 2,
    height: 44,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});