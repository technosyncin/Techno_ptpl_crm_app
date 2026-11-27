import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Modal,
  ScrollView,
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
import { Badge } from '../../components/common/Badge';
import { CommonListCard } from '../../components/cards/CommonListCard';
import { Pagination } from '../../components/common/Pagination';
import { EmptyState } from '../../components/common/EmptyState';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { MobileDatePicker } from '../../components/common/MobileDatePicker';
import { QuickMessageModal } from '../../components/modals/QuickMessageModal';
import { LeadSelectorModal, LeadOption } from '../../components/modals/LeadSelectorModal';
import { salesService, SalesFollowUp } from '../../api/salesService';
import { mastersService, LeadSourceMaster } from '../../api/mastersService';
import { leadService } from '../../api/leadService';
import { messagingService } from '../../api/messagingService';
import { useCompany } from '../../context/CompanyContext';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../theme/colors';
import { useNavigation } from '@react-navigation/native';
import { Linking, Alert } from 'react-native';
// ==================== CONSTANTS (EXACT WEB PARITY) ====================
const FOLLOWUP_TYPES = ['Call', 'WhatsApp', 'Visit', 'Email', 'Meeting'];
const OUTCOMES = [
  'Connected',
  'Busy',
  'Not Answering',
  'Callback Requested',
  'Interested',
  'Meeting Fixed',
  'Not Interested',
  'Closed Won',
  'Closed Lost',
];
const PRIORITIES = ['High', 'Medium', 'Low'];
const REMINDER_WINDOWS = ['15 Minutes', '30 Minutes', '1 Hour', 'Same Day', '1 Day Before'];
const STATUSES = ['Pending', 'Completed'];
const TIME_SLOTS = [
  '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM',
  '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM',
  '06:00 PM', '06:30 PM', '07:00 PM'
];

import { useMenu } from '../../context/MenuContext';

