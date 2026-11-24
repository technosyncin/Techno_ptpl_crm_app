import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Receipt } from '../../api/creditService';
import { Badge } from '../common/Badge';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing, BorderRadius, Shadows } from '../../theme/spacing';
import { formatCurrency, formatDate } from '../../utils/formatting';

interface ReceiptCardProps {
  receipt: Receipt;
  onPress?: () => void;
  onDelete?: () => void;
  onHistory?: () => void;
}

export const ReceiptCard: React.FC<ReceiptCardProps> = ({ receipt, onPress, onDelete, onHistory }) => {
  const isOutgoing =
    receipt.paymentType === 'outgoing' ||
    receipt.paymentType === 'Payment' ||
    receipt.objType === 4 ||
    (receipt.receiptNo || '').toUpperCase().startsWith('PAY') ||
    (receipt.referenceNo || '').toUpperCase().startsWith('PAY') ||
    ((receipt as any).referenceNumber || '').toUpperCase().startsWith('PAY');

  const displayNo =
    receipt.receiptNo ||
    receipt.referenceNo ||
    (receipt as any).referenceNumber ||
    (isOutgoing ? `PAY-${receipt.receiptId}` : `REC-${receipt.receiptId}`);

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.85}
      style={[
        styles.card,
        Shadows.sm,
        isOutgoing ? styles.cardOutgoing : styles.cardIncoming,
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.idContainer}>
          <View
            style={[
              styles.typeBadge,
              isOutgoing ? styles.typeBadgeOutgoing : styles.typeBadgeIncoming,
            ]}
          >
            <Ionicons
              name={isOutgoing ? 'arrow-up-circle' : 'arrow-down-circle'}
              size={12}
              color={isOutgoing ? Colors.dangerDark : Colors.successDark}
            />
            <Text
              style={[
                styles.typeBadgeText,
                { color: isOutgoing ? Colors.dangerDark : Colors.successDark },
              ]}
            >
              {isOutgoing ? 'Payment (Out)' : 'Receipt (In)'}
            </Text>
          </View>
          <Text
            style={[
              Typography.captionBold,
              styles.receiptNo,
              isOutgoing && styles.receiptNoOutgoing,
            ]}
          >
            {displayNo}
          </Text>
          <Text style={[Typography.caption, styles.date]}>{formatDate(receipt.receiptDate)}</Text>
        </View>
        <Badge label={receipt.status} />
      </View>

      <View style={styles.customerRow}>
        <Text style={[Typography.bodyBold, styles.customerName]}>{receipt.customerName}</Text>
        {receipt.companyName ? (
          <Text style={[Typography.caption, styles.companyName]}>{receipt.companyName}</Text>
        ) : null}
      </View>

      <View style={styles.bottomRow}>
        <View
          style={[
            styles.paymentModePill,
            isOutgoing && styles.paymentModePillOutgoing,
          ]}
        >
          <Ionicons
            name={isOutgoing ? 'arrow-up-circle-outline' : 'card-outline'}
            size={14}
            color={isOutgoing ? Colors.dangerDark : Colors.primary}
          />
          <Text
            style={[
              Typography.captionBold,
              styles.paymentModeText,
              isOutgoing && styles.paymentModeTextOutgoing,
            ]}
          >
            {receipt.paymentMode || 'Direct'}
            {receipt.referenceNo && receipt.referenceNo !== displayNo
              ? ` (${receipt.referenceNo})`
              : ''}
          </Text>
        </View>

        <Text
          style={[
            Typography.h4,
            isOutgoing ? styles.amountOutgoing : styles.amountIncoming,
          ]}
        >
          {isOutgoing ? `- ${formatCurrency(receipt.amount)}` : `+ ${formatCurrency(receipt.amount)}`}
        </Text>
      </View>

      {onHistory || onDelete ? (
        <View style={styles.cardActionsRow}>
          {onHistory ? (
            <TouchableOpacity
              style={styles.historyBtn}
              onPress={(e) => {
                e.stopPropagation?.();
                onHistory();
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="time-outline" size={15} color="#6d28d9" />
              <Text style={styles.historyBtnText}>History</Text>
            </TouchableOpacity>
          ) : null}

          {onDelete ? (
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={(e) => {
                e.stopPropagation?.();
                onDelete();
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={15} color={Colors.danger} />
              <Text style={styles.deleteBtnText}>Delete</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
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
  cardIncoming: {
    borderLeftWidth: 3.5,
    borderLeftColor: Colors.success,
  },
  cardOutgoing: {
    borderLeftWidth: 3.5,
    borderLeftColor: Colors.danger,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  idContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flexWrap: 'wrap',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  typeBadgeIncoming: {
    backgroundColor: Colors.successLight,
    borderColor: '#bbf7d0',
  },
  typeBadgeOutgoing: {
    backgroundColor: Colors.dangerLight,
    borderColor: '#fecaca',
  },
  typeBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    lineHeight: 15,
  },
  receiptNo: {
    color: Colors.primary,
  },
  receiptNoOutgoing: {
    color: Colors.dangerDark,
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
  paymentModePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primaryMuted,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  paymentModePillOutgoing: {
    backgroundColor: Colors.dangerLight,
  },
  paymentModeText: {
    color: Colors.primaryDark,
    fontSize: 11,
  },
  paymentModeTextOutgoing: {
    color: Colors.dangerDark,
    fontSize: 11,
  },
  amountIncoming: {
    color: Colors.successDark,
    fontWeight: '700',
  },
  amountOutgoing: {
    color: Colors.dangerDark,
    fontWeight: '700',
  },
  cardActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    marginTop: Spacing.xs,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  historyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.sm,
    backgroundColor: '#f5f3ff',
    borderWidth: 1,
    borderColor: '#ddd6fe',
  },
  historyBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6d28d9',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.sm,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  deleteBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.danger,
  },
});
