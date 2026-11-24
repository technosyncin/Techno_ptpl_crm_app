import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Contact } from '../../api/contactService';
import { Badge } from '../common/Badge';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing, BorderRadius, Shadows } from '../../theme/spacing';
import { formatDate } from '../../utils/formatting';
import { makePhoneCall, sendWhatsAppMessage } from '../../utils/communication';

interface ContactCardProps {
  contact: Contact;
  onPress: () => void;
  onCall?: () => void;
  onWhatsApp?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const ContactCard: React.FC<ContactCardProps> = ({
  contact,
  onPress,
  onCall,
  onWhatsApp,
  onEdit,
  onDelete,
}) => {
  const linkedLeadId = contact.leadId || contact.leadID;
  const displayName = contact.companyName || contact.contactPerson || contact.contactName || 'Contact';
  const personName = contact.contactPerson || contact.contactName || '';
  const phone = contact.phone || contact.mobileNo || '';

  const handleCall = () => {
    if (onCall) onCall();
    else if (phone) makePhoneCall(phone);
  };

  const handleWhatsApp = () => {
    if (onWhatsApp) onWhatsApp();
    else if (phone) sendWhatsAppMessage(phone);
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.card, Shadows.sm]}
    >
      {/* Top Row: Company / Contact Name & Status */}
      <View style={styles.topRow}>
        <View style={styles.nameContainer}>
          <Text style={[Typography.h4, styles.contactName]} numberOfLines={1}>
            {displayName}
          </Text>
          {personName && personName !== displayName ? (
            <Text style={[Typography.captionMedium, styles.companyName]} numberOfLines={1}>
              {personName}
            </Text>
          ) : null}
        </View>
        <Badge label={String(contact.status || 'Active')} />
      </View>

      {/* Middle Row: Position / City / Email info pills */}
      <View style={styles.detailsRow}>
        {contact.position || contact.designation ? (
          <View style={styles.infoPill}>
            <Ionicons name="briefcase-outline" size={13} color={Colors.primary} />
            <Text style={[Typography.caption, styles.infoPillText]} numberOfLines={1}>
              {contact.position || contact.designation}
            </Text>
          </View>
        ) : null}

        {contact.city || contact.addressLine1 ? (
          <View style={styles.infoPill}>
            <Ionicons name="location-outline" size={13} color={Colors.slate500} />
            <Text style={[Typography.caption, styles.infoPillText]} numberOfLines={1}>
              {contact.city ? (contact.addressLine1 ? `${contact.city} (${contact.addressLine1})` : contact.city) : contact.addressLine1}
            </Text>
          </View>
        ) : null}

