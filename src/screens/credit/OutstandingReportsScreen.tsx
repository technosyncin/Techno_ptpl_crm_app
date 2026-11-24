import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  DimensionValue,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/common/Header';
import { Badge } from '../../components/common/Badge';
import { reportService } from '../../api/reportService';
import { leadService } from '../../api/leadService';
import { useCompany } from '../../context/CompanyContext';
import { Colors } from '../../theme/colors';
import { LeadSelectorModal, LeadOption } from '../../components/modals/LeadSelectorModal';

interface OutstandingReportsScreenProps {
  navigation: any;
}

type TabType = 'summary' | 'customers' | 'details' | 'followup' | 'baddebt';
type FollowUpFilterType = 'All' | 'Pending' | 'Today' | 'Missed' | 'Completed' | 'Promise to pay';

export const OutstandingReportsScreen: React.FC<OutstandingReportsScreenProps> = ({ navigation }) => {
  const { selectedCompanyId, selectedCompany } = useCompany();

  // Active Tab
  const [activeTab, setActiveTab] = useState<TabType>('summary');

  // Filters State
  const [showFilters, setShowFilters] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedLead, setSelectedLead] = useState<LeadOption | null>(null);
  const [leadModalVisible, setLeadModalVisible] = useState(false);
  const [leadsList, setLeadsList] = useState<LeadOption[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [followUpFilter, setFollowUpFilter] = useState<FollowUpFilterType>('All');

  // Loading States
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Data States
  const [summaryData, setSummaryData] = useState({
    totalOutstanding: 0,
    totalOverdue: 0,
    totalCurrent: 0,
    totalCustomers: 0,
    avgAgingDays: 0,
    currentPct: 0,
    days30Pct: 0,
    days60Pct: 0,
    days90Pct: 0,
    days91_120Pct: 0,
    days120Pct: 0,
  });

  const [agingBuckets, setAgingBuckets] = useState({
    current: 0,
    days30: 0,
    days60: 0,
    days90: 0,
    days91_120: 0,
    days120: 0,
  });

  const [customersList, setCustomersList] = useState<any[]>([]);
  const [detailsList, setDetailsList] = useState<any[]>([]);
  const [followUpsList, setFollowUpsList] = useState<any[]>([]);

  // Format currency in Indian Rupees
  const formatCurrency = (val?: number) => {
    if (val === undefined || val === null || isNaN(val)) return '₹0';
    return `₹${Math.round(val).toLocaleString('en-IN')}`;
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return String(dateStr);
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return String(dateStr);
    }
  };

  // Helper: Normalize dictionary keys
  const normalizeKeys = (obj: any) => {
    if (!obj || typeof obj !== 'object') return {};
    const norm: Record<string, any> = {};
    Object.keys(obj).forEach((k) => {
      norm[k.toLowerCase().replace(/[^a-z0-9]/g, '')] = obj[k];
    });
    return norm;
  };

  // Load Leads Master for Customer Selector
  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const compId = selectedCompanyId ? Number(selectedCompanyId) : 10;
        const res = await leadService.getLeads({ companyId: compId, pageSize: 500 });
        if (res && res.data) {
          const opts: LeadOption[] = res.data.map((l: any) => ({
            id: l.leadID,
            leadID: l.leadID,
            name: l.leadName || l.companyName || `Lead #${l.leadID}`,
            leadName: l.leadName,
            companyName: l.companyName,
            phone: l.mobileNo,
          }));
          setLeadsList(opts);
        }
      } catch (err) {
        console.warn('Error loading leads:', err);
      }
    };
    fetchLeads();
  }, [selectedCompanyId]);

  // Load All Outstanding Data
  const loadAllData = useCallback(async () => {
    const compId = selectedCompanyId ? Number(selectedCompanyId) : 10;
    setLoading(true);
    try {
      const payload = {
        fromDate: fromDate || null,
        toDate: toDate || null,
        leadID: selectedLead?.leadID ? Number(selectedLead.leadID) : 0,
        companyID: compId,
      };

      // Execute all report requests in parallel
      const [sumRes, custRes, detRes, fupRes] = await Promise.allSettled([
        reportService.getOutstandingSummary(payload),
        reportService.getOutstandingCustomerWise(payload),
        reportService.getOutstandingDetails(payload),
        reportService.getOutstandingFollowUp(payload),
      ]);

      // 1. Process Details
      let processedDetails: any[] = [];
      if (detRes.status === 'fulfilled' && Array.isArray(detRes.value)) {
        processedDetails = detRes.value.map((row: any, idx: number) => {
          const norm = normalizeKeys(row);
          const docAmt = parseFloat(norm.documentamount || norm.amount || norm.totalamount || 0);
          const recAmt = parseFloat(norm.receivedamount || norm.received || norm.appliedamt || 0);
          const pendAmt = norm.pendingamount !== undefined
            ? parseFloat(norm.pendingamount)
            : norm.balance !== undefined
            ? parseFloat(norm.balance)
            : (docAmt - recAmt);
          const overdue = parseInt(norm.overduedays || norm.daysoverdue || norm.days || 0);

          let bucket = norm.agingbucket || norm.bucket || '';
          if (!bucket) {
            if (overdue <= 0) bucket = 'Current';
            else if (overdue <= 30) bucket = '1-30 days';
            else if (overdue <= 60) bucket = '31-60 days';
            else if (overdue <= 90) bucket = '61-90 days';
            else if (overdue <= 120) bucket = '91-120 days';
            else bucket = '120+ days';
          }

          return {
            id: norm.id || norm.invoicedocumentid || idx + 1,
            documentReference: norm.referenceno || norm.documentnumber || norm.docnum || `REF-${idx + 1}`,
            documentType: norm.doctype || norm.documenttype || 'Sales Invoice',
            documentDate: norm.documentdate || norm.postingdate || norm.docdate || null,
            dueDate: norm.duedate || norm.docduedate || null,
            customerName: norm.customername || norm.customer || norm.partyname || norm.leadname || 'N/A',
            documentAmount: docAmt,
            receivedAmount: recAmt,
            pendingAmount: pendAmt,
            overdueDays: overdue,
            agingBucket: bucket,
            leadId: norm.leadid || norm.customerid || 0,
          };
        });
      }
      setDetailsList(processedDetails);

      // 2. Process Customers
      let processedCustomers: any[] = [];
      if (custRes.status === 'fulfilled' && Array.isArray(custRes.value)) {
        processedCustomers = custRes.value
          .filter((r: any) => {
            const norm = normalizeKeys(r);
            return norm.srno !== 999999;
          })
          .map((row: any, idx: number) => {
            const norm = normalizeKeys(row);
            const totOut = parseFloat(norm.total || norm.totaloutstanding || norm.pendingamount || 0);
            const totOver = parseFloat(norm.totaloverdue || norm.overdueamount || 0);
            return {
              srNo: norm.srno || idx + 1,
              id: norm.leadid || norm.customerid || idx + 1,
              leadId: norm.leadid || norm.customerid || 0,
              name: norm.leadname || norm.customername || norm.partyname || `Customer #${idx + 1}`,
              totalOutstanding: totOut,
              totalOverdue: totOver,
              current: parseFloat(norm.current || norm.currentbucket || 0),
              days30: parseFloat(norm['130d'] || norm['130days'] || norm['130'] || 0),
              days60: parseFloat(norm['3160d'] || norm['3160days'] || norm['3160'] || 0),
              days90: parseFloat(norm['6190d'] || norm['6190days'] || norm['6190'] || 0),
              days91_120: parseFloat(norm['91120d'] || norm['91120days'] || norm['91120'] || 0),
              days120: parseFloat(norm['120d'] || norm['120plus'] || norm['120days'] || 0),
            };
          });
      }
      setCustomersList(processedCustomers);

      // 3. Process Summary & Aging
      if (sumRes.status === 'fulfilled' && Array.isArray(sumRes.value) && sumRes.value.length > 0) {
        const raw = sumRes.value[0];
        const norm = normalizeKeys(raw);

        const parseNum = (v: any) => {
          if (v === null || v === undefined) return 0;
          return parseFloat(String(v).replace(/,/g, '')) || 0;
        };

        const totOut = parseNum(norm.totaloutstanding || norm.pendingamount || norm.total);
        const totOver = parseNum(norm.overdueamount || norm.totaloverdue);
        const curAmt = parseNum(norm.current || norm.currentamount || norm.currentbucket);
        const avgDays = parseNum(norm.avgdays || norm.averageagingdays);

        const curBucket = parseNum(norm.currentbucket || norm.current);
        const d30 = parseNum(norm['130days'] || norm['130d']);
        const d60 = parseNum(norm['3160days'] || norm['3160d']);
        const d90 = parseNum(norm['6190days'] || norm['6190d']);
        const d91_120 = parseNum(norm['91120days'] || norm['91120d']);
        const d120 = parseNum(norm['120days'] || norm['120plus'] || norm['120d']);

        setSummaryData({
          totalOutstanding: totOut,
          totalOverdue: totOver,
          totalCurrent: curAmt,
          totalCustomers: processedCustomers.length,
          avgAgingDays: avgDays,
          currentPct: totOut ? Math.round((curBucket / totOut) * 100) : 0,
          days30Pct: totOut ? Math.round((d30 / totOut) * 100) : 0,
          days60Pct: totOut ? Math.round((d60 / totOut) * 100) : 0,
          days90Pct: totOut ? Math.round((d90 / totOut) * 100) : 0,
          days91_120Pct: totOut ? Math.round((d91_120 / totOut) * 100) : 0,
          days120Pct: totOut ? Math.round((d120 / totOut) * 100) : 0,
        });

        setAgingBuckets({
          current: curBucket,
          days30: d30,
          days60: d60,
          days90: d90,
          days91_120: d91_120,
          days120: d120,
        });
      } else if (processedDetails.length > 0) {
        // Fallback calculation from details
        const totOut = processedDetails.reduce((s, d) => s + (d.pendingAmount || 0), 0);
        const totOver = processedDetails.reduce((s, d) => s + (d.overdueDays > 0 ? (d.pendingAmount || 0) : 0), 0);
        const curAmt = processedDetails.reduce((s, d) => s + (d.overdueDays <= 0 ? (d.pendingAmount || 0) : 0), 0);
        const avg = processedDetails.length > 0
          ? processedDetails.reduce((s, d) => s + (d.overdueDays || 0), 0) / processedDetails.length
          : 0;

        let bCur = 0, b30 = 0, b60 = 0, b90 = 0, b91_120 = 0, b120 = 0;
        processedDetails.forEach((d) => {
          if (d.overdueDays <= 0) bCur += d.pendingAmount;
          else if (d.overdueDays <= 30) b30 += d.pendingAmount;
          else if (d.overdueDays <= 60) b60 += d.pendingAmount;
          else if (d.overdueDays <= 90) b90 += d.pendingAmount;
          else if (d.overdueDays <= 120) b91_120 += d.pendingAmount;
          else b120 += d.pendingAmount;
        });

        setSummaryData({
          totalOutstanding: totOut,
          totalOverdue: totOver,
          totalCurrent: curAmt,
          totalCustomers: processedCustomers.length,
          avgAgingDays: avg,
          currentPct: totOut ? Math.round((bCur / totOut) * 100) : 0,
          days30Pct: totOut ? Math.round((b30 / totOut) * 100) : 0,
          days60Pct: totOut ? Math.round((b60 / totOut) * 100) : 0,
          days90Pct: totOut ? Math.round((b90 / totOut) * 100) : 0,
          days91_120Pct: totOut ? Math.round((b91_120 / totOut) * 100) : 0,
          days120Pct: totOut ? Math.round((b120 / totOut) * 100) : 0,
        });

        setAgingBuckets({
          current: bCur,
          days30: b30,
          days60: b60,
          days90: b90,
          days91_120: b91_120,
          days120: b120,
        });
      }

      // 4. Process Follow-Ups
      if (fupRes.status === 'fulfilled' && Array.isArray(fupRes.value)) {
        const processedFollowUps = fupRes.value.map((row: any, idx: number) => {
          const norm = normalizeKeys(row);
          return {
            followUpID: norm.followupid || idx + 1,
            leadName: norm.leadname || 'Customer',
            followUpDate: norm.followdatetime || norm.followupdate || null,
            nextFollowUpDate: norm.nextfollowdate || norm.nextfollowupdate || null,
            followUpType: norm.followuptype || 'Call',
            performedBy: norm.performedby || norm.followuptype || 'Sales Team',
            outcome: norm.outcome || 'Follow-up',
            status: norm.status || 'Pending',
            priority: norm.priority || 'Medium',
            notes: norm.notes || '',
            promiseToPayDate: norm.promisetopaydate || null,
          };
        });
        setFollowUpsList(processedFollowUps);
      }
    } catch (error) {
      console.warn('Error loading outstanding data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedCompanyId, fromDate, toDate, selectedLead]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  };

  const handleResetFilters = () => {
    setFromDate('');
    setToDate(new Date().toISOString().split('T')[0]);
    setSelectedLead(null);
    setSearchQuery('');
  };

  // Filtered Lists for Active Tabs
  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customersList;
    const q = searchQuery.toLowerCase().trim();
    return customersList.filter((c) => (c.name || '').toLowerCase().includes(q));
  }, [customersList, searchQuery]);

  const filteredDetails = useMemo(() => {
    if (!searchQuery.trim()) return detailsList;
    const q = searchQuery.toLowerCase().trim();
    return detailsList.filter(
      (d) =>
        (d.customerName || '').toLowerCase().includes(q) ||
        (d.documentReference || '').toLowerCase().includes(q) ||
        (d.documentType || '').toLowerCase().includes(q)
    );
  }, [detailsList, searchQuery]);

  const filteredFollowUps = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return followUpsList.filter((item: any) => {
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const nameMatch = (item.leadName || '').toLowerCase().includes(q);
        const notesMatch = (item.notes || '').toLowerCase().includes(q);
        const perfMatch = (item.performedBy || '').toLowerCase().includes(q);
        if (!nameMatch && !notesMatch && !perfMatch) return false;
      }

      const nextDate = item.nextFollowUpDate ? item.nextFollowUpDate.split('T')[0] : '';
      const dateStr = item.followUpDate ? item.followUpDate.split('T')[0] : '';
      const status = item.status || 'Pending';

      if (followUpFilter === 'Pending') return status === 'Pending' || status === 'Open';
      if (followUpFilter === 'Today') return nextDate === todayStr || dateStr === todayStr;
      if (followUpFilter === 'Missed') return nextDate && nextDate < todayStr && status !== 'Completed';
      if (followUpFilter === 'Completed') return status === 'Completed' || status === 'Closed';
      if (followUpFilter === 'Promise to pay') return item.promiseToPayDate || item.outcome === 'Payment Promised';
      return true;
    });
  }, [followUpsList, searchQuery, followUpFilter]);

  // Bad Debts computation
  const computedBadDebts = useMemo(() => {
    return filteredCustomers.map((cust) => {
      const custDetails = detailsList.filter((d) => d.customerName?.toLowerCase() === cust.name?.toLowerCase());
      const maxOverdue = custDetails.reduce((max, d) => Math.max(max, d.overdueDays || 0), 0);
      const riskRating = maxOverdue > 90 ? 'High' : maxOverdue > 30 ? 'Medium' : 'Low';
      return {
        ...cust,
        maxOverdueDays: maxOverdue,
        riskRating,
      };
    });
  }, [filteredCustomers, detailsList]);

  // Aging Bucket Visual Colors matching Web
  const agingItems = [
    { label: 'Current', days: '0 days', value: agingBuckets.current, color: '#16a34a', pct: summaryData.currentPct },
    { label: '1 - 30 Days', days: '1-30 days', value: agingBuckets.days30, color: '#eab308', pct: summaryData.days30Pct },
    { label: '31 - 60 Days', days: '31-60 days', value: agingBuckets.days60, color: '#0284c7', pct: summaryData.days60Pct },
    { label: '61 - 90 Days', days: '61-90 days', value: agingBuckets.days90, color: '#ea580c', pct: summaryData.days90Pct },
    { label: '91 - 120 Days', days: '91-120 days', value: agingBuckets.days91_120, color: '#ef4444', pct: summaryData.days91_120Pct },
    { label: '120+ Days', days: '120+ days', value: agingBuckets.days120, color: '#b91c1c', pct: summaryData.days120Pct },
  ];

  return (
    <View style={styles.container}>
      {/* Top Navbar */}
      <Header
        title="Outstanding Report"
        showBack
        onBack={() => navigation.goBack()}
        subtitle={
          selectedCompany
            ? `${selectedCompany.companyName} | ${toDate ? `Till ${formatDate(toDate)}` : ''}`
            : 'Receivables & Aging Analysis'
        }
        rightComponent={
          <View style={styles.headerRightRow}>
            <TouchableOpacity
              style={[styles.headerIconBtn, showFilters && styles.headerIconBtnActive]}
              onPress={() => setShowFilters(!showFilters)}
            >
              <Ionicons
                name={showFilters ? 'funnel' : 'funnel-outline'}
                size={18}
                color={showFilters ? '#645695' : '#475569'}
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerIconBtn} onPress={onRefresh}>
              <Ionicons name="refresh" size={18} color="#475569" />
            </TouchableOpacity>
          </View>
        }
      />

      {/* Collapsible Filter Panel */}
      {showFilters && (
        <View style={styles.filterPanel}>
          <View style={styles.filterRow}>
            {/* From Date */}
            <View style={styles.filterInputCol}>
              <Text style={styles.filterLabel}>From Date</Text>
              <TextInput
                style={styles.filterTextInput}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#94a3b8"
                value={fromDate}
                onChangeText={setFromDate}
              />
            </View>

            {/* To Date */}
            <View style={styles.filterInputCol}>
              <Text style={styles.filterLabel}>To Date</Text>
              <TextInput
                style={styles.filterTextInput}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#94a3b8"
                value={toDate}
                onChangeText={setToDate}
              />
            </View>
          </View>

          {/* Customer / Lead Selector */}
          <View style={{ marginTop: 8 }}>
            <Text style={styles.filterLabel}>Customer / Lead</Text>
            <TouchableOpacity
              style={styles.leadSelectorBtn}
              onPress={() => setLeadModalVisible(true)}
            >
              <Ionicons name="business-outline" size={16} color="#645695" style={{ marginRight: 6 }} />
              <Text style={styles.leadSelectorText} numberOfLines={1}>
                {selectedLead ? selectedLead.name : 'All Customers (Tap to select)'}
              </Text>
              {selectedLead && (
                <TouchableOpacity onPress={() => setSelectedLead(null)} style={{ padding: 2 }}>
                  <Ionicons name="close-circle" size={16} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          </View>

          {/* Action Buttons */}
          <View style={styles.filterActionRow}>
            <TouchableOpacity style={styles.resetBtn} onPress={handleResetFilters}>
              <Ionicons name="arrow-undo-outline" size={14} color="#64748b" style={{ marginRight: 4 }} />
              <Text style={styles.resetBtnText}>Reset</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.applyBtn} onPress={loadAllData}>
              <Ionicons name="checkmark-circle-outline" size={14} color="#ffffff" style={{ marginRight: 4 }} />
              <Text style={styles.applyBtnText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Tabs Navigation (5 Web Tabs) */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'summary' && styles.tabBtnActive]}
            onPress={() => setActiveTab('summary')}
          >
            <Ionicons
              name="speedometer-outline"
              size={15}
              color={activeTab === 'summary' ? '#ffffff' : '#64748b'}
              style={{ marginRight: 5 }}
            />
            <Text style={[styles.tabBtnText, activeTab === 'summary' && styles.tabBtnTextActive]}>
              Summary
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'customers' && styles.tabBtnActive]}
            onPress={() => setActiveTab('customers')}
          >
            <Ionicons
              name="people-outline"
              size={15}
              color={activeTab === 'customers' ? '#ffffff' : '#64748b'}
              style={{ marginRight: 5 }}
            />
            <Text style={[styles.tabBtnText, activeTab === 'customers' && styles.tabBtnTextActive]}>
              Customer Wise ({filteredCustomers.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'details' && styles.tabBtnActive]}
            onPress={() => setActiveTab('details')}
          >
            <Ionicons
              name="document-text-outline"
              size={15}
              color={activeTab === 'details' ? '#ffffff' : '#64748b'}
              style={{ marginRight: 5 }}
            />
            <Text style={[styles.tabBtnText, activeTab === 'details' && styles.tabBtnTextActive]}>
              Detailed View ({filteredDetails.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'followup' && styles.tabBtnActive]}
            onPress={() => setActiveTab('followup')}
          >
            <Ionicons
              name="call-outline"
              size={15}
              color={activeTab === 'followup' ? '#ffffff' : '#64748b'}
              style={{ marginRight: 5 }}
            />
            <Text style={[styles.tabBtnText, activeTab === 'followup' && styles.tabBtnTextActive]}>
              Follow-up Report
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'baddebt' && styles.tabBtnActive]}
            onPress={() => setActiveTab('baddebt')}
          >
            <Ionicons
              name="shield-outline"
              size={15}
              color={activeTab === 'baddebt' ? '#ffffff' : '#64748b'}
              style={{ marginRight: 5 }}
            />
            <Text style={[styles.tabBtnText, activeTab === 'baddebt' && styles.tabBtnTextActive]}>
              Bad Debt Report
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Global Search Bar (for Customer Wise, Detailed View, Follow-up, Bad Debt) */}
      {activeTab !== 'summary' && (
        <View style={styles.searchBarWrapper}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={16} color="#94a3b8" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by customer, invoice, notes..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color="#94a3b8" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      )}

      {/* Main Content ScrollView */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#645695']} />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading && !refreshing ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#645695" />
            <Text style={styles.loadingText}>Fetching report data...</Text>
          </View>
        ) : (
          <>
            {/* ==================== TAB 1: SUMMARY ==================== */}
            {activeTab === 'summary' && (
              <>
                {/* 4 KPI Cards */}
                <View style={styles.kpiGrid}>
                  <View style={[styles.kpiCard, { borderLeftColor: '#645695' }]}>
                    <View style={styles.kpiHeader}>
                      <Text style={styles.kpiLabel}>Total Outstanding</Text>
                      <View style={[styles.kpiIconBox, { backgroundColor: '#ede9fe' }]}>
                        <Ionicons name="wallet" size={16} color="#645695" />
                      </View>
                    </View>
                    <Text style={styles.kpiValue}>{formatCurrency(summaryData.totalOutstanding)}</Text>
                    <Text style={styles.kpiSub}>Total receivables</Text>
                  </View>

                  <View style={[styles.kpiCard, { borderLeftColor: '#16a34a' }]}>
                    <View style={styles.kpiHeader}>
                      <Text style={styles.kpiLabel}>Current (0 Days)</Text>
                      <View style={[styles.kpiIconBox, { backgroundColor: '#dcfce7' }]}>
                        <Ionicons name="time" size={16} color="#16a34a" />
                      </View>
                    </View>
                    <Text style={styles.kpiValue}>{formatCurrency(summaryData.totalCurrent)}</Text>
                    <View style={styles.kpiBadgeRow}>
                      <Ionicons name="checkmark-circle" size={12} color="#16a34a" />
                      <Text style={[styles.kpiSub, { color: '#16a34a', marginLeft: 4 }]}>Within terms</Text>
                    </View>
                  </View>

                  <View style={[styles.kpiCard, { borderLeftColor: '#dc2626' }]}>
                    <View style={styles.kpiHeader}>
                      <Text style={styles.kpiLabel}>Overdue Amount</Text>
                      <View style={[styles.kpiIconBox, { backgroundColor: '#fee2e2' }]}>
                        <Ionicons name="alert-circle" size={16} color="#dc2626" />
                      </View>
                    </View>
                    <Text style={[styles.kpiValue, { color: '#dc2626' }]}>
                      {formatCurrency(summaryData.totalOverdue)}
                    </Text>
                    <View style={styles.kpiBadgeRow}>
                      <Ionicons name="hourglass" size={12} color="#dc2626" />
                      <Text style={[styles.kpiSub, { color: '#dc2626', marginLeft: 4 }]}>Past due</Text>
                    </View>
                  </View>

                  <View style={[styles.kpiCard, { borderLeftColor: '#0284c7' }]}>
                    <View style={styles.kpiHeader}>
                      <Text style={styles.kpiLabel}>Average Days</Text>
                      <View style={[styles.kpiIconBox, { backgroundColor: '#e0f2fe' }]}>
                        <Ionicons name="calendar" size={16} color="#0284c7" />
                      </View>
                    </View>
                    <Text style={styles.kpiValue}>
                      {summaryData.avgAgingDays ? Number(summaryData.avgAgingDays).toFixed(1) : '0.0'} d
                    </Text>
                    <Text style={styles.kpiSub}>From invoice due date</Text>
                  </View>
                </View>

                {/* Aging Schedule Analysis Card */}
                <View style={styles.sectionCard}>
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.cardHeaderIconBox}>
                      <Ionicons name="bar-chart" size={16} color="#645695" />
                    </View>
                    <Text style={styles.sectionCardTitle}>Aging Analysis Schedule</Text>
                  </View>
                  <Text style={styles.sectionCardSub}>Distribution of receivables by overdue days</Text>

                  {agingItems.map((item, index) => {
                    const pctVal = item.pct !== undefined && item.pct !== null
                      ? item.pct
                      : summaryData.totalOutstanding > 0
                      ? Math.min(100, Math.round((item.value / summaryData.totalOutstanding) * 100))
                      : 0;

                    const widthStyle: DimensionValue = `${Math.min(100, Math.max(0, pctVal))}%`;

                    return (
                      <View key={index} style={styles.agingRow}>
                        <View style={styles.agingTextRow}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={[styles.agingColorDot, { backgroundColor: item.color }]} />
                            <Text style={styles.agingLabel}>{item.label}</Text>
                          </View>
                          <Text style={styles.agingAmount}>{formatCurrency(item.value)}</Text>
                        </View>

                        <View style={styles.progressBg}>
                          <View style={[styles.progressFill, { width: widthStyle, backgroundColor: item.color }]} />
                        </View>

                        <View style={styles.agingSubTextRow}>
                          <Text style={styles.agingDaysSub}>{item.days}</Text>
                          <Text style={styles.agingPercentSub}>{pctVal}% of total</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>

                {/* Aging Summary Breakdown Table */}
                <View style={styles.sectionCard}>
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.cardHeaderIconBox}>
                      <Ionicons name="list" size={16} color="#645695" />
                    </View>
                    <Text style={styles.sectionCardTitle}>Aging Summary Breakdown</Text>
                  </View>

                  <View style={styles.summaryTableHead}>
                    <Text style={[styles.tableHeadCol, { flex: 1.5 }]}>Aging Bucket</Text>
                    <Text style={[styles.tableHeadCol, { flex: 1, textAlign: 'right' }]}>Amount</Text>
                    <Text style={[styles.tableHeadCol, { flex: 0.8, textAlign: 'right' }]}>Share</Text>
                  </View>

                  {agingItems.map((item, idx) => (
                    <View key={idx} style={styles.summaryTableRow}>
                      <View style={{ flex: 1.5, flexDirection: 'row', alignItems: 'center' }}>
                        <View style={[styles.miniDot, { backgroundColor: item.color }]} />
                        <Text style={styles.tableRowText}>{item.label}</Text>
                      </View>
                      <Text style={[styles.tableRowText, { flex: 1, textAlign: 'right', fontWeight: '700' }]}>
                        {formatCurrency(item.value)}
                      </Text>
                      <Text style={[styles.tableRowText, { flex: 0.8, textAlign: 'right', color: '#64748b' }]}>
                        {item.pct || 0}%
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* ==================== TAB 2: CUSTOMER WISE ==================== */}
            {activeTab === 'customers' && (
              <View>
                <View style={styles.sectionCountRow}>
                  <Text style={styles.sectionCountText}>
                    Showing {filteredCustomers.length} Customer Accounts
                  </Text>
                </View>

                {filteredCustomers.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Ionicons name="folder-open-outline" size={42} color="#cbd5e1" />
                    <Text style={styles.emptyTitle}>No Customers Found</Text>
                    <Text style={styles.emptySub}>No outstanding records match your query.</Text>
                  </View>
                ) : (
                  filteredCustomers.map((cust, idx) => (
                    <View key={cust.id || idx} style={styles.customerCard}>
                      <View style={styles.customerCardTop}>
                        <View style={styles.custAvatar}>
                          <Text style={styles.custAvatarText}>
                            {(cust.name || 'C').charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={styles.customerName}>{cust.name}</Text>
                          <Text style={styles.customerSr}>Sr No. #{cust.srNo}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={styles.customerTotalAmount}>
                            {formatCurrency(cust.totalOutstanding)}
                          </Text>
                          {cust.totalOverdue > 0 ? (
                            <Badge label={`Overdue: ${formatCurrency(cust.totalOverdue)}`} variant="danger" size="sm" />
                          ) : (
                            <Badge label="Current" variant="success" size="sm" />
                          )}
                        </View>
                      </View>

                      {/* Mini Aging Breakdown */}
                      <View style={styles.custAgingGrid}>
                        <View style={styles.custAgingCol}>
                          <Text style={styles.custAgingColLabel}>Current</Text>
                          <Text style={[styles.custAgingColVal, { color: '#16a34a' }]}>
                            {formatCurrency(cust.current)}
                          </Text>
                        </View>
                        <View style={styles.custAgingCol}>
                          <Text style={styles.custAgingColLabel}>1-30 d</Text>
                          <Text style={styles.custAgingColVal}>{formatCurrency(cust.days30)}</Text>
                        </View>
                        <View style={styles.custAgingCol}>
                          <Text style={styles.custAgingColLabel}>31-60 d</Text>
                          <Text style={styles.custAgingColVal}>{formatCurrency(cust.days60)}</Text>
                        </View>
                        <View style={styles.custAgingCol}>
                          <Text style={styles.custAgingColLabel}>61-90 d</Text>
                          <Text style={styles.custAgingColVal}>{formatCurrency(cust.days90)}</Text>
                        </View>
                        <View style={styles.custAgingCol}>
                          <Text style={styles.custAgingColLabel}>91-120 d</Text>
                          <Text style={styles.custAgingColVal}>{formatCurrency(cust.days91_120)}</Text>
                        </View>
                        <View style={styles.custAgingCol}>
                          <Text style={styles.custAgingColLabel}>120+ d</Text>
                          <Text style={[styles.custAgingColVal, { color: '#dc2626' }]}>
                            {formatCurrency(cust.days120)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* ==================== TAB 3: DETAILED VIEW ==================== */}
            {activeTab === 'details' && (
              <View>
                <View style={styles.sectionCountRow}>
                  <Text style={styles.sectionCountText}>
                    Showing {filteredDetails.length} Invoice Documents
                  </Text>
                </View>

                {filteredDetails.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Ionicons name="document-text-outline" size={42} color="#cbd5e1" />
                    <Text style={styles.emptyTitle}>No Documents Found</Text>
                    <Text style={styles.emptySub}>No detailed invoice records found for this period.</Text>
                  </View>
                ) : (
                  filteredDetails.map((doc, idx) => (
                    <View key={doc.id || idx} style={styles.detailCard}>
                      <View style={styles.detailCardHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Ionicons name="receipt-outline" size={15} color="#645695" style={{ marginRight: 5 }} />
                          <Text style={styles.docRef}>{doc.documentReference}</Text>
                        </View>
                        <Badge
                          label={doc.documentType}
                          variant={
                            doc.documentType?.includes('Payment')
                              ? 'info'
                              : doc.documentType?.includes('Return')
                              ? 'danger'
                              : 'primary'
                          }
                          size="sm"
                        />
                      </View>

                      <Text style={styles.docCustName}>{doc.customerName}</Text>

                      <View style={styles.docDateRow}>
                        <Text style={styles.docDateText}>
                          Date: {formatDate(doc.documentDate)} | Due: {formatDate(doc.dueDate)}
                        </Text>
                        <Badge
                          label={doc.overdueDays > 0 ? `${doc.overdueDays}d overdue` : 'Current'}
                          variant={doc.overdueDays > 0 ? 'danger' : 'success'}
                          size="sm"
                        />
                      </View>

                      <View style={styles.docAmountDivider} />

                      <View style={styles.docAmountRow}>
                        <View>
                          <Text style={styles.docAmountLabel}>Doc Amount</Text>
                          <Text style={styles.docAmountVal}>{formatCurrency(doc.documentAmount)}</Text>
                        </View>
                        <View>
                          <Text style={styles.docAmountLabel}>Received</Text>
                          <Text style={[styles.docAmountVal, { color: '#16a34a' }]}>
                            {formatCurrency(doc.receivedAmount)}
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={styles.docAmountLabel}>Pending Balance</Text>
                          <Text style={[styles.docAmountVal, { color: '#dc2626', fontWeight: '800' }]}>
                            {formatCurrency(doc.pendingAmount)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* ==================== TAB 4: FOLLOW-UP REPORT ==================== */}
            {activeTab === 'followup' && (
              <View>
                {/* Follow-up Sub-Filters Pills */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.fupPillsRow}
                >
                  {(['All', 'Pending', 'Today', 'Missed', 'Completed', 'Promise to pay'] as FollowUpFilterType[]).map(
                    (filter) => (
                      <TouchableOpacity
                        key={filter}
                        style={[styles.fupPill, followUpFilter === filter && styles.fupPillActive]}
                        onPress={() => setFollowUpFilter(filter)}
                      >
                        <Text
                          style={[styles.fupPillText, followUpFilter === filter && styles.fupPillTextActive]}
                        >
                          {filter}
                        </Text>
                      </TouchableOpacity>
                    )
                  )}
                </ScrollView>

                {filteredFollowUps.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Ionicons name="call-outline" size={42} color="#cbd5e1" />
                    <Text style={styles.emptyTitle}>No Follow-Ups Found</Text>
                    <Text style={styles.emptySub}>No collection follow-ups match this status.</Text>
                  </View>
                ) : (
                  filteredFollowUps.map((fup: any, idx: number) => (
                    <View key={fup.followUpID || idx} style={styles.fupCard}>
                      <View style={styles.fupCardTop}>
                        <Text style={styles.fupLeadName}>{fup.leadName || 'Customer'}</Text>
                        <Badge
                          label={fup.status || 'Pending'}
                          variant={fup.status === 'Completed' ? 'success' : 'warning'}
                          size="sm"
                        />
                      </View>

                      <View style={styles.fupInfoRow}>
                        <Ionicons name="person-outline" size={13} color="#645695" />
                        <Text style={styles.fupInfoText}>{fup.performedBy || 'System'}</Text>
                        <Text style={{ color: '#cbd5e1', marginHorizontal: 6 }}>•</Text>
                        <Ionicons name="calendar-outline" size={13} color="#645695" />
                        <Text style={styles.fupInfoText}>{formatDate(fup.followUpDate)}</Text>
                      </View>

                      {fup.outcome ? (
                        <View style={styles.fupOutcomeBox}>
                          <Text style={styles.fupOutcomeLabel}>Outcome: </Text>
                          <Text style={styles.fupOutcomeVal}>{fup.outcome}</Text>
                        </View>
                      ) : null}

                      {fup.notes ? (
                        <Text style={styles.fupNotesText}>"{fup.notes}"</Text>
                      ) : null}

                      {fup.nextFollowUpDate && (
                        <View style={styles.fupNextDateRow}>
                          <Ionicons name="alarm-outline" size={13} color="#ea580c" />
                          <Text style={styles.fupNextDateText}>
                            Next Action: {formatDate(fup.nextFollowUpDate)}
                          </Text>
                        </View>
                      )}
                    </View>
                  ))
                )}
              </View>
            )}

            {/* ==================== TAB 5: BAD DEBT REPORT ==================== */}
            {activeTab === 'baddebt' && (
              <View>
                <View style={styles.sectionCountRow}>
                  <Text style={styles.sectionCountText}>
                    Showing {computedBadDebts.length} Risk Evaluated Accounts
                  </Text>
                </View>

                {computedBadDebts.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Ionicons name="shield-checkmark-outline" size={42} color="#16a34a" />
                    <Text style={styles.emptyTitle}>No Bad Debts</Text>
                    <Text style={styles.emptySub}>No high risk delinquent accounts found.</Text>
                  </View>
                ) : (
                  computedBadDebts.map((item: any, idx: number) => {
                    const isHigh = item.riskRating === 'High';
                    const isMed = item.riskRating === 'Medium';
                    return (
                      <View key={item.id || idx} style={styles.badDebtCard}>
                        <View style={styles.badDebtTop}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.badDebtName}>{item.name}</Text>
                            <Text style={styles.badDebtOverdueDays}>
                              Max Overdue: {item.maxOverdueDays} days past due
                            </Text>
                          </View>
                          <Badge
                            label={`${item.riskRating} Risk`}
                            variant={isHigh ? 'danger' : isMed ? 'warning' : 'success'}
                            size="sm"
                          />
                        </View>

                        <View style={styles.badDebtRow}>
                          <View>
                            <Text style={styles.badDebtLabel}>Total Outstanding</Text>
                            <Text style={styles.badDebtValue}>{formatCurrency(item.totalOutstanding)}</Text>
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.badDebtLabel}>Overdue Exposure</Text>
                            <Text style={[styles.badDebtValue, { color: '#dc2626' }]}>
                              {formatCurrency(item.totalOverdue)}
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Customer Selector Modal */}
      <LeadSelectorModal
        visible={leadModalVisible}
        leads={leadsList}
        selectedLeadId={selectedLead?.id}
        onClose={() => setLeadModalVisible(false)}
        onSelectLead={(lead) => {
          setSelectedLead(lead);
          setLeadModalVisible(false);
        }}
        title="Select Customer for Report"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  headerIconBtnActive: {
    backgroundColor: '#ede9fe',
    borderColor: '#645695',
  },
  filterPanel: {
    backgroundColor: '#ffffff',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 10,
  },
  filterInputCol: {
    flex: 1,
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  filterTextInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    color: '#1e293b',
  },
  leadSelectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  leadSelectorText: {
    flex: 1,
    fontSize: 13,
    color: '#1e293b',
    fontWeight: '500',
  },
  filterActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 10,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
  },
  resetBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#645695',
  },
  applyBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  tabsContainer: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tabsScroll: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  tabBtnActive: {
    backgroundColor: '#645695',
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  tabBtnTextActive: {
    color: '#ffffff',
  },
  searchBarWrapper: {
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#1e293b',
    padding: 0,
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 40,
  },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  kpiCard: {
    width: '48.4%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  kpiIconBox: {
    width: 26,
    height: 26,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 4,
  },
  kpiSub: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '500',
  },
  kpiBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardHeaderIconBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#ede9fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  sectionCardSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    marginBottom: 14,
  },
  agingRow: {
    marginBottom: 12,
  },
  agingTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  agingColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  agingLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e293b',
  },
  agingAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  progressBg: {
    height: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 3,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  agingSubTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  agingDaysSub: {
    fontSize: 10,
    color: '#94a3b8',
  },
  agingPercentSub: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
  },
  summaryTableHead: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  tableHeadCol: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  summaryTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  miniDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  tableRowText: {
    fontSize: 12,
    color: '#1e293b',
  },
  sectionCountRow: {
    marginBottom: 10,
  },
  sectionCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  customerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  customerCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  custAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ede9fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  custAvatarText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#645695',
  },
  customerName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  customerSr: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 1,
  },
  customerTotalAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 2,
  },
  custAgingGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 8,
    marginTop: 10,
  },
  custAgingCol: {
    alignItems: 'center',
  },
  custAgingColLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 2,
  },
  custAgingColVal: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1e293b',
  },
  detailCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  detailCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  docRef: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  docCustName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
  },
  docDateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  docDateText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  docAmountDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 8,
  },
  docAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  docAmountLabel: {
    fontSize: 10,
    color: '#94a3b8',
    marginBottom: 2,
  },
  docAmountVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e293b',
  },
  fupPillsRow: {
    gap: 8,
    marginBottom: 12,
  },
  fupPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  fupPillActive: {
    backgroundColor: '#645695',
    borderColor: '#645695',
  },
  fupPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  fupPillTextActive: {
    color: '#ffffff',
  },
  fupCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  fupCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  fupLeadName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  fupInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  fupInfoText: {
    fontSize: 11,
    color: '#64748b',
    marginLeft: 4,
  },
  fupOutcomeBox: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    padding: 6,
    borderRadius: 6,
    marginBottom: 6,
  },
  fupOutcomeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  fupOutcomeVal: {
    fontSize: 11,
    fontWeight: '600',
    color: '#645695',
  },
  fupNotesText: {
    fontSize: 12,
    color: '#334155',
    fontStyle: 'italic',
    marginBottom: 6,
  },
  fupNextDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fupNextDateText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ea580c',
  },
  badDebtCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#fee2e2',
    borderLeftWidth: 4,
    borderLeftColor: '#dc2626',
  },
  badDebtTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badDebtName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  badDebtOverdueDays: {
    fontSize: 11,
    color: '#dc2626',
    fontWeight: '600',
    marginTop: 2,
  },
  badDebtRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#fef2f2',
    padding: 8,
    borderRadius: 6,
  },
  badDebtLabel: {
    fontSize: 10,
    color: '#64748b',
    marginBottom: 2,
  },
  badDebtValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1e293b',
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 30,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
    marginTop: 8,
  },
  emptySub: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
    textAlign: 'center',
  },
});

export default OutstandingReportsScreen;
