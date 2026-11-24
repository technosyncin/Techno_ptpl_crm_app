import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/common/Header';
import { Badge } from '../../components/common/Badge';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import { MobileDatePicker } from '../../components/common/MobileDatePicker';
import { QuickMessageModal } from '../../components/modals/QuickMessageModal';
import { SalesShortcutsDrawer } from '../../components/modals/SalesShortcutsDrawer';
import { leadService, Lead } from '../../api/leadService';
import { messagingService } from '../../api/messagingService';
import { Colors } from '../../theme/colors';

interface LeadDetailsScreenProps {
  route: any;
  navigation: any;
}

export const LeadDetailsScreen: React.FC<LeadDetailsScreenProps> = ({ route, navigation }) => {
  const { leadId } = route.params;
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [msgModalVisible, setMsgModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [shortcutsVisible, setShortcutsVisible] = useState(false);

  // Follow-up quick scheduler state
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpTime, setFollowUpTime] = useState('10:00');

  useEffect(() => {
    fetchLead();
  }, [leadId]);

  const fetchLead = async () => {
    setLoading(true);
    try {
      const data = await leadService.getLeadById(leadId);
      if (data) {
        setLead(data);
        setFollowUpDate(data.followUpDate || '');
        setFollowUpTime(data.followUpTime || '10:00');
      }
    } catch (err) {
      console.warn('Error fetching lead details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await leadService.deleteLead(leadId);
      setDeleteModalVisible(false);
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', 'Failed to delete lead.');
    } finally {
      setDeleting(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    try {
      await leadService.updateLead(leadId, { leadStatus: newStatus });
      setLead((prev) => (prev ? { ...prev, leadStatus: newStatus } : null));
      Alert.alert('Status Updated', `Lead marked as ${newStatus}`);
    } catch {
      Alert.alert('Error', 'Failed to update lead status');
    }
  };

  const handleSaveFollowUp = async (date: string) => {
    setFollowUpDate(date);
    try {
      await leadService.updateFollowUp(leadId, date, followUpTime);
      Alert.alert('Follow-Up Scheduled', `Next follow-up set for ${date} at ${followUpTime}`);
    } catch {
      Alert.alert('Error', 'Failed to update follow-up date');
    }
  };

  if (loading || !lead) {
    return (
      <View style={styles.container}>
        <Header title="Lead Details" showBack onBack={() => navigation.goBack()} />
        <View style={styles.centerLoading}>
          <Text style={styles.loadingText}>Loading lead profile...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header
        title="Lead Profile"
        showBack
        onBack={() => navigation.goBack()}
        rightComponent={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity
              style={styles.headerShortcutBtn}
              onPress={() => setShortcutsVisible(true)}
              activeOpacity={0.75}
            >
              <Ionicons name="flash" size={14} color="#ffffff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerEditBtn}
              onPress={() => navigation.navigate('AddLead', { editLead: lead })}
              activeOpacity={0.75}
            >
              <Ionicons name="create-outline" size={18} color={Colors.slate700} />
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Main Header Card */}
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.leadName}>{lead.leadName}</Text>
              {lead.companyName ? (
                <Text style={styles.companyName}>{lead.companyName}</Text>
              ) : null}
            </View>
            <Badge label={String(lead.leadStatus || 'New')} size="md" />
          </View>

          {/* Quick Communication Actions */}
          <View style={styles.commStrip}>
            <TouchableOpacity
              onPress={() => lead.mobileNo && messagingService.makePhoneCall(lead.mobileNo)}
              style={[styles.commBtn, { backgroundColor: Colors.callBg }]}
            >
              <Ionicons name="call" size={18} color={Colors.call} />
              <Text style={[styles.commBtnText, { color: Colors.call }]}>Call</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setMsgModalVisible(true)}
              style={[styles.commBtn, { backgroundColor: Colors.whatsappBg }]}
            >
              <Ionicons name="logo-whatsapp" size={18} color={Colors.whatsapp} />
              <Text style={[styles.commBtnText, { color: '#15803d' }]}>WhatsApp</Text>
            </TouchableOpacity>

            {lead.email ? (
              <TouchableOpacity
                onPress={() =>
                  messagingService.sendEmail(
                    lead.email!,
                    `Follow-up regarding ${lead.productInterestedIn || 'our discussion'}`,
                    `Hello ${lead.leadName},\n\n`
                  )
                }
                style={[styles.commBtn, { backgroundColor: Colors.emailBg }]}
              >
                <Ionicons name="mail" size={18} color={Colors.email} />
                <Text style={[styles.commBtnText, { color: Colors.email }]}>Email</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              onPress={() =>
                lead.mobileNo &&
                messagingService.sendSMS(
                  lead.mobileNo,
                  `Hello ${lead.leadName}, following up regarding your enquiry with Techno CRM.`
                )
              }
              style={[styles.commBtn, { backgroundColor: Colors.smsBg }]}
            >
              <Ionicons name="chatbubble-ellipses" size={18} color={Colors.sms} />
              <Text style={[styles.commBtnText, { color: Colors.sms }]}>SMS</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Contact Details */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Contact & Location</Text>

          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={18} color={Colors.slate400} style={styles.rowIcon} />
            <View>
              <Text style={styles.infoLabel}>Mobile Number</Text>
              <Text style={styles.infoValue}>{lead.mobileNo || 'N/A'}</Text>
            </View>
          </View>

          {lead.email ? (
            <View style={styles.infoRow}>
              <Ionicons name="mail-outline" size={18} color={Colors.slate400} style={styles.rowIcon} />
              <View>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{lead.email}</Text>
              </View>
            </View>
          ) : null}

          {lead.city ? (
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={18} color={Colors.slate400} style={styles.rowIcon} />
              <View>
                <Text style={styles.infoLabel}>City</Text>
                <Text style={styles.infoValue}>{lead.city}</Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* CRM Info */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Opportunity Details</Text>

          {lead.productInterestedIn ? (
            <View style={styles.infoRow}>
              <Ionicons name="cube-outline" size={18} color={Colors.slate400} style={styles.rowIcon} />
              <View>
                <Text style={styles.infoLabel}>Product of Interest</Text>
                <Text style={styles.infoValue}>{lead.productInterestedIn}</Text>
              </View>
            </View>
          ) : null}

          {lead.remarks ? (
            <View style={styles.infoRow}>
              <Ionicons name="document-text-outline" size={18} color={Colors.slate400} style={styles.rowIcon} />
              <View>
                <Text style={styles.infoLabel}>Remarks / Requirements</Text>
                <Text style={styles.infoValue}>{lead.remarks}</Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* Quick Follow-Up Scheduler */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Schedule Follow-Up</Text>
          <MobileDatePicker
            label="Follow-Up Date"
            value={followUpDate}
            timeValue={followUpTime}
            onChangeDate={handleSaveFollowUp}
            onChangeTime={setFollowUpTime}
            showTime
          />
        </View>

        {/* Update Status Buttons */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Update Status</Text>
          <View style={styles.statusChipsRow}>
            {['Contacted', 'Qualified', 'Proposal Sent', 'Won', 'Lost'].map((st) => {
              const isActive = lead.leadStatus === st;
              return (
                <TouchableOpacity
                  key={st}
                  style={[styles.statusChip, isActive ? styles.statusChipActive : null]}
                  onPress={() => handleUpdateStatus(st)}
                >
                  <Text style={[styles.statusChipText, isActive ? styles.statusChipTextActive : null]}>
                    {st}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Delete Lead Button */}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => setDeleteModalVisible(true)}
        >
          <Ionicons name="trash-outline" size={18} color={Colors.danger} style={{ marginRight: 6 }} />
          <Text style={styles.deleteButtonText}>Delete Lead Record</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Quick WhatsApp/SMS Modal */}
      <QuickMessageModal
        visible={msgModalVisible}
        onClose={() => setMsgModalVisible(false)}
        recipientName={lead.leadName}
        mobileNo={lead.mobileNo}
      />

      {/* Confirmation Modal */}
      <ConfirmationModal
        visible={deleteModalVisible}
        title="Delete Lead"
        message={`Are you sure you want to delete "${lead.leadName}"? This action cannot be undone.`}
        confirmText="Delete"
        isDestructive
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteModalVisible(false)}
      />

      {/* Sales Module Shortcuts Drawer */}
      <SalesShortcutsDrawer
        visible={shortcutsVisible}
        onClose={() => setShortcutsVisible(false)}
        navigation={navigation}
        leadId={lead.leadID}
        leadName={lead.leadName}
        mobileNo={lead.mobileNo}
        companyName={lead.companyName}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: Colors.slate500,
    fontSize: 14,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  leadName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.slate900,
  },
  companyName: {
    fontSize: 13,
    color: Colors.slate500,
    marginTop: 2,
  },
  commStrip: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: 12,
  },
  commBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  commBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.slate800,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    paddingBottom: 6,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  rowIcon: {
    marginRight: 12,
  },
  infoLabel: {
    fontSize: 11,
    color: Colors.slate400,
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginTop: 1,
  },
  statusChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceAlt,
  },
  statusChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.slate700,
  },
  statusChipTextActive: {
    color: Colors.textInverse,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: Colors.dangerLight,
    marginTop: 6,
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.danger,
  },
  headerShortcutBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerEditBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
