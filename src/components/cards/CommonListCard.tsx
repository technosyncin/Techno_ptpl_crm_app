import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Badge } from '../common/Badge';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing, BorderRadius, Shadows } from '../../theme/spacing';

export interface InfoPillItem {
  icon?: keyof typeof Ionicons.glyphMap;
  text: string;
  iconColor?: string;
  numberOfLines?: number;
}

export interface CommonListCardProps {
  // Main title & subtitle
  title: string;
  subtitle?: string;

  // Optional Avatar (text initial) or Icon
  avatarText?: string;
  avatarIcon?: keyof typeof Ionicons.glyphMap;
  avatarColor?: string;
  avatarBgColor?: string;

  // Status / Badge on top-right
  badgeLabel?: string;
  badgeVariant?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'slate';
  badgeExtra?: React.ReactNode;
    headerRightComponent?: React.ReactNode;


  // Middle Row: Info Pills (chips)
  pills?: (InfoPillItem | string | number | boolean | null | undefined)[];

  // Optional Meta Row (e.g. Phone, Follow-up, Amount, Date)
  metaLeft?: {
    label: string;
    value: string;
    valueColor?: string;
  };
  metaRight?: {
    label?: string;
    badgeText?: string;
    badgeIcon?: keyof typeof Ionicons.glyphMap;
    badgeColor?: string;
    badgeBgColor?: string;
  };

  // Custom Children (e.g. tax rows or extra detail sections)
  children?: React.ReactNode;

  // Bottom Strip Left
  footerIcon?: keyof typeof Ionicons.glyphMap;
  footerText?: string;
  footerLeftComponent?: React.ReactNode;

  // Bottom Strip Right Actions
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onWhatsApp?: () => void;
  editLabel?: string;
  deleteLabel?: string;
  extraActions?: React.ReactNode;

  // Style overrides
  style?: StyleProp<ViewStyle>;
}

