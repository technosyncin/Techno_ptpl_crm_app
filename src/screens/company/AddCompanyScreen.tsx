import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/common/Header';
import { Input } from '../../components/common/Input';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import { companyService, CreateCompanyPayload } from '../../api/companyService';
import { useCompany } from '../../context/CompanyContext';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../theme/colors';
import {
  toTitleCase,
  INDIAN_STATES,
  validateGST,
  validatePAN,
  extractPanFromGst,
  EMAIL_REGEX,
} from '../../utils/formUtils';

interface AddCompanyScreenProps {
  navigation: any;
  route?: any;
}

const STATUS_OPTIONS = [
  { label: 'Active', value: 'active', icon: 'checkmark-circle-outline' as const, color: Colors.success },
  { label: 'Inactive', value: 'inactive', icon: 'close-circle-outline' as const, color: Colors.danger },
];

export const AddCompanyScreen: React.FC<AddCompanyScreenProps> = ({ navigation, route }) => {
  const { refreshCompanies, setSelectedCompanyId } = useCompany();
  const { user } = useAuth();
  const editingCompany = route?.params?.company;
  const isEditing = Boolean(editingCompany && (editingCompany.companyID || editingCompany.id));
  const editId = editingCompany?.companyID || editingCompany?.id;

  // Form Fields matching Web company.jsx
  const [companyName, setCompanyName] = useState(editingCompany?.companyName || '');
  const [companyCode, setCompanyCode] = useState(editingCompany?.companyCode || editingCompany?.code || '');
  const [email, setEmail] = useState(editingCompany?.email || '');
  const [mobileNo, setMobileNo] = useState(editingCompany?.phone || editingCompany?.mobileNo || '');
  const [alternateNo, setAlternateNo] = useState(editingCompany?.alternateNo || '');
  const [website, setWebsite] = useState(editingCompany?.website || '');
  const [gstNo, setGstNo] = useState(editingCompany?.gstNo || '');
  const [panNo, setPanNo] = useState(editingCompany?.panNo || '');
  const [addressLine1, setAddressLine1] = useState(editingCompany?.addressLine1 || editingCompany?.address || '');
  const [city, setCity] = useState(editingCompany?.city || '');
  const [state, setState] = useState(editingCompany?.state || '');
  const [pincode, setPincode] = useState(editingCompany?.pincode || '');
  const [status, setStatus] = useState<'active' | 'inactive'>(
    editingCompany?.status?.toLowerCase() === 'inactive' ? 'inactive' : 'active'
  );

  // UI state & Modals matching AddUserScreen
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [stateModalVisible, setStateModalVisible] = useState(false);
  const [stateSearch, setStateSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Populate when editingCompany changes
  useEffect(() => {
    if (editingCompany) {
      setCompanyName(editingCompany.companyName || '');
      setCompanyCode(editingCompany.companyCode || editingCompany.code || '');
      setEmail(editingCompany.email || '');
      setMobileNo(editingCompany.phone || editingCompany.mobileNo || '');
      setAlternateNo(editingCompany.alternateNo || '');
      setWebsite(editingCompany.website || '');
      setGstNo(editingCompany.gstNo || '');
      setPanNo(editingCompany.panNo || '');
      setAddressLine1(editingCompany.addressLine1 || editingCompany.address || '');
      setCity(editingCompany.city || '');
      setState(editingCompany.state || '');
      setPincode(editingCompany.pincode || '');
      setStatus(editingCompany.status?.toLowerCase() === 'inactive' ? 'inactive' : 'active');
    }
  }, [editingCompany]);

  // Handle GST input with auto PAN extraction (exact web logic)
  const handleGstChange = (text: string) => {
    const clean = text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15);
    setGstNo(clean);

    if (errors.gstNo) {
      setErrors((prev) => ({ ...prev, gstNo: '' }));
    }

    // Auto-fill PAN if GST has 15 chars and PAN is empty
    if (clean.length === 15 && (!panNo || panNo.trim() === '')) {
      const autoPan = extractPanFromGst(clean);
      if (autoPan) {
        setPanNo(autoPan);
        if (errors.panNo) {
          setErrors((prev) => ({ ...prev, panNo: '' }));
        }
      }
    }
  };

  // Handle PAN input (exact web logic)
  const handlePanChange = (text: string) => {
    const clean = text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
    setPanNo(clean);
    if (errors.panNo) {
      setErrors((prev) => ({ ...prev, panNo: '' }));
    }
  };

  // Reset form fields (exact web resetFormFields logic)
  const handleReset = () => {
    Alert.alert('Reset Form', 'Are you sure you want to clear all fields?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: () => {
          setCompanyName('');
          setCompanyCode('');
          setEmail('');
          setMobileNo('');
          setAlternateNo('');
          setWebsite('');
          setGstNo('');
          setPanNo('');
          setAddressLine1('');
          setCity('');
          setState('');
          setPincode('');
          setStatus('active');
          setErrors({});
        },
      },
    ]);
  };

  // Validate form fields matching web company.jsx rules
  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!companyName.trim()) {
      errs.companyName = 'Company Name is required';
    }

    if (!mobileNo.trim()) {
      errs.mobileNo = 'Mobile Number is required';
    } else if (mobileNo.trim().length !== 10) {
      errs.mobileNo = 'Mobile number must be exactly 10 digits';
    }

    if (alternateNo.trim() && alternateNo.trim().length !== 10) {
      errs.alternateNo = 'Alternate number must be exactly 10 digits';
    }

    if (email.trim() && !EMAIL_REGEX.test(email.trim())) {
      errs.email = 'Please enter a valid email address';
    }

    // Web GST Validation
    if (gstNo.trim()) {
      const gstCheck = validateGST(gstNo);
      if (!gstCheck.isValid) {
        errs.gstNo = gstCheck.message || 'Invalid GST number format (e.g. 27ABCDE1234F1Z5)';
      }
    }

    // Web PAN Validation
    if (panNo.trim()) {
      const panCheck = validatePAN(panNo);
      if (!panCheck.isValid) {
        errs.panNo = panCheck.message || 'Invalid PAN format (e.g. ABCDE1234F)';
      }
    }

    if (pincode.trim() && pincode.trim().length !== 6) {
      errs.pincode = 'Pincode must be exactly 6 digits';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Handle Save / Submit
  const handleSubmit = async () => {
    if (!validate()) {
      Alert.alert('Validation Error', 'Please check the highlighted fields before submitting.');
      return;
    }

    setSaving(true);
    try {
      const code = companyCode.trim() || (isEditing && editingCompany?.companyCode ? editingCompany.companyCode : 'COMP' + Date.now());

      const payload: CreateCompanyPayload = {
        companyName: companyName.trim(),
        companyCode: code,
        email: email.trim() || undefined,
        mobileNo: mobileNo.trim() || undefined,
        alternateNo: alternateNo.trim() || undefined,
        website: website.trim() || undefined,
        gstNo: gstNo.trim().toUpperCase() || undefined,
        panNo: panNo.trim().toUpperCase() || undefined,
        addressLine1: addressLine1.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        pincode: pincode.trim() || undefined,
        country: 'India',
        status,
      };

      if (isEditing && editId) {
        await companyService.updateCompany(editId, payload);
        await refreshCompanies();

        setSuccessMessage(`Company "${companyName}" updated successfully!`);
        setSuccessModalVisible(true);
        setTimeout(() => {
          setSuccessModalVisible(false);
          navigation.goBack();
        }, 2000);
      } else {
        const res = await companyService.createCompany(payload);
        await refreshCompanies();

        if (res.companyId) {
          await setSelectedCompanyId(res.companyId);
        }

        setSuccessMessage(`Company "${companyName}" created successfully!`);
        setSuccessModalVisible(true);
        setTimeout(() => {
          setSuccessModalVisible(false);
          navigation.goBack();
        }, 2000);
      }
    } catch (err: any) {
      console.error('--- COMPANY SAVE FAILED ---', err);
      const errMsg =
        err?.response?.data?.message ||
        err?.response?.data?.title ||
        err?.message ||
        'Could not save company. Please try again.';
      Alert.alert('Save Failed', errMsg);
    } finally {
      setSaving(false);
    }
  };

  // Handle Delete (matching web handleDelete)
  const handleDeleteCompany = async () => {
    if (!editId) return;
    setDeleting(true);
    try {
      await companyService.deleteCompany(editId);
      await refreshCompanies();
      setDeleteModalVisible(false);

      Alert.alert('Success', 'Company deleted successfully!', [
        { text: 'OK', onPress: () => navigation.navigate('CompaniesList') },
      ]);
    } catch (err: any) {
      console.error('Delete company error:', err);
      let errMsg = 'Failed to delete company.';
      if (err?.response?.status === 400 && err?.response?.data?.message?.includes('used in Leads')) {
        errMsg = 'Cannot delete this company because it is linked to existing leads or transactions.';
      } else if (err?.response?.data?.message) {
        errMsg = err.response.data.message;
      }
      Alert.alert('Delete Failed', errMsg);
    } finally {
      setDeleting(false);
    }
  };

  const filteredStates = INDIAN_STATES.filter((s) =>
    s.toLowerCase().includes(stateSearch.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <Header
        showBack={false}
        navigation={navigation}
      />

      <KeyboardAvoidingView
        style={styles.flexOne}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
        style={styles.flexOne}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={true}
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
      >
                {/* SECTION 1: Company Details */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconWrap}>
                <Ionicons name="business" size={18} color={Colors.primary} />
              </View>
              <Text style={styles.sectionTitle}>Company Details</Text>
            </View>

            {/* Field 1: Company Name (1 row) */}
            <Input
              label="Company Name"
              required
              placeholder="e.g. Acme Corporation Pvt Ltd"
              value={companyName}
              onChangeText={(text) => {
                setCompanyName(toTitleCase(text));
                if (errors.companyName) setErrors((prev) => ({ ...prev, companyName: '' }));
              }}
              error={errors.companyName}
              leftIcon="business-outline"
            />

            {/* Field 2: Mobile Number (1 row) */}
            <Input
              label="Mobile Number"
              required
              placeholder="10-digit mobile number"
              keyboardType="numeric"
              maxLength={10}
              value={mobileNo}
              onChangeText={(text) => {
                const cleaned = text.replace(/[^0-9]/g, '').slice(0, 10);
                setMobileNo(cleaned);
                if (errors.mobileNo) setErrors((prev) => ({ ...prev, mobileNo: '' }));
              }}
              error={errors.mobileNo}
              leftIcon="call-outline"
            />

            {/* Field 3: Alternate Number (1 row) */}
            <Input
              label="Alternate Number"
              placeholder="10-digit alternate number"
              keyboardType="numeric"
              maxLength={10}
              value={alternateNo}
              onChangeText={(text) => {
                const cleaned = text.replace(/[^0-9]/g, '').slice(0, 10);
                setAlternateNo(cleaned);
                if (errors.alternateNo) setErrors((prev) => ({ ...prev, alternateNo: '' }));
              }}
              error={errors.alternateNo}
              leftIcon="call-outline"
            />

            {/* Field 4: Email Address (1 row) */}
            <Input
              label="Email Address"
              placeholder="company@domain.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
              }}
              error={errors.email}
              leftIcon="mail-outline"
            />

            {/* Field 5: Website (1 row) */}
            <Input
              label="Website"
              placeholder="https://www.company.com"
              autoCapitalize="none"
              value={website}
              onChangeText={setWebsite}
              leftIcon="globe-outline"
            />

            {/* Field 6: GST No (1 row) */}
            <View style={styles.fieldWrapper}>
              <Input
                label="GST No"
                placeholder="27ABCDE1234F1Z5 (15 chars)"
                autoCapitalize="characters"
                maxLength={15}
                value={gstNo}
                onChangeText={handleGstChange}
                error={errors.gstNo}
                leftIcon="document-text-outline"
              />
              {gstNo.length > 0 && gstNo.length < 15 && (
                <View style={styles.fieldHintBox}>
                  <Ionicons name="information-circle-outline" size={13} color="#e11d48" />
                  <Text style={styles.fieldHintText}>
                    GST must be 15 characters ({15 - gstNo.length} more required)
                  </Text>
                </View>
              )}
            </View>

            {/* Field 7: PAN No (1 row) */}
            <View style={styles.fieldWrapper}>
              <Input
                label="PAN No"
                placeholder="ABCDE1234F (10 chars)"
                autoCapitalize="characters"
                maxLength={10}
                value={panNo}
                onChangeText={handlePanChange}
                error={errors.panNo}
                leftIcon="card-outline"
              />
              {panNo.length > 0 && panNo.length < 10 && (
                <View style={styles.fieldHintBox}>
                  <Ionicons name="information-circle-outline" size={13} color="#e11d48" />
                  <Text style={styles.fieldHintText}>
                    PAN must be 10 characters ({10 - panNo.length} more required)
                  </Text>
                </View>
              )}
            </View>

            {/* Field 8: Status Dropdown (User Master pickerSelector style, 1 row) */}
            <Text style={styles.fieldLabel}>
              Company Status <Text style={styles.requiredAsterisk}>*</Text>
            </Text>
            <TouchableOpacity
              style={styles.pickerSelector}
              onPress={() => setStatusModalVisible(true)}
              activeOpacity={0.7}
            >
              <View style={styles.pickerRow}>
                <Ionicons
                  name={status === 'active' ? 'checkmark-circle' : 'close-circle'}
                  size={18}
                  color={status === 'active' ? Colors.success : Colors.danger}
                />
                <Text style={styles.pickerSelectorText}>
                  {status === 'active' ? 'Active' : 'Inactive'}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={16} color={Colors.slate400} />
            </TouchableOpacity>
          </View>

          {/* SECTION 3: Address Information (Exact Web Form fields: Street Name, City, State, Pincode) */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconWrap}>
                <Ionicons name="location" size={18} color={Colors.primary} />
              </View>
              <Text style={styles.sectionTitle}>Address Information</Text>
            </View>

            {/* Field: Street Name (1 row) */}
            <Input
              label="Street Name"
              placeholder="Enter Street Name"
              value={addressLine1}
              onChangeText={(text) => setAddressLine1(toTitleCase(text))}
              leftIcon="navigate-outline"
            />

            {/* Field: City (1 row) */}
            <Input
              label="City"
              placeholder="Enter City"
              value={city}
              onChangeText={(text) => setCity(toTitleCase(text))}
              leftIcon="business-outline"
            />

            {/* Field: State Dropdown (1 row) */}
            <Text style={styles.fieldLabel}>State</Text>
            <TouchableOpacity
              style={styles.pickerSelector}
              onPress={() => setStateModalVisible(true)}
              activeOpacity={0.7}
            >
              <View style={styles.pickerRow}>
                <Ionicons name="map-outline" size={18} color={Colors.primary} />
                <Text
                  style={state ? styles.pickerSelectorText : styles.pickerSelectorPlaceholder}
                  numberOfLines={1}
                >
                  {state || 'Select State'}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={16} color={Colors.slate400} />
            </TouchableOpacity>

            {/* Field: Pincode (1 row) */}
            <Input
              label="Pincode"
              placeholder="Enter Pincode"
              keyboardType="numeric"
              maxLength={6}
              value={pincode}
              onChangeText={(text) => {
                const cleaned = text.replace(/[^0-9]/g, '').slice(0, 6);
                setPincode(cleaned);
                if (errors.pincode) setErrors((prev) => ({ ...prev, pincode: '' }));
              }}
              error={errors.pincode}
              leftIcon="mail-outline"
            />
          </View>

          {/* Action Buttons - Reset & Save */}
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              style={styles.resetButton}
              onPress={handleReset}
              activeOpacity={0.7}
              disabled={saving}
            >
              <Ionicons name="refresh-outline" size={18} color={Colors.slate600} />
              <Text style={styles.resetButtonText}>Reset</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}
              activeOpacity={0.8}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={Colors.textInverse} size="small" />
              ) : (
                <>
                  <Ionicons
                    name={isEditing ? 'checkmark-done' : 'save-outline'}
                    size={20}
                    color={Colors.textInverse}
                  />
                  <Text style={styles.submitButtonText}>
                    {isEditing ? 'Update' : 'Save'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Delete Button (If Editing) */}
          {isEditing && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => setDeleteModalVisible(true)}
              activeOpacity={0.75}
            >
              <Ionicons name="trash-outline" size={18} color={Colors.danger} />
              <Text style={styles.deleteButtonText}>Delete Company</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Status Picker Modal (User Master Modal Style) */}
      <Modal
        visible={statusModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setStatusModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Company Status</Text>
              <TouchableOpacity onPress={() => setStatusModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.slate600} />
              </TouchableOpacity>
            </View>

            {STATUS_OPTIONS.map((item) => (
              <TouchableOpacity
                key={item.value}
                style={[styles.modalItem, status === item.value && styles.modalItemActive]}
                onPress={() => {
                  setStatus(item.value as 'active' | 'inactive');
                  setStatusModalVisible(false);
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Ionicons name={item.icon} size={20} color={item.color} />
                  <Text style={[styles.modalItemText, status === item.value && styles.modalItemTextActive]}>
                    {item.label}
                  </Text>
                </View>
                {status === item.value && (
                  <Ionicons name="checkmark" size={18} color={Colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* State Picker Modal (User Master Modal Style) */}
      <Modal
        visible={stateModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setStateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select State</Text>
              <TouchableOpacity onPress={() => setStateModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.slate600} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalSearchBox}>
              <Ionicons name="search" size={18} color={Colors.slate400} />
              <Input
                placeholder="Search state..."
                value={stateSearch}
                onChangeText={setStateSearch}
                containerStyle={styles.modalSearchContainer}
                style={styles.modalSearchInput}
              />
            </View>

            <FlatList
              data={filteredStates}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, state === item && styles.modalItemActive]}
                  onPress={() => {
                    setState(item);
                    setStateModalVisible(false);
                    setStateSearch('');
                  }}
                >
                  <Text style={[styles.modalItemText, state === item && styles.modalItemTextActive]}>
                    {item}
                  </Text>
                  {state === item && (
                    <Ionicons name="checkmark" size={18} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        visible={deleteModalVisible}
        title="Delete Company"
        message={`Are you sure you want to delete "${companyName}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        isDestructive
        loading={deleting}
        icon="trash"
        onConfirm={handleDeleteCompany}
        onCancel={() => setDeleteModalVisible(false)}
      />

      {/* Auto-dismissing Success Modal (auto closes after 2 seconds) */}
      <Modal
        visible={successModalVisible}
        transparent
        animationType="fade"
      >
        <View style={styles.successBackdrop}>
          <View style={styles.successModalCard}>
            <View style={styles.successIconCircle}>
              <Ionicons name="checkmark" size={32} color="#ffffff" />
            </View>
            <Text style={styles.successTitle}>Saved Successfully</Text>
            <Text style={styles.successSubtitle}>{successMessage}</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  successBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  successModalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    minWidth: 260,
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  successIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.slate900,
    marginBottom: 6,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 13,
    color: Colors.slate500,
    textAlign: 'center',
    lineHeight: 18,
  },
  flexOne: {
    flex: 1,
  },
 scrollContent: {
  flexGrow: 1,
  padding: 16,
  paddingBottom: 180,
},
  // Exact User Master Section Card Design
  sectionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.primaryMuted || '#f5f3ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  fieldWrapper: {
    marginBottom: 0,
  },
  fieldHintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: -8,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  fieldHintText: {
    fontSize: 11,
    color: '#e11d48',
    fontWeight: '500',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 6,
  },
  requiredAsterisk: {
    color: Colors.error,
  },
  // User Master Picker Selector Style
  pickerSelector: {
    height: 48,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  pickerSelectorText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
  },
  pickerSelectorPlaceholder: {
    fontSize: 14,
    color: Colors.slate400,
  },
  // Exact User Master Action Buttons
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  resetButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    gap: 8,
  },
  resetButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.slate700,
  },
  submitButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    gap: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textInverse,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 12,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    gap: 8,
    marginTop: 12,
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.danger,
  },
  secondaryListBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#645695',
    borderRadius: 12,
    height: 48,
    marginTop: 12,
    gap: 6,
  },
  secondaryListBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#645695',
  },
  // User Master Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '75%',
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  modalSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 10,
    paddingHorizontal: 10,
    marginBottom: 12,
  },
  modalSearchContainer: {
    flex: 1,
    marginBottom: 0,
  },
  modalSearchInput: {
    borderWidth: 0,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 10,
  },
  modalItemActive: {
    backgroundColor: '#eff6ff',
    borderRadius: 8,
  },
  modalItemText: {
    fontSize: 14,
    color: Colors.text,
  },
  modalItemTextActive: {
    fontWeight: '700',
    color: Colors.primary,
  },
});
