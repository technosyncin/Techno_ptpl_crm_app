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
import { MobileDropdown, DropdownOption } from '../../components/common/MobileDropdown';
import { MobileDatePicker } from '../../components/common/MobileDatePicker';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import { CommonListCard } from '../../components/cards/CommonListCard';
import { formatDate } from '../../utils/formatting';
import { taskService, Task } from '../../api/taskService';
import { leadService } from '../../api/leadService';
import { mastersService } from '../../api/mastersService';
import { useAuth } from '../../context/AuthContext';
import { useCompany } from '../../context/CompanyContext';
import { Colors } from '../../theme/colors';

const THEME_PRIMARY = '#645695';
const THEME_LIGHT = '#8176a9';
const THEME_BG = '#f5f6fa';

interface MyTasksScreenProps {
  navigation: any;
  route?: any;
}

export const MyTasksScreen: React.FC<MyTasksScreenProps> = ({ navigation, route }) => {
  const { user } = useAuth();
  const { selectedCompanyId, isAllCompanies } = useCompany();
  const userRole = (user?.role || '').toLowerCase();
  const isAdmin = userRole.includes('admin') || userRole.includes('super');
  const userId = Number(user?.id || user?.userID);

  // Screen View Mode: false = List View, true = Full-Screen Form (NO MODAL)
  const [showForm, setShowForm] = useState(
    Boolean(route?.params?.openForm || route?.params?.editTask)
  );

  // List Data State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Completed'>('Pending');

  // Deletion Modal
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedTaskForDelete, setSelectedTaskForDelete] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Lookups State
  const [leadsList, setLeadsList] = useState<any[]>([]);
  const [userOptions, setUserOptions] = useState<DropdownOption[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(false);

  // Form State (Matching Web CRM TaskFormModal fields)
  const [editingTask, setEditingTask] = useState<Task | null>(route?.params?.editTask || null);
  const isEditing = Boolean(editingTask);

  const [purposeName, setPurposeName] = useState(editingTask?.purposeName || editingTask?.title || '');
  const [selectedLeadId, setSelectedLeadId] = useState<string | number>('');
  const [leadName, setLeadName] = useState(editingTask?.leadName || '');
  const [leadNumber, setLeadNumber] = useState(editingTask?.leadNumber || '');
  const [assignedTo, setAssignedTo] = useState<string | number>(
    editingTask?.assignedTo ? String(editingTask.assignedTo) : (user?.username || user?.fullName || '')
  );
  const [dueDate, setDueDate] = useState(
    editingTask?.dueDate ? editingTask.dueDate.split('T')[0] : new Date().toISOString().split('T')[0]
  );
  const [dueTime, setDueTime] = useState(editingTask?.dueTime || '10:00');
  const [taskStatusChoice, setTaskStatusChoice] = useState<'Pending' | 'Completed'>(
    editingTask?.taskStatus === 1 || editingTask?.status === 'Completed' ? 'Completed' : 'Pending'
  );
  const [remark, setRemark] = useState(editingTask?.remark || editingTask?.description || '');

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Status dropdown options
  const statusOptions: DropdownOption[] = [
    { label: 'Pending', value: 'Pending' },
    { label: 'Completed', value: 'Completed' },
  ];

  // Lead options for dropdown
  const leadDropdownOptions: DropdownOption[] = useMemo(() => {
    return leadsList.map((l) => ({
      label: `${l.leadName || l.companyName || 'Lead #' + l.leadID}${l.mobileNo ? ` (${l.mobileNo})` : ''}`,
      value: String(l.leadID),
    }));
  }, [leadsList]);

  // Load Initial Lookups (Leads and Users)
  const loadLookups = useCallback(async () => {
    setLoadingLookups(true);
    try {
      const activeComp = isAllCompanies ? 0 : Number(selectedCompanyId || 0);
      const [leadsRes, usersRes] = await Promise.allSettled([
        leadService.getLeads({ companyId: activeComp, pageSize: 500 }),
        mastersService.getUsers(activeComp > 0 ? activeComp : undefined),
      ]);

      if (leadsRes.status === 'fulfilled' && leadsRes.value?.data) {
        setLeadsList(leadsRes.value.data);
      }

      if (usersRes.status === 'fulfilled' && usersRes.value) {
        const uOpts: DropdownOption[] = usersRes.value.map((u) => ({
          label: u.fullName || u.userName,
          value: u.userName || String(u.userID),
        }));
        setUserOptions(uOpts);
      }
    } catch (e) {
      console.warn('Error loading lookups for My Task:', e);
    } finally {
      setLoadingLookups(false);
    }
  }, [selectedCompanyId, isAllCompanies]);

  // Fetch Tasks List (Filtered by Company and Role: Admin = All, User = CreatedBy / AssignedTo)
  const fetchTasks = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const targetCompanyId = isAllCompanies ? 0 : Number(selectedCompanyId || 0);
        const userIdentifier = user?.username || user?.fullName || (user?.id ? String(user.id) : '');
        const res = await taskService.getTasks({
          assignedTo: !isAdmin && userIdentifier ? userIdentifier : undefined,
          companyId: targetCompanyId > 0 ? targetCompanyId : undefined,
          search: search.trim() || undefined,
          limit: 1000,
        });

        let list = res || [];

        // 1. Company filter
        if (!isAllCompanies && targetCompanyId > 0) {
          list = list.filter((t: any) => {
            const compId = Number(t.companyID ?? t.companyId ?? 0);
            return compId === 0 || compId === targetCompanyId;
          });
        }

        // 2. Role filter: Admin = all access, User = createdBy / assignedTo wise
        if (!isAdmin && userId) {
          const currentUid = String(userId).toLowerCase().trim();
          const currentUname = String(user?.username || '').toLowerCase().trim();
          const currentFname = String(user?.fullName || '').toLowerCase().trim();

          list = list.filter((t: Task) => {
            const assigned = String(t.assignedTo || '').toLowerCase().trim();
            const created = String((t as any).createdBy || (t as any).createdByUserID || (t as any).createdById || '').toLowerCase().trim();

            const matchesAssignee =
              (currentUid && assigned === currentUid) ||
              (currentUname && assigned === currentUname) ||
              (currentFname && assigned === currentFname) ||
              (currentUname && assigned.includes(currentUname)) ||
              (currentFname && assigned.includes(currentFname));

            const matchesCreator =
              (currentUid && created === currentUid) ||
              (currentUname && created === currentUname);

            return matchesAssignee || matchesCreator;
          });
        }

        setTasks(list);
      } catch (e) {
        console.warn('Error fetching tasks:', e);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search, user, selectedCompanyId, isAllCompanies, isAdmin, userId]
  );

  useEffect(() => {
    loadLookups();
  }, [loadLookups]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Step-by-step Back Navigation:
  // When inside the Form, pressing Back (Hardware Back, Gesture Swipe, or Header)
  // closes the form and returns to Task List.
  // When on the Task List, pressing Back goes back to Dashboard.
  useEffect(() => {
    const backAction = () => {
      if (showForm) {
        setShowForm(false);
        setEditingTask(null);
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
        setEditingTask(null);
      }
    });

    return () => {
      backHandler.remove();
      unsubscribe();
    };
  }, [navigation, showForm]);

  // Auto-fill Lead Details when picked from dropdown
  const handleSelectLead = (val: string | number) => {
    setSelectedLeadId(val);
    const chosen = leadsList.find((l) => String(l.leadID) === String(val));
    if (chosen) {
      setLeadName(chosen.leadName || chosen.companyName || '');
      setLeadNumber(chosen.mobileNo || chosen.phone || '');
    }
  };

  // Open Form to Add New Task
  const handleOpenAddForm = () => {
    setEditingTask(null);
    setPurposeName('');
    setSelectedLeadId('');
    setLeadName('');
    setLeadNumber('');
    setAssignedTo(user?.username || user?.fullName || '');
    setDueDate(new Date().toISOString().split('T')[0]);
    setDueTime('10:00');
    setTaskStatusChoice('Pending');
    setRemark('');
    setErrors({});
    setShowForm(true);
  };

  // Open Form to Edit Task
  const handleOpenEditForm = (item: Task) => {
    setEditingTask(item);
    setPurposeName(item.purposeName || item.title || '');
    const matchingLead = leadsList.find((l) => (l.leadName || l.companyName) === item.leadName);
    setSelectedLeadId(matchingLead ? String(matchingLead.leadID) : '');
    setLeadName(item.leadName || '');
    setLeadNumber(item.leadNumber || '');
    setAssignedTo(item.assignedTo ? String(item.assignedTo) : (user?.username || ''));
    setDueDate(item.dueDate ? item.dueDate.split('T')[0] : new Date().toISOString().split('T')[0]);
    setDueTime(item.dueTime || '10:00');
    setTaskStatusChoice(item.taskStatus === 1 || item.status === 'Completed' ? 'Completed' : 'Pending');
    setRemark(item.remark || item.description || '');
    setErrors({});
    setShowForm(true);
  };

  // Reset Form
  const handleResetForm = () => {
    if (editingTask) {
      handleOpenEditForm(editingTask);
    } else {
      handleOpenAddForm();
    }
  };

  // Save Task (Create or Update)
  const handleSaveTask = async () => {
    const newErrors: Record<string, string> = {};
    if (!purposeName.trim()) {
      newErrors.purposeName = 'Task Title is required.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      Alert.alert('Validation Error', 'Please enter Task Title.');
      return;
    }

    setSaving(true);
    try {
      const isCompleted = taskStatusChoice === 'Completed';
      const payload: any = {
        purposeName: purposeName.trim(),
        leadName: leadName.trim() || undefined,
        leadNumber: leadNumber.trim() || undefined,
        assignedTo: assignedTo ? String(assignedTo) : (user?.username || 'Admin'),
        dueDate: dueDate,
        dueTime: dueTime || '10:00',
        remark: remark.trim() || undefined,
        status: isCompleted ? 'Completed' : 'Pending',
        taskStatus: isCompleted ? 1 : 0,
        companyID: selectedCompanyId || 1,
        createdBy: userId || 1,
        createdByUserID: userId || 1,
      };

      if (isEditing && editingTask) {
        await taskService.updateTask(editingTask.taskID, payload);
        Alert.alert('Success', 'Task updated successfully!');
      } else {
        await taskService.createTask(payload);
        Alert.alert('Success', 'Task created successfully!');
      }

      setShowForm(false);
      setEditingTask(null);
      fetchTasks();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to save task.';
      Alert.alert('Save Failed', msg);
    } finally {
      setSaving(false);
    }
  };

  // Toggle Task Status directly from Card
  const handleToggleTaskStatus = async (item: Task) => {
    const isCompleted = item.taskStatus === 1 || item.status === 'Completed';
    const newStatus = isCompleted ? '0' : '1';
    const success = await taskService.updateTaskStatus(item.taskID, newStatus);
    if (success) {
      fetchTasks();
    } else {
      Alert.alert('Error', 'Could not update task status.');
    }
  };

  // Delete Task
  const handleDeleteTask = async () => {
    if (!selectedTaskForDelete) return;
    setDeleting(true);
    try {
      const ok = await taskService.deleteTask(selectedTaskForDelete.taskID);
      if (ok) {
        setDeleteModalVisible(false);
        setSelectedTaskForDelete(null);
        fetchTasks();
        Alert.alert('Success', 'Task deleted successfully.');
      } else {
        Alert.alert('Error', 'Failed to delete task.');
      }
    } catch (e: any) {
      Alert.alert('Delete Failed', e?.response?.data?.message || 'Failed to delete task.');
    } finally {
      setDeleting(false);
    }
  };

  // Check if task is overdue
  const isOverdue = (dateStr?: string, isCompleted = false) => {
    if (!dateStr || isCompleted) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dateStr);
    due.setHours(0, 0, 0, 0);
    return due < today;
  };

  // Filter tasks based on search and statusFilter
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const isCompleted = t.taskStatus === 1 || t.status === 'Completed';
      if (statusFilter === 'Pending' && isCompleted) return false;
      if (statusFilter === 'Completed' && !isCompleted) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesTitle = (t.purposeName || t.title || '').toLowerCase().includes(q);
        const matchesLead = (t.leadName || '').toLowerCase().includes(q);
        const matchesPhone = (t.leadNumber || '').includes(q);
        const matchesRemark = (t.remark || t.description || '').toLowerCase().includes(q);
        const matchesAssigned = (String(t.assignedTo || '')).toLowerCase().includes(q);
        return matchesTitle || matchesLead || matchesPhone || matchesRemark || matchesAssigned;
      }
      return true;
    });
  }, [tasks, statusFilter, search]);

  const pendingCount = useMemo(
    () => tasks.filter((t) => !(t.taskStatus === 1 || t.status === 'Completed')).length,
    [tasks]
  );
  const completedCount = useMemo(
    () => tasks.filter((t) => t.taskStatus === 1 || t.status === 'Completed').length,
    [tasks]
  );

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <Header
        title={showForm ? (editingTask ? 'Edit Task' : 'New Task') : 'My Tasks'}
        subtitle={
          showForm
            ? 'Task Details & Assignments'
            : `${pendingCount} Pending • ${completedCount} Completed`
        }
        showBack={!showForm}
        onBack={() => {
          navigation.goBack();
        }}
      />

      {/* ========================================================================= */}
      {/* 1. FULL PAGE FORM (NO MODAL) - MATCHING LEADS LIST SCREEN FORM THEME      */}
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
            {/* Form Card (Matching LeadsListScreen formCard theme) */}
            <View style={styles.formCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="checkbox-outline" size={18} color={THEME_PRIMARY} />
                <Text style={styles.sectionTitle}>{isEditing ? 'Edit Task' : 'Add New Task'}</Text>
              </View>

              {/* 1. Task Title (Required) */}
              <Input
                label="Task Title"
                placeholder="e.g. Call client for demo follow-up"
                value={purposeName}
                onChangeText={(text) => {
                  setPurposeName(text);
                  if (errors.purposeName) setErrors((prev) => ({ ...prev, purposeName: '' }));
                }}
                error={errors.purposeName}
                required
                leftIcon="bookmark-outline"
              />

              {/* 2. Select Existing Lead */}
              <MobileDropdown
                label="Select Lead"
                placeholder="-- Choose Existing Lead --"
                options={leadDropdownOptions}
                selectedValue={selectedLeadId}
                onSelect={handleSelectLead}
                loading={loadingLookups}
                searchPlaceholder="Search lead name or phone..."
              />

              {/* 3. Contact Number */}
              <Input
                label="Contact Number"
                placeholder="Enter 10-digit mobile number"
                value={leadNumber}
                onChangeText={setLeadNumber}
                keyboardType="phone-pad"
                leftIcon="call-outline"
              />

              {/* 5. Assigned To */}
              <MobileDropdown
                label="Assigned To"
                placeholder="Select Employee / User..."
                options={userOptions}
                selectedValue={assignedTo}
                onSelect={setAssignedTo}
                loading={loadingLookups}
                searchPlaceholder="Search employee..."
              />

              {/* 6. Due Date & Due Time */}
              <MobileDatePicker
                label="Due Date & Time"
                value={dueDate}
                timeValue={dueTime}
                onChangeDate={setDueDate}
                onChangeTime={setDueTime}
                showTime
              />

              {/* 7. Status */}
              <MobileDropdown
                label="Status"
                placeholder="Select Status"
                options={statusOptions}
                selectedValue={taskStatusChoice}
                onSelect={(val) => setTaskStatusChoice(val as 'Pending' | 'Completed')}
              />

              {/* 8. Note / Remark */}
              <Input
                label="Note / Remark"
                placeholder="Additional instructions or notes for this task..."
                value={remark}
                onChangeText={setRemark}
                multiline
                numberOfLines={3}
                leftIcon="document-text-outline"
              />
            </View>

            {/* Bottom Form Actions (Matching LeadsListScreen theme: Reset & Save) */}
            <View style={styles.fullFormActionButtons}>
              <TouchableOpacity
                style={styles.formActionBtnReset}
                onPress={handleResetForm}
                disabled={saving}
                activeOpacity={0.7}
              >
                <Ionicons name="refresh-outline" size={18} color={Colors.slate600} />
                <Text style={styles.formActionBtnResetText}>Reset</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.formActionBtnSubmit, saving && { opacity: 0.65 }]}
                onPress={handleSaveTask}
                disabled={saving}
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-done" size={20} color="#ffffff" />
                    <Text style={styles.formActionBtnSubmitText}>
                      {isEditing ? 'Update Task' : 'Save Task'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        /* ========================================================================= */
        /* 2. TASKS LIST VIEW (SHOWN FIRST LIKE LEADS LIST SCREEN)                   */
        /* ========================================================================= */
        <View style={styles.flexOne}>
          {/* Action Row: Search + Add Button */}
          <View style={styles.actionRow}>
            <View style={styles.searchContainer}>
              <SearchBar
                value={search}
                onChangeText={setSearch}
                placeholder="Search tasks, lead, phone..."
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

          {/* Filter Pills (All / Pending / Completed) */}
          <View style={styles.filterPillsRow}>
            <TouchableOpacity
              style={[
                styles.filterPill,
                statusFilter === 'Pending' && styles.filterPillActive,
              ]}
              onPress={() => setStatusFilter('Pending')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterPillText,
                  statusFilter === 'Pending' && styles.filterPillTextActive,
                ]}
              >
                Pending ({pendingCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterPill,
                statusFilter === 'Completed' && styles.filterPillActive,
              ]}
              onPress={() => setStatusFilter('Completed')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterPillText,
                  statusFilter === 'Completed' && styles.filterPillTextActive,
                ]}
              >
                Completed ({completedCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterPill,
                statusFilter === 'All' && styles.filterPillActive,
              ]}
              onPress={() => setStatusFilter('All')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterPillText,
                  statusFilter === 'All' && styles.filterPillTextActive,
                ]}
              >
                All ({tasks.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tasks FlatList */}
          <FlatList
            data={filteredTasks}
            keyExtractor={(item) => String(item.taskID || Math.random())}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => fetchTasks(true)}
                colors={[Colors.primary]}
              />
            }
            renderItem={({ item }) => {
              const isCompleted = item.taskStatus === 1 || item.status === 'Completed';
              const overdue = isOverdue(item.dueDate, isCompleted);
              const note = item.remark || item.description;

              return (
                <CommonListCard
                  title={item.purposeName || item.title || 'Untitled Task'}
                  subtitle={item.leadName ? `Lead: ${item.leadName}` : undefined}
                  badgeLabel={isCompleted ? 'Completed' : (overdue ? 'Overdue' : 'Pending')}
                  badgeVariant={isCompleted ? 'success' : (overdue ? 'danger' : 'warning')}
                  pills={[
                    item.leadNumber ? {
                      icon: 'call-outline',
                      text: item.leadNumber,
                    } : null,
                    item.assignedTo ? {
                      icon: 'person-outline',
                      text: `Assigned: ${item.assignedToName || String(item.assignedTo)}`,
                      iconColor: Colors.primary,
                    } : null,
                    note ? {
                      icon: 'chatbox-ellipses-outline',
                      text: note,
                      numberOfLines: 1,
                    } : null,
                  ]}
                  metaLeft={{
                    label: item.leadNumber ? 'Phone' : 'Status',
                    value: item.leadNumber || (isCompleted ? 'Completed' : (overdue ? 'Overdue' : 'Pending')),
                    valueColor: !item.leadNumber
                      ? (isCompleted ? Colors.success : (overdue ? Colors.danger : Colors.warningDark))
                      : undefined,
                  }}
                  metaRight={
                    item.dueDate
                      ? {
                          label: 'Due Date',
                          badgeText: `${formatDate(item.dueDate)}${item.dueTime ? ' ' + item.dueTime : ''}`.trim(),
                          badgeIcon: 'calendar-outline',
                          badgeColor: overdue && !isCompleted ? Colors.danger : Colors.warningDark,
                          badgeBgColor: overdue && !isCompleted ? Colors.dangerLight : Colors.warningLight,
                        }
                      : undefined
                  }
                  footerLeftComponent={
                    <TouchableOpacity
                      style={[
                        styles.quickStatusToggleBtn,
                        isCompleted
                          ? styles.quickStatusToggleCompleted
                          : styles.quickStatusTogglePending,
                      ]}
                      onPress={() => handleToggleTaskStatus(item)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={isCompleted ? 'checkmark-circle' : 'radio-button-off'}
                        size={13}
                        color={isCompleted ? Colors.success : Colors.warningDark}
                      />
                      <Text
                        style={[
                          styles.quickStatusToggleText,
                          isCompleted ? { color: Colors.success } : { color: Colors.warningDark },
                        ]}
                      >
                        {isCompleted ? 'Mark Pending' : 'Mark Completed'}
                      </Text>
                    </TouchableOpacity>
                  }
                  onPress={() => handleOpenEditForm(item)}
                  onEdit={() => handleOpenEditForm(item)}
                  onDelete={() => {
                    setSelectedTaskForDelete(item);
                    setDeleteModalVisible(true);
                  }}
                />
              );
            }}
            ListEmptyComponent={
              !loading ? (
                <EmptyState
                  title="No Tasks Found"
                  description="No tasks match your search or filter. Tap below to create your first task."
                  actionTitle="Add New Task"
                  onAction={handleOpenAddForm}
                />
              ) : (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="small" color={THEME_PRIMARY} />
                  <Text style={styles.loadingText}>Loading tasks...</Text>
                </View>
              )
            }
          />
        </View>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        visible={deleteModalVisible}
        title="Delete Task"
        message={`Are you sure you want to delete task "${selectedTaskForDelete?.purposeName || selectedTaskForDelete?.title || 'this task'}"?`}
        confirmText="Delete"
        cancelText="Cancel"
        isDestructive={true}
        loading={deleting}
        onConfirm={handleDeleteTask}
        onCancel={() => {
          setDeleteModalVisible(false);
          setSelectedTaskForDelete(null);
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

  // Card Quick Status Toggle Button inside CommonListCard
  quickStatusToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  quickStatusTogglePending: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  quickStatusToggleCompleted: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  quickStatusToggleText: {
    fontSize: 11,
    fontWeight: '700',
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
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1e293b',
  },

  // Action Buttons (Matching Lead Form)
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
    borderColor: Colors.slate300,
    backgroundColor: Colors.surface,
  },
  formActionBtnResetText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.slate700,
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  formActionBtnSubmitText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
});
export default MyTasksScreen;
