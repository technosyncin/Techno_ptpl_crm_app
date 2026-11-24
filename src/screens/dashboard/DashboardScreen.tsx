import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useCompany } from '../../context/CompanyContext';
import { WebHeader } from '../../components/common/WebHeader';
import { CompanySelectorModal } from '../../components/common/CompanySelectorModal';
import { StatCard } from '../../components/common/StatCard';
import { LeadCard } from '../../components/cards/LeadCard';
import { Colors } from '../../theme/colors';
import { salesService, SalesDashboardMetrics, SalesFollowUp } from '../../api/salesService';
import { creditService, CreditDashboardMetrics, CreditFollowUp, CreditCustomer } from '../../api/creditService';
import { leadService, Lead } from '../../api/leadService';
import { messagingService } from '../../api/messagingService';
import { Linking } from 'react-native';

import { useMenu } from '../../context/MenuContext';

interface DashboardScreenProps {
  navigation: any;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ navigation }) => {
  const { user, logout } = useAuth();
  const { selectedCompanyId, selectedCompany, companies, isAllCompanies, loadingCompanies, isCompaniesInitialized } = useCompany();
  const {
    canAccessDashboard,
    canAccessSales,
    canAccessCredit,
    canAccessMyTasks,
    canAccessNotes,
    canAccessCRMInbox,
    canAccessReminders,
    canAccessActivities,
    loadingMenus,
    isMenusInitialized,
  } = useMenu();
  const [companyModalVisible, setCompanyModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'sales' | 'credit'>('sales');
  const [salesMetrics, setSalesMetrics] = useState<SalesDashboardMetrics | null>(null);
  const [creditMetrics, setCreditMetrics] = useState<CreditDashboardMetrics | null>(null);
  const [recentLeads, setRecentLeads] = useState<Lead[]>([]);
  const [followUps, setFollowUps] = useState<SalesFollowUp[]>([]);
  const [creditFollowUps, setCreditFollowUps] = useState<CreditFollowUp[]>([]);
  const [creditCustomers, setCreditCustomers] = useState<CreditCustomer[]>([]);

  const userRole = (user?.role || '').toLowerCase();
  const isAdmin = userRole.includes('admin') || userRole.includes('super');
  const userId = Number(user?.id || user?.userID);

  const userAny = user as any;
  const userCompanyIds = Array.isArray(userAny?.companyIds) ? userAny.companyIds : [];
  const hasAssignedCompany = isAdmin || companies.length > 0 || userCompanyIds.length > 0 || isAllCompanies;
  const hasNoCompany = !hasAssignedCompany;
  const isDashboardBlocked = !isAdmin && !canAccessDashboard;
  const isStillLoadingAccess = !isCompaniesInitialized || !isMenusInitialized || loadingCompanies || loadingMenus;
  const loadData = useCallback(async () => {
    if ((hasNoCompany || isDashboardBlocked) && !isStillLoadingAccess) {
      setSalesMetrics(null);
      setCreditMetrics(null);
      setRecentLeads([]);
      setFollowUps([]);
      setCreditFollowUps([]);
      setCreditCustomers([]);
      return;
    }

    try {
      const activeCompId = selectedCompanyId ?? 0;      
      const assignedToParam = !isAdmin && userId ? userId : undefined;

      const [sMetrics, cMetrics, leadsRes, fUps, crFollowUps, crCustomers] = await Promise.all([
        salesService.getSalesMetrics(activeCompId, assignedToParam).catch(() => null),
        creditService.getCreditMetrics(activeCompId).catch(() => null),
        leadService.getLeads({ companyId: activeCompId, pageSize: 50 }).catch(() => ({ data: [], total: 0, totalPages: 1 })),
        salesService.getSalesFollowUps(activeCompId, assignedToParam, isAdmin).catch(() => []),
        creditService.getCreditFollowUps({ companyId: activeCompId, pageSize: 50 }).catch(() => []),
        creditService.getCustomers(activeCompId).catch(() => []),
      ]);

      // Filter leads for non-admin: only show leads assigned to or created by user
      const rawLeads = leadsRes?.data || [];
      const filteredLeads = (!isAdmin && userId)
        ? rawLeads.filter((l: any) => {
            const assigned = l.assignedTo ? Number(l.assignedTo) : null;
            const created = l.createdBy ? Number(l.createdBy) : null;
            return assigned === userId || created === userId;
          })
        : rawLeads;
      setRecentLeads(filteredLeads);

      // Backend sales follow-ups only (100% dynamic from API & filtered by user)
      const mappedFollowUps: SalesFollowUp[] = (fUps || [])
        .filter((f: any) => {
          if (!isAdmin && userId) {
            const assigned = f.assignedTo ? Number(f.assignedTo) : null;
            const created = (f as any).createdBy ? Number((f as any).createdBy) : null;
            return assigned === userId || created === userId;
          }
          return true;
        })
        .map((f) => ({
          ...f,
          customerName: f.customerName || f.leadName || 'Customer',
          leadName: f.leadName || f.customerName || 'Lead',
        }));
      setFollowUps(mappedFollowUps);

      // Backend credit follow-ups & customers
      const mappedCrFollowUps: CreditFollowUp[] = (crFollowUps || [])
        .filter((cf: any) => {
          if (!isAdmin && userId) {
            const assigned = cf.assignedTo ? Number(cf.assignedTo) : null;
            const created = (cf as any).createdBy ? Number((cf as any).createdBy) : null;
            return assigned === userId || created === userId;
          }
          return true;
        })
        .map((cf: CreditFollowUp) => ({
          ...cf,
          customerName: cf.customerName || cf.leadName || 'Customer',
          companyName: cf.companyName || '',
        }));

      setCreditFollowUps(mappedCrFollowUps);
      setCreditCustomers(crCustomers || []);

      if (sMetrics) {
        setSalesMetrics(sMetrics);
      } else if (!isAdmin) {
        const activeLeadsCount = filteredLeads.filter((l: any) => (l.status || '').toLowerCase() === 'active').length;
        setSalesMetrics({
          totalLeads: filteredLeads.length,
          activeLeads: activeLeadsCount,
          convertedLeads: 0,
          lostLeads: 0,
          conversionRate: 0,
          totalPipelineValue: 0,
          wonValue: 0,
          todayFollowUps: mappedFollowUps.length,
          pendingTasks: 0,
        });
      }

      setCreditMetrics(cMetrics);
    } catch (err) {
      console.warn('Dashboard data load error:', err);
    }
  }, [selectedCompanyId, hasNoCompany, isDashboardBlocked, isAdmin, userId, canAccessSales, canAccessCredit]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reload when returning to dashboard screen
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const formatCurrency = (val?: number) => {
    if (val === undefined || val === null) return '₹0';
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
    if (val >= 1000) return `₹${(val / 1000).toFixed(1)} K`;
    return `₹${val.toLocaleString('en-IN')}`;
  };

  const formatFullCurrency = (val?: number) => {
    if (val === undefined || val === null || isNaN(Number(val))) return '₹0';
    return `₹${Number(val).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };

  const getLocalDateStr = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const todayStr = getLocalDateStr();

  const followUpsDueToday = useMemo(() => {
    return followUps.filter((item) => {
      const d = (item.nextFollowUpDate || item.followUpDate || '').replace('T', ' ').trim().split(' ')[0];
      return d === todayStr;
    });
  }, [followUps, todayStr]);

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
  const overdueAccounts = useMemo(() => {
    return (creditCustomers || [])
      .filter((c) => Number(c.overdueAmount || 0) > 0 || Number(c.outstandingBalance || 0) > 0)
      .sort((a, b) => Number(b.overdueAmount || b.outstandingBalance || 0) - Number(a.overdueAmount || a.outstandingBalance || 0));
  }, [creditCustomers]);

  const todayFollowUpsCount = salesMetrics?.todayFollowUps ?? followUpsDueToday.length;

  return (
    <View style={styles.container}>
      {/* Web CRM Header */}
      <WebHeader
        navigation={navigation}
        currentRoute="DashboardTab"
        showCompany={true}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
      >
        {isStillLoadingAccess && (hasNoCompany || isDashboardBlocked) ? (
          <View style={{ paddingVertical: 80, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : hasNoCompany ? (
          <View style={styles.restrictedCard}>
            <View style={[styles.restrictedIconBox, { backgroundColor: '#ede9fe' }]}>
              <Ionicons name="business" size={36} color="#645695" />
            </View>
            <Text style={styles.restrictedHeading}>No Company Assigned</Text>
            <Text style={styles.restrictedText}>
              Your user account has not been assigned to any company yet. In Techno CRM, data is only accessible once a company is assigned to your profile in User Master.
            </Text>
            <TouchableOpacity style={styles.restrictedReloadBtn} onPress={onRefresh}>
              <Ionicons name="refresh" size={16} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.restrictedReloadBtnText}>Check Again</Text>
            </TouchableOpacity>
          </View>
        ) : isDashboardBlocked ? (
          <View style={styles.restrictedCard}>
            <View style={[styles.restrictedIconBox, { backgroundColor: '#fee2e2' }]}>
              <Ionicons name="lock-closed" size={36} color="#ef4444" />
            </View>
            <Text style={styles.restrictedHeading}>Dashboard Access Restricted</Text>
            <Text style={styles.restrictedText}>
              Your account does not have permission to view Dashboard metrics. Please contact your CRM administrator to grant access in User Permission.
            </Text>
            <TouchableOpacity style={styles.restrictedReloadBtn} onPress={onRefresh}>
              <Ionicons name="refresh" size={16} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.restrictedReloadBtnText}>Check Again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Activities Module Quick Actions - strictly permission-wise */}
            {canAccessActivities && (
              <View style={styles.quickActionsContainer}>
                {canAccessMyTasks && (
                  <TouchableOpacity
                    style={styles.quickActionCard}
                    onPress={() => navigation.navigate('MyTasks')}
                  >
                    <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(100, 86, 149, 0.12)' }]}>
                      <Ionicons name="checkbox-outline" size={20} color="#645695" />
                    </View>
                    <Text style={styles.quickActionLabel}>My Task</Text>
                  </TouchableOpacity>
                )}

                {canAccessNotes && (
                  <TouchableOpacity
                    style={styles.quickActionCard}
                    onPress={() => navigation.navigate('Notes')}
                  >
                    <View style={[styles.quickActionIcon, { backgroundColor: '#fef3c7' }]}>
                      <Ionicons name="document-text-outline" size={20} color="#d97706" />
                    </View>
                    <Text style={styles.quickActionLabel}>Notes</Text>
                  </TouchableOpacity>
                )}

                {canAccessCRMInbox && (
                  <TouchableOpacity
                    style={styles.quickActionCard}
                    onPress={() => navigation.navigate('InternalChat')}
                  >
                    <View style={[styles.quickActionIcon, { backgroundColor: '#dcfce7' }]}>
                      <Ionicons name="chatbubbles-outline" size={20} color="#16a34a" />
                    </View>
                    <Text style={styles.quickActionLabel}>CRM Inbox</Text>
                  </TouchableOpacity>
                )}

                {canAccessReminders && (
                  <TouchableOpacity
                    style={styles.quickActionCard}
                    onPress={() => navigation.navigate('Reminder')}
                  >
                    <View style={[styles.quickActionIcon, { backgroundColor: '#ede9fe' }]}>
                      <Ionicons name="alarm-outline" size={20} color="#7c3aed" />
                    </View>
                    <Text style={styles.quickActionLabel}>Reminder</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Dashboard Switcher Tabs (Sales vs Credit) */}
            <View style={styles.tabSwitcher}>
                <TouchableOpacity
                  style={[styles.switchTab, activeTab === 'sales' ? styles.switchTabActive : null]}
                  onPress={() => setActiveTab('sales')}
                >
                  <Ionicons
                    name="trending-up"
                    size={16}
                    color={activeTab === 'sales' ? Colors.primaryDark : Colors.slate500}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.switchTabText,
                      activeTab === 'sales' ? styles.switchTabTextActive : null,
                    ]}
                  >
                    Sales Overview
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.switchTab, activeTab === 'credit' ? styles.switchTabActive : null]}
                  onPress={() => setActiveTab('credit')}
                >
                  <Ionicons
                    name="wallet"
                    size={16}
                    color={activeTab === 'credit' ? Colors.primaryDark : Colors.slate500}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.switchTabText,
                      activeTab === 'credit' ? styles.switchTabTextActive : null,
                    ]}
                  >
                    Credit & Recovery
                  </Text>
                </TouchableOpacity>
              </View>

            {/* Sales Overview Metrics */}
            {activeTab === 'sales' && (
              <View style={styles.statsGrid}>
                <StatCard
                  title="Leads"
                  value={String(salesMetrics?.totalLeads ?? 0)}
                  icon="funnel"
                  color={Colors.primary}
                  subtitle={`${salesMetrics?.activeLeads ?? 0} Active pipeline`}
                  onPress={() => navigation.navigate('LeadsList')}
                />
                <StatCard
                  title="Quotations"
                  value={formatFullCurrency(salesMetrics?.quotationsValue ?? salesMetrics?.totalPipelineValue)}
                  icon="document-text"
                  color="#0284c7"
                  subtitle={`${salesMetrics?.totalQuotations ?? salesMetrics?.quotationsSent ?? 0} All Quotations`}
                  onPress={() => navigation.navigate('Quotations')}
                />
                <StatCard
                  title="Follow-ups"
                  value={String(todayFollowUpsCount)}
                  icon="time"
                  color="#d97706"
                  subtitle="Pending calls today"
                  onPress={() => navigation.navigate('SalesFollowUp')}
                />
                {canAccessMyTasks && (
                  <StatCard
                    title="Tasks Pending"
                    value={String(salesMetrics?.pendingTasks ?? 0)}
                    icon="checkbox"
                    color="#645695"
                    subtitle="Assigned to you"
                    onPress={() => navigation.navigate('MyTasks')}
                  />
                )}
              </View>
            )}

            {/* Credit Overview Metrics */}
            {activeTab === 'credit' && (
              <View style={styles.statsGrid}>
                <StatCard
                  title="Outstanding"
                  value={formatFullCurrency(creditMetrics?.totalOutstanding)}
                  icon="wallet"
                  color="#dc2626"
                  subtitle="Receivables ledger"
                  onPress={() => navigation.navigate('CreditFollowUp')}
                />
                <StatCard
                  title="Overdue"
                  value={formatFullCurrency(creditMetrics?.totalOverdue)}
                  icon="alert-circle"
                  color="#ea580c"
                  subtitle="Past due date"
                  onPress={() => navigation.navigate('CreditFollowUp')}
                />
                <StatCard
                  title="Collection"
                  value={formatFullCurrency(creditMetrics?.collectedThisMonth)}
                  icon="checkmark-circle"
                  color="#16a34a"
                  subtitle={
                    creditMetrics?.targetCollection && creditMetrics.targetCollection > 0
                      ? `Target: ${formatFullCurrency(creditMetrics.targetCollection)}`
                      : 'Monthly collection'
                  }
                  onPress={() => navigation.navigate('CreditFollowUp')}
                />
                <StatCard
                  title="Customers"
                  value={String(creditMetrics?.totalCustomers ?? creditCustomers.length ?? 0)}
                  icon="people"
                  color={Colors.primary}
                  subtitle={`${
                    creditMetrics?.highRiskCustomers !== undefined
                      ? creditMetrics.highRiskCustomers
                      : creditCustomers.filter((c) => c.riskRating?.toLowerCase() === 'high').length
                  } High risk`}
                  onPress={() => navigation.navigate('CreditFollowUp')}
                />
              </View>
            )}

            {/* Dynamic Sections Based on Active Tab */}
            {activeTab === 'sales' ? (
          <>
            {/* Today's Follow-Ups Section (Max 5 on Dashboard) */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.sectionTitle}>Today's Follow-Ups</Text>
                  {followUpsDueToday.length > 0 && (
                    <View style={styles.countBadge}>
                      <Text style={styles.countBadgeText}>{followUpsDueToday.length}</Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.viewAllHeaderBtn}
                  onPress={() => navigation.navigate('SalesFollowUp')}
                >
                  <Text style={styles.seeAllText}>View All</Text>
                  <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
                </TouchableOpacity>
              </View>

              {followUpsDueToday.length > 0 ? (
                <>
                  {followUpsDueToday.slice(0, 5).map((item) => {
                    const phone = item.phone || item.mobileNo;
                    const custName = item.customerName || item.leadName || 'Customer';
                    return (
                      <TouchableOpacity
                        key={String(item.followUpID || item.leadID)}
                        style={styles.followUpCard}
                        activeOpacity={0.85}
                        onPress={() => navigation.navigate('SalesFollowUp')}
                      >
                        <View style={styles.followUpLeft}>
                          <View style={styles.followUpIcon}>
                            <Ionicons name="call" size={18} color={Colors.primary} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.followUpName} numberOfLines={1}>{custName}</Text>
                            {item.companyName && item.companyName !== custName ? (
                              <Text style={styles.followUpCompany} numberOfLines={1}>
                                {item.companyName}
                              </Text>
                            ) : null}
                            <Text style={styles.followUpPurpose} numberOfLines={1}>
                              {item.callPurpose || 'Follow-up'} • {item.followUpTime || '10:00 AM'}
                            </Text>
                          </View>
                        </View>

                            {phone ? (
                              <View style={styles.followUpActionGroup}>
                                 <TouchableOpacity
                                  style={[styles.callActionButton, { backgroundColor: '#25D366' }]}
                                  onPress={(event) => {
                                  event.stopPropagation();
                                  openWhatsApp(phone);
                                }}
                                >
                                  <Ionicons name="logo-whatsapp" size={15} color="#ffffff" />
                                </TouchableOpacity>
                              </View>
                            ) : null}
                      </TouchableOpacity>
                    );
                  })}

                  {followUpsDueToday.length > 5 && (
                    <TouchableOpacity
                      style={styles.viewAllFooterBtn}
                      onPress={() => navigation.navigate('SalesFollowUp')}
                    >
                      <Text style={styles.viewAllFooterText}>
                        View All {followUpsDueToday.length} Follow-Ups
                      </Text>
                      <Ionicons name="arrow-forward" size={15} color={Colors.primary} />
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                <View style={styles.emptyLeadsBox}>
                  <Text style={styles.emptyLeadsText}>No follow-ups due today</Text>
                </View>
              )}
            </View>

            {/* Recent Leads Section (Max 5 on Dashboard) */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.sectionTitle}>Recent Leads</Text>
                  {recentLeads.length > 0 && (
                    <View style={styles.countBadge}>
                      <Text style={styles.countBadgeText}>{recentLeads.length}</Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.viewAllHeaderBtn}
                  onPress={() => navigation.navigate('LeadsList')}
                >
                  <Text style={styles.seeAllText}>View All</Text>
                  <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
                </TouchableOpacity>
              </View>

              {recentLeads.length > 0 ? (
                <>
                  {recentLeads.slice(0, 5).map((lead) => (
                    <LeadCard
                      key={lead.leadID}
                      lead={lead}
                      onPress={() => navigation.navigate('LeadDetails', { leadId: lead.leadID })}
                      onEdit={() => navigation.navigate('AddLead', { editLead: lead })}
                      onCall={() => lead.mobileNo && messagingService.makePhoneCall(lead.mobileNo)}
                      onWhatsApp={() => lead.mobileNo && openWhatsApp(lead.mobileNo)}/>))}
                  {recentLeads.length > 5 && (
                    <TouchableOpacity
                      style={styles.viewAllFooterBtn}
                      onPress={() => navigation.navigate('LeadsList')}
                    >
                      <Text style={styles.viewAllFooterText}>
                        View All {recentLeads.length} Leads
                      </Text>
                      <Ionicons name="arrow-forward" size={15} color={Colors.primary} />
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                <View style={styles.emptyLeadsBox}>
                  <Text style={styles.emptyLeadsText}>No leads found for this company</Text>
                </View>
              )}
            </View>
          </>
        ) : (
          <>
            {/* Credit & Recovery Follow-Ups Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.sectionTitle}>Recovery Follow-Ups</Text>
                  {creditFollowUps.length > 0 && (
                    <View style={styles.countBadge}>
                      <Text style={styles.countBadgeText}>{creditFollowUps.length}</Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.viewAllHeaderBtn}
                  onPress={() => navigation.navigate('CreditFollowUp')}
                >
                  <Text style={styles.seeAllText}>View All</Text>
                  <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
                </TouchableOpacity>
              </View>

              {creditFollowUps.length > 0 ? (
                <>
                  {creditFollowUps.slice(0, 5).map((item, idx) => {
                    const phone = item.phone || item.mobileNo;
                    const custName = item.customerName || item.leadName || 'Customer';
                    const bal = item.outstandingBalance || item.promisedAmount || 0;
                    return (
                      <TouchableOpacity
                        key={String(item.followUpID || idx)}
                        style={styles.followUpCard}
                        activeOpacity={0.85}
                        onPress={() => navigation.navigate('CreditFollowUp')}
                      >
                        <View style={styles.followUpLeft}>
                          <View style={[styles.followUpIcon, { backgroundColor: '#fee2e2' }]}>
                            <Ionicons name="cash-outline" size={18} color={Colors.danger} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.followUpName} numberOfLines={1}>{custName}</Text>
                            {item.companyName && item.companyName !== custName 
                            ? (
                              <Text style={styles.followUpCompany} numberOfLines={1}>
                                {item.companyName}
                              </Text>
                            ) : null}
                            <Text style={[styles.followUpPurpose, { color: Colors.danger, fontWeight: '600' }]} numberOfLines={1}>
                              Due: {formatFullCurrency(bal)} • {item.outcome || 'Pending Payment'}
                            </Text>
                          </View>
                        </View>

                        {phone ? (
                          <View style={styles.followUpActionGroup}>
                            <TouchableOpacity
                              style={[styles.callActionButton, { backgroundColor: '#25D366' }]}
                             onPress={() => openWhatsApp(phone)}                           >
                              <Ionicons name="logo-whatsapp" size={15} color="#ffffff" />
                            </TouchableOpacity>
                          </View>
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}

                  {creditFollowUps.length > 5 && (
                    <TouchableOpacity
                      style={styles.viewAllFooterBtn}
                      onPress={() => navigation.navigate('CreditFollowUp')}
                    >
                      <Text style={styles.viewAllFooterText}>
                        View All {creditFollowUps.length} Recovery Follow-Ups
                      </Text>
                      <Ionicons name="arrow-forward" size={15} color={Colors.primary} />
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                <View style={styles.emptyLeadsBox}>
                  <Text style={styles.emptyLeadsText}>No recovery follow-ups found</Text>
                </View>
              )}
            </View>

            {/* Overdue Accounts / Top Outstanding Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.sectionTitle}>Overdue Accounts</Text>
                  {overdueAccounts.length > 0 && (
                    <View style={styles.countBadge}>
                      <Text style={styles.countBadgeText}>{overdueAccounts.length}</Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.viewAllHeaderBtn}
                  onPress={() => navigation.navigate('CreditFollowUp')}
                >
                  <Text style={styles.seeAllText}>View All</Text>
                  <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
                </TouchableOpacity>
              </View>

              {overdueAccounts.length > 0 ? (
                <>
                  {overdueAccounts.slice(0, 5).map((cust, idx) => {
                    const phone = cust.mobileNo || cust.referenceMobileNumber;
                    const custName = cust.customerName || cust.companyName || 'Customer';
                    const isHigh = (cust.overdueAmount && cust.overdueAmount > 0) || cust.riskRating === 'High';
                    return (
                      <TouchableOpacity
                        key={String(cust.customerId || cust.creditProfileID || idx)}
                        style={styles.followUpCard}
                        activeOpacity={0.85}
                        onPress={() => navigation.navigate('CreditFollowUp')}
                      >
                        <View style={styles.followUpLeft}>
                          <View style={[styles.followUpIcon, { backgroundColor: isHigh ? '#fef2f2' : '#f0fdf4' }]}>
                            <Ionicons
                              name={isHigh ? 'alert-circle' : 'shield-checkmark'}
                              size={18}
                              color={isHigh ? Colors.danger : Colors.success}
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.followUpName} numberOfLines={1}>{custName}</Text>
                            <Text style={styles.followUpCompany} numberOfLines={1}>
                              Outstanding: {formatFullCurrency(cust.outstandingBalance || 0)}
                            </Text>
                            <Text style={[styles.followUpPurpose, { color: isHigh ? Colors.danger : Colors.slate500 }]} numberOfLines={1}>
                              Overdue: {formatFullCurrency(cust.overdueAmount || 0)} • {cust.riskRating || 'Active'}
                            </Text>
                          </View>
                        </View>

                        {phone ? (
                          <View style={styles.followUpActionGroup}>
                            <TouchableOpacity
                              style={styles.callActionButton}
                              onPress={() => messagingService.makePhoneCall(phone)}
                            >
                              <Ionicons name="call" size={15} color="#ffffff" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.callActionButton, { backgroundColor: '#25D366' }]}
                               onPress={() => openWhatsApp(phone)}                            >
                              <Ionicons name="logo-whatsapp" size={15} color="#ffffff" />
                            </TouchableOpacity>
                          </View>
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}

                  {overdueAccounts.length > 5 && (
                    <TouchableOpacity
                      style={styles.viewAllFooterBtn}
                      onPress={() => navigation.navigate('CreditFollowUp')}
                    >
                      <Text style={styles.viewAllFooterText}>
                        View All {overdueAccounts.length} Overdue Accounts
                      </Text>
                      <Ionicons name="arrow-forward" size={15} color={Colors.primary} />
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                <View style={styles.emptyLeadsBox}>
                  <Text style={styles.emptyLeadsText}>No overdue accounts found</Text>
                </View>
              )}
            </View>
          </>
        )}
          </>
        )}

     </ScrollView>

{/* Global Company Selector Modal */}
<CompanySelectorModal
  visible={companyModalVisible}
  onClose={() => setCompanyModalVisible(false)}
/>
</View>
);
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  webWelcomeCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  webWelcomeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  welcomeTextGroup: {
    flex: 1,
  },
  welcomeGreeting: {
    fontSize: 12,
    color: Colors.slate500,
    fontWeight: '500',
  },
  welcomeName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.slate900,
    marginTop: 2,
  },
  welcomeBadge: {
    backgroundColor: Colors.primaryMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.2)',
  },
  welcomeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
  },
  welcomeMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: Colors.slate100,
  },
  welcomeMeta: {
    fontSize: 12,
    color: Colors.slate600,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: Colors.border,
    elevation: 1,
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.slate800,
    textAlign: 'center',
  },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: Colors.slate200,
    borderRadius: 10,
    padding: 3,
    marginBottom: 16,
  },
  switchTab: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  switchTabActive: {
    backgroundColor: Colors.surface,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  switchTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.slate600,
  },
  switchTabTextActive: {
    color: Colors.primaryDark,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginBottom: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.slate900,
  },
  countBadge: {
    backgroundColor: Colors.primaryMuted,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  viewAllHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  viewAllFooterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 4,
    marginBottom: 6,
  },
  viewAllFooterText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  followUpCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  followUpLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  followUpIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  followUpName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.slate900,
  },
  followUpCompany: {
    fontSize: 12,
    color: Colors.slate600,
    marginTop: 1,
  },
  followUpPurpose: {
    fontSize: 12,
    color: Colors.slate500,
    marginTop: 2,
  },
  followUpActionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  callActionButton: {
    backgroundColor: Colors.success,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyLeadsBox: {
    padding: 24,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyLeadsText: {
    color: Colors.slate400,
    fontSize: 14,
  },
  reportsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  reportItem: {
    flex: 1,
    backgroundColor: Colors.surface,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    marginHorizontal: 3,
  },
  reportLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.slate700,
    marginTop: 6,
    textAlign: 'center',
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
