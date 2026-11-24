import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Switch,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/common/Header';
import { useCompany } from '../../context/CompanyContext';
import {
  creditReminderService,
  CreditReminderStepItem,
  DEFAULT_CREDIT_REMINDER_FLOW,
} from '../../api/creditReminderService';
import {
  REMINDER_CHANNELS,
  REMINDER_TEMPLATES,
} from '../../api/salesReminderService';
import { Colors } from '../../theme/colors';

// Theme matching Sales Reminder exactly (#645695 / #8176a9)
const BRAND_PURPLE = '#645695';
const BRAND_PURPLE_LIGHT = '#8176a9';
const BRAND_PURPLE_SOFT = 'rgba(100, 86, 149, 0.08)';

const CREDIT_PRIMARY = BRAND_PURPLE;
const CREDIT_PRIMARY_LIGHT = BRAND_PURPLE_LIGHT;
const CREDIT_PRIMARY_SOFT = BRAND_PURPLE_SOFT;

interface CreditReminderScreenProps {
  navigation: any;
}

export const CreditReminderScreen: React.FC<CreditReminderScreenProps> = ({ navigation }) => {
  const { selectedCompanyId } = useCompany();
  const companyId = selectedCompanyId || 1;

  const [steps, setSteps] = useState<CreditReminderStepItem[]>(DEFAULT_CREDIT_REMINDER_FLOW);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Template Picker Modal State
  const [templatePickerVisible, setTemplatePickerVisible] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState<number | null>(null);
  const [activeChannelKey, setActiveChannelKey] = useState<string | null>(null);

  // Add Step Modal State
  const [addStepModalVisible, setAddStepModalVisible] = useState(false);
  const [newStepName, setNewStepName] = useState('');
  const [newStepDays, setNewStepDays] = useState('1');
  const [newStepActionTitle, setNewStepActionTitle] = useState('Send Payment Notice');

  // Load Settings from Database on mount and company change
  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await creditReminderService.getSettings(companyId);
      if (data && data.steps && Array.isArray(data.steps) && data.steps.length > 0) {
        const mapped = data.steps.map((stg: any, index: number) => {
          let parsedChannels: any = {};
          if (stg.channelsJson) {
            try {
              parsedChannels =
                typeof stg.channelsJson === 'string'
                  ? JSON.parse(stg.channelsJson)
                  : stg.channelsJson;
            } catch (e) {
              console.warn('Error parsing channelsJson:', e);
            }
          }

          const normalizedChannels: Record<string, { enabled: boolean; templateId: string }> = {};
          REMINDER_CHANNELS.forEach((ch) => {
            const existing = parsedChannels[ch.key];
            normalizedChannels[ch.key] = {
              enabled: existing?.enabled !== undefined ? existing.enabled : true,
              templateId: existing?.templateId || REMINDER_TEMPLATES[ch.key]?.[0]?.id || '',
            };
          });

          return {
            stepID: stg.stepID || stg.StepID || 0,
            settingID: stg.settingID || stg.SettingID || 0,
            stepNo: stg.stepNo || stg.StepNo || index + 1,
            stepName: stg.stepName || stg.StepName || `Step ${index + 1}`,
            subtitle: stg.subtitle || stg.Subtitle || '',
            daysOffset: stg.daysOffset ?? stg.DaysOffset ?? (index === 0 ? 0 : 1),
            statusLabel: stg.statusLabel || stg.StatusLabel || '',
            isTrigger: Boolean(stg.isTrigger ?? stg.IsTrigger ?? index === 0),
            actionTitle: stg.actionTitle || stg.ActionTitle || '',
            isActive: stg.isActive !== false && stg.IsActive !== false,
            channels: normalizedChannels,
          };
        });
        setSteps(mapped);
      } else {
        setSteps(DEFAULT_CREDIT_REMINDER_FLOW);
      }
    } catch (err) {
      console.warn('Error loading credit reminder settings:', err);
      setSteps(DEFAULT_CREDIT_REMINDER_FLOW);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSettings();
    setRefreshing(false);
  };

  // Save Settings to Database
  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const payload = {
        companyID: companyId,
        settingName: 'Credit Reminder Setting',
        isActive: true,
        steps: steps.map((stg, index) => ({
          stepID: stg.stepID || 0,
          settingID: stg.settingID || 0,
          stepNo: index + 1,
          stepName: stg.stepName || `Step ${index + 1}`,
          subtitle: stg.subtitle || '',
          daysOffset: parseInt(String(stg.daysOffset), 10) || 0,
          statusLabel: stg.statusLabel || '',
          isTrigger: Boolean(stg.isTrigger),
          actionTitle: stg.actionTitle || '',
          channelsJson: JSON.stringify(stg.channels || {}),
          isActive: stg.isActive !== false,
        })),
      };

      await creditReminderService.saveSettings(payload);
      Alert.alert('Success', 'Credit Reminder settings saved successfully!');
      await loadSettings();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to save credit reminder settings.');
    } finally {
      setSaving(false);
    }
  };

  // Toggle Step Active / Inactive
  const handleToggleStepActive = (index: number, val: boolean) => {
    const updated = [...steps];
    updated[index].isActive = val;
    setSteps(updated);
  };

  // Change Days Offset (+ / - or direct change)
  const handleChangeDays = (index: number, delta: number) => {
    const updated = [...steps];
    const current = Number(updated[index].daysOffset) || 0;
    const newVal = Math.max(0, Math.min(365, current + delta));
    updated[index].daysOffset = newVal;
    setSteps(updated);
  };

  const handleSetDaysDirect = (index: number, text: string) => {
    const parsed = parseInt(text.replace(/[^0-9]/g, ''), 10) || 0;
    const updated = [...steps];
    updated[index].daysOffset = Math.max(0, Math.min(365, parsed));
    setSteps(updated);
  };

  // Toggle Channel (WhatsApp, Email, etc.)
  const handleToggleChannel = (stepIndex: number, channelKey: string, enabled: boolean) => {
    const updated = [...steps];
    if (!updated[stepIndex].channels) {
      updated[stepIndex].channels = {};
    }
    if (!updated[stepIndex].channels[channelKey]) {
      updated[stepIndex].channels[channelKey] = {
        enabled: false,
        templateId: REMINDER_TEMPLATES[channelKey]?.[0]?.id || '',
      };
    }
    updated[stepIndex].channels[channelKey].enabled = enabled;
    if (enabled && !updated[stepIndex].channels[channelKey].templateId) {
      updated[stepIndex].channels[channelKey].templateId =
        REMINDER_TEMPLATES[channelKey]?.[0]?.id || '';
    }
    setSteps(updated);
  };

  // Open Template Picker Modal
  const openTemplatePicker = (stepIndex: number, channelKey: string) => {
    setActiveStepIndex(stepIndex);
    setActiveChannelKey(channelKey);
    setTemplatePickerVisible(true);
  };

  // Select Template from Modal
  const handleSelectTemplate = (templateId: string) => {
    if (activeStepIndex !== null && activeChannelKey !== null) {
      const updated = [...steps];
      if (updated[activeStepIndex]?.channels?.[activeChannelKey]) {
        updated[activeStepIndex].channels[activeChannelKey].templateId = templateId;
        setSteps(updated);
      }
    }
    setTemplatePickerVisible(false);
  };

  // Delete Step (Confirmation + API call)
  const handleDeleteStep = (index: number) => {
    const stepToDelete = steps[index];
    if (stepToDelete.isTrigger) {
      Alert.alert('Cannot Delete', 'The initial invoice creation trigger step cannot be deleted.');
      return;
    }

    Alert.alert(
      'Delete Step',
      `Are you sure you want to delete "${stepToDelete.stepName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (stepToDelete.stepID && stepToDelete.stepID > 0) {
                await creditReminderService.deleteStep(stepToDelete.stepID);
              }
              const updated = steps.filter((_, i) => i !== index);
              setSteps(updated);
              Alert.alert('Deleted', 'Step removed successfully.');
            } catch (e: any) {
              Alert.alert('Error', e?.response?.data?.message || 'Failed to delete step.');
            }
          },
        },
      ]
    );
  };

  // Add New Step
  const handleAddNewStep = () => {
    const nextStepNo = steps.length + 1;
    const name = newStepName.trim() || `Step ${nextStepNo}: Follow-up Stage`;
    const days = parseInt(newStepDays, 10) || 1;
    const action = newStepActionTitle.trim() || 'Send Payment Notice';

    const defaultChannels: Record<string, { enabled: boolean; templateId: string }> = {};
    REMINDER_CHANNELS.forEach((ch) => {
      defaultChannels[ch.key] = {
        enabled: true,
        templateId: REMINDER_TEMPLATES[ch.key]?.[0]?.id || '',
      };
    });

    const newStepItem: CreditReminderStepItem = {
      stepID: 0,
      settingID: 0,
      stepNo: nextStepNo,
      stepName: name,
      subtitle: `Stage ${nextStepNo} -> ${action}`,
      daysOffset: days,
      statusLabel: 'Reminder Scheduled',
      isTrigger: false,
      actionTitle: action,
      isActive: true,
      channels: defaultChannels,
    };

    setSteps((prev) => [...prev, newStepItem]);
    setAddStepModalVisible(false);
    setNewStepName('');
    setNewStepDays('1');
    setNewStepActionTitle('Send Payment Notice');
    Alert.alert('Step Added', `Step ${nextStepNo} has been added. Tap "Save Settings" to persist.`);
  };

  return (
    <View style={styles.container}>
      {/* Screen Header */}
      <Header
        title="Credit Reminder Setup"
        showBack={true}
        onBack={() => navigation.goBack()}
        rightComponent={
          <View style={styles.headerRightRow}>
            <TouchableOpacity
              style={styles.headerAddBtn}
              onPress={() => {
                setNewStepName(`Step ${steps.length + 1}: Additional Notice`);
                setNewStepDays('1');
                setAddStepModalVisible(true);
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={15} color="#ffffff" />
              <Text style={styles.headerAddBtnText}>Add Step</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.headerSaveBtn, saving && { opacity: 0.7 }]}
              onPress={handleSaveSettings}
              disabled={saving}
              activeOpacity={0.8}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={15} color="#ffffff" />
                  <Text style={styles.headerSaveBtnText}>Save</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        }
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={CREDIT_PRIMARY} />
          <Text style={styles.loadingText}>Loading Credit Reminder Settings...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[CREDIT_PRIMARY]}
            />
          }
        >
          {/* Steps List */}
          {steps.map((stg, idx) => {
            const isStepDisabled = stg.isActive === false;
            return (
              <View
                key={stg.stepID ? `step-${stg.stepID}` : `index-${idx}`}
                style={[styles.stepCard, isStepDisabled && styles.stepCardDisabled]}
              >
                {/* Step Card Header */}
                <View
                  style={[
                    styles.stepHeaderRow,
                    stg.isTrigger ? styles.stepHeaderTrigger : styles.stepHeaderNormal,
                  ]}
                >
                  <View style={styles.stepTitleLeft}>
                    <View
                      style={[
                        styles.stepBadgeNumber,
                        stg.isTrigger ? styles.badgeTrigger : styles.badgeNormal,
                      ]}
                    >
                      <Text style={styles.stepBadgeText}>{idx + 1}</Text>
                    </View>
                    <View style={styles.stepTitleWrapper}>
                      <Text style={styles.stepTitleText} numberOfLines={1}>
                        {stg.stepName}
                      </Text>
                      {stg.isTrigger && (
                        <Text style={styles.triggerSubtext}>Fires immediately on invoice generation</Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.stepHeaderRight}>
                    {/* Active Switch */}
                    <Switch
                      value={!isStepDisabled}
                      onValueChange={(val) => handleToggleStepActive(idx, val)}
                      trackColor={{ false: '#cbd5e1', true: CREDIT_PRIMARY_LIGHT }}
                      thumbColor={!isStepDisabled ? CREDIT_PRIMARY : '#f1f5f9'}
                      style={Platform.OS === 'ios' ? { transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] } : {}}
                    />

                    {/* Delete Button (disabled for trigger) */}
                    {!stg.isTrigger && (
                      <TouchableOpacity
                        onPress={() => handleDeleteStep(idx)}
                        style={styles.deleteStepBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="trash-outline" size={17} color="#ef4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Step Card Body */}
                <View style={styles.stepCardBody}>
                  {/* Field: Wait Duration / Timing */}
                  <View style={styles.fieldSection}>
                    <Text style={styles.fieldSectionLabel}>
                      {stg.isTrigger ? 'Trigger Event:' : 'Timing Offset (Days):'}
                    </Text>

                    {stg.isTrigger ? (
                      <View style={styles.triggerEventBox}>
                        <Ionicons name="flash" size={15} color="#059669" />
                        <Text style={styles.triggerEventText}>On Invoice Generation (Day 0)</Text>
                      </View>
                    ) : (
                      <View style={styles.daysStepperRow}>
                        <TouchableOpacity
                          style={[styles.stepperBtn, isStepDisabled && styles.stepperBtnDisabled]}
                          onPress={() => handleChangeDays(idx, -1)}
                          disabled={isStepDisabled}
                        >
                          <Ionicons name="remove" size={18} color={CREDIT_PRIMARY} />
                        </TouchableOpacity>

                        <View style={styles.daysInputBox}>
                          <Text style={styles.daysInputPrefix}>Offset</Text>
                          <TextInput
                            style={styles.daysInput}
                            value={String(stg.daysOffset)}
                            onChangeText={(txt) => handleSetDaysDirect(idx, txt)}
                            keyboardType="number-pad"
                            editable={!isStepDisabled}
                          />
                          <Text style={styles.daysInputSuffix}>Days</Text>
                        </View>

                        <TouchableOpacity
                          style={[styles.stepperBtn, isStepDisabled && styles.stepperBtnDisabled]}
                          onPress={() => handleChangeDays(idx, 1)}
                          disabled={isStepDisabled}
                        >
                          <Ionicons name="add" size={18} color={CREDIT_PRIMARY} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>

                  {/* Field: Channels & Templates */}
                  <View style={styles.fieldSection}>
                    <Text style={styles.fieldSectionLabel}>Select Channels & Templates:</Text>

                    <View style={styles.channelsList}>
                      {REMINDER_CHANNELS.map((ch) => {
                        const chState = stg.channels?.[ch.key] || {
                          enabled: true,
                          templateId: REMINDER_TEMPLATES[ch.key]?.[0]?.id || '',
                        };
                        const currentTemplate =
                          REMINDER_TEMPLATES[ch.key]?.find((t) => t.id === chState.templateId) ||
                          REMINDER_TEMPLATES[ch.key]?.[0];

                        return (
                          <View
                            key={ch.key}
                            style={[
                              styles.channelItemBox,
                              chState.enabled && styles.channelItemBoxActive,
                            ]}
                          >
                            <TouchableOpacity
                              style={styles.channelRowTop}
                              onPress={() =>
                                !isStepDisabled &&
                                handleToggleChannel(idx, ch.key, !chState.enabled)
                              }
                              activeOpacity={0.7}
                              disabled={isStepDisabled}
                            >
                              <View style={styles.channelLeftInfo}>
                                <Ionicons
                                  name={chState.enabled ? 'checkbox' : 'square-outline'}
                                  size={19}
                                  color={chState.enabled ? CREDIT_PRIMARY : '#94a3b8'}
                                />
                                <Ionicons
                                  name={ch.icon as any}
                                  size={17}
                                  color={ch.color}
                                  style={{ marginLeft: 4 }}
                                />
                                <Text
                                  style={[
                                    styles.channelLabelText,
                                    chState.enabled && styles.channelLabelTextActive,
                                  ]}
                                >
                                  {ch.label}
                                </Text>
                              </View>

                              <View
                                style={[
                                  styles.channelStatusDot,
                                  chState.enabled ? styles.dotEnabled : styles.dotDisabled,
                                ]}
                              />
                            </TouchableOpacity>

                            {/* Template Selector Button */}
                            {chState.enabled && (
                              <View style={styles.channelTemplateRow}>
                                <Text style={styles.channelTemplateHint}>Template:</Text>
                                <TouchableOpacity
                                  style={styles.templateSelectBtn}
                                  onPress={() => openTemplatePicker(idx, ch.key)}
                                  disabled={isStepDisabled}
                                  activeOpacity={0.7}
                                >
                                  <Text style={styles.templateSelectBtnText} numberOfLines={1}>
                                    {currentTemplate?.name || 'Select Template'}
                                  </Text>
                                  <Ionicons name="chevron-down" size={14} color="#64748b" />
                                </TouchableOpacity>
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  </View>
                </View>
              </View>
            );
          })}

          {/* Bottom Add Step Quick Button */}
          <TouchableOpacity
            style={styles.bottomAddStepBtn}
            onPress={() => {
              setNewStepName(`Step ${steps.length + 1}: Additional Notice`);
              setNewStepDays('1');
              setAddStepModalVisible(true);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle-outline" size={18} color={CREDIT_PRIMARY} />
            <Text style={styles.bottomAddStepBtnText}>+ Add Another Step</Text>
          </TouchableOpacity>

          {/* Bottom Save Settings Full Button */}
          <TouchableOpacity
            style={[styles.bottomSaveBtn, saving && { opacity: 0.7 }]}
            onPress={handleSaveSettings}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Ionicons name="checkmark-done" size={20} color="#ffffff" />
                <Text style={styles.bottomSaveBtnText}>Save All Settings</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* ========================================================================= */}
      {/* TEMPLATE PICKER MODAL                                                     */}
      {/* ========================================================================= */}
      <Modal
        visible={templatePickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTemplatePickerVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.pickerModalContent}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalHeaderTitle}>Select Template</Text>
              <TouchableOpacity
                onPress={() => setTemplatePickerVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
              {activeChannelKey &&
                REMINDER_TEMPLATES[activeChannelKey]?.map((tpl) => {
                  const currentSelectedId =
                    activeStepIndex !== null && activeChannelKey !== null
                      ? steps[activeStepIndex]?.channels?.[activeChannelKey]?.templateId
                      : '';
                  const isSelected = currentSelectedId === tpl.id;

                  return (
                    <TouchableOpacity
                      key={tpl.id}
                      style={[styles.templateOptionItem, isSelected && styles.templateOptionActive]}
                      onPress={() => handleSelectTemplate(tpl.id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                        size={18}
                        color={isSelected ? CREDIT_PRIMARY : '#94a3b8'}
                      />
                      <Text
                        style={[
                          styles.templateOptionText,
                          isSelected && styles.templateOptionTextActive,
                        ]}
                      >
                        {tpl.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* ADD STEP MODAL                                                            */}
      {/* ========================================================================= */}
      <Modal
        visible={addStepModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddStepModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.addModalContent}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalHeaderTitle}>Add Reminder Step</Text>
                <Text style={styles.modalHeaderSubtitle}>Create a new credit reminder stage</Text>
              </View>
              <TouchableOpacity
                onPress={() => setAddStepModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Step Title</Text>
              <TextInput
                style={styles.formInput}
                value={newStepName}
                onChangeText={setNewStepName}
                placeholder="e.g. Step 4: Final Demand Notice"
                placeholderTextColor="#94a3b8"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Timing Offset (Days)</Text>
              <TextInput
                style={styles.formInput}
                value={newStepDays}
                onChangeText={setNewStepDays}
                keyboardType="number-pad"
                placeholder="1"
                placeholderTextColor="#94a3b8"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Action Description</Text>
              <TextInput
                style={styles.formInput}
                value={newStepActionTitle}
                onChangeText={setNewStepActionTitle}
                placeholder="e.g. Send payment warning notice"
                placeholderTextColor="#94a3b8"
              />
            </View>

            <View style={styles.addModalActionRow}>
              <TouchableOpacity
                style={styles.addModalCancelBtn}
                onPress={() => setAddStepModalVisible(false)}
              >
                <Text style={styles.addModalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.addModalSubmitBtn}
                onPress={handleAddNewStep}
              >
                <Text style={styles.addModalSubmitText}>Add Step</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    gap: 4,
    backgroundColor: CREDIT_PRIMARY_LIGHT,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 7,
  },
  headerAddBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  headerSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: CREDIT_PRIMARY,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 7,
  },
  headerSaveBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  introBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: CREDIT_PRIMARY_SOFT,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  introBannerText: {
    flex: 1,
    fontSize: 12,
    color: CREDIT_PRIMARY,
    fontWeight: '600',
    lineHeight: 18,
  },
  stepCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  stepCardDisabled: {
    opacity: 0.55,
  },
  stepHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  stepHeaderTrigger: {
    backgroundColor: '#f0fdf4',
  },
  stepHeaderNormal: {
    backgroundColor: '#f8fafc',
  },
  stepTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  stepBadgeNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeTrigger: {
    backgroundColor: '#10b981',
  },
  badgeNormal: {
    backgroundColor: CREDIT_PRIMARY,
  },
  stepBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  stepTitleWrapper: {
    flex: 1,
  },
  stepTitleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  triggerSubtext: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
    marginTop: 2,
  },
  stepHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  deleteStepBtn: {
    padding: 4,
  },
  stepCardBody: {
    padding: 14,
    gap: 14,
  },
  fieldSection: {
    gap: 6,
  },
  fieldSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  triggerEventBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  triggerEventText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  daysStepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: CREDIT_PRIMARY_SOFT,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnDisabled: {
    opacity: 0.5,
  },
  daysInputBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
  },
  daysInputPrefix: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginRight: 6,
  },
  daysInput: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '800',
    color: CREDIT_PRIMARY,
    paddingVertical: 0,
  },
  daysInputSuffix: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginLeft: 6,
  },
  channelsList: {
    gap: 8,
  },
  channelItemBox: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    padding: 10,
  },
  channelItemBoxActive: {
    borderColor: CREDIT_PRIMARY,
    backgroundColor: 'rgba(100, 86, 149, 0.03)',
  },
  channelRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  channelLeftInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  channelLabelText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  channelLabelTextActive: {
    color: '#0f172a',
    fontWeight: '700',
  },
  channelStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotEnabled: {
    backgroundColor: '#10b981',
  },
  dotDisabled: {
    backgroundColor: '#cbd5e1',
  },
  channelTemplateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  channelTemplateHint: {
    fontSize: 11,
    fontWeight: '700',
    color: CREDIT_PRIMARY,
  },
  templateSelectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  templateSelectBtnText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
    marginRight: 4,
  },
  bottomAddStepBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: CREDIT_PRIMARY_LIGHT,
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 14,
  },
  bottomAddStepBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: CREDIT_PRIMARY,
  },
  bottomSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: CREDIT_PRIMARY,
    borderRadius: 12,
    paddingVertical: 14,
    shadowColor: CREDIT_PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  bottomSaveBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },

  // Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pickerModalContent: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalHeaderSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  templateOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  templateOptionActive: {
    backgroundColor: CREDIT_PRIMARY_SOFT,
  },
  templateOptionText: {
    flex: 1,
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
  },
  templateOptionTextActive: {
    color: CREDIT_PRIMARY,
    fontWeight: '700',
  },
  addModalContent: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
  },
  formGroup: {
    marginBottom: 14,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  formInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
  },
  addModalActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  addModalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
  },
  addModalCancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  addModalSubmitBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: CREDIT_PRIMARY,
    alignItems: 'center',
  },
  addModalSubmitText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
});
