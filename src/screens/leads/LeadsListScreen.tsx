import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Alert,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  BackHandler,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Header } from '../../components/common/Header';
import { SearchBar } from '../../components/common/SearchBar';
import { LeadCard } from '../../components/cards/LeadCard';
import { FloatingActionButton } from '../../components/common/FloatingActionButton';
import { EmptyState } from '../../components/common/EmptyState';
import { Pagination } from '../../components/common/Pagination';
import { Input } from '../../components/common/Input';
import { MobileDropdown, DropdownOption } from '../../components/common/MobileDropdown';
import { MobileDatePicker } from '../../components/common/MobileDatePicker';
import { QuickMessageModal } from '../../components/modals/QuickMessageModal';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import { SalesShortcutsDrawer } from '../../components/modals/SalesShortcutsDrawer';
import { leadService, Lead, LeadFilterParams } from '../../api/leadService';
import { mastersService, UserMaster, LeadSourceMaster } from '../../api/mastersService';
import { useAuth } from '../../context/AuthContext';
import { useCompany } from '../../context/CompanyContext';
import { useMenu } from '../../context/MenuContext';
import { Colors } from '../../theme/colors';

interface LeadsListScreenProps {
  navigation: any;
  route?: any;
}

export const LeadsListScreen: React.FC<LeadsListScreenProps> = ({ navigation, route }) => {
  const { user } = useAuth();
  const { selectedCompanyId, selectedCompany, companies, isAllCompanies } = useCompany();
  const { canAccessSales } = useMenu();

  const userRole = (user?.role || '').toLowerCase();
  const isAdmin = userRole.includes('admin') || userRole.includes('super');
  const userId = Number(user?.id || user?.userID);

  const hasNoCompany = !isAdmin && companies.length === 0 && !isAllCompanies;
  const isLeadsBlocked = !isAdmin && !canAccessSales;

  // Screen View Mode: false = List View (shown first), true = Full-Screen Form
  const [showForm, setShowForm] = useState(
    Boolean(route?.params?.openForm || route?.params?.editLead)
  );

  // List Data & Pagination State
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Modals & Drawers
  const [msgModalVisible, setMsgModalVisible] = useState(false);
  const [msgRecipient, setMsgRecipient] = useState({ name: '', phone: '' });
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedLeadForDelete, setSelectedLeadForDelete] = useState<Lead | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [shortcutsVisible, setShortcutsVisible] = useState(false);

  // ==================== FORM STATE (Add / Edit Lead) ====================
  const [editingLead, setEditingLead] = useState<Lead | null>(route?.params?.editLead || null);
  const isEditing = Boolean(editingLead);

  const [leadName, setLeadName] = useState(editingLead?.leadName || '');
  const [mobileNo, setMobileNo] = useState(editingLead?.mobileNo || '');
  const [email, setEmail] = useState(editingLead?.email || '');
  const [companyName, setCompanyName] = useState(editingLead?.companyName || '');
  const [city, setCity] = useState(editingLead?.city || '');
  const [productInterestedIn, setProductInterestedIn] = useState(editingLead?.productInterestedIn || '');
  const [remarks, setRemarks] = useState(editingLead?.remarks || '');
  const [assignedTo, setAssignedTo] = useState<string | number>(
    editingLead?.assignedTo || user?.userID || user?.id || ''
  );
  const [leadSource, setLeadSource] = useState<string | number>(
    editingLead?.leadSourceID ? String(editingLead.leadSourceID) : (editingLead?.leadSource ? String(editingLead.leadSource) : '')
  );
  const [followUpDate, setFollowUpDate] = useState(editingLead?.followUpDate || '');
  const [followUpTime, setFollowUpTime] = useState(editingLead?.followUpTime || '10:00');

  // Lookups
  const [userOptions, setUserOptions] = useState<DropdownOption[]>([]);
  const [sourceOptions, setSourceOptions] = useState<DropdownOption[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [mobileSuggestions, setMobileSuggestions] = useState<Lead[]>([]);
const [showMobileSuggestions, setShowMobileSuggestions] = useState(false);

  
 // 1. Fetch Leads List from API
const fetchLeads = useCallback(
  async (page = 1, isRefresh = false) => {
    if (hasNoCompany || isLeadsBlocked) {
      setLeads([]);
      setCurrentPage(1);
      setTotalPages(1);
      setTotalItems(0);
      setLoading(false);
      setRefreshing(false);
      return;
    }

const companyId = isAllCompanies ? 0 : Number(selectedCompanyId);

if (
  !isAllCompanies &&
  (!Number.isInteger(companyId) || companyId <= 0)
) {
  console.log('Please select a company before fetching leads.');

  setLeads([]);
  setCurrentPage(1);
  setTotalPages(1);
  setTotalItems(0);
  setLoading(false);
  setRefreshing(false);
  return;
}

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const params: LeadFilterParams = {
        companyId,
        search: search.trim() || undefined,
        page,
        pageSize: 15,
      };

      console.log('Fetching leads with params:', params);

      const res = await leadService.getLeads(params);

      let list = res.data || [];
      if (!isAllCompanies && companyId > 0) {
      list = list.filter((lead: any) => {
        const leadCompanyId = lead.companyID ?? lead.companyId;

        return Number(leadCompanyId) === companyId;
      });
    }

      setLeads(list);
      setCurrentPage(page);
      setTotalPages(res.totalPages || 1);
      setTotalItems(res.total ?? list.length);

    } catch (err: any) {
      console.error('Error fetching leads:', {
        message: err?.message,
        status: err?.response?.status,
        response: err?.response?.data,
      });

      setLeads([]);
      setTotalItems(0);

    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  },
  [
  selectedCompanyId,
  isAllCompanies,
  search,
  hasNoCompany,
  isLeadsBlocked,
]
);

  // 2. Fetch Lookups (Users & Lead Sources) for the form
  const loadLookups = useCallback(async () => {
    setLoadingLookups(true);
    try {
      const activeCompanyId = selectedCompanyId ? Number(selectedCompanyId) : undefined;
      const [users, sources] = await Promise.all([
        mastersService.getUsers(activeCompanyId),
        mastersService.getLeadSources(),
      ]);

      setUserOptions(
        users.map((u: UserMaster) => ({
          label: u.fullName || u.userName,
          value: u.userID,
          subtitle: u.role ? `Role: ${u.role}` : undefined,
        }))
      );

      setSourceOptions(
        sources.map((s: LeadSourceMaster) => ({
          label: s.leadSourceName,
          value: String(s.leadSourceID),
        }))
      );
    } catch (err) {
      console.warn('Error loading lookups for lead form:', err);
    } finally {
      setLoadingLookups(false);
    }
  }, [selectedCompanyId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCompanyId, search]);

  useEffect(() => {
  loadLookups();
}, [loadLookups]);

useFocusEffect(
  useCallback(() => {
    if (!showForm) {
      fetchLeads(currentPage);
    }
  }, [fetchLeads, showForm, currentPage])
);

  // Back navigation: Form -> List -> previous More/Tiles screen
  useEffect(() => {
    const handleBack = () => {
      if (showForm) {
        setShowForm(false);
        setEditingLead(null);
        return true;
      }

      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', handleBack);

    return () => subscription.remove();
  }, [showForm]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
      if (showForm) {
        e.preventDefault();
        setShowForm(false);
        setEditingLead(null);
      }
    });

    return unsubscribe;
  }, [navigation, showForm]);

  // Handle route params when navigating with edit or openForm
  useEffect(() => {
    if (route?.params?.editLead) {
      openEditLead(route.params.editLead);
    } else if (route?.params?.openForm) {
      openAddLead();
    }
  }, [route?.params]);

  // Open Form for creating a new lead
  const openAddLead = () => {
    setEditingLead(null);
    setLeadName('');
    setMobileNo('');
    setEmail('');
    setCompanyName('');
    setCity('');
    setProductInterestedIn('');
    setRemarks('');
    setAssignedTo(user?.userID || user?.id || '');
    setLeadSource('');
    setFollowUpDate('');
    setFollowUpTime('10:00');
    setErrors({});
    setShowForm(true);
  };

 const handleSelectMobileSuggestion = (lead: Lead) => {
  openEditLead(lead);
  setShowMobileSuggestions(false);
  setMobileSuggestions([]);
};

  // Open Form for editing an existing lead
  const openEditLead = (lead: Lead) => {
    setEditingLead(lead);
    setLeadName(lead.leadName || '');
    setMobileNo(lead.mobileNo || '');
    setEmail(lead.email || '');
    setCompanyName(lead.companyName || '');
    setCity(lead.city || '');
    setProductInterestedIn(lead.productInterestedIn || '');
    setRemarks(lead.remarks || '');
    setAssignedTo(lead.assignedTo || user?.userID || user?.id || '');
    setLeadSource(
    lead.leadSourceID != null
      ? String(lead.leadSourceID)
      : ''
  );
    setFollowUpDate(lead.followUpDate || '');
    setFollowUpTime(lead.followUpTime || '10:00');
    setErrors({});
    setShowForm(true);
  };

   // Reset form fields