        {contact.email ? (
          <View style={styles.infoPill}>
            <Ionicons name="mail-outline" size={13} color={Colors.slate500} />
            <Text style={[Typography.caption, styles.infoPillText]} numberOfLines={1}>
              {contact.email}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Tax & Registration Details Row (GST, PAN, CIN, Aadhar) */}
      {(contact.gstNo || contact.panNo || contact.cinNo || contact.adharNo) ? (
        <View style={styles.taxRow}>
          {contact.gstNo ? (
            <View style={[styles.taxPill, { backgroundColor: '#F5F3FF', borderColor: '#DDD6FE' }]}>
              <Ionicons name="shield-checkmark" size={11} color="#6D28D9" />
              <Text style={styles.taxPillLabel}>
                GST: <Text style={styles.taxPillValue}>{contact.gstNo}</Text>
              </Text>
            </View>
          ) : null}

          {contact.panNo ? (
            <View style={[styles.taxPill, { backgroundColor: '#F0F9FF', borderColor: '#BAE6FD' }]}>
              <Ionicons name="card" size={11} color="#0369A1" />
              <Text style={styles.taxPillLabel}>
                PAN: <Text style={styles.taxPillValue}>{contact.panNo}</Text>
              </Text>
            </View>
          ) : null}

          {contact.cinNo ? (
            <View style={[styles.taxPill, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
              <Ionicons name="business" size={11} color="#047857" />
              <Text style={styles.taxPillLabel}>
                CIN: <Text style={styles.taxPillValue}>{contact.cinNo}</Text>
              </Text>
            </View>
          ) : null}

          {contact.adharNo ? (
            <View style={[styles.taxPill, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
              <Ionicons name="finger-print" size={11} color="#B45309" />
              <Text style={styles.taxPillLabel}>
                Aadhar: <Text style={styles.taxPillValue}>{contact.adharNo}</Text>
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Meta Row: Phone & Date */}
      <View style={styles.metaRow}>
        <View style={styles.valueGroup}>
          <Text style={[Typography.caption, styles.metaLabel]}>Phone</Text>
          <Text style={[Typography.bodyBold, styles.valueText]}>
            {phone || 'N/A'}
          </Text>
        </View>

        {contact.createdDate ? (
          <View style={styles.followUpGroup}>
            <Text style={[Typography.caption, styles.metaLabel]}>Created</Text>
            <View style={styles.dateBadge}>
              <Ionicons name="calendar-outline" size={12} color={Colors.slate600} />
              <Text style={[Typography.captionBold, styles.dateText]}>
                {formatDate(contact.createdDate)}
              </Text>
            </View>
          </View>
        ) : null}
      </View>

      {/* Bottom Action Strip (Identical to LeadCard) */}
      <View style={styles.bottomStrip}>
        <View style={styles.sourceGroup}>
          {linkedLeadId && linkedLeadId > 0 ? (
            <>
              <Ionicons name="link" size={12} color={Colors.primary} />
              <Text style={[Typography.caption, styles.leadLinkText]}>
                Lead #{linkedLeadId}
              </Text>
            </>
          ) : (
            <>
              <Ionicons name="business-outline" size={12} color={Colors.slate400} />
              <Text style={[Typography.caption, styles.sourceText]}>
                Direct Contact
              </Text>
            </>
          )}
        </View>

        <View style={styles.actions}>
          {phone ? (
            <TouchableOpacity
              onPress={handleCall}
              style={styles.iconActionBtn}
              activeOpacity={0.75}
            >
              <Ionicons name="call" size={13} color={Colors.call} />
            </TouchableOpacity>
          ) : null}

          {phone ? (
            <TouchableOpacity
              onPress={handleWhatsApp}
              style={[styles.iconActionBtn, styles.whatsappBtn]}
              activeOpacity={0.75}
            >
              <Ionicons name="logo-whatsapp" size={13} color={Colors.whatsapp} />
            </TouchableOpacity>
          ) : null}

          {onEdit ? (
            <TouchableOpacity
              onPress={onEdit}
              style={styles.editActionBtn}
              activeOpacity={0.75}
            >
              <Ionicons name="create-outline" size={14} color="#645695" />
              <Text style={styles.editActionBtnText}>Edit</Text>
            </TouchableOpacity>
          ) : null}

          {onDelete ? (
            <TouchableOpacity
              onPress={onDelete}
              style={styles.deleteActionBtn}
              activeOpacity={0.75}
            >
              <Ionicons name="trash-outline" size={13} color="#dc2626" />
              <Text style={styles.deleteActionBtnText}>Delete</Text>
            </TouchableOpacity>
          ) : null}
        </View>
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
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
  },
  nameContainer: {
    flex: 1,
    minWidth: 0,
    marginRight: Spacing.sm,
  },
  contactName: {
    color: Colors.slate900,
    fontWeight: '700',
  },
  companyName: {
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
  },
  taxRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: 4,
  },
  taxPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    gap: 4,
  },
  taxPillLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: Colors.slate600,
    lineHeight: 15,
  },
  taxPillValue: {
    fontWeight: '700',
    color: Colors.slate900,
    fontSize: 11.5,
    lineHeight: 15,
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
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.slate100,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.slate200,
  },
  dateText: {
    color: Colors.slate700,
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
  sourceGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sourceText: {
    color: Colors.slate400,
    fontSize: 12,
  },
  leadLinkText: {
    color: Colors.primaryDark,
    fontSize: 12,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: Colors.callBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BAE7FF',
  },
  whatsappBtn: {
    backgroundColor: Colors.whatsappBg,
    borderColor: '#B7EB8F',
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
});
