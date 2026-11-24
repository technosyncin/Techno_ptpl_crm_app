import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';

export interface DropdownOption {
  label: string;
  value: string | number;
  subtitle?: string;
}

interface MobileDropdownProps {
  label?: string;
  placeholder?: string;
  options: DropdownOption[];
  selectedValue?: string | number | null;
  onSelect: (value: string | number) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  loading?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
}

export const MobileDropdown: React.FC<MobileDropdownProps> = ({
  label,
  placeholder = 'Select an option...',
  options = [],
  selectedValue,
  onSelect,
  error,
  required = false,
  disabled = false,
  loading = false,
  searchable = true,
  searchPlaceholder = 'Search...',
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedOption = useMemo(() => {
    return options.find((opt) => String(opt.value) === String(selectedValue));
  }, [options, selectedValue]);

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const query = searchQuery.toLowerCase().trim();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(query) ||
        (opt.subtitle && opt.subtitle.toLowerCase().includes(query))
    );
  }, [options, searchQuery]);

  const handleOpen = () => {
    if (disabled || loading) return;
    setSearchQuery('');
    setModalVisible(true);
  };

  const handleSelectOption = (value: string | number) => {
    onSelect(value);
    setModalVisible(false);
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
          styles.dropdownButton,
          error ? styles.buttonError : null,
          disabled ? styles.buttonDisabled : null,
        ]}
        onPress={handleOpen}
        activeOpacity={0.7}
        disabled={disabled || loading}
      >
        <Text
          style={[
            styles.selectedText,
            !selectedOption ? styles.placeholderText : null,
          ]}
          numberOfLines={1}
        >
          {loading
            ? 'Loading...'
            : selectedOption
            ? selectedOption.label
            : placeholder}
        </Text>
        {loading ? (
          <ActivityIndicator size="small" color={Colors.primary} />
        ) : (
          <Ionicons
            name="chevron-down"
            size={18}
            color={disabled ? Colors.slate400 : Colors.slate600}
          />
        )}
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
                    {label ? `Select ${label}` : 'Select Option'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setModalVisible(false)}
                    style={styles.closeButton}
                  >
                    <Ionicons name="close" size={22} color={Colors.slate600} />
                  </TouchableOpacity>
                </View>

                {searchable && (
                  <View style={styles.searchContainer}>
                    <Ionicons
                      name="search-outline"
                      size={18}
                      color={Colors.slate400}
                      style={styles.searchIcon}
                    />
                    <TextInput
                      style={styles.searchInput}
                      placeholder={searchPlaceholder}
                      placeholderTextColor={Colors.slate400}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    {searchQuery.length > 0 && (
                      <TouchableOpacity
                        onPress={() => setSearchQuery('')}
                        style={styles.clearSearch}
                      >
                        <Ionicons
                          name="close-circle"
                          size={16}
                          color={Colors.slate400}
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                <FlatList
                  data={filteredOptions}
                  keyExtractor={(item) => String(item.value)}
                  renderItem={({ item }) => {
                    const isSelected = String(item.value) === String(selectedValue);
                    return (
                      <TouchableOpacity
                        style={[
                          styles.optionItem,
                          isSelected ? styles.optionSelected : null,
                        ]}
                        onPress={() => handleSelectOption(item.value)}
                      >
                        <View style={styles.optionTextContainer}>
                          <Text
                            style={[
                              styles.optionLabel,
                              isSelected ? styles.optionLabelSelected : null,
                            ]}
                          >
                            {item.label}
                          </Text>
                          {item.subtitle ? (
                            <Text style={styles.optionSubtitle}>
                              {item.subtitle}
                            </Text>
                          ) : null}
                        </View>
                        {isSelected && (
                          <Ionicons
                            name="checkmark"
                            size={20}
                            color={Colors.primary}
                          />
                        )}
                      </TouchableOpacity>
                    );
                  }}
                  ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                      <Text style={styles.emptyText}>No options found</Text>
                    </View>
                  }
                  style={styles.optionsList}
                  keyboardShouldPersistTaps="handled"
                />
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
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    borderColor: Colors.border,
  },
  selectedText: {
    fontSize: 14,
    color: Colors.textPrimary,
    flex: 1,
    marginRight: 8,
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
    maxHeight: '80%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.slate100,
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 10,
    height: 42,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
    paddingVertical: 0,
  },
  clearSearch: {
    padding: 4,
  },
  optionsList: {
    maxHeight: 320,
    paddingHorizontal: 16,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    borderRadius: 8,
  },
  optionSelected: {
    backgroundColor: Colors.primaryMuted,
  },
  optionTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  optionLabelSelected: {
    color: Colors.primaryDark,
    fontWeight: '700',
  },
  optionSubtitle: {
    fontSize: 12,
    color: Colors.slate500,
    marginTop: 2,
  },
  emptyContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: Colors.slate400,
  },
});
