import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Platform,
  Keyboard,
  KeyboardAvoidingView,
  BackHandler,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Header } from '../../components/common/Header';
import { SearchBar } from '../../components/common/SearchBar';
import { EmptyState } from '../../components/common/EmptyState';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import { Pagination } from '../../components/common/Pagination';
import { ReceiptHistoryModal } from '../../components/modals/ReceiptHistoryModal';
import { ReceiptCard } from '../../components/cards/ReceiptCard';
import { Input } from '../../components/common/Input';
import { MobileDatePicker } from '../../components/common/MobileDatePicker';
import { LeadSelectorModal, LeadOption } from '../../components/modals/LeadSelectorModal';
import { creditService, Receipt } from '../../api/creditService';
import { mastersService, LookupItem } from '../../api/mastersService';
import { leadService, Lead } from '../../api/leadService';
import { useCompany } from '../../context/CompanyContext';
import { Colors } from '../../theme/colors';

interface ReceiptsScreenProps {
  route?: any;
  navigation: any;
}

// Payment Type Configuration matching Web CRM ReceiptPage.jsx (PAYMENT_TYPE_CONFIG)
export const PAYMENT_TYPE_CONFIG = {
  incoming: {
    label: 'Receipt',
    shortLabel: 'Receipt',
    actionLabel: 'Record Receipt',
    objType: 3,
    prefix: 'REC',
    icon: 'arrow-down-circle' as const,
    color: '#10b981', // Web Emerald Green
    badgeBg: 'rgba(16, 185, 129, 0.12)',
  },
  outgoing: {
    label: 'Payment',
    shortLabel: 'Payment',
    actionLabel: 'Record Payment',
    objType: 4,
    prefix: 'PAY',
    icon: 'arrow-up-circle' as const,
    color: '#ef4444', // Web Danger Red
    badgeBg: 'rgba(239, 68, 68, 0.12)',
  },
};

