import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Quotation } from '../../api/salesService';
import { Badge } from '../common/Badge';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing, BorderRadius, Shadows } from '../../theme/spacing';
import { formatCurrency, formatDate } from '../../utils/formatting';

interface QuotationCardProps {
  quotation: Quotation;
  onPress?: () => void;
}

export const QuotationCard: React.FC<QuotationCardProps> = ({ quotation, onPress }) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.85}
      style={[styles.card, Shadows.sm]}
    >
      <View style={styles.topRow}>
        <View style={styles.idGroup}>
          <Text style={[Typography.captionBold, styles.quotationNo]}>
            {quotation.quotationNo}
          </Text>
          <Text style={[Typography.caption, styles.date]}>
            {formatDate(quotation.quotationDate)}
          </Text>
        </View>
        <Badge label={quotation.status} />
      </View>

      <View style={styles.customerRow}>
        <Text style={[Typography.bodyBold, styles.customerName]}>
          {quotation.customerName}
        </Text>
        <Text style={[Typography.caption, styles.companyName]}>
          {quotation.companyName}
        </Text>
      </View>

      <View style={styles.bottomRow}>
        <View style={styles.validityGroup}>
          <Ionicons name="time-outline" size={13} color={Colors.slate400} />
          <Text style={[Typography.caption, styles.validityText]}>
            Valid till {formatDate(quotation.validUntil)}
          </Text>
        </View>

        <Text style={[Typography.h4, styles.amountText]}>
          {formatCurrency(quotation.netAmount)}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
    gap: 8,
  },
  idGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
    minWidth: 0,
  },
  quotationNo: {
    color: Colors.primary,
  },
  date: {
    color: Colors.slate400,
  },
  customerRow: {
    marginVertical: Spacing.xs,
  },
  customerName: {
    color: Colors.slate900,
  },
  companyName: {
    color: Colors.slate500,
    marginTop: 2,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  validityGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  validityText: {
    color: Colors.slate500,
    fontSize: 11,
  },
  amountText: {
    color: Colors.slate900,
    fontWeight: '700',
  },
});
