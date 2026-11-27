import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  Modal,
  BackHandler,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/common/Header';
import { SearchBar } from '../../components/common/SearchBar';
import { EmptyState } from '../../components/common/EmptyState';
import { Input } from '../../components/common/Input';
import { MobileDropdown, DropdownOption } from '../../components/common/MobileDropdown';
import { MobileDatePicker } from '../../components/common/MobileDatePicker';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import { Pagination } from '../../components/common/Pagination';
import { creditService } from '../../api/creditService';
import { leadService } from '../../api/leadService';
import { mastersService } from '../../api/mastersService';
import { useCompany } from '../../context/CompanyContext';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../theme/colors';

interface NewTransactionScreenProps {
  route?: any;
  navigation: any;
}

export interface TransactionItem {
  id: number;
  docType: string;
  objType?: number;
  leadID: number;
  leadName: string;
  documentDate: string;
  dueDate?: string;
  documentNumber: string;
  documentAmount: number;
  pendingAmount?: number;
  appliedAmount?: number;
  status: string;
  remark?: string;
  companyID?: number;
}

// Exactly matches Web CRM DocType Cards from DocumentsPage.jsx
export interface DocTypeCard {
  id: string;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  targetDocType: string;
  prefix: string;
  objType: number;
}

// Maps docType or ID to Web CRM ObjType
export const getObjTypeForDoc = (docTypeOrId?: string): number => {
  const t = (docTypeOrId || '').toLowerCase().trim();
  if (t.includes('invoice')) return 1;
  if (t.includes('return')) return 2;
  if (t.includes('incoming') || t === 'receipt') return 3;
  if (t.includes('outgoing') || t === 'payment') return 4;
  if (t.includes('quotation')) return 5;
  if (t.includes('journal')) return 6;
  return 1;
};

const DOC_TYPES: DocTypeCard[] = [
  {
    id: 'Invoice',
    label: 'Invoice',
    description: 'Record customer invoice for goods or services rendered.',
    icon: 'document-text',
    color: '#1a419b',
    targetDocType: 'Sales Invoice',
    prefix: 'INV',
    objType: 1,
  },
  {
    id: 'SalesReturn',
    label: 'Sales Return',
    description: 'Record sales return for returning items or services.',
    icon: 'arrow-undo',
    color: '#20c997',
    targetDocType: 'Sales Return',
    prefix: 'RET',
    objType: 2,
  },
  {
    id: 'JournalEntry',
    label: 'Journal Entry',
    description: 'Record journal adjustments and account corrections.',
    icon: 'journal',
    color: '#6f42c1',
    targetDocType: 'Journal Entry',
    prefix: 'JE',
    objType: 6,
  },
  {
    id: 'PaymentIncoming',
    label: 'Receipt',
    description: 'Record incoming payments from customers or clients.',
    icon: 'arrow-down-circle',
    color: '#198754',
    targetDocType: 'Payment Incoming',
    prefix: 'RCP',
    objType: 3,
  },
  {
    id: 'PaymentOutgoing',
    label: 'Payment',
    description: 'Record outgoing payments to vendors or suppliers.',
    icon: 'arrow-up-circle',
    color: '#dc3545',
    targetDocType: 'Payment Outgoing',
    prefix: 'PAY',
    objType: 4,
  },
];

const FILTER_TABS = ['All', 'Invoice', 'Sales Return', 'Journal Entry', 'Receipt', 'Payment'];

const PAYMENT_MODES: DropdownOption[] = [
  { label: 'NEFT', value: 'NEFT' },
  { label: 'RTGS', value: 'RTGS' },
  { label: 'Cash', value: 'Cash' },
  { label: 'Cheque', value: 'Cheque' },
  { label: 'UPI', value: 'UPI' },
  { label: 'Bank Transfer', value: 'Bank Transfer' },
];

const STATUS_OPTIONS: DropdownOption[] = [
  { label: 'Open', value: 'Open' },
  { label: 'Closed', value: 'Closed' },
];