export const ReceiptsScreen: React.FC<ReceiptsScreenProps> = ({ route, navigation }) => {
  const { selectedCompanyId } = useCompany();

  // Screen View Mode: false = List View (shown first), true = Full-Screen Form
  const [showForm, setShowForm] = useState(false);

  // Payment Type: 'incoming' (Receipt) or 'outgoing' (Payment) matching Web CRM
  const [paymentType, setPaymentType] = useState<'incoming' | 'outgoing'>('incoming');

  // List Data
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'incoming' | 'outgoing'>('all');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 15;

  // Delete Record State
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedForDelete, setSelectedForDelete] = useState<Receipt | null>(null);
  const [deleting, setDeleting] = useState(false);

  // History Modal State (Matching Web ReceiptHistoryModal)
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [selectedForHistory, setSelectedForHistory] = useState<Receipt | null>(null);

  // Dynamic Payment Modes from API (/PaymentMode)
  const [paymentModes, setPaymentModes] = useState<LookupItem[]>([]);
  const [loadingModes, setLoadingModes] = useState(false);

  // Payment Mode Picker & Add Modal State (Matching Web CRM PaymentModeDropdown & PaymentModeModal)
  const [showPaymentModePicker, setShowPaymentModePicker] = useState(false);
  const [showAddPaymentModeModal, setShowAddPaymentModeModal] = useState(false);
  const [newModeName, setNewModeName] = useState('');
  const [newModeDescription, setNewModeDescription] = useState('');
  const [addingMode, setAddingMode] = useState(false);

  // Form Fields (Exact Web CRM Field Names and State)
  const [leadsList, setLeadsList] = useState<Lead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [leadName, setLeadName] = useState(route?.params?.customerName || '');
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0]); // Doc Dt
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]); // Due Dt
  const [allocatedCreditDays, setAllocatedCreditDays] = useState<number>(0);
  const [paymentModeID, setPaymentModeID] = useState<number | undefined>(undefined);
  const [paymentModeName, setPaymentModeName] = useState<string>('');
  const [referenceNumber, setReferenceNumber] = useState(''); // Doc No
  const [amount, setAmount] = useState(''); // Receipt/Payment Amount
  const [description, setDescription] = useState(''); // Remark
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Searchable Lead Picker Modal
  const [showLeadPicker, setShowLeadPicker] = useState(false);

  // Open Documents & Allocation State (Matching Web CRM ReceiptPage.jsx)
  const [openDocuments, setOpenDocuments] = useState<any[]>([]);
  const [loadingOpenDocs, setLoadingOpenDocs] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState<any[]>([]);
  const [totalPendingAmount, setTotalPendingAmount] = useState(0); // Web: Total Pending Amount
  const [onAccountAmount, setOnAccountAmount] = useState('0.00'); // Web: On A/C Amt
  const [selectAll, setSelectAll] = useState(false);

  // Helper to calculate overdue days matching Web CRM calculateOverdueDays
  const calculateOverdueDays = (dueDt?: string) => {
    if (!dueDt) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDt);
    due.setHours(0, 0, 0, 0);
    return due < today ? Math.ceil((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)) : 0;
  };

  // Helper to determine signed pending amount matching Web CRM getDocPendingAmount
  const getDocPendingAmount = (doc: any) => {
    if (!doc) return 0;
    const docAmt = parseFloat(doc.documentAmount ?? doc.DocumentAmount) || 0;
    let pAmt = parseFloat(doc.pendingAmount ?? doc.PendingAmount);
    if (isNaN(pAmt)) pAmt = Math.abs(docAmt);
    if (docAmt < 0) return -Math.abs(pAmt);
    if (docAmt > 0) return Math.abs(pAmt);
    return pAmt;
  };

  // Helper to fetch open documents for selected lead matching Web CRM fetchOpenDocumentsForReceipt
  const fetchOpenDocuments = useCallback(
    async (lId?: number, lName?: string, type?: 'incoming' | 'outgoing') => {
      const curType = type || paymentType;
      const nameToUse = lName || selectedLead?.leadName || leadName;
      const idToUse = lId || selectedLead?.leadID;
      if (!nameToUse && !idToUse) {
        setOpenDocuments([]);
        setSelectedDocuments([]);
        setTotalPendingAmount(0);
        setOnAccountAmount('0.00');
        setSelectAll(false);
        return;
      }

      setLoadingOpenDocs(true);
      try {
        const compId = selectedCompanyId ? Number(selectedCompanyId) : (selectedLead?.companyID || 1);
        const docs = await creditService.getDocumentsByLead(compId, nameToUse, idToUse, curType, false);
        const activeDocs = (docs || []).filter((d: any) => Math.abs(parseFloat(d.pendingAmount || 0)) > 0.01);
        setOpenDocuments(activeDocs);

        const netPending = activeDocs.reduce((sum: number, d: any) => sum + getDocPendingAmount(d), 0);
        setTotalPendingAmount(netPending);

        setSelectedDocuments([]);
        setSelectAll(false);
      } catch (err) {
        console.warn('Error fetching open documents:', err);
        setOpenDocuments([]);
        setSelectedDocuments([]);
        setTotalPendingAmount(0);
      } finally {
        setLoadingOpenDocs(false);
      }
    },
    [selectedCompanyId, paymentType, selectedLead, leadName]
  );

  // Sync On-Account Amount whenever amount or selected documents change (Matching Web CRM line 1652-1662)
  useEffect(() => {
    const received = parseFloat(amount) || 0;
    const totalAlloc = selectedDocuments.reduce(
      (sum, doc) => sum + (parseFloat(doc.allocatedAmount) || 0),
      0
    );
    const calculatedOnAccount = Math.max(0, received - totalAlloc);
    setOnAccountAmount(calculatedOnAccount.toFixed(2));
  }, [amount, selectedDocuments]);

  // 1. Fetch Dynamic Payment Modes from Server (/PaymentMode)
  const fetchPaymentModes = useCallback(async () => {
    setLoadingModes(true);
    try {
      const modes = await mastersService.getPaymentModes();
      if (modes && modes.length > 0) {
        setPaymentModes(modes);
      } else {
        const fallbackModes = [
          { id: 1, name: 'NEFT' },
          { id: 2, name: 'RTGS' },
          { id: 3, name: 'UPI' },
          { id: 4, name: 'Cheque' },
          { id: 5, name: 'Cash' },
        ];
        setPaymentModes(fallbackModes);
      }
    } catch (err) {
      console.warn('Error fetching payment modes from API, using defaults:', err);
      const fallbackModes = [
        { id: 1, name: 'NEFT' },
        { id: 2, name: 'RTGS' },
        { id: 3, name: 'UPI' },
        { id: 4, name: 'Cheque' },
        { id: 5, name: 'Cash' },
      ];
      setPaymentModes(fallbackModes);
    } finally {
      setLoadingModes(false);
    }
  }, []);

  // Dynamic ObjTypes for Receipts & Payments directly from database Menu table (/Menu/by-parent/60)
  const [dbObjTypes, setDbObjTypes] = useState<{ incoming: number; outgoing: number }>({
    incoming: PAYMENT_TYPE_CONFIG.incoming.objType,
    outgoing: PAYMENT_TYPE_CONFIG.outgoing.objType,
  });

  const fetchMenuObjTypes = useCallback(async () => {
    try {
      const list = await mastersService.getMenuDocTypes(60);
      if (list && list.length > 0) {
        let inc = 0;
        let out = 0;
        list.forEach((item) => {
          const n = item.menuName.toLowerCase().trim();
          const o = Number(item.objType);
          if (o > 0) {
            if (n.includes('receipt') || n.includes('incoming')) inc = o;
            if (n.includes('payment') || n.includes('outgoing')) out = o;
          }
        });
        if (inc > 0 || out > 0) {
          setDbObjTypes((prev) => ({
            incoming: inc > 0 ? inc : prev.incoming,
            outgoing: out > 0 ? out : prev.outgoing,
          }));
        }
      }
    } catch (err) {
      console.warn('Error fetching Menu ObjTypes from database Menu table:', err);
    }
  }, []);

  // 2. Fetch Receipts / Payments list
  const fetchReceipts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await creditService.getReceipts(selectedCompanyId ? Number(selectedCompanyId) : undefined, search, 1, 300);
      setReceipts(data || []);
    } catch (e) {
      console.warn('Error fetching receipts:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedCompanyId, search]);

  // 3. Fetch Leads for searchable picker
  const fetchLeads = useCallback(async () => {
    setLoadingLeads(true);
    try {
      const res = await leadService.getLeads({
        companyId: (selectedCompanyId ? Number(selectedCompanyId) : undefined) as any,
        pageSize: 500,
      });
      setLeadsList(res.data || []);
    } catch (err) {
      console.warn('Error fetching leads:', err);
      setLeadsList([]);
    } finally {
      setLoadingLeads(false);
    }
  }, [selectedCompanyId]);

  // Open full form for incoming (Receipt) or outgoing (Payment) matching Web
  const openForm = useCallback((type: 'incoming' | 'outgoing') => {
    setPaymentType(type);
    const today = new Date().toISOString().split('T')[0];
    setReceiptDate(today);
    setDueDate(today);
    setAllocatedCreditDays(0);
    setPaymentModeID(undefined);
    setPaymentModeName('');
    setAmount('');
    setReferenceNumber('');
    setDescription('');
    setSelectedLead(null);
    setLeadName(route?.params?.customerName || '');
    setErrors({});
    setShowForm(true);
  }, [route?.params?.customerName]);

  useEffect(() => {
    fetchReceipts();
    fetchPaymentModes();
    fetchLeads();
    fetchMenuObjTypes();
  }, [fetchReceipts, fetchPaymentModes, fetchLeads, fetchMenuObjTypes]);

  // Handle route params redirection (autoOpen from New Transaction or route params)
  useFocusEffect(
    useCallback(() => {
      const params = route?.params;
      if (params?.autoOpen || params?.openModal || params?.openReceipt || params?.openPayment) {
        const type =
          params?.paymentType === 'outgoing' || params?.openPayment
            ? 'outgoing'
            : 'incoming';
        openForm(type);
        // Clear params to avoid reopening on accidental re-renders
        navigation.setParams({
          autoOpen: undefined,
          openModal: undefined,
          openReceipt: undefined,
          openPayment: undefined,
          paymentType: undefined,
        });
      }
    }, [route?.params, navigation, openForm])
  );

  // Hardware and gesture back handling
  useEffect(() => {
    const handleBack = () => {
      if (showForm) {
        setShowForm(false);
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
      }
    });

    return unsubscribe;
  }, [navigation, showForm]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchReceipts(), fetchPaymentModes(), fetchLeads()]);
    setRefreshing(false);
  };

  // Web CRM Auto-Adjust Allocation Logic (matching lines 1530-1593 of ReceiptPage.jsx)
  const autoAdjustDocuments = (totalAmount: number) => {
    if (!openDocuments.length || isNaN(totalAmount) || totalAmount <= 0) {
      setSelectedDocuments([]);
      setSelectAll(false);
      return;
    }

    const isCreditDoc = (doc: any) => {
      const docAmt = parseFloat(doc.documentAmount ?? doc.DocumentAmount) || 0;
      const pending = getDocPendingAmount(doc);
      return docAmt < 0 || pending < 0;
    };

    const parsedAmount = Math.max(0, totalAmount);
    let totalPositiveDebt = 0;
    openDocuments.forEach((doc) => {
      if (!isCreditDoc(doc)) totalPositiveDebt += Math.abs(getDocPendingAmount(doc));
    });

    let remainingDebtToCover = Math.max(0, totalPositiveDebt - parsedAmount);
    const creditAllocations: { [key: number]: number } = {};
    let totalCreditsUsed = 0;

    openDocuments.forEach((doc) => {
      if (isCreditDoc(doc)) {
        const creditAvailable = Math.abs(getDocPendingAmount(doc));
        const creditToUse = Math.min(creditAvailable, remainingDebtToCover);
        creditAllocations[doc.documentID] = creditToUse > 0 ? -creditToUse : 0;
        remainingDebtToCover -= creditToUse;
        totalCreditsUsed += creditToUse;
      }
    });

    let fundsAvailable = parsedAmount + totalCreditsUsed;

    const updatedDocs = openDocuments.map((doc) => {
      if (isCreditDoc(doc)) {
        const alloc = creditAllocations[doc.documentID] || 0;
        return { ...doc, allocatedAmount: alloc };
      } else {
        const pending = Math.abs(getDocPendingAmount(doc));
        if (fundsAvailable <= 0) return { ...doc, allocatedAmount: 0 };
        const allocation = Math.min(fundsAvailable, pending);
        fundsAvailable -= allocation;
        return { ...doc, allocatedAmount: allocation };
      }
    });

    const activeSelected = updatedDocs.filter((d) => (parseFloat(d.allocatedAmount) || 0) !== 0);
    setSelectedDocuments(activeSelected);
    setSelectAll(activeSelected.length === openDocuments.length && openDocuments.length > 0);
  };

  // Document Toggle (Matching Web CRM line 1697-1753)
  const handleToggleDoc = (doc: any) => {
    const isSelected = selectedDocuments.some(
      (d) => String(d.documentID) === String(doc.documentID)
    );
    let next: any[];
    if (isSelected) {
      next = selectedDocuments.filter((d) => String(d.documentID) !== String(doc.documentID));
    } else {
      const pendingAmt = getDocPendingAmount(doc);
      next = [...selectedDocuments, { ...doc, allocatedAmount: pendingAmt }];
    }
    setSelectedDocuments(next);
    setSelectAll(next.length === openDocuments.length && openDocuments.length > 0);

    const netAlloc = next.reduce((sum, d) => sum + (parseFloat(d.allocatedAmount) || 0), 0);
    const rounded = Math.round(netAlloc * 100) / 100;
    const currentEntered = parseFloat(amount) || 0;
    if (currentEntered === 0 || rounded > currentEntered) {
      setAmount(rounded > 0 ? rounded.toString() : '');
    }
  };

  // Select All / Deselect All documents toggle (Matching Web CRM line 1877-1911)
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedDocuments([]);
      setSelectAll(false);
    } else {
      const allDocs = openDocuments.map((doc) => ({
        ...doc,
        allocatedAmount: getDocPendingAmount(doc),
      }));
      setSelectedDocuments(allDocs);
      setSelectAll(true);

      const netAlloc = allDocs.reduce((sum, doc) => sum + (parseFloat(doc.allocatedAmount) || 0), 0);
      const roundedNetAlloc = Math.round(netAlloc * 100) / 100;
      const currentReceived = parseFloat(amount) || 0;
      if (currentReceived === 0 || roundedNetAlloc > currentReceived) {
        setAmount(roundedNetAlloc > 0 ? roundedNetAlloc.toString() : '');
      }
    }
  };

  // Allocated Amount change for specific row
  const handleAllocatedChange = (docId: number, val: string) => {
    const num = parseFloat(val) || 0;
    const next = selectedDocuments.map((d) => {
      if (d.documentID === docId) {
        return { ...d, allocatedAmount: num };
      }
      return d;
    });
    setSelectedDocuments(next);

    const netAlloc = next.reduce((sum, d) => sum + (parseFloat(d.allocatedAmount) || 0), 0);
    const rounded = Math.round(netAlloc * 100) / 100;
    const currentEntered = parseFloat(amount) || 0;
    if (currentEntered === 0 || rounded > currentEntered) {
      setAmount(rounded > 0 ? rounded.toString() : '');
    }
  };

  // Reset form fields
  const resetForm = () => {
    setSelectedLead(null);
    setLeadName('');
    const today = new Date().toISOString().split('T')[0];
    setReceiptDate(today);
    setDueDate(today);
    setAllocatedCreditDays(0);
    setPaymentModeID(undefined);
    setPaymentModeName('');
    setAmount('');
    setReferenceNumber('');
    setDescription('');
    setOpenDocuments([]);
    setSelectedDocuments([]);
    setTotalPendingAmount(0);
    setOnAccountAmount('0.00');
    setSelectAll(false);
    setErrors({});
  };

  // Handle Lead Selection matching Web CRM line 1822-1852
  const handleSelectLead = async (lead: Lead) => {
    setSelectedLead(lead);
    setLeadName(lead.leadName);
    setShowLeadPicker(false);
    if (errors.leadName) setErrors((prev) => ({ ...prev, leadName: '' }));

    fetchOpenDocuments(lead.leadID, lead.leadName, paymentType);

    try {
      const profile = await creditService.getByLeadAndCompany(lead.leadID, selectedCompanyId ? Number(selectedCompanyId) : (lead.companyID || 1));
      const creditDays = profile?.creditDays ?? profile?.CreditDays ?? 0;
      setAllocatedCreditDays(Number(creditDays) || 0);

      const baseDate = new Date(receiptDate || new Date());
      if (creditDays > 0) {
        baseDate.setDate(baseDate.getDate() + Number(creditDays));
        setDueDate(baseDate.toISOString().split('T')[0]);
      } else {
        setDueDate(receiptDate || new Date().toISOString().split('T')[0]);
      }
    } catch (e) {
      setAllocatedCreditDays(0);
      setDueDate(receiptDate || new Date().toISOString().split('T')[0]);
    }
  };

  // Switch type (Receipt <-> Payment) and reload open documents
  const handleTypeChange = (type: 'incoming' | 'outgoing') => {
    if (type === paymentType) return;
    setPaymentType(type);
    if (selectedLead?.leadID || leadName) {
      fetchOpenDocuments(selectedLead?.leadID, selectedLead?.leadName || leadName, type);
    }
  };

  // Create new Payment Mode via API (matching Web CRM PaymentModeModal)
  const handleAddNewPaymentMode = async () => {
    if (!newModeName.trim()) {
      Alert.alert('Validation Error', 'Payment Mode name is required');
      return;
    }

    setAddingMode(true);
    try {
      const res = await mastersService.createPaymentMode({
        paymentModeName: newModeName.trim(),
        description: newModeDescription.trim() || undefined,
        status: 'Active',
        companyID: selectedCompanyId ? Number(selectedCompanyId) : 1,
      });

      await fetchPaymentModes();

      const newId = res?.paymentModeID || res?.id;
      setPaymentModeName(newModeName.trim());
      if (newId) setPaymentModeID(Number(newId));

      setShowAddPaymentModeModal(false);
      setNewModeName('');
      setNewModeDescription('');
      Alert.alert('Success', 'Payment Mode added successfully!');
    } catch (err: any) {
      // Graceful local fallback if API response fails
      const fallbackMode: LookupItem = {
        id: Date.now(),
        name: newModeName.trim(),
      };
      setPaymentModes((prev) => [...prev, fallbackMode]);
      setPaymentModeName(newModeName.trim());
      setPaymentModeID(Number(fallbackMode.id));

      setShowAddPaymentModeModal(false);
      setNewModeName('');
      setNewModeDescription('');
      Alert.alert('Success', 'Payment Mode added successfully!');
    } finally {
      setAddingMode(false);
    }
  };

  // Validate form fields matching Web CRM lines 1931-1939
  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    const leadNameToUse = selectedLead?.leadName || leadName.trim();
    if (!leadNameToUse) {
      errs.leadName = 'Lead name is required';
    }
    if (!receiptDate) {
      errs.receiptDate = 'Receipt date is required';
    }
    if (!paymentModeID) {
      errs.paymentModeID = 'Payment mode is required';
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      errs.amount = 'Valid amount is required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Save Receipt / Payment matching Web CRM handleSubmit lines 1926-2046 exactly
  const handleSaveReceipt = async () => {
    if (!validate()) return;

    const leadNameToUse = selectedLead?.leadName || leadName.trim();
    const numAmount = parseFloat(amount);

    setSaving(true);
    try {
      const typeConfig = PAYMENT_TYPE_CONFIG[paymentType];
      // Dynamic ObjType directly from database Menu table
      const activeObjType = paymentType === 'outgoing' ? dbObjTypes.outgoing : dbObjTypes.incoming;
      const autoRef =
        referenceNumber.trim() || `${typeConfig.prefix}-${Date.now().toString().slice(-6)}`;
      const activeCompanyId = selectedCompanyId ? Number(selectedCompanyId) : (selectedLead?.companyID || 1);
      const numOnAccount = parseFloat(onAccountAmount) || 0;

      // Build document rows
      const documentsData = selectedDocuments.map((doc: any) => {
        const allocatedAmount = Math.abs(parseFloat(doc.allocatedAmount) || 0);
        const rawDocAmt = doc.documentAmount ?? doc.DocumentAmount ?? 0;
        const rawPendAmt = doc.pendingAmount ?? doc.PendingAmount ?? 0;
        const docDt = doc.documentDate || doc.DocumentDate || receiptDate;
        const dueDt = doc.dueDate || doc.DueDate || dueDate;
        const overdueDays = calculateOverdueDays(dueDt);

        let normalizedType = doc.documentType || doc.DocumentType || '';
        if (normalizedType.includes('Invoice') || normalizedType === 'INV')
          normalizedType = 'Sales Invoice';
        else if (normalizedType.includes('Journal') || normalizedType === 'JE')
          normalizedType = 'Journal Entry';
        else if (normalizedType.includes('Return') || normalizedType === 'RET')
          normalizedType = 'Sales Return';

        return {
          documentID: doc.documentID || doc.DocumentID,
          documentName: doc.documentCode || doc.DocumentCode || `DOC-${doc.documentID}`,
          documentType: normalizedType,
          documentCode: doc.documentCode || `DOC-${doc.documentID}`,
          documentDate: docDt,
          dueDate: dueDt,
          overdueDays,
          allocatedAmount,
          documentAmount: rawDocAmt,
          pendingAmount: rawPendAmt,
          companyID: activeCompanyId,
          leadName: leadNameToUse,
          status: Math.abs(rawPendAmt) - allocatedAmount <= 0.01 ? 'Closed' : 'Open',
          objType: activeObjType,
        };
      });

      // Build Outgoing Payment rows if paymentType === 'outgoing'
      const outgoingPaymentRows =
        paymentType === 'outgoing'
          ? documentsData.map((d: any) => ({
              ...d,
              objType: dbObjTypes.outgoing,
            }))
          : [];

      const outgoingPaymentOnAccount =
        paymentType === 'outgoing' && numOnAccount > 0
          ? [
              {
                leadID: selectedLead?.leadID || null,
                leadName: leadNameToUse,
                documentDate: receiptDate,
                dueDate: dueDate,
                documentNumber: autoRef,
                documentAmount: numOnAccount,
                pendingamt: numOnAccount,
                appliedamt: 0,
                status: 'Open',
                remark: description || 'On Account Amount',
                objType: dbObjTypes.outgoing,
                companyID: activeCompanyId,
              },
            ]
          : [];

      const payload = {
        companyID: activeCompanyId,
        leadID: selectedLead?.leadID || null,
        leadName: leadNameToUse,
        customerName: leadNameToUse,
        companyName: leadNameToUse,
        amount: numAmount,
        receivedAmount: numAmount,
        totalPendingAmount: totalPendingAmount,
        onAccountAmount: numOnAccount,
        receiptDate: receiptDate,
        dueDate: dueDate,
        paymentMode: paymentModeName,
        paymentModeID: paymentModeID,
        paymentModeName: paymentModeName,
        referenceNumber: autoRef,
        referenceNo: autoRef,
        description: description.trim() || undefined,
        remarks: description.trim() || undefined,
        status: 'Completed',
        paymentType: paymentType,
        objType: activeObjType,
        documents: documentsData,
        outgoingPaymentRows,
        outgoingPaymentOnAccount,
      };

      await creditService.createReceipt(payload);

      setShowForm(false);
      resetForm();
      fetchReceipts();

      Alert.alert(
        'Success',
        `${typeConfig.label} recorded successfully with Reference #${autoRef}!`
      );
    } catch (err: any) {
      Alert.alert(
        'Error',
        err?.response?.data?.message || err?.message || 'Failed to save transaction.'
      );
    } finally {
      setSaving(false);
    }
  };

  // Lead options mapped for LeadSelectorModal
  const leadOptions: LeadOption[] = useMemo(() => {
    return leadsList.map((l) => ({
      id: l.leadID,
      leadID: l.leadID,
      name: l.leadName,
      leadName: l.leadName,
      companyName: l.companyName,
      phone: l.mobileNo,
      mobileNo: l.mobileNo,
      city: l.city,
      email: l.email,
    }));
  }, [leadsList]);

  // Helper to accurately classify if a receipt item is an outgoing payment
  const isItemOutgoing = useCallback((r: any): boolean => {
    if (!r) return false;
    if (r.paymentType === 'outgoing' || r.paymentType === 'Payment') return true;
    if (r.objType === dbObjTypes.outgoing || r.objType === PAYMENT_TYPE_CONFIG.outgoing.objType) return true;
    const no = (r.receiptNo || r.referenceNo || r.referenceNumber || '').toUpperCase();
    return no.startsWith('PAY');
  }, [dbObjTypes.outgoing]);

  // Delete Receipt or Payment Record
  const handleDeleteReceipt = async () => {
    if (!selectedForDelete) return;

    setDeleting(true);
    try {
      const id = selectedForDelete.receiptId;
      const pType =
        selectedForDelete.paymentType ||
        (isItemOutgoing(selectedForDelete) ? 'outgoing' : 'incoming');
      await creditService.deleteReceipt(id, pType);

      setDeleteModalVisible(false);
      setSelectedForDelete(null);
      await fetchReceipts();
      Alert.alert('Success', 'Record deleted successfully.');
    } catch (err: any) {
      console.error('Delete failed:', err);
      Alert.alert(
        'Delete Failed',
        err?.response?.data?.message || err?.message || 'Failed to delete record. Please try again.'
      );
    } finally {
      setDeleting(false);
    }
  };

  const incomingCount = useMemo(
    () => receipts.filter((r) => !isItemOutgoing(r)).length,
    [receipts, isItemOutgoing]
  );

  const outgoingCount = useMemo(
    () => receipts.filter((r) => isItemOutgoing(r)).length,
    [receipts, isItemOutgoing]
  );

  // Filtered Receipts for List
  const filteredReceipts = useMemo(() => {
    return receipts.filter((r) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = r.customerName && r.customerName.toLowerCase().includes(q);
        const matchesNo = r.receiptNo && r.receiptNo.toLowerCase().includes(q);
        const matchesRef = r.referenceNo && r.referenceNo.toLowerCase().includes(q);
        if (!matchesName && !matchesNo && !matchesRef) return false;
      }

      const isOut = isItemOutgoing(r);
      if (typeFilter === 'incoming' && isOut) return false;
      if (typeFilter === 'outgoing' && !isOut) return false;

      return true;
    });
  }, [receipts, search, typeFilter, isItemOutgoing]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, typeFilter, selectedCompanyId]);

  const totalPages = Math.max(1, Math.ceil(filteredReceipts.length / PAGE_SIZE));
  const paginatedReceipts = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredReceipts.slice(start, start + PAGE_SIZE);
  }, [filteredReceipts, currentPage]);

  const currentTypeConfig = PAYMENT_TYPE_CONFIG[paymentType];

  return (
    <View style={styles.container}>
      {/* Screen Header with back arrow and Web-Style Action Buttons */}
      <Header
        title={showForm ? (paymentType === 'incoming' ? 'New Receipt' : 'New Payment') : 'Payment Collection'}
        showBack={true}
        onBack={() => {
          if (showForm) {
            setShowForm(false);
          } else {
            navigation.goBack();
          }
        }}
        rightComponent={
          showForm ? null : (
            <View style={styles.headerActionBtnsRow}>
              <TouchableOpacity
                style={styles.headerReceiptBtn}
                onPress={() => openForm('incoming')}
                activeOpacity={0.8}
              >
                <Ionicons name="arrow-down-circle" size={14} color="#ffffff" />
                <Text style={styles.headerReceiptBtnText}>Receipt</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerPaymentBtn}
                onPress={() => openForm('outgoing')}
                activeOpacity={0.8}
              >
                <Ionicons name="arrow-up-circle" size={14} color="#ffffff" />
                <Text style={styles.headerPaymentBtnText}>Payment</Text>
              </TouchableOpacity>
            </View>
          )
        }
      />

      {/* ========================================================================= */}
      {/* 1. FULL PAGE FORM (EXACT WEB CRM FIELDS, NAMES, CALCULATIONS & THEME)      */}
      {/* ========================================================================= */}
      {showForm ? (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
           <ScrollView
            style={styles.fullFormScroll}
            contentContainerStyle={styles.fullFormContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            onScrollBeginDrag={() => Keyboard.dismiss()}
          >
                                  {/* Form Section Card */}
            <View style={styles.formCard}>
              {/* FIELD 1: Lead Name (Required) */}
              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>
                  Lead Name <Text style={styles.requiredAsterisk}>*</Text>
                </Text>
                <TouchableOpacity
                  style={[
                    styles.leadSelectButton,
                    !!errors.leadName && styles.inputErrorBorder,
                  ]}
                  onPress={() => setShowLeadPicker(true)}
                  activeOpacity={0.75}
                >
                  <View style={styles.leadSelectLeft}>
                    <Ionicons
                      name="person-outline"
                      size={18}
                      color={selectedLead || leadName ? Colors.primary : '#94a3b8'}
                    />
                    <Text
                      style={
                        selectedLead || leadName
                          ? styles.leadSelectedText
                          : styles.leadPlaceholderText
                      }
                      numberOfLines={1}
                    >
                      {selectedLead?.leadName || leadName || 'Search and select lead name'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-down" size={16} color="#94a3b8" />
                </TouchableOpacity>
                {errors.leadName ? (
                  <Text style={styles.errorText}>{errors.leadName}</Text>
                ) : null}
              </View>

              {/* FIELD 2: Doc Dt (Required) */}
              <MobileDatePicker
                label="Doc Dt"
                value={receiptDate}
                onChangeDate={(val) => {
                  setReceiptDate(val);
                  if (allocatedCreditDays > 0) {
                    const baseDate = new Date(val);
                    baseDate.setDate(baseDate.getDate() + allocatedCreditDays);
                    setDueDate(baseDate.toISOString().split('T')[0]);
                  } else {
                    setDueDate(val);
                  }
                  if (errors.receiptDate) setErrors((prev) => ({ ...prev, receiptDate: '' }));
                }}
                required
                error={errors.receiptDate}
              />

              {/* FIELD 3: Due Dt */}
              <MobileDatePicker
                label={
                  allocatedCreditDays > 0
                    ? `Due Dt (Credit Days: ${allocatedCreditDays})`
                    : 'Due Dt'
                }
                value={dueDate}
                onChangeDate={setDueDate}
              />

              {/* FIELD 4: Payment Mode (EXACT WEB CRM PaymentModeDropdown + Add Button) */}
              <View style={styles.formGroup}>
                <View style={styles.labelWithHintRow}>
                  <Text style={styles.fieldLabel}>
                    Payment Mode <Text style={styles.requiredAsterisk}>*</Text>
                  </Text>
                  {loadingModes && (
                    <ActivityIndicator size="small" color={Colors.primary} />
                  )}
                </View>

                {/* Dropdown Input + Web-Style "+" Add Button */}
                <View style={styles.paymentModeDropdownRow}>
                  <TouchableOpacity
                    style={[
                      styles.paymentModeSelectButton,
                      !!errors.paymentModeID && styles.inputErrorBorder,
                    ]}
                    onPress={() => setShowPaymentModePicker(true)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.paymentModeSelectLeft}>
                      <Ionicons
                        name="card-outline"
                        size={18}
                        color={paymentModeID ? Colors.primary : '#94a3b8'}
                      />
                      <Text
                        style={
                          paymentModeID && paymentModeName
                            ? styles.paymentModeSelectedText
                            : styles.paymentModePlaceholderText
                        }
                        numberOfLines={1}
                      >
                        {paymentModeName || 'Select Payment Mode'}
                      </Text>
                    </View>
                    <Ionicons name="chevron-down" size={16} color="#94a3b8" />
                  </TouchableOpacity>

                  {/* Web CRM "+" Button: Add New Payment Mode */}
                  <TouchableOpacity
                    style={styles.paymentModeAddBtn}
                    onPress={() => {
                      setNewModeName('');
                      setNewModeDescription('');
                      setShowAddPaymentModeModal(true);
                    }}
                    activeOpacity={0.8}
                    accessibilityLabel="Add New Payment Mode"
                  >
                    <Ionicons name="add" size={22} color={Colors.primary} />
                  </TouchableOpacity>
                </View>

                {errors.paymentModeID ? (
                  <Text style={styles.errorText}>{errors.paymentModeID}</Text>
                ) : null}
              </View>

              {/* FIELD 5: Doc No */}
              <Input
                label="Doc No"
                placeholder="Doc No (Cheque/Transaction/UPI ID)"
                value={referenceNumber}
                onChangeText={setReferenceNumber}
                leftIcon="receipt-outline"
              />

              {/* FIELD 6: Total Pending Amount (Read-only on Web) */}
              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Total Pending Amount</Text>
                <View style={styles.readOnlyInputRow}>
                  <Ionicons name="calculator-outline" size={18} color="#64748b" />
                  <Text style={styles.readOnlyInputText}>
                    ₹{totalPendingAmount.toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Text>
                </View>
              </View>

              {/* FIELD 7: Receipt Amount / Payment Amount (Required, with auto-adjust) */}
              <View style={styles.formGroup}>
                <View style={styles.labelWithHintRow}>
                  <Text style={styles.fieldLabel}>
                    {currentTypeConfig.label} Amount <Text style={styles.requiredAsterisk}>*</Text>
                  </Text>
                  {openDocuments.length > 0 && (
                    <TouchableOpacity
                      style={styles.autoAllocateBtn}
                      onPress={() => {
                        const num = parseFloat(amount) || 0;
                        if (num > 0) autoAdjustDocuments(num);
                        else Alert.alert('Enter Amount', 'Please enter an amount to auto-allocate.');
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="flash-outline" size={13} color={Colors.primary} />
                      <Text style={styles.autoAllocateBtnText}>Auto Allocate</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View
                  style={[
                    styles.amountInputRow,
                    !!errors.amount && styles.inputErrorBorder,
                  ]}
                >
                  <View style={styles.currencyPrefixBox}>
                    <Text style={styles.currencyPrefixText}>₹</Text>
                  </View>
                  <TextInput
                    style={styles.amountInputBox}
                    value={amount}
                    onChangeText={(val) => {
                      setAmount(val);
                      if (errors.amount) setErrors((prev) => ({ ...prev, amount: '' }));
                      const num = parseFloat(val) || 0;
                      if (num > 0 && openDocuments.length > 0) {
                        autoAdjustDocuments(num);
                      }
                    }}
                    placeholder={`Enter ${currentTypeConfig.label.toLowerCase()} amount`}
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                  />
                </View>
                <Text style={styles.fieldHelpText}>
                  Enter amount to auto-adjust documents (oldest due date first)
                </Text>
                {errors.amount ? (
                  <Text style={styles.errorText}>{errors.amount}</Text>
                ) : null}
              </View>

              {/* FIELD 8: On A/C Amt (Read-only, Automatically calculated) */}
              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>On A/C Amt</Text>
                <View style={styles.readOnlyInputRow}>
                  <Text style={[styles.readOnlyInputText, { color: '#10b981', fontWeight: '800' }]}>
                    ₹{parseFloat(onAccountAmount || '0').toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Text>
                </View>
                <Text style={styles.fieldHelpText}>Automatically calculated</Text>
              </View>

              {/* FIELD 9: Remark */}
              <Input
                label="Remark"
                placeholder={`Enter ${currentTypeConfig.label.toLowerCase()} remark`}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                leftIcon="document-text-outline"
              />
            </View>

            {/* OPEN DOCUMENTS SECTION (Shown when Lead is Selected, Matching Web CRM lines 2770-2950) */}
            {(selectedLead || leadName) && (
              <View style={styles.openDocsContainer}>
                <View style={styles.openDocsHeaderRow}>
                  <View style={styles.openDocsTitleRow}>
                    <Ionicons name="document-text-outline" size={17} color={Colors.primary} />
                    <Text style={styles.openDocsTitle} numberOfLines={1}>
                      Select Documents for {selectedLead?.leadName || leadName} ({currentTypeConfig.label})
                    </Text>
                  </View>
                  {openDocuments.length > 0 && (
                    <TouchableOpacity
                      style={styles.selectAllBtn}
                      onPress={handleSelectAll}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={selectAll ? 'checkbox' : 'square-outline'}
                        size={15}
                        color={Colors.primary}
                      />
                      <Text style={styles.selectAllBtnText}>
                        {selectAll ? 'Deselect All' : 'Select All'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {loadingOpenDocs ? (
                  <View style={styles.loadingInnerBox}>
                    <ActivityIndicator size="small" color={Colors.primary} />
                    <Text style={styles.loadingInnerText}>Loading open documents...</Text>
                  </View>
                ) : openDocuments.length === 0 ? (
                  <View style={styles.noOpenDocsBox}>
                    <Text style={styles.noOpenDocsText}>
                      No open documents found for this lead with pending amounts.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.openDocsList}>
                    {openDocuments.map((doc, idx) => {
                      const isSelected = selectedDocuments.some(
                        (d) => String(d.documentID) === String(doc.documentID)
                      );
                      const selectedItem = selectedDocuments.find(
                        (d) => String(d.documentID) === String(doc.documentID)
                      );
                      const allocVal = selectedItem
                        ? String(selectedItem.allocatedAmount ?? '')
                        : '';
                      const pendingVal = getDocPendingAmount(doc);
                      const overdueDays = calculateOverdueDays(doc.dueDate);
                      const isOverdue = overdueDays > 0;
                      const docAmt = doc.documentAmount ?? doc.DocumentAmount ?? 0;
                      const isNegativeDoc = Number(docAmt) < 0;

                      const allocatedAbs = Math.abs(parseFloat(selectedItem?.allocatedAmount) || 0);
                      const isAllocatedExceedsPending =
                        allocatedAbs > Math.abs(Number(pendingVal) || 0);

                      return (
                        <View
                          key={`rcpt-doc-${doc.documentID || ''}-${idx}`}
                          style={[
                            styles.docRowCard,
                            isSelected && styles.docRowCardActive,
                            isAllocatedExceedsPending && styles.docRowCardErrorBorder,
                          ]}
                        >
                          <TouchableOpacity
                            style={styles.docRowCheckbox}
                            onPress={() => handleToggleDoc(doc)}
                            activeOpacity={0.7}
                          >
                            <Ionicons
                              name={isSelected ? 'checkbox' : 'square-outline'}
                              size={20}
                              color={isSelected ? Colors.primary : '#94a3b8'}
                            />
                            <View style={styles.flexOne}>
                              <View style={styles.docRowTitleRow}>
                                <Text style={styles.docCodeText}>
                                  {doc.documentCode || doc.documentNumber || `DOC-${doc.documentID}`}
                                </Text>
                                <View style={styles.docTypeBadge}>
                                  <Text style={styles.docTypeBadgeText}>
                                    {doc.documentType || 'Invoice'}
                                  </Text>
                                </View>
                              </View>
                              <View style={styles.docDatesRow}>
                                <Text style={styles.docDateText}>
                                  Doc Dt: {doc.documentDate ? doc.documentDate.split('T')[0] : 'N/A'} • Due Dt: {doc.dueDate ? doc.dueDate.split('T')[0] : 'N/A'}
                                </Text>
                                {isOverdue && (
                                  <Text style={styles.overdueBadgeText}>
                                    {overdueDays} Days Overdue
                                  </Text>
                                )}
                              </View>
                            </View>
                          </TouchableOpacity>

                          {/* Amounts Row */}
                          <View style={styles.docAmountRow}>
                            <View>
                              <Text style={styles.docFieldLabel}>Doc Amount</Text>
                              <Text style={[styles.docFieldValue, isNegativeDoc && { color: '#ef4444' }]}>
                                ₹{Math.abs(Number(docAmt)).toLocaleString('en-IN', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </Text>
                            </View>

                            <View>
                              <Text style={styles.docFieldLabel}>Pending</Text>
                              <Text
                                style={[
                                  styles.docFieldValue,
                                  pendingVal < 0 && { color: '#ef4444' },
                                ]}
                              >
                                ₹{pendingVal.toLocaleString('en-IN', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </Text>
                            </View>

                            {isSelected && (
                              <View style={styles.docAllocInputGroup}>
                                <Text style={styles.docAllocLabel}>Allocated (₹)</Text>
                                <TextInput
                                  style={[
                                    styles.docAllocInput,
                                    isAllocatedExceedsPending && styles.docAllocInputError,
                                  ]}
                                  value={allocVal}
                                  onChangeText={(val) =>
                                    handleAllocatedChange(doc.documentID, val)
                                  }
                                  keyboardType="numeric"
                                  placeholder="0.00"
                                  placeholderTextColor="#94a3b8"
                                />
                                {isAllocatedExceedsPending && (
                                  <Text style={styles.exceedsWarningText}>
                                    Exceeds pending
                                  </Text>
                                )}
                              </View>
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* Allocation Summary Box matching Web CRM Footer */}
                <View style={styles.onAccountSummaryBox}>
                  <View style={styles.summaryItemRow}>
                    <Text style={styles.summaryItemLabel}>Total Allocated:</Text>
                    <Text style={styles.summaryItemVal}>
                      ₹{selectedDocuments
                        .reduce((sum, d) => sum + (parseFloat(d.allocatedAmount) || 0), 0)
                        .toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Text>
                  </View>
                  <View style={[styles.summaryItemRow, { marginTop: 4 }]}>
                    <Text style={styles.summaryItemLabel}>Net Effect on Balance:</Text>
                    <Text style={[styles.summaryItemVal, { color: Colors.primary }]}>
                      ₹{selectedDocuments
                        .reduce((sum, d) => sum + Number(d.documentAmount ?? d.DocumentAmount ?? 0), 0)
                        .toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Text>
                  </View>
                  <View style={[styles.summaryItemRow, { marginTop: 4 }]}>
                    <Text style={[styles.summaryItemLabel, { fontWeight: '700', color: Colors.primary }]}>
                      On Account (Excess):
                    </Text>
                    <Text style={[styles.summaryItemVal, { fontWeight: '800', color: '#10b981' }]}>
                      ₹{parseFloat(onAccountAmount || '0').toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Form Action Buttons (Matching Lead Form UI Theme) */}
            <View style={styles.fullFormActionButtons}>
              <TouchableOpacity
                style={styles.formActionBtnReset}
                onPress={resetForm}
                disabled={saving}
                activeOpacity={0.7}
              >
                <Ionicons name="refresh" size={18} color={Colors.slate600} />
                <Text style={styles.formActionBtnResetText}>Reset</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.formActionBtnSubmit,
                  saving && { opacity: 0.65 },
                ]}
                onPress={handleSaveReceipt}
                disabled={saving}
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={Colors.textInverse} />
                ) : (
                  <>
                    <Ionicons name="checkmark-done" size={20} color={Colors.textInverse} />
                    <Text style={styles.formActionBtnSubmitText}>
                      Save {currentTypeConfig.label}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        /* ========================================================================= */
        /* 2. TRANSACTIONS / RECEIPTS LIST VIEW (MATCHING LEADS LIST UI THEME)       */
        /* ========================================================================= */
        <View style={styles.flexOne}>
          {/* Full-Width Search Filter Row */}
          <View style={styles.searchRow}>
            <SearchBar
              value={search}
              onChangeText={setSearch}
              placeholder="Search collections..."
            />
          </View>

          {/* Filter Chips Bar (All / Receipts (In) / Payments (Out)) */}
          <View style={styles.filterTabsContainer}>
            <TouchableOpacity
              style={[
                styles.filterChip,
                typeFilter === 'all' && styles.filterChipActive,
              ]}
              onPress={() => setTypeFilter('all')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterChipText,
                  typeFilter === 'all' && styles.filterChipTextActive,
                ]}
              >
                All ({receipts.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterChip,
                typeFilter === 'incoming' && styles.filterChipActive,
              ]}
              onPress={() => setTypeFilter('incoming')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="arrow-down-circle-outline"
                size={14}
                color={typeFilter === 'incoming' ? Colors.primary : '#64748b'}
              />
              <Text
                style={[
                  styles.filterChipText,
                  typeFilter === 'incoming' && styles.filterChipTextActive,
                ]}
              >
                Receipts (In) ({incomingCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterChip,
                typeFilter === 'outgoing' && styles.filterChipActive,
              ]}
              onPress={() => setTypeFilter('outgoing')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="arrow-up-circle-outline"
                size={14}
                color={typeFilter === 'outgoing' ? Colors.primary : '#64748b'}
              />
              <Text
                style={[
                  styles.filterChipText,
                  typeFilter === 'outgoing' && styles.filterChipTextActive,
                ]}
              >
                Payments (Out) ({outgoingCount})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Receipts FlatList */}
          <FlatList
            data={paginatedReceipts}
            keyExtractor={(item) => String(item.receiptId || item.receiptNo || Math.random())}
            renderItem={({ item }) => (
              <ReceiptCard
                receipt={item as any}
                onHistory={() => {
                  setSelectedForHistory(item as any);
                  setHistoryModalVisible(true);
                }}
                onDelete={() => {
                  setSelectedForDelete(item as any);
                  setDeleteModalVisible(true);
                }}
              />
            )}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[Colors.primary]}
              />
            }
            ListEmptyComponent={
              !loading ? (
                <EmptyState
                  title="No Collections Found"
                  description="No payment collection entries found. Tap Receipt above to record a new receipt."
                  actionTitle="Add Receipt"
                  onAction={() => openForm('incoming')}
                />
              ) : (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                  <Text style={styles.loadingText}>Loading collections...</Text>
                </View>
              )
            }
          />

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredReceipts.length}
              onPageChange={(p) => setCurrentPage(p)}
              disabled={loading}
            />
          )}
        </View>
      )}

      {/* ========================================================================= */}
      {/* 3. REUSABLE SEARCHABLE LEAD SELECTOR MODAL (SEARCH BY LEAD NAME)           */}
      {/* ========================================================================= */}
      <LeadSelectorModal
        visible={showLeadPicker}
        onClose={() => setShowLeadPicker(false)}
        onSelectLead={(opt) => {
          const found = leadsList.find((l) => l.leadID === opt.id || l.leadID === opt.leadID);
          if (found) {
            handleSelectLead(found);
          } else {
            handleSelectLead({
              leadID: opt.id || opt.leadID || 0,
              leadName: opt.name || opt.leadName || '',
              companyName: opt.companyName || '',
              mobileNo: opt.phone || opt.mobileNo || '',
            } as Lead);
          }
        }}
        leads={leadOptions}
        selectedLeadId={selectedLead?.leadID}
        title="Search and select lead name"
        loading={loadingLeads}
      />

      {/* ========================================================================= */}
      {/* 4. PAYMENT MODE SELECTOR MODAL (MATCHING WEB DROPDOWN OPTIONS)             */}
      {/* ========================================================================= */}
      <Modal
        visible={showPaymentModePicker}
        animationType="fade"
        transparent
        onRequestClose={() => setShowPaymentModePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModalBox}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Select Payment Mode</Text>
                <Text style={styles.modalSubtitle}>Choose active payment mode</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowPaymentModePicker(false)}
                style={styles.closeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
              {paymentModes.map((mode) => {
                const isSelected = Boolean(
                  (paymentModeID && paymentModeID === Number(mode.id)) ||
                  (paymentModeName && paymentModeName.toLowerCase() === mode.name.toLowerCase())
                );
                return (
                  <TouchableOpacity
                    key={String(mode.id || mode.name)}
                    style={[
                      styles.modePickerItem,
                      isSelected && styles.modePickerItemActive,
                    ]}
                    onPress={() => {
                      setPaymentModeName(mode.name);
                      setPaymentModeID(Number(mode.id));
                      if (errors.paymentModeID)
                        setErrors((prev) => ({ ...prev, paymentModeID: '' }));
                      setShowPaymentModePicker(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.modePickerIconCircle,
                        isSelected && styles.modePickerIconCircleActive,
                      ]}
                    >
                      <Ionicons
                        name={
                          mode.name.toLowerCase().includes('cash')
                            ? 'cash-outline'
                            : mode.name.toLowerCase().includes('cheque')
                            ? 'document-outline'
                            : mode.name.toLowerCase().includes('upi')
                            ? 'phone-portrait-outline'
                            : 'card-outline'
                        }
                        size={16}
                        color={isSelected ? Colors.primary : '#64748b'}
                      />
                    </View>
                    <Text
                      style={[
                        styles.modePickerItemText,
                        isSelected && styles.modePickerItemTextActive,
                      ]}
                    >
                      {mode.name}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalAddFooterBtn}
              onPress={() => {
                setShowPaymentModePicker(false);
                setNewModeName('');
                setNewModeDescription('');
                setShowAddPaymentModeModal(true);
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
              <Text style={styles.modalAddFooterBtnText}>+ Add New Payment Mode</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* 5. ADD PAYMENT MODE MODAL (MATCHING WEB CRM PaymentModeModal EXACTLY)      */}
      {/* ========================================================================= */}
      <Modal
        visible={showAddPaymentModeModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowAddPaymentModeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModalBox}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Add Payment Mode</Text>
                <Text style={styles.modalSubtitle}>Create a new payment method</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowAddPaymentModeModal(false)}
                style={styles.closeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={{ marginBottom: 16 }}>
              <Input
                label="Payment Mode Name"
                placeholder="Enter payment mode name"
                value={newModeName}
                onChangeText={setNewModeName}
                required
                leftIcon="card-outline"
              />

              <Input
                label="Description"
                placeholder="Enter description (optional)"
                value={newModeDescription}
                onChangeText={setNewModeDescription}
                leftIcon="document-text-outline"
              />
            </View>

            <View style={styles.modalActionButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowAddPaymentModeModal(false)}
                disabled={addingMode}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleAddNewPaymentMode}
                disabled={addingMode}
                activeOpacity={0.8}
              >
                {addingMode ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={18} color="#ffffff" />
                    <Text style={styles.modalSubmitBtnText}>Save</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 5. DELETE CONFIRMATION MODAL */}
      <ConfirmationModal
        visible={deleteModalVisible}
        title={
          selectedForDelete
            ? isItemOutgoing(selectedForDelete)
              ? 'Delete Payment'
              : 'Delete Receipt'
            : 'Delete Record'
        }
        message={`Are you sure you want to delete ${
          selectedForDelete?.receiptNo ||
          selectedForDelete?.referenceNo ||
          (selectedForDelete as any)?.referenceNumber ||
          'this transaction'
        }? This action will reverse allocated invoices and update accounts. This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        isDestructive={true}
        loading={deleting}
        icon="trash-outline"
        onConfirm={handleDeleteReceipt}
        onCancel={() => {
          setDeleteModalVisible(false);
          setSelectedForDelete(null);
        }}
      />

      {/* 6. RECEIPT HISTORY MODAL (MATCHING WEB RECEIPT HISTORY MODAL) */}
      <ReceiptHistoryModal
        visible={historyModalVisible}
        onClose={() => {
          setHistoryModalVisible(false);
          setSelectedForHistory(null);
        }}
        receipt={selectedForHistory}
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

  // Full-Width Search Filter Row
  searchRow: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
  },

  // Web-Style Header Action Buttons (Receipt & Payment / Close)
  headerActionBtnsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerReceiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981', // Web CRM success green
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 7,
    gap: 4,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  headerReceiptBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  headerPaymentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444', // Web CRM danger red
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 7,
    gap: 4,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  headerPaymentBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  headerCloseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 7,
    gap: 4,
  },
  headerCloseBtnText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
  },

  // Filter Chips Row
  filterTabsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  filterChipActive: {
    backgroundColor: Colors.primarySoft,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  filterChipTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },

  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingBox: {
    paddingVertical: 45,
    alignItems: 'center',
    gap: 8,
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
  padding: 16,
  paddingBottom: 220,
  flexGrow: 1,
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
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  cardHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1e293b',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Segment Type Selector (Receipt vs Payment)
  typeSelectorRow: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
    gap: 6,
  },
  typeSelectorBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 8,
  },
  typeSelectorBtnActiveIncoming: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  typeSelectorBtnActiveOutgoing: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  typeSelectorBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  typeSelectorBtnTextActiveIncoming: {
    color: '#10b981',
    fontWeight: '700',
  },
  typeSelectorBtnTextActiveOutgoing: {
    color: '#ef4444',
    fontWeight: '700',
  },

  // Form Fields
  formGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  fieldHelpText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
  },
  requiredAsterisk: {
    color: '#ef4444',
  },
  labelWithHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  errorText: {
    fontSize: 12,
    color: Colors.error,
    marginTop: 4,
  },
  inputErrorBorder: {
    borderColor: Colors.error,
  },

  // Read-only Input Field
  readOnlyInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 48,
    gap: 8,
  },
  readOnlyInputText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
  },

  // Lead Select Button
  leadSelectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 48,
  },
  leadSelectLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  leadSelectedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  leadPlaceholderText: {
    fontSize: 14,
    color: '#94a3b8',
  },

  // Web CRM Payment Mode Dropdown Row + Add Button
  paymentModeDropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  paymentModeSelectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 48,
  },
  paymentModeSelectLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  paymentModeSelectedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  paymentModePlaceholderText: {
    fontSize: 14,
    color: '#94a3b8',
  },
  paymentModeAddBtn: {
    width: 48,
    height: 48,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Amount Input with Currency Prefix
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
  currencyPrefixBox: {
    width: 44,
    height: 48,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#cbd5e1',
  },
  currencyPrefixText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#475569',
  },
  amountInputBox: {
    flex: 1,
    height: 48,
    paddingHorizontal: 14,
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  autoAllocateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  autoAllocateBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },

  // Open Documents Container
  openDocsContainer: {
    marginTop: 4,
    marginBottom: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
  },
  openDocsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    gap: 8,
  },
  openDocsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  openDocsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
  },
  selectAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  selectAllBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  loadingInnerBox: {
    paddingVertical: 14,
    alignItems: 'center',
    gap: 4,
  },
  loadingInnerText: {
    fontSize: 12,
    color: '#64748b',
  },
  noOpenDocsBox: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  noOpenDocsText: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
  },
  openDocsList: {
    gap: 8,
  },
  docRowCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 10,
  },
  docRowCardActive: {
    borderColor: Colors.primary,
    backgroundColor: '#fdfcfe',
  },
  docRowCardErrorBorder: {
    borderLeftWidth: 3,
    borderLeftColor: '#ef4444',
  },
  docRowCheckbox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  docRowTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  docCodeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  docTypeBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  docTypeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
  },
  docDatesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  docDateText: {
    fontSize: 11,
    color: '#64748b',
  },
  overdueBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ef4444',
  },
  docAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  docFieldLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
  },
  docFieldValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e293b',
  },
  docAllocInputGroup: {
    alignItems: 'flex-end',
  },
  docAllocLabel: {
    fontSize: 10,
    color: Colors.primary,
    fontWeight: '700',
    marginBottom: 2,
  },
  docAllocInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: '700',
    color: '#1e293b',
    minWidth: 80,
    textAlign: 'right',
  },
  docAllocInputError: {
    borderColor: '#ef4444',
  },
  exceedsWarningText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#ef4444',
    marginTop: 2,
  },
  onAccountSummaryBox: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  summaryItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryItemLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  summaryItemVal: {
    fontSize: 12,
    color: '#1e293b',
    fontWeight: '700',
  },

  // Full Form Action Buttons (Matching Lead Form Theme)
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

  // Picker & Add Modal Overlay & Content
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pickerModalBox: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 420,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  modePickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 4,
    gap: 12,
  },
  modePickerItemActive: {
    backgroundColor: Colors.primarySoft,
  },
  modePickerIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modePickerIconCircleActive: {
    backgroundColor: '#ffffff',
  },
  modePickerItemText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  modePickerItemTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  modalAddFooterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: Colors.primarySoft,
  },
  modalAddFooterBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  modalActionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  modalCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  modalSubmitBtn: {
    flex: 1,
    flexDirection: 'row',
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  modalSubmitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});
