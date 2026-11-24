import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/common/Header';
import { Badge } from '../../components/common/Badge';
import { FloatingActionButton } from '../../components/common/FloatingActionButton';
import { EmptyState } from '../../components/common/EmptyState';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { MobileDatePicker } from '../../components/common/MobileDatePicker';
import { taskService, Task, Note, Visit } from '../../api/taskService';
import { useCompany } from '../../context/CompanyContext';
import { Colors } from '../../theme/colors';

interface ActivitiesScreenProps {
  navigation: any;
  route?: any;
}

export const ActivitiesScreen: React.FC<ActivitiesScreenProps> = ({ navigation, route }) => {
  const { selectedCompanyId, selectedCompany } = useCompany();
  const initialTab = (route?.params?.initialTab as 'Tasks' | 'Notes' | 'Visits') || 'Tasks';
  const [activeTab, setActiveTab] = useState<'Tasks' | 'Notes' | 'Visits'>(initialTab);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (route?.params?.initialTab === 'Tasks') {
      navigation.navigate('MyTasks');
    } else if (route?.params?.initialTab === 'Notes') {
      navigation.navigate('Notes');
    } else if (route?.params?.initialTab) {
      setActiveTab(route.params.initialTab);
    }
  }, [route?.params?.initialTab]);

  // Creation Modals
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  // Task Form
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskPriority, setTaskPriority] = useState<Task['priority']>('Medium');
  const [taskDueDate, setTaskDueDate] = useState(new Date().toISOString().split('T')[0]);

  // Note Form
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');

  // Visit Form
  const [visitClient, setVisitClient] = useState('');
  const [visitCompany, setVisitCompany] = useState('');
  const [visitLocation, setVisitLocation] = useState('');
  const [visitPurpose, setVisitPurpose] = useState('');
  const [visitRemarks, setVisitRemarks] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const activeCompId = selectedCompanyId || 1;
      const [t, n, v] = await Promise.all([
        taskService.getTasks({ companyId: activeCompId }),
        taskService.getNotes(activeCompId),
        taskService.getVisits(activeCompId),
      ]);
      setTasks(t);
      setNotes(n);
      setVisits(v);
    } catch (e) {
      console.warn('Error loading activities:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedCompanyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleToggleTask = async (taskId: number, currentStatus: Task['status']) => {
    const newStatus = currentStatus === 'Completed' ? 'Pending' : 'Completed';
    await taskService.updateTaskStatus(taskId, newStatus);
    loadData();
  };

  const handleDeleteTask = async (taskId: number) => {
    await taskService.deleteTask(taskId);
    loadData();
  };

  const handleCreateTask = async () => {
    if (!taskTitle.trim()) {
      Alert.alert('Validation Error', 'Task title is required.');
      return;
    }

    setSaving(true);
    try {
      await taskService.createTask({
        companyID: selectedCompanyId || 1,
        title: taskTitle.trim(),
        taskName: taskTitle.trim(),
        description: taskDesc.trim() || undefined,
        dueDate: taskDueDate,
        priority: taskPriority,
        status: 'Pending',
      });
      setModalVisible(false);
      setTaskTitle('');
      setTaskDesc('');
      loadData();
      Alert.alert('Success', 'Task created successfully!');
    } catch {
      Alert.alert('Error', 'Failed to create task.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateNote = async () => {
    if (!noteTitle.trim() || !noteContent.trim()) {
      Alert.alert('Validation Error', 'Note title and content are required.');
      return;
    }

    setSaving(true);
    try {
      await taskService.createNote({
        companyID: selectedCompanyId || 1,
        title: noteTitle.trim(),
        content: noteContent.trim(),
      });
      setModalVisible(false);
      setNoteTitle('');
      setNoteContent('');
      loadData();
      Alert.alert('Success', 'Note saved successfully!');
    } catch {
      Alert.alert('Error', 'Failed to save note.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateVisit = async () => {
    if (!visitClient.trim() || !visitLocation.trim()) {
      Alert.alert('Validation Error', 'Client name and location are required.');
      return;
    }

    setSaving(true);
    try {
      await taskService.recordVisit({
        companyID: selectedCompanyId || 1,
        clientName: visitClient.trim(),
        companyName: visitCompany.trim() || undefined,
        location: visitLocation.trim(),
        purpose: visitPurpose.trim() || 'Client Meeting',
        outcomeRemarks: visitRemarks.trim() || undefined,
        status: 'Completed',
        visitDate: new Date().toISOString().split('T')[0],
      });
      setModalVisible(false);
      setVisitClient('');
      setVisitCompany('');
      setVisitLocation('');
      setVisitRemarks('');
      loadData();
      Alert.alert('Success', 'Field visit logged successfully!');
    } catch {
      Alert.alert('Error', 'Failed to log field visit.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title="Activities"
        navigation={navigation}
        currentRoute="ActivitiesTab"
        rightIcon="add-circle-outline"
        onRightPress={() => setModalVisible(true)}
      />

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {(['Tasks', 'Notes', 'Visits'] as const).map((tab) => {
          const isActive = activeTab === tab;
          let count = 0;
          if (tab === 'Tasks') count = tasks.length;
          if (tab === 'Notes') count = notes.length;
          if (tab === 'Visits') count = visits.length;

          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, isActive ? styles.tabActive : null]}
              onPress={() => {
                if (tab === 'Tasks') {
                  navigation.navigate('MyTasks');
                } else if (tab === 'Notes') {
                  navigation.navigate('Notes');
                } else {
                  setActiveTab(tab);
                }
              }}
            >
              <Text style={[styles.tabText, isActive ? styles.tabTextActive : null]}>
                {tab} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity
          style={styles.tab}
          onPress={() => navigation.navigate('Reminder')}
        >
          <Text style={styles.tabText}>
            Reminders
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tasks List */}
      {activeTab === 'Tasks' && (
        <FlatList
          data={tasks}
          keyExtractor={(item) => String(item.taskID || Math.random())}
          renderItem={({ item }) => {
            const isCompleted = item.status === 'Completed';
            return (
              <View style={styles.card}>
                <View style={styles.taskRow}>
                  <TouchableOpacity
                    onPress={() => handleToggleTask(item.taskID, item.status)}
                    style={styles.checkIcon}
                  >
                    <Ionicons
                      name={isCompleted ? 'checkbox' : 'square-outline'}
                      size={24}
                      color={isCompleted ? Colors.success : Colors.slate400}
                    />
                  </TouchableOpacity>

                  <View style={{ flex: 1 }}>
                    <Text style={[styles.taskTitle, isCompleted ? styles.taskTitleCompleted : null]}>
                      {item.title}
                    </Text>
                    {item.description ? (
                      <Text style={styles.taskDesc} numberOfLines={2}>
                        {item.description}
                      </Text>
                    ) : null}

                    <View style={styles.taskMeta}>
                      <View style={styles.metaBadge}>
                        <Ionicons name="calendar-outline" size={12} color={Colors.slate500} />
                        <Text style={styles.metaText}>{item.dueDate || 'Today'}</Text>
                      </View>
                      <Badge
                        label={item.priority || 'Medium'}
                        variant={item.priority === 'High' ? 'danger' : 'info'}
                        size="sm"
                      />
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => handleDeleteTask(item.taskID)}
                    style={styles.deleteIcon}
                  >
                    <Ionicons name="trash-outline" size={18} color={Colors.slate400} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
          }
          ListEmptyComponent={
            !loading ? (
              <EmptyState
                title="No Tasks Found"
                description="No pending tasks for this company."
                actionTitle="Create Task"
                onAction={() => setModalVisible(true)}
              />
            ) : null
          }
        />
      )}

      {/* Notes List */}
      {activeTab === 'Notes' && (
        <FlatList
          data={notes}
          keyExtractor={(item) => String(item.noteID || Math.random())}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.noteHeader}>
                <Text style={styles.noteTitle}>{item.title}</Text>
                <Text style={styles.noteDate}>
                  {item.createdDate ? item.createdDate.split('T')[0] : 'Note'}
                </Text>
              </View>
              <Text style={styles.noteContent}>{item.content}</Text>
            </View>
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
          }
          ListEmptyComponent={
            !loading ? (
              <EmptyState
                title="No Notes Added"
                description="No notes saved for this company."
                actionTitle="Add Note"
                onAction={() => setModalVisible(true)}
              />
            ) : null
          }
        />
      )}

      {/* Visits List */}
      {activeTab === 'Visits' && (
        <FlatList
          data={visits}
          keyExtractor={(item) => String(item.visitID || Math.random())}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.visitHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.visitClient}>{item.clientName}</Text>
                  {item.companyName ? <Text style={styles.visitCompany}>{item.companyName}</Text> : null}
                </View>
                <Badge label={item.status} variant="success" size="sm" />
              </View>

              <View style={styles.visitInfoRow}>
                <Ionicons name="location-outline" size={15} color={Colors.primary} />
                <Text style={styles.visitLocation}>{item.location}</Text>
              </View>

              <View style={styles.visitInfoRow}>
                <Ionicons name="flag-outline" size={15} color={Colors.slate400} />
                <Text style={styles.visitPurpose}>{item.purpose}</Text>
              </View>

              {item.outcomeRemarks ? (
                <Text style={styles.visitRemarks}>Outcome: {item.outcomeRemarks}</Text>
              ) : null}
            </View>
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
          }
          ListEmptyComponent={
            !loading ? (
              <EmptyState
                title="No Field Visits"
                description="No field visit logs found for this company."
                actionTitle="Log Field Visit"
                onAction={() => setModalVisible(true)}
              />
            ) : null
          }
        />
      )}

      <FloatingActionButton
        onPress={() => setModalVisible(true)}
        icon="add"
      />

      {/* Dynamic Creation Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {activeTab === 'Tasks' && 'Create New Task'}
                {activeTab === 'Notes' && 'Add Client Note'}
                {activeTab === 'Visits' && 'Log Field Visit'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color={Colors.slate600} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Task Fields */}
              {activeTab === 'Tasks' && (
                <>
                  <Input
                    label="Task Title"
                    placeholder="e.g. Call client for contract renewal"
                    value={taskTitle}
                    onChangeText={setTaskTitle}
                    required
                  />

                  <Input
                    label="Description"
                    placeholder="Add details or checklist..."
                    value={taskDesc}
                    onChangeText={setTaskDesc}
                    multiline
                  />

                  <MobileDatePicker
                    label="Due Date"
                    value={taskDueDate}
                    onChangeDate={setTaskDueDate}
                  />

                  <View style={{ marginTop: 12 }}>
                    <Button
                      title="Save Task"
                      onPress={handleCreateTask}
                      loading={saving}
                      icon="checkmark"
                    />
                  </View>
                </>
              )}

              {/* Note Fields */}
              {activeTab === 'Notes' && (
                <>
                  <Input
                    label="Note Subject"
                    placeholder="e.g. Pricing Negotiation Points"
                    value={noteTitle}
                    onChangeText={setNoteTitle}
                    required
                  />

                  <Input
                    label="Note Content"
                    placeholder="Enter detailed notes..."
                    value={noteContent}
                    onChangeText={setNoteContent}
                    multiline
                    numberOfLines={4}
                    required
                  />

                  <View style={{ marginTop: 12 }}>
                    <Button
                      title="Save Note"
                      onPress={handleCreateNote}
                      loading={saving}
                      icon="checkmark"
                    />
                  </View>
                </>
              )}

              {/* Visit Fields */}
              {activeTab === 'Visits' && (
                <>
                  <Input
                    label="Client / Contact Person"
                    placeholder="e.g. Vikas Sharma"
                    value={visitClient}
                    onChangeText={setVisitClient}
                    required
                  />

                  <Input
                    label="Company / Site Name"
                    placeholder="e.g. Zenith Tech Park"
                    value={visitCompany}
                    onChangeText={setVisitCompany}
                  />

                  <Input
                    label="Location Address / Area"
                    placeholder="e.g. Andheri East, Mumbai"
                    value={visitLocation}
                    onChangeText={setVisitLocation}
                    required
                  />

                  <Input
                    label="Meeting Purpose"
                    placeholder="e.g. Product Demo & Site Inspection"
                    value={visitPurpose}
                    onChangeText={setVisitPurpose}
                  />

                  <Input
                    label="Outcome & Next Steps"
                    placeholder="Discussion points and outcome..."
                    value={visitRemarks}
                    onChangeText={setVisitRemarks}
                    multiline
                  />

                  <View style={{ marginTop: 12 }}>
                    <Button
                      title="Log Visit"
                      onPress={handleCreateVisit}
                      loading={saving}
                      icon="checkmark"
                    />
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: Colors.surfaceAlt,
  },
  tabActive: {
    backgroundColor: Colors.primaryMuted,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.slate600,
  },
  tabTextActive: {
    color: Colors.primaryDark,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.slate900,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: Colors.slate400,
  },
  taskDesc: {
    fontSize: 13,
    color: Colors.slate500,
    marginTop: 3,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: Colors.slate500,
  },
  deleteIcon: {
    padding: 4,
    marginLeft: 8,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  noteTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.slate900,
  },
  noteDate: {
    fontSize: 12,
    color: Colors.slate400,
  },
  noteContent: {
    fontSize: 13,
    color: Colors.slate600,
    lineHeight: 18,
  },
  visitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  visitClient: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.slate900,
  },
  visitCompany: {
    fontSize: 12,
    color: Colors.slate500,
    marginTop: 1,
  },
  visitInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  visitLocation: {
    fontSize: 13,
    color: Colors.slate700,
    fontWeight: '500',
  },
  visitPurpose: {
    fontSize: 12,
    color: Colors.slate600,
  },
  visitRemarks: {
    fontSize: 12,
    color: Colors.slate500,
    fontStyle: 'italic',
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.modalBackdrop,
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.slate900,
  },
});
