import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/common/Header';
import { SearchBar } from '../../components/common/SearchBar';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import { CommonListCard } from '../../components/cards/CommonListCard';
import { companyService } from '../../api/companyService';
import { CompanyMaster } from '../../api/mastersService';
import { useCompany } from '../../context/CompanyContext';
import { Colors } from '../../theme/colors';

interface CompaniesListScreenProps {
  navigation: any;
}

export const CompaniesListScreen: React.FC<CompaniesListScreenProps> = ({ navigation }) => {
  const { selectedCompanyId, isAllCompanies, refreshCompanies } = useCompany();
  const [companies, setCompanies] = useState<CompanyMaster[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Delete modal state
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<CompanyMaster | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadCompanies = useCallback(async () => {
    try {
      const data = await companyService.getCompanies({
        search: search.trim() || undefined,
      });
      setCompanies(data);
    } catch (err) {
      console.warn('Error fetching companies list:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search]);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  useFocusEffect(
    useCallback(() => {
      loadCompanies();
    }, [loadCompanies])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadCompanies();
  };

  const handleDelete = async () => {
    if (!selectedCompany) return;
    setDeleting(true);
    try {
      await companyService.deleteCompany(selectedCompany.companyID);
      await refreshCompanies();
      setDeleteModalVisible(false);
      setSelectedCompany(null);
      loadCompanies();
      Alert.alert('Success', 'Company deleted successfully!');
    } catch (err: any) {
      console.error('Delete company error:', err);
      let errMsg = 'Could not delete company.';
      if (err?.response?.status === 400 && err?.response?.data?.message?.includes('used in Leads')) {
        errMsg = 'Cannot delete this company because it is linked to existing leads or transactions.';
      } else if (err?.response?.data?.message) {
        errMsg = err.response.data.message;
      } else if (err?.message) {
        errMsg = err.message;
      }
      Alert.alert('Delete Failed', errMsg);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header
        showBack={false}
        navigation={navigation}
        currentRoute="CompaniesList"
      />

      {/* Search & Add Action Row */}
      <View style={styles.actionRow}>
        <View style={styles.searchContainer}>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Search..."
          />
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('AddCompany')}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={16} color="#ffffff" />
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={companies}
          keyExtractor={(item) => String(item.companyID)}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="business-outline" size={48} color={Colors.slate300} />
              <Text style={styles.emptyTitle}>No Companies Found</Text>
              <Text style={styles.emptySubtitle}>
                No company records found matching your search.
              </Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => navigation.navigate('AddCompany')}
              >
                <Text style={styles.emptyBtnText}>+ Create Company</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => {
            const isActive = !isAllCompanies && item.companyID === selectedCompanyId;
            return (
              <CommonListCard
                title={item.companyName}
                subtitle={item.city ? `${item.city}${item.state ? `, ${item.state}` : ''}` : undefined}
                avatarIcon="business"
                avatarColor={isActive ? '#ffffff' : Colors.primary}
                avatarBgColor={isActive ? Colors.primary : Colors.primaryMuted}
                badgeLabel={(item.status || 'ACTIVE').toUpperCase()}
                badgeVariant={item.status?.toLowerCase() === 'inactive' ? 'danger' : 'success'}
                badgeExtra={
                  isActive ? (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultBadgeText}>Current Workspace</Text>
                    </View>
                  ) : null
                }
                pills={[
                  item.phone && { icon: 'call-outline', text: item.phone, iconColor: Colors.primary },
                  item.email && { icon: 'mail-outline', text: item.email },
                  item.gstNo && { icon: 'receipt-outline', text: `GST: ${item.gstNo}` },
                  item.panNo && { icon: 'card-outline', text: `PAN: ${item.panNo}` },
                  item.address && { icon: 'location-outline', text: item.address },
                ]}
                footerIcon={item.code ? 'barcode-outline' : undefined}
                footerText={item.code || undefined}
                onPress={() => navigation.navigate('AddCompany', { company: item })}
                onEdit={() => navigation.navigate('AddCompany', { company: item })}
                onDelete={() => {
                  setSelectedCompany(item);
                  setDeleteModalVisible(true);
                }}
              />
            );
          }}
        />
      )}


      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        visible={deleteModalVisible}
        title="Delete Company"
        message={`Are you sure you want to delete "${selectedCompany?.companyName}"?`}
        confirmText="Delete"
        cancelText="Cancel"
        isDestructive
        loading={deleting}
        icon="trash"
        onConfirm={handleDelete}
        onCancel={() => setDeleteModalVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
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
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 90,
  },
  defaultBadge: {
    backgroundColor: '#ede9fe',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  defaultBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.slate700,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.slate400,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  emptyBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});
