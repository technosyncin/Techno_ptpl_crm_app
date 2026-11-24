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
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/common/Header';
import { Badge } from '../../components/common/Badge';
import { visitService, VisitRecord, CreateVisitPayload } from '../../api/visitService';
import { leadService } from '../../api/leadService';
import { useCompany } from '../../context/CompanyContext';
import { LeadSelectorModal, LeadOption } from '../../components/modals/LeadSelectorModal';

interface VisitReportScreenProps {
  navigation: any;
}

type OutcomeFilterType = 'All' | 'Interested' | 'Follow-up Needed' | 'Closed Won' | 'Not Interested';
type SourceFilterType = 'all' | 'Sales' | 'Credit';

export const VisitReportScreen: React.FC<VisitReportScreenProps> = ({ navigation }) => {
  const { selectedCompanyId, selectedCompany } = useCompany();

  const [visits, setVisits] = useState<VisitRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState<OutcomeFilterType>('All');
  const [sourceFilter, setSourceFilter] = useState<SourceFilterType>('all');

  // Modal for Add / Edit Visit
  const [modalVisible, setModalVisible] = useState(false);
  const [editingVisit, setEditingVisit] = useState<VisitRecord | null>(null);
  const [saving, setSaving] = useState(false);

  // Form Fields
  const [formLeadName, setFormLeadName] = useState('');
  const [formExecutiveName, setFormExecutiveName] = useState('System Admin');
  const [formVisitDate, setFormVisitDate] = useState(new Date().toISOString().slice(0, 16));
  const [formLocation, setFormLocation] = useState('');
  const [formPurpose, setFormPurpose] = useState('Visit');
  const [formOutcome, setFormOutcome] = useState('Interested');
  const [formNotes, setFormNotes] = useState('');
  const [formNextFollowUp, setFormNextFollowUp] = useState('');

  // Leads selector
  const [leadModalVisible, setLeadModalVisible] = useState(false);
  const [leadsList, setLeadsList] = useState<LeadOption[]>([]);

  // Load Leads for modal dropdown
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
          }));
          setLeadsList(opts);
        }
      } catch (err) {
        console.warn('Error loading leads:', err);
      }
    };
    fetchLeads();
  }, [selectedCompanyId]);

  // Load Visits from API
  const loadVisits = useCallback(async () => {
    const compId = selectedCompanyId ? Number(selectedCompanyId) : 10;
    setLoading(true);
    try {
      const data = await visitService.getVisits(compId);
      if (data && data.visits && Array.isArray(data.visits)) {
        setVisits(data.visits);
      } else {
        setVisits([]);
      }
    } catch (e) {
      console.warn('Error loading visits:', e);
      setVisits([]);
    } finally {
      setLoading(false);
    }
  }, [selectedCompanyId]);

  useEffect(() => {
    loadVisits();
  }, [loadVisits]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadVisits();
    setRefreshing(false);
  };

  // Open Add Visit Modal
  const handleOpenAdd = () => {
    setEditingVisit(null);
    setFormLeadName('');
    setFormExecutiveName('System Admin');
    setFormVisitDate(new Date().toISOString().slice(0, 16));
    setFormLocation('');
    setFormPurpose('Visit');
    setFormOutcome('Interested');
    setFormNotes('');
    setFormNextFollowUp('');
    setModalVisible(true);
  };

  // Open Edit Visit Modal
  const handleOpenEdit = (v: VisitRecord) => {
    setEditingVisit(v);
    setFormLeadName(v.leadName || '');
    setFormExecutiveName(v.executiveName || 'System Admin');
    setFormVisitDate(v.visitDate || new Date().toISOString().slice(0, 16));
    setFormLocation(v.location || '');
    setFormPurpose(v.purpose || 'Visit');
    setFormOutcome(v.outcome || 'Interested');
    setFormNotes(v.notes || '');
    setFormNextFollowUp(v.nextFollowUp || '');
    setModalVisible(true);
  };

  // Delete Visit
  const handleDelete = (v: VisitRecord) => {
    Alert.alert(
      'Delete Visit',
      `Are you sure you want to delete the visit record for ${v.leadName || 'this customer'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await visitService.deleteVisit(v.id, v.sourceType || 'Sales');
              loadVisits();
            } catch (err) {
              Alert.alert('Error', 'Failed to delete visit record.');
            }
          },
        },
      ]
    );
  };

  // Save Visit
  const handleSaveVisit = async () => {
    if (!formLeadName.trim()) {
      Alert.alert('Validation', 'Please enter or select Customer / Lead Name.');
      return;
    }

    setSaving(true);
    try {
      const payload: CreateVisitPayload = {
        companyID: selectedCompanyId ? Number(selectedCompanyId) : 10,
        leadName: formLeadName.trim(),
        executiveName: formExecutiveName.trim(),
        visitDate: formVisitDate,
        location: formLocation.trim(),
        purpose: formPurpose,
        outcome: formOutcome,
        notes: formNotes.trim(),
        nextFollowUp: formNextFollowUp ? formNextFollowUp : undefined,
        sourceType: editingVisit?.sourceType || 'Sales',
      };

      if (editingVisit) {
        await visitService.updateVisit(editingVisit.id, payload);
      } else {
        await visitService.createVisit(payload);
      }

      setModalVisible(false);
      loadVisits();
    } catch (err) {
      Alert.alert('Error', 'Failed to save visit record.');
    } finally {
      setSaving(false);
    }
  };

  // KPI Calculations
  const totalCount = visits.length;
  const salesCount = visits.filter((v) => v.sourceType === 'Sales').length;
  const creditCount = visits.filter((v) => v.sourceType === 'Credit').length;
  const positiveCount = visits.filter((v) => {
    const o = (v.outcome || '').toLowerCase();
    return o.includes('interested') || o.includes('won') || o.includes('paid') || o.includes('positive') || o.includes('success');
  }).length;

  // Filtered Visits
  const filteredVisits = useMemo(() => {
    return visits.filter((v) => {
      // Source filter
      if (sourceFilter !== 'all' && v.sourceType !== sourceFilter) return false;

      // Outcome filter
      if (outcomeFilter !== 'All') {
        const o = (v.outcome || '').toLowerCase();
        if (outcomeFilter === 'Interested' && !o.includes('interested')) return false;
        if (outcomeFilter === 'Follow-up Needed' && !o.includes('follow')) return false;
        if (outcomeFilter === 'Closed Won' && !o.includes('won') && !o.includes('paid')) return false;
        if (outcomeFilter === 'Not Interested' && !o.includes('not interested')) return false;
      }

      // Search
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const clientMatch = (v.leadName || '').toLowerCase().includes(q);
        const execMatch = (v.executiveName || '').toLowerCase().includes(q);
        const locMatch = (v.location || '').toLowerCase().includes(q);
        const notesMatch = (v.notes || '').toLowerCase().includes(q);
        const purpMatch = (v.purpose || '').toLowerCase().includes(q);
        if (!clientMatch && !execMatch && !locMatch && !notesMatch && !purpMatch) return false;
      }

      return true;
    });
  }, [visits, sourceFilter, outcomeFilter, search]);

  const formatDateDisplay = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return String(dateStr);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return String(dateStr);
    }
  };

  const getOutcomeBadgeProps = (outcome?: string) => {
    const lower = (outcome || '').toLowerCase();
    if (lower.includes('won') || lower.includes('paid') || lower.includes('success')) {
      return { variant: 'success' as const, label: outcome || 'Won' };
    }
    if (lower.includes('interested') || lower.includes('positive')) {
      return { variant: 'primary' as const, label: outcome || 'Interested' };
    }
    if (lower.includes('follow') || lower.includes('pending')) {
      return { variant: 'warning' as const, label: outcome || 'Follow-up' };
    }
    if (lower.includes('not interested') || lower.includes('lost')) {
      return { variant: 'danger' as const, label: outcome || 'Not Interested' };
    }
    return { variant: 'slate' as const, label: outcome || 'General' };
  };

  return (
    <View style={styles.container}>
      {/* Top Navbar */}
      <Header
        title="Visit Report"
        showBack
        onBack={() => navigation.goBack()}
        subtitle={selectedCompany ? `${selectedCompany.companyName} | Client Visits` : 'Field Client Visits & Logs'}
        rightComponent={
          <View style={styles.headerRightRow}>
            <TouchableOpacity style={styles.headerAddBtn} onPress={handleOpenAdd}>
              <Ionicons name="add" size={16} color="#ffffff" />
              <Text style={styles.headerAddBtnText}>Add Visit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerIconBtn} onPress={onRefresh}>
              <Ionicons name="refresh" size={18} color="#475569" />
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#645695']} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* 4 Web KPI Cards */}
        <View style={styles.kpiGrid}>
          <View style={[styles.kpiCard, { borderLeftColor: '#645695' }]}>
            <Text style={styles.kpiLabel}>Total Visits</Text>
            <Text style={styles.kpiValue}>{totalCount}</Text>
            <Text style={styles.kpiSub}>Total logged</Text>
          </View>

          <View style={[styles.kpiCard, { borderLeftColor: '#8b5cf6' }]}>
            <Text style={styles.kpiLabel}>Sales Follow-up</Text>
            <Text style={[styles.kpiValue, { color: '#8b5cf6' }]}>{salesCount}</Text>
            <Text style={styles.kpiSub}>Sales visits</Text>
          </View>

          <View style={[styles.kpiCard, { borderLeftColor: '#f59e0b' }]}>
            <Text style={styles.kpiLabel}>Credit Recovery</Text>
            <Text style={[styles.kpiValue, { color: '#f59e0b' }]}>{creditCount}</Text>
            <Text style={styles.kpiSub}>Recovery visits</Text>
          </View>

          <View style={[styles.kpiCard, { borderLeftColor: '#10b981' }]}>
            <Text style={styles.kpiLabel}>Positive / Won</Text>
            <Text style={[styles.kpiValue, { color: '#10b981' }]}>{positiveCount}</Text>
            <Text style={styles.kpiSub}>High interest</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color="#94a3b8" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by client, executive, location, notes..."
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color="#94a3b8" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Source Segment Filter: All | Sales | Credit */}
        <View style={styles.sourceSegmentRow}>
          <TouchableOpacity
            style={[styles.sourceSegmentBtn, sourceFilter === 'all' && styles.sourceSegmentBtnActive]}
            onPress={() => setSourceFilter('all')}
          >
            <Text
              style={[
                styles.sourceSegmentText,
                sourceFilter === 'all' && styles.sourceSegmentTextActive,
              ]}
            >
              All Types ({totalCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sourceSegmentBtn, sourceFilter === 'Sales' && styles.sourceSegmentBtnActive]}
            onPress={() => setSourceFilter('Sales')}
          >
            <Text
              style={[
                styles.sourceSegmentText,
                sourceFilter === 'Sales' && styles.sourceSegmentTextActive,
              ]}
            >
              Sales ({salesCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sourceSegmentBtn, sourceFilter === 'Credit' && styles.sourceSegmentBtnActive]}
            onPress={() => setSourceFilter('Credit')}
          >
            <Text
              style={[
                styles.sourceSegmentText,
                sourceFilter === 'Credit' && styles.sourceSegmentTextActive,
              ]}
            >
              Credit ({creditCount})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Outcome Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.outcomePillsRow}>
          {(['All', 'Interested', 'Follow-up Needed', 'Closed Won', 'Not Interested'] as OutcomeFilterType[]).map(
            (outcome) => (
              <TouchableOpacity
                key={outcome}
                style={[styles.outcomePill, outcomeFilter === outcome && styles.outcomePillActive]}
                onPress={() => setOutcomeFilter(outcome)}
              >
                <Text
                  style={[
                    styles.outcomePillText,
                    outcomeFilter === outcome && styles.outcomePillTextActive,
                  ]}
                >
                  {outcome}
                </Text>
              </TouchableOpacity>
            )
          )}
        </ScrollView>

        {/* Header List Summary */}
        <View style={styles.listHeaderRow}>
          <Text style={styles.listHeading}>Visit Logs</Text>
          <Text style={styles.listSubheading}>{filteredVisits.length} records</Text>
        </View>

        {/* Loading Indicator */}
        {loading && !refreshing ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#645695" />
            <Text style={styles.loadingText}>Loading visit records...</Text>
          </View>
        ) : filteredVisits.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="location-outline" size={42} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No Visits Found</Text>
            <Text style={styles.emptySub}>No field visit records match the selected filters.</Text>
          </View>
        ) : (
          filteredVisits.map((v, idx) => {
            const outcomeBadge = getOutcomeBadgeProps(v.outcome);
            const isCredit = v.sourceType === 'Credit';

            return (
              <View key={v.id || idx} style={styles.visitCard}>
                {/* Card Top: Date & Source Badge */}
                <View style={styles.cardTopRow}>
                  <View style={styles.dateBadge}>
                    <Ionicons name="calendar" size={12} color="#645695" style={{ marginRight: 4 }} />
                    <Text style={styles.dateBadgeText}>{formatDateDisplay(v.visitDate)}</Text>
                  </View>

                  <View style={styles.cardTopRight}>
                    <Badge
                      label={isCredit ? 'Credit Recovery' : 'Sales Follow-up'}
                      variant={isCredit ? 'warning' : 'primary'}
                      size="sm"
                    />
                    <Badge
                      label={outcomeBadge.label}
                      variant={outcomeBadge.variant}
                      size="sm"
                    />
                  </View>
                </View>

                {/* Client / Lead Name */}
                <Text style={styles.clientName}>{v.leadName || 'Client'}</Text>

                {/* Executive / Performed By */}
                <View style={styles.infoRow}>
                  <Ionicons name="person" size={13} color="#645695" style={{ marginRight: 5 }} />
                  <Text style={styles.infoLabel}>Executive:</Text>
                  <Text style={styles.infoValue}>{v.executiveName || 'System Admin'}</Text>
                </View>

                {/* Location */}
                <View style={styles.infoRow}>
                  <Ionicons name="location" size={13} color="#ea580c" style={{ marginRight: 5 }} />
                  <Text style={styles.infoLabel}>Location:</Text>
                  <Text style={styles.infoValue}>{v.location || 'On-site Location'}</Text>
                </View>

                {/* Purpose */}
                <View style={styles.infoRow}>
                  <Ionicons name="briefcase" size={13} color="#0284c7" style={{ marginRight: 5 }} />
                  <Text style={styles.infoLabel}>Purpose:</Text>
                  <Text style={styles.infoValue}>{v.purpose || 'Client Visit'}</Text>
                </View>

                {/* Discussion Notes */}
                {v.notes ? (
                  <View style={styles.notesBox}>
                    <Text style={styles.notesLabel}>Discussion Notes:</Text>
                    <Text style={styles.notesText}>{v.notes}</Text>
                  </View>
                ) : null}

                {/* Next Follow-up Date */}
                {v.nextFollowUp ? (
                  <View style={styles.nextDateRow}>
                    <Ionicons name="alarm-outline" size={13} color="#16a34a" style={{ marginRight: 4 }} />
                    <Text style={styles.nextDateText}>
                      Next Follow-up: {formatDateDisplay(v.nextFollowUp)}
                    </Text>
                  </View>
                ) : null}

                {/* Actions: Edit & Delete */}
                <View style={styles.cardActionsRow}>
                  <TouchableOpacity
                    style={styles.cardActionBtn}
                    onPress={() => handleOpenEdit(v)}
                  >
                    <Ionicons name="create-outline" size={14} color="#645695" style={{ marginRight: 4 }} />
                    <Text style={styles.cardActionBtnText}>Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.cardActionBtn, { borderColor: '#fee2e2' }]}
                    onPress={() => handleDelete(v)}
                  >
                    <Ionicons name="trash-outline" size={14} color="#dc2626" style={{ marginRight: 4 }} />
                    <Text style={[styles.cardActionBtnText, { color: '#dc2626' }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Add / Edit Visit Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingVisit ? 'Edit Visit Record' : 'Log New Visit'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close-circle" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {/* Customer / Lead */}
              <Text style={styles.formLabel}>Customer / Lead Name *</Text>
              <TouchableOpacity
                style={styles.formLeadSelector}
                onPress={() => setLeadModalVisible(true)}
              >
                <Ionicons name="business" size={16} color="#645695" style={{ marginRight: 6 }} />
                <Text style={styles.formLeadSelectorText} numberOfLines={1}>
                  {formLeadName || 'Select Customer (or type below)'}
                </Text>
              </TouchableOpacity>
              <TextInput
                style={[styles.formInput, { marginTop: 6 }]}
                placeholder="Or enter client name manually..."
                placeholderTextColor="#94a3b8"
                value={formLeadName}
                onChangeText={setFormLeadName}
              />

              {/* Executive Name */}
              <Text style={styles.formLabel}>Executive Name</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Executive name"
                placeholderTextColor="#94a3b8"
                value={formExecutiveName}
                onChangeText={setFormExecutiveName}
              />

              {/* Visit Date */}
              <Text style={styles.formLabel}>Visit Date & Time</Text>
              <TextInput
                style={styles.formInput}
                placeholder="YYYY-MM-DDTHH:mm"
                placeholderTextColor="#94a3b8"
                value={formVisitDate}
                onChangeText={setFormVisitDate}
              />

              {/* Location */}
              <Text style={styles.formLabel}>Meeting Location</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Address / MIDC / Office"
                placeholderTextColor="#94a3b8"
                value={formLocation}
                onChangeText={setFormLocation}
              />

              {/* Purpose */}
              <Text style={styles.formLabel}>Purpose</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. Visit, Demo, Negotiation"
                placeholderTextColor="#94a3b8"
                value={formPurpose}
                onChangeText={setFormPurpose}
              />

              {/* Outcome */}
              <Text style={styles.formLabel}>Outcome</Text>
              <View style={styles.outcomeSelectRow}>
                {['Interested', 'Follow-up Needed', 'Closed Won', 'Not Interested'].map((out) => (
                  <TouchableOpacity
                    key={out}
                    style={[
                      styles.outcomeSelectBtn,
                      formOutcome === out && styles.outcomeSelectBtnActive,
                    ]}
                    onPress={() => setFormOutcome(out)}
                  >
                    <Text
                      style={[
                        styles.outcomeSelectText,
                        formOutcome === out && styles.outcomeSelectTextActive,
                      ]}
                    >
                      {out}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Notes */}
              <Text style={styles.formLabel}>Meeting Discussion Notes</Text>
              <TextInput
                style={[styles.formInput, { height: 75, textAlignVertical: 'top' }]}
                placeholder="Enter key discussion takeaways..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={3}
                value={formNotes}
                onChangeText={setFormNotes}
              />

              {/* Next Follow Up */}
              <Text style={styles.formLabel}>Next Follow-up Date</Text>
              <TextInput
                style={styles.formInput}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#94a3b8"
                value={formNextFollowUp}
                onChangeText={setFormNextFollowUp}
              />
            </ScrollView>

            {/* Modal Bottom Actions */}
            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setModalVisible(false)}
                disabled={saving}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveVisit}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                    <Text style={styles.modalSaveText}>Save Visit</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Customer Selector Modal */}
      <LeadSelectorModal
        visible={leadModalVisible}
        leads={leadsList}
        onClose={() => setLeadModalVisible(false)}
        onSelectLead={(lead) => {
          setFormLeadName(lead.name);
          setLeadModalVisible(false);
        }}
        title="Select Client for Visit"
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
  headerAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#645695',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  headerAddBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
    marginLeft: 2,
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
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 40,
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
  kpiLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 2,
  },
  kpiSub: {
    fontSize: 10,
    color: '#94a3b8',
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
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#1e293b',
    padding: 0,
  },
  sourceSegmentRow: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 3,
    marginBottom: 10,
  },
  sourceSegmentBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 6,
  },
  sourceSegmentBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sourceSegmentText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  sourceSegmentTextActive: {
    color: '#645695',
    fontWeight: '700',
  },
  outcomePillsRow: {
    gap: 8,
    marginBottom: 12,
  },
  outcomePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  outcomePillActive: {
    backgroundColor: '#645695',
    borderColor: '#645695',
  },
  outcomePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  outcomePillTextActive: {
    color: '#ffffff',
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  listHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1e293b',
  },
  listSubheading: {
    fontSize: 11,
    color: '#64748b',
  },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 13,
    color: '#64748b',
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
  visitCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#645695',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  dateBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#645695',
    lineHeight: 15,
  },
  cardTopRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  clientName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    marginRight: 4,
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  notesBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 8,
    marginTop: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#645695',
  },
  notesLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 2,
  },
  notesText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 16,
  },
  nextDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  nextDateText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16a34a',
  },
  cardActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  cardActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  cardActionBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#645695',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: '90%',
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
  },
  modalScroll: {
    maxHeight: 460,
  },
  formLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 10,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  formInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#1e293b',
  },
  formLeadSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ede9fe',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  formLeadSelectorText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#645695',
  },
  outcomeSelectRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  outcomeSelectBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
  },
  outcomeSelectBtnActive: {
    backgroundColor: '#645695',
  },
  outcomeSelectText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  outcomeSelectTextActive: {
    color: '#ffffff',
  },
  modalActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  modalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  modalSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#645695',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
  },
  modalSaveText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
});

export default VisitReportScreen;
