import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  BackHandler,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/common/Header';
import { SearchBar } from '../../components/common/SearchBar';
import { EmptyState } from '../../components/common/EmptyState';
import { Input } from '../../components/common/Input';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import { CommonListCard } from '../../components/cards/CommonListCard';
import { formatDate } from '../../utils/formatting';
import { notesService, Note } from '../../api/notesService';
import { useAuth } from '../../context/AuthContext';
import { useCompany } from '../../context/CompanyContext';
import { Colors } from '../../theme/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_PRIMARY = '#645695';

interface NotesScreenProps {
  navigation: any;
  route?: any;
}

export const NotesScreen: React.FC<NotesScreenProps> = ({ navigation, route }) => {
  const { user } = useAuth();
  const { selectedCompanyId } = useCompany();

  // Screen View Mode: false = List View (shown first), true = Full-Screen Form (NO MODAL)
  const [showForm, setShowForm] = useState(
    Boolean(route?.params?.openForm || route?.params?.editNote)
  );

  // List Data State
  const [notes, setNotes] = useState<Note[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'All' | 'Pinned'>('All');
  const [pinnedIds, setPinnedIds] = useState<number[]>([]);

  // Load pinned note IDs from AsyncStorage
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('@crm_pinned_notes');
        if (saved) {
          setPinnedIds(JSON.parse(saved));
        }
      } catch (e) {
        console.warn('Error loading pinned notes:', e);
      }
    })();
  }, []);

  // Pin / Unpin Toggle
  const handleTogglePin = async (noteId: number) => {
    try {
      const isCurrentlyPinned = pinnedIds.includes(noteId);
      const updated = isCurrentlyPinned
        ? pinnedIds.filter((id) => id !== noteId)
        : [noteId, ...pinnedIds];

      setPinnedIds(updated);
      await AsyncStorage.setItem('@crm_pinned_notes', JSON.stringify(updated));
    } catch (e) {
      console.warn('Error saving pin state:', e);
    }
  };

  // Deletion Modal
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedNoteForDelete, setSelectedNoteForDelete] = useState<Note | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form State (Matching Web CRM Notes fields: ONLY Note Title and Specification)
  const [editingNote, setEditingNote] = useState<Note | null>(route?.params?.editNote || null);
  const isEditing = Boolean(editingNote);

  const [noteTitle, setNoteTitle] = useState(editingNote?.noteTitle || '');
  const [specification, setSpecification] = useState(editingNote?.specification || '');

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch Notes List from API
  const fetchNotes = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const res = await notesService.getNotes({
          companyId: selectedCompanyId || undefined,
          search: search.trim() || undefined,
        });
        setNotes(res || []);
      } catch (e) {
        console.warn('Error fetching notes:', e);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedCompanyId, search]
  );

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // Step-by-step Back Navigation:
  // When inside the Form, pressing Back (Hardware Back, Gesture Swipe, or Header)
  // closes the form and returns to Notes List.
  // When on the Notes List, pressing Back goes back to Dashboard.
  useEffect(() => {
    const backAction = () => {
      if (showForm) {
        setShowForm(false);
        setEditingNote(null);
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
      if (showForm) {
        e.preventDefault();
        setShowForm(false);
        setEditingNote(null);
      }
    });

    return () => {
      backHandler.remove();
      unsubscribe();
    };
  }, [navigation, showForm]);

  // Open Form to Add New Note
  const handleOpenAddForm = () => {
    setEditingNote(null);
    setNoteTitle('');
    setSpecification('');
    setErrors({});
    setShowForm(true);
  };

  // Open Form to Edit Note
  const handleOpenEditForm = (item: Note) => {
    setEditingNote(item);
    setNoteTitle(item.noteTitle || '');
    setSpecification(item.specification || '');
    setErrors({});
    setShowForm(true);
  };

  // Reset Form
  const handleResetForm = () => {
    if (editingNote) {
      handleOpenEditForm(editingNote);
    } else {
      handleOpenAddForm();
    }
  };

  // Save Note (Create or Update)
  const handleSaveNote = async () => {
    const newErrors: Record<string, string> = {};
    if (!noteTitle.trim()) {
      newErrors.noteTitle = 'Note Title is required.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      Alert.alert('Validation Error', 'Please enter Note Title.');
      return;
    }

    setSaving(true);
    try {
      const currentUserId = user?.userID || user?.id || 1;
      const payload: Partial<Note> = {
        noteTitle: noteTitle.trim(),
        priority: editingNote?.priority || 'Medium',
        specification: specification.trim() || '',
        companyID: selectedCompanyId || 1,
        createdBy: Number(currentUserId),
        updatedBy: Number(currentUserId),
      };

      if (isEditing && editingNote) {
        await notesService.updateNote(editingNote.noteID, {
          ...payload,
          noteID: editingNote.noteID,
        });
        Alert.alert('Success', 'Note updated successfully!');
      } else {
        await notesService.createNote(payload);
        Alert.alert('Success', 'Note added successfully!');
      }

      setShowForm(false);
      setEditingNote(null);
      fetchNotes();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to save note.';
      Alert.alert('Save Failed', msg);
    } finally {
      setSaving(false);
    }
  };

  // Delete Note
  const handleDeleteNote = async () => {
    if (!selectedNoteForDelete) return;
    setDeleting(true);
    try {
      const ok = await notesService.deleteNote(selectedNoteForDelete.noteID);
      if (ok) {
        setDeleteModalVisible(false);
        setSelectedNoteForDelete(null);
        fetchNotes();
        Alert.alert('Success', 'Note deleted successfully.');
      } else {
        Alert.alert('Error', 'Failed to delete note.');
      }
    } catch (e: any) {
      Alert.alert('Delete Failed', e?.response?.data?.message || 'Failed to delete note.');
    } finally {
      setDeleting(false);
    }
  };

  // Filter notes based on search and active tab
  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      const isPinned = pinnedIds.includes(n.noteID);
      if (activeTab === 'Pinned' && !isPinned) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesTitle = (n.noteTitle || '').toLowerCase().includes(q);
        const matchesSpec = (n.specification || '').toLowerCase().includes(q);
        return matchesTitle || matchesSpec;
      }
      return true;
    });
  }, [notes, activeTab, search, pinnedIds]);

  // Sort: Pinned Notes First, then by date
  const sortedNotes = useMemo(() => {
    return [...filteredNotes].sort((a, b) => {
      const aPinned = pinnedIds.includes(a.noteID);
      const bPinned = pinnedIds.includes(b.noteID);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return new Date(b.createdDate || 0).getTime() - new Date(a.createdDate || 0).getTime();
    });
  }, [filteredNotes, pinnedIds]);

  // Counts for tabs
  const pinnedCount = useMemo(() => notes.filter((n) => pinnedIds.includes(n.noteID)).length, [notes, pinnedIds]);

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <Header
        title={showForm ? (isEditing ? 'Edit Note' : 'Add Note') : 'Notes'}
        subtitle={
          showForm
            ? 'Note Details & Specifications'
            : `${notes.length} Total Notes`
        }
        showBack={!showForm}
        onBack={() => {
          navigation.goBack();
        }}
      />

      {/* ========================================================================= */}
      {/* 1. FULL PAGE FORM (NO MODAL) - MATCHING WEB CRM: 2 FIELDS ONLY            */}
      {/* ========================================================================= */}
      {showForm ? (
        <KeyboardAvoidingView
          style={styles.flexOne}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            style={styles.fullFormScroll}
            contentContainerStyle={styles.fullFormContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="none"
          >
            {/* Form Card */}
            <View style={styles.formCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="document-text-outline" size={18} color={THEME_PRIMARY} />
                <Text style={styles.sectionTitle}>{isEditing ? 'Edit Note' : 'Add New Note'}</Text>
              </View>

              {/* 1. Note Title (Required) */}
              <Input
                label="Note Title"
                placeholder="Enter note title..."
                value={noteTitle}
                onChangeText={(text) => {
                  setNoteTitle(text);
                  if (errors.noteTitle) setErrors((prev) => ({ ...prev, noteTitle: '' }));
                }}
                error={errors.noteTitle}
                required={true}
                leftIcon="create-outline"
              />

              {/* 2. Specification / Details */}
              <Input
                label="Specification"
                placeholder="Enter note specification or notes details..."
                value={specification}
                onChangeText={setSpecification}
                multiline={true}
                numberOfLines={5}
                style={styles.textArea}
                leftIcon="document-text-outline"
              />
            </View>

            {/* Bottom Action Buttons (Reset & Submit) */}
            <View style={styles.fullFormActionButtons}>
              <TouchableOpacity
                style={styles.formActionBtnReset}
                onPress={handleResetForm}
                disabled={saving}
                activeOpacity={0.7}
              >
                <Ionicons name="refresh-outline" size={18} color="#475569" />
                <Text style={styles.formActionBtnResetText}>Reset</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.formActionBtnSubmit, saving && { opacity: 0.7 }]}
                onPress={handleSaveNote}
                disabled={saving}
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-done" size={20} color="#ffffff" />
                    <Text style={styles.formActionBtnSubmitText}>
                      {isEditing ? 'Update Note' : 'Save Note'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        /* ========================================================================= */
        /* 2. NOTES LIST VIEW                                                        */
        /* ========================================================================= */
        <View style={styles.flexOne}>
          {/* Action Row: Search + Add Button */}
          <View style={styles.actionRow}>
            <View style={styles.searchContainer}>
              <SearchBar
                value={search}
                onChangeText={setSearch}
                placeholder="Search notes..."
              />
            </View>

            <TouchableOpacity
              style={styles.addBtn}
              onPress={handleOpenAddForm}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={16} color="#ffffff" />
              <Text style={styles.addBtnText}>Add</Text>
            </TouchableOpacity>
          </View>

          {/* Filter Pills (All / Pinned) */}
          <View style={styles.filterPillsRow}>
            <TouchableOpacity
              style={[
                styles.filterPill,
                activeTab === 'All' && styles.filterPillActive,
              ]}
              onPress={() => setActiveTab('All')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterPillText,
                  activeTab === 'All' && styles.filterPillTextActive,
                ]}
              >
                All ({notes.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterPill,
                styles.pinnedFilterPill,
                activeTab === 'Pinned' && styles.filterPillActive,
              ]}
              onPress={() => setActiveTab('Pinned')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="pin"
                size={12}
                color={activeTab === 'Pinned' ? '#ffffff' : '#645695'}
              />
              <Text
                style={[
                  styles.filterPillText,
                  activeTab === 'Pinned' && styles.filterPillTextActive,
                ]}
              >
                Pinned ({pinnedCount})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Notes FlatList */}
          <FlatList
            data={sortedNotes}
            keyExtractor={(item) => String(item.noteID || Math.random())}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => fetchNotes(true)}
                colors={[Colors.primary]}
              />
            }
            renderItem={({ item }) => {
              const specSnippet = item.specification?.trim();
              const isPinned = pinnedIds.includes(item.noteID);

              return (
                <CommonListCard
                  title={item.noteTitle || 'Untitled Note'}
                  subtitle={item.createdDate ? `Created: ${formatDate(item.createdDate)}` : undefined}
                  headerRightComponent={
                    <TouchableOpacity
                      style={[
                        styles.webPinBtn,
                        isPinned ? styles.webPinBtnPinned : styles.webPinBtnUnpinned,
                      ]}
                      onPress={() => handleTogglePin(item.noteID)}
                      activeOpacity={0.7}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Ionicons
                        name={isPinned ? 'pin' : 'pin-outline'}
                        size={16}
                        color={isPinned ? '#645695' : '#94a3b8'}
                      />
                    </TouchableOpacity>
                  }
                  avatarText={(item.noteTitle || 'N').charAt(0).toUpperCase()}
                  avatarBgColor={isPinned ? '#EDE9FE' : '#F1F5F9'}
                  avatarColor={isPinned ? THEME_PRIMARY : '#475569'}
                  pills={[
                    specSnippet ? {
                      icon: 'document-text-outline',
                      text: specSnippet,
                      numberOfLines: 3,
                    } : null,
                  ]}
                  footerIcon="time-outline"
                  footerText={item.createdDate ? formatDate(item.createdDate) : undefined}
                  style={isPinned ? styles.pinnedCardBorder : undefined}
                  onPress={() => handleOpenEditForm(item)}
                  onEdit={() => handleOpenEditForm(item)}
                  onDelete={() => {
                    setSelectedNoteForDelete(item);
                    setDeleteModalVisible(true);
                  }}
                />
              );
            }}
            ListEmptyComponent={
              !loading ? (
                <EmptyState
                  title="No Notes Found"
                  description="No notes match your search or filter. Tap below to create your first note."
                  actionTitle="Add New Note"
                  onAction={handleOpenAddForm}
                />
              ) : (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="small" color={THEME_PRIMARY} />
                  <Text style={styles.loadingText}>Loading notes...</Text>
                </View>
              )
            }
          />
        </View>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        visible={deleteModalVisible}
        title="Delete Note"
        message={`Are you sure you want to delete note "${selectedNoteForDelete?.noteTitle || 'this note'}"?`}
        confirmText="Delete"
        cancelText="Cancel"
        isDestructive={true}
        loading={deleting}
        onConfirm={handleDeleteNote}
        onCancel={() => {
          setDeleteModalVisible(false);
          setSelectedNoteForDelete(null);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  flexOne: {
    flex: 1,
  },

  // Search + Add Action Row (Exact same UI Theme as LeadsListScreen)
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
    gap: 10,
  },
  searchContainer: {
    flex: 1,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    height: 38,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 4,
    justifyContent: 'center',
  },
  addBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },

  // Filter Pills Row
  filterPillsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.slate100,
  },
  pinnedFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  filterPillActive: {
    backgroundColor: Colors.primary,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.slate600,
  },
  filterPillTextActive: {
    color: Colors.textInverse,
    fontWeight: '700',
  },

  // List Content (Matching LeadsListScreen paddingBottom: 90)
  listContent: {
    padding: 16,
    paddingBottom: 90,
  },
  loadingBox: {
    paddingVertical: 50,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: Colors.slate500,
  },

  // Pin & Unpin Styles
  pinnedCardBorder: {
    borderColor: '#c4b5fd',
    borderWidth: 1.5,
    backgroundColor: '#faf8ff',
  },
  webPinBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  webPinBtnPinned: {
    backgroundColor: '#ede9fe',
    borderColor: '#d8b4fe',
  },
  webPinBtnUnpinned: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },

  // Full Page Form Styling (Exact Lead Form Theme)
  fullFormScroll: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  fullFormContent: {
    padding: 16,
    paddingBottom: 180,
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1e293b',
  },
  textArea: {
    minHeight: 90,
    textAlignVertical: 'top',
  },

  // Action Buttons
  fullFormActionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    marginBottom: 36,
  },
  formActionBtnReset: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
  },
  formActionBtnResetText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  formActionBtnSubmit: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 12,
    backgroundColor: THEME_PRIMARY,
    shadowColor: THEME_PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  formActionBtnSubmitText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
});
