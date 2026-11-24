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
import { userService, UserItem } from '../../api/userService';
import { useCompany } from '../../context/CompanyContext';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing, BorderRadius, Shadows } from '../../theme/spacing';
import { Badge } from '../../components/common/Badge';

interface UsersListScreenProps {
  navigation: any;
}

export const UsersListScreen: React.FC<UsersListScreenProps> = ({ navigation }) => {
  const { selectedCompanyId, isAllCompanies, allCompanies, companies } = useCompany();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Delete modal state
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      const compId = isAllCompanies || !selectedCompanyId ? undefined : Number(selectedCompanyId);
      const data = await userService.getUsers(compId);
      setUsers(data);
    } catch (err) {
      console.warn('Error fetching users:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCompanyId, isAllCompanies]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useFocusEffect(
    useCallback(() => {
      loadUsers();
    }, [loadUsers])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadUsers();
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setDeleting(true);
    try {
      await userService.deleteUser(selectedUser.userID);
      setDeleteModalVisible(false);
      setSelectedUser(null);
      loadUsers();
      Alert.alert('Success', 'User deleted successfully!');
    } catch (err: any) {
      console.error('Delete user error:', err);
      Alert.alert('Delete Failed', err?.response?.data?.message || err?.message || 'Could not delete user');
    } finally {
      setDeleting(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    // 1. Company Filter (Matches Web parity: admin and unmapped users are accessible across companies)
    if (!isAllCompanies && selectedCompanyId) {
      const targetCompId = Number(selectedCompanyId);
      const uCompId = u.companyID != null ? Number(u.companyID) : null;
      const uCompIds = Array.isArray(u.companyIds) ? u.companyIds.map(Number) : [];
      const uDefCompId = u.defaultCompanyId != null ? Number(u.defaultCompanyId) : null;

      const isUnmapped = !uCompId && uCompIds.length === 0 && !uDefCompId;
      const isAdmin = (u.role || '').toLowerCase().includes('admin');

      const belongsToCompany =
        isAdmin ||
        isUnmapped ||
        uCompId === targetCompId ||
        uCompIds.includes(targetCompId) ||
        uDefCompId === targetCompId;

      if (!belongsToCompany) {
        return false;
      }
    }

    // 2. Search Filter
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (u.fullName || '').toLowerCase().includes(q) ||
      (u.username || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.role || '').toLowerCase().includes(q) ||
      (u.departmentName || '').toLowerCase().includes(q) ||
      (u.mobileNo || '').includes(q)
    );
  });

  return (
    <View style={styles.container}>
      <Header
        showBack={false}
        navigation={navigation}
        currentRoute="UsersList"
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
          onPress={() => navigation.navigate('AddUser')}
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
          data={filteredUsers}
          keyExtractor={(item) => String(item.userID)}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={48} color={Colors.slate300} />
              <Text style={styles.emptyTitle}>No Users Found</Text>
              <Text style={styles.emptySubtitle}>
                {search
                  ? `No user accounts match "${search}".`
                  : 'Add team members and assign roles to get started.'}
              </Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => navigation.navigate('AddUser')}
              >
                <Text style={styles.emptyBtnText}>+ Add New User</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => {
            const initial = (item.fullName || item.username || 'U').charAt(0).toUpperCase();
            return (
              <CommonListCard
                title={item.fullName || item.username}
                subtitle={`@${item.username}`}
                avatarText={initial}
                badgeLabel={String(item.role || 'User')}
                badgeVariant="primary"
                pills={[
                  item.mobileNo && { icon: 'call-outline', text: item.mobileNo, iconColor: Colors.primary },
                  item.email && { icon: 'mail-outline', text: item.email },
                  item.departmentName && { icon: 'git-network-outline', text: item.departmentName },
                  item.designation && { icon: 'ribbon-outline', text: item.designation },
                ]}
                footerIcon="business-outline"
                footerText={
                  item.companyName ||
                  (item.companyID
                    ? (allCompanies.find((c) => c.companyID === item.companyID)?.companyName ||
                       companies.find((c) => c.companyID === item.companyID)?.companyName)
                    : undefined) ||
                  'All Companies'
                }
                onPress={() => navigation.navigate('AddUser', { user: item })}
                onEdit={() => navigation.navigate('AddUser', { user: item })}
                onDelete={() => {
                  setSelectedUser(item);
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
        title="Delete User"
        message={`Are you sure you want to delete "${selectedUser?.fullName || selectedUser?.username}"?`}
        confirmText="Delete"
        cancelText="Cancel"
        isDestructive
        loading={deleting}
        icon="trash"
        onConfirm={handleDeleteUser}
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