export const NewTransactionScreen: React.FC<NewTransactionScreenProps> = ({ navigation, route }) => {
const {selectedCompanyId,isCompaniesInitialized,} = useCompany();  const { user } = useAuth();

  const [showForm, setShowForm] = useState<boolean>(false);

  // List State
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<string>('All');

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const PAGE_SIZE = 15;

  // Doc Type Selection Modal (opened by "+ Add" button)
  const [showDocTypeModal, setShowDocTypeModal] = useState<boolean>(false);
  const [selectedType, setSelectedType] = useState<string>('Invoice');
  const [activeDocConfig, setActiveDocConfig] = useState<DocTypeCard>(DOC_TYPES[0]);

  // Lead Dropdown Options
  const [leadOptions, setLeadOptions] = useState<DropdownOption[]>([]);
  const [loadingLeads, setLoadingLeads] = useState<boolean>(false);

  // Form State
  const [editingTransaction, setEditingTransaction] = useState<TransactionItem | null>(null);
  const isEditing = Boolean(editingTransaction);

  const [selectedLeadId, setSelectedLeadId] = useState<string | number>('');
  const [selectedLeadName, setSelectedLeadName] = useState<string>('');
  const [documentDate, setDocumentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [creditDays, setCreditDays] = useState<string>('0');
  const [dueDate, setDueDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [documentNumber, setDocumentNumber] = useState<string>('');
  const [documentAmount, setDocumentAmount] = useState<string>('');
  const [amountType, setAmountType] = useState<'Credit' | 'Debit'>('Credit');
  const [paymentMode, setPaymentMode] = useState<string>('NEFT');
  const [status, setStatus] = useState<string>('Open');
  const [remark, setRemark] = useState<string>('');
  const [selectedAttachment, setSelectedAttachment] = useState<any>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Delete Confirmation Modal State
  const [deleteModalVisible, setDeleteModalVisible] = useState<boolean>(false);
  const [selectedForDelete, setSelectedForDelete] = useState<TransactionItem | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  // Dynamic ObjTypes directly fetched from database Menu table (/Menu/by-parent/60)
  const [menuObjTypes, setMenuObjTypes] = useState<Record<string, number>>({});

  const loadMenuTableDocTypes = useCallback(async () => {
    try {
      const list = await mastersService.getMenuDocTypes(60);
      if (list && list.length > 0) {
        const typeMap: Record<string, number> = {};
        list.forEach((item) => {
          const oType = Number(item.objType);
          if (oType > 0) {
            const n = item.menuName.toLowerCase().trim();
            typeMap[n] = oType;
            if (n.includes('invoice')) typeMap['invoice'] = oType;
            if (n.includes('return')) typeMap['sales return'] = oType;
            if (n.includes('journal')) typeMap['journal entry'] = oType;
            if (n.includes('receipt') || n.includes('incoming')) typeMap['receipt'] = oType;
            if (n.includes('payment') || n.includes('outgoing')) typeMap['payment'] = oType;
          }
        });
        setMenuObjTypes(typeMap);
      }
    } catch (e) {
      console.warn('Error loading doc types from Menu table:', e);
    }
  }, []);

  useEffect(() => {
    loadMenuTableDocTypes();
  }, [loadMenuTableDocTypes]);

  // Helper: Calculate Due Date from Document Date + Credit Days
  const calcDueDate = (baseDate: string, daysStr: string): string => {
    const days = parseInt(daysStr, 10) || 0;
    if (days <= 0 || !baseDate) return baseDate;
    try {
      const d = new Date(baseDate);
      if (isNaN(d.getTime())) return baseDate;
      d.setDate(d.getDate() + days);
      return d.toISOString().split('T')[0];
    } catch {
      return baseDate;
    }
  };

  // Helper: Generate Suggested Document Number
  const generateDocNumber = (prefix: string): string => {
    const dateStr = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 12);
    return `${prefix}-${dateStr}`;
  };

  // 1. Fetch Transactions from API
  const fetchTransactions = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const compId = selectedCompanyId ? Number(selectedCompanyId) : undefined;
      const res = await creditService.getNewTransactions(compId, search.trim());
      setTransactions(res || []);
    } catch (err) {
      console.error('Error fetching transactions:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCompanyId, search]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

 // 2. Fetch Leads for Dropdown
const fetchLeads = useCallback(async () => {

  // Wait until company context is initialized
  if (!isCompaniesInitialized) return;

  setLoadingLeads(true);

  try {
    // null = All Companies = 0
    // Specific company = actual Company ID
    const compId =
      selectedCompanyId === null
        ? 0
        : Number(selectedCompanyId);

    const res = await leadService.getLeads({
      companyId: compId,
      page: 1,
      pageSize: 500,
    });

    const rawLeads = res?.data || [];

    const opts: DropdownOption[] = rawLeads
      .filter(
        (l: any) =>
          l.leadName &&
          l.leadName.trim() !== ''
      )
      .map((l: any) => ({
        label: l.leadName.trim(),
        value: l.leadID || l.id,
        subtitle: l.companyName
          ? `Company: ${l.companyName}`
          : l.mobileNo
            ? `Phone: ${l.mobileNo}`
            : undefined,
      }));

    setLeadOptions(opts);

    console.log('Leads loaded:', {
      companyId: compId,
      totalLeads: opts.length,
    });

  } catch (err: any) {
    console.error('Error loading leads:', err);
  } finally {
    setLoadingLeads(false);              
  }

}, [selectedCompanyId, isCompaniesInitialized]);

useEffect(() => {
  fetchLeads();
}, [fetchLeads]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Back navigation: Form -> List -> Previous Screen (More page)
  useEffect(() => {
    const handleBack = () => {
      if (showForm) {
        setShowForm(false);
        setEditingTransaction(null);
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
        setEditingTransaction(null);
      }
    });

    return unsubscribe;
  }, [navigation, showForm]);

  // Open Add Flow: Show Type Selection Modal
  const openAddTransaction = () => {
    setSelectedType('Invoice');
    setShowDocTypeModal(true);
  };

  // Proceed with selected DocType Card and open Form (Redirects Receipt/Payment to Payment Collection like Web CRM)
  const handleProceedWithDocType = (card: DocTypeCard) => {
    // Exact Web CRM Redirection logic (DocumentsPage.jsx lines 1861-1875):
    // If Receipt (PaymentIncoming) or Payment (PaymentOutgoing), redirect to Payment Collection screen
    if (
      card.id === 'PaymentIncoming' ||
      card.label === 'Receipt' ||
      card.targetDocType === 'Payment Incoming'
    ) {
      setShowDocTypeModal(false);
      navigation.navigate('Receipts', {
        autoOpen: true,
        paymentType: 'incoming',
        openReceipt: true,
      });
      return;
    }

    if (
      card.id === 'PaymentOutgoing' ||
      card.label === 'Payment' ||
      card.targetDocType === 'Payment Outgoing'
    ) {
      setShowDocTypeModal(false);
      navigation.navigate('Receipts', {
        autoOpen: true,
        paymentType: 'outgoing',
        openPayment: true,
      });
      return;
    }

    setActiveDocConfig(card);
    setShowDocTypeModal(false);
    setEditingTransaction(null);

    // Reset form fields with new document defaults
    const today = new Date().toISOString().split('T')[0];
    setSelectedLeadId('');
    setSelectedLeadName('');
    setDocumentDate(today);
    setCreditDays('0');
    setDueDate(today);
    setDocumentNumber('');
    setDocumentAmount('');
    setAmountType('Credit');
    setPaymentMode('NEFT');
    setStatus(card.id === 'PaymentIncoming' ? 'Confirmed' : 'Open');
    setRemark('');
    setErrors({});
    setSelectedAttachment(null);

    setShowForm(true);
  };

  // Handle Lead Selection in Form: auto-fetch credit days if Invoice
  const handleLeadSelect = async (leadIdVal: string | number) => {
    setSelectedLeadId(leadIdVal);
    const found = leadOptions.find((o) => String(o.value) === String(leadIdVal));
    if (found) {
      setSelectedLeadName(found.label);
    }
    if (errors.lead) {
      setErrors((prev) => ({ ...prev, lead: '' }));
    }

    // Auto-fetch credit profile for Invoice documents
    if (activeDocConfig.id === 'Invoice' && selectedCompanyId) {
      try {
        const creditProfile = await creditService.getByLeadAndCompany(
          Number(leadIdVal),
          Number(selectedCompanyId)
        );
        if (creditProfile && creditProfile.creditDays) {
          const daysStr = String(creditProfile.creditDays);
          setCreditDays(daysStr);
          setDueDate(calcDueDate(documentDate, daysStr));
        }
      } catch (e) {
        // Ignore fallback
      }
    }
  };

  // Handle Document Date Change: recalculate Due Date
  const handleDateChange = (newDate: string) => {
    setDocumentDate(newDate);
    if (activeDocConfig.id === 'Invoice') {
      setDueDate(calcDueDate(newDate, creditDays));
    } else {
      setDueDate(newDate);
    }
  };

  // Handle Credit Days Change: recalculate Due Date
  const handleCreditDaysChange = (daysText: string) => {
    const cleaned = daysText.replace(/[^0-9]/g, '');
    setCreditDays(cleaned);
    setDueDate(calcDueDate(documentDate, cleaned));
  };

  // Open Edit Mode
  const openEditTransaction = async (item: TransactionItem) => {
    let config = DOC_TYPES.find((c) =>
      item.docType.toLowerCase().includes(c.id.toLowerCase()) ||
      item.docType.toLowerCase().includes(c.label.toLowerCase())
    );
    if (!config) {
      if (item.docType.toLowerCase().includes('return')) config = DOC_TYPES[1];
      else if (item.docType.toLowerCase().includes('journal')) config = DOC_TYPES[2];
      else if (item.docType.toLowerCase().includes('payment')) config = DOC_TYPES[4];
      else if (item.docType.toLowerCase().includes('receipt')) config = DOC_TYPES[3];
      else config = DOC_TYPES[0];
    }

    setActiveDocConfig(config);
    setSelectedType(config.id);
    setEditingTransaction(item);
    setSelectedLeadId(item.leadID || '');
    const resolvedLeadName =
      !item.leadName || item.leadName.trim() === '' || item.leadName.trim().toLowerCase() === 'lead'
        ? leadOptions.find((o) => String(o.value) === String(item.leadID))?.label || item.leadName || ''
        : item.leadName;
    setSelectedLeadName(resolvedLeadName);
    setDocumentDate(item.documentDate || new Date().toISOString().split('T')[0]);
    setDueDate(item.dueDate || item.documentDate || new Date().toISOString().split('T')[0]);
    setCreditDays('0');
    setDocumentNumber(item.documentNumber || '');
    setDocumentAmount(String(Math.abs(item.documentAmount) || ''));
    setAmountType(item.documentAmount < 0 ? 'Debit' : 'Credit');
    setPaymentMode('NEFT');
    setStatus(item.status || 'Open');
    setRemark(item.remark || '');
    setErrors({});
    setSelectedAttachment(null);

    setShowForm(true);

    // Fetch and bind uploaded attachment for this transaction (all doc types: Invoice, Return, Journal, Receipt, Payment)
    try {
      const docTarget = (config.targetDocType || config.label || '').toLowerCase().trim();
      const objType =
        (item as any).objType ||
        menuObjTypes[docTarget] ||
        menuObjTypes[config.id.toLowerCase()] ||
        config.objType ||
        getObjTypeForDoc(item.docType || config.id);

      const attachments = await creditService.getTransactionAttachments(objType, Number(item.id));
      if (attachments && attachments.length > 0) {
        const att = attachments[0];
        setSelectedAttachment({
          name: att.fileName || att.name || 'Attachment',
          fileName: att.fileName || att.name || 'Attachment',
          fileSize: att.fileSize || att.size || 0,
          size: att.fileSize || att.size || 0,
          extension: att.extension || '',
          attachmentId: att.attachmentId || att.srNo || att.id,
          documentId: Number(item.id),
          objType: att.objType || objType,
          isExisting: true,
        });
      }
    } catch (e) {
      console.warn('Could not load existing attachment:', e);
    }
  };

  // Reset Form Fields
  const handleResetForm = () => {
    Alert.alert('Reset Form', 'Are you sure you want to clear this form?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: () => {
          setSelectedLeadId('');
          setSelectedLeadName('');
          setDocumentDate(new Date().toISOString().split('T')[0]);
          setCreditDays('0');
          setDueDate(new Date().toISOString().split('T')[0]);
          setDocumentNumber('');
          setDocumentAmount('');
          setAmountType('Credit');
          setPaymentMode('NEFT');
          setStatus('Open');
          setRemark('');
          setErrors({});
          setSelectedAttachment(null);
        },
      },
    ]);
  };

  // Form Validation
  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!selectedLeadName.trim() && !selectedLeadId) {
      errs.lead = 'Please select a lead.';
    }
    const amtNum = parseFloat(documentAmount);
    if (!documentAmount.trim() || isNaN(amtNum) || amtNum <= 0) {
      errs.amount = 'Please enter a valid amount greater than 0.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handlePickAttachment = async () => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (!result.canceled && result.assets?.length > 0) {
      setSelectedAttachment(result.assets[0]);
    }
  } catch (error) {
    Alert.alert('Error', 'Unable to select attachment.');
  }
};

  
// Save Transaction (Create or Update)
const handleSaveTransaction = async () => {
  if (!validate()) return;

  setSaving(true);

  try {
    const activeCompanyId = selectedCompanyId
      ? Number(selectedCompanyId)
      : (user?.defaultCompanyId ? Number(user.defaultCompanyId) : 1);

    const parsedAmt = parseFloat(documentAmount) || 0;
    const docTarget = (activeDocConfig.targetDocType || activeDocConfig.label || '').toLowerCase().trim();
    // Dynamic ObjType resolved directly from database Menu table (/Menu/by-parent/60)
    const currentObjType =
      menuObjTypes[docTarget] ||
      menuObjTypes[activeDocConfig.id.toLowerCase()] ||
      activeDocConfig.objType ||
      getObjTypeForDoc(activeDocConfig.targetDocType || activeDocConfig.id);

    const payload: any = {
      docType: activeDocConfig.targetDocType || activeDocConfig.label,
      objType: currentObjType, // Dynamic ObjType from database Menu table
      leadID: Number(selectedLeadId) || 0,
      leadName: selectedLeadName.trim(),
      documentDate: documentDate,
      dueDate: dueDate || documentDate,
      documentNumber: documentNumber.trim()
        ? documentNumber.trim()
        : undefined,
      documentAmount: parsedAmt,
      creditDays: parseInt(creditDays, 10) || 0,
      amountType:
        activeDocConfig.id === 'JournalEntry' ? amountType : undefined,
      paymentMode:
        activeDocConfig.id === 'PaymentIncoming' ||
        activeDocConfig.id === 'PaymentOutgoing'
          ? paymentMode
          : undefined,
      status: status || 'Open',
      remark: remark.trim() || null,
      companyID: activeCompanyId,
      createdBy: user?.userID || user?.id || null,
    };

    let savedResponse: any;
    let documentId: number;

    if (isEditing && editingTransaction) {
      // Update existing transaction
      savedResponse = await creditService.updateNewTransaction(
        editingTransaction.id,
        payload
      );

      // Update API does not return ID, so use existing ID
      documentId = Number(editingTransaction.id);
    } else {
      // Create new transaction
      savedResponse = await creditService.createNewTransaction(payload);

      documentId = Number(
        savedResponse?.id ||
        savedResponse?.Id ||
        savedResponse?.invoice_Document_ID ||
        savedResponse?.Invoice_Document_ID
      );
    }

    // Upload attachment after transaction is saved (only if a new file was chosen)
    if (selectedAttachment && !selectedAttachment.isExisting) {
      if (!documentId) {
        throw new Error(
          'Transaction saved, but document ID was not returned. Attachment could not be uploaded.'
        );
      }

      await creditService.uploadTransactionAttachment(
        currentObjType, // Dynamic ObjType (1: Invoice, 2: Return, 3: Incoming, 4: Outgoing, 6: Journal)
        documentId,
        selectedAttachment
      );
    }

    Alert.alert(
      'Success',
      `${activeDocConfig.label} ${
        isEditing ? 'updated' : 'recorded'
      } successfully!`
    );

    setShowForm(false);
    setEditingTransaction(null);
    setSelectedAttachment(null);

    fetchTransactions();
  } catch (err: any) {
    const msg =
      err?.response?.data?.message ||
      err?.message ||
      'Failed to save transaction.';

    Alert.alert('Error', msg);
  } finally {
    setSaving(false);
  }
};


  // Delete Transaction Execution
  const handleDeleteTransaction = async () => {
    if (!selectedForDelete) return;

    setDeleting(true);
    try {
      await creditService.deleteNewTransaction(selectedForDelete.id, selectedForDelete.docType);
      setDeleteModalVisible(false);
      setSelectedForDelete(null);
      fetchTransactions();
      Alert.alert('Success', 'Transaction deleted successfully!');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to delete transaction.';
      Alert.alert('Delete Failed', msg);
    } finally {
      setDeleting(false);
    }
  };

  // Filtered Transactions List
  const filteredList = useMemo(() => {
    let list = transactions;

    // Filter by Company (if a specific company is selected)
    if (selectedCompanyId) {
      const targetCompId = Number(selectedCompanyId);
      list = list.filter((item) => {
        const itemCompId = item.companyID != null ? Number(item.companyID) : null;
        return itemCompId === null || itemCompId === targetCompId;
      });
    }

    // Filter by Tab
    if (activeFilter !== 'All') {
      const f = activeFilter.toLowerCase();
      list = list.filter((item) => item.docType.toLowerCase().includes(f));
    }

    // Filter by Search Query
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (item) =>
          item.documentNumber.toLowerCase().includes(q) ||
          item.leadName.toLowerCase().includes(q) ||
          item.docType.toLowerCase().includes(q) ||
          (item.remark && item.remark.toLowerCase().includes(q))
      );
    }

    return list;
  }, [transactions, activeFilter, search, selectedCompanyId]);

  // Reset pagination on filter or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, activeFilter, selectedCompanyId]);

  const totalPages = Math.max(1, Math.ceil(filteredList.length / PAGE_SIZE));
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredList.slice(start, start + PAGE_SIZE);
  }, [filteredList, currentPage]);

  // Color & Badge Helpers
  const getDocBadgeInfo = (docType: string) => {
    const dt = docType.toLowerCase();
    if (dt.includes('return')) {
      return { label: 'Return', color: '#0f766e', bg: '#ccfbf1', icon: 'arrow-undo' };
    }
    if (dt.includes('journal')) {
      return { label: 'Journal', color: '#6f42c1', bg: '#ede9fe', icon: 'journal' };
    }
    if (dt.includes('receipt') || dt.includes('incoming')) {
      return { label: 'Receipt', color: '#15803d', bg: '#dcfce7', icon: 'arrow-down-circle' };
    }
    if (dt.includes('payment') || dt.includes('outgoing')) {
      return { label: 'Payment', color: '#dc3545', bg: '#ffe4e6', icon: 'arrow-up-circle' };
    }
    return { label: 'Invoice', color: '#1a419b', bg: '#dbeafe', icon: 'document-text' };
  };

  const activeSelectedCard = DOC_TYPES.find((c) => c.id === selectedType) || DOC_TYPES[0];

  return (
    <View style={styles.container}>
      {/* Screen Header */}
      <Header
        title={showForm ? (isEditing ? 'Edit Transaction' : 'New Transaction') : 'New Transaction'}
        showBack={true}
        onBack={() => {
          if (showForm) {
            setShowForm(false);
            setEditingTransaction(null);
          } else {
            navigation.goBack();
          }
        }}
      />

      {/* ========================================================================= */}
      {/* 1. FULL PAGE FORM (SHOWN WHEN USER TAPS '+ ADD' OR 'EDIT')                */}
      {/* ========================================================================= */}
      {showForm ? (
        <KeyboardAvoidingView
        style={styles.flexOne}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
            {/* Clean Form Card matching LeadsListScreen design & Web CRM */}
            <View style={styles.formCard}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Ionicons name="document-text-outline" size={18} color={Colors.primary} />
                  <Text style={styles.sectionTitle}>
                    {isEditing ? 'Edit Document' : 'Add New Document'}
                  </Text>
                  <View style={styles.formDocTypeBadge}>
                    <Text style={styles.formDocTypeBadgeText}>{activeDocConfig.label}</Text>
                  </View>
                </View>
              </View>

              {/* 1. Lead Selection (Searchable Dropdown) */}
              <MobileDropdown
                label="Lead Name"
                placeholder="Select Lead..."
                options={leadOptions}
                selectedValue={selectedLeadId}
                onSelect={handleLeadSelect}
                loading={loadingLeads}
                required
                searchable
                searchPlaceholder="Search lead name..."
                error={errors.lead}
              />

              {/* 2. Document Date */}
              <MobileDatePicker
                label="Document Date"
                value={documentDate}
                onChangeDate={handleDateChange}
                required
              />

              {/* 3. Credit Days (Shown only for Invoice) */}
              {/* {activeDocConfig.id === 'Invoice' && (
                <Input
                  label="Allocated Credit Days"
                  placeholder="Enter credit days (e.g. 30)"
                  value={creditDays}
                  onChangeText={handleCreditDaysChange}
                  keyboardType="numeric"
                  leftIcon="time-outline"
                />
              )} */}

              {/* 4. Due Date (Auto-calculated, editable) */}
              <MobileDatePicker
                label="Due Date"
                value={dueDate}
                onChangeDate={setDueDate}
                required
              />

              {/* 5. Document Number */}
              <Input
                label="Document Number"
                placeholder="Enter doc number (or leave empty for auto)"
                value={documentNumber}
                onChangeText={setDocumentNumber}
                leftIcon="barcode-outline"
              />

              {/* 6. Document Amount */}
              <Input
                label="Document Amount (₹)"
                placeholder="0.00"
                value={documentAmount}
                onChangeText={(text) => {
                  setDocumentAmount(text);
                  if (errors.amount) setErrors((prev) => ({ ...prev, amount: '' }));
                }}
                keyboardType="numeric"
                error={errors.amount}
                required
                leftIcon="cash-outline"
              />

              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>Attachment</Text>

                <TouchableOpacity
                  style={styles.attachmentInput}
                  onPress={handlePickAttachment}
                  activeOpacity={0.7}
                >
                  <Ionicons name="attach-outline" size={20} color={Colors.primary} />

                  <Text style={styles.attachmentInputText} numberOfLines={1}>
                    {selectedAttachment
                      ? `${selectedAttachment.name || selectedAttachment.fileName || 'Attachment'}${selectedAttachment.isExisting ? ' (Uploaded)' : ''}`
                      : 'Choose Attachment'}
                  </Text>

                  <Ionicons name="folder-open-outline" size={18} color={Colors.primary} />
                </TouchableOpacity>

                {selectedAttachment && (
                  <TouchableOpacity
                    style={styles.removeAttachmentBtn}
                    onPress={() => setSelectedAttachment(null)}
                  >
                    <Ionicons name="trash-outline" size={15} color={Colors.danger} />
                    <Text style={styles.removeAttachmentText}>Remove Attachment</Text>
                  </TouchableOpacity>
                )}
              </View>
              {/* 7. Journal Entry Amount Type (Credit vs Debit) */}
              {activeDocConfig.id === 'JournalEntry' && (
                <View style={styles.fieldBlock}>
                  <Text style={styles.fieldLabel}>Adjustment Type *</Text>
                  <View style={styles.typeToggleRow}>
                    <TouchableOpacity
                      style={[
                        styles.typeToggleBtn,
                        amountType === 'Credit' && styles.typeToggleActiveCredit,
                      ]}
                      onPress={() => setAmountType('Credit')}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name="add-circle-outline"
                        size={16}
                        color={amountType === 'Credit' ? '#ffffff' : Colors.slate600}
                      />
                      <Text
                        style={[
                          styles.typeToggleText,
                          amountType === 'Credit' && styles.typeToggleTextActive,
                        ]}
                      >
                        Credit (+)
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.typeToggleBtn,
                        amountType === 'Debit' && styles.typeToggleActiveDebit,
                      ]}
                      onPress={() => setAmountType('Debit')}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name="remove-circle-outline"
                        size={16}
                        color={amountType === 'Debit' ? '#ffffff' : Colors.slate600}
                      />
                      <Text
                        style={[
                          styles.typeToggleText,
                          amountType === 'Debit' && styles.typeToggleTextActive,
                        ]}
                      >
                        Debit (-)
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* 8. Payment Mode (Shown for Receipt & Payment) */}
              {(activeDocConfig.id === 'PaymentIncoming' || activeDocConfig.id === 'PaymentOutgoing') && (
                <MobileDropdown
                  label="Payment Mode"
                  placeholder="Select payment mode..."
                  options={PAYMENT_MODES}
                  selectedValue={paymentMode}
                  onSelect={(val) => setPaymentMode(String(val))}
                  required
                />
              )}

              {/* 9. Status */}
              <MobileDropdown
                label="Transaction Status"
                placeholder="Select status..."
                options={STATUS_OPTIONS}
                selectedValue={status}
                onSelect={(val) => setStatus(String(val))}
              />

              {/* 10. Remarks */}
              <Input
                label="Remarks / Notes"
                placeholder="Enter transaction remarks or notes..."
                value={remark}
                onChangeText={setRemark}
                multiline
                numberOfLines={3}
                leftIcon="chatbox-ellipses-outline"
              />
            </View>

            {/* Form Action Buttons (matching LeadsListScreen exactly) */}
            <View style={styles.formActionRow}>
              <TouchableOpacity
                style={styles.formActionBtnReset}
                onPress={handleResetForm}
                disabled={saving}
                activeOpacity={0.8}
              >
                <Ionicons name="refresh" size={18} color={Colors.slate600} />
                <Text style={styles.formActionBtnResetText}>Reset</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.formActionBtnSubmit,
                  saving && { opacity: 0.65 },
                ]}
                onPress={handleSaveTransaction}
                disabled={saving}
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-done" size={20} color="#ffffff" />
                    <Text style={styles.formActionBtnSubmitText}>
                      {isEditing ? 'Update Transaction' : 'Save Transaction'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        /* ========================================================================= */
        /* 2. TRANSACTIONS LIST VIEW (MATCHING LEADS LIST SCREEN PATTERN)             */
        /* ========================================================================= */
        <View style={styles.flexOne}>
          {/* Action Row: SearchBar + Add Button */}
          <View style={styles.actionRow}>
            <View style={styles.searchContainer}>
              <SearchBar
                value={search}
                onChangeText={setSearch}
                placeholder="Search doc no, lead..."
              />
            </View>

            <TouchableOpacity
              style={styles.addBtn}
              onPress={openAddTransaction}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={16} color="#ffffff" />
              <Text style={styles.addBtnText}>Add</Text>
            </TouchableOpacity>
          </View>

          {/* Filter Chips Row */}
          <View style={styles.filterTabsContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterTabsScroll}
            >
              {FILTER_TABS.map((tab) => {
                const isActive = activeFilter === tab;
                return (
                  <TouchableOpacity
                    key={tab}
                    style={[styles.filterChip, isActive && styles.filterChipActive]}
                    onPress={() => setActiveFilter(tab)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[styles.filterChipText, isActive && styles.filterChipTextActive]}
                    >
                      {tab}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Transactions FlatList */}
          <FlatList
            data={paginatedTransactions}
            keyExtractor={(item) => String(item.id) + '-' + item.docType}
            renderItem={({ item }) => {
              const badge = getDocBadgeInfo(item.docType);
              const isClosed =
                (item.status || '').toLowerCase() === 'closed' ||
                (item.status || '').toLowerCase() === 'confirmed';

              return (
                <View style={styles.txCard}>
                  {/* Card Header: DocType Tag + Doc Number + Status */}
                  <View style={styles.txCardHeader}>
                    <View style={styles.txBadgeRow}>
                      <View style={[styles.docTypeBadge, { backgroundColor: badge.bg }]}>
                        <Ionicons name={badge.icon as any} size={12} color={badge.color} />
                        <Text style={[styles.docTypeBadgeText, { color: badge.color }]}>
                          {badge.label}
                        </Text>
                      </View>
                      <Text style={styles.docNumberText}>{item.documentNumber}</Text>
                    </View>

                    <View style={[styles.statusBadge, isClosed ? styles.statusBadgeClosed : styles.statusBadgeOpen]}>
                      <Text style={[styles.statusBadgeText, isClosed ? styles.statusTextClosed : styles.statusTextOpen]}>
                        {item.status || 'Open'}
                      </Text>
                    </View>
                  </View>

                  {/* Card Body */}
                  <View style={styles.txCardBody}>
                    {/* Lead Name */}
                    <View style={styles.txRow}>
                      <Ionicons name="person-circle-outline" size={16} color={Colors.slate500} />
                      <Text style={styles.leadNameText} numberOfLines={1}>
                        {!item.leadName || item.leadName.trim() === '' || item.leadName.trim().toLowerCase() === 'lead'
                          ? leadOptions.find((o) => String(o.value) === String(item.leadID))?.label || item.leadName || 'Unnamed Lead'
                          : item.leadName}
                      </Text>
                    </View>

                    {/* Dates */}
                    <View style={styles.txDatesRow}>
                      <View style={styles.dateItem}>
                        <Ionicons name="calendar-outline" size={14} color={Colors.slate400} />
                        <Text style={styles.dateLabel}>Date:</Text>
                        <Text style={styles.dateValue}>{item.documentDate || 'N/A'}</Text>
                      </View>

                      {item.dueDate ? (
                        <View style={styles.dateItem}>
                          <Ionicons name="time-outline" size={14} color={Colors.slate400} />
                          <Text style={styles.dateLabel}>Due:</Text>
                          <Text style={styles.dateValue}>{item.dueDate}</Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Amount & Pending row */}
                    <View style={styles.amountContainer}>
                      <View>
                        <Text style={styles.amountLabel}>Total Amount</Text>
                        <Text style={styles.amountValue}>
                          ₹{Number(Math.abs(item.documentAmount) || 0).toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </Text>
                      </View>

                      {item.pendingAmount !== undefined && item.pendingAmount !== null && (
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={styles.pendingLabel}>Pending</Text>
                          <Text style={styles.pendingValue}>
                            ₹{Number(item.pendingAmount || 0).toLocaleString('en-IN', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Remark if exists */}
                    {Boolean(item.remark) && (
                      <View style={styles.remarkBox}>
                        <Ionicons name="document-text-outline" size={14} color={Colors.slate400} />
                        <Text style={styles.remarkText} numberOfLines={2}>
                          {item.remark}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Card Actions: Edit & Delete */}
                  <View style={styles.txCardActions}>
                    <TouchableOpacity
                      style={styles.actionBtnEdit}
                      onPress={() => openEditTransaction(item)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="create-outline" size={16} color={Colors.primary} />
                      <Text style={styles.actionBtnEditText}>Edit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionBtnDelete}
                      onPress={() => {
                        setSelectedForDelete(item);
                        setDeleteModalVisible(true);
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash-outline" size={16} color={Colors.danger} />
                      <Text style={styles.actionBtnDeleteText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => fetchTransactions(true)}
                colors={[Colors.primary]}
              />
            }
            ListEmptyComponent={
              !loading ? (
                <EmptyState
                  title="No Transactions Found"
                  description="No transactions match your search or filter criteria. Tap below to create your first transaction."
                  actionTitle="Add New Transaction"
                  onAction={openAddTransaction}
                />
              ) : (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                  <Text style={styles.loadingText}>Loading transactions...</Text>
                </View>
              )
            }
          />

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredList.length}
              onPageChange={(p) => setCurrentPage(p)}
              disabled={loading}
            />
          )}
        </View>
      )}

      {/* ========================================================================= */}
      {/* 3. DOC TYPE SELECTION MODAL (MATCHING ORIGINAL TILES FROM WEB EXACTLY)    */}
      {/* ========================================================================= */}
      <Modal
        visible={showDocTypeModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowDocTypeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.docTypeModalBox}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Document Type</Text>
                <Text style={styles.modalSubtitle}>
                  Select the type of document you want to create:
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowDocTypeModal(false)}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={styles.docTypesGrid}>
              {DOC_TYPES.map((card) => {
                const isSelected = selectedType === card.id;
                return (
                  <TouchableOpacity
                    key={card.id}
                    style={[
                      styles.docTypeTile,
                      isSelected && {
                        borderColor: card.color,
                        backgroundColor: `${card.color}10`,
                      },
                    ]}
                    onPress={() => {
                      if (selectedType === card.id) {
                        handleProceedWithDocType(card);
                      } else {
                        setSelectedType(card.id);
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    {isSelected && (
                      <View style={[styles.tileCheckBadge, { backgroundColor: card.color }]}>
                        <Ionicons name="checkmark" size={10} color="#ffffff" />
                      </View>
                    )}

                    <View
                      style={[
                        styles.docTypeIconCircle,
                        {
                          backgroundColor: isSelected ? card.color : `${card.color}15`,
                        },
                      ]}
                    >
                      <Ionicons
                        name={card.icon}
                        size={22}
                        color={isSelected ? '#ffffff' : card.color}
                      />
                    </View>
                    <Text
                      style={[
                        styles.docTypeTileTitle,
                        isSelected && { color: card.color, fontWeight: '800' },
                      ]}
                      numberOfLines={2}
                    >
                      {card.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowDocTypeModal(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.proceedBtn,
                  { backgroundColor: Colors.primary },
                ]}
                onPress={() => {
                  const card = DOC_TYPES.find((c) => c.id === selectedType) || DOC_TYPES[0];
                  handleProceedWithDocType(card);
                }}
              >
                <Text style={styles.proceedBtnText}>Proceed</Text>
                <Ionicons name="arrow-forward" size={16} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* 4. DELETE CONFIRMATION MODAL                                              */}
      {/* ========================================================================= */}
      <ConfirmationModal
        visible={deleteModalVisible}
        title="Delete Transaction"
        message={`Are you sure you want to delete ${selectedForDelete?.documentNumber || 'this transaction'}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        isDestructive={true}
        loading={deleting}
        icon="trash-outline"
        onConfirm={handleDeleteTransaction}
        onCancel={() => {
          setDeleteModalVisible(false);
          setSelectedForDelete(null);
        }}
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
  attachmentInput: {
  height: 48,
  borderWidth: 1,
  borderColor: '#cbd5e1',
  borderRadius: 8,
  paddingHorizontal: 12,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 10,
  backgroundColor: '#ffffff',
},

attachmentInputText: {
  flex: 1,
  fontSize: 13,
  color: '#334155',
},

removeAttachmentBtn: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 5,
  alignSelf: 'flex-end',
  marginTop: 6,
},

removeAttachmentText: {
  fontSize: 12,
  color: Colors.danger,
  fontWeight: '600',
},

  // Action Row (Identical to LeadsListScreen)
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
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

  // Filter Tabs
  filterTabsContainer: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingVertical: 8,
  },
  filterTabsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },

  // List View Content
  listContent: {
    padding: 16,
    paddingBottom: 90,
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

  // Transaction Cards
  txCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
    padding: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  txCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  txBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  docTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  docTypeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  docNumberText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
    flexShrink: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeOpen: {
    backgroundColor: '#fef3c7',
  },
  statusBadgeClosed: {
    backgroundColor: '#dcfce7',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusTextOpen: {
    color: '#b45309',
  },
  statusTextClosed: {
    color: '#15803d',
  },

  // Card Body
  txCardBody: {
    gap: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  leadNameText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    flex: 1,
  },
  txDatesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  dateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  dateValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  amountContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 8,
    marginTop: 2,
  },
  amountLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  amountValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  pendingLabel: {
    fontSize: 11,
    color: '#dc2626',
    fontWeight: '500',
  },
  pendingValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#dc2626',
  },
  remarkBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 2,
  },
  remarkText: {
    fontSize: 12,
    color: '#64748b',
    fontStyle: 'italic',
    flex: 1,
  },

  // Card Actions
  txCardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
    paddingTop: 8,
  },
  actionBtnEdit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
  },
  actionBtnEditText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  actionBtnDelete: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#fee2e2',
  },
  actionBtnDeleteText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.danger,
  },

  // Full Page Form
  fullFormScroll: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  fullFormContent: {
    padding: 16,
    paddingBottom: 180,
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    gap: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 10,
    marginBottom: 2,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  formDocTypeBadge: {
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  formDocTypeBadgeText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },

  // Toggle buttons for Journal Entry
  fieldBlock: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  typeToggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  typeToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  typeToggleActiveCredit: {
    backgroundColor: '#16a34a',
    borderColor: '#16a34a',
  },
  typeToggleActiveDebit: {
    backgroundColor: '#dc2626',
    borderColor: '#dc2626',
  },
  typeToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  typeToggleTextActive: {
    color: '#ffffff',
  },

  // Form Bottom Buttons
  formActionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  formActionBtnReset: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  formActionBtnResetText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  formActionBtnSubmit: {
    flex: 2,
    height: 48,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  formActionBtnSubmitText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },

  // Doc Type Modal Overlay & Original Tiles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  docTypeModalBox: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '100%',
    maxHeight: '85%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1e293b',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '500',
  },
  closeBtn: {
    padding: 4,
  },
  docTypesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 14,
    gap: 10,
    justifyContent: 'flex-start',
  },
  docTypeTile: {
    width: '31%',
    minHeight: 96,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    position: 'relative',
  },
  tileCheckBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docTypeIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  docTypeTileTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
    lineHeight: 14,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#f8fafc',
    gap: 10,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  proceedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 6,
  },
  proceedBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
});
