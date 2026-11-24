import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { creditService, Receipt } from '../../api/creditService';
import { Colors } from '../../theme/colors';
import { formatCurrency, formatDate } from '../../utils/formatting';

export interface ReceiptHistoryModalProps {
  visible: boolean;
  onClose: () => void;
  receipt: Receipt | null;
}

export const ReceiptHistoryModal: React.FC<ReceiptHistoryModalProps> = ({
  visible,
  onClose,
  receipt,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [details, setDetails] = useState<any | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);

  useEffect(() => {
    if (visible && receipt) {
      loadReceiptDetails();
    } else {
      setDetails(null);
      setDocuments([]);
    }
  }, [visible, receipt]);

  const loadReceiptDetails = async () => {
    if (!receipt) return;
    setLoading(true);
    try {
      const id = receipt.receiptId;
      const res = await creditService.getReceiptById(id, receipt.paymentType);
      const data = res?.data || res;
      setDetails(data);
      setDocuments(Array.isArray(data?.documents) ? data.documents : []);
    } catch (err) {
      console.warn('Error loading receipt history details:', err);
      // Fallback to basic receipt info
      setDetails(receipt);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  if (!visible || !receipt) return null;

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

  const activeData = details || receipt;
  const docAmount = activeData.amount ?? activeData.receivedAmount ?? receipt.amount ?? 0;
  const modeName = activeData.paymentModeName || activeData.paymentMode || receipt.paymentMode || 'NEFT';
  const refNo = activeData.referenceNumber || activeData.referenceNo || receipt.referenceNo || displayNo;
  const custName = activeData.customerName || activeData.leadName || receipt.customerName || 'N/A';
  const compName = activeData.companyName || receipt.companyName || '';
  const dateVal = activeData.receiptDate || receipt.receiptDate;
  const remarksVal = activeData.description || activeData.remarks || receipt.remarks;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalBox}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerTitleRow}>
              <View
                style={[
                  styles.typeBadge,
                  isOutgoing ? styles.typeBadgeOutgoing : styles.typeBadgeIncoming,
                ]}
              >
                <Ionicons
                  name={isOutgoing ? 'arrow-up-circle' : 'arrow-down-circle'}
                  size={14}
                  color={isOutgoing ? Colors.dangerDark : Colors.successDark}
                />
                <Text
                  style={[
                    styles.typeBadgeText,
                    { color: isOutgoing ? Colors.dangerDark : Colors.successDark },
                  ]}
                >
                  {isOutgoing ? 'Payment' : 'Receipt'}
                </Text>
              </View>
              <Text style={styles.headerTitle} numberOfLines={1}>
                #{displayNo}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={22} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Body Content */}
          <ScrollView
            style={styles.modalBody}
            contentContainerStyle={styles.modalScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* 1. Summary Card */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryHeaderRow}>
                <Ionicons
                  name={isOutgoing ? 'arrow-up-circle-outline' : 'receipt-outline'}
                  size={18}
                  color={Colors.primary}
                />
                <Text style={styles.summarySectionTitle}>
                  {isOutgoing ? 'Payment Summary' : 'Receipt Summary'}
                </Text>
              </View>

              <View style={styles.summaryGrid}>
                {/* Customer / Lead */}
                <View style={styles.gridItem}>
                  <Text style={styles.gridLabel}>Customer / Lead</Text>
                  <Text style={styles.gridValue} numberOfLines={2}>
                    {custName}
                  </Text>
                  {compName ? (
                    <Text style={styles.gridSubValue} numberOfLines={1}>
                      {compName}
                    </Text>
                  ) : null}
                </View>

                {/* Amount */}
                <View style={styles.gridItem}>
                  <Text style={styles.gridLabel}>Amount</Text>
                  <Text
                    style={[
                      styles.gridAmount,
                      { color: isOutgoing ? Colors.danger : Colors.success },
                    ]}
                  >
                    {isOutgoing ? `- ${formatCurrency(docAmount)}` : `+ ${formatCurrency(docAmount)}`}
                  </Text>
                </View>

                {/* Date */}
                <View style={styles.gridItem}>
                  <Text style={styles.gridLabel}>Date</Text>
                  <Text style={styles.gridValue}>{formatDate(dateVal)}</Text>
                </View>

                {/* Payment Mode */}
                <View style={styles.gridItem}>
                  <Text style={styles.gridLabel}>Payment Mode</Text>
                  <Text style={styles.gridValue}>{modeName}</Text>
                </View>

                {/* Reference Number */}
                <View style={styles.gridItem}>
                  <Text style={styles.gridLabel}>Reference No</Text>
                  <Text style={styles.gridValue}>{refNo}</Text>
                </View>

                {/* Status */}
                <View style={styles.gridItem}>
                  <Text style={styles.gridLabel}>Status</Text>
                  <View style={styles.statusPill}>
                    <Text style={styles.statusPillText}>{receipt.status || 'Confirmed'}</Text>
                  </View>
                </View>
              </View>

              {/* Remarks */}
              {remarksVal ? (
                <View style={styles.remarksBox}>
                  <Text style={styles.gridLabel}>Remark / Note:</Text>
                  <Text style={styles.remarksText}>{remarksVal}</Text>
                </View>
              ) : null}
            </View>

            {/* 2. Allocated Documents Section */}
            <View style={styles.docsSection}>
              <View style={styles.docsSectionHeader}>
                <Ionicons name="time-outline" size={17} color={Colors.primary} />
                <Text style={styles.docsSectionTitle}>
                  Allocated Documents ({documents.length})
                </Text>
              </View>

              {loading ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                  <Text style={styles.loadingText}>Loading allocated history...</Text>
                </View>
              ) : documents.length === 0 ? (
                <View style={styles.emptyDocsBox}>
                  <Ionicons name="document-text-outline" size={32} color="#cbd5e1" />
                  <Text style={styles.emptyDocsText}>
                    No documents allocated to this {isOutgoing ? 'payment' : 'receipt'}.
                  </Text>
                </View>
              ) : (
                <View style={styles.docsList}>
                  {documents.map((doc, idx) => {
                    const docCode =
                      doc.documentCode ||
                      doc.DocumentCode ||
                      doc.documentNumber ||
                      doc.documentName ||
                      `DOC-${doc.documentID || idx + 1}`;
                    const docType = doc.documentType || doc.DocumentType || 'Invoice';
                    const docDate = doc.documentDate || doc.DocumentDate;
                    const allocAmt =
                      doc.allocatedAmount ?? doc.AllocatedAmount ?? doc.appliedAmount ?? 0;
                    const pendAmt = doc.pendingAmount ?? doc.PendingAmount;

                    return (
                      <View key={String(doc.documentID || idx)} style={styles.docCard}>
                        <View style={styles.docCardTop}>
                          <View style={styles.docBadgeRow}>
                            <Ionicons name="document-text" size={14} color={Colors.primary} />
                            <Text style={styles.docCodeText}>{docCode}</Text>
                            <View style={styles.docTypeBadge}>
                              <Text style={styles.docTypeBadgeText}>{docType}</Text>
                            </View>
                          </View>

                          <Text style={styles.docAllocatedAmt}>
                            {formatCurrency(allocAmt)}
                          </Text>
                        </View>

                        <View style={styles.docCardBottom}>
                          <Text style={styles.docDateText}>
                            Date: {formatDate(docDate)}
                          </Text>
                          {pendAmt !== undefined && pendAmt !== null ? (
                            <Text style={styles.docPendingText}>
                              Pending: {formatCurrency(pendAmt)}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </ScrollView>

          {/* Footer Close Button */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.closeFooterBtn}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.closeFooterBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalBox: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeBadgeIncoming: {
    backgroundColor: '#e6f7e6',
  },
  typeBadgeOutgoing: {
    backgroundColor: '#fee2e2',
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
    flex: 1,
  },
  closeBtn: {
    padding: 4,
  },
  modalBody: {
    flexGrow: 1,
  },
  modalScrollContent: {
    padding: 16,
    gap: 16,
  },

  // Summary Card
  summaryCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  summaryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  summarySectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 12,
    columnGap: 16,
  },
  gridItem: {
    width: '45%',
    flexGrow: 1,
  },
  gridLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748b',
    marginBottom: 2,
  },
  gridValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
  },
  gridSubValue: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 1,
  },
  gridAmount: {
    fontSize: 15,
    fontWeight: '800',
  },
  statusPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0284c7',
  },
  remarksBox: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  remarksText: {
    fontSize: 12,
    color: '#334155',
    marginTop: 2,
  },

  // Allocated Documents
  docsSection: {
    gap: 10,
  },
  docsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  docsSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 24,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748b',
  },
  emptyDocsBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    gap: 6,
  },
  emptyDocsText: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
  },
  docsList: {
    gap: 8,
  },
  docCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 6,
  },
  docCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  docBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  docCodeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  docTypeBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  docTypeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
  },
  docAllocatedAmt: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  docCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  docDateText: {
    fontSize: 11,
    color: '#64748b',
  },
  docPendingText: {
    fontSize: 11,
    color: '#94a3b8',
  },

  // Footer
  modalFooter: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#ffffff',
    alignItems: 'flex-end',
  },
  closeFooterBtn: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  closeFooterBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
});
