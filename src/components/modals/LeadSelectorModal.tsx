import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface LeadOption {
  id: number;
  leadID?: number;
  name: string;
  leadName?: string;
  customerName?: string;
  companyName?: string;
  phone?: string;
  mobileNo?: string;
  city?: string;
  email?: string;
  status?: string;
  companyID?: number;
  outstandingBalance?: number;
  overdueAmount?: number;
}

interface LeadSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectLead: (lead: LeadOption) => void;
  leads: LeadOption[];
  selectedLeadId?: number;
  title?: string;
  loading?: boolean;
  hideCompanyPhone?: boolean;
}

export const LeadSelectorModal: React.FC<LeadSelectorModalProps> = ({
  visible,
  onClose,
  onSelectLead,
  leads,
  selectedLeadId,
  title = 'Select Lead',
  loading = false,
  hideCompanyPhone = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLeads = useMemo(() => {
    if (!searchQuery.trim()) return leads;
    const q = searchQuery.toLowerCase().trim();
    return leads.filter((l) => {
      const name = (l.name || l.leadName || l.customerName || '').toLowerCase();
      if (hideCompanyPhone) {
        return name.includes(q);
      }
      const comp = (l.companyName || '').toLowerCase();
      const phone = (l.phone || l.mobileNo || '').toLowerCase();
      const city = (l.city || '').toLowerCase();
      return name.includes(q) || comp.includes(q) || phone.includes(q) || city.includes(q);
    });
  }, [leads, searchQuery, hideCompanyPhone]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerTitleGroup}>
              <View style={styles.headerIconBadge}>
                <Ionicons name="people" size={18} color="#645695" />
              </View>
              <View>
                <Text style={styles.headerTitle}>{title}</Text>
                <Text style={styles.headerSubtitle}>
                  {leads.length} available leads
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={18} color="#475569" />
            </TouchableOpacity>
          </View>

          {/* Search Box */}
          <View style={styles.searchBox}>
            <Ionicons name="search" size={16} color="#888" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder={hideCompanyPhone ? 'Search by lead name...' : 'Search by lead name, company, phone, city...'}
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>

          {/* List of Leads */}
          {loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="small" color="#645695" />
              <Text style={styles.loadingText}>Loading dynamic leads from CRM...</Text>
            </View>
          ) : filteredLeads.length === 0 ? (
            <View style={styles.centerContainer}>
              <Ionicons name="person-remove-outline" size={36} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>No matching leads found</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery ? `Try adjusting "${searchQuery}"` : 'No leads available in this company.'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredLeads}
              keyExtractor={(item) => String(item.id || item.leadID || Math.random())}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
              renderItem={({ item }) => {
                const leadName = item.name || item.leadName || item.customerName || 'Unnamed Lead';
                const isSelected = selectedLeadId === (item.leadID || item.id);
                const phone = item.phone || item.mobileNo;
                const initials = leadName.substring(0, 2).toUpperCase();

                return (
                  <TouchableOpacity
                    style={[styles.leadItemRow, isSelected && styles.leadItemRowSelected]}
                    onPress={() => {
                      onSelectLead(item);
                      onClose();
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.avatarCircle, isSelected && styles.avatarCircleSelected]}>
                      <Text style={[styles.avatarText, isSelected && styles.avatarTextSelected]}>
                        {initials}
                      </Text>
                    </View>

                    <View style={styles.leadInfoCol}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.leadNameText} numberOfLines={1}>
                          {leadName}
                        </Text>
                        {item.status ? (
                          <View style={styles.statusBadge}>
                            <Text style={styles.statusBadgeText}>{item.status}</Text>
                          </View>
                        ) : null}
                      </View>

                      {!hideCompanyPhone && (item.companyName || phone || item.city) ? (
                        <View style={styles.metaRow}>
                          {item.companyName ? (
                            <Text style={styles.metaText} numberOfLines={1}>
                              <Ionicons name="business-outline" size={11} color="#64748b" /> {item.companyName}
                            </Text>
                          ) : null}
                          {phone ? (
                            <Text style={styles.metaText} numberOfLines={1}>
                              <Ionicons name="call-outline" size={11} color="#64748b" /> {phone}
                            </Text>
                          ) : null}
                          {item.city ? (
                            <Text style={styles.metaText} numberOfLines={1}>
                              <Ionicons name="location-outline" size={11} color="#64748b" /> {item.city}
                            </Text>
                          ) : null}
                        </View>
                      ) : null}
                    </View>

                    <Ionicons
                      name={isSelected ? 'checkmark-circle' : 'chevron-forward'}
                      size={20}
                      color={isSelected ? '#645695' : '#cbd5e1'}
                    />
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    height: '80%',
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#f8fafc',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(100, 86, 149, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    height: 48,
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#1e293b',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#64748b',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
    textAlign: 'center',
  },
  leadItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  leadItemRowSelected: {
    borderColor: '#645695',
    backgroundColor: 'rgba(100, 86, 149, 0.05)',
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarCircleSelected: {
    backgroundColor: '#645695',
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#645695',
  },
  avatarTextSelected: {
    color: '#ffffff',
  },
  leadInfoCol: {
    flex: 1,
  },
  leadNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  statusBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 3,
  },
  metaText: {
    fontSize: 11.5,
    color: '#64748b',
  },
});
