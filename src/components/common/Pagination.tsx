import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
  disabled = false,
}) => {
  if (totalPages <= 1) return null;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.arrowButton,
          currentPage <= 1 || disabled ? styles.buttonDisabled : null,
        ]}
        onPress={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1 || disabled}
      >
        <Ionicons
          name="chevron-back"
          size={18}
          color={currentPage <= 1 || disabled ? Colors.slate400 : Colors.primary}
        />
        <Text
          style={[
            styles.navText,
            currentPage <= 1 || disabled ? styles.textDisabled : null,
          ]}
        >
          Prev
        </Text>
      </TouchableOpacity>

      <View style={styles.pageInfo}>
        <Text style={styles.pageText}>
          Page <Text style={styles.boldText}>{currentPage}</Text> of{' '}
          <Text style={styles.boldText}>{totalPages}</Text>
        </Text>
        {totalItems !== undefined && (
          <Text style={styles.totalItemsText}>({totalItems} total)</Text>
        )}
      </View>

      <TouchableOpacity
        style={[
          styles.arrowButton,
          currentPage >= totalPages || disabled ? styles.buttonDisabled : null,
        ]}
        onPress={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages || disabled}
      >
        <Text
          style={[
            styles.navText,
            currentPage >= totalPages || disabled ? styles.textDisabled : null,
          ]}
        >
          Next
        </Text>
        <Ionicons
          name="chevron-forward"
          size={18}
          color={
            currentPage >= totalPages || disabled
              ? Colors.slate400
              : Colors.primary
          }
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  arrowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: Colors.primaryMuted,
    gap: 4,
  },
  buttonDisabled: {
    backgroundColor: Colors.slate100,
  },
  navText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primaryDark,
  },
  textDisabled: {
    color: Colors.slate400,
  },
  pageInfo: {
    alignItems: 'center',
  },
  pageText: {
    fontSize: 13,
    color: Colors.slate600,
  },
  boldText: {
    fontWeight: '700',
    color: Colors.slate900,
  },
  totalItemsText: {
    fontSize: 11,
    color: Colors.slate400,
    marginTop: 1,
  },
});