export const CommonListCard: React.FC<CommonListCardProps> = ({
  title,
  subtitle,
  avatarText,
  avatarIcon,
  avatarColor,
  avatarBgColor,
  badgeLabel,
  badgeVariant,
  badgeExtra,
  headerRightComponent,
  pills,
  metaLeft,
  metaRight,
  children,
  footerIcon,
  footerText,
  footerLeftComponent,
  onPress,
  onWhatsApp,
  onEdit,
  onDelete,
  editLabel = 'Edit',
  deleteLabel = 'Delete',
  extraActions,
  style,
}) => {
  const validPills = (pills || []).filter(
    (p): p is InfoPillItem => Boolean(p && typeof p === 'object' && 'text' in p && p.text)
  );

  const hasBottomStrip = Boolean(
      footerLeftComponent || footerText || extraActions || onEdit || onDelete || onWhatsApp
  );

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.85 : 1}
      disabled={!onPress}
      style={[styles.card, Shadows.sm, style]}
    >
      {/* Top Row: Avatar / Icon + Title & Subtitle + Badge / HeaderRight */}
      <View style={styles.topRow}>
        <View style={styles.headerLeft}>
          {avatarText ? (
            <View style={[styles.avatar, avatarBgColor ? { backgroundColor: avatarBgColor } : null]}>
              <Text style={[styles.avatarText, avatarColor ? { color: avatarColor } : null]}>
                {avatarText}
              </Text>
            </View>
          ) : avatarIcon ? (
            <View style={[styles.avatar, avatarBgColor ? { backgroundColor: avatarBgColor } : null]}>
              <Ionicons
                name={avatarIcon}
                size={18}
                color={avatarColor || Colors.primary}
              />
            </View>
          ) : null}

          <View style={styles.nameContainer}>
            <View style={styles.titleWrap}>
              <Text style={[Typography.h4, styles.title]} numberOfLines={1}>
                {title}
              </Text>
              {badgeExtra}
            </View>
            {subtitle ? (
              <Text style={[Typography.captionMedium, styles.subtitle]} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.headerRightWrap}>
          {headerRightComponent ? (
            headerRightComponent
          ) : badgeLabel ? (
            <Badge label={badgeLabel} variant={badgeVariant} />
          ) : null}
        </View>
      </View>

      {/* Middle Row: Info Pills */}
      {validPills.length > 0 ? (
        <View style={styles.detailsRow}>
          {validPills.map((pill, idx) => (
            <View key={idx} style={styles.infoPill}>
              {pill.icon ? (
                <Ionicons
                  name={pill.icon}
                  size={13}
                  color={pill.iconColor || Colors.slate500}
                />
              ) : null}
              <Text
                style={[Typography.caption, styles.infoPillText]}
                numberOfLines={pill.numberOfLines || 1}
              >
                {pill.text}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* Custom Children (e.g. tax rows) */}
      {children}

      {/* Optional Meta Row */}
      {metaLeft || metaRight ? (
        <View style={styles.metaRow}>
          {metaLeft ? (
            <View style={styles.valueGroup}>
              <Text style={[Typography.caption, styles.metaLabel]}>{metaLeft.label}</Text>
              <Text style={[Typography.bodyBold, styles.valueText, metaLeft.valueColor ? { color: metaLeft.valueColor } : null]}>
                {metaLeft.value}
              </Text>
            </View>
          ) : <View />}

          {metaRight && metaRight.badgeText ? (
            <View style={styles.followUpGroup}>
              {metaRight.label ? (
                <Text style={[Typography.caption, styles.metaLabel]}>{metaRight.label}</Text>
              ) : null}
              <View style={[styles.followUpBadge, metaRight.badgeBgColor ? { backgroundColor: metaRight.badgeBgColor } : null]}>
                {metaRight.badgeIcon ? (
                  <Ionicons name={metaRight.badgeIcon} size={12} color={metaRight.badgeColor || Colors.warningDark} />
                ) : null}
                <Text style={[Typography.captionBold, styles.followUpText, metaRight.badgeColor ? { color: metaRight.badgeColor } : null]}>
                  {metaRight.badgeText}
                </Text>
              </View>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Bottom Action Strip */}
       
      {/* Bottom Action Strip */}
      {hasBottomStrip ? (
        <View style={styles.bottomStrip}>
          <View style={styles.footerLeft}>
            {footerLeftComponent ? (
              footerLeftComponent
            ) : footerText ? (
              <View style={styles.footerTextGroup}>
                {footerIcon ? (
                  <Ionicons name={footerIcon} size={13} color={Colors.slate400} />
                ) : null}
                <Text style={[Typography.caption, styles.footerText]} numberOfLines={1}>
                  {footerText}
                </Text>
              </View>
            ) : (
              <View />
            )}
          </View>

          <View style={styles.actions}>
            {onEdit ? (
              <View style={styles.editActionGroup}>
                <TouchableOpacity
                  onPress={onEdit}
                  style={styles.editActionBtn}
                  activeOpacity={0.75}
                >
                  <Ionicons name="create-outline" size={14} color="#645695" />
                  <Text style={styles.editActionBtnText}>{editLabel}</Text>
                </TouchableOpacity>

                {onWhatsApp ? (
                  <TouchableOpacity
                    onPress={onWhatsApp}
                    style={styles.whatsAppActionBtn}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="logo-whatsapp" size={18} color="#ffffff" />
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}

            {extraActions}

            {onDelete ? (
              <TouchableOpacity
                onPress={onDelete}
                style={styles.deleteActionBtn}
                activeOpacity={0.75}
              >
                <Ionicons name="trash-outline" size={13} color="#dc2626" />
                <Text style={styles.deleteActionBtnText}>{deleteLabel}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
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
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
    gap: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    marginRight: Spacing.sm,
  },
  headerRightWrap: {
    flexShrink: 0,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(124, 58, 237, 0.2)',
    marginRight: 10,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  nameContainer: {
    flex: 1,
    minWidth: 0,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  title: {
    color: Colors.slate900,
    fontWeight: '700',
  },
  subtitle: {
    color: Colors.slate500,
    marginTop: 2,
  },
  detailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginVertical: Spacing.xs,
  },
  infoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.slate50,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.slate200,
    gap: 4,
  },
  infoPillText: {
    color: Colors.slate700,
    fontSize: 11.5,
    lineHeight: 15,
    fontWeight: '500',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: Spacing.xs,
    paddingTop: Spacing.xs,
  },
  valueGroup: {},
  metaLabel: {
    color: Colors.slate400,
    fontSize: 11,
  },
  valueText: {
    color: Colors.primary,
    fontSize: 13,
  },
  followUpGroup: {
    alignItems: 'flex-end',
  },
  followUpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.warningLight,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  followUpText: {
    color: Colors.warningDark,
    fontSize: 11.5,
    fontWeight: '600',
    lineHeight: 15,
  },
  bottomStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  footerLeft: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  footerTextGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    color: Colors.slate400,
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    gap: 4,
  },
  editActionBtnText: {
    color: '#645695',
    fontSize: 12,
    fontWeight: '700',
  },
  deleteActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FECACA',
    gap: 4,
  },
  deleteActionBtnText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
    },
    editActionGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },

    whatsAppActionBtn: {
        width: 30,
        height: 29,
        borderRadius: 6,
        backgroundColor: '#25D366',
        alignItems: 'center',
        justifyContent: 'center',
    },
});
