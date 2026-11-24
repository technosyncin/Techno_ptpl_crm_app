import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  BackHandler,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Header } from '../../components/common/Header';
import { SearchBar } from '../../components/common/SearchBar';
import { CommonListCard } from '../../components/cards/CommonListCard';
import { EmptyState } from '../../components/common/EmptyState';
import { Pagination } from '../../components/common/Pagination';
import { Input } from '../../components/common/Input';
import { MobileDropdown, DropdownOption } from '../../components/common/MobileDropdown';
import { MobileDatePicker } from '../../components/common/MobileDatePicker';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import { quotationService, Quotation } from '../../api/quotationService';
import { leadService, Lead } from '../../api/leadService';
import { useAuth } from '../../context/AuthContext';
import { useCompany } from '../../context/CompanyContext';
import { Colors } from '../../theme/colors';
import { formatCurrency, formatDate } from '../../utils/formatting';

interface QuotationsListScreenProps {
  navigation: any;
  route?: any;
}

export const QuotationsListScreen: React.FC<QuotationsListScreenProps> = ({
  navigation,
  route,
}) => {
  const { user } = useAuth();
  const { selectedCompanyId } = useCompany();

  // Check if quotation was created from the detailed "Create Quotation" form vs simple "Add" form
  const isCreatedInCreateForm = (q?: Quotation | null): boolean => {
    if (!q) return false;
    if (q.docTypeID === 2) return true;
    const rawItems = q.items || (q as any)?.Items;
    if (Array.isArray(rawItems) && rawItems.length > 0) {
      return rawItems.some(
        (it: any) => Boolean((it.item_name || it.itemName)?.trim()) || Number(it.rate) > 0
      );
    }
    return false;
  };

  const initialEditQuotation =
    route?.params?.editQuotation && !isCreatedInCreateForm(route.params.editQuotation)
      ? route.params.editQuotation
      : null;

  // Screen View Mode: false = List View, true = Full-Screen Quick Form
  const [showForm, setShowForm] = useState(
    Boolean(route?.params?.openForm || initialEditQuotation)
  );

  // List Data & Pagination State
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Delete Modal State
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedQuotationForDelete, setSelectedQuotationForDelete] = useState<Quotation | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ==================== FORM 1 STATE (Quick Mobile Form) ====================
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(
    initialEditQuotation
  );
  const isEditing = Boolean(editingQuotation);

  const [leadID, setLeadID] = useState<number | string>(
    editingQuotation?.leadID ? String(editingQuotation.leadID) : ''
  );
  const [leadName, setLeadName] = useState(editingQuotation?.customerName || '');
  const [quotationNo, setQuotationNo] = useState(
    editingQuotation?.quotationNo || (editingQuotation as any)?.qtn_no || ''
  );
  const [quotationDate, setQuotationDate] = useState(
    editingQuotation?.quotationDate
      ? editingQuotation.quotationDate.split('T')[0]
      : new Date().toISOString().split('T')[0]
  );
  const [validTill, setValidTill] = useState(
    editingQuotation?.validUntil
      ? editingQuotation.validUntil.split('T')[0]
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [documentAmount, setDocumentAmount] = useState(
    editingQuotation?.netAmount || editingQuotation?.totalAmount
      ? String(editingQuotation.netAmount || editingQuotation.totalAmount)
      : ''
  );
  const [status, setStatus] = useState<string>(
    editingQuotation?.status ? editingQuotation.status.toLowerCase() : 'open'
  );
  const [productDescription, setProductDescription] = useState(
    editingQuotation?.items && editingQuotation.items[0]?.item_name
      ? editingQuotation.items[0].item_name
      : ''
  );
  const [remarks, setRemarks] = useState(editingQuotation?.remarks || '');

  // Lookups
  const [leadOptions, setLeadOptions] = useState<DropdownOption[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 1. Fetch Quotations List from API
  const fetchQuotations = useCallback(
    async (page = 1, isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const params = {
        companyId: selectedCompanyId ?? undefined,
        search: search.trim() || undefined,
        page,
        pageSize: 15,
      };

      try {
        const res = await quotationService.getQuotations(params);
        setQuotations(res.data || []);
        setCurrentPage(page);
        setTotalPages(res.totalPages || 1);
        setTotalItems(res.total || 0);
      } catch (err: any) {
        console.error('Error fetching quotations:', err);
        setQuotations([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedCompanyId, search]
  );

  // 2. Fetch Leads lookup for Dropdown
  const loadLeadsLookup = useCallback(async () => {
    setLoadingLookups(true);
    try {
      const activeCompanyId = selectedCompanyId || (user?.defaultCompanyId ? Number(user.defaultCompanyId) : 1);
      const data = await leadService.getLeadsForDropdown(activeCompanyId);
      setLeadOptions(
        data.map((lead: Lead) => ({
          label: lead.leadName,
          value: String(lead.leadID),
          subtitle: lead.companyName || undefined,
        }))
      );
    } catch (err) {
      console.warn('Error loading leads dropdown:', err);
    } finally {
      setLoadingLookups(false);
    }
  }, [selectedCompanyId, user]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCompanyId, search]);

  useEffect(() => {
    fetchQuotations(1);
    loadLeadsLookup();
  }, [fetchQuotations, loadLeadsLookup]);

  useFocusEffect(
    useCallback(() => {
      if (!showForm) {
        fetchQuotations(currentPage);
      }
    }, [fetchQuotations, showForm, currentPage])
  );

  // Back navigation: Form -> List -> Previous Screen
  useEffect(() => {
    const handleBack = () => {
      if (showForm) {
        setShowForm(false);
        setEditingQuotation(null);
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
        setEditingQuotation(null);
      }
    });

    return unsubscribe;
  }, [navigation, showForm]);

  // Handle route params
  useEffect(() => {
    if (route?.params?.editQuotation) {
      const q = route.params.editQuotation;
      if (isCreatedInCreateForm(q)) {
        navigation.navigate('AddEditQuotationScreen', { quotation: q });
      } else {
        openEditQuotation(q);
      }
    } else if (route?.params?.openForm) {
      openAddQuotation();
    }
  }, [route?.params]);

  // Open Form for creating a new quotation (Form 1)
  const openAddQuotation = () => {
    setEditingQuotation(null);
    setLeadID('');
    setLeadName('');
    setQuotationNo('');
    setQuotationDate(new Date().toISOString().split('T')[0]);
    setValidTill(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setDocumentAmount('');
    setStatus('open');
    setProductDescription('');
    setRemarks('');
    setErrors({});
    setShowForm(true);
  };

  // Open Form for editing an existing quotation
  const openEditQuotation = (quotation: Quotation) => {
    setEditingQuotation(quotation);
    setLeadID(quotation.leadID ? String(quotation.leadID) : '');
    setLeadName(quotation.customerName || '');
    setQuotationNo(quotation.quotationNo || '');
    setQuotationDate(
      quotation.quotationDate ? quotation.quotationDate.split('T')[0] : new Date().toISOString().split('T')[0]
    );
    setValidTill(
      quotation.validUntil
        ? quotation.validUntil.split('T')[0]
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    );
    setDocumentAmount(
      quotation.netAmount || quotation.totalAmount ? String(quotation.netAmount || quotation.totalAmount) : ''
    );
    setStatus(quotation.status ? quotation.status.toLowerCase() : 'open');
    setProductDescription(
      quotation.items && quotation.items.length > 0 ? quotation.items[0].item_name : ''
    );
    setRemarks(quotation.remarks || '');
    setErrors({});
    setShowForm(true);
  };

  // Open the appropriate form matching where the quotation was created
  const handleEditQuotation = async (item: Quotation) => {
    if (isCreatedInCreateForm(item)) {
      navigation.navigate('AddEditQuotationScreen', { quotation: item });
      return;
    }

    const qId = item.quotationId;
    if (qId) {
      try {
        const full = await quotationService.getQuotationById(Number(qId));
        const fullData = full?.data || full;
        if (fullData) {
          const rawItems = fullData.items || fullData.Items;
          const hasItems =
            Array.isArray(rawItems) &&
            rawItems.some(
              (it: any) => Boolean((it.item_name || it.itemName)?.trim()) || Number(it.rate) > 0
            );
          if (hasItems) {
            navigation.navigate('AddEditQuotationScreen', { quotation: { ...item, ...fullData } });
            return;
          }
        }
      } catch (e) {
        console.warn('Error checking quotation details for edit mode:', e);
      }
    }

    openEditQuotation(item);
  };

  // Reset form fields
  const handleResetForm = () => {
    Alert.alert('Reset Form', 'Are you sure you want to clear all fields?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: () => {
          setLeadID('');
          setLeadName('');
          setQuotationNo('');
          setQuotationDate(new Date().toISOString().split('T')[0]);
          setValidTill(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
          setDocumentAmount('');
          setStatus('open');
          setProductDescription('');
          setRemarks('');
          setErrors({});
        },
      },
    ]);
  };

  // Validate form
  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!leadID && !leadName.trim()) {
      errs.lead = 'Lead Name is required';
    }
    if (!documentAmount.trim()) {
      errs.documentAmount = 'Total Amount is required';
    } else if (isNaN(Number(documentAmount)) || Number(documentAmount) <= 0) {
      errs.documentAmount = 'Please enter a valid positive amount';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Save Quotation (Create or Update)
  const handleSaveQuotation = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      const activeCompanyId = selectedCompanyId || (user?.defaultCompanyId ? Number(user.defaultCompanyId) : 1);
      const parsedAmount = Number(documentAmount) || 0;

      const payload: any = {
        DocTypeID: 1,
        documentTypeID: 1,
        documentType: 'Quotation',
        LeadID: leadID ? Number(leadID) : 0,
        LeadName: leadName.trim(),
        lead_name: leadName.trim(),
        customer: leadName.trim(),
        DocumentReferenceNo: quotationNo.trim() || undefined,
        qtn_no: quotationNo.trim() || undefined,
        DocumentDate: quotationDate,
        qtn_date: quotationDate,
        quotation_date: quotationDate,
        valid_till: validTill,
        DocumentAmount: parsedAmount,
        total_amount: parsedAmount,
        sub_total: parsedAmount,
        qtn_amt: parsedAmount,
        discount: 0,
        bill_discount: 0,
        bill_discount_percent: 0,
        Status: status,
        Remark: remarks.trim() || undefined,
        CompanyID: activeCompanyId,
        CreatedByID: user?.userID || user?.id || 1,
        Items: [],
      };

      if (isEditing && editingQuotation) {
        const qId = editingQuotation.quotationId;
        await quotationService.updateQuotation(qId, payload);
        Alert.alert('Success', 'Quotation updated successfully!');
      } else {
        await quotationService.createQuotation(payload);
        Alert.alert('Success', 'Quotation created successfully!');
      }

      setShowForm(false);
      setEditingQuotation(null);
      fetchQuotations(1);
    } catch (err: any) {
      console.error('Error saving quotation:', err);
      const errorMsg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'Could not save quotation. Please try again.';
      Alert.alert('Save Failed', errorMsg);
    } finally {
      setSaving(false);
    }
  };

  // Delete Quotation
  const handleDeleteQuotation = async () => {
    if (!selectedQuotationForDelete) return;

    setDeleting(true);
    try {
      await quotationService.deleteQuotation(selectedQuotationForDelete.quotationId);
      setDeleteModalVisible(false);
      setSelectedQuotationForDelete(null);
      Alert.alert('Deleted', 'Quotation deleted successfully.');
      fetchQuotations(currentPage);
    } catch (err: any) {
      console.error('Error deleting quotation:', err);
      Alert.alert(
        'Delete Failed',
        err?.response?.data?.message || err?.message || 'Could not delete quotation. Please try again.'
      );
    } finally {
      setDeleting(false);
    }
  };

  const getStatusBadgeVariant = (st: string) => {
    const s = st.toLowerCase();
    if (s === 'approved') return 'success';
    if (s === 'rejected' || s === 'cancelled') return 'danger';
    if (s === 'expired') return 'warning';
    return 'primary';
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <Header
        showBack={false}
        rightComponent={
          !showForm ? (
            <View style={styles.headerButtonsRow}>
              <TouchableOpacity
                style={styles.addBtn}
                onPress={openAddQuotation}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={16} color="#ffffff" />
                <Text style={styles.addBtnText}>Add</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => navigation.navigate('AddEditQuotationScreen')}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={16} color="#ffffff" />
                <Text style={styles.addBtnText}>Create</Text>
              </TouchableOpacity>
            </View>
          ) : undefined
        }
      />

      {/* ========================================================================= */}
      {/* 1. FULL PAGE QUICK FORM (SHOWN WHEN USER TAPS '+ ADD' OR 'EDIT')           */}
      {/* ========================================================================= */}
      {showForm ? (
        <KeyboardAvoidingView
          style={styles.flexOne}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}        >
         <ScrollView
          style={styles.fullFormScroll}
          contentContainerStyle={styles.fullFormContent}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          nestedScrollEnabled={true}
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        >
            {/* Quotation Form Section matching Web CRM */}
            <View style={styles.formCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="document-text-outline" size={18} color={Colors.primary} />
                <Text style={styles.sectionTitle}>
                  {editingQuotation ? 'Edit Quotation' : 'Add New Quotation'}
                </Text>
              </View>

              <MobileDropdown
                label="Lead Name"
                placeholder="Select Lead..."
                options={leadOptions}
                selectedValue={leadID}
                onSelect={(val) => {
                  setLeadID(val);
                  const selected = leadOptions.find((o) => String(o.value) === String(val));
                  if (selected) {
                    setLeadName(selected.label);
                  }
                  if (errors.lead) setErrors((prev) => ({ ...prev, lead: '' }));
                }}
                loading={loadingLookups}
                searchable
                searchPlaceholder="Search Lead..."
                error={errors.lead}
                required
              />

              <MobileDatePicker
                label="Quotation Date"
                value={quotationDate}
                onChangeDate={setQuotationDate}
              />

              <MobileDatePicker
                label="Valid Till"
                value={validTill}
                onChangeDate={setValidTill}
              />

              <Input
                label="Quotation No."
                placeholder="Enter quotation number (optional)"
                value={quotationNo}
                onChangeText={setQuotationNo}
                leftIcon="barcode-outline"
              />

              <Input
                label="Total Amount"
                placeholder="Enter total amount"
                value={documentAmount}
                onChangeText={(text) => {
                  setDocumentAmount(text);
                  if (errors.documentAmount) setErrors((prev) => ({ ...prev, documentAmount: '' }));
                }}
                keyboardType="decimal-pad"
                leftIcon="cash-outline"
                error={errors.documentAmount}
                required
              />

              <MobileDropdown
                label="Status"
                placeholder="Select Status"
                options={[
                  { label: 'Open', value: 'open' },
                  { label: 'Close', value: 'close' },
                  { label: 'Approved', value: 'approved' },
                  { label: 'Rejected', value: 'rejected' },
                  { label: 'Cancelled', value: 'cancelled' },
                ]}
                selectedValue={status}
                onSelect={(val) => setStatus(String(val))}
              />

              <Input
                label="Remark"
                placeholder="Add remarks if any..."
                value={remarks}
                onChangeText={setRemarks}
                multiline
                numberOfLines={3}
                leftIcon="chatbox-ellipses-outline"
              />
            </View>

            {/* Form Action Buttons (Reset & Submit) */}
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
                style={[styles.formActionBtnSubmit, saving && { opacity: 0.65 }]}
                onPress={handleSaveQuotation}
                disabled={saving}
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={Colors.textInverse} />
                ) : (
                  <>
                    <Ionicons name="checkmark-done" size={20} color={Colors.textInverse} />
                    <Text style={styles.formActionBtnSubmitText}>
                      {isEditing ? 'Update Quotation' : 'Save Quotation'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        /* ========================================================================= */
        /* 2. QUOTATIONS LIST VIEW (WITH BOTH 'ADD' AND 'CREATE LIKE WEB' BUTTONS)    */
        /* ========================================================================= */
        <View style={styles.flexOne}>
          {/* Full Row Search Filter */}
          <View style={styles.searchRow}>
            <SearchBar
              value={search}
              onChangeText={setSearch}
              placeholder="Search..."
            />
          </View>

          {/* Quotations FlatList */}
          <FlatList
            data={quotations}
            keyExtractor={(item) => String(item.quotationId)}
            renderItem={({ item }) => (
              <CommonListCard
                title={item.customerName || `Quotation #${item.quotationNo}`}
                subtitle={item.companyName || undefined}
                badgeLabel={item.status ? item.status.toUpperCase() : 'OPEN'}
                badgeVariant={getStatusBadgeVariant(item.status)}
                pills={[
                  (item.items && item.items[0]?.item_name)
                    ? {
                        icon: 'cube-outline',
                        text: item.items[0].item_name,
                        iconColor: Colors.primary,
                      }
                    : null,
                  item.quotationNo
                    ? {
                        icon: 'barcode-outline',
                        text: item.quotationNo,
                      }
                    : null,
                ]}
                metaLeft={{
                  label: 'Amount',
                  value: formatCurrency(item.netAmount ?? item.totalAmount ?? 0),
                  valueColor: Colors.primary,
                }}
                metaRight={
                  item.validUntil
                    ? {
                        label: 'Valid Till',
                        badgeText: formatDate(item.validUntil),
                        badgeIcon: 'time-outline',
                      }
                    : undefined
                }
                footerIcon="document-text-outline"
                footerText={
                  item.quotationDate
                    ? `Date: ${formatDate(item.quotationDate)}${item.remarks ? ` • ${item.remarks}` : ''}`
                    : (item.remarks || undefined)
                }
                onPress={() => handleEditQuotation(item)}
                onEdit={() => handleEditQuotation(item)}
                onDelete={() => {
                  setSelectedQuotationForDelete(item);
                  setDeleteModalVisible(true);
                }}
              />
            )}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => fetchQuotations(1, true)}
                colors={[Colors.primary]}
              />
            }
            ListEmptyComponent={
              !loading ? (
                <EmptyState
                  title="No Quotations Found"
                  description="No quotations match your criteria. Tap below to create your quotation."
                  actionTitle="+ Add Quotation"
                  onAction={openAddQuotation}
                />
              ) : (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                  <Text style={styles.loadingText}>Loading quotations directory...</Text>
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
              onPageChange={(page) => fetchQuotations(page)}
            />
          )}
        </View>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        visible={deleteModalVisible}
        title="Delete Quotation"
        message={`Are you sure you want to delete Quotation "${selectedQuotationForDelete?.quotationNo || ''}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        isDestructive={true}
        loading={deleting}
        onConfirm={handleDeleteQuotation}
        onCancel={() => {
          if (!deleting) {
            setDeleteModalVisible(false);
            setSelectedQuotationForDelete(null);
          }
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  flexOne: {
    flex: 1,
  },
  // Header Buttons Row (Where Quotation title used to be)
  headerButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  // Full Row Search Filter
  searchRow: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    height: 34,
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
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4F46E5',
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 4,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
    elevation: 2,
  },
  createBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  // List Container
  listContent: {
    padding: 16,
    paddingBottom: 90,
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: Colors.slate500,
  },
  // Full-Screen Form
  fullFormScroll: {
    flex: 1,
  },
  fullFormContent: {
  flexGrow: 1,
  padding: 14,
  paddingBottom: 180,
},
  formCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.slate800,
  },
  fullFormActionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
    marginBottom: 30,
  },
  formActionBtnReset: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.slate100,
    paddingVertical: 13,
    borderRadius: 9,
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.slate200,
  },
  formActionBtnResetText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.slate700,
  },
  formActionBtnSubmit: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7C3AED',
    paddingVertical: 13,
    borderRadius: 9,
    gap: 6,
    elevation: 3,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  formActionBtnSubmitText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textInverse,
  },
});