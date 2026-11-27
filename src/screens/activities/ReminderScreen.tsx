import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useCompany } from '../../context/CompanyContext';
import { reminderService, ReminderItem } from '../../api/reminderService';
import { MobileDatePicker } from '../../components/common/MobileDatePicker';
import { Colors } from '../../theme/colors';

const BRAND_PURPLE = '#645695';
const BRAND_PURPLE_LIGHT = '#8176a9';
const BRAND_PURPLE_BG = 'rgba(100, 86, 149, 0.12)';

interface ReminderScreenProps {
  navigation: any;
  route?: any;
}

const REPEAT_OPTIONS = ['None', 'Daily', 'Weekly', 'Monthly', 'Yearly'];
const ENDS_OPTIONS = ['Never', 'On', 'After'];
const PRIORITY_OPTIONS = ['HIGH', 'MEDIUM', 'LOW'];

export const ReminderScreen: React.FC<ReminderScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const { selectedCompanyId, isAllCompanies } = useCompany();
  const userRole = (user?.role || '').toLowerCase();
  const isAdmin = userRole.includes('admin') || userRole.includes('super');
  const userId = Number(user?.id || user?.userID);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed'>('upcoming');
  const [showForm, setShowForm] = useState(true);

  // List data from SQL Server DB (ReminderMaster)
  const [reminders, setReminders] = useState<ReminderItem[]>([]);

  // Form State
  const [isEditMode, setIsEditMode] = useState(false);
  const [editId, setEditId] = useState<number>(0);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<string>('HIGH');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState<string>('12:28');
  const [showRepeat, setShowRepeat] = useState(false);
  const [repeat, setRepeat] = useState<string>('None');
  const [endType, setEndType] = useState<string>('Never');
  const [endDate, setEndDate] = useState<string>('');
  const [occurrences, setOccurrences] = useState<number>(1);
  const [saving, setSaving] = useState(false);

  // Load reminders (Filtered by Company and Role: Admin = All, User = CreatedBy / UserId)
  const loadReminders = useCallback(async () => {
    try {
      setLoading(true);
      const targetCompanyId = isAllCompanies ? 0 : Number(selectedCompanyId || 0);
      const data = await reminderService.getAllReminders(targetCompanyId > 0 ? targetCompanyId : undefined);

      let list = data || [];

      // 1. Company filter
      if (!isAllCompanies && targetCompanyId > 0) {
        list = list.filter((r: any) => {
          const compId = Number(r.companyId ?? r.companyID ?? 0);
          return compId === 0 || compId === targetCompanyId;
        });
      }

      // 2. Role filter: Admin = all access, User = createdBy / userId wise
      if (!isAdmin && userId) {
        list = list.filter((r: any) => {
          const creator = Number(r.userId || r.createdBy || r.createdByUserID || r.createdById || 0);
          return creator === userId;
        });
      }

      setReminders(list);
    } catch (err) {
      console.warn('Failed to load reminders:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCompanyId, isAllCompanies, isAdmin, userId]);

  useEffect(() => {
    loadReminders();
  }, [loadReminders]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReminders();
    setRefreshing(false);
  };

  // Quick Select handlers matching Web CRM
  const handleQuickSelect = (type: 'today' | 'tomorrow' | 'repeat') => {
    const today = new Date();
    if (type === 'today') {
      setDate(today.toISOString().split('T')[0]);
    } else if (type === 'tomorrow') {
      const tomorrow = new Date();
      tomorrow.setDate(today.getDate() + 1);
      setDate(tomorrow.toISOString().split('T')[0]);
    } else if (type === 'repeat') {
      const nextShow = !showRepeat;
      setShowRepeat(nextShow);
      if (!nextShow) {
        setRepeat('None');
      } else if (repeat === 'None') {
        setRepeat('Daily');
      }
    }
  };

  const handleReset = () => {
    const today = new Date();
    setTitle('');
    setDescription('');
    setPriority('HIGH');
    setDate(today.toISOString().split('T')[0]);
    setTime('12:28');
    setShowRepeat(false);
    setRepeat('None');
    setEndType('Never');
    setEndDate('');
    setOccurrences(1);
    setIsEditMode(false);
    setEditId(0);
  };

  const handleEdit = (item: ReminderItem) => {
    setIsEditMode(true);
    setEditId(item.reminderId);
    setTitle(item.title || '');
    setDescription(item.description || '');
    setPriority(item.priorityType || 'HIGH');

    try {
      const d = new Date(item.reminderDateTime);
      if (!isNaN(d.getTime())) {
        setDate(d.toISOString().split('T')[0]);
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        setTime(`${hh}:${mm}`);
      }
    } catch {
      setDate(new Date().toISOString().split('T')[0]);
      setTime('12:28');
    }

    const hasRepeat = Boolean(item.repeatType && item.repeatType !== 'None');
    setShowRepeat(hasRepeat);
    setRepeat(item.repeatType || 'None');

    if (item.repeatEndDate) {
      setEndType('On');
      try {
        setEndDate(new Date(item.repeatEndDate).toISOString().split('T')[0]);
      } catch {
        setEndDate('');
      }
    } else if (item.maxOccurrences) {
      setEndType('After');
      setOccurrences(item.maxOccurrences);
    } else {
      setEndType('Never');
    }

    setShowForm(true);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter a reminder title');
      return;
    }

    setSaving(true);
    try {
      const currentUserId = Number(user?.id || user?.userID || 1);
      const reminderDateTime = `${date}T${time || '09:00'}:00`;

      const payload: Partial<ReminderItem> = {
        reminderId: editId,
        companyId: selectedCompanyId || 1,
        userId: userId || currentUserId,
        createdBy: userId || currentUserId,
        createdByUserID: userId || currentUserId,
        title: title.trim(),
        description: description.trim(),
        priorityType: priority,
        reminderDateTime,
        reminderType: 'NORMAL',
        repeatType: repeat,
        repeatInterval: 1,
        repeatDays: '',
        repeatEndDate: endType === 'On' && endDate ? endDate : null,
        reminderBeforeMin: 10,
        status: 'Pending',
        isCompleted: false,
        isActive: true,
        maxOccurrences: endType === 'After' ? Number(occurrences) : null,
        nextReminderDateTime: reminderDateTime,
      };

      if (isEditMode) {
        await reminderService.updateReminder(payload);
        Alert.alert('Success', 'Reminder updated successfully');
      } else {
        await reminderService.saveReminder(payload);
        Alert.alert('Success', 'Reminder saved successfully');
      }

      handleReset();
      await loadReminders();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to save reminder');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkComplete = (item: ReminderItem) => {
    Alert.alert(
      'Mark as Complete',
      `Are you sure you want to mark "${item.title}" as completed?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          style: 'default',
          onPress: async () => {
            try {
              setLoading(true);
              const currentUserId = Number(user?.id || user?.userID || 1);
              await reminderService.completeReminder(item.reminderId, currentUserId);
              await loadReminders();
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to mark as completed');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleDelete = (item: ReminderItem) => {
    Alert.alert(
      'Delete Reminder',
      `Are you sure you want to delete "${item.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await reminderService.deleteReminder(item.reminderId);
              await loadReminders();
              if (isEditMode && editId === item.reminderId) {
                handleReset();
              }
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to delete reminder');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // Formats date matching web: "26 Sept 2026, 12:28"
  const formatDisplayDateTime = (dateTimeStr?: string) => {
    if (!dateTimeStr) return '';
    try {
      const d = new Date(dateTimeStr);
      if (isNaN(d.getTime())) return dateTimeStr;
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    } catch {
      return dateTimeStr;
    }
  };

  const upcomingList = reminders.filter((r) => !r.isCompleted);
  const completedList = reminders.filter((r) => r.isCompleted);
  const currentList = activeTab === 'upcoming' ? upcomingList : completedList;

  return (
    <View style={styles.container}>
      {/* Top Header Card matching Web CRM */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={BRAND_PURPLE} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.headerIconBox}>
            <Ionicons name="notifications" size={18} color="#ffffff" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Reminders</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.toggleFormBtn}
          onPress={() => setShowForm((prev) => !prev)}
        >
          <Ionicons
            name={showForm ? 'chevron-up-circle' : 'add-circle'}
            size={26}
            color={BRAND_PURPLE}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[BRAND_PURPLE]} />
        }
      >
        {/* FORM SECTION (matching Web CRM left card) */}
        {showForm && (
          <View style={styles.card}>
            <View style={styles.formHeaderRow}>
              <View style={styles.formTitleRow}>
                <Ionicons name="notifications-outline" size={18} color={BRAND_PURPLE} />
                <Text style={styles.formTitle}>
                  {isEditMode ? 'Edit Reminder' : 'Reminder'}
                </Text>
              </View>
              {isEditMode && (
                <TouchableOpacity onPress={handleReset}>
                  <Text style={styles.cancelEditText}>Cancel Edit</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Title */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                Title <Text style={styles.requiredStar}>*</Text>
              </Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter Title"
                placeholderTextColor="#94a3b8"
                value={title}
                onChangeText={setTitle}
              />
            </View>

            {/* Description */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Enter description"
                placeholderTextColor="#94a3b8"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={2}
              />
            </View>

            {/* Priority Pills */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Priority</Text>
              <View style={styles.pillsRow}>
                {PRIORITY_OPTIONS.map((opt) => {
                  const isSelected = priority === opt;
                  return (
                    <TouchableOpacity
                      key={opt}
                      style={[styles.pill, isSelected ? styles.pillSelected : null]}
                      onPress={() => setPriority(opt)}
                    >
                      <Text
                        style={[
                          styles.pillText,
                          isSelected ? styles.pillTextSelected : null,
                        ]}
                      >
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Date & Time Picker */}
            <View style={styles.fieldGroup}>
              <MobileDatePicker
                label="Date & Time"
                value={date}
                timeValue={time}
                onChangeDate={setDate}
                onChangeTime={setTime}
                showTime={true}
                required={true}
              />
            </View>

            {/* Quick Chips: Today, Tomorrow, Repeat */}
            <View style={styles.fieldGroup}>
              <View style={styles.pillsRow}>
                <TouchableOpacity
                  style={[
                    styles.pill,
                    date === new Date().toISOString().split('T')[0] ? styles.pillSelected : null,
                  ]}
                  onPress={() => handleQuickSelect('today')}
                >
                  <Text
                    style={[
                      styles.pillText,
                      date === new Date().toISOString().split('T')[0]
                        ? styles.pillTextSelected
                        : null,
                    ]}
                  >
                    Today
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.pill}
                  onPress={() => handleQuickSelect('tomorrow')}
                >
                  <Text style={styles.pillText}>Tomorrow</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.pill, showRepeat ? styles.pillSelected : null]}
                  onPress={() => handleQuickSelect('repeat')}
                >
                  <Ionicons
                    name="repeat-outline"
                    size={14}
                    color={showRepeat ? '#ffffff' : '#334155'}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={[styles.pillText, showRepeat ? styles.pillTextSelected : null]}>
                    Repeat
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Repeat Schedule (when Repeat is active) */}
            {showRepeat && (
              <View style={styles.repeatContainer}>
                <Text style={styles.subFieldLabel}>Repeat Schedule</Text>
                <View style={styles.pillsRow}>
                  {REPEAT_OPTIONS.map((opt) => {
                    const isSelected = repeat === opt;
                    return (
                      <TouchableOpacity
                        key={opt}
                        style={[styles.smallPill, isSelected ? styles.pillSelected : null]}
                        onPress={() => setRepeat(opt)}
                      >
                        <Text
                          style={[
                            styles.smallPillText,
                            isSelected ? styles.pillTextSelected : null,
                          ]}
                        >
                          {opt}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Ends Options */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Ends</Text>
              <View style={styles.pillsRow}>
                {ENDS_OPTIONS.map((opt) => {
                  const isSelected = endType === opt;
                  return (
                    <TouchableOpacity
                      key={opt}
                      style={[styles.pill, isSelected ? styles.pillSelected : null]}
                      onPress={() => setEndType(opt)}
                    >
                      <Text
                        style={[
                          styles.pillText,
                          isSelected ? styles.pillTextSelected : null,
                        ]}
                      >
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {endType === 'On' && (
                <View style={{ marginTop: 10 }}>
                  <MobileDatePicker
                    label="End Date"
                    value={endDate}
                    onChangeDate={setEndDate}
                    required={true}
                  />
                </View>
              )}

              {endType === 'After' && (
                <View style={styles.occurrencesRow}>
                  <TextInput
                    style={styles.numberInput}
                    keyboardType="numeric"
                    value={String(occurrences)}
                    onChangeText={(val) => setOccurrences(Number(val) || 1)}
                  />
                  <Text style={styles.occurrencesLabel}>occurrences</Text>
                </View>
              )}
            </View>

            {/* Buttons: Save & Reset */}
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity
                style={[styles.primaryButton, saving ? styles.buttonDisabled : null]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    {isEditMode ? 'Update' : 'Save'}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryButton} onPress={handleReset}>
                <Text style={styles.secondaryButtonText}>Reset</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* LIST SECTION (matching Web CRM right card) */}
        <View style={styles.card}>
          {/* Tabs: Upcoming vs Completed */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'upcoming' ? styles.tabButtonActive : null]}
              onPress={() => setActiveTab('upcoming')}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'upcoming' ? styles.tabTextActive : null,
                ]}
              >
                Upcoming
              </Text>
              <View
                style={[
                  styles.tabBadge,
                  activeTab === 'upcoming' ? styles.tabBadgeActive : null,
                ]}
              >
                <Text
                  style={[
                    styles.tabBadgeText,
                    activeTab === 'upcoming' ? styles.tabBadgeTextActive : null,
                  ]}
                >
                  {upcomingList.length}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'completed' ? styles.tabButtonActive : null]}
              onPress={() => setActiveTab('completed')}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'completed' ? styles.tabTextActive : null,
                ]}
              >
                Completed
              </Text>
              <View
                style={[
                  styles.tabBadge,
                  activeTab === 'completed' ? styles.tabBadgeActive : null,
                ]}
              >
                <Text
                  style={[
                    styles.tabBadgeText,
                    activeTab === 'completed' ? styles.tabBadgeTextActive : null,
                  ]}
                >
                  {completedList.length}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* List Content */}
          {loading && reminders.length === 0 ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={BRAND_PURPLE} />
              <Text style={styles.loadingText}>Loading reminders...</Text>
            </View>
          ) : currentList.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="notifications-off-outline" size={40} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>
                {activeTab === 'upcoming' ? 'No Upcoming Reminders' : 'No Completed Reminders'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {activeTab === 'upcoming'
                  ? 'Add a reminder above to get notified on time'
                  : 'Completed reminders will appear here'}
              </Text>
            </View>
          ) : (
            currentList.map((item) => {
              const isHigh = item.priorityType === 'HIGH';
              const isMedium = item.priorityType === 'MEDIUM';

              const priorityBg = isHigh ? '#fee2e2' : isMedium ? '#fed7aa' : '#d1fae5';
              const priorityColor = isHigh ? '#991b1b' : isMedium ? '#92400e' : '#065f46';

              return (
                <View key={item.reminderId} style={styles.reminderItemCard}>
                  {/* Left Bell Icon */}
                  <View style={styles.bellIconContainer}>
                    <Ionicons
                      name={item.isCompleted ? 'checkmark-circle' : 'notifications'}
                      size={18}
                      color={item.isCompleted ? '#16a34a' : BRAND_PURPLE}
                    />
                  </View>

                  {/* Center Details */}
                  <View style={styles.reminderContent}>
                    <View style={styles.reminderTitleRow}>
                      <Text
                        style={[
                          styles.reminderTitle,
                          item.isCompleted && styles.reminderTitleCompleted,
                        ]}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                      <View style={[styles.priorityBadge, { backgroundColor: priorityBg }]}>
                        <Text style={[styles.priorityBadgeText, { color: priorityColor }]}>
                          {item.priorityType || 'HIGH'}
                        </Text>
                      </View>
                    </View>

                    {item.description ? (
                      <Text style={styles.reminderDescription} numberOfLines={2}>
                        {item.description}
                      </Text>
                    ) : null}

                    {/* Meta Row: Date/Time + Repeat */}
                    <View style={styles.metaRow}>
                      <View style={styles.metaChip}>
                        <Ionicons name="calendar-outline" size={11} color="#64748b" />
                        <Text style={styles.metaChipText}>
                          {formatDisplayDateTime(item.reminderDateTime)}
                        </Text>
                      </View>

                      {item.repeatType && item.repeatType !== 'None' ? (
                        <View style={styles.metaChip}>
                          <Ionicons name="repeat-outline" size={11} color="#64748b" />
                          <Text style={styles.metaChipText}>{item.repeatType}</Text>
                        </View>
                      ) : null}

                      {item.isCompleted && (
                        <View style={[styles.metaChip, { backgroundColor: '#dcfce7', borderColor: '#bbf7d0' }]}>
                          <Ionicons name="checkmark-done" size={11} color="#15803d" />
                          <Text style={[styles.metaChipText, { color: '#15803d', fontWeight: '700' }]}>
                            Done
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Right Action Buttons */}
                  <View style={styles.actionsColumn}>
                    {!item.isCompleted && (
                      <TouchableOpacity
                        style={styles.completeBtn}
                        onPress={() => handleMarkComplete(item)}
                      >
                        <Ionicons name="checkmark-circle-outline" size={13} color="#ffffff" />
                        <Text style={styles.completeBtnText}>Complete</Text>
                      </TouchableOpacity>
                    )}

                    <View style={styles.iconButtonsRow}>
                      <TouchableOpacity
                        style={styles.iconActionBtn}
                        onPress={() => handleEdit(item)}
                      >
                        <Ionicons name="pencil" size={15} color={BRAND_PURPLE} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.iconActionBtn}
                        onPress={() => handleDelete(item)}
                      >
                        <Ionicons name="trash-outline" size={15} color="#dc2626" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  backButton: {
    padding: 6,
    marginRight: 6,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: BRAND_PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: BRAND_PURPLE,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  toggleFormBtn: {
    padding: 4,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  formHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 2,
    borderBottomColor: BRAND_PURPLE,
    paddingBottom: 8,
    marginBottom: 14,
  },
  formTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: BRAND_PURPLE,
  },
  cancelEditText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#dc2626',
  },
  fieldGroup: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  subFieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 6,
  },
  requiredStar: {
    color: '#ef4444',
  },
  textInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#1e293b',
  },
  textArea: {
    minHeight: 56,
    textAlignVertical: 'top',
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  pillSelected: {
    backgroundColor: BRAND_PURPLE,
    borderColor: BRAND_PURPLE,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  pillTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  repeatContainer: {
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  smallPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  smallPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  occurrencesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  numberInput: {
    width: 70,
    height: 38,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 14,
    color: '#1e293b',
    backgroundColor: '#ffffff',
  },
  occurrencesLabel: {
    fontSize: 13,
    color: '#475569',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: BRAND_PURPLE,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '600',
  },
  // Tab Section
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    marginBottom: 14,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    gap: 6,
  },
  tabButtonActive: {
    borderBottomColor: BRAND_PURPLE,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  tabTextActive: {
    color: BRAND_PURPLE,
    fontWeight: '700',
  },
  tabBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
  },
  tabBadgeActive: {
    backgroundColor: BRAND_PURPLE,
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  tabBadgeTextActive: {
    color: '#ffffff',
  },
  // List Items
  loadingBox: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 13,
    color: '#64748b',
  },
  emptyBox: {
    paddingVertical: 36,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#475569',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
    textAlign: 'center',
  },
  reminderItemCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bellIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: BRAND_PURPLE_BG,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  reminderContent: {
    flex: 1,
    marginRight: 8,
  },
  reminderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 3,
  },
  reminderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  reminderTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#94a3b8',
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priorityBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  reminderDescription: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  metaChipText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '500',
  },
  actionsColumn: {
    alignItems: 'flex-end',
    gap: 6,
  },
  completeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#28a745',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
    gap: 4,
  },
  completeBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  iconButtonsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  iconActionBtn: {
    padding: 5,
  },
});
