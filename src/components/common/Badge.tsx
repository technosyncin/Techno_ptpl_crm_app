import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { BorderRadius, Spacing } from '../../theme/spacing';

interface BadgeProps {
  label: string;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'slate';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ label, variant, size = 'sm' }) => {
  // Determine variant automatically from text if not provided
  let determinedVariant = variant;
  if (!determinedVariant) {
    const l = label.toLowerCase();
    if (['won', 'approved', 'completed', 'good', 'active', 'confirmed'].includes(l)) {
      determinedVariant = 'success';
    } else if (['in progress', 'contacted', 'warning', 'medium'].includes(l)) {
      determinedVariant = 'warning';
    } else if (['lost', 'high', 'overdue', 'rejected', 'blocked', 'bounced'].includes(l)) {
      determinedVariant = 'danger';
    } else if (['new', 'draft', 'pending', 'proposal sent', 'proposal', 'sent'].includes(l)) {
      determinedVariant = 'primary';
    } else {
      determinedVariant = 'slate';
    }
  }

  const getColors = () => {
    switch (determinedVariant) {
      case 'success':
        return { bg: Colors.successLight, text: Colors.successDark, border: '#bbf7d0' };
      case 'warning':
        return { bg: Colors.warningLight, text: Colors.warningDark, border: '#fde68a' };
      case 'danger':
        return { bg: Colors.dangerLight, text: Colors.dangerDark, border: '#fecaca' };
      case 'info':
        return { bg: Colors.infoLight, text: Colors.infoDark, border: '#bfdbfe' };
      case 'primary':
        return { bg: Colors.primaryMuted, text: Colors.primaryDark, border: '#ddd6fe' };
      default:
        return { bg: Colors.slate100, text: Colors.slate700, border: Colors.slate200 };
    }
  };

  const colors = getColors();

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: colors.bg, borderColor: colors.border },
        size === 'md' ? styles.badgeMd : styles.badgeSm,
      ]}
    >
      <Text
        style={[
          Typography.badge,
          { color: colors.text },
          size === 'md' ? styles.textMd : styles.textSm,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    borderWidth: 1,
    flexShrink: 0,
  },
  badgeSm: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    minHeight: 22,
  },
  badgeMd: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    minHeight: 26,
  },
  textSm: {
    fontSize: 11.5,
    lineHeight: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  textMd: {
    fontSize: 12.5,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
