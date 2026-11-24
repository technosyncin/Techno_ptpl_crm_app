import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCompany } from '../../context/CompanyContext';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../theme/colors';

interface CompanySelectorModalProps {
  visible: boolean;
  onClose: () => void;
}

export const CompanySelectorModal: React.FC<CompanySelectorModalProps> = ({
  visible,
  onClose,
}) => {
  const { user } = useAuth();
  const {
    companies,
    selectedCompanyId,
    isAllCompanies,
    setSelectedCompanyId,
    refreshCompanies,
    loadingCompanies,
  } = useCompany();

  const userRole = (user?.role || '').toLowerCase();
  const isAdmin = userRole.includes('admin') || userRole.includes('super');

  // Refresh latest companies from server every time modal is opened
  useEffect(() => {
    if (visible) {
      refreshCompanies();
    }
  }, [visible, refreshCompanies]);

  const handleSelect = async (id: number | null) => {
    await setSelectedCompanyId(id);
    onClose();
  };

  const showAllOption = true;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <View style={styles.iconCircle}>
                    <Ionicons name="business" size={18} color={Colors.primary} />
                  </View>
                  <View>
                    <Text style={styles.title}>Switch Company</Text>
                    <Text style={styles.subtitle}>Select active workspace</Text>
                  </View>
                </View>

                <View style={styles.headerRight}>
                  <TouchableOpacity
                    onPress={() => refreshCompanies()}
                    disabled={loadingCompanies}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={styles.refreshBtn}
                  >
                    {loadingCompanies ? (
                      <ActivityIndicator size="small" color={Colors.primary} />
                    ) : (
                      <Ionicons name="refresh" size={18} color={Colors.slate600} />
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={onClose}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={styles.closeBtn}
                  >
                    <Ionicons name="close" size={20} color={Colors.slate500} />
                  </TouchableOpacity>
                </View>
              </View>

              {showAllOption && (
                <TouchableOpacity
                  style={[styles.itemRow, isAllCompanies && styles.itemRowSelected]}
                  onPress={() => handleSelect(null)}
                  activeOpacity={0.7}
                >
                  <View style={styles.itemIconContainer}>
                    <Ionicons
                      name="layers"
                      size={18}
                      color={isAllCompanies ? Colors.primary : Colors.slate500}
                    />
                  </View>
                  <View style={styles.itemInfo}>
                    <Text style={[styles.companyName, isAllCompanies && styles.companyNameSelected]}>
                      🏢 All Companies
                    </Text>
                    <Text style={styles.companyCity}>Aggregated data across all companies</Text>
                  </View>
                  {isAllCompanies ? (
                    <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />
                  ) : (
                    <Ionicons name="ellipse-outline" size={20} color={Colors.slate300} />
                  )}
                </TouchableOpacity>
              )}

              <FlatList
                data={companies}
                keyExtractor={(item) => String(item.companyID)}
                renderItem={({ item }) => {
                  const isSelected = !isAllCompanies && item.companyID === selectedCompanyId;
                  return (
                    <TouchableOpacity
                      style={[styles.itemRow, isSelected && styles.itemRowSelected]}
                      onPress={() => handleSelect(item.companyID)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.itemIconContainer}>
                        <Ionicons
                          name="business-outline"
                          size={18}
                          color={isSelected ? Colors.primary : Colors.slate500}
                        />
                      </View>
                      <View style={styles.itemInfo}>
                        <Text style={[styles.companyName, isSelected && styles.companyNameSelected]}>
                          {item.companyName}
                        </Text>
                        {item.city ? (
                          <Text style={styles.companyCity}>
                            {item.city}{item.state ? `, ${item.state}` : ''}
                          </Text>
                        ) : null}
                      </View>
                      {isSelected ? (
                        <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />
                      ) : (
                        <Ionicons name="ellipse-outline" size={20} color={Colors.slate300} />
                      )}
                    </TouchableOpacity>
                  );
                }}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    {loadingCompanies ? (
                      <ActivityIndicator size="large" color={Colors.primary} />
                    ) : (
                      <>
                        <Ionicons name="business-outline" size={32} color={Colors.slate400} />
                        <Text style={styles.emptyText}>
                          No individual companies created yet
                        </Text>
                        <Text style={[styles.emptyText, { fontSize: 12, marginTop: 4, color: Colors.slate400, textAlign: 'center' }]}>
                          Working in aggregate mode (All Companies)
                        </Text>
                        <TouchableOpacity
                          style={styles.retryBtn}
                          onPress={() => refreshCompanies()}
                        >
                          <Text style={styles.retryBtnText}>Reload Companies</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                }
              />
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    maxHeight: '80%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.slate900,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.slate500,
    marginTop: 1,
  },
  refreshBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: Colors.slate100,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: Colors.slate100,
  },
  list: {
    padding: 14,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    marginHorizontal: 14,
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  itemRowSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryMuted,
  },
  itemIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  itemInfo: {
    flex: 1,
    marginRight: 10,
  },
  companyName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.slate800,
  },
  companyNameSelected: {
    color: Colors.primary,
    fontWeight: '700',
  },
  companyCity: {
    fontSize: 12,
    color: Colors.slate500,
    marginTop: 2,
  },
  emptyContainer: {
    padding: 28,
    alignItems: 'center',
    gap: 10,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.slate400,
  },
  retryBtn: {
    marginTop: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.primary,
  },
  retryBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
});
