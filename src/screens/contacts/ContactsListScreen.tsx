import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { Header } from '../../components/common/Header';
import { SearchBar } from '../../components/common/SearchBar';
import { CommonListCard } from '../../components/cards/CommonListCard';
import { FloatingActionButton } from '../../components/common/FloatingActionButton';
import { EmptyState } from '../../components/common/EmptyState';
import { Pagination } from '../../components/common/Pagination';
import { QuickMessageModal } from '../../components/modals/QuickMessageModal';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';

import { contactService, Contact } from '../../api/contactService';

import { useCompany } from '../../context/CompanyContext';
import { Colors } from '../../theme/colors';

interface ContactsListScreenProps {
  navigation: any;
}

export const ContactsListScreen: React.FC<ContactsListScreenProps> = ({
  navigation,
}) => {
  const { selectedCompanyId } = useCompany();

  // ============================================================
  // CONTACT LIST STATE
  // ============================================================

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState('');

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // ============================================================
  // PAGINATION
  // ============================================================

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // ============================================================
  // QUICK MESSAGE MODAL
  // ============================================================

  const [msgModalVisible, setMsgModalVisible] = useState(false);

  const [msgRecipient, setMsgRecipient] = useState({
    name: '',
    phone: '',
  });

  // ============================================================
  // DELETE MODAL
  // ============================================================

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  const [selectedContact, setSelectedContact] =
    useState<Contact | null>(null);

  const [deleting, setDeleting] = useState(false);

  // ============================================================
  // FETCH CONTACTS
  // ============================================================

   // ============================================================
// FETCH CONTACTS
// ============================================================

const fetchContacts = useCallback(
  async (page = 1, isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const res = await contactService.getContacts({
        companyID: selectedCompanyId || undefined,
        search: search.trim() || undefined,
        page,
        pageSize: 15,
      });

      console.log('CONTACT API RESPONSE:', res);

      // API PascalCase -> React Native camelCase
      const normalizedContacts = (res.data || []).map(
        (item: any) => ({
          ...item,

          contactID: Number(
            item.ContactID ?? item.contactID ?? 0
          ),

          fullName:
            item.FullName ??
            item.fullName ??
            item.ContactName ??
            item.contactName ??
            '',

          companyID:
            item.CompanyID ?? item.companyID,

          companyName:
            item.CompanyName ??
            item.companyName ??
            '',

          status:
            item.Status ??
            item.status ??
            'Active',

          contactNumber:
            item.ContactNumber ??
            item.contactNumber ??
            item.LeadMobileNo ??
            item.mobileNo ??
            item.phone ??
            '',

          email:
            item.Email ??
            item.email ??
            '',

          city:
            item.City ??
            item.city ??
            '',

          state:
            item.State ??
            item.state ??
            '',

          position:
            item.Position ??
            item.position ??
            '',

          leadID:
            item.LeadID ?? item.leadID,

          leadName:
            item.LeadName ??
            item.leadName ??
            '',

          followUpDate:
            item.FollowUpDate ??
            item.followUpDate ??
            null,

          followUpTime:
            item.FollowUpTime ??
            item.followUpTime ??
            '',

          isDefault:
            item.IsDefault ??
            item.isDefault ??
            false,

          parentContactID:
            item.ParentContactID ??
            item.parentContactID ??
            null,
        })
      );

      console.log(
        'NORMALIZED CONTACTS:',
        normalizedContacts
      );

      setContacts(normalizedContacts as Contact[]);

      setCurrentPage(page);

      setTotalPages(res.totalPages || 1);

      setTotalItems(res.total || normalizedContacts.length);
    } catch (error: any) {
      console.error(
        'Error fetching contacts:',
        error?.response?.data || error
      );

      Alert.alert(
        'Error',
        error?.response?.data?.message ||
          'Failed to load contacts.'
      );

    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  },
  [selectedCompanyId, search]
);
  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCompanyId, search]);

  // ============================================================
  // INITIAL LOAD
  // ============================================================

  useEffect(() => {
    fetchContacts(1);
  }, [fetchContacts]);

  // ============================================================
  // REFRESH WHEN SCREEN GETS FOCUS
  // ============================================================

  useFocusEffect(
    useCallback(() => {
      fetchContacts(currentPage);
    }, [fetchContacts, currentPage])
  );

  // ============================================================
  // DELETE CONTACT
  // ============================================================

  const handleDelete = async () => {
    if (!selectedContact) return;

    setDeleting(true);

    try {
      await contactService.deleteContact(
        selectedContact.contactID
      );

      setDeleteModalVisible(false);

      setSelectedContact(null);

      fetchContacts(currentPage);

      Alert.alert(
        'Success',
        'Contact deleted successfully!'
      );
    } catch (err: any) {
      console.error('Delete contact error:', err);

      Alert.alert(
        'Delete Failed',
        err?.response?.data?.message ||
          'Could not delete contact'
      );
    } finally {
      setDeleting(false);
    }
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <View style={styles.container}>

      {/* ======================================================
          HEADER
      ====================================================== */}

      <Header
        title="Contacts"
        showBack={false}
        navigation={navigation}
        currentRoute="ContactsTab"
      />

      {/* ======================================================
          SEARCH + ADD ROW
      ====================================================== */}

      <View style={styles.actionRow}>

        {/* SEARCH */}

        <View style={styles.searchContainer}>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Search contacts..."
          />
        </View>

        {/* ADD BUTTON */}

        <TouchableOpacity
          style={styles.addBtn}
          onPress={() =>
            navigation.navigate('AddContact')
          }
          activeOpacity={0.8}
        >
          <Ionicons
            name="add"
            size={16}
            color="#ffffff"
          />

          <Text style={styles.addBtnText}>
            Add
          </Text>
        </TouchableOpacity>

      </View>

      {/* ======================================================
          CONTACT LIST
      ====================================================== */}

      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator
            size="large"
            color={Colors.primary}
          />
        </View>
      ) : (
        <FlatList
          data={contacts}

          keyExtractor={(item, index) => {
          const lowerId = Number(item.contactID);
          const upperId = Number((item as any).ContactID);

          const id =
            lowerId > 0 ? lowerId :
            upperId > 0 ? upperId :
            null;

          return id !== null
            ? `contact-${id}`
            : `contact-index-${index}`;
        }}

          contentContainerStyle={styles.listContent}

          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() =>
                fetchContacts(1, true)
              }
              colors={[Colors.primary]}
            />
          }

          ListEmptyComponent={
            <EmptyState
              title="No Contacts Found"
              description="No contacts match your search criteria. Tap below to create your first contact."
              actionTitle="Create New Contact"
              onAction={() =>
                navigation.navigate('AddContact')
              }
            />
          }
 renderItem={({ item }) => {
  const rawName =
    item.fullName ||
    item.contactName ||
    item.leadName ||
    item.companyName ||
    'Unnamed Contact';

  // Title-case: pehla letter capital, baaki as-it-is
  const displayName =
    rawName.charAt(0).toUpperCase() + rawName.slice(1);

  const avatarInitial =
    displayName.trim().charAt(0).toUpperCase() || '?';

  return (
   <CommonListCard
    title={displayName}
    subtitle={
      item.companyName && item.companyName.trim() !== rawName.trim()
        ? item.companyName
        : item.leadName && item.leadName.trim() !== rawName.trim()
        ? item.leadName
        : undefined
    }

    avatarText={avatarInitial}

    badgeLabel={String(
      item.status || 'ACTIVE'
    ).toUpperCase()}

    badgeVariant={
      String(item.status || '')
        .toLowerCase() === 'inactive'
        ? 'danger'
        : 'success'
    }

    pills={[
      (item.contactNumber || item.mobileNo || item.phone) && {
        icon: 'call-outline',
        text: item.contactNumber || item.mobileNo || item.phone,
        iconColor: Colors.primary,
      },

      item.email && {
        icon: 'mail-outline',
        text: item.email,
      },

      item.city && {
        icon: 'location-outline',
        text: item.city,
      },
    ].filter(Boolean) as any}

    footerIcon={
      item.position || item.designation
        ? 'briefcase-outline'
        : undefined
    }

    footerText={
      item.position || item.designation || undefined
    }

    onPress={() =>
      navigation.navigate('AddContact', {
        editContact: item,
      })
    }

    onEdit={() =>
      navigation.navigate('AddContact', {
        editContact: item,
      })
    }

    onDelete={() => {
      setSelectedContact(item);
      setDeleteModalVisible(true);
    }}
  />
);
}}
        />
      )}

      {/* ======================================================
          PAGINATION
      ====================================================== */}

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          onPageChange={(page) =>
            fetchContacts(page)
          }
        />
      )}
 

      {/* ======================================================
          QUICK MESSAGE MODAL
      ====================================================== */}

      <QuickMessageModal
        visible={msgModalVisible}
        onClose={() =>
          setMsgModalVisible(false)
        }
        recipientName={msgRecipient.name}
        mobileNo={msgRecipient.phone}
      />

      {/* ======================================================
          DELETE CONFIRMATION MODAL
      ====================================================== */}

      <ConfirmationModal
        visible={deleteModalVisible}
        title="Delete Contact"
        message={`Are you sure you want to delete "${
          selectedContact?.fullName ||
          selectedContact?.companyName ||
          'this contact'
        }"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        isDestructive
        loading={deleting}
        icon="trash"
        onConfirm={handleDelete}
        onCancel={() => {
          setDeleteModalVisible(false);
          setSelectedContact(null);
        }}
      />

    </View>
  );
};

// ================================================================
// STYLES
// ================================================================

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
});