import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  ScrollView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Linking,
  BackHandler

} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Header } from '../../components/common/Header';
import { SearchBar } from '../../components/common/SearchBar';
import { Badge } from '../../components/common/Badge';
import { CommonListCard } from '../../components/cards/CommonListCard';
import { Pagination } from '../../components/common/Pagination';
import { EmptyState } from '../../components/common/EmptyState';
import { Input } from '../../components/common/Input';
import { MobileDatePicker } from '../../components/common/MobileDatePicker';
import { QuickMessageModal } from '../../components/modals/QuickMessageModal';
import { LeadSelectorModal, LeadOption } from '../../components/modals/LeadSelectorModal';
import { creditService, CreditFollowUp, CreditCustomer, Receipt, InvoiceDocument } from '../../api/creditService';
import { salesService, SalesFollowUp } from '../../api/salesService';
import { leadService } from '../../api/leadService';
import { messagingService } from '../../api/messagingService';
import { mastersService } from '../../api/mastersService';
import { useCompany } from '../../context/CompanyContext';
import { useAuth } from '../../context/AuthContext';
import { useMenu } from '../../context/MenuContext';
import { Colors } from '../../theme/colors';

// ==================== CONSTANTS (EXACT WEB PARITY) ====================
const FOLLOWUP_TYPES = ['Call', 'WhatsApp', 'Visit', 'Email', 'Meeting'];
const CREDIT_OUTCOMES = [
  'Promise to Pay',
  'Payment Collected',
  'Connected',
  'Busy / Not Answering',
  'Dispute / Rate Issue',
  'Cheque Collected',
  'Callback Requested',
  'Wrong Number',
  'Follow-Up Required',
  'Escalated',
];
const PAYMENT_MODES = ['UPI', 'Cheque', 'NEFT', 'Cash', 'RTGS'];
const PRIORITIES = ['High', 'Medium', 'Low'];
const REMINDER_WINDOWS = ['15 Minutes', '30 Minutes', '1 Hour', 'Same Day', '1 Day Before'];
const STATUSES = ['Pending', 'Completed', 'Closed', 'Open'];
const TIME_SLOTS = [
  '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM',
  '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM',
  '06:00 PM', '06:30 PM', '07:00 PM',
];

export interface CustomerInvoiceItem {
  id: number;
  leadId: number;
  customer: string;
  docCode: string;
  docDate: string;
  dueDate: string;
  totalDealAmount: number;
  receivedAmount: number;
  amount: number;
  overdueAmount: number;
  status: string;
  lastNote?: string;
}

export interface CreditCustomerBacklogItem {
  id: number;
  leadId?: number;
  customerName: string;
  companyName: string;
  phone: string;
  totalDealAmount: number;
  receivedAmount: number;
  outstandingBalance: number;
  overdueAmount: number;
  status: string;
  dueDate?: string;
  latestFollowUp?: CreditFollowUp;
  lastNote?: string;
  dueReason?: string;
  statusBadgeColor?: string;
  isVisibleInActiveQueue?: boolean;
  isClosed?: boolean;
  docCodes?: string[];
  invoices?: CustomerInvoiceItem[];
  isDocumentItem?: boolean;
  documentNumber?: string;
}

// Clean Theme Helpers for History Cards
const getFollowUpTypeTheme = (type?: string) => {
  const t = (type || 'Call').toLowerCase();
  if (t.includes('whatsapp')) {
    return { bg: '#dcfce7', border: '#bbf7d0', color: '#16a34a', icon: 'logo-whatsapp' as const };
  }
  if (t.includes('visit')) {
    return { bg: '#ffedd5', border: '#fed7aa', color: '#ea580c', icon: 'business' as const };
  }
  if (t.includes('email')) {
    return { bg: '#e0f2fe', border: '#bae6fd', color: '#0284c7', icon: 'mail' as const };
  }
  if (t.includes('meeting')) {
    return { bg: '#f3e8ff', border: '#e9d5ff', color: '#9333ea', icon: 'calendar-outline' as const };
  }
  return { bg: '#ede9fe', border: '#ddd6fe', color: '#645695', icon: 'call' as const };
};

const getOutcomeTheme = (outcome?: string) => {
  const o = (outcome || '').toLowerCase();
  if (o.includes('promise') || o.includes('collected') || o.includes('connected') || o.includes('interested')) {
    return { bg: '#ecfdf5', border: '#a7f3d0', color: '#059669' };
  }
  if (o.includes('busy') || o.includes('callback') || o.includes('not answering')) {
    return { bg: '#fffbeb', border: '#fde68a', color: '#d97706' };
  }
  if (o.includes('dispute') || o.includes('lost') || o.includes('wrong') || o.includes('not interested')) {
    return { bg: '#fef2f2', border: '#fecaca', color: '#dc2626' };
  }
  return { bg: '#f8fafc', border: '#e2e8f0', color: '#475569' };
};

const formatCurrency = (amount?: number) => {
  if (amount == null || isNaN(amount)) return '₹0';
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
};