const handleResetForm = () => {
        // Switch from Update mode to Add mode
        setEditingLead(null);

        setLeadName('');
        setMobileNo('');
        setEmail('');
        setCompanyName('');
        setCity('');
        setProductInterestedIn('');
        setRemarks('');
        setAssignedTo(user?.userID || user?.id || '');
        setLeadSource('');
        setFollowUpDate('');
        setFollowUpTime('10:00');

        // Clear suggestions and errors
        setShowMobileSuggestions(false);
        setMobileSuggestions([]);
        setErrors({});
      
};

  // Validate form fields
  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!leadName.trim()) {
      errs.leadName = 'Lead Name is required';
    }
    if (!mobileNo.trim()) {
      errs.mobileNo = 'Mobile Number is required';
    } else if (mobileNo.trim().length !== 10) {
      errs.mobileNo = 'Please enter a valid 10-digit mobile number';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Save Lead (Create or Update)
  const handleSaveLead = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      const activeCompanyId = selectedCompanyId || (user?.defaultCompanyId ? Number(user.defaultCompanyId) : 1);
      const datePart = followUpDate?.trim() || null;
      const timePart = followUpTime ? (followUpTime.length === 5 ? followUpTime + ':00' : followUpTime) : null;
      const combinedFollowUp = datePart && followUpTime ? `${datePart}T${followUpTime}` : datePart || null;

      const leadData: Partial<Lead> = {
        companyID: activeCompanyId,
        leadName: leadName.trim(),
        mobileNo: mobileNo.trim(),
        email: email.trim() || '',
        companyName: companyName.trim() || leadName.trim(),
        city: city.trim() || '',
        assignedTo: assignedTo ? Number(assignedTo) : (user?.userID || user?.id ? Number(user.userID || user.id) : 1),
        leadSourceID: leadSource ? parseInt(String(leadSource), 10) : null,
        productInterestedIn: productInterestedIn.trim() || '',
        remarks: remarks.trim() || '',
        followUpDate: datePart,
        followUpTime: timePart,
        combinedFollowUpDateTime: combinedFollowUp,
        nextFollowUpDate: datePart,
        status: true,
      };

      if (isEditing && editingLead) {
        await leadService.updateLead(editingLead.leadID, leadData);
      } else {
        await leadService.createLead(leadData);
      }

      setShowForm(false);
      setEditingLead(null);
      fetchLeads(1);

      Alert.alert(
        'Success',
        isEditing ? 'Lead updated successfully!' : 'Lead created successfully!'
      );
    } catch (err: any) {
      const errMsg =
        err?.response?.data?.message ||
        err?.response?.data?.title ||
        err?.message ||
        'Could not save lead.';
      Alert.alert('Save Failed', errMsg);
    } finally {
      setSaving(false);
    }
  };

  // Delete Lead
  const handleDelete = async () => {
    if (!selectedLeadForDelete) return;
    setDeleting(true);
    try {
      await leadService.deleteLead(selectedLeadForDelete.leadID);
      setDeleteModalVisible(false);
      setSelectedLeadForDelete(null);
      fetchLeads(currentPage);
      Alert.alert('Success', 'Lead deleted successfully!');
    } catch (err: any) {
      Alert.alert('Delete Failed', err?.response?.data?.message || 'Could not delete lead');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <Header
        showBack={false}
      />

      {hasNoCompany ? (
        <ScrollView
          contentContainerStyle={{ padding: 20 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchLeads(1, true)} colors={[Colors.primary]} />}
        >
          <View style={styles.restrictedCard}>
            <View style={[styles.restrictedIconBox, { backgroundColor: '#ede9fe' }]}>
              <Ionicons name="business" size={36} color="#645695" />
            </View>
            <Text style={styles.restrictedHeading}>No Company Assigned</Text>
            <Text style={styles.restrictedText}>
              Your user account has not been assigned to any company yet. In Techno CRM, leads and customer accounts are only accessible once a company is assigned to your profile in User Master.
            </Text>
            <TouchableOpacity style={styles.restrictedReloadBtn} onPress={() => fetchLeads(1, true)}>
              <Ionicons name="refresh" size={16} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.restrictedReloadBtnText}>Check Again</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : isLeadsBlocked ? (
        <ScrollView
          contentContainerStyle={{ padding: 20 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchLeads(1, true)} colors={[Colors.primary]} />}
        >
          <View style={styles.restrictedCard}>
            <View style={[styles.restrictedIconBox, { backgroundColor: '#fee2e2' }]}>
              <Ionicons name="lock-closed" size={36} color="#ef4444" />
            </View>
            <Text style={styles.restrictedHeading}>Leads Access Restricted</Text>
            <Text style={styles.restrictedText}>
              Your account does not have permission to view Leads. Please contact your CRM administrator to grant access in User Permission.
            </Text>
            <TouchableOpacity style={styles.restrictedReloadBtn} onPress={() => fetchLeads(1, true)}>
              <Ionicons name="refresh" size={16} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.restrictedReloadBtnText}>Check Again</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : showForm ? (
        <KeyboardAvoidingView
        style={styles.flexOne}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
          <ScrollView
          style={styles.fullFormScroll}
          contentContainerStyle={styles.fullFormContent}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          nestedScrollEnabled={true}
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        >

            {/* Form Section matching Web CRM */}
            <View style={styles.formCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="person-circle-outline" size={18} color={Colors.primary} />
                <Text style={styles.sectionTitle}>{editingLead ? 'Edit Lead' : 'Add New Lead'}</Text>
              </View>

              <Input
                label="Lead Name"
                placeholder="Enter lead / contact person name"
                value={leadName}
                onChangeText={setLeadName}
                error={errors.leadName}
                required
                leftIcon="person-outline"
              />

              <Input
                label="Mobile Number"
                placeholder="Enter 10-digit mobile number"
                value={mobileNo}
                onChangeText={async (text) => {
                  const cleaned = text.replace(/[^0-9]/g, '').slice(0, 10);

                  setMobileNo(cleaned);
                  setShowMobileSuggestions(false);
                  setMobileSuggestions([]);

                  if (errors.mobileNo) {
                    setErrors((prev) => ({ ...prev, mobileNo: '' }));
                  }

                  if (cleaned.length >= 4) {
                    try {
                      const companyId = Number(selectedCompanyId);

                      if (!Number.isInteger(companyId) || companyId <= 0) {
                        console.log('Company ID is required for mobile suggestions.');
                        setMobileSuggestions([]);
                        setShowMobileSuggestions(false);
                        return;
                      }

                      const response = await leadService.getLeads({
                        companyId,
                        search: cleaned,
                        page: 1,
                        pageSize: 50,
                      });

                      const matches = (response.data || []).filter((lead) => {
                        const existingMobile = String(lead.mobileNo || '').replace(/\D/g, '');

                        return (
                          existingMobile.includes(cleaned) &&
                          Number(lead.leadID) !== Number(editingLead?.leadID)
                        );
                      });

                      setMobileSuggestions(matches);
                      setShowMobileSuggestions(matches.length > 0);
                    } catch (error) {
                      console.log('Mobile suggestion error:', error);
                    }
                  }
                }}
                keyboardType="phone-pad"
                maxLength={10}
                error={errors.mobileNo}
                required
                leftIcon="call-outline"
              />
              {showMobileSuggestions && mobileSuggestions.length > 0 && (
              <View style={styles.suggestionContainer}>
                {mobileSuggestions.map((item, idx) => (
                  <TouchableOpacity
                    key={`mob-sug-${item.leadID || ''}-${idx}`}
                    style={styles.suggestionItem}
                    onPress={() => handleSelectMobileSuggestion(item)}
                  >
                    <Text style={styles.suggestionName}>
                      {item.leadName}
                    </Text>

                    <Text style={styles.suggestionMobile}>
                      {item.mobileNo}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

              <Input
                label="Email Address"
                placeholder="Enter email address"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                leftIcon="mail-outline"
              />

              <Input
                label="Company Name"
                placeholder="Enter business / company name"
                value={companyName}
                onChangeText={setCompanyName}
                leftIcon="business-outline"
              />

              <Input
                label="City"
                placeholder="Enter city"
                value={city}
                onChangeText={setCity}
                leftIcon="location-outline"
              />

              <MobileDropdown
                label="Assigned To"
                placeholder="Select Employee..."
                options={userOptions}
                selectedValue={assignedTo}
                onSelect={setAssignedTo}
                loading={loadingLookups}
                searchPlaceholder="Search employee..."
              />

              <MobileDropdown
                label="Lead Source"
                placeholder="Select Lead Source..."
                options={sourceOptions}
                selectedValue={leadSource}
                onSelect={setLeadSource}
                loading={loadingLookups}
              />

              <Input
                label="Product Interested In"
                placeholder="e.g. CRM Software, Cloud ERP, Hardware"
                value={productInterestedIn}
                onChangeText={setProductInterestedIn}
                leftIcon="cube-outline"
              />

              <MobileDatePicker
                label="Next Follow-Up Date"
                value={followUpDate}
                timeValue={followUpTime}
                onChangeDate={setFollowUpDate}
                onChangeTime={setFollowUpTime}
                showTime
              />

              <Input
                label="Remark"
                placeholder="Add notes, client requirements..."
                value={remarks}
                onChangeText={setRemarks}
                multiline
                numberOfLines={3}
                leftIcon="document-text-outline"
              />
            </View>

            {/* Form Action Buttons (Matching AddCompanyScreen & NewTransactionScreen Theme) */}
            <View style={styles.fullFormActionButtons}>
              <TouchableOpacity
                style={styles.formActionBtnReset}
                onPress={handleResetForm}
                disabled={saving}
                activeOpacity={0.7}
              >
                <Ionicons name="refresh-outline" size={18} color={Colors.slate600} />
                <Text style={styles.formActionBtnResetText}>Reset</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.formActionBtnSubmit,
                  saving && { opacity: 0.65 },
                ]}
                onPress={handleSaveLead}
                disabled={saving}
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={Colors.textInverse} />
                ) : (
                  <>
                    <Ionicons name="checkmark-done" size={20} color={Colors.textInverse} />
                    <Text style={styles.formActionBtnSubmitText}>
                      {isEditing ? 'Update' : 'Save'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        /* ========================================================================= */
        /* 2. LEADS LIST VIEW (SHOWN FIRST LIKE NEW TRANSACTION & COMPANY SCREEN)    */
        /* ========================================================================= */
        <View style={{ flex: 1 }}>
          {/* Search + Add Action Row - Same UI Theme as Companies */}
          <View style={styles.actionRow}>
            <View style={styles.searchContainer}>
              <SearchBar
                value={search}
                onChangeText={setSearch}
                placeholder="Search..."
              />
            </View>

            <TouchableOpacity
              style={styles.addBtn}
              onPress={openAddLead}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={16} color="#ffffff" />
              <Text style={styles.addBtnText}>Add</Text>
            </TouchableOpacity>
          </View>

          {/* Leads FlatList */}
          <FlatList
            data={leads}
            keyExtractor={(item, index) => `${item.leadID || 'lead'}-${index}`}
            renderItem={({ item }) => (
              <LeadCard
                lead={item}
                onPress={() => navigation.navigate('LeadDetails', { leadId: item.leadID })}
                onEdit={() => openEditLead(item)}
                onDelete={() => {
                  setSelectedLeadForDelete(item);
                  setDeleteModalVisible(true);
                }}
              />
            )}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => fetchLeads(1, true)}
                colors={[Colors.primary]}
              />
            }
            ListEmptyComponent={
              !loading ? (
                <EmptyState
                  title="No Leads Found"
                  description="No leads match your search criteria. Tap below to create your first lead."
                  actionTitle="Create New Lead"
                  onAction={openAddLead}
                />
              ) : (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                  <Text style={styles.loadingText}>Loading leads directory...</Text>
                </View>
              )
            }
          />

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              onPageChange={(page) => fetchLeads(page)}
            />
          )}
        </View>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        visible={deleteModalVisible}
        title="Delete Lead"
        message={`Are you sure you want to delete "${selectedLeadForDelete?.leadName}"? This action cannot be undone.`}
        confirmText="Delete"
        isDestructive
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => {
          setDeleteModalVisible(false);
          setSelectedLeadForDelete(null);
        }}
      />

      {/* Quick Message Modal */}
      <QuickMessageModal
        visible={msgModalVisible}
        recipientName={msgRecipient.name}
        phoneNumber={msgRecipient.phone}
        onClose={() => setMsgModalVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  flexOne: {
    flex: 1,
  },

  // Header Elements
  headerFollowUpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  headerFollowUpBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  headerAddBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Search + Add Action Row - Same Theme as Companies
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
    paddingHorizontal: 12,
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

  listContent: {
    padding: 16,
    paddingBottom: 90,
  },

  smallShortcutFab: {
    position: 'absolute',
    right: 22,
    bottom: 96,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 5,
  },

  loadingBox: {
    paddingVertical: 50,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748b',
  },

 fullFormScroll: {
  flex: 1,
  backgroundColor: '#f8fafc',
},

fullFormContent: {
  flexGrow: 1,
  padding: 16,
  paddingBottom: 180,
},
  formHeaderSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  formTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  formTitleIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formSectionMainTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1e293b',
  },
  formSectionSubTitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  cancelPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  cancelPillBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },

  suggestionContainer: {
  backgroundColor: '#ffffff',
  borderWidth: 1,
  borderColor: '#e2e8f0',
  borderRadius: 10,
  marginTop: -8,
  marginBottom: 12,
  overflow: 'hidden',
},

suggestionItem: {
  paddingVertical: 12,
  paddingHorizontal: 14,
  borderBottomWidth: 1,
  borderBottomColor: '#f1f5f9',
},

suggestionName: {
  fontSize: 14,
  fontWeight: '600',
  color: '#1e293b',
},

suggestionMobile: {
  fontSize: 12,
  color: '#64748b',
  marginTop: 4,
},
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1e293b',
  },

  // Action Buttons
  fullFormActionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    marginBottom: 36,
  },
  formActionBtnReset: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.slate300,
    backgroundColor: Colors.surface,
  },
  formActionBtnResetText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.slate700,
  },
  formActionBtnCancel: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  formActionBtnCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.error,
  },
  formActionBtnSubmit: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  formActionBtnSubmitText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textInverse,
  },
  restrictedCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    marginVertical: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  restrictedIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  restrictedHeading: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 8,
  },
  restrictedText: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  restrictedReloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#645695',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  restrictedReloadBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
});
