import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';

interface MobileDatePickerProps {
  label?: string;
  value?: string; // YYYY-MM-DD
  timeValue?: string; // HH:mm
  onChangeDate: (date: string) => void;
  onChangeTime?: (time: string) => void;
  showTime?: boolean;
  required?: boolean;
  error?: string;
  disabled?: boolean;
}

const TIME_SLOTS = [
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '12:00',
  '12:30',
  '13:00',
  '13:30',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00',
  '16:30',
  '17:00',
  '17:30',
  '18:00',
  '18:30',
  '19:00',
];

export const MobileDatePicker: React.FC<MobileDatePickerProps> = ({
  label,
  value,
  timeValue = '10:00',
  onChangeDate,
  onChangeTime,
  showTime = false,
  required = false,
  error,
  disabled = false,
}) => {
  const [modalVisible, setModalVisible] = useState(false);

  // Helper to format date
  const formatDateDisplay = (dateStr?: string) => {
    if (!dateStr) return 'Select date';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const getPresetDate = (daysAhead: number): string => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    return d.toISOString().split('T')[0];
  };

  const handleSelectPreset = (daysAhead: number) => {
    const newDate = getPresetDate(daysAhead);
    onChangeDate(newDate);
    if (!showTime) {
      setModalVisible(false);
    }
  };

  // Generate a mini calendar range for the current month
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-indexed
  const [showYearPicker, setShowYearPicker] = useState(false);

  // Sync calendar with incoming value when opened or changed
  useEffect(() => {
    if (value) {
      const parts = value.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        if (!isNaN(y) && !isNaN(m)) {
          setViewYear(y);
          setViewMonth(m);
        }
      }
    }
  }, [value, modalVisible]);

  // List of years from current year + 5 down to 1950 for fast DOB and joining date selection
  const yearList = useMemo(() => {
    const maxYear = new Date().getFullYear() + 5;
    const years: number[] = [];
    for (let y = maxYear; y >= 1950; y--) {
      years.push(y);
    }
    return years;
  }, []);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sun

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const m = String(viewMonth + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    const formatted = `${viewYear}-${m}-${d}`;
    onChangeDate(formatted);
    if (!showTime) {
      setModalVisible(false);
    }
  };

  return (
    <View style={styles.container}>
      {label && (
        <Text style={styles.label}>
          {label} {required && <Text style={styles.required}>*</Text>}
        </Text>
      )}

      <TouchableOpacity
        style={[
          styles.button,
          error ? styles.buttonError : null,
          disabled ? styles.buttonDisabled : null,
        ]}
        onPress={() => !disabled && setModalVisible(true)}
        activeOpacity={0.7}
      >
        <Ionicons
          name="calendar-outline"
          size={18}
          color={disabled ? Colors.slate400 : Colors.primary}
          style={styles.icon}
        />
        <Text style={[styles.dateText, !value ? styles.placeholderText : null]}>
          {formatDateDisplay(value)} {showTime && timeValue ? `at ${timeValue}` : ''}
        </Text>
      </TouchableOpacity>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    {label || 'Select Date & Time'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setModalVisible(false)}
                    style={styles.closeButton}
                  >
                    <Ionicons name="close" size={22} color={Colors.slate600} />
                  </TouchableOpacity>
                </View>

                {/* Quick Presets */}
                <View style={styles.presetsRow}>
                  <TouchableOpacity
                    style={styles.presetChip}
                    onPress={() => handleSelectPreset(0)}
                  >
                    <Text style={styles.presetText}>Today</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.presetChip}
                    onPress={() => handleSelectPreset(1)}
                  >
                    <Text style={styles.presetText}>Tomorrow</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.presetChip}
                    onPress={() => handleSelectPreset(3)}
                  >
                    <Text style={styles.presetText}>+3 Days</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.presetChip}
                    onPress={() => handleSelectPreset(7)}
                  >
                    <Text style={styles.presetText}>+1 Week</Text>
                  </TouchableOpacity>
                </View>

                {/* Month & Year Navigator */}
                <View style={styles.monthHeader}>
                  <View style={styles.navButtonGroup}>
                    <TouchableOpacity
                      onPress={() => setViewYear((y) => y - 1)}
                      style={styles.navArrow}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons
                        name="play-back"
                        size={15}
                        color={Colors.slate600}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handlePrevMonth}
                      style={styles.navArrow}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons
                        name="chevron-back"
                        size={18}
                        color={Colors.slate700}
                      />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    onPress={() => setShowYearPicker((p) => !p)}
                    style={styles.monthTitleButton}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.monthTitle}>
                      {monthNames[viewMonth]} {viewYear}
                    </Text>
                    <Ionicons
                      name={showYearPicker ? 'chevron-up' : 'chevron-down'}
                      size={14}
                      color={Colors.primary}
                    />
                  </TouchableOpacity>

                  <View style={styles.navButtonGroup}>
                    <TouchableOpacity
                      onPress={handleNextMonth}
                      style={styles.navArrow}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons
                        name="chevron-forward"
                        size={18}
                        color={Colors.slate700}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setViewYear((y) => y + 1)}
                      style={styles.navArrow}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons
                        name="play-forward"
                        size={15}
                        color={Colors.slate600}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {showYearPicker ? (
                  <View style={styles.yearPickerContainer}>
                    <Text style={styles.yearPickerHeader}>Select Year</Text>
                    <ScrollView
                      style={styles.yearPickerScroll}
                      contentContainerStyle={styles.yearPickerGrid}
                      showsVerticalScrollIndicator={true}
                    >
                      {yearList.map((yr) => (
                        <TouchableOpacity
                          key={yr}
                          style={[
                            styles.yearChip,
                            viewYear === yr && styles.yearChipSelected,
                          ]}
                          onPress={() => {
                            setViewYear(yr);
                            setShowYearPicker(false);
                          }}
                        >
                          <Text
                            style={[
                              styles.yearChipText,
                              viewYear === yr && styles.yearChipTextSelected,
                            ]}
                          >
                            {yr}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                ) : (
                  <>
                    {/* Days of week */}
                    <View style={styles.weekRow}>
                      {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d, i) => (
                        <Text key={i} style={styles.weekDayText}>
                          {d}
                        </Text>
                      ))}
                    </View>

                    {/* Days Grid */}
                    <View style={styles.daysGrid}>
                      {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                        <View key={`empty-${i}`} style={styles.dayCell} />
                      ))}
                      {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1;
                        const mStr = String(viewMonth + 1).padStart(2, '0');
                        const dStr = String(day).padStart(2, '0');
                        const currentStr = `${viewYear}-${mStr}-${dStr}`;
                        const isSelected = value === currentStr;
                        return (
                          <TouchableOpacity
                            key={`day-${day}`}
                            style={[
                              styles.dayCell,
                              isSelected ? styles.dayCellSelected : null,
                            ]}
                            onPress={() => handleSelectDay(day)}
                          >
                            <Text
                              style={[
                                styles.dayText,
                                isSelected ? styles.dayTextSelected : null,
                              ]}
                            >
                              {day}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </>
                )}

                {/* Optional Time Slots */}
                {showTime && (
                  <View style={styles.timeSection}>
                    <Text style={styles.timeSectionTitle}>Select Time</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.timeSlotsScroll}
                    >
                      {TIME_SLOTS.map((slot) => {
                        const isTimeSelected = timeValue === slot;
                        return (
                          <TouchableOpacity
                            key={slot}
                            style={[
                              styles.timeChip,
                              isTimeSelected ? styles.timeChipSelected : null,
                            ]}
                            onPress={() => onChangeTime && onChangeTime(slot)}
                          >
                            <Text
                              style={[
                                styles.timeChipText,
                                isTimeSelected ? styles.timeChipTextSelected : null,
                              ]}
                            >
                              {slot}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.doneButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.doneButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.slate700,
    marginBottom: 6,
  },
  required: {
    color: Colors.danger,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 48,
  },
  buttonError: {
    borderColor: Colors.danger,
  },
  buttonDisabled: {
    backgroundColor: Colors.slate100,
  },
  icon: {
    marginRight: 10,
  },
  dateText: {
    fontSize: 14,
    color: Colors.textPrimary,
  },
  placeholderText: {
    color: Colors.slate400,
  },
  errorText: {
    fontSize: 12,
    color: Colors.danger,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.modalBackdrop,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.slate900,
  },
  closeButton: {
    padding: 4,
  },
  presetsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.primaryMuted,
  },
  presetText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primaryDark,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  navButtonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  navArrow: {
    padding: 6,
    borderRadius: 6,
  },
  monthTitleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: Colors.slate100,
  },
  monthTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.slate800,
  },
  yearPickerContainer: {
    height: 230,
    paddingHorizontal: 12,
    marginVertical: 6,
  },
  yearPickerHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.slate500,
    marginBottom: 8,
    textAlign: 'center',
  },
  yearPickerScroll: {
    flex: 1,
  },
  yearPickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    paddingBottom: 16,
  },
  yearChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: Colors.slate100,
    minWidth: 62,
    alignItems: 'center',
  },
  yearChipSelected: {
    backgroundColor: Colors.primary,
  },
  yearChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.slate800,
  },
  yearChipTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  weekDayText: {
    width: 36,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: Colors.slate400,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
  },
  dayCell: {
    width: '14.28%',
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellSelected: {
    backgroundColor: Colors.primary,
    borderRadius: 19,
  },
  dayText: {
    fontSize: 14,
    color: Colors.slate800,
  },
  dayTextSelected: {
    color: Colors.textInverse,
    fontWeight: '700',
  },
  timeSection: {
    marginTop: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: 10,
  },
  timeSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.slate700,
    marginBottom: 8,
  },
  timeSlotsScroll: {
    flexDirection: 'row',
  },
  timeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 8,
    backgroundColor: Colors.surface,
  },
  timeChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  timeChipText: {
    fontSize: 13,
    color: Colors.slate700,
  },
  timeChipTextSelected: {
    color: Colors.textInverse,
    fontWeight: '700',
  },
  doneButton: {
    backgroundColor: Colors.primary,
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  doneButtonText: {
    color: Colors.textInverse,
    fontSize: 15,
    fontWeight: '700',
  },
});
