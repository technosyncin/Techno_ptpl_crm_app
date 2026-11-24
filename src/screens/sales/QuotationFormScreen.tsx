import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,

} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Header } from '../../components/common/Header';
import { Input } from '../../components/common/Input';
import { MobileDropdown } from '../../components/common/MobileDropdown';
import { MobileDatePicker } from '../../components/common/MobileDatePicker';
import { Colors } from '../../theme/colors';
import { leadService, Lead } from '../../api/leadService';
import { quotationService } from '../../api/quotationService';
import { useAuth } from '../../context/AuthContext';
import { useCompany } from '../../context/CompanyContext';

interface QuotationItem {
  id: number;
  itemName: string;
  itemRemark: string;
  qty: number;
  rate: number;
  discount: number;
  discountAmount: number;
  amount: number;
}

interface QuotationFormScreenProps {
  navigation: any;
  route?: any;
}

export const QuotationFormScreen: React.FC<QuotationFormScreenProps> = ({
  navigation,
  route,
}) => {
  const editingQuotation = route?.params?.quotation || null;
  const { user } = useAuth();
  const { selectedCompanyId } = useCompany();

  const [saving, setSaving] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadLoading, setLeadLoading] = useState(false);

  const [leadID, setLeadID] = useState<number | null>(
    editingQuotation?.leadID ||
      editingQuotation?.LeadID ||
      editingQuotation?.leadId ||
      null
  );

  const [leadName, setLeadName] = useState(
    editingQuotation?.leadName ||
      editingQuotation?.lead_name ||
      editingQuotation?.customer ||
      editingQuotation?.customerName ||
      ''
  );

  useEffect(() => {
    const loadLeads = async () => {
      try {
        setLeadLoading(true);

        const data = await leadService.getLeadsForDropdown(
          selectedCompanyId ? Number(selectedCompanyId) : undefined
        );

        console.log('QUOTATION LEADS:', data);

        setLeads(data);

        if (editingQuotation) {
          const existingLeadId =
            editingQuotation?.leadID ||
            editingQuotation?.LeadID ||
            editingQuotation?.leadId;

          if (existingLeadId) {
            const selectedLead = data.find(
              lead => Number(lead.leadID) === Number(existingLeadId)
            );

            if (selectedLead) {
              setLeadID(selectedLead.leadID);
              setLeadName(selectedLead.leadName);
            }
          } else if (leadName) {
            const selectedLead = data.find(
              lead =>
                lead.leadName?.toLowerCase() ===
                String(leadName).toLowerCase()
            );

            if (selectedLead) {
              setLeadID(selectedLead.leadID);
              setLeadName(selectedLead.leadName);
            }
          }
        }
      } catch (error) {
        console.error('Error loading leads:', error);
        setLeads([]);
      } finally {
        setLeadLoading(false);
      }
    };

    loadLeads();
  }, [selectedCompanyId]);

  const [quotationDate, setQuotationDate] = useState(
    editingQuotation?.qtn_date ||
      editingQuotation?.quotation_date ||
      (editingQuotation?.quotationDate ? editingQuotation.quotationDate.split('T')[0] : '') ||
      new Date().toISOString().split('T')[0]
  );

  const [validTill, setValidTill] = useState(
    editingQuotation?.valid_till ||
      (editingQuotation?.validUntil ? editingQuotation.validUntil.split('T')[0] : '') ||
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]
  );

  const [quotationNo, setQuotationNo] = useState(
    editingQuotation?.qtn_no ||
      editingQuotation?.quotationNo ||
      editingQuotation?.documentReferenceNo ||
      ''
  );

  const [status, setStatus] = useState(
    editingQuotation?.status ? editingQuotation.status.toLowerCase() : 'open'
  );

  const [remark, setRemark] = useState(
    editingQuotation?.remark || editingQuotation?.remarks || ''
  );

  const [billDiscountPercent, setBillDiscountPercent] = useState(
    String(editingQuotation?.bill_discount_percent ?? editingQuotation?.billDiscountPercent ?? '')
  );

  const [billDiscount, setBillDiscount] = useState(
    String(editingQuotation?.bill_discount ?? editingQuotation?.billDiscount ?? '')
  );

  const [roundOff, setRoundOff] = useState(
    Number(editingQuotation?.roundOff || 0)
  );

  const [items, setItems] = useState<QuotationItem[]>(() => {
    const rawItems = editingQuotation?.items || (editingQuotation as any)?.Items;
    if (rawItems && rawItems.length > 0) {
      return rawItems.map((it: any, idx: number) => ({
        id: it.id || idx + 1,
        itemName: it.item_name || it.itemName || '',
        itemRemark: it.item_remark || it.itemRemark || '',
        qty: Number(it.qty) || 1,
        rate: Number(it.rate) || 0,
        discount: Number(it.discount) || 0,
        discountAmount: Number(it.discount_amount || it.discountAmount) || 0,
        amount: Number(it.amount) || 0,
      }));
    }
    return [
      {
        id: 1,
        itemName: '',
        itemRemark: '',
        qty: 1,
        rate: 0,
        discount: 0,
        discountAmount: 0,
        amount: 0,
      },
    ];
  });

  // Load fresh quotation by ID if editing
  useEffect(() => {
    const qId = editingQuotation?.quotationId || editingQuotation?.quotationID || editingQuotation?.id;
    if (!qId) return;

    let isMounted = true;
    quotationService.getQuotationById(Number(qId)).then((res) => {
      if (!isMounted || !res) return;
      const data = res.data || res;
      if (data) {
        if (data.leadID || data.LeadID) setLeadID(Number(data.leadID || data.LeadID));
        if (data.leadName || data.customerName || data.customer) {
          setLeadName(data.leadName || data.customerName || data.customer);
        }
        if (data.documentReferenceNo || data.qtn_no || data.quotationNo) {
          setQuotationNo(data.documentReferenceNo || data.qtn_no || data.quotationNo);
        }
        if (data.documentDate || data.qtn_date || data.quotationDate) {
          const d = data.documentDate || data.qtn_date || data.quotationDate;
          setQuotationDate(d.split('T')[0]);
        }
        if (data.valid_till || data.validUntil) {
          const d = data.valid_till || data.validUntil;
          setValidTill(d.split('T')[0]);
        }
        if (data.status) setStatus(data.status.toLowerCase());
        if (data.remark != null || data.remarks != null) setRemark(data.remark || data.remarks || '');
        if (data.bill_discount_percent != null || data.billDiscountPercent != null) {
          setBillDiscountPercent(String(data.bill_discount_percent ?? data.billDiscountPercent ?? ''));
        }
        if (data.bill_discount != null || data.billDiscount != null) {
          setBillDiscount(String(data.bill_discount ?? data.billDiscount ?? ''));
        }
        const freshItems = data.items || data.Items;
        if (Array.isArray(freshItems) && freshItems.length > 0) {
          setItems(
            freshItems.map((it: any, idx: number) => ({
              id: it.id || idx + 1,
              itemName: it.item_name || it.itemName || '',
              itemRemark: it.item_remark || it.itemRemark || '',
              qty: Number(it.qty) || 1,
              rate: Number(it.rate) || 0,
              discount: Number(it.discount) || 0,
              discountAmount: Number(it.discount_amount || it.discountAmount) || 0,
              amount: Number(it.amount) || 0,
            }))
          );
        }
      }
    }).catch((e) => {
      console.warn('Error fetching fresh quotation by id:', e);
    });

    return () => {
      isMounted = false;
    };
  }, [editingQuotation]);

  const calculateItem = (
    item: QuotationItem,
    field: keyof QuotationItem,
    value: any
  ): QuotationItem => {
    const updated = {
      ...item,
      [field]: value,
    };

    const qty = Number(updated.qty) || 0;
    const rate = Number(updated.rate) || 0;
    const discount = Number(updated.discount) || 0;

    const itemTotal = qty * rate;

    const discountAmount =
      field === 'discountAmount'
        ? Number(value) || 0
        : (itemTotal * discount) / 100;

    updated.discountAmount = Number(discountAmount.toFixed(2));
    updated.amount = Number(
      (itemTotal - discountAmount).toFixed(2)
    );

    if (field === 'discountAmount' && itemTotal > 0) {
      updated.discount = Number(
        ((discountAmount / itemTotal) * 100).toFixed(2)
      );
    }

    return updated;
  };

  const updateItem = (
    id: number,
    field: keyof QuotationItem,
    value: any
  ) => {
    setItems(prev =>
      prev.map(item =>
        item.id === id
          ? calculateItem(item, field, value)
          : item
      )
    );
  };

  const addItem = () => {
    setItems(prev => [
      ...prev,
      {
        id: Date.now(),
        itemName: '',
        itemRemark: '',
        qty: 1,
        rate: 0,
        discount: 0,
        discountAmount: 0,
        amount: 0,
      },
    ]);
  };

  const removeItem = (id: number) => {
    if (items.length === 1) {
      Alert.alert('Item Required', 'At least one item is required.');
      return;
    }

    setItems(prev => prev.filter(item => item.id !== id));
  };

  const totals = useMemo(() => {
    const subTotal = items.reduce(
      (sum, item) => sum + Number(item.qty || 0) * Number(item.rate || 0),
      0
    );

    const itemDiscount = items.reduce(
      (sum, item) => sum + Number(item.discountAmount || 0),
      0
    );

    const taxableAmount = subTotal - itemDiscount;

    const billDiscountAmount = Number(billDiscount) || 0;

    const netAmount = taxableAmount - billDiscountAmount;

    const autoRoundOff = Math.round(netAmount) - netAmount;

    const finalRoundOff = Number(roundOff) || autoRoundOff;

    const total =
      Math.round((netAmount + finalRoundOff) * 100) / 100;

    return {
      subTotal,
      itemDiscount,
      billDiscount: billDiscountAmount,
      roundOff: finalRoundOff,
      total,
    };
  }, [items, billDiscount, roundOff]);

  const handleBillDiscountPercent = (value: string) => {
    setBillDiscountPercent(value);

    const percentage = Number(value) || 0;

    const taxableAmount =
      totals.subTotal - totals.itemDiscount;

    const amount =
      taxableAmount > 0
        ? (taxableAmount * percentage) / 100
        : 0;

    setBillDiscount(amount.toFixed(2));
  };

  const handleBillDiscountAmount = (value: string) => {
    setBillDiscount(value);

    const amount = Number(value) || 0;

    const taxableAmount =
      totals.subTotal - totals.itemDiscount;

    const percentage =
      taxableAmount > 0
        ? (amount / taxableAmount) * 100
        : 0;

    setBillDiscountPercent(
      percentage ? percentage.toFixed(2) : '0'
    );
  };

  const handleSave = async () => {
    if (!leadID) {
      Alert.alert('Validation', 'Please select Lead Name.');
      return;
    }

    if (!leadName.trim()) {
      Alert.alert('Validation', 'Lead Name is required.');
      return;
    }

    if (!quotationDate) {
      Alert.alert('Validation', 'Quotation Date is required.');
      return;
    }

    if (!validTill) {
      Alert.alert('Validation', 'Valid Till is required.');
      return;
    }

    for (const item of items) {
      if (!item.itemName.trim()) {
        Alert.alert(
          'Validation',
          'Item Name is required for all items.'
        );
        return;
      }

      if (item.qty <= 0) {
        Alert.alert(
          'Validation',
          'Quantity must be greater than 0.'
        );
        return;
      }

      if (item.rate <= 0) {
        Alert.alert(
          'Validation',
          'Rate must be greater than 0.'
        );
        return;
      }
    }

    setSaving(true);
    try {
      const activeCompanyId = selectedCompanyId || (user?.defaultCompanyId ? Number(user.defaultCompanyId) : 1);
      const payload: any = {
        DocTypeID: 1,
        documentTypeID: 1,
        documentType: 'Quotation',
        LeadID: leadID || 0,
        LeadName: leadName,
        lead_name: leadName,
        customer: leadName,
        DocumentReferenceNo: quotationNo.trim() || undefined,
        qtn_no: quotationNo.trim() || undefined,
        DocumentDate: quotationDate,
        qtn_date: quotationDate,
        quotation_date: quotationDate,
        valid_till: validTill,
        DocumentAmount: totals.total,
        total_amount: totals.total,
        sub_total: totals.subTotal,
        qtn_amt: totals.total,
        discount: totals.itemDiscount,
        bill_discount: totals.billDiscount,
        bill_discount_percent: Number(billDiscountPercent) || 0,
        Status: status,
        Remark: remark,
        CompanyID: activeCompanyId,
        CreatedByID: user?.userID || user?.id || 1,
        Items: items.map(item => ({
          item_name: item.itemName,
          item_remark: item.itemRemark || '',
          qty: item.qty,
          rate: item.rate,
          discount: item.discount || 0,
          amount: item.amount,
          discount_amount: item.discountAmount || 0,
          bill_discount: totals.billDiscount || 0,
          bill_discount_percent: Number(billDiscountPercent) || 0,
          LeadID: leadID || 0,
          LeadName: leadName,
          CompanyID: activeCompanyId,
        })),
      };

      const qId = editingQuotation?.quotationId || editingQuotation?.quotationID || editingQuotation?.id;
      if (qId) {
        await quotationService.updateQuotation(Number(qId), payload);
        Alert.alert('Success', 'Quotation updated successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        await quotationService.createQuotation(payload);
        Alert.alert('Success', 'Quotation created successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (err: any) {
      console.error('Error saving quotation:', err);
      const errorMsg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'Failed to save quotation. Please try again.';
      Alert.alert('Save Failed', errorMsg);
    } finally {
      setSaving(false);
    }
  };

  return (
  <KeyboardAvoidingView
    style={styles.container}
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  >
      <Header
        title={editingQuotation ? 'Edit Quotation' : 'Create Quotation'}
        showBack={true}
        onBack={() => navigation.goBack()}
      />

      <ScrollView
      style={styles.scrollView}
      showsVerticalScrollIndicator={true}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      nestedScrollEnabled={true}
      automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
    >
        {/* BASIC INFORMATION - Card matching Web CRM */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="document-text-outline" size={18} color={Colors.primary} />
            <Text style={styles.sectionTitle}>
              {editingQuotation ? 'Edit Quotation' : 'Create Quotation'}
            </Text>
          </View>

          <MobileDropdown
            label="Lead Name"
            selectedValue={leadID}
            options={leads.map(lead => ({
              label: lead.leadName + (lead.companyName ? ` (${lead.companyName})` : ''),
              value: lead.leadID,
              subtitle: lead.companyName,
            }))}
            onSelect={value => {
              const selectedLead = leads.find(
                lead => lead.leadID === Number(value)
              );

              if (selectedLead) {
                setLeadID(selectedLead.leadID);
                setLeadName(selectedLead.leadName);
              }
            }}
            placeholder="Search and select lead"
            loading={leadLoading}
            searchable
            searchPlaceholder="Search and select lead"
            required
          />

          <MobileDatePicker
            label="Quotation Date"
            value={quotationDate}
            onChangeDate={setQuotationDate}
            required
          />

          <MobileDatePicker
            label="Valid Till"
            value={validTill}
            onChangeDate={setValidTill}
            required
          />

        </View>

        {/* ITEMS - Matching Web CRM */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={styles.cardHeaderLeft}>
              <Ionicons name="list-outline" size={18} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Quotation Items</Text>
            </View>

            <TouchableOpacity
              style={styles.addItemButton}
              onPress={addItem}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle-outline" size={17} color="#fff" />
              <Text style={styles.addItemText}>Add Item</Text>
            </TouchableOpacity>
          </View>

          {items.map((item, index) => (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <View style={styles.itemNumber}>
                  <Text style={styles.itemNumberText}>
                    {index + 1}
                  </Text>
                </View>

                <Text style={styles.itemTitle}>
                  Item {index + 1}
                </Text>

                <TouchableOpacity
                  onPress={() => removeItem(item.id)}
                  disabled={items.length <= 1}
                  style={{ opacity: items.length <= 1 ? 0.3 : 1 }}
                >
                  <Ionicons
                    name="trash-outline"
                    size={20}
                    color={Colors.danger}
                  />
                </TouchableOpacity>
              </View>

              <Input
                label="Item Name"
                value={item.itemName}
                onChangeText={value =>
                  updateItem(item.id, 'itemName', value)
                }
                placeholder="Enter Item Name"
                required
              />

              <Input
                label="Item Remark"
                value={item.itemRemark}
                onChangeText={value =>
                  updateItem(item.id, 'itemRemark', value)
                }
                placeholder="Item Remark"
              />

              <View style={styles.twoColumn}>
                <View style={styles.half}>
                  <Input
                    label="Qty"
                    value={String(item.qty)}
                    onChangeText={value =>
                      updateItem(
                        item.id,
                        'qty',
                        Number(value) || 0
                      )
                    }
                    keyboardType="numeric"
                    placeholder="1"
                    required
                  />
                </View>

                <View style={styles.half}>
                  <Input
                    label="Rate (₹)"
                    value={String(item.rate)}
                    onChangeText={value =>
                      updateItem(
                        item.id,
                        'rate',
                        Number(value) || 0
                      )
                    }
                    keyboardType="decimal-pad"
                    placeholder="0"
                    required
                  />
                </View>
              </View>

              <View style={styles.twoColumn}>
                <View style={styles.half}>
                  <Input
                    label="Discount (%)"
                    value={String(item.discount ?? '')}
                    onChangeText={value =>
                      updateItem(
                        item.id,
                        'discount',
                        value
                      )
                    }
                    keyboardType="decimal-pad"
                    placeholder="0"
                  />
                </View>

                <View style={styles.half}>
                  <Input
                    label="Discount Amt (₹)"
                    value={String(item.discountAmount ?? '')}
                    onChangeText={value =>
                      updateItem(
                        item.id,
                        'discountAmount',
                        value
                      )
                    }
                    keyboardType="decimal-pad"
                    placeholder="0"
                  />
                </View>
              </View>

              <View style={styles.amountRow}>
                <Text style={styles.amountLabel}>
                  Amount (₹):
                </Text>

                <Text style={styles.amountValue}>
                  ₹ {item.amount.toFixed(2)}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* SUMMARY - Matching Web CRM */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="calculator-outline" size={18} color={Colors.primary} />
            <Text style={styles.sectionTitle}>
              Quotation Summary
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              Sub Total:
            </Text>

            <Text style={styles.summaryValue}>
              ₹ {totals.subTotal.toFixed(2)}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              Item Discount:
            </Text>

            <Text style={styles.discountValue}>
              - ₹ {totals.itemDiscount.toFixed(2)}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              Bill Discount:
            </Text>

            <View style={styles.discountInputs}>
              <View style={styles.discountInput}>
                <Input
                  value={billDiscountPercent}
                  onChangeText={handleBillDiscountPercent}
                  placeholder="%"
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.discountInput}>
                <Input
                  value={billDiscount}
                  onChangeText={handleBillDiscountAmount}
                  placeholder="₹"
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              Round Off:
            </Text>

            <View style={styles.roundInput}>
              <Input
                value={String(totals.roundOff)}
                onChangeText={value =>
                  setRoundOff(Number(value) || 0)
                }
                placeholder="₹ 0.00"
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>
              Total Amount (₹):
            </Text>

            <Text style={styles.totalValue}>
              ₹ {totals.total.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* ACTION BUTTONS */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelText}>
              Cancel
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.saveButton, saving && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={19}
                  color="#fff"
                />

                <Text style={styles.saveText}>
                  {editingQuotation
                    ? 'Update Quotation'
                    : 'Save Quotation'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
     </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
  flex: 1,
},

 content: {
  flexGrow: 1,
  padding: 16,
  paddingBottom: 180,
},

  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1.5,
    borderBottomColor: Colors.primary + '20',
  },

  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.slate800,
  },

  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },

  addItemText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },

  itemCard: {
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },

  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  itemNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },

  itemNumberText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },

  itemTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: Colors.slate800,
  },

  twoColumn: {
    flexDirection: 'row',
    gap: 10,
  },

  half: {
    flex: 1,
  },

  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 10,
    marginTop: 4,
  },

  amountLabel: {
    fontSize: 13,
    color: Colors.slate600,
    fontWeight: '600',
  },

  amountValue: {
    fontSize: 14,
    color: Colors.slate900,
    fontWeight: '700',
  },

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },

  summaryLabel: {
    fontSize: 13,
    color: Colors.slate700,
    fontWeight: '600',
  },

  summaryValue: {
    fontSize: 14,
    color: Colors.slate900,
    fontWeight: '600',
  },

  discountValue: {
    fontSize: 14,
    color: Colors.danger,
    fontWeight: '600',
  },

  discountInputs: {
    flexDirection: 'row',
    gap: 8,
    width: 170,
  },

  discountInput: {
    flex: 1,
  },

  roundInput: {
    width: 100,
  },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: Colors.primary,
  },

  totalLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.primary,
  },

  totalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary,
  },

  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },

  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 9,
    backgroundColor: Colors.slate500,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cancelText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },

  saveButton: {
    flex: 1.5,
    height: 48,
    borderRadius: 9,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },

  saveText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});