export const CreditFollowUpScreen: React.FC<any> = ({ navigation, route }) => {
  const { selectedCompanyId, companies, isAllCompanies } = useCompany();
  const { user } = useAuth();
  const { canAccessCredit } = useMenu();

  const userRole = (user?.role || '').toLowerCase();
  const isAdmin = userRole.includes('admin') || userRole.includes('super');
  const userId = Number(user?.id || user?.userID);

  const hasNoCompany = !isAdmin && companies.length === 0 && !isAllCompanies;
  const isCreditBlocked = !isAdmin && !canAccessCredit;

  // ==================== STATE (EXACT WEB PARITY) ====================
  const [backlogList, setBacklogList] = useState<CreditCustomerBacklogItem[]>([]);
  const [rawInvoiceList, setRawInvoiceList] = useState<CreditCustomerBacklogItem[]>([]);
  const [allFollowUps, setAllFollowUps] = useState<CreditFollowUp[]>([]);
  const [loadingBacklog, setLoadingBacklog] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Customer Drill-Down State
  const [selectedCustomer, setSelectedCustomer] = useState<CreditCustomerBacklogItem | null>(null);
  const [customerHistory, setCustomerHistory] = useState<CreditFollowUp[]>([]);
  const [customerReceipts, setCustomerReceipts] = useState<Receipt[]>([]);
  const [salesFollowUps, setSalesFollowUps] = useState<SalesFollowUp[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [activeTab, setActiveTab] = useState('Documents'); // 'Documents' | 'All' | 'Call' | 'WhatsApp' | 'Visit' | 'Email' | 'Meeting' | 'Payments' | 'Sales'
  const [customerDetailSearch, setCustomerDetailSearch] = useState('');

  // Primary Queue Segmented Filter: 'Today' | 'Scheduled' | 'All' | 'DocumentWise'
  const [queueFilter, setQueueFilter] = useState<'Today' | 'Scheduled' | 'All' | 'DocumentWise'>('Today');
  const [backlogSearch, setBacklogSearch] = useState('');
  const [backlogDateFilterMode, setBacklogDateFilterMode] = useState<string>('All'); // 'Due' | 'Today' | 'Upcoming' | 'All'
  const [backlogSortOrder, setBacklogSortOrder] = useState<'desc' | 'asc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  // History Filter State
  const [historyDateFilterMode, setHistoryDateFilterMode] = useState('All'); // 'All' | 'Today' | 'Last7Days' | 'Last30Days'
  const [historySortOrder, setHistorySortOrder] = useState<'desc' | 'asc'>('desc');

  // Quick Message Modal
  const [msgModalVisible, setMsgModalVisible] = useState(false);
  const [msgRecipient, setMsgRecipient] = useState({ name: '', phone: '' });

  // Add / Edit Follow-Up Drawer Modal State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingFollowUpId, setEditingFollowUpId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // Form Fields (Exact Web Parity)
  const [formClientName, setFormClientName] = useState('');
  const [formClientPhone, setFormClientPhone] = useState('');
  const [formClientCompany, setFormClientCompany] = useState('');
  const [formLeadId, setFormLeadId] = useState<number | undefined>(undefined);
  const [formReceiptDocId, setFormReceiptDocId] = useState<number | undefined>(undefined);
  const [allLeadsOptions, setAllLeadsOptions] = useState<LeadOption[]>([]);
  const [leadSelectorVisible, setLeadSelectorVisible] = useState(false);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [formType, setFormType] = useState('Call');
  const [formPerformedBy, setFormPerformedBy] = useState('');
  const [formOutcome, setFormOutcome] = useState('Promise to Pay');
  const [formPriority, setFormPriority] = useState('Medium');
  const [formReminderBefore, setFormReminderBefore] = useState('30 Minutes');
  const [formFollowUpDate, setFormFollowUpDate] = useState(new Date().toISOString().split('T')[0]);
  const [formFollowUpTime, setFormFollowUpTime] = useState('10:00 AM');
  const [formPromiseDate, setFormPromiseDate] = useState('');
  const [formPromisedAmount, setFormPromisedAmount] = useState('');
  const [formPaymentMode, setFormPaymentMode] = useState('UPI');
  const [formNextFollowUpDate, setFormNextFollowUpDate] = useState('');
  const [formNextFollowUpTime, setFormNextFollowUpTime] = useState('10:00 AM');
  const [formStatus, setFormStatus] = useState('Pending');
  const [formNotes, setFormNotes] = useState('');

  // Web Subfield States
  const [formCheckInTime, setFormCheckInTime] = useState('');
  const [formCheckOutTime, setFormCheckOutTime] = useState('');
  const [formVisitLocation, setFormVisitLocation] = useState('');
  const [formGpsCoordinates, setFormGpsCoordinates] = useState('');
  const [formEmailSubject, setFormEmailSubject] = useState('');
  const [formEmailStatus, setFormEmailStatus] = useState('Sent');
  const [formWhatsAppTemplate, setFormWhatsAppTemplate] = useState('');
  const [formWhatsAppStatus, setFormWhatsAppStatus] = useState('Sent');

  // Outcome List & Modal State
  const [outcomesList, setOutcomesList] = useState<string[]>(CREDIT_OUTCOMES);
  const [paymentModesList, setPaymentModesList] = useState<string[]>(PAYMENT_MODES);
  const [addOutcomeModalVisible, setAddOutcomeModalVisible] = useState(false);
  const [newOutcomeName, setNewOutcomeName] = useState('');

  // Dropdown Picker Modal
  const [pickerModal, setPickerModal] = useState<{
    visible: boolean;
    title: string;
    options: string[];
    selected: string;
    onSelect: (val: string) => void;
  }>({
    visible: false,
    title: '',
    options: [],
    selected: '',
    onSelect: () => {},
  });

  // Dynamically load outcomes & payment modes from backend API
  useEffect(() => {
    mastersService.getFollowUpOutcomes().then((res) => {
      if (res && res.length > 0) {
        const names = res.map((r) => r.name).filter(Boolean);
        const merged = Array.from(new Set([...CREDIT_OUTCOMES, ...names]));
        setOutcomesList(merged);
      }
    });

    mastersService.getPaymentModes().then((res) => {
      if (res && res.length > 0) {
        const names = res.map((r) => r.name).filter(Boolean);
        const merged = Array.from(new Set([...PAYMENT_MODES, ...names]));
        setPaymentModesList(merged);
      }
    });
  }, []);

  // Set default Performed By
  useEffect(() => {
    if (user?.fullName || user?.username) {
      setFormPerformedBy(user.fullName || user.username);
    }
  }, [user]);

  // Date Calculation Helpers (Exact Web Parity)
  const getLocalTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getDateOnlyStr = (dateVal?: string) => {
    if (!dateVal) return '';
    const cleaned = dateVal.replace('T', ' ').trim();
    return cleaned.split(' ')[0];
  };

  const todayStr = getLocalTodayStr();

  // Normalize string helper
  const normalize = (str?: string) => (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  // ==================== FETCH BACKLOG API (EXACT WEB PARITY) ====================
  const fetchBacklog = useCallback(async () => {
    if (hasNoCompany || isCreditBlocked) {
      setBacklogList([]);
      setRawInvoiceList([]);
      setAllFollowUps([]);
      setAllLeadsOptions([]);
      setLoadingBacklog(false);
      setRefreshing(false);
      return;
    }
    setLoadingBacklog(true);
    try {
      const compId = selectedCompanyId && selectedCompanyId > 0 ? selectedCompanyId : undefined;

      // 1. Fetch Dynamic CRM Leads for lead selection & binding
      setLoadingLeads(true);
      let leadsArr: any[] = [];
      try {
        const leadsRes = await leadService.getLeads({ companyId: compId, pageSize: 500 });
        leadsArr = leadsRes?.data || [];
      leadsArr.find((l: any) =>
        Number(l.leadID ?? l.LeadID) === 4979
      )
  
        const mappedOptions: LeadOption[] = leadsArr.map((l: any) => ({
          id: l.leadID,
          leadID: l.leadID,
          name: l.leadName || 'Lead',
          leadName: l.leadName,
          customerName: l.leadName,
          companyName: l.companyName || '',
          phone: l.MobileNo || l.mobileNo || l.Phone || l.phone || '',
          mobileNo: l.MobileNo || l.mobileNo || l.Phone || l.phone || '',
          city: l.city || '',
          email: l.email || '',
          status: l.leadStatus || (typeof l.status === 'string' ? l.status : 'Active'),
          companyID: l.companyID,
          outstandingBalance: l.estimatedValue || 0,
          overdueAmount: l.estimatedValue || 0,
        }));
        setAllLeadsOptions(mappedOptions);
      } catch (le) {
        console.warn('Error fetching leads for credit follow-up options:', le);
      } finally {
        setLoadingLeads(false);
      }

      // 2. Fetch Invoices from InvoiceDocument API
      let invoices: InvoiceDocument[] = [];
      try {
        invoices = await creditService.getInvoiceDocuments({ companyId: compId });
      } catch (e) {
        console.warn('Error fetching invoice documents:', e);
      }

      // 3. Fetch Unified New Transactions (includes bulk-uploaded Journal Entries, Returns & Invoices)
      let newTransactions: any[] = [];
      try {
        newTransactions = await creditService.getNewTransactions(compId);
        if ((!newTransactions || newTransactions.length === 0) && compId) {
          // Fallback query across companies so bulk uploaded records are never missed
          const fallbackTx = await creditService.getNewTransactions(undefined);
          if (fallbackTx && fallbackTx.length > 0) newTransactions = fallbackTx;
        }
      } catch (e) {
        console.warn('Error fetching new transactions:', e);
      }

      // 4. Fetch Outstanding CustomerWise Report (Matches Web CRM reportService.getOutstandingCustomerWise)
      let backlogReportData: any[] = [];
      try {
        const payload = {
          fromDate: null,
          toDate: new Date().toISOString().split('T')[0],
          leadID: 0,
          companyID: compId || 0,
        };
        backlogReportData = await creditService.getOutstandingCustomerWise(payload);
        if ((!backlogReportData || backlogReportData.length === 0) && compId) {
          // Fallback query for all companies
          const fallbackReport = await creditService.getOutstandingCustomerWise({
            fromDate: null,
            toDate: new Date().toISOString().split('T')[0],
            leadID: 0,
            companyID: 0,
          });
          if (fallbackReport && fallbackReport.length > 0) backlogReportData = fallbackReport;
        }
      } catch (e) {
        console.warn('Error fetching outstanding customerwise report:', e);
      }

      // 5. Fetch Receipts
      let allReceipts: Receipt[] = [];
      try {
        allReceipts = await creditService.getReceipts(compId, undefined, 1, 1000);
      } catch (e) {
        console.warn('Error fetching receipts:', e);
      }

      // 6. Fetch Credit Customers (CreditMaster / Profiles)
      let customers: CreditCustomer[] = [];
      try {
        customers = await creditService.getCustomers(compId);
      } catch (e) {
        console.warn('Error fetching credit customers:', e);
      }

      // 7. Fetch All Credit Follow-Up Logs
      const rawFollowUps = await creditService.getCreditFollowUps({
        companyId: compId,
        pageSize: 1000,
      });
      const followUps = rawFollowUps;
      setAllFollowUps(followUps);

      // Aggregation logic (Exact Web Parity)
      const customerGroupMap = new Map<string, CreditCustomerBacklogItem>();
      const rawInvoices: CreditCustomerBacklogItem[] = [];

      // A. Map Invoices from InvoiceDocument table
      invoices.forEach((inv, idx) => {
        const invId = inv.invoice_Document_ID || idx + 1;
        const docCode = inv.documentNumber || String(invId);
        const leadName = inv.leadName || 'Customer';
        const key = normalize(leadName);

        // Matching receipts
        const matchingReceipts = allReceipts.filter(
          (r) =>
            (r.referenceNo && normalize(r.referenceNo) === normalize(docCode)) ||
            (r.customerName && normalize(r.customerName) === key)
        );
        const receiptSum = matchingReceipts.reduce((sum, r) => sum + (r.amount || 0), 0);
        const actualReceived = Math.max(inv.appliedamt || 0, receiptSum);
        const docAmt = inv.documentAmount || 0;
        const rawPending = inv.pendingamt || 0;
        const pending = docAmt > 0 ? Math.max(0, docAmt - actualReceived) : rawPending;
        const invStatus = (inv.status || '').toLowerCase().trim();

        if (pending > 0 && invStatus !== 'closed' && invStatus !== 'paid') {
          const leadId = inv.leadID || idx + 1;
          const leadMobile =
          leadsArr.find(
            (l: any) => Number(l.leadID ?? l.LeadID) === Number(leadId)
          )?.MobileNo ||
          leadsArr.find(
            (l: any) => Number(l.leadID ?? l.LeadID) === Number(leadId)
          )?.mobileNo || '-';
          const dueDt = inv.dueDate ? getDateOnlyStr(inv.dueDate) : (inv.documentDate ? getDateOnlyStr(inv.documentDate) : todayStr);
          const invTotalAmt = docAmt > 0 ? docAmt : (pending + actualReceived);

          if (!customerGroupMap.has(key)) {
            customerGroupMap.set(key, {
              id: leadId,
              leadId: leadId,
              customerName: leadName,
              companyName: 'Company',
              phone: leadMobile,
              totalDealAmount: 0,
              receivedAmount: 0,
              outstandingBalance: 0,
              overdueAmount: 0,
              status: inv.status || 'Overdue',
              dueDate: dueDt,
              lastNote: inv.remark || `Invoice #${docCode}`,
              docCodes: [docCode],
              invoices: [],
            });
          }

          const cust = customerGroupMap.get(key)!;
          cust.totalDealAmount += invTotalAmt;
          cust.receivedAmount += actualReceived;
          cust.outstandingBalance += pending;
          cust.overdueAmount += pending;
          if (!cust.docCodes?.includes(docCode)) cust.docCodes?.push(docCode);
          if (dueDt < (cust.dueDate || '')) cust.dueDate = dueDt;

          const invItem: CustomerInvoiceItem = {
            id: invId,
            leadId: leadId,
            customer: leadName,
            docCode: docCode,
            docDate: getDateOnlyStr(inv.documentDate),
            dueDate: dueDt,
            totalDealAmount: invTotalAmt,
            receivedAmount: actualReceived,
            amount: pending,
            overdueAmount: pending,
            status: inv.status || 'Overdue',
            lastNote: inv.remark || `Invoice #${docCode}`,
          };
          cust.invoices?.push(invItem);

          rawInvoices.push({
            id: invId,
            leadId: leadId,
            customerName: leadName,
            companyName: `Invoice #${docCode}`,
            documentNumber: docCode,
            isDocumentItem: true,
           phone: leadMobile,
            dueDate: dueDt,
            totalDealAmount: invTotalAmt,
            receivedAmount: actualReceived,
            outstandingBalance: pending,
            overdueAmount: pending,
            status: inv.status || 'Overdue',
            lastNote: inv.remark || `Invoice #${docCode}`,
            dueReason: `Due: ${dueDt}`,
            isVisibleInActiveQueue: true,
          });
        }
      });

      // B. Map Unified New Transactions (Bulk-uploaded Journal Entries, Returns & Invoices)
      newTransactions.forEach((t: any, idx: number) => {
        const docAmt = Number(t.documentAmount ?? t.DocumentAmount ?? 0);
        const applied = Number(t.appliedAmount ?? t.AppliedAmount ?? 0);
        const rawPending = Number(t.pendingAmount ?? t.PendingAmount ?? (docAmt - applied));
        const pending = rawPending > 0 ? rawPending : Math.max(0, docAmt - applied);
        const status = (t.status || t.Status || 'Open').toLowerCase().trim();

        if (pending > 0 && status !== 'closed' && status !== 'paid') {
          const leadId = t.leadID || t.LeadID || (idx + 1000);
          const leadName = t.leadName || t.LeadName || 'Customer';
          const leadMobile = leadsArr.find((l: any) => Number(l.leadID ?? l.LeadID) === Number(leadId))?.MobileNo || leadsArr.find( (l: any) => Number(l.leadID ?? l.LeadID) === Number(leadId) )?.mobileNo || '-';
          const key = normalize(leadName);
          const docType = t.docType || t.DocType || 'Transaction';
          const tId = t.id || t.Id || (idx + 1);
          const docCode = t.documentNumber || t.DocumentNumber || (docType.includes('Journal') ? `JE-${tId}` : (docType.includes('Return') ? `RET-${tId}` : `DOC-${tId}`));
          const dueDt = t.dueDate ? getDateOnlyStr(t.dueDate) : (t.documentDate ? getDateOnlyStr(t.documentDate) : todayStr);
          const totalAmt = docAmt > 0 ? docAmt : (pending + applied);

          if (!customerGroupMap.has(key)) {
            customerGroupMap.set(key, {
              id: leadId,
              leadId: leadId,
              customerName: leadName,
              companyName: leadName,
              phone: leadMobile,
              totalDealAmount: 0,
              receivedAmount: 0,
              outstandingBalance: 0,
              overdueAmount: 0,
              status: t.status || 'Overdue',
              dueDate: dueDt,
              lastNote: t.remark || `${docType} #${docCode}`,
              docCodes: [],
              invoices: [],
            });
          }

          const cust = customerGroupMap.get(key)!;
          const alreadyHasDoc = (cust.invoices || []).some(
            (inv) => inv.id === tId || normalize(inv.docCode) === normalize(docCode)
          );

          if (!alreadyHasDoc) {
            cust.totalDealAmount += totalAmt;
            cust.receivedAmount += applied;
            cust.outstandingBalance += pending;
            cust.overdueAmount += pending;
            if (!cust.docCodes?.includes(docCode)) cust.docCodes?.push(docCode);
            if (dueDt < (cust.dueDate || '')) cust.dueDate = dueDt;

            const invItem: CustomerInvoiceItem = {
              id: tId,
              leadId: leadId,
              customer: leadName,
              docCode: docCode,
              docDate: getDateOnlyStr(t.documentDate),
              dueDate: dueDt,
              totalDealAmount: totalAmt,
              receivedAmount: applied,
              amount: pending,
              overdueAmount: pending,
              status: t.status || 'Overdue',
              lastNote: t.remark || `${docType} #${docCode}`,
            };
            cust.invoices?.push(invItem);

            rawInvoices.push({
              id: tId,
              leadId: leadId,
              customerName: leadName,
              companyName: `${docType} #${docCode}`,
              documentNumber: docCode,
              isDocumentItem: true,
              phone: leadMobile,
              dueDate: dueDt,
              totalDealAmount: totalAmt,
              receivedAmount: applied,
              outstandingBalance: pending,
              overdueAmount: pending,
              status: t.status || 'Overdue',
              lastNote: t.remark || `${docType} #${docCode}`,
              dueReason: `Due: ${dueDt}`,
              isVisibleInActiveQueue: true,
            });
          }
        }
      });

      // C. Map CustomerWise Outstanding Report (Exact Web CRM Section C Parity)
      backlogReportData.forEach((row: any, idx: number) => {
        const custName = row.CustomerName || row.LeadName || row.customerName || row.leadName;
        const key = normalize(custName);
        if (!key) return;

        const pendingAmt = Number(row.Total ?? row.totalOutstanding ?? row.total ?? 0);
        const overdueAmt = Number(row.TotalOverdue ?? row.totalOverdue ?? 0);
        const receivedAmt = Number(row.Received ?? row.receivedAmount ?? row.received ?? 0);
        const totalDealAmt = Number(row.TotalInvoiceAmount ?? row.totalInvoiceAmount ?? (pendingAmt + receivedAmt));
        const phone = row.MobileNo || row.Phone || row.mobileNo || row.phone || '-';
        const compName = row.CompanyName || row.companyName || custName || 'Company';

        if (pendingAmt > 0 || overdueAmt > 0) {
          if (!customerGroupMap.has(key)) {
            const leadId = row.CustomerID || row.LeadID || row.leadId || (idx + 3000);
            customerGroupMap.set(key, {
              id: leadId,
              leadId: row.LeadID || row.CustomerID || row.leadId,
              customerName: custName,
              companyName: compName,
              phone: phone,
              totalDealAmount: totalDealAmt,
              receivedAmount: receivedAmt,
              outstandingBalance: pendingAmt,
              overdueAmount: overdueAmt > 0 ? overdueAmt : pendingAmt,
              status: 'Overdue',
              dueDate: row.dueDate ? getDateOnlyStr(row.dueDate) : todayStr,
              lastNote: 'Pending Credit Collection Follow-up',
              docCodes: [],
              invoices: [],
            });
          } else {
            const existing = customerGroupMap.get(key)!;
            if (!existing.phone || existing.phone === '-') {
              existing.phone = phone;
            }
            if (compName && (!existing.companyName || existing.companyName === 'Company')) {
              existing.companyName = compName;
            }
            if (existing.outstandingBalance <= 0 && pendingAmt > 0) {
              existing.outstandingBalance = pendingAmt;
              existing.overdueAmount = overdueAmt > 0 ? overdueAmt : pendingAmt;
              existing.totalDealAmount = totalDealAmt;
              existing.receivedAmount = receivedAmt;
            }
          }
        }
      });

      // D. Map Leads
      leadsArr.forEach((l: any, idx: number) => {
        const key = normalize(l.leadName || l.companyName);
        if (!key) return;
        const pendingAmt = Number(l.estimatedValue || l.expectedRevenue || 0);
        const phone = l.MobileNo || l.mobileNo || l.Phone || l.phone || '-';
        const compName = l.companyName || l.leadName || 'Company';

        if (!customerGroupMap.has(key)) {
          if (pendingAmt > 0) {
            const leadId = l.leadID || idx + 100;
            customerGroupMap.set(key, {
              id: leadId,
              leadId: leadId,
              customerName: l.leadName || l.companyName || 'Lead',
              companyName: compName,
              phone: phone,
              totalDealAmount: pendingAmt,
              receivedAmount: 0,
              outstandingBalance: pendingAmt,
              overdueAmount: pendingAmt,
              status: l.leadStatus || 'Active',
              dueDate: l.createdDate ? getDateOnlyStr(l.createdDate) : todayStr,
              lastNote: l.remarks || 'Pending Credit Recovery Follow-up',
              docCodes: [],
              invoices: [],
            });
          }
        } else {
          const existing = customerGroupMap.get(key)!;
          if (l.companyName && (!existing.companyName || existing.companyName === 'Company')) {
            existing.companyName = compName;
          }
          if (!existing.phone || existing.phone === '-') {
            existing.phone = phone;
          }
          if (!existing.leadId && l.leadID) {
            existing.leadId = l.leadID;
          }
        }
      });

      // E. Map Credit Customers (CreditMaster)
      customers.forEach((c) => {
        const key = normalize(c.customerName || c.companyName);
        if (!key) return;
        const pending = Number(c.outstandingBalance || 0);
        const overdue = Number(c.overdueAmount || 0);
        const phone = c.mobileNo || c.referenceMobileNumber || '-';

        if (pending > 0 || overdue > 0) {
          if (!customerGroupMap.has(key)) {
            customerGroupMap.set(key, {
              id: c.creditProfileID || c.customerId || c.leadID || Math.floor(Math.random() * 100000),
              leadId: c.leadID || c.customerId,
              customerName: c.customerName,
              companyName: c.companyName || 'Company',
              phone: phone,
              totalDealAmount: pending,
              receivedAmount: 0,
              outstandingBalance: pending,
              overdueAmount: overdue > 0 ? overdue : pending,
              status: c.accountStatus || 'Overdue',
              dueDate: todayStr,
              lastNote: 'Pending Credit Recovery Follow-up',
              docCodes: [],
              invoices: [],
            });
          } else {
            const existing = customerGroupMap.get(key)!;
            if (!existing.phone || existing.phone === '-') {
              existing.phone = phone;
            }
            if (existing.outstandingBalance <= 0) {
              existing.outstandingBalance = pending;
              existing.overdueAmount = overdue > 0 ? overdue : pending;
            }
          }
        }
      });

      // Format contact / doc summary for grouped documents
      customerGroupMap.forEach((cust) => {
        if (cust.docCodes && cust.docCodes.length > 1) {
          cust.companyName = `${cust.docCodes[0]} (+${cust.docCodes.length - 1} docs)`;
        } else if (cust.docCodes && cust.docCodes.length === 1) {
          cust.companyName = cust.docCodes[0];
        }
      });

      // F. Enrich with Latest Follow-Up & Evaluate Queue Visibility (Exact Web CRM Parity)
      let mapped = Array.from(customerGroupMap.values());
      mapped = mapped.map((item) => {
        const custNorm = normalize(item.customerName);
        const custFollowUps = followUps
          .filter(
            (f) =>
              (item.leadId && f.leadID && f.leadID === item.leadId) ||
              normalize(f.leadName || f.customerName) === custNorm
          )
          .sort((a, b) => new Date(b.followUpDate || 0).getTime() - new Date(a.followUpDate || 0).getTime());

        const latestFollowUp = custFollowUps.length > 0 ? custFollowUps[0] : undefined;
        let isVisibleInActiveQueue = true;
        let isClosed = false;
        let dueReason = 'Overdue Payment';
        let statusBadgeColor = '#dc2626'; // red
        let latestStatus = 'Open';

        if (latestFollowUp) {
          latestStatus = latestFollowUp.status || 'Open';
          const lastDateStr = getDateOnlyStr(latestFollowUp.followUpDate);
          const nextDateStr = getDateOnlyStr(latestFollowUp.nextFollowUpDate);
          const promiseDateStr = getDateOnlyStr(latestFollowUp.promiseToPayDate);

          if (latestStatus === 'Closed' || item.outstandingBalance <= 0) {
            isClosed = true;
            isVisibleInActiveQueue = false;
            dueReason = latestStatus === 'Closed' ? 'Status: Closed' : 'Payment Completed';
            statusBadgeColor = '#64748b';
          } else if (nextDateStr) {
            if (nextDateStr > todayStr) {
              isVisibleInActiveQueue = false;
              dueReason = `Next Follow-Up: ${nextDateStr}`;
              statusBadgeColor = '#2563eb'; // blue
            } else {
              isVisibleInActiveQueue = true;
              dueReason = `Next Follow-Up Due (${nextDateStr})`;
              statusBadgeColor = '#d97706'; // amber
            }
          } else if (promiseDateStr) {
            if (promiseDateStr > todayStr) {
              isVisibleInActiveQueue = false;
              dueReason = `Promise to Pay: ${promiseDateStr}`;
              statusBadgeColor = '#16a34a'; // green
            } else {
              isVisibleInActiveQueue = true;
              dueReason = `Promise Date Reached (${promiseDateStr})`;
              statusBadgeColor = '#dc2626'; // red
            }
          } else {
            if (lastDateStr === todayStr && latestStatus === 'Completed') {
              isVisibleInActiveQueue = false;
              dueReason = 'Followed up Today';
              statusBadgeColor = '#64748b';
            } else {
              isVisibleInActiveQueue = true;
              dueReason = 'Follow-Up Pending';
              statusBadgeColor = '#dc2626';
            }
          }

          item.latestFollowUp = latestFollowUp;
          item.lastNote = latestFollowUp.notes || latestFollowUp.outcome || item.lastNote;
          if (latestFollowUp.mobileNo && (!item.phone || item.phone === '-')) {
            item.phone = latestFollowUp.mobileNo;
          }
        } else {
          if (item.outstandingBalance <= 0) {
            isClosed = true;
            isVisibleInActiveQueue = false;
          }
        }

        item.status = latestStatus;
        item.isClosed = isClosed;
        item.isVisibleInActiveQueue = isVisibleInActiveQueue;
        item.dueReason = dueReason;
        item.statusBadgeColor = statusBadgeColor;
        return item;
      });

      setBacklogList(mapped);
      setRawInvoiceList(rawInvoices);
    } catch (error) {
      console.error('Error fetching credit backlog:', error);
      setBacklogList([]);
    } finally {
      setLoadingBacklog(false);
      setRefreshing(false);
    }
  }, [selectedCompanyId, todayStr, hasNoCompany, isCreditBlocked, isAdmin, userId]);

  useEffect(() => {
    fetchBacklog();
  }, [fetchBacklog]);

  useFocusEffect(
    useCallback(() => {
      fetchBacklog();
    }, [fetchBacklog])
  );

  // ✅ Hardware back button handling
  useEffect(() => {
    const handleBack = () => {
      if (selectedCustomer) {
        // Direct state updates — handleBackToBacklog वापरू नका
        setSelectedCustomer(null);
        setCustomerHistory([]);
        setCustomerReceipts([]);
        setSalesFollowUps([]);
        setCustomerDetailSearch('');
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', handleBack);
    return () => subscription.remove();
  }, [selectedCustomer]);
  
  const onRefresh = () => {
    setRefreshing(true);
    if (selectedCustomer) {
      fetchHistory(selectedCustomer);
    }
    fetchBacklog();
  };

  // ==================== FETCH CUSTOMER HISTORY, RECEIPTS & SALES FOLLOW-UPS ====================
  const fetchHistory = useCallback(
    async (customer: CreditCustomerBacklogItem) => {
      setLoadingHistory(true);
      try {
        const custNameNorm = normalize(customer.customerName);

        // 1. Filter Credit Follow-ups for this customer
        const matchedFollowUps = allFollowUps.filter((f) => {
          if (customer.leadId && f.leadID && f.leadID === customer.leadId) return true;
          const fName = normalize(f.customerName || f.leadName);
          return fName === custNameNorm;
        });
        setCustomerHistory(matchedFollowUps);

        // 2. Fetch Receipts for this customer
        const receipts = await creditService.getReceipts(selectedCompanyId || undefined, customer.customerName);
        const filteredRcpts = receipts.filter((r) => {
          if (customer.leadId && r.leadID && r.leadID === customer.leadId) return true;
          return normalize(r.customerName) === custNameNorm;
        });
        setCustomerReceipts(filteredRcpts);

        // 3. Fetch Sales Follow-ups dynamically from salesService (Web CRM Parity)
        let sLogs: SalesFollowUp[] = [];
        try {
          if (customer.leadId) {
            sLogs = await salesService.getCustomerFollowUps(customer.leadId);
          }
          if (!sLogs || sLogs.length === 0) {
            const allSales = await salesService.getSalesFollowUps(selectedCompanyId || undefined);
            sLogs = allSales.filter(
              (s) =>
                (customer.leadId && s.leadID === customer.leadId) ||
                normalize(s.customerName || s.leadName) === custNameNorm
            );
          }
        } catch (se) {
          console.warn('Error fetching sales follow-ups:', se);
          sLogs = [];
        }
        setSalesFollowUps(sLogs);
      } catch (error) {
        console.error('Error loading customer credit history:', error);
        setCustomerHistory([]);
        setCustomerReceipts([]);
        setSalesFollowUps([]);
      } finally {
        setLoadingHistory(false);
      }
    },
    [allFollowUps, selectedCompanyId]
  );

  const handleSelectCustomer = (customer: CreditCustomerBacklogItem, defaultTab = 'Documents') => {
    setSelectedCustomer(customer);
    setActiveTab(defaultTab);
    setHistoryDateFilterMode('All');
    setCustomerDetailSearch('');
    fetchHistory(customer);
  };

  const handleBackToBacklog = () => {
    setSelectedCustomer(null);
    setCustomerHistory([]);
    setCustomerReceipts([]);
    setSalesFollowUps([]);
    setCustomerDetailSearch('');
  };

  // Primary Queue Counts (Exact Web CRM Parity)
  const todayCount = useMemo(() => {
    return backlogList.filter((item) => item.isVisibleInActiveQueue && !item.isClosed).length;
  }, [backlogList]);

  const scheduledCount = useMemo(() => {
    return backlogList.filter((item) => !item.isVisibleInActiveQueue && !item.isClosed).length;
  }, [backlogList]);

  const allCount = backlogList.length;
  const docWiseCount = rawInvoiceList.length;

  // ==================== FILTERING & SORTING LOGIC (EXACT WEB PARITY) ====================
  const currentListSource = queueFilter === 'DocumentWise' ? rawInvoiceList : backlogList;

  const processedBacklogList = useMemo(() => {
    return currentListSource
      .filter((item) => {
        // 1. Primary Queue Tab Filter
        if (queueFilter === 'Today') {
          if (!item.isVisibleInActiveQueue || item.isClosed) return false;
        } else if (queueFilter === 'Scheduled') {
          if (item.isVisibleInActiveQueue || item.isClosed) return false;
        }

        // 2. Secondary Date Filter Mode (Due / Today / Upcoming / All)
        const itemDateStr = item.dueDate || getDateOnlyStr(item.latestFollowUp?.nextFollowUpDate || item.latestFollowUp?.promiseToPayDate || item.latestFollowUp?.followUpDate);
        if (backlogDateFilterMode === 'Due') {
          if (itemDateStr && itemDateStr > todayStr) return false;
        } else if (backlogDateFilterMode === 'Today') {
          if (itemDateStr !== todayStr) return false;
        } else if (backlogDateFilterMode === 'Upcoming') {
          if (!itemDateStr || itemDateStr <= todayStr) return false;
        }

        // 3. Search Filter
        if (backlogSearch.trim()) {
          const q = backlogSearch.toLowerCase().trim();
          const matchCustomer = item.customerName.toLowerCase().includes(q);
          const matchCompany = (item.companyName || '').toLowerCase().includes(q);
          const matchPhone = (item.phone || '').includes(q);
          const matchNotes = (item.lastNote || '').toLowerCase().includes(q);
          const matchDoc = (item.documentNumber || '').toLowerCase().includes(q);
          const matchAmount = String(item.outstandingBalance || '').includes(q) || String(item.overdueAmount || '').includes(q);
          if (!matchCustomer && !matchCompany && !matchPhone && !matchNotes && !matchDoc && !matchAmount) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        const dateA = a.dueDate || a.latestFollowUp?.followUpDate || '';
        const dateB = b.dueDate || b.latestFollowUp?.followUpDate || '';
        return backlogSortOrder === 'desc' ? dateB.localeCompare(dateA) : dateA.localeCompare(dateB);
      });
  }, [currentListSource, queueFilter, backlogDateFilterMode, backlogSearch, backlogSortOrder, todayStr]);

  // Pagination for Backlog
  const backlogTotalItems = processedBacklogList.length;
  const backlogTotalPages = Math.max(1, Math.ceil(backlogTotalItems / pageSize));
  const paginatedBacklogList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return processedBacklogList.slice(start, start + pageSize);
  }, [processedBacklogList, currentPage, pageSize]);

  // Filter Customer History
  const filteredHistory = useMemo(() => {
    return customerHistory
      .filter((item) => {
        const itemType = (item.followUpType || '').toLowerCase();
        // Tab Filter
        if (activeTab !== 'All' && !itemType.includes(activeTab.toLowerCase())) {
          return false;
        }

        // Search Filter
        if (customerDetailSearch.trim()) {
          const q = customerDetailSearch.toLowerCase().trim();
          const matchType = (item.followUpType || '').toLowerCase().includes(q);
          const matchOutcome = (item.outcome || '').toLowerCase().includes(q);
          const matchPerformed = (item.performedBy || '').toLowerCase().includes(q);
          const matchNotes = (item.notes || '').toLowerCase().includes(q);
          if (!matchType && !matchOutcome && !matchPerformed && !matchNotes) return false;
        }

        // Date Filter
        const itemDateStr = getDateOnlyStr(item.followUpDate || item.nextFollowUpDate);
        if (historyDateFilterMode === 'Today') {
          return itemDateStr === todayStr;
        } else if (historyDateFilterMode === 'Last7Days') {
          const d7 = new Date();
          d7.setDate(d7.getDate() - 7);
          const d7Str = d7.toISOString().split('T')[0];
          return itemDateStr >= d7Str && itemDateStr <= todayStr;
        } else if (historyDateFilterMode === 'Last30Days') {
          const d30 = new Date();
          d30.setDate(d30.getDate() - 30);
          const d30Str = d30.toISOString().split('T')[0];
          return itemDateStr >= d30Str && itemDateStr <= todayStr;
        }

        return true;
      })
      .sort((a, b) => {
        const dateA = a.followUpDate || '';
        const dateB = b.followUpDate || '';
        return historySortOrder === 'desc' ? dateB.localeCompare(dateA) : dateA.localeCompare(dateB);
      });
  }, [customerHistory, activeTab, customerDetailSearch, historyDateFilterMode, historySortOrder, todayStr]);

  // ==================== DRAWER ACTIONS (ADD / EDIT) ====================
  const openAddDrawer = (targetCustomer?: CreditCustomerBacklogItem | null, docId?: number, initialRemark?: string) => {
    setEditingFollowUpId(null);
    const cust = targetCustomer || selectedCustomer;
    setFormLeadId(cust?.leadId);
    setFormReceiptDocId(docId);
    setFormClientName(cust?.customerName || '');
    setFormClientPhone(cust?.phone !== '-' ? (cust?.phone || '') : '');
    setFormClientCompany(cust?.companyName || '');
    setFormType('Call');
    setFormPerformedBy(user?.fullName || user?.username || 'Admin');
    setFormOutcome('Promise to Pay');
    setFormPriority('Medium');
    setFormReminderBefore('30 Minutes');
    setFormFollowUpDate(new Date().toISOString().split('T')[0]);
    setFormFollowUpTime('10:00 AM');
    setFormPromiseDate('');
    setFormPromisedAmount('');
    setFormPaymentMode('UPI');
    setFormNextFollowUpDate('');
    setFormNextFollowUpTime('10:00 AM');
    setFormStatus('Pending');
    setFormNotes(initialRemark || '');
    setFormCheckInTime('');
    setFormCheckOutTime('');
    setFormVisitLocation('');
    setFormGpsCoordinates('');
    setFormEmailSubject('');
    setFormEmailStatus('Sent');
    setFormWhatsAppTemplate('');
    setFormWhatsAppStatus('Sent');
    setDrawerOpen(true);
  };

  const openEditDrawer = (item: CreditFollowUp) => {
    setEditingFollowUpId(item.followUpID);
    setFormLeadId(item.leadID);
    setFormReceiptDocId(item.receiptDocumentID);
    setFormClientName(item.customerName || item.leadName || '');
    setFormClientPhone(item.mobileNo || item.phone || '');
    setFormClientCompany(item.companyName || '');
    setFormType(item.followUpType || 'Call');
    setFormPerformedBy(item.performedBy || user?.fullName || 'Admin');
    setFormOutcome(item.outcome || 'Promise to Pay');
    setFormPriority(item.priority || 'Medium');
    setFormReminderBefore(item.reminderBefore || '30 Minutes');
    setFormFollowUpDate(getDateOnlyStr(item.followUpDate) || new Date().toISOString().split('T')[0]);
    setFormFollowUpTime(item.followUpTime || '10:00 AM');
    setFormPromiseDate(getDateOnlyStr(item.promiseToPayDate) || '');
    setFormPromisedAmount(item.promisedAmount ? String(item.promisedAmount) : '');
    setFormPaymentMode(item.paymentMode || 'UPI');
    setFormNextFollowUpDate(getDateOnlyStr(item.nextFollowUpDate) || '');
    setFormNextFollowUpTime(item.nextFollowUpTime || '10:00 AM');
    setFormStatus(item.status || 'Pending');
    setFormNotes(item.notes || item.remarks || '');
    setFormCheckInTime(item.checkInTime || '');
    setFormCheckOutTime(item.checkOutTime || '');
    setFormVisitLocation(item.visitLocation || '');
    setFormGpsCoordinates(item.gpsCoordinates || '');
    setFormEmailSubject(item.emailSubject || '');
    setFormEmailStatus(item.emailStatus || 'Sent');
    setFormWhatsAppTemplate(item.whatsAppTemplate || '');
    setFormWhatsAppStatus(item.whatsAppStatus || 'Sent');
    setDrawerOpen(true);
  };

  const handleSaveFollowUp = async (scheduleNext: boolean = false) => {
    if (!formClientName.trim()) {
      Alert.alert('Validation Error', 'Lead Name is required');
      return;
    }
    if (scheduleNext && !formNextFollowUpDate) {
      Alert.alert('Validation Error', 'Please select Next Follow-up Date to schedule next');
      return;
    }

    setSaving(true);
    try {
      // Auto-compute status based on business conditions if not explicitly Closed (Exact Web CRM Parity)
      let finalStatus = formStatus || 'Completed';
      if (formStatus !== 'Closed') {
        if (formNextFollowUpDate || formPromiseDate) {
          finalStatus = 'Pending';
        } else {
          finalStatus = 'Completed';
        }
      }

      const payload: Partial<CreditFollowUp> = {
        companyID: selectedCompanyId || 1,
        leadID: formLeadId || 0,
        leadName: formClientName.trim(),
        customerName: formClientName.trim(),
        mobileNo: formClientPhone.trim(),
        phone: formClientPhone.trim(),
        followUpDate: formFollowUpDate,
        followUpTime: formFollowUpTime,
        followUpType: formType,
        performedBy: formPerformedBy,
        outcome: formOutcome,
        priority: formPriority,
        reminderBefore: formReminderBefore,
        promiseToPayDate: formPromiseDate || undefined,
        promisedAmount: formPromisedAmount ? parseFloat(formPromisedAmount) : undefined,
        paymentMode: formPromiseDate ? formPaymentMode : undefined,
        nextFollowUpDate: formNextFollowUpDate || undefined,
        nextFollowUpTime: formNextFollowUpDate ? formNextFollowUpTime : undefined,
        notes: formNotes.trim() || undefined,
        remarks: formNotes.trim() || undefined,
        status: finalStatus,
        receiptDocumentID: formReceiptDocId,
        checkInTime: formType === 'Visit' ? formCheckInTime : undefined,
        checkOutTime: formType === 'Visit' ? formCheckOutTime : undefined,
        visitLocation: formType === 'Visit' ? formVisitLocation : undefined,
        gpsCoordinates: formType === 'Visit' ? formGpsCoordinates : undefined,
        emailSubject: formType === 'Email' ? formEmailSubject : undefined,
        emailStatus: formType === 'Email' ? formEmailStatus : undefined,
        whatsAppTemplate: formType === 'WhatsApp' ? formWhatsAppTemplate : undefined,
        whatsAppStatus: formType === 'WhatsApp' ? formWhatsAppStatus : undefined,
      };

      if (editingFollowUpId) {
        await creditService.updateCreditFollowUp(editingFollowUpId, payload);
        Alert.alert('Success', 'Credit follow-up updated successfully!');
      } else {
        await creditService.createCreditFollowUp(payload);
        Alert.alert(
          'Success',
          scheduleNext
            ? 'Follow-up saved & next follow-up scheduled!'
            : 'Credit follow-up logged successfully!'
        );
      }

      setDrawerOpen(false);
      if (selectedCustomer) {
        fetchHistory(selectedCustomer);
      }
      fetchBacklog();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to save credit follow-up');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateFollowUpStatus = async (id: number, newStatus: string) => {
    try {
      await creditService.updateCreditFollowUpStatus(id, newStatus);
      if (selectedCustomer) {
        fetchHistory(selectedCustomer);
      }
      fetchBacklog();
      Alert.alert('Success', `Status updated to ${newStatus}`);
    } catch {
      Alert.alert('Error', 'Failed to update follow-up status');
    }
  };

  const handleDeleteFollowUp = (id: number) => {
    Alert.alert('Delete Follow-Up', 'Are you sure you want to delete this credit follow-up record?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await creditService.deleteCreditFollowUp(id);
            if (selectedCustomer) {
              fetchHistory(selectedCustomer);
            }
            fetchBacklog();
          } catch (err) {
            Alert.alert('Error', 'Could not delete credit follow-up');
          }
        },
      },
    ]);
  };
 const openCustomerWhatsApp = async (mobileNo?: string) => {
  let phone = String(mobileNo || '').replace(/\D/g, '');

  if (phone.length === 0) {
    Alert.alert('Error', "It's not a valid number");
    return;
  }

  if (phone.length === 10) {
    phone = `91${phone}`;
  } else if (phone.length !== 12 || !phone.startsWith('91')) {
    Alert.alert('Error', "It's not a valid number");
    return;
  }

  try {
    await Linking.openURL(`https://wa.me/${phone}`);
  } catch {
    Alert.alert('Error', 'Unable to open WhatsApp');
  }
};

   

  const formatDateTimeDisplay = (dateStr?: string, timeStr?: string) => {
    if (!dateStr) return 'Not Scheduled';
    const datePart = getDateOnlyStr(dateStr);
    const isToday = datePart === todayStr;
    const timeDisplay = timeStr || '10:00 AM';
    if (isToday) return `Today • ${timeDisplay}`;
    try {
      const d = new Date(datePart);
      const formatted = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      return `${formatted} • ${timeDisplay}`;
    } catch {
      return `${datePart} • ${timeDisplay}`;
    }
  };

  // ==========================================
  // RENDER: MASTER BACKLOG VIEW (LEADS LIST SCREEN THEME)
  // ==========================================
  const renderMasterQueueView = () => (
    <View style={styles.flexOne}>
      {/* Search + Add Action Row - Same UI Theme as LeadsListScreen */}
      <View style={styles.actionRow}>
        <View style={styles.searchContainer}>
          <SearchBar
            value={backlogSearch}
            onChangeText={(text) => {
              setBacklogSearch(text);
              setCurrentPage(1);
            }}
            placeholder="Search lead, company, phone, doc #..."
          />
        </View>

        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => openAddDrawer()}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={16} color="#ffffff" />
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.listContentScroll}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={fetchBacklog}
            colors={[Colors.primary]}
          />
        }
      >
        {loadingBacklog && !refreshing ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#645695" />
            <Text style={styles.loadingText}>Loading credit directory...</Text>
          </View>
        ) : paginatedBacklogList.length === 0 ? (
          <EmptyState
            title={queueFilter === 'Today' ? 'No Credit Dues Today' : 'No Records Found'}
            description="No credit accounts match your search query."
            actionTitle="Record Follow-Up"
            onAction={() => openAddDrawer()}
          />
        ) : (
          paginatedBacklogList.map((item, idx) => {
            const phone = item.phone && item.phone !== '-' ? item.phone : '';
            const name = item.customerName || 'Unknown Customer';
            const isDue = (item.dueDate || '') <= todayStr;
            const initials = name.substring(0, 2).toUpperCase();

            return (
               
<CommonListCard
  key={String(item.id || item.leadId || idx)}
  title={name}
  subtitle={item.companyName || undefined}
  avatarText={initials}
  avatarBgColor="#EDE9FE"
  avatarColor={Colors.primary}
  badgeLabel={item.dueReason || 'Overdue'}
  badgeVariant={item.outstandingBalance <= 0 ? 'success' : 'danger'}
  pills={[
    item.dueDate
      ? {
          icon: 'calendar-outline',
          text: `Due: ${item.dueDate}`,
          iconColor: isDue ? '#b45309' : '#15803d',
        }
      : null,
    item.latestFollowUp?.promiseToPayDate
      ? {
          icon: 'cash-outline',
          text: `Promise: ${getDateOnlyStr(item.latestFollowUp.promiseToPayDate)}`,
          iconColor: '#15803d',
        }
      : null,
  ]}
 metaLeft={{
  label: 'Phone / Mobile',
  value: item.phone && item.phone !== '-' ? String(item.phone) : 'N/A',
  valueColor: '#0f172a',
}}
  metaRight={{
    label: 'Pending Due',
    badgeText: formatCurrency(item.outstandingBalance || 0),
    badgeIcon: 'wallet-outline',
    badgeColor: '#dc2626',
    badgeBgColor: '#fef2f2',
  }}

  

  footerLeftComponent={
    <TouchableOpacity
      style={styles.cardLogsBtn}
      onPress={() =>
        handleSelectCustomer(item, item.isDocumentItem ? 'Documents' : 'All')
      }
      activeOpacity={0.7}
    >
      <Ionicons name="journal-outline" size={13} color="#645695" />
      <Text style={styles.cardLogsBtnText}>
        {item.isDocumentItem ? 'View Documents' : 'Follow-up Logs'}
      </Text>
    </TouchableOpacity>
  }

  editLabel="Add Follow-up"

  onEdit={() =>
    openAddDrawer(item, item.isDocumentItem ? item.id : undefined)
  }

 onWhatsApp={() => openCustomerWhatsApp(item.phone)}
  onPress={() =>
    handleSelectCustomer(
      item,
      item.isDocumentItem ? 'Documents' : 'All'
    )
  }
>
  {/* Financial Amounts Summary Box */}
  <View style={styles.financialAmountSummaryBox}>
    <View style={styles.financialAmountCol}>
      <Text style={styles.financialAmountLabel}>Total Bill</Text>
      <Text style={styles.financialAmountValueRegular}>
        {formatCurrency(item.totalDealAmount || item.outstandingBalance)}
      </Text>
    </View>

    <View style={styles.financialAmountCol}>
      <Text style={styles.financialAmountLabel}>Received</Text>
      <Text style={styles.financialAmountValueSuccess}>
        {formatCurrency(item.receivedAmount || 0)}
      </Text>
    </View>

    <View style={styles.financialAmountCol}>
      <Text style={styles.financialAmountLabel}>Overdue</Text>
      <Text style={styles.financialAmountValueDanger}>
        {formatCurrency(item.overdueAmount || item.outstandingBalance)}
      </Text>
    </View>
  </View>

  {item.lastNote ? (
    <View style={styles.cardRemarksBox}>
      <Text style={styles.cardRemarksText} numberOfLines={2}>
        {item.lastNote}
      </Text>
    </View>
  ) : null}
</CommonListCard>

            );
          })
        )}

        {/* Standard Pagination matching LeadsListScreen */}
        {backlogTotalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={backlogTotalPages}
            totalItems={backlogTotalItems}
            onPageChange={(page) => setCurrentPage(page)}
          />
        )}
      </ScrollView>
    </View>
  );

  // ==========================================
  // RENDER: CUSTOMER DETAIL VIEW (EXACT WEB PARITY)
  // ==========================================
  const renderCustomerDetailView = () => {
    if (!selectedCustomer) return null;
    const phone = selectedCustomer.phone !== '-' ? selectedCustomer.phone : '';
    const name = selectedCustomer.customerName || selectedCustomer.companyName || 'Customer';

    // Invoices list for this customer
    const docInvoices = (selectedCustomer.invoices || []).filter((doc) => {
      if (!customerDetailSearch.trim()) return true;
      const q = customerDetailSearch.toLowerCase().trim();
      return (
        doc.docCode.toLowerCase().includes(q) ||
        doc.status.toLowerCase().includes(q) ||
        String(doc.amount).includes(q)
      );
    });

    // Receipts for this customer
    const filteredRcpts = customerReceipts.filter((rcpt) => {
      if (!customerDetailSearch.trim()) return true;
      const q = customerDetailSearch.toLowerCase().trim();
      return (
        rcpt.receiptNo.toLowerCase().includes(q) ||
        (rcpt.remarks || '').toLowerCase().includes(q) ||
        String(rcpt.amount).includes(q)
      );
    });

    // Sales logs for this customer
    const filteredSales = salesFollowUps.filter((sLog) => {
      if (!customerDetailSearch.trim()) return true;
      const q = customerDetailSearch.toLowerCase().trim();
      return (
        (sLog.followUpType || '').toLowerCase().includes(q) ||
        (sLog.outcome || '').toLowerCase().includes(q) ||
        (sLog.performedBy || '').toLowerCase().includes(q) ||
        (sLog.remarks || '').toLowerCase().includes(q)
      );
    });

    return (
      <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
        {/* Customer Header Card */}
        <View style={styles.customerHeaderCard}>
          <View style={styles.customerHeaderTopRow}>
            <TouchableOpacity onPress={handleBackToBacklog} style={styles.backToBacklogBtn} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={18} color="#645695" />
            </TouchableOpacity>

            <View style={styles.customerHeaderAvatar}>
              <Text style={styles.customerHeaderAvatarText}>{name.substring(0, 2).toUpperCase()}</Text>
            </View>

            <View style={styles.customerHeaderTitles}>
              <Text style={styles.customerHeaderName} numberOfLines={1}>
                {name}
              </Text>
              <Text style={styles.customerHeaderSub} numberOfLines={1}>
                {selectedCustomer.companyName ? `${selectedCustomer.companyName} • ` : ''}
                {phone || 'No phone'}
              </Text>
            </View>

            {phone ? (
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <TouchableOpacity
                  style={styles.iconCircleBtn}
                  onPress={() => messagingService.makePhoneCall(phone)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="call" size={13} color="#645695" />
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        </View>

        {/* FINANCIAL HEALTH SUMMARY BANNER (EXACT WEB PARITY) */}
        <View style={styles.financialHealthBanner}>
          <View style={styles.healthMetricItem}>
            <Text style={styles.healthMetricLabel}>TOTAL BILL</Text>
            <Text style={styles.healthMetricValRegular}>
              {formatCurrency(selectedCustomer.totalDealAmount || selectedCustomer.outstandingBalance)}
            </Text>
          </View>

          <View style={styles.healthMetricItem}>
            <Text style={styles.healthMetricLabel}>RECEIVED</Text>
            <Text style={styles.healthMetricValSuccess}>
              {formatCurrency(selectedCustomer.receivedAmount || 0)}
            </Text>
          </View>

          <View style={styles.healthMetricItem}>
            <Text style={styles.healthMetricLabel}>PENDING DUE</Text>
            <Text style={styles.healthMetricValWarning}>
              {formatCurrency(selectedCustomer.outstandingBalance)}
            </Text>
          </View>

          <View style={[styles.healthMetricItem, { borderRightWidth: 0 }]}>
            <Text style={styles.healthMetricLabel}>OVERDUE</Text>
            <Text style={styles.healthMetricValDanger}>
              {formatCurrency(selectedCustomer.overdueAmount || selectedCustomer.outstandingBalance)}
            </Text>
          </View>
        </View>

        {/* Clean History Tabs Bar (Documents, All, Call, WhatsApp, Visit, Email, Meeting, Payments, Sales) */}
        <View style={styles.cleanTabsWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cleanTabsScroll}>
            {['Documents', 'All', 'Call', 'WhatsApp', 'Visit', 'Email', 'Meeting', 'Payments', 'Sales'].map((tab) => {
              const isActive = activeTab === tab;
              const count =
                tab === 'Documents'
                  ? (selectedCustomer.invoices?.length || 0)
                  : tab === 'Payments'
                  ? customerReceipts.length
                  : tab === 'Sales'
                  ? salesFollowUps.length
                  : tab === 'All'
                  ? customerHistory.length
                  : customerHistory.filter((c) => (c.followUpType || '').toLowerCase().includes(tab.toLowerCase())).length;

              return (
                <TouchableOpacity
                  key={tab}
                  style={[styles.cleanTabPill, isActive && styles.cleanTabPillActive]}
                  onPress={() => setActiveTab(tab)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.cleanTabPillText, isActive && styles.cleanTabPillTextActive]}>
                    {tab === 'Documents'
                      ? 'Invoices'
                      : tab === 'Payments'
                      ? 'Receipts'
                      : tab === 'Sales'
                      ? 'Sales Logs'
                      : tab}
                  </Text>
                  {count > 0 && (
                    <View
                      style={[
                        styles.cleanTabBadge,
                        isActive && styles.cleanTabBadgeActive,
                        tab === 'Sales' && { backgroundColor: '#dc2626' },
                      ]}
                    >
                      <Text style={[styles.cleanTabBadgeText, isActive && styles.cleanTabBadgeTextActive]}>
                        {count}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Search, Date Filter & Add Button Strip */}
        <View style={styles.cleanFilterActionRow}>
          <View style={styles.detailSearchBox}>
            <Ionicons name="search" size={14} color="#888" style={{ marginRight: 6 }} />
            <TextInput
              placeholder="Search logs, doc #, notes..."
              placeholderTextColor="#888"
              value={customerDetailSearch}
              onChangeText={setCustomerDetailSearch}
              style={styles.detailSearchInput}
            />
            {customerDetailSearch ? (
              <TouchableOpacity onPress={() => setCustomerDetailSearch('')}>
                <Ionicons name="close-circle" size={14} color="#888" />
              </TouchableOpacity>
            ) : null}
          </View>

          <TouchableOpacity
            style={styles.cleanAddButton}
            onPress={() => openAddDrawer(selectedCustomer)}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={15} color="#ffffff" />
            <Text style={styles.cleanAddButtonText}>Add Log</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Specific Content */}
        {loadingHistory ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator size="small" color="#645695" />
            <Text style={{ marginTop: 8, color: '#666', fontSize: 12 }}>Loading Customer History...</Text>
          </View>
        ) : activeTab === 'Documents' ? (
          /* ==================== DOCUMENTS / INVOICES TAB ==================== */
          docInvoices.length === 0 ? (
            <View style={{ marginHorizontal: 16 }}>
              <EmptyState
                title="No Invoice Documents"
                description="No outstanding sales invoice documents found for this customer."
                icon="document-text-outline"
                actionTitle="Schedule Follow-up"
                onAction={() => openAddDrawer(selectedCustomer)}
              />
            </View>
          ) : (
            <View style={styles.tabItemsContainer}>
              {docInvoices.map((doc, idx) => (
                <View key={String(doc.id || idx)} style={styles.docItemCard}>
                  <View style={styles.docCardHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={styles.docIconCircle}>
                        <Ionicons name="document-text" size={15} color="#645695" />
                      </View>
                      <View>
                        <Text style={styles.docCodeText}>Invoice #{doc.docCode}</Text>
                        <Text style={styles.docDateSubText}>
                          Date: {doc.docDate} • Due: {doc.dueDate}
                        </Text>
                      </View>
                    </View>

                    <Badge label={doc.status || 'Overdue'} variant="warning" size="sm" />
                  </View>

                  {/* Financial Grid */}
                  <View style={styles.docAmountsGrid}>
                    <View style={styles.docAmountCol}>
                      <Text style={styles.docAmountLabel}>TOTAL BILL</Text>
                      <Text style={styles.docAmountValRegular}>{formatCurrency(doc.totalDealAmount)}</Text>
                    </View>
                    <View style={styles.docAmountCol}>
                      <Text style={styles.docAmountLabel}>RECEIVED</Text>
                      <Text style={styles.docAmountValSuccess}>{formatCurrency(doc.receivedAmount)}</Text>
                    </View>
                    <View style={styles.docAmountCol}>
                      <Text style={styles.docAmountLabel}>PENDING</Text>
                      <Text style={styles.docAmountValWarning}>{formatCurrency(doc.amount)}</Text>
                    </View>
                    <View style={styles.docAmountCol}>
                      <Text style={styles.docAmountLabel}>OVERDUE</Text>
                      <Text style={styles.docAmountValDanger}>{formatCurrency(doc.overdueAmount)}</Text>
                    </View>
                  </View>

                  {/* Action Row */}
                  <View style={styles.docActionRow}>
                    <TouchableOpacity
                      style={styles.docFollowUpBtn}
                      onPress={() =>
                        openAddDrawer(selectedCustomer, doc.id, `Follow-up for Invoice #${doc.docCode}`)
                      }
                      activeOpacity={0.7}
                    >
                      <Ionicons name="add-circle-outline" size={14} color="#645695" />
                      <Text style={styles.docFollowUpBtnText}>Follow-up on this Invoice</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )
        ) : activeTab === 'Payments' ? (
          /* ==================== PAYMENT RECEIPTS TAB ==================== */
          filteredRcpts.length === 0 ? (
            <View style={{ marginHorizontal: 16 }}>
              <EmptyState
                title="No Payment Receipts"
                description="No payment collection receipts recorded yet for this customer."
                icon="receipt-outline"
              />
            </View>
          ) : (
            <View style={styles.tabItemsContainer}>
              {filteredRcpts.map((rcpt, idx) => (
                <View key={String(rcpt.receiptId || idx)} style={styles.receiptItemCard}>
                  <View style={styles.receiptCardHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={[styles.docIconCircle, { backgroundColor: '#ecfdf5' }]}>
                        <Ionicons name="receipt" size={15} color="#059669" />
                      </View>
                      <View>
                        <Text style={[styles.docCodeText, { color: '#059669' }]}>{rcpt.receiptNo}</Text>
                        <Text style={styles.docDateSubText}>
                          Date: {getDateOnlyStr(rcpt.receiptDate)} • Mode: {rcpt.paymentMode}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.receiptAmountText}>{formatCurrency(rcpt.amount)}</Text>
                  </View>

                  {rcpt.referenceNo ? (
                    <Text style={styles.receiptRefText}>Txn Ref: {rcpt.referenceNo}</Text>
                  ) : null}

                  {rcpt.remarks ? (
                    <View style={styles.cleanNotesCard}>
                      <Text style={styles.cleanNotesCardText}>{rcpt.remarks}</Text>
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          )
        ) : activeTab === 'Sales' ? (
          /* ==================== SALES FOLLOW-UP CROSS-REFERENCE TAB ==================== */
          filteredSales.length === 0 ? (
            <View style={{ marginHorizontal: 16 }}>
              <EmptyState
                title="No Sales Follow-ups"
                description="No sales communication logs found for this customer."
                icon="person-outline"
              />
            </View>
          ) : (
            <View style={styles.tabItemsContainer}>
              {filteredSales.map((sLog, idx) => (
                <View key={String(sLog.followUpID || idx)} style={styles.cleanHistoryCard}>
                  <View style={styles.cleanCardHeader}>
                    <View style={[styles.cleanTypeIconCircle, { backgroundColor: '#f0f9ff', borderColor: '#bae6fd' }]}>
                      <Ionicons name="person-outline" size={15} color="#0284c7" />
                    </View>

                    <View style={styles.cleanCardHeaderTitle}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text style={styles.cleanCardTypeTitle}>{sLog.followUpType || 'Sales Call'}</Text>
                        <View style={[styles.cleanOutcomeBadge, { backgroundColor: '#e0f2fe', borderColor: '#bae6fd' }]}>
                          <Text style={[styles.cleanOutcomeBadgeText, { color: '#0369a1' }]}>
                            {sLog.outcome || 'Connected'}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.cleanCardDateSub}>
                        {formatDateTimeDisplay(sLog.followUpDate, sLog.followUpTime)}
                        {sLog.performedBy ? ` • ${sLog.performedBy}` : ''}
                      </Text>
                    </View>

                    <Badge label={sLog.status || 'Completed'} variant="success" size="sm" />
                  </View>

                  {sLog.remarks ? (
                    <View style={styles.cleanNotesCard}>
                      <Text style={styles.cleanNotesCardText}>{sLog.remarks}</Text>
                    </View>
                  ) : null}

                  {(sLog.nextFollowUpDate || sLog.priority) ? (
                    <View style={styles.cleanCardFooterRow}>
                      {sLog.nextFollowUpDate ? (
                        <View style={styles.cleanNextScheduleTag}>
                          <Ionicons name="calendar-outline" size={12} color="#645695" />
                          <Text style={styles.cleanNextScheduleTagText}>
                            Next: <Text style={{ fontWeight: '700' }}>{getDateOnlyStr(sLog.nextFollowUpDate)} {sLog.nextFollowUpTime || ''}</Text>
                          </Text>
                        </View>
                      ) : <View />}

                      {sLog.priority ? (
                        <View
                          style={[
                            styles.cleanPriorityTag,
                            sLog.priority === 'High'
                              ? styles.priorityHigh
                              : sLog.priority === 'Low'
                              ? styles.priorityLow
                              : styles.priorityMedium,
                          ]}
                        >
                          <Text
                            style={[
                              styles.cleanPriorityTagText,
                              sLog.priority === 'High'
                                ? { color: '#dc2626' }
                                : sLog.priority === 'Low'
                                ? { color: '#16a34a' }
                                : { color: '#d97706' },
                            ]}
                          >
                            {sLog.priority}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          )
        ) : (
          /* ==================== CREDIT FOLLOW-UP LOGS TABS ==================== */
          filteredHistory.length === 0 ? (
            <View style={{ marginHorizontal: 16 }}>
              <EmptyState
                title="No Follow-Up Logs"
                description="No credit follow-up logs recorded. Click Add Log to record customer communication."
                actionTitle="Add Follow-up"
                onAction={() => openAddDrawer(selectedCustomer)}
              />
            </View>
          ) : (
            <View style={styles.cleanHistoryList}>
              {filteredHistory.map((item) => {
                const typeTheme = getFollowUpTypeTheme(item.followUpType);
                const outcomeTheme = getOutcomeTheme(item.outcome);
                const isCompleted = (item.status || '').toLowerCase() === 'completed';

                return (
                  <View key={String(item.followUpID)} style={styles.cleanHistoryCard}>
                    {/* Card Header Row */}
                    <View style={styles.cleanCardHeader}>
                      <View
                        style={[
                          styles.cleanTypeIconCircle,
                          { backgroundColor: typeTheme.bg, borderColor: typeTheme.border },
                        ]}
                      >
                        <Ionicons name={typeTheme.icon} size={15} color={typeTheme.color} />
                      </View>

                      <View style={styles.cleanCardHeaderTitle}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <Text style={styles.cleanCardTypeTitle}>{item.followUpType || 'Call'}</Text>
                          {item.outcome ? (
                            <View
                              style={[
                                styles.cleanOutcomeBadge,
                                { backgroundColor: outcomeTheme.bg, borderColor: outcomeTheme.border },
                              ]}
                            >
                              <Text style={[styles.cleanOutcomeBadgeText, { color: outcomeTheme.color }]}>
                                {item.outcome}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                        <Text style={styles.cleanCardDateSub}>
                          {formatDateTimeDisplay(item.followUpDate, item.followUpTime)}
                          {item.performedBy ? ` • ${item.performedBy}` : ''}
                        </Text>
                      </View>

                      {/* Right Action Icons: Status toggle, edit, delete */}
                      <View style={styles.cleanCardTopActions}>
                        <TouchableOpacity
                          onPress={() => {
                            const next = isCompleted ? 'Pending' : 'Completed';
                            if (item.followUpID) {
                              handleUpdateFollowUpStatus(item.followUpID, next);
                            }
                          }}
                          style={[
                            styles.cleanStatusTogglePill,
                            isCompleted ? styles.cleanStatusPillCompleted : styles.cleanStatusPillPending,
                          ]}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name={isCompleted ? 'checkmark-circle' : 'time'}
                            size={12}
                            color={isCompleted ? '#16a34a' : '#d97706'}
                          />
                          <Text
                            style={[
                              styles.cleanStatusToggleText,
                              { color: isCompleted ? '#16a34a' : '#d97706' },
                            ]}
                          >
                            {item.status || 'Pending'}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => openEditDrawer(item)}
                          style={styles.cleanMiniActionBtn}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="pencil-outline" size={15} color="#645695" />
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => item.followUpID && handleDeleteFollowUp(item.followUpID)}
                          style={styles.cleanMiniActionBtn}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="trash-outline" size={15} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Promise to Pay Banner */}
                    {(item.promiseToPayDate || (item.promisedAmount && item.promisedAmount > 0)) ? (
                      <View style={styles.cleanPromiseBanner}>
                        <View style={styles.cleanPromiseLeft}>
                          <Ionicons name="cash-outline" size={14} color="#15803d" />
                          <Text style={styles.cleanPromiseLabel}>Promise to Pay:</Text>
                          <Text style={styles.cleanPromiseVal}>
                            {formatCurrency(item.promisedAmount)}
                          </Text>
                        </View>
                        <View style={styles.cleanPromiseRight}>
                          {item.promiseToPayDate ? (
                            <View style={styles.cleanPromiseDatePill}>
                              <Ionicons name="calendar-outline" size={11} color="#15803d" />
                              <Text style={styles.cleanPromiseDateText}>
                                {getDateOnlyStr(item.promiseToPayDate)}
                              </Text>
                            </View>
                          ) : null}
                          {item.paymentMode ? (
                            <View style={styles.cleanPromiseModePill}>
                              <Text style={styles.cleanPromiseModeText}>{item.paymentMode}</Text>
                            </View>
                          ) : null}
                        </View>
                      </View>
                    ) : null}

                    {/* Notes Box */}
                    {item.notes ? (
                      <View style={styles.cleanNotesCard}>
                        <Text style={styles.cleanNotesCardText}>{item.notes}</Text>
                      </View>
                    ) : null}

                    {/* Conditional Info line (Visit location / Email subject / WA template) */}
                    {(item.visitLocation || item.emailSubject || item.whatsAppTemplate) ? (
                      <View style={styles.cleanMetaInfoRow}>
                        {item.visitLocation ? (
                          <View style={styles.cleanMetaItem}>
                            <Ionicons name="location-outline" size={13} color="#ea580c" />
                            <Text style={styles.cleanMetaItemText} numberOfLines={1}>
                              {item.visitLocation}
                            </Text>
                          </View>
                        ) : null}
                        {item.emailSubject ? (
                          <View style={styles.cleanMetaItem}>
                            <Ionicons name="mail-outline" size={13} color="#0284c7" />
                            <Text style={styles.cleanMetaItemText} numberOfLines={1}>
                              {item.emailSubject}
                            </Text>
                          </View>
                        ) : null}
                        {item.whatsAppTemplate ? (
                          <View style={styles.cleanMetaItem}>
                            <Ionicons name="logo-whatsapp" size={13} color="#16a34a" />
                            <Text style={styles.cleanMetaItemText} numberOfLines={1}>
                              {item.whatsAppTemplate}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    ) : null}

                    {/* Card Footer: Next Scheduled Follow-up & Priority */}
                    {(item.nextFollowUpDate || item.priority) ? (
                      <View style={styles.cleanCardFooterRow}>
                        {item.nextFollowUpDate ? (
                          <View style={styles.cleanNextScheduleTag}>
                            <Ionicons name="calendar-outline" size={12} color="#645695" />
                            <Text style={styles.cleanNextScheduleTagText}>
                              Next: <Text style={{ fontWeight: '700' }}>{getDateOnlyStr(item.nextFollowUpDate)} {item.nextFollowUpTime || ''}</Text>
                            </Text>
                          </View>
                        ) : <View />}

                        {item.priority ? (
                          <View
                            style={[
                              styles.cleanPriorityTag,
                              item.priority === 'High'
                                ? styles.priorityHigh
                                : item.priority === 'Low'
                                ? styles.priorityLow
                                : styles.priorityMedium,
                            ]}
                          >
                            <Text
                              style={[
                                styles.cleanPriorityTagText,
                                item.priority === 'High'
                                  ? { color: '#dc2626' }
                                  : item.priority === 'Low'
                                  ? { color: '#16a34a' }
                                  : { color: '#d97706' },
                              ]}
                            >
                              {item.priority}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          )
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    );
  };

  // ==========================================
  // RENDER: MAIN COMPONENT
  // ==========================================
  return (
    <View style={styles.container}>
      {/* Fixed CRM Header with + Follow-up Button */}
       <Header
        title={selectedCustomer ? (selectedCustomer.customerName || 'Customer Follow-up') : 'Credit Follow-up'}
        showBack={
          selectedCustomer
            ? true
            : route?.name !== 'CreditTab' && navigation?.canGoBack
              ? navigation.canGoBack()
              : false
        }
        onBack={() => {
        if (selectedCustomer) {
          handleBackToBacklog();
        } else if (navigation?.goBack) {
          navigation.goBack();
        }
      }}
              currentRoute={route?.name || 'CreditTab'}
        navigation={navigation}
      />

      {hasNoCompany ? (
        <ScrollView
          contentContainerStyle={{ padding: 20 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        >
          <View style={styles.restrictedCard}>
            <View style={[styles.restrictedIconBox, { backgroundColor: '#ede9fe' }]}>
              <Ionicons name="business" size={36} color="#645695" />
            </View>
            <Text style={styles.restrictedHeading}>No Company Assigned</Text>
            <Text style={styles.restrictedText}>
              Your user account has not been assigned to any company yet. In Techno CRM, credit follow-ups and ledger data are only accessible once a company is assigned to your profile in User Master.
            </Text>
            <TouchableOpacity style={styles.restrictedReloadBtn} onPress={onRefresh}>
              <Ionicons name="refresh" size={16} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.restrictedReloadBtnText}>Check Again</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : isCreditBlocked ? (
        <ScrollView
          contentContainerStyle={{ padding: 20 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        >
          <View style={styles.restrictedCard}>
            <View style={[styles.restrictedIconBox, { backgroundColor: '#fee2e2' }]}>
              <Ionicons name="lock-closed" size={36} color="#ef4444" />
            </View>
            <Text style={styles.restrictedHeading}>Credit Access Restricted</Text>
            <Text style={styles.restrictedText}>
              Your account does not have permission to view Credit Follow-ups. Please contact your CRM administrator to grant access in User Permission.
            </Text>
            <TouchableOpacity style={styles.restrictedReloadBtn} onPress={onRefresh}>
              <Ionicons name="refresh" size={16} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.restrictedReloadBtnText}>Check Again</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <>
          {/* Pinned Top Queue Bar (Clean horizontal scroll pills with icons, count badges, and zero text overflow) */}
          {!selectedCustomer && (
            <View style={styles.topQueueSegmentedBar}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.topQueueScrollContainer}
              >
                <TouchableOpacity
                  style={[
                    styles.topQueueSegmentItem,
                    queueFilter === 'Today' && styles.topQueueSegmentItemActive,
                  ]}
                  onPress={() => {
                    setQueueFilter('Today');
                    setBacklogDateFilterMode('All');
                    setCurrentPage(1);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="alert-circle"
                    size={14}
                    color={queueFilter === 'Today' ? '#fde047' : '#d97706'}
                  />
                  <Text
                    style={[
                      styles.topQueueSegmentText,
                      queueFilter === 'Today' && styles.topQueueSegmentTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    Today
                  </Text>
                  <View
                    style={[
                      styles.topQueueCountBadge,
                      queueFilter === 'Today' && styles.topQueueCountBadgeActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.topQueueCountText,
                        queueFilter === 'Today' && styles.topQueueCountTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {todayCount}
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.topQueueSegmentItem,
                    queueFilter === 'Scheduled' && styles.topQueueSegmentItemActive,
                  ]}
                  onPress={() => {
                    setQueueFilter('Scheduled');
                    setBacklogDateFilterMode('All');
                    setCurrentPage(1);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="time"
                    size={14}
                    color={queueFilter === 'Scheduled' ? '#bae6fd' : '#0284c7'}
                  />
                  <Text
                    style={[
                      styles.topQueueSegmentText,
                      queueFilter === 'Scheduled' && styles.topQueueSegmentTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    Scheduled
                  </Text>
                  <View
                    style={[
                      styles.topQueueCountBadge,
                      queueFilter === 'Scheduled' && styles.topQueueCountBadgeActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.topQueueCountText,
                        queueFilter === 'Scheduled' && styles.topQueueCountTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {scheduledCount}
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.topQueueSegmentItem,
                    queueFilter === 'DocumentWise' && styles.topQueueSegmentItemActive,
                  ]}
                  onPress={() => {
                    setQueueFilter('DocumentWise');
                    setCurrentPage(1);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="document-text"
                    size={14}
                    color={queueFilter === 'DocumentWise' ? '#ddd6fe' : '#7c3aed'}
                  />
                  <Text
                    style={[
                      styles.topQueueSegmentText,
                      queueFilter === 'DocumentWise' && styles.topQueueSegmentTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    Invoices
                  </Text>
                  <View
                    style={[
                      styles.topQueueCountBadge,
                      queueFilter === 'DocumentWise' && styles.topQueueCountBadgeActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.topQueueCountText,
                        queueFilter === 'DocumentWise' && styles.topQueueCountTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {docWiseCount}
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.topQueueSegmentItem,
                    queueFilter === 'All' && styles.topQueueSegmentItemActive,
                  ]}
                  onPress={() => {
                    setQueueFilter('All');
                    setBacklogDateFilterMode('All');
                    setCurrentPage(1);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="layers"
                    size={14}
                    color={queueFilter === 'All' ? '#ffffff' : '#64748b'}
                  />
                  <Text
                    style={[
                      styles.topQueueSegmentText,
                      queueFilter === 'All' && styles.topQueueSegmentTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    All
                  </Text>
                  <View
                    style={[
                      styles.topQueueCountBadge,
                      queueFilter === 'All' && styles.topQueueCountBadgeActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.topQueueCountText,
                        queueFilter === 'All' && styles.topQueueCountTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {allCount}
                    </Text>
                  </View>
                </TouchableOpacity>
              </ScrollView>
            </View>
          )}

          {/* Main Content Area */}
          <View style={{ flex: 1 }}>
            {selectedCustomer ? renderCustomerDetailView() : renderMasterQueueView()}
          </View>
        </>
      )}

      {/* ======================================================== */}
      {/* ADD / EDIT FOLLOW-UP DRAWER MODAL (EXACT SALES CRM PARITY) */}
      {/* ======================================================== */}
      <Modal
        visible={drawerOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDrawerOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContainer}>
            {/* Sheet Handle */}
            <View style={styles.sheetHandleBar}>
              <View style={styles.sheetHandle} />
            </View>

            {/* Drawer Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleGroup}>
                <View style={styles.modalHeaderIconBadge}>
                  <Ionicons name="card" size={16} color="#645695" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>
                    {editingFollowUpId ? 'Edit Credit Follow-up' : 'New Credit Follow-up'}
                  </Text>
                  <Text style={styles.modalSubTitle} numberOfLines={1}>
                    {formClientName ? formClientName : 'Record recovery communication & promise'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setDrawerOpen(false)} style={styles.modalCloseBtn} activeOpacity={0.7}>
                <Ionicons name="close" size={18} color="#475569" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBody}
              contentContainerStyle={{ paddingBottom: 160 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="none"
            >
              {/* SECTION 1: Follow-up Details */}
              <View style={styles.formSectionBox}>
                <Text style={styles.formSectionHeader}>Follow-up Details</Text>

                {/* Customer / Lead Name */}
                <View style={styles.formFieldGroup}>
                  <Text style={styles.formLabel}>Customer / Lead Name *</Text>
                  <TouchableOpacity
                    style={styles.webLeadInputBtn}
                    onPress={() => setLeadSelectorVisible(true)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.webLeadInputText,
                        !formClientName && styles.webLeadInputPlaceholder,
                      ]}
                      numberOfLines={1}
                    >
                      {formClientName || 'Select Customer Name...'}
                    </Text>
                    <Ionicons name="search-outline" size={17} color="#645695" />
                  </TouchableOpacity>
                </View>

                {/* Follow-up Date & Time */}
                <View style={styles.twoColRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formLabel}>Follow-up Date</Text>
                    <MobileDatePicker
                      label=""
                      value={formFollowUpDate}
                      onChangeDate={setFormFollowUpDate}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formLabel}>Follow-up Time</Text>
                    <TouchableOpacity
                      style={styles.selectDropdownBtn}
                      onPress={() =>
                        setPickerModal({
                          visible: true,
                          title: 'Select Follow-Up Time',
                          options: TIME_SLOTS,
                          selected: formFollowUpTime,
                          onSelect: (val) => setFormFollowUpTime(val),
                        })
                      }
                      activeOpacity={0.7}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                        <Ionicons name="time-outline" size={16} color="#645695" />
                        <Text style={styles.selectDropdownBtnText}>{formFollowUpTime}</Text>
                      </View>
                      <Ionicons name="chevron-down" size={14} color="#888" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Follow up Type & Performed By */}
                <View style={styles.twoColRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formLabel}>Follow up Type</Text>
                    <TouchableOpacity
                      style={styles.selectDropdownBtn}
                      onPress={() =>
                        setPickerModal({
                          visible: true,
                          title: 'Select Follow-up Type',
                          options: FOLLOWUP_TYPES,
                          selected: formType,
                          onSelect: (val) => setFormType(val),
                        })
                      }
                      activeOpacity={0.7}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                        <Ionicons
                          name={
                            formType === 'WhatsApp'
                              ? 'logo-whatsapp'
                              : formType === 'Visit'
                              ? 'business'
                              : formType === 'Email'
                              ? 'mail'
                              : 'call'
                          }
                          size={15}
                          color="#645695"
                        />
                        <Text style={styles.selectDropdownBtnText}>{formType}</Text>
                      </View>
                      <Ionicons name="chevron-down" size={14} color="#888" />
                    </TouchableOpacity>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.formLabel}>Performed By</Text>
                    <TextInput
                      style={styles.formTextInput}
                      placeholder="e.g. Collector / Staff"
                      placeholderTextColor="#94a3b8"
                      value={formPerformedBy}
                      onChangeText={setFormPerformedBy}
                    />
                  </View>
                </View>

                {/* Conditional Sub-fields: Visit Details */}
                {formType === 'Visit' && (
                  <View style={styles.conditionalBoxOrange}>
                    <Text style={styles.conditionalTitleOrange}>
                      <Ionicons name="location" size={13} color="#ea580c" /> Visit Details
                    </Text>
                    <View style={styles.twoColRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.formLabel}>Check-in Time</Text>
                        <TextInput
                          style={styles.formTextInput}
                          placeholder="e.g. 10:30 AM"
                          placeholderTextColor="#94a3b8"
                          value={formCheckInTime}
                          onChangeText={setFormCheckInTime}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.formLabel}>Check-out Time</Text>
                        <TextInput
                          style={styles.formTextInput}
                          placeholder="e.g. 11:30 AM"
                          placeholderTextColor="#94a3b8"
                          value={formCheckOutTime}
                          onChangeText={setFormCheckOutTime}
                        />
                      </View>
                    </View>
                    <View style={styles.formFieldGroup}>
                      <Text style={styles.formLabel}>Visit Location</Text>
                      <TextInput
                        style={styles.formTextInput}
                        placeholder="Enter location name or landmark"
                        placeholderTextColor="#94a3b8"
                        value={formVisitLocation}
                        onChangeText={setFormVisitLocation}
                      />
                    </View>
                    <View style={styles.formFieldGroup}>
                      <Text style={styles.formLabel}>GPS Coordinates (Optional)</Text>
                      <TextInput
                        style={styles.formTextInput}
                        placeholder="e.g. 28.6139, 77.2090"
                        placeholderTextColor="#94a3b8"
                        value={formGpsCoordinates}
                        onChangeText={setFormGpsCoordinates}
                      />
                    </View>
                  </View>
                )}

                {/* Conditional Sub-fields: Email Details */}
                {formType === 'Email' && (
                  <View style={styles.conditionalBoxPurple}>
                    <Text style={styles.conditionalTitlePurple}>
                      <Ionicons name="mail" size={13} color="#7c3aed" /> Email Details
                    </Text>
                    <View style={styles.formFieldGroup}>
                      <Text style={styles.formLabel}>Subject</Text>
                      <TextInput
                        style={styles.formTextInput}
                        placeholder="Enter email subject line"
                        placeholderTextColor="#94a3b8"
                        value={formEmailSubject}
                        onChangeText={setFormEmailSubject}
                      />
                    </View>
                    <View style={styles.formFieldGroup}>
                      <Text style={styles.formLabel}>Email Status</Text>
                      <TouchableOpacity
                        style={styles.selectDropdownBtn}
                        onPress={() =>
                          setPickerModal({
                            visible: true,
                            title: 'Select Email Status',
                            options: ['Sent', 'Delivered', 'Opened', 'Failed'],
                            selected: formEmailStatus,
                            onSelect: (val) => setFormEmailStatus(val),
                          })
                        }
                        activeOpacity={0.7}
                      >
                        <Text style={styles.selectDropdownBtnText}>{formEmailStatus}</Text>
                        <Ionicons name="chevron-down" size={14} color="#888" />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Conditional Sub-fields: WhatsApp Details */}
                {formType === 'WhatsApp' && (
                  <View style={styles.conditionalBoxGreen}>
                    <Text style={styles.conditionalTitleGreen}>
                      <Ionicons name="logo-whatsapp" size={13} color="#16a34a" /> WhatsApp Details
                    </Text>
                    <View style={styles.formFieldGroup}>
                      <Text style={styles.formLabel}>Template Used</Text>
                      <TextInput
                        style={styles.formTextInput}
                        placeholder="Template name (e.g. payment_reminder)"
                        placeholderTextColor="#94a3b8"
                        value={formWhatsAppTemplate}
                        onChangeText={setFormWhatsAppTemplate}
                      />
                    </View>
                    <View style={styles.formFieldGroup}>
                      <Text style={styles.formLabel}>Message Status</Text>
                      <TouchableOpacity
                        style={styles.selectDropdownBtn}
                        onPress={() =>
                          setPickerModal({
                            visible: true,
                            title: 'Select WhatsApp Status',
                            options: ['Sent', 'Delivered', 'Read'],
                            selected: formWhatsAppStatus,
                            onSelect: (val) => setFormWhatsAppStatus(val),
                          })
                        }
                        activeOpacity={0.7}
                      >
                        <Text style={styles.selectDropdownBtnText}>{formWhatsAppStatus}</Text>
                        <Ionicons name="chevron-down" size={14} color="#888" />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Follow-up Outcome (Dropdown with '+' button matching Sales Follow-up) */}
                <View style={styles.formFieldGroup}>
                  <Text style={styles.formLabel}>Follow-up Outcome</Text>
                  <View style={styles.outcomeRowWithPlus}>
                    <TouchableOpacity
                      style={styles.outcomeSelectDropdown}
                      onPress={() =>
                        setPickerModal({
                          visible: true,
                          title: 'Select Outcome',
                          options: outcomesList,
                          selected: formOutcome,
                          onSelect: (val) => setFormOutcome(val),
                        })
                      }
                      activeOpacity={0.7}
                    >
                      <Text style={styles.selectDropdownBtnText}>{formOutcome || 'Select Outcome'}</Text>
                      <Ionicons name="chevron-down" size={14} color="#888" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.outcomePlusButton}
                      onPress={() => {
                        setNewOutcomeName('');
                        setAddOutcomeModalVisible(true);
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="add" size={20} color="#645695" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* SECTION 2: Payment Promise (Credit-Specific Section) */}
              <View style={styles.formSectionBox}>
                <Text style={styles.formSectionHeader}>Payment Promise</Text>

                <View style={styles.twoColRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formLabel}>Promise Date</Text>
                    <MobileDatePicker
                      label=""
                      value={formPromiseDate}
                      onChangeDate={setFormPromiseDate}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formLabel}>Promised Amount (₹)</Text>
                    <TextInput
                      style={styles.formTextInput}
                      placeholder="e.g. 25000"
                      placeholderTextColor="#94a3b8"
                      value={formPromisedAmount}
                      onChangeText={setFormPromisedAmount}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                {formPromiseDate ? (
                  <View style={styles.formFieldGroup}>
                    <Text style={styles.formLabel}>Payment Mode</Text>
                    <TouchableOpacity
                      style={styles.selectDropdownBtn}
                      onPress={() =>
                        setPickerModal({
                          visible: true,
                          title: 'Select Payment Mode',
                          options: paymentModesList,
                          selected: formPaymentMode,
                          onSelect: (val) => setFormPaymentMode(val),
                        })
                      }
                      activeOpacity={0.7}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                        <Ionicons name="card-outline" size={16} color="#645695" />
                        <Text style={styles.selectDropdownBtnText}>{formPaymentMode}</Text>
                      </View>
                      <Ionicons name="chevron-down" size={14} color="#888" />
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>

              {/* SECTION 3: Next Action */}
              <View style={styles.formSectionBox}>
                <Text style={styles.formSectionHeader}>Next Action</Text>

                <View style={styles.twoColRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formLabel}>Next Follow-up Date</Text>
                    <MobileDatePicker
                      label=""
                      value={formNextFollowUpDate}
                      onChangeDate={setFormNextFollowUpDate}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formLabel}>Next Time Slot</Text>
                    <TouchableOpacity
                      style={styles.selectDropdownBtn}
                      onPress={() =>
                        setPickerModal({
                          visible: true,
                          title: 'Select Time Slot',
                          options: TIME_SLOTS,
                          selected: formNextFollowUpTime,
                          onSelect: (val) => setFormNextFollowUpTime(val),
                        })
                      }
                      activeOpacity={0.7}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                        <Ionicons name="time-outline" size={16} color="#645695" />
                        <Text style={styles.selectDropdownBtnText}>
                          {formNextFollowUpTime || '10:00 AM'}
                        </Text>
                      </View>
                      <Ionicons name="chevron-down" size={14} color="#888" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.twoColRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formLabel}>Status</Text>
                    <TouchableOpacity
                      style={styles.selectDropdownBtn}
                      onPress={() =>
                        setPickerModal({
                          visible: true,
                          title: 'Select Status',
                          options: STATUSES,
                          selected: formStatus,
                          onSelect: (val) => setFormStatus(val),
                        })
                      }
                      activeOpacity={0.7}
                    >
                      <Text style={styles.selectDropdownBtnText}>{formStatus || 'Pending'}</Text>
                      <Ionicons name="chevron-down" size={14} color="#888" />
                    </TouchableOpacity>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formLabel}>Priority</Text>
                    <TouchableOpacity
                      style={styles.selectDropdownBtn}
                      onPress={() =>
                        setPickerModal({
                          visible: true,
                          title: 'Select Priority',
                          options: PRIORITIES,
                          selected: formPriority,
                          onSelect: (val) => setFormPriority(val),
                        })
                      }
                      activeOpacity={0.7}
                    >
                      <Text style={styles.selectDropdownBtnText}>{formPriority || 'Medium'}</Text>
                      <Ionicons name="chevron-down" size={14} color="#888" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Reminder Before */}
                <View style={styles.formFieldGroup}>
                  <Text style={styles.formLabel}>Reminder Before</Text>
                  <TouchableOpacity
                    style={styles.selectDropdownBtn}
                    onPress={() =>
                      setPickerModal({
                        visible: true,
                        title: 'Select Reminder Window',
                        options: REMINDER_WINDOWS,
                        selected: formReminderBefore,
                        onSelect: (val) => setFormReminderBefore(val),
                      })
                    }
                    activeOpacity={0.7}
                  >
                    <Text style={styles.selectDropdownBtnText}>
                      {formReminderBefore || '30 Minutes'}
                    </Text>
                    <Ionicons name="chevron-down" size={14} color="#888" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* SECTION 4: Remarks & Notes */}
              <View style={styles.formSectionBox}>
                <Text style={styles.formSectionHeader}>Remarks & Notes</Text>
                <View style={styles.formFieldGroup}>
                  <TextInput
                    style={styles.notesTextArea}
                    placeholder="Enter recovery conversation details, payment plan agreed, etc..."
                    placeholderTextColor="#94a3b8"
                    multiline
                    numberOfLines={3}
                    value={formNotes}
                    onChangeText={setFormNotes}
                  />
                </View>
              </View>

              <View style={{ height: 24 }} />
            </ScrollView>

            {/* Modal Footer (Cancel | Save & Next | Save Follow-up) */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.drawerBtnCancel}
                onPress={() => setDrawerOpen(false)}
                disabled={saving}
                activeOpacity={0.7}
              >
                <Text style={styles.drawerBtnCancelText}>Cancel</Text>
              </TouchableOpacity>

              {!editingFollowUpId && (
                <TouchableOpacity
                  style={[styles.drawerBtnSecondary, saving && { opacity: 0.6 }]}
                  onPress={() => handleSaveFollowUp(true)}
                  disabled={saving}
                  activeOpacity={0.7}
                >
                  <Text style={styles.drawerBtnSecondaryText}>Save & Next</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[
                  styles.drawerBtnPrimary,
                  saving && { opacity: 0.6 },
                ]}
                onPress={() => handleSaveFollowUp(false)}
                disabled={saving}
                activeOpacity={0.7}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.drawerBtnPrimaryText}>
                    {editingFollowUpId ? 'Update Follow-up' : 'Save Follow-up'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ==================== LEAD SELECTOR MODAL ==================== */}
      <LeadSelectorModal
        visible={leadSelectorVisible}
        onClose={() => setLeadSelectorVisible(false)}
        onSelectLead={(lead: LeadOption) => {
          setFormLeadId(lead.id || lead.leadID);
          setFormClientName(lead.name || lead.leadName || '');
          setFormClientPhone(lead.phone || lead.mobileNo || '');
          setFormClientCompany(lead.companyName || '');
          setLeadSelectorVisible(false);
        }}
        leads={allLeadsOptions}
        loading={loadingLeads}
      />

      {/* ==================== QUICK MESSAGE MODAL ==================== */}
      {/* <QuickMessageModal
        visible={msgModalVisible}
        onClose={() => setMsgModalVisible(false)}
        recipientName={msgRecipient.name}
        phoneNumber={msgRecipient.phone}
      /> */}

      {/* ==================== DROPDOWN PICKER MODAL ==================== */}
      <Modal visible={pickerModal.visible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.pickerModalOverlay}
          activeOpacity={1}
          onPress={() => setPickerModal((p) => ({ ...p, visible: false }))}
        >
          <View style={styles.pickerModalBox}>
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>{pickerModal.title}</Text>
              <TouchableOpacity onPress={() => setPickerModal((p) => ({ ...p, visible: false }))}>
                <Ionicons name="close" size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 300 }}>
              {pickerModal.options.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.pickerOptionItem,
                    pickerModal.selected === opt && styles.pickerOptionItemActive,
                  ]}
                  onPress={() => {
                    pickerModal.onSelect(opt);
                    setPickerModal((p) => ({ ...p, visible: false }));
                  }}
                >
                  <Text
                    style={[
                      styles.pickerOptionText,
                      pickerModal.selected === opt && styles.pickerOptionTextActive,
                    ]}
                  >
                    {opt}
                  </Text>
                  {pickerModal.selected === opt && (
                    <Ionicons name="checkmark" size={16} color="#645695" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ==================== ADD CUSTOM OUTCOME MODAL ==================== */}
      <Modal visible={addOutcomeModalVisible} transparent animationType="fade">
        <View style={styles.pickerModalOverlay}>
          <View style={styles.pickerModalBox}>
            <Text style={styles.pickerModalTitle}>Add Custom Outcome</Text>
            <View style={{ marginTop: 12 }}>
              <Input
                label="Outcome Name"
                value={newOutcomeName}
                onChangeText={setNewOutcomeName}
                placeholder="e.g. Sent Legal Notice"
              />
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
              <TouchableOpacity
                style={styles.drawerBtnCancel}
                onPress={() => {
                  setNewOutcomeName('');
                  setAddOutcomeModalVisible(false);
                }}
              >
                <Text style={styles.drawerBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.drawerBtnPrimary}
                onPress={() => {
                  if (newOutcomeName.trim()) {
                    setOutcomesList((prev) => [...prev, newOutcomeName.trim()]);
                    setFormOutcome(newOutcomeName.trim());
                    setNewOutcomeName('');
                    setAddOutcomeModalVisible(false);
                  }
                }}
              >
                <Text style={styles.drawerBtnPrimaryText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ==================== STYLES (MATCHES CLEAN SALES SCREEN & WEB CRM) ====================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  flexOne: {
    flex: 1,
  },
  scrollArea: {
    flex: 1,
  },
  headerAddFollowUpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#645695',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  headerAddFollowUpBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },

  // Pinned Top Segmented Bar
  topQueueSegmentedBar: {
    backgroundColor: '#ffffff',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  topQueueScrollContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  topQueueSegmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 6,
  },
  topQueueSegmentItemActive: {
    backgroundColor: '#645695',
    borderColor: '#645695',
    shadowColor: '#645695',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  topQueueSegmentText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#475569',
  },
  topQueueSegmentTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  topQueueCountBadge: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 10,
  },
  topQueueCountBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  topQueueCountText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#475569',
  },
  topQueueCountTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },

  // Web Card Container
  webCard: {
    margin: 12,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  // ==================== SEARCH & ACTION ROW (LEADS LIST SCREEN THEME) ====================
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
  listContentScroll: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  listContent: {
    padding: 16,
    paddingBottom: 90,
  },
  cardCircleActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginRight: 4,
  },
  callCircleBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  cardLogsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#f3e8ff',
  },
  cardLogsBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#645695',
  },
  financialAmountSummaryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginTop: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  financialAmountCol: {
    alignItems: 'center',
    flex: 1,
  },
  financialAmountLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 2,
  },
  financialAmountValueRegular: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e293b',
  },
  financialAmountValueSuccess: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16a34a',
  },
  financialAmountValueDanger: {
    fontSize: 12,
    fontWeight: '700',
    color: '#dc2626',
  },
  cardRemarksBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 8,
    marginTop: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#645695',
  },
  cardRemarksText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 16,
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

  // Backlog List & Cards
  backlogItemsList: {
    marginTop: 10,
    gap: 12,
  },
  backlogRowCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
  },
  rowCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  leadAvatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ede9fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leadAvatarInitials: {
    fontSize: 13,
    fontWeight: '700',
    color: '#645695',
  },
  rowCardTitles: {
    flex: 1,
  },
  rowLeadName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  rowCompanyName: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
  queueReasonPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    maxWidth: 140,
  },
  queueReasonPillText: {
    fontSize: 10,
    fontWeight: '700',
  },

  // Financial Amounts Row
  amountPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 8,
    marginTop: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  financialAmountBox: {
    flex: 1,
  },
  amountLabel: {
    fontSize: 9,
    color: '#64748b',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  amountValueRegular: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 1,
  },
  amountValueSuccess: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16a34a',
    marginTop: 1,
  },
  amountValueWarning: {
    fontSize: 12,
    fontWeight: '700',
    color: '#d97706',
    marginTop: 1,
  },
  amountValueDanger: {
    fontSize: 12,
    fontWeight: '800',
    color: '#dc2626',
    marginTop: 1,
  },

  // Metadata Row
  rowCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 8,
  },
  metaIconText: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaPhoneText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '500',
  },
  dueTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  dueTimeBadgeOverdue: {
    backgroundColor: '#fef3c7',
  },
  dueTimeBadgeScheduled: {
    backgroundColor: '#dcfce7',
  },
  dueTimeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  metaPromisePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  metaPromiseText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803d',
  },

  rowRemarksBox: {
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#645695',
  },
  rowRemarksText: {
    fontSize: 11,
    color: '#475569',
  },

  // Action Buttons
  rowActionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  webFollowUpActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#645695',
    gap: 5,
  },
  webFollowUpActionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#645695',
  },
  rowRightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconCircleBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#645695',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 3,
  },
  webAddBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },

  // Pagination
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  pageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f3f0fa',
    gap: 4,
  },
  pageBtnDisabled: {
    backgroundColor: '#f8fafc',
  },
  pageBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#645695',
  },
  pageBtnTextDisabled: {
    color: '#cbd5e1',
  },
  pageInfoText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },

  // ==================== CUSTOMER DETAIL VIEW STYLES ====================
  customerHeaderCard: {
    backgroundColor: '#ffffff',
    margin: 12,
    marginBottom: 8,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  customerHeaderTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backToBacklogBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f0fa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerHeaderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ede9fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerHeaderAvatarText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#645695',
  },
  customerHeaderTitles: {
    flex: 1,
  },
  customerHeaderName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  customerHeaderSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },

  // Financial Health Banner
  financialHealthBanner: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    marginHorizontal: 12,
    marginBottom: 10,
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#645695',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  healthMetricItem: {
    flex: 1,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#f1f5f9',
    paddingHorizontal: 4,
  },
  healthMetricLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.3,
  },
  healthMetricValRegular: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 3,
  },
  healthMetricValSuccess: {
    fontSize: 13,
    fontWeight: '700',
    color: '#16a34a',
    marginTop: 3,
  },
  healthMetricValWarning: {
    fontSize: 13,
    fontWeight: '700',
    color: '#d97706',
    marginTop: 3,
  },
  healthMetricValDanger: {
    fontSize: 13,
    fontWeight: '800',
    color: '#dc2626',
    marginTop: 3,
  },

  // Clean Tabs Wrapper
  cleanTabsWrapper: {
    marginHorizontal: 12,
    marginBottom: 8,
  },
  cleanTabsScroll: {
    gap: 6,
    paddingVertical: 2,
  },
  cleanTabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 6,
  },
  cleanTabPillActive: {
    backgroundColor: '#645695',
    borderColor: '#645695',
  },
  cleanTabPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  cleanTabPillTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  cleanTabBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  cleanTabBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  cleanTabBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  cleanTabBadgeTextActive: {
    color: '#ffffff',
  },

  // Action and Search Strip
  cleanFilterActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginBottom: 10,
    gap: 8,
  },
  detailSearchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 36,
  },
  detailSearchInput: {
    flex: 1,
    fontSize: 12,
    color: '#1e293b',
    paddingVertical: 0,
  },
  cleanAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#645695',
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 8,
    gap: 4,
  },
  cleanAddButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },

  // Document Cards
  tabItemsContainer: {
    marginHorizontal: 12,
    gap: 10,
  },
  docItemCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  docCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  docIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ede9fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  docCodeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  docDateSubText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  docAmountsGrid: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  docAmountCol: {
    flex: 1,
    alignItems: 'center',
  },
  docAmountLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: '#64748b',
  },
  docAmountValRegular: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 2,
  },
  docAmountValSuccess: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16a34a',
    marginTop: 2,
  },
  docAmountValWarning: {
    fontSize: 11,
    fontWeight: '700',
    color: '#d97706',
    marginTop: 2,
  },
  docAmountValDanger: {
    fontSize: 11,
    fontWeight: '800',
    color: '#dc2626',
    marginTop: 2,
  },
  docActionRow: {
    marginTop: 10,
    alignItems: 'flex-end',
  },
  docFollowUpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#645695',
    gap: 4,
  },
  docFollowUpBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#645695',
  },

  // Receipt Card
  receiptItemCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  receiptCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  receiptAmountText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#059669',
  },
  receiptRefText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
  },

  // ==================== CLEAN HISTORY CARDS (EXACT SALES CRM PARITY) ====================
  cleanHistoryList: {
    paddingHorizontal: 12,
    marginTop: 10,
    gap: 10,
  },
  cleanHistoryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cleanCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  cleanTypeIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
  },
  cleanCardHeaderTitle: {
    flex: 1,
  },
  cleanCardTypeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  cleanCardDateSub: {
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 2,
  },
  cleanOutcomeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  cleanOutcomeBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  cleanCardTopActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cleanStatusTogglePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
  },
  cleanStatusPillCompleted: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  cleanStatusPillPending: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  cleanStatusToggleText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  cleanMiniActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },

  // Promise Banner in Card (Credit Follow-up Specific)
  cleanPromiseBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginTop: 4,
    marginBottom: 8,
  },
  cleanPromiseLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cleanPromiseLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#15803d',
  },
  cleanPromiseVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#15803d',
  },
  cleanPromiseRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cleanPromiseDatePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#dcfce7',
    gap: 4,
  },
  cleanPromiseDateText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#15803d',
  },
  cleanPromiseModePill: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  cleanPromiseModeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#166534',
  },

  // Notes Box
  cleanNotesCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  cleanNotesCardText: {
    fontSize: 12.5,
    color: '#334155',
    lineHeight: 18,
  },

  // Meta Info Row
  cleanMetaInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  cleanMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cleanMetaItemText: {
    fontSize: 11.5,
    color: '#64748b',
    fontWeight: '500',
  },

  // Card Footer: Next Scheduled Follow-up & Priority
  cleanCardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 8,
    marginTop: 2,
  },
  cleanNextScheduleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#f5f3ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ede9fe',
  },
  cleanNextScheduleTagText: {
    fontSize: 11,
    color: '#645695',
  },
  cleanPriorityTag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  cleanPriorityTagText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  priorityHigh: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  priorityMedium: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  priorityLow: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },

  // ==================== DRAWER MODAL STYLES (EXACT SALES CRM PARITY) ====================
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: '92%',
    height: '92%',
    display: 'flex',
    flexDirection: 'column',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  sheetHandleBar: {
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: '#f8fafc',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#f8fafc',
  },
  modalHeaderTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  modalHeaderIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(100, 86, 149, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 15.5,
    fontWeight: '700',
    color: '#1e293b',
  },
  modalSubTitle: {
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modalBody: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 16,
  },
  formSectionBox: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  formSectionHeader: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 10,
    marginBottom: 14,
  },
  formFieldGroup: {
    marginBottom: 14,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  formTextInput: {
    height: 48,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    fontSize: 13.5,
    color: '#1e293b',
  },
  readOnlyInput: {
    height: 48,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  readOnlyInputText: {
    fontSize: 13.5,
    color: '#334155',
    fontWeight: '600',
  },
  webLeadInputBtn: {
    height: 48,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  webLeadInputText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  webLeadInputPlaceholder: {
    fontWeight: '400',
    color: '#94a3b8',
  },
  selectDropdownBtn: {
    height: 48,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  selectDropdownBtnText: {
    fontSize: 13.5,
    color: '#1e293b',
    fontWeight: '500',
    flex: 1,
  },
  outcomeRowWithPlus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  outcomeSelectDropdown: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  outcomePlusButton: {
    width: 48,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  conditionalBoxOrange: {
    backgroundColor: 'rgba(253, 126, 20, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(253, 126, 20, 0.25)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  conditionalTitleOrange: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#ea580c',
    marginBottom: 10,
  },
  conditionalBoxPurple: {
    backgroundColor: 'rgba(111, 66, 193, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(111, 66, 193, 0.25)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  conditionalTitlePurple: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#7c3aed',
    marginBottom: 10,
  },
  conditionalBoxGreen: {
    backgroundColor: 'rgba(25, 135, 84, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(25, 135, 84, 0.25)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  conditionalTitleGreen: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#16a34a',
    marginBottom: 10,
  },
  notesTextArea: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    backgroundColor: '#ffffff',
    padding: 12,
    fontSize: 13.5,
    color: '#1e293b',
    minHeight: 90,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#ffffff',
    gap: 10,
  },
  drawerBtnCancel: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerBtnCancelText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '600',
  },
  drawerBtnSecondary: {
    flex: 1.5,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#475569',
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerBtnSecondaryText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '700',
  },
  drawerBtnPrimary: {
    flex: 1.5,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#645695',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#645695',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  drawerBtnPrimaryText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '700',
  },

  // Picker Modal
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pickerModalBox: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    width: '100%',
    maxWidth: 320,
    padding: 16,
  },
  pickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    marginBottom: 6,
  },
  pickerModalTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  pickerOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  pickerOptionItemActive: {
    backgroundColor: '#f3f0fa',
  },
  pickerOptionText: {
    fontSize: 13,
    color: '#334155',
  },
  pickerOptionTextActive: {
    color: '#645695',
    fontWeight: '700',
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
  cardFooterActions: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 7,
  flex: 1,
},

whatsAppCircleBtn: {
  width: 32,
  height: 32,
  borderRadius: 16,
  backgroundColor: '#25D366',
  alignItems: 'center',
  justifyContent: 'center',
},
});