export const SalesFollowUpScreen: React.FC<any> = ({ navigation, route }) => {
  const { selectedCompanyId, selectedCompany, companies, isAllCompanies } = useCompany();
  const { user } = useAuth();
  const { canAccessSales } = useMenu();

  const userRole = (user?.role || '').toLowerCase();
  const isAdmin = userRole.includes('admin') || userRole.includes('super');
  const userId = Number(user?.id || user?.userID);

  const hasNoCompany = !isAdmin && companies.length === 0 && !isAllCompanies;
  const isSalesBlocked = !isAdmin && !canAccessSales;

  // ==================== STATE (EXACT WEB PARITY) ====================
  const [backlogList, setBacklogList] = useState<SalesFollowUp[]>([]);
  const [loadingBacklog, setLoadingBacklog] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<SalesFollowUp | null>(null);
  const [sourceNames, setSourceNames] = useState<Record<string, string>>({});
  const [customerHistory, setCustomerHistory] = useState<SalesFollowUp[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [activeTab, setActiveTab] = useState('All'); // 'All' | 'Call' | 'WhatsApp' | 'Visit' | 'Email' | 'Meeting'

  // ==================== FILTER & SORT STATE (EXACT WEB PARITY) ====================
  const [queueFilter, setQueueFilter] = useState<'Today' | 'Scheduled' | 'All'>('Today');
  const [backlogSearch, setBacklogSearch] = useState('');
  const [backlogDateFilterMode, setBacklogDateFilterMode] = useState<string>('All'); // 'Due' | 'Today' | 'Upcoming' | 'All'
  const [backlogSortOrder, setBacklogSortOrder] = useState<'desc' | 'asc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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
  const [allLeadsOptions, setAllLeadsOptions] = useState<LeadOption[]>([]);
  const [leadSelectorVisible, setLeadSelectorVisible] = useState(false);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [formType, setFormType] = useState('Call');
  const [formPerformedBy, setFormPerformedBy] = useState('');
  const [formOutcome, setFormOutcome] = useState('Connected');
  const [formPriority, setFormPriority] = useState('Medium');
  const [formReminderBefore, setFormReminderBefore] = useState('30 Minutes');
  const [formFollowUpDate, setFormFollowUpDate] = useState(new Date().toISOString().split('T')[0]);
  const [formFollowUpTime, setFormFollowUpTime] = useState('10:00 AM');
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
  const [outcomesList, setOutcomesList] = useState<string[]>(OUTCOMES);
  const [addOutcomeModalVisible, setAddOutcomeModalVisible] = useState(false);
  const [newOutcomeName, setNewOutcomeName] = useState('');
 
  // Dropdown options modal for time slot / date mode picker
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

  // User name
  useEffect(() => {
    if (user?.fullName || user?.username) {
      setFormPerformedBy(user.fullName || user.username);
    }
  }, [user]);

  // Load Lead Sources (Web Parity)
  const fetchLeadSources = useCallback(async () => {
    try {
      const sources: LeadSourceMaster[] = await mastersService.getLeadSources();
      const map: Record<string, string> = {};
      sources.forEach((s) => {
        if (s.leadSourceID && s.leadSourceName) {
          map[String(s.leadSourceID)] = s.leadSourceName;
        }
      });
      setSourceNames(map);
    } catch (e) {
      console.warn('Error fetching lead sources:', e);
    }
  }, []);

  useEffect(() => {
    fetchLeadSources();
  }, [fetchLeadSources]);

    const openWhatsApp = async (phone: string) => {
        const cleanedPhone = phone.replace(/\D/g, '');

        if (!cleanedPhone) {
            Alert.alert('Error', 'Mobile number not available');
            return;
        }

        const whatsappNumber = cleanedPhone.length === 10
            ? `91${cleanedPhone}`
            : cleanedPhone;

        const url = `https://wa.me/${whatsappNumber}`;

        try {
            await Linking.openURL(url);
        } catch {
            Alert.alert('Error', 'Unable to open WhatsApp');
        }
    };

  // ==================== FETCH BACKLOG API (EXACT WEB PARITY) ====================
  const fetchBacklog = useCallback(async () => {
    if (hasNoCompany || isSalesBlocked) {
      setBacklogList([]);
      setAllLeadsOptions([]);
      setLoadingBacklog(false);
      setRefreshing(false);
      return;
    }
    setLoadingBacklog(true);
    try {
      const compId = selectedCompanyId && selectedCompanyId > 0 ? selectedCompanyId : undefined;

      // 1. Fetch Dynamic CRM Leads list for lead selection & binding
      setLoadingLeads(true);
      let leadsArr: any[] = [];
      try {
        const leadsRes = await leadService.getLeads({companyId: selectedCompanyId ?? 0,pageSize: 50});
        let rawLeads = leadsRes?.data || [];
        if (!isAdmin && userId) {
          rawLeads = rawLeads.filter((l: any) => {
            const assigned = Number(l.assignedTo || l.assignedToId || l.assignedToID);
            const created = Number(l.createdBy || l.createdById || l.createdByUserID);
            return assigned === userId || created === userId;
          });
        }
        leadsArr = rawLeads;
        const mappedOptions: LeadOption[] = leadsArr.map((l: any) => ({
          id: l.leadID,
          leadID: l.leadID,
          name: l.leadName || 'Lead',
          leadName: l.leadName,
          customerName: l.leadName,
          companyName: l.companyName || '',
          phone: l.mobileNo || l.phone || '',
          mobileNo: l.mobileNo || l.phone || '',
          city: l.city || '',
          email: l.email || '',
          status: l.leadStatus || (typeof l.status === 'string' ? l.status : 'Active'),
          companyID: l.companyID,
        }));
        setAllLeadsOptions(mappedOptions);
      } catch (le) {
        console.warn('Error fetching leads for follow-up options:', le);
      } finally {
        setLoadingLeads(false);
      }

      // 2. Fetch Active Sales Follow-Up Queue
      const data = await salesService.getSalesFollowUps(compId, !isAdmin && userId ? userId : undefined, isAdmin);
      let mapped = data.map((item) => {
        const leadStr = (item.leadName || '').trim().toLowerCase();
        const compStr = (item.companyName || '').trim().toLowerCase();
        const cleanComp = compStr && compStr !== leadStr ? item.companyName : item.companyName || '';
        const sId = item.leadSourceID;
        const sName = (sId != null && sourceNames[String(sId)]) 
          ? sourceNames[String(sId)] 
          : (item.leadSourceName || item.source || '-');

        return {
          ...item,
          companyName: cleanComp,
          leadSourceID: sId || null,
          leadSourceName: sName,
          source: sName,
        };
      });

      // Strict user filter matching web CRM logic: non-admins only see leads assigned to them or created by them
      if (!isAdmin && userId) {
        mapped = mapped.filter((item: any) => {
          const assigned = Number(item.assignedTo || item.assignedToId || item.assignedToID);
          const created = Number(item.createdBy || item.createdById || item.createdByUserID);
          return assigned === userId || created === userId;
        });
      }

      // Set actual backend follow-ups directly (no artificial lead synthesis)
      setBacklogList(mapped);
    } catch (error) {
      console.error('Error fetching backlog:', error);
      setBacklogList([]);
    } finally {
      setLoadingBacklog(false);
      setRefreshing(false);
    }
  }, [selectedCompanyId, sourceNames, hasNoCompany, isSalesBlocked, isAdmin, userId]);

  useEffect(() => {
    fetchBacklog();
  }, [fetchBacklog]);

  useFocusEffect(
    useCallback(() => {
      fetchBacklog();

      return () => {
        // When switching tabs or leaving this screen, reset customer detail so returning shows fresh backlog
        setSelectedCustomer(null);
        setCustomerHistory([]);
      };
    }, [fetchBacklog])
  );

  // Tab press & navigation blur listeners for instant reset and refresh
  useEffect(() => {
    const unsubscribeTabPress = navigation?.addListener?.('tabPress', () => {
      setSelectedCustomer(null);
      setCustomerHistory([]);
      fetchBacklog();
    });

    const unsubscribeBlur = navigation?.addListener?.('blur', () => {
      setSelectedCustomer(null);
      setCustomerHistory([]);
    });

    return () => {
      if (unsubscribeTabPress) unsubscribeTabPress();
      if (unsubscribeBlur) unsubscribeBlur();
    };
  }, [navigation, fetchBacklog]);

  const onRefresh = () => {
    setRefreshing(true);
    if (selectedCustomer?.leadID) {
      fetchHistory(selectedCustomer.leadID);
    }
    fetchBacklog();
  };

  // Sync selectedCustomer source name whenever master lead sources load (Exact Web CRM Parity)
  useEffect(() => {
    if (selectedCustomer) {
      const sourceId = selectedCustomer.leadSourceID;
      if (sourceId != null && sourceNames[String(sourceId)]) {
        const mappedName = sourceNames[String(sourceId)];
        if (selectedCustomer.source !== mappedName) {
          setSelectedCustomer((prev) => (prev ? { ...prev, source: mappedName, leadSourceName: mappedName } : null));
        }
      }
    }
  }, [sourceNames, selectedCustomer]);

  // ==================== FETCH CUSTOMER HISTORY API (EXACT WEB PARITY) ====================
  const fetchHistory = useCallback(async (leadId: number) => {
    setLoadingHistory(true);
    try {
      const history = await salesService.getCustomerFollowUps(leadId);
      setCustomerHistory(history);
    } catch (error) {
      console.error('Error loading follow-up history:', error);
      setCustomerHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  const handleSelectCustomer = async (customer: SalesFollowUp) => {
    let sourceId = customer.leadSourceID ?? null;
    let sourceName = (customer.source && customer.source !== '-') 
      ? customer.source 
      : (sourceId != null ? (sourceNames[String(sourceId)] || null) : null);

    const targetLeadId = Number(customer.leadID || (customer as any).LeadID || (customer as any).leadId || (customer as any).id || 0);

    if (!sourceName || sourceName === '-' || sourceId === null) {
      try {
        if (targetLeadId > 0) {
          const leadDetail = await leadService.getLeadById(targetLeadId, customer.companyID ?? selectedCompanyId ?? undefined);
          if (leadDetail) {
            const fetchedData: any = leadDetail;
            sourceId = fetchedData.leadSourceID ?? fetchedData.LeadSourceID ?? sourceId;
            if (sourceId != null && sourceNames[String(sourceId)]) {
              sourceName = sourceNames[String(sourceId)];
            } else if (fetchedData.leadSourceName) {
              sourceName = fetchedData.leadSourceName;
            }
          }
        }
      } catch (err) {
        console.warn('Error fetching lead details for source name:', err);
      }
    }

    const updatedCustomer: SalesFollowUp = {
      ...customer,
      leadID: targetLeadId > 0 ? targetLeadId : customer.leadID,
      leadSourceID: sourceId,
      leadSourceName: sourceName || 'Direct',
      source: sourceName || 'Direct',
    };

    setSelectedCustomer(updatedCustomer);
    setActiveTab('All');
    setHistoryDateFilterMode('All');
    if (targetLeadId > 0) {
      fetchHistory(targetLeadId);
    }
  };

  const handleBackToBacklog = () => {
    setSelectedCustomer(null);
    setCustomerHistory([]);
  };

  // Hardware back button handling
  useEffect(() => {
    const handleBack = () => {
      if (selectedCustomer) {
        handleBackToBacklog();
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', handleBack);
    return () => subscription.remove();
  }, [selectedCustomer]);

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

  // Helper methods to classify follow-up item as Scheduled or Today/Due
  const isItemScheduled = useCallback((item: SalesFollowUp) => {
    const nextDate = getDateOnlyStr(item.nextFollowUpDate);
    const fuDate = getDateOnlyStr(item.followUpDate);
    const effDate = nextDate || fuDate;
    if (effDate && effDate > todayStr) return true;
    if (nextDate && nextDate >= todayStr) return true;
    if ((item.status || '').toLowerCase() === 'scheduled') return true;
    return false;
  }, [todayStr]);

  const isItemTodayOrDue = useCallback((item: SalesFollowUp) => {
    const nextDate = getDateOnlyStr(item.nextFollowUpDate);
    const fuDate = getDateOnlyStr(item.followUpDate);
    const effDate = nextDate || fuDate;
    return !!effDate && effDate <= todayStr;
  }, [todayStr]);

  // Primary Queue Counts (Exact Web CRM Parity)
  const todayCount = useMemo(() => {
    return backlogList.filter(isItemTodayOrDue).length;
  }, [backlogList, isItemTodayOrDue]);

  const scheduledCount = useMemo(() => {
    return backlogList.filter(isItemScheduled).length;
  }, [backlogList, isItemScheduled]);

  const allCount = backlogList.length;

  // ==================== FILTERING & SORTING LOGIC (EXACT WEB PARITY) ====================
  const processedBacklogList = useMemo(() => {
    return backlogList
      .filter((item) => {
        // 1. Primary Queue Tab Filter
        if (queueFilter === 'Today') {
          if (!isItemTodayOrDue(item)) return false;
        } else if (queueFilter === 'Scheduled') {
          if (!isItemScheduled(item)) return false;
        }

        // 2. Secondary Date Filter Mode (Due / Today / Upcoming / All)
        const itemDateStr = getDateOnlyStr(item.nextFollowUpDate || item.followUpDate);
        if (queueFilter === 'All') {
          if (backlogDateFilterMode === 'Due') {
            if (itemDateStr && itemDateStr > todayStr) return false;
          } else if (backlogDateFilterMode === 'Today') {
            if (itemDateStr !== todayStr) return false;
          } else if (backlogDateFilterMode === 'Upcoming') {
            if (!itemDateStr || itemDateStr <= todayStr) return false;
          }
        } else if (queueFilter === 'Today') {
          if (backlogDateFilterMode === 'Today') {
            if (itemDateStr !== todayStr) return false;
          }
        }

        // 3. Search Filter
        if (backlogSearch.trim()) {
          const q = backlogSearch.toLowerCase().trim();
          const matchCustomer = (item.customerName || item.leadName || '').toLowerCase().includes(q);
          const matchCompany = (item.companyName || '').toLowerCase().includes(q);
          const matchPhone = (item.phone || item.mobileNo || '').includes(q);
          const matchCity = (item.city || '').toLowerCase().includes(q);
          const matchNotes = (item.remarks || '').toLowerCase().includes(q);
          if (!matchCustomer && !matchCompany && !matchPhone && !matchCity && !matchNotes) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        const dateA = a.nextFollowUpDate || a.followUpDate || '';
        const dateB = b.nextFollowUpDate || b.followUpDate || '';
        if (queueFilter === 'Scheduled') {
          return backlogSortOrder === 'desc' ? dateA.localeCompare(dateB) : dateB.localeCompare(dateA);
        }
        return backlogSortOrder === 'desc' ? dateB.localeCompare(dateA) : dateA.localeCompare(dateB);
      });
  }, [backlogList, queueFilter, backlogDateFilterMode, backlogSearch, backlogSortOrder, todayStr, isItemScheduled, isItemTodayOrDue]);

  // Pagination for Backlog
  const backlogTotalItems = processedBacklogList.length;
  const backlogTotalPages = Math.max(1, Math.ceil(backlogTotalItems / pageSize));
  const paginatedBacklogList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return processedBacklogList.slice(start, start + pageSize);
  }, [processedBacklogList, currentPage, pageSize]);

  // Filter Customer History (Exact Web Parity)
  const filteredHistory = useMemo(() => {
    return customerHistory
      .filter((item) => {
        const itemType = (item.followUpType || '').toLowerCase();
        // Tab Filter
        if (activeTab !== 'All' && !itemType.includes(activeTab.toLowerCase())) {
          return false;
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
        const timeA = new Date(a.followUpDate || a.nextFollowUpDate || 0).getTime();
        const timeB = new Date(b.followUpDate || b.nextFollowUpDate || 0).getTime();
        return historySortOrder === 'asc' ? timeA - timeB : timeB - timeA;
      });
  }, [customerHistory, activeTab, historyDateFilterMode, historySortOrder, todayStr]);

  // ==================== DRAWER MODAL CONTROLS ====================
  const openAddDrawer = (target?: SalesFollowUp) => {
    const cust = target || selectedCustomer;
    setEditingFollowUpId(null);
    if (cust) {
      setFormLeadId(cust.leadID);
      setFormClientName(cust.customerName || cust.leadName || '');
      setFormClientPhone(cust.mobileNo || cust.phone || '');
      setFormClientCompany(cust.companyName || '');
    } else {
      setFormLeadId(undefined);
      setFormClientName('');
      setFormClientPhone('');
      setFormClientCompany('');
    }
    setFormType('Call');
    setFormPerformedBy(user?.fullName || user?.username || 'Admin');
    setFormOutcome(outcomesList[0] || 'Connected');
    setFormPriority('Medium');
    setFormReminderBefore('30 Minutes');
    setFormFollowUpDate(new Date().toISOString().split('T')[0]);
    setFormFollowUpTime('10:00 AM');
    setFormNextFollowUpDate('');
    setFormNextFollowUpTime('10:00 AM');
    setFormStatus('Pending');
    setFormNotes('');
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

  const openEditDrawer = (item: SalesFollowUp) => {
    setEditingFollowUpId(item.followUpID);
    setFormLeadId(item.leadID);
    setFormClientName(item.customerName || item.leadName || '');
    setFormClientPhone(item.mobileNo || item.phone || '');
    setFormClientCompany(item.companyName || '');
    setFormType(item.followUpType || 'Call');
    setFormPerformedBy(item.performedBy || item.assignedToName || user?.fullName || 'Admin');
    setFormOutcome(item.outcome || 'Connected');
    setFormPriority(item.priority || 'Medium');
    setFormReminderBefore(item.reminderBefore || '30 Minutes');
    setFormFollowUpDate(getDateOnlyStr(item.followUpDate) || new Date().toISOString().split('T')[0]);
    setFormFollowUpTime(item.followUpTime || '10:00 AM');
    setFormNextFollowUpDate(getDateOnlyStr(item.nextFollowUpDate) || '');
    setFormNextFollowUpTime(item.nextFollowUpTime || '10:00 AM');
    setFormStatus(item.status || 'Pending');
    setFormNotes(item.remarks || '');
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
      const payload: any = {
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
        nextFollowUpDate: formNextFollowUpDate || null,
        nextFollowUpTime: formNextFollowUpDate ? formNextFollowUpTime : null,
        remarks: formNotes.trim() || undefined,
        notes: formNotes.trim() || undefined,
        status: formOutcome === 'Closed Won' || formOutcome === 'Closed Lost' ? 'Completed' : formStatus,
        checkInTime: formType === 'Visit' ? formCheckInTime : null,
        checkOutTime: formType === 'Visit' ? formCheckOutTime : null,
        visitLocation: formType === 'Visit' ? formVisitLocation : null,
        gpsCoordinates: formType === 'Visit' ? formGpsCoordinates : null,
        emailSubject: formType === 'Email' ? formEmailSubject : null,
        emailStatus: formType === 'Email' ? formEmailStatus : null,
        whatsAppTemplate: formType === 'WhatsApp' ? formWhatsAppTemplate : null,
        whatsAppStatus: formType === 'WhatsApp' ? formWhatsAppStatus : null,
      };

      if (editingFollowUpId) {
        await salesService.updateSalesFollowUp(editingFollowUpId, payload);
        Alert.alert('Success', 'Follow-up updated successfully!');
      } else {
        await salesService.createSalesFollowUp(payload);
        Alert.alert(
          'Success',
          scheduleNext
            ? 'Follow-up saved & next follow-up scheduled!'
            : 'Follow-up logged successfully!'
        );
      }

      setDrawerOpen(false);
      if (selectedCustomer?.leadID) {
        fetchHistory(selectedCustomer.leadID);
      }
      fetchBacklog();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to save follow-up');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFollowUp = (id: number) => {
    Alert.alert('Delete Follow-Up', 'Are you sure you want to delete this follow-up record?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await salesService.deleteSalesFollowUp(id);
            if (selectedCustomer?.leadID) {
              fetchHistory(selectedCustomer.leadID);
            }
            fetchBacklog();
          } catch (err) {
            Alert.alert('Error', 'Could not delete follow-up');
          }
        },
      },
    ]);
  };

  const handleUpdateLeadHeaderStatus = async (newStatus: string) => {
    if (!selectedCustomer?.leadID) return;
    try {
      await Promise.allSettled([
        leadService.updateLead(selectedCustomer.leadID, { status: newStatus }),
        salesService.updateLeadFollowUpStatus(selectedCustomer.leadID, newStatus),
      ]);
      setSelectedCustomer((prev) => (prev ? { ...prev, status: newStatus } : prev));
      fetchBacklog();
      Alert.alert('Status Updated', `Lead status updated to ${newStatus}`);
    } catch {
      Alert.alert('Error', 'Failed to update lead status');
    }
  };

  const handleUpdateFollowUpStatus = async (id: number, status: string) => {
    try {
      await salesService.updateFollowUpStatus(id, status);
      if (selectedCustomer?.leadID) {
        fetchHistory(selectedCustomer.leadID);
      }
      fetchBacklog();
      Alert.alert('Success', `Status updated to ${status}`);
    } catch {
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const openQuickMessage = (fu: SalesFollowUp) => {
    const phone = fu.mobileNo || fu.phone || '';
    const name = fu.customerName || fu.leadName || 'Client';
    setMsgRecipient({ name, phone });
    setMsgModalVisible(true);
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
            placeholder="Search leads, company, phone, remarks..."
          />
        </View>

         <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('AddLead')}
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
            refreshing={loadingBacklog}
            onRefresh={fetchBacklog}
            colors={[Colors.primary]}
          />
        }
      >
        {loadingBacklog && paginatedBacklogList.length === 0 ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading follow-up directory...</Text>
          </View>
        ) : paginatedBacklogList.length === 0 ? (
          <EmptyState
            title={queueFilter === 'Today' ? 'No Follow-Ups Due Today' : 'No Follow-Ups Found'}
            description="No follow-up leads match your search query."
            actionTitle="Schedule New Follow-Up"
            onAction={() => openAddDrawer()}
          />
        ) : (
          paginatedBacklogList.map((item, idx) => {
          const phone = item.mobileNo || item.phone || '';   
            const name = item.customerName || item.leadName || 'Unknown Lead';
            const isDue = getDateOnlyStr(item.nextFollowUpDate || item.followUpDate) <= todayStr;
            const initials = name.substring(0, 2).toUpperCase();

            return (
              <CommonListCard
                key={`sales-card-${item.followUpID || item.leadID || ''}-${idx}`}
                title={name}
                subtitle={item.companyName || undefined}
                avatarText={initials}
                avatarBgColor="#EDE9FE"
                avatarColor={Colors.primary}
                badgeLabel={item.outcome || item.status || 'Open'}
                badgeVariant={item.status === 'Completed' ? 'success' : 'primary'}
                pills={[
                  item.city
                    ? {
                        icon: 'location-outline',
                        text: item.city,
                        iconColor: '#64748b',
                      }
                    : null,
                  item.source && item.source !== '-'
                    ? {
                        icon: 'funnel-outline',
                        text: `Source: ${item.source}`,
                        iconColor: '#0284c7',
                      }
                    : null,
                ]}
                metaLeft={{
                  label: 'Mobile No',
                  value: phone || 'N/A',
                  valueColor: '#0f172a',
                }}
                metaRight={{
                  label: 'Next Follow-up',
                  badgeText: formatDateTimeDisplay(
                    item.nextFollowUpDate || item.followUpDate,
                    item.nextFollowUpTime || item.followUpTime
                  ),
                  badgeIcon: 'calendar-outline',
                  badgeColor: isDue ? '#b45309' : '#15803d',
                  badgeBgColor: isDue ? '#fef3c7' : '#f0fdf4',
                }}
                footerLeftComponent={
                  <TouchableOpacity
                    style={styles.cardLogsBtn}
                    onPress={() => handleSelectCustomer(item)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="journal-outline" size={13} color="#645695" />
                    <Text style={styles.cardLogsBtnText}>Follow-up Logs</Text>
                  </TouchableOpacity>
                }
                editLabel="Add Follow-up"
                onEdit={() => openAddDrawer(item)}
                onPress={() => handleSelectCustomer(item)}
                onWhatsApp={() => openWhatsApp(phone)}
              >
                {item.remarks ? (
                  <View style={styles.cardRemarksBox}>
                    {item.outcome ? (
                      <Text style={styles.cardRemarksOutcome}>[{item.outcome}] </Text>
                    ) : null}
                    <Text style={styles.cardRemarksText} numberOfLines={2}>
                      {item.remarks}
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
  // RENDER: DETAIL VIEW (CUSTOMER HISTORY - CLEAN & MODERN)
  // ==========================================
  const getFollowUpTypeTheme = (type?: string) => {
    const t = (type || '').toLowerCase();
    if (t.includes('wa') || t.includes('whats')) {
      return { icon: 'logo-whatsapp' as const, bg: '#dcfce7', color: '#16a34a', border: '#bbf7d0', label: 'WhatsApp' };
    }
    if (t.includes('visit')) {
      return { icon: 'business' as const, bg: '#ffedd5', color: '#ea580c', border: '#fed7aa', label: 'Visit' };
    }
    if (t.includes('email') || t.includes('mail')) {
      return { icon: 'mail' as const, bg: '#e0f2fe', color: '#0284c7', border: '#bae6fd', label: 'Email' };
    }
    if (t.includes('meet')) {
      return { icon: 'people' as const, bg: '#ccfbf1', color: '#0d9488', border: '#99f6e4', label: 'Meeting' };
    }
    return { icon: 'call' as const, bg: '#f3e8ff', color: '#645695', border: '#e9d5ff', label: 'Call' };
  };

  const getOutcomeTheme = (outcome?: string) => {
    const o = (outcome || '').toLowerCase();
    if (o.includes('won') || o.includes('connected') || o.includes('interest') || o.includes('fixed')) {
      return { bg: '#ecfdf5', color: '#059669', border: '#a7f3d0' };
    }
    if (o.includes('busy') || o.includes('not answer') || o.includes('callback') || o.includes('pending')) {
      return { bg: '#fffbeb', color: '#d97706', border: '#fde68a' };
    }
    if (o.includes('lost') || o.includes('not interest') || o.includes('reject')) {
      return { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' };
    }
    return { bg: '#f8fafc', color: '#475569', border: '#e2e8f0' };
  };

  const renderCustomerDetailView = () => {
    if (!selectedCustomer) return null;
    const phone = selectedCustomer.mobileNo || selectedCustomer.phone;
    const name = selectedCustomer.customerName || selectedCustomer.leadName || 'Customer';
    const sourceName = selectedCustomer.source || selectedCustomer.leadSourceName || (selectedCustomer.leadSourceID != null ? sourceNames[String(selectedCustomer.leadSourceID)] : null) || 'Direct';

    return (
      <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
        {/* Customer Header Card */}
        <View style={styles.customerHeaderCard}>
          <View style={styles.customerHeaderTopRow}>
            <View style={styles.customerHeaderAvatar}>
              <Text style={styles.customerHeaderAvatarText}>{name.substring(0, 2).toUpperCase()}</Text>
            </View>

            <View style={styles.customerHeaderTitles}>
              <Text style={styles.customerHeaderName} numberOfLines={1}>
                {name}
              </Text>
              <Text style={styles.customerHeaderSub} numberOfLines={1}>
                {selectedCustomer.companyName ? `${selectedCustomer.companyName} • ` : ''}{phone || 'No phone'}
              </Text>
            </View>
          </View>

          {/* Quick Lead Status & Source Strip */}
          <View style={styles.customerHeaderDetailsRow}>
            <View style={styles.statusSelectBox}>
              <Text style={styles.statusLabelSmall}>LEAD STATUS</Text>
              <View style={styles.statusChipsRow}>
                {(['Open', 'Closed', 'Completed'] as const).map((st) => (
                  <TouchableOpacity
                    key={st}
                    style={[
                      styles.statusPill,
                      selectedCustomer.status?.toLowerCase() === st.toLowerCase() && styles.statusPillActive,
                    ]}
                    onPress={() => handleUpdateLeadHeaderStatus(st)}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        selectedCustomer.status?.toLowerCase() === st.toLowerCase() && styles.statusPillTextActive,
                      ]}
                    >
                      {st}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.sourceBox}>
              <Text style={styles.statusLabelSmall}>LEAD SOURCE</Text>
              <View style={styles.leadSourcePill}>
                <Ionicons name="funnel-outline" size={11} color="#0d6efd" style={{ marginRight: 4 }} />
                <Text style={styles.sourceTextVal}>{sourceName}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Clean History Tabs Bar */}
        <View style={styles.cleanTabsWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cleanTabsScroll}>
            {['All', 'Call', 'WhatsApp', 'Visit', 'Email', 'Meeting'].map((tab) => {
              const isActive = activeTab === tab;
              const count = tab === 'All'
                ? customerHistory.length
                : customerHistory.filter(c => (c.followUpType || '').toLowerCase().includes(tab.toLowerCase())).length;

              return (
                <TouchableOpacity
                  key={tab}
                  style={[styles.cleanTabPill, isActive && styles.cleanTabPillActive]}
                  onPress={() => setActiveTab(tab)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.cleanTabPillText, isActive && styles.cleanTabPillTextActive]}>
                    {tab}
                  </Text>
                  {count > 0 && (
                    <View style={[styles.cleanTabBadge, isActive && styles.cleanTabBadgeActive]}>
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

        {/* Clean Action & Date Filter Row */}
        <View style={styles.cleanFilterActionRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cleanDateFiltersGroup}>
            {(['All', 'Today', 'Last7Days', 'Last30Days'] as const).map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.cleanDateChip, historyDateFilterMode === m && styles.cleanDateChipActive]}
                onPress={() => setHistoryDateFilterMode(m)}
                activeOpacity={0.7}
              >
                <Text style={[styles.cleanDateChipText, historyDateFilterMode === m && styles.cleanDateChipTextActive]}>
                  {m === 'All' ? 'All Time' : m === 'Last7Days' ? '7 Days' : m === 'Last30Days' ? '30 Days' : 'Today'}
                </Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.cleanSortIconButton}
              onPress={() => setHistorySortOrder((p) => (p === 'desc' ? 'asc' : 'desc'))}
              activeOpacity={0.7}
            >
              <Ionicons
                name={historySortOrder === 'desc' ? 'arrow-down' : 'arrow-up'}
                size={13}
                color="#645695"
              />
            </TouchableOpacity>
          </ScrollView>

          <TouchableOpacity
            style={styles.cleanAddButton}
            onPress={() => openAddDrawer(selectedCustomer)}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={15} color="#ffffff" />
            <Text style={styles.cleanAddButtonText}>Add Log</Text>
          </TouchableOpacity>
        </View>

        {/* Clean History Log Cards List */}
        {loadingHistory ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator size="small" color="#645695" />
            <Text style={{ marginTop: 8, color: '#666', fontSize: 12 }}>Loading Customer History...</Text>
          </View>
        ) : filteredHistory.length === 0 ? (
          <View style={{ marginHorizontal: 12 }}>
            <EmptyState
              title="No Follow-Up Logs"
              description="No follow-up communication has been recorded under this filter."
              actionTitle="Add Follow-up"
              onAction={() => openAddDrawer(selectedCustomer)}
            />
          </View>
        ) : (
          <View style={styles.cleanHistoryList}>
            {filteredHistory.map((item, idx) => {
              const typeTheme = getFollowUpTypeTheme(item.followUpType);
              const outcomeTheme = getOutcomeTheme(item.outcome);
              const isCompleted = (item.status || '').toLowerCase() === 'completed';

              return (
                <View key={`hist-${item.followUpID || ''}-${idx}`} style={styles.cleanHistoryCard}>
                  {/* Card Header Row */}
                  <View style={styles.cleanCardHeader}>
                    <View style={[styles.cleanTypeIconCircle, { backgroundColor: typeTheme.bg, borderColor: typeTheme.border }]}>
                      <Ionicons name={typeTheme.icon} size={16} color={typeTheme.color} />
                    </View>

                    <View style={styles.cleanCardHeaderTitle}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text style={styles.cleanCardTypeTitle}>{item.followUpType || 'Call'}</Text>
                        {item.outcome ? (
                          <View style={[styles.cleanOutcomeBadge, { backgroundColor: outcomeTheme.bg, borderColor: outcomeTheme.border }]}>
                            <Text style={[styles.cleanOutcomeBadgeText, { color: outcomeTheme.color }]}>
                              {item.outcome}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.cleanCardDateSub}>
                        {formatDateTimeDisplay(item.followUpDate, item.followUpTime)}
                        {item.assignedToName || item.performedBy ? ` • ${item.assignedToName || item.performedBy}` : ''}
                      </Text>
                    </View>

                    {/* Right Action Icons */}
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

                  {/* Notes Box */}
                  {item.remarks ? (
                    <View style={styles.cleanNotesCard}>
                      <Text style={styles.cleanNotesCardText}>{item.remarks}</Text>
                    </View>
                  ) : null}

                  {/* Conditional Info line (Visit location / Email subject / WA template) */}
                  {(item.visitLocation || item.emailSubject || item.whatsAppTemplate) ? (
                    <View style={styles.cleanMetaInfoRow}>
                      {item.visitLocation ? (
                        <View style={styles.cleanMetaItem}>
                          <Ionicons name="location-outline" size={13} color="#ea580c" />
                          <Text style={styles.cleanMetaItemText} numberOfLines={1}>{item.visitLocation}</Text>
                        </View>
                      ) : null}
                      {item.emailSubject ? (
                        <View style={styles.cleanMetaItem}>
                          <Ionicons name="mail-outline" size={13} color="#0284c7" />
                          <Text style={styles.cleanMetaItemText} numberOfLines={1}>{item.emailSubject}</Text>
                        </View>
                      ) : null}
                      {item.whatsAppTemplate ? (
                        <View style={styles.cleanMetaItem}>
                          <Ionicons name="logo-whatsapp" size={13} color="#16a34a" />
                          <Text style={styles.cleanMetaItemText} numberOfLines={1}>{item.whatsAppTemplate}</Text>
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
                            Next: <Text style={{ fontWeight: '700' }}>{item.nextFollowUpDate} {item.nextFollowUpTime || ''}</Text>
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
        )}
        <View style={{ height: 35 }} />
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      {/* Universal Fixed Top Navbar */}
      <Header
        title={selectedCustomer ? (selectedCustomer.customerName || selectedCustomer.leadName || 'Customer Follow-up') : 'Sales Follow-up'}
        showBack={selectedCustomer ? true : route?.name !== 'LeadsTab' && navigation?.canGoBack ? navigation.canGoBack() : false}
        onBack={() => {
          if (selectedCustomer) {
            handleBackToBacklog();
          } else if (navigation?.goBack) {
            navigation.goBack();
          }
        }}
        currentRoute={route?.name || 'LeadsTab'}
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
              Your user account has not been assigned to any company yet. In Techno CRM, sales follow-ups and leads are only accessible once a company is assigned to your profile in User Master.
            </Text>
            <TouchableOpacity style={styles.restrictedReloadBtn} onPress={onRefresh}>
              <Ionicons name="refresh" size={16} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.restrictedReloadBtnText}>Check Again</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : isSalesBlocked ? (
        <ScrollView
          contentContainerStyle={{ padding: 20 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        >
          <View style={styles.restrictedCard}>
            <View style={[styles.restrictedIconBox, { backgroundColor: '#fee2e2' }]}>
              <Ionicons name="lock-closed" size={36} color="#ef4444" />
            </View>
            <Text style={styles.restrictedHeading}>Sales Access Restricted</Text>
            <Text style={styles.restrictedText}>
              Your account does not have permission to view Sales Follow-ups. Please contact your CRM administrator to grant access in User Permission.
            </Text>
            <TouchableOpacity style={styles.restrictedReloadBtn} onPress={onRefresh}>
              <Ionicons name="refresh" size={16} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.restrictedReloadBtnText}>Check Again</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <>
          {/* Pinned Top Queue Bar (Lifted outside card with neat UI and short names) */}
          {!selectedCustomer && (
            <View style={styles.topQueueSegmentedBar}>
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
                  size={13}
                  color={queueFilter === 'Today' ? '#fde047' : '#d97706'}
                />
                <Text
                  style={[
                    styles.topQueueSegmentText,
                    queueFilter === 'Today' && styles.topQueueSegmentTextActive,
                  ]}
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
                  size={13}
                  color={queueFilter === 'Scheduled' ? '#bae6fd' : '#0284c7'}
                />
                <Text
                  style={[
                    styles.topQueueSegmentText,
                    queueFilter === 'Scheduled' && styles.topQueueSegmentTextActive,
                  ]}
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
                  >
                    {scheduledCount}
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
                  size={13}
                  color={queueFilter === 'All' ? '#ffffff' : '#64748b'}
                />
                <Text
                  style={[
                    styles.topQueueSegmentText,
                    queueFilter === 'All' && styles.topQueueSegmentTextActive,
                  ]}
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
                  >
                    {allCount}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* Switch between Master Backlog View and Customer History Detail View */}
          {selectedCustomer ? renderCustomerDetailView() : renderMasterQueueView()}
        </>
      )}

      {/* ======================================================== */}
      {/* ADD / EDIT FOLLOW-UP DRAWER MODAL (EXACT WEB CRM PARITY) */}
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
                  <Ionicons name="call" size={16} color="#645695" />
                </View>
                <Text style={styles.modalTitle}>
                  {editingFollowUpId ? 'Edit Follow-up' : 'New Follow-up'}
                </Text>
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

                {/* Field 1: Lead Name */}
                <View style={styles.formFieldGroup}>
                  <Text style={styles.formLabel}>Lead Name</Text>
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
                      {formClientName || 'Select Lead Name...'}
                    </Text>
                    <Ionicons name="search-outline" size={17} color="#645695" />
                  </TouchableOpacity>
                </View>

                {/* Field 2: Date & Time (Exact 48px heights and aligned labels) */}
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

                {/* Field 3: 2 Columns - Follow up Type & Performed By */}
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
                    <View style={styles.readOnlyInput}>
                      <Text style={styles.readOnlyInputText} numberOfLines={1}>
                        {formPerformedBy || 'Admin'}
                      </Text>
                    </View>
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
                        placeholder="Template name (e.g. sales_intro)"
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

                {/* Field 4: Follow-up Outcome (Dropdown with '+' button matching Web screenshot) */}
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

              {/* SECTION 2: Next Action */}
              <View style={styles.formSectionBox}>
                <Text style={styles.formSectionHeader}>Next Action</Text>

                {/* Field 5: 2 Columns - Next Follow-up Date & Next Follow-up Time Slot */}
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

                {/* Field 6: 2 Columns - Status & Priority */}
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

                {/* Field 7: Reminder Before */}
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

                {/* Field 8: Notes */}
                <View style={styles.formFieldGroup}>
                  <Text style={styles.formLabel}>Notes</Text>
                  <TextInput
                    style={styles.notesTextArea}
                    placeholder="e.g. Lead is very interested in our product. Needs a demo next week."
                    placeholderTextColor="#94a3b8"
                    multiline
                    numberOfLines={3}
                    value={formNotes}
                    onChangeText={setFormNotes}
                  />
                </View>

                {/* Field 9: Attachments */}
                <View style={styles.formFieldGroup}>
                  <Text style={styles.formLabel}>
                    <Ionicons name="attach" size={14} color="#645695" /> Attachments (PDF, Image, Documents)
                  </Text>
                  <View style={styles.attachmentPlaceholderBox}>
                    <Ionicons name="cloud-upload-outline" size={18} color="#645695" />
                    <Text style={styles.attachmentPlaceholderText}>Tap to attach documents or photos</Text>
                  </View>
                </View>
              </View>

              <View style={{ height: 24 }} />
            </ScrollView>

            {/* Drawer Footer (Cancel | Save Follow-up | Save & Schedule Next) */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.drawerBtnCancel}
                onPress={() => setDrawerOpen(false)}
                disabled={saving}
                activeOpacity={0.7}
              >
                <Text style={styles.drawerBtnCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.drawerBtnSecondary, saving && { opacity: 0.6 }]}
                onPress={() => handleSaveFollowUp(false)}
                disabled={saving}
                activeOpacity={0.7}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.drawerBtnSecondaryText}>Save Follow-up</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.drawerBtnPrimary,
                  (!formNextFollowUpDate || saving) && { opacity: 0.5 },
                ]}
                onPress={() => handleSaveFollowUp(true)}
                disabled={saving || !formNextFollowUpDate}
                activeOpacity={0.7}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.drawerBtnPrimaryText}>Save & Schedule Next</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add Outcome Modal */}
      <Modal
        visible={addOutcomeModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setAddOutcomeModalVisible(false)}
      >
        <View style={styles.pickerModalOverlay}>
          <View style={[styles.pickerModalBox, { padding: 18 }]}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#1e293b', marginBottom: 12 }}>
              Add New Outcome
            </Text>
            <TextInput
              style={[styles.formTextInput, { marginBottom: 14 }]}
              placeholder="Enter outcome name (e.g. Follow-up Needed)"
              placeholderTextColor="#94a3b8"
              value={newOutcomeName}
              onChangeText={setNewOutcomeName}
              autoFocus
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
              <TouchableOpacity
                style={[styles.drawerBtnCancel, { paddingVertical: 8, paddingHorizontal: 14 }]}
                onPress={() => setAddOutcomeModalVisible(false)}
              >
                <Text style={styles.drawerBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.drawerBtnPrimary, { paddingVertical: 8, paddingHorizontal: 14 }]}
                onPress={() => {
                  if (newOutcomeName.trim()) {
                    const trimmed = newOutcomeName.trim();
                    if (!outcomesList.includes(trimmed)) {
                      setOutcomesList((prev) => [...prev, trimmed]);
                    }
                    setFormOutcome(trimmed);
                    setAddOutcomeModalVisible(false);
                  }
                }}
              >
                <Text style={styles.drawerBtnPrimaryText}>Add Outcome</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Time Slot Picker Modal */}
      <Modal
        visible={pickerModal.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPickerModal((p) => ({ ...p, visible: false }))}
      >
        <View style={styles.pickerModalOverlay}>
          <View style={styles.pickerModalBox}>
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>{pickerModal.title}</Text>
              <TouchableOpacity onPress={() => setPickerModal((p) => ({ ...p, visible: false }))}>
                <Ionicons name="close" size={20} color="#555" />
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
        </View>
      </Modal>

      {/* Lead Selector Modal (Dynamic Binding) */}
      <LeadSelectorModal
        visible={leadSelectorVisible}
        onClose={() => setLeadSelectorVisible(false)}
        leads={allLeadsOptions}
        selectedLeadId={formLeadId}
        loading={loadingLeads}
        title="Select Lead"
        hideCompanyPhone={true}
        onSelectLead={(selectedLead) => {
          setFormLeadId(selectedLead.leadID || selectedLead.id);
          setFormClientName(selectedLead.leadName || selectedLead.name || '');
        }}
      />

      {/* Quick Message Modal */}
      <QuickMessageModal
        visible={msgModalVisible}
        onClose={() => setMsgModalVisible(false)}
        recipientName={msgRecipient.name}
        phoneNumber={msgRecipient.phone}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  leadSelectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  leadSelectedName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  leadSelectedSub: {
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 2,
  },
  leadChangeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#ede9fe',
    borderWidth: 1,
    borderColor: 'rgba(100, 86, 149, 0.3)',
    marginLeft: 8,
  },
  leadChangeBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#645695',
  },
  selectLeadTriggerBtn: {
    height: 48,
    borderWidth: 1,
    borderColor: '#645695',
    borderStyle: 'dashed',
    borderRadius: 10,
    backgroundColor: 'rgba(100, 86, 149, 0.04)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  selectLeadTriggerText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#645695',
  },
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  scrollArea: {
    flex: 1,
  },
  webCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    margin: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#645695',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  headerLeadsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f0fa',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(100, 86, 149, 0.25)',
  },
  headerLeadsBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#645695',
  },
  headerAddLeadBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f3f0fa',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(100, 86, 149, 0.25)',
  },
  headerAddFollowUpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#645695',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
    shadowColor: '#645695',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 2,
  },
  headerAddFollowUpBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },

  // ==================== PINNED TOP QUEUE SEGMENTED BAR ====================
  topQueueSegmentedBar: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    flexDirection: 'row',
    gap: 8,
  },
  topQueueSegmentItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 5,
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
    fontSize: 12,
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
    paddingVertical: 1,
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

  flexOne: {
    flex: 1,
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
  whatsAppCircleBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#25D366',
    alignItems: 'center',
    justifyContent: 'center',
  },
    cardLogsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 5,
    gap: 3,
    },
  cardLogsBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#645695',
  },
  cardRemarksBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#645695',
  },
  cardRemarksOutcome: {
    fontSize: 12,
    fontWeight: '700',
    color: '#645695',
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

  // ==================== BACKLOG ITEMS ====================
  backlogItemsList: {
    marginTop: 12,
  },
  backlogRowCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  rowCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  leadAvatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(100, 86, 149, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  leadAvatarInitials: {
    fontSize: 13,
    fontWeight: '800',
    color: '#645695',
  },
  rowCardTitles: {
    flex: 1,
  },
  rowLeadName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  rowCompanyName: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
  rowCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  metaIconText: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaPhoneText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '500',
  },
  metaCityText: {
    fontSize: 12,
    color: '#64748b',
  },
  dueTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 'auto',
  },
  dueTimeBadgeOverdue: {
    backgroundColor: '#fef3c7',
  },
  dueTimeBadgeScheduled: {
    backgroundColor: '#dcfce7',
  },
  dueTimeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  rowRemarksBox: {
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  rowRemarksText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 17,
  },
  rowActionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10,
    marginTop: 4,
  },
  webFollowUpActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#645695',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 8,
  },
  webFollowUpActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#645695',
  },
  rowRightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(100, 86, 149, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#645695',
    paddingHorizontal: 14,
    height: 38,
    borderRadius: 8,
    gap: 4,
  },
  webAddBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },

  // ==================== PAGINATION ====================
  webPaginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10,
    marginTop: 6,
  },
  paginationInfoText: {
    fontSize: 11,
    color: '#64748b',
  },
  paginationBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pageNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    gap: 2,
  },
  pageNavBtnDisabled: {
    borderColor: '#e2e8f0',
  },
  pageNavBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#645695',
  },
  pageNumberBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },

  // ==================== CUSTOMER DETAIL VIEW ====================
  customerHeaderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginHorizontal: 12,
    marginTop: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  customerHeaderTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  backToBacklogBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f3f0fa',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  customerHeaderAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(100, 86, 149, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  customerHeaderAvatarText: {
    fontSize: 14,
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
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 2,
  },
  customerHeaderDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 8,
  },
  statusSelectBox: {
    flex: 1,
  },
  statusLabelSmall: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8b96a5',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statusChipsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  statusPillActive: {
    backgroundColor: '#645695',
    borderColor: '#645695',
  },
  statusPillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#475569',
  },
  statusPillTextActive: {
    color: '#ffffff',
  },
  sourceBox: {
    alignItems: 'flex-end',
    marginLeft: 10,
  },
  leadSourcePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  sourceTextVal: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0284c7',
  },
  metaSourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#bae6fd',
    gap: 3,
  },
  metaSourceText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0284c7',
  },

  // ==================== DETAIL HISTORY CARD ====================
  // ==================== CLEAN CUSTOMER DETAIL & HISTORY STYLES ====================
  cleanTabsWrapper: {
    marginTop: 10,
    marginHorizontal: 12,
  },
  cleanTabsScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  cleanTabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 6,
  },
  cleanTabPillActive: {
    backgroundColor: '#645695',
    borderColor: '#645695',
    shadowColor: '#645695',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  cleanTabPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  cleanTabPillTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  cleanTabBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  cleanTabBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  cleanTabBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
  },
  cleanTabBadgeTextActive: {
    color: '#ffffff',
  },

  cleanFilterActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 12,
    marginTop: 10,
    gap: 8,
  },
  cleanDateFiltersGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  cleanDateChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cleanDateChipActive: {
    backgroundColor: '#f3e8ff',
    borderColor: '#d8b4fe',
  },
  cleanDateChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  cleanDateChipTextActive: {
    color: '#645695',
    fontWeight: '700',
  },
  cleanSortIconButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cleanAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#645695',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
    shadowColor: '#645695',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  cleanAddButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },

  // ==================== CLEAN HISTORY CARDS ====================
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
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cleanOutcomeBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    lineHeight: 15,
  },
  cleanCardTopActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cleanStatusTogglePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4,
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
    fontSize: 11.5,
    fontWeight: '700',
    lineHeight: 15,
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

  // ==================== DRAWER MODAL STYLES (EXACT WEB PARITY) ====================
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
  attachmentPlaceholderBox: {
    height: 48,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  attachmentPlaceholderText: {
    fontSize: 12.5,
    color: '#64748b',
    fontWeight: '500',
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
    backgroundColor: '#645695',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#645695',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
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
    backgroundColor: '#475569',
    alignItems: 'center',
    justifyContent: 'center',
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
    maxHeight: 400,
  },
  pickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
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
});
