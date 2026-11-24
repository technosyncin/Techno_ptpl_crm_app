import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing, BorderRadius, Shadows } from '../../theme/spacing';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'slate' | 'default';
  onPress?: () => void;
  style?: ViewStyle;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  color,
  variant = 'default',
  onPress,
  style,
}) => {
  if (variant === 'primary') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={!onPress}
        activeOpacity={0.85}
        style={[styles.container, Shadows.md, style]}
      >
        <LinearGradient
          colors={['#7c3aed', '#6d28d9']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientCard}
        >
          <View style={styles.headerRow}>
            <Text style={[Typography.captionMedium, styles.titleLight]}>{title}</Text>
            <View style={styles.iconBadgeLight}>
              <Ionicons name={icon} size={18} color="#ffffff" />
            </View>
          </View>
          <Text style={[Typography.h2, styles.valueLight]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
          {subtitle ? <Text style={[Typography.caption, styles.subtitleLight]}>{subtitle}</Text> : null}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  const getVariantColors = () => {
    if (color) {
      return { iconColor: color, iconBg: `${color}15`, border: `${color}30` };
    }
    switch (variant) {
      case 'success':
        return { iconColor: Colors.success, iconBg: Colors.successLight, border: '#bbf7d0' };
      case 'warning':
        return { iconColor: Colors.warning, iconBg: Colors.warningLight, border: '#fde68a' };
      case 'danger':
        return { iconColor: Colors.danger, iconBg: Colors.dangerLight, border: '#fecaca' };
      case 'slate':
        return { iconColor: Colors.slate700, iconBg: Colors.slate100, border: Colors.slate200 };
      default:
        return { iconColor: Colors.primary, iconBg: Colors.primaryMuted, border: Colors.border };
    }
  };

  const vColors = getVariantColors();

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.8}
      style={[
        styles.card,
        Shadows.sm,
        { borderColor: vColors.border },
        style,
      ]}
    >
      <View style={styles.headerRow}>
        <Text style={[Typography.captionBold, styles.titleDark]}>{title}</Text>
        <View style={[styles.iconBadge, { backgroundColor: vColors.iconBg }]}>
          <Ionicons name={icon} size={16} color={vColors.iconColor} />
        </View>
      </View>
      <Text style={[Typography.h3, styles.valueDark]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      {subtitle ? <Text style={[Typography.caption, styles.subtitleDark]}>{subtitle}</Text> : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  gradientCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  card: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    flex: 1,
    margin: 4,
    minWidth: 140,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  titleLight: {
    color: '#ede9fe',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  titleDark: {
    color: Colors.slate500,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: 11,
  },
  valueLight: {
    color: '#ffffff',
    fontWeight: '800',
    marginVertical: 2,
  },
  valueDark: {
    color: Colors.slate900,
    fontWeight: '700',
    marginVertical: 2,
    fontSize: 18,
  },
  subtitleLight: {
    color: '#ddd6fe',
    marginTop: 2,
  },
  subtitleDark: {
    color: Colors.slate500,
    marginTop: 2,
    fontSize: 11,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBadgeLight: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
