import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { Header } from '../../components/common/Header';
import { Input } from '../../components/common/Input';
import {
  MobileDropdown,
  DropdownOption,
} from '../../components/common/MobileDropdown';
import { MobileDatePicker } from '../../components/common/MobileDatePicker';

import { contactService } from '../../api/contactService';

import { useAuth } from '../../context/AuthContext';
import { useCompany } from '../../context/CompanyContext';
import { Colors } from '../../theme/colors';

interface AddContactScreenProps {
  navigation: any;
  route?: any;
}

interface FormContactItem {
  id: number;
  contactID: number | null;
  fullName: string;
  contactNumber: string;
  email: string;
  position: string;
  isDefault: boolean;
}

const INDIAN_STATES = [
  'Maharashtra',
  'Karnataka',
  'Gujarat',
  'Tamil Nadu',
  'Uttar Pradesh',
  'Madhya Pradesh',
  'Rajasthan',
  'Bihar',
  'West Bengal',
  'Punjab',
  'Haryana',
  'Odisha',
  'Kerala',
  'Telangana',
  'Andhra Pradesh',
  'Jharkhand',
  'Chhattisgarh',
  'Assam',
  'Himachal Pradesh',
  'Goa',
  'Delhi',
  'Uttarakhand',
  'Jammu and Kashmir',
  'Puducherry',
];

const STATE_OPTIONS: DropdownOption[] = INDIAN_STATES.map((state) => ({
  label: state,
  value: state,
}));

const STATUS_OPTIONS: DropdownOption[] = [
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
];

export const AddContactScreen: React.FC<AddContactScreenProps> = ({
  navigation,
  route,
}) => {
  const { user } = useAuth();
  const { selectedCompanyId } = useCompany();

  const editContact =
    route?.params?.editContact || route?.params?.contact || null;

  const isEditing = Boolean(editContact);

  /* ============================================================
   * LEAD INFORMATION
   * ============================================================ */

  const initialLeadId = Number(
    editContact?.leadId ||
      editContact?.leadID ||
      editContact?.LeadId ||
      editContact?.LeadID ||
      route?.params?.leadId ||
      route?.params?.leadID ||
      0
  );

  const initialLeadName =
    editContact?.leadName ||
    editContact?.LeadName ||
    editContact?.lead?.leadName ||
    editContact?.fullName ||
    editContact?.contactName ||
    editContact?.contactPerson ||
    route?.params?.leadName ||
    '';

  const [leadId] = useState<number>(initialLeadId);
  const [leadName, setLeadName] = useState<string>(initialLeadName);
  const [companyName, setCompanyName] = useState<string>(
    editContact?.companyName ||
      editContact?.establishmentName ||
      editContact?.CompanyName ||
      ''
  );

  const [status, setStatus] = useState<'active' | 'inactive'>(
    editContact?.status?.toLowerCase() === 'inactive' ? 'inactive' : 'active'
  );

  /* ============================================================
   * FOLLOW UP
   * ============================================================ */

  const initialFollowUp =
    editContact?.followUpDate || editContact?.combinedFollowUpDateTime || '';

  const [followUpDate, setFollowUpDate] = useState<string>(
    initialFollowUp?.includes('T')
      ? initialFollowUp.split('T')[0]
      : initialFollowUp || ''
  );

  const [followUpTime, setFollowUpTime] = useState<string>(
    initialFollowUp?.includes('T') && initialFollowUp.split('T')[1]
      ? initialFollowUp.split('T')[1].substring(0, 5)
      : '10:00'
  );

  /* ============================================================
   * CONTACTS
   * ============================================================ */

  const initialContactName =
    editContact?.contactPerson ||
    editContact?.fullName ||
    editContact?.contactName ||
    editContact?.leadName ||
    editContact?.contacts?.[0]?.fullName ||
    '';

  const [contacts, setContacts] = useState<FormContactItem[]>([
    {
      id: 1,
      contactID:
        editContact?.contactID ||
        editContact?.id ||
        editContact?.establishmentID ||
        editContact?.contacts?.[0]?.contactID ||
        null,
      fullName: initialContactName,
      contactNumber:
        editContact?.phone ||
        editContact?.mobileNo ||
        editContact?.contactNumber ||
        editContact?.contacts?.[0]?.contactNumber ||
        route?.params?.mobileNo ||
        '',
      email: editContact?.email || editContact?.contacts?.[0]?.email || '',
      position:
        editContact?.position ||
        editContact?.designation ||
        editContact?.contacts?.[0]?.position ||
        '',
      isDefault: true,
    },
  ]);

  /* ============================================================
   * ADDRESS
   * ============================================================ */

  const [streetName, setStreetName] = useState<string>(
    editContact?.address?.addressLine1 ||
      editContact?.addressLine1 ||
      editContact?.address ||
      editContact?.streetName ||
      editContact?.StreetName ||
      ''
  );

  const [city, setCity] = useState<string>(
    editContact?.city || editContact?.address?.city || ''
  );

  const [state, setState] = useState<string>(
    editContact?.state || editContact?.address?.state || ''
  );

  const [pincode, setPincode] = useState<string>(
    editContact?.postalCode ||
      editContact?.address?.postalCode ||
      editContact?.pincode ||
      editContact?.Pincode ||
      ''
  );

  /* ============================================================
   * OTHER DETAILS
   * ============================================================ */

  const [gstNo, setGstNo] = useState<string>(
    editContact?.otherDetails?.gstNo || editContact?.gstNo || ''
  );
  const [panNo, setPanNo] = useState<string>(
    editContact?.otherDetails?.panNo || editContact?.panNo || ''
  );
  const [cinNo, setCinNo] = useState<string>(
    editContact?.otherDetails?.cinNo || editContact?.cinNo || ''
  );
  const [adharNo, setAdharNo] = useState<string>(
    editContact?.otherDetails?.adharNo ||
      editContact?.adharNo ||
      editContact?.aadharNo ||
      editContact?.AadharNo ||
      ''
  );

  /* ============================================================
   * STATES
   * ============================================================ */

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const contactId = Number(
      editContact?.contactID ||
        editContact?.id ||
        editContact?.establishmentID ||
        0
    );
    if (isEditing && contactId > 0) {
      contactService
        .getContactById(contactId)
        .then((fullData) => {
          if (fullData) {
            if (!leadName && (fullData.leadName || fullData.fullName || fullData.contactName)) {
              setLeadName(fullData.leadName || fullData.fullName || fullData.contactName || '');
            }
            if (!companyName && fullData.companyName) {
              setCompanyName(fullData.companyName);
            }
            if (fullData.city && !city) setCity(fullData.city);
            if (fullData.state && !state) setState(fullData.state);
            const fullAddr = fullData.address || fullData.addressLine1 || fullData.streetName;
            if (fullAddr && !streetName) setStreetName(fullAddr);
            const fullPin = fullData.pincode || fullData.postalCode;
            if (fullPin && !pincode) setPincode(fullPin);
            if (fullData.gstNo && !gstNo) setGstNo(fullData.gstNo);
            if (fullData.panNo && !panNo) setPanNo(fullData.panNo);
            if (fullData.cinNo && !cinNo) setCinNo(fullData.cinNo);
            const fullAadhar = fullData.aadharNo || fullData.adharNo;
            if (fullAadhar && !adharNo) setAdharNo(fullAadhar);
          }
        })
        .catch((e) => console.warn('Could not load full contact details on mount:', e));
    }
  }, []);

  /* ============================================================
   * CONTACT HANDLERS
   * ============================================================ */

  const handleContactChange = (
    index: number,
    field: keyof FormContactItem,
    value: any
  ) => {
    const updated = [...contacts];
    updated[index] = { ...updated[index], [field]: value };

    if (field === 'isDefault' && value === true) {
      updated.forEach((item, i) => {
        item.isDefault = i === index;
      });
    }
    setContacts(updated);
  };

  const addContact = () => {
    const newId = Math.max(...contacts.map((item) => item.id), 0) + 1;
    setContacts([
      ...contacts,
      {
        id: newId,
        contactID: null,
        fullName: '',
        contactNumber: '',
        email: '',
        position: '',
        isDefault: false,
      },
    ]);
  };

  const removeContact = (index: number) => {
    if (contacts.length === 1) {
      setContacts([
        {
          id: 1,
          contactID: contacts[0].contactID,
          fullName: '',
          contactNumber: '',
          email: '',
          position: '',
          isDefault: true,
        },
      ]);
      return;
    }
    const updated = contacts.filter((_, i) => i !== index);
    if (!updated.some((item) => item.isDefault)) updated[0].isDefault = true;
    setContacts(updated);
  };

  /* ============================================================
   * VALIDATION
   * ============================================================ */

  const validate = () => {
    const newErrors: Record<string, string> = {};
    const firstContact = contacts[0];

    if (!firstContact?.fullName.trim())
      newErrors.fullName = 'Full Name is required';

    if (!firstContact?.contactNumber.trim()) {
      newErrors.contactNumber = 'Contact Number is required';
    } else {
      const mobile = firstContact.contactNumber.replace(/[^0-9]/g, '');
      if (mobile.length !== 10)
        newErrors.contactNumber = 'Enter a valid 10-digit number';
    }

    if (pincode && !/^[0-9]{6}$/.test(pincode))
      newErrors.pincode = 'Enter valid 6-digit Pincode';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
 

  /* ============================================================
   * SAVE
   * ============================================================ */

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);

    try {
      const companyId = selectedCompanyId || user?.defaultCompanyId || 1;

      const datePart = followUpDate ? followUpDate : null;
      const timePart = followUpDate
        ? `${followUpTime || '10:00'}:00`
        : null;
      const combinedDateTime = followUpDate
        ? `${followUpDate}T${followUpTime || '10:00'}`
        : null;

      const activeLeadId = leadId > 0 ? leadId : 0;

      const contactEstId = Number(
        editContact?.contactID ||
          editContact?.id ||
          editContact?.establishmentID ||
          0
      );

      const mappedContacts = contacts
        .filter(
          (contact) => contact.fullName.trim() || contact.contactNumber.trim()
        )
        .map((contact) => {
          const fullName = contact.fullName.trim();
          const nameParts = fullName.split(/\s+/);
          const firstName = nameParts[0] || '';
          const lastName =
            nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

          return {
            contactID: isEditing ? contact.contactID || contactEstId : 0,
            firstName,
            lastName,
            fullName,
            contactNumber: contact.contactNumber.trim(),
            email: contact.email.trim(),
            position: contact.position.trim(),
            isDefault: contact.isDefault,
          };
        });

      if (
        mappedContacts.length > 0 &&
        !mappedContacts.some((contact) => contact.isDefault)
      ) {
        mappedContacts[0].isDefault = true;
      }

      const payload = {
        establishment: {
          establishmentID: isEditing ? contactEstId : 0,
          establishmentName: companyName.trim() || leadName.trim(),
          status: status,
          companyID: Number(companyId),
          leadID: activeLeadId || 0,
          followUpDate: datePart,
          followUpTime: timePart,
          combinedFollowUpDateTime: combinedDateTime,
        },
        establishmentID: isEditing ? contactEstId : 0,
        contactID: isEditing ? contactEstId : 0,
        leadId: activeLeadId,
        leadName: leadName,
        companyName: companyName,
        status: status,
        companyID: Number(companyId),
        followUpDate: datePart,
        followUpTime: timePart,
        combinedFollowUpDateTime: combinedDateTime,
        contacts: mappedContacts,
        address: {
          addressLine1: streetName.trim(),
          addressLine2: '',
          city: city.trim(),
          state: state.trim(),
          postalCode: pincode.trim(),
          country: 'India',
        },
        otherDetails: {
          gstNo: gstNo.trim(),
          panNo: panNo.trim(),
          cinNo: cinNo.trim(),
          adharNo: adharNo.trim(),
          leadId: activeLeadId,
        },
        currentUserId: user?.userID || user?.id || 1,
      };

      console.log('CONTACT SAVE PAYLOAD:', JSON.stringify(payload, null, 2));

      const response = await contactService.saveAll(payload);

      if (response && response.success !== false) {
        Alert.alert(
          'Success',
          isEditing
            ? 'Contact updated successfully!'
            : 'Contact saved successfully!',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Contacts'),
            },
          ]
        );
      } else {
        Alert.alert('Error', response?.message || 'Failed to save contact.');
      }
    } catch (error: any) {
      console.error('CONTACT SAVE ERROR:', error);
      Alert.alert(
        'Save Failed',
        error?.response?.data?.message ||
          error?.message ||
          'Could not save contact.'
      );
    } finally {
      setSaving(false);
    }
  };

  /* ============================================================
   * DELETE
   * ============================================================ */

  const handleDelete = () => {
    if (!editContact) return;

    const contactId = editContact?.contactID || editContact?.id || 0;

    if (!contactId) {
      Alert.alert('Error', 'Contact ID not found.');
      return;
    }

    Alert.alert(
      'Delete Contact',
      'Are you sure you want to delete this contact?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              const service: any = contactService;
              if (typeof service.deleteContact === 'function') {
                await service.deleteContact(contactId);
              } else if (typeof service.delete === 'function') {
                await service.delete(contactId);
              } else {
                throw new Error(
                  'Delete API method is not available in contactService.'
                );
              }
              Alert.alert('Success', 'Contact deleted successfully.', [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
            } catch (error: any) {
              console.error('DELETE CONTACT ERROR:', error);
              Alert.alert(
                'Delete Failed',
                error?.response?.data?.message ||
                  error?.message ||
                  'Could not delete contact.'
              );
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  /* ============================================================
   * RENDER
   * ============================================================ */

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}    >
      <Header
        title={isEditing ? 'Update Contact' : 'New Contact'}
        showBack={false}
      />

     <ScrollView
      style={styles.flexOne}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={true}
      nestedScrollEnabled={true}
      automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
    >
        {/* =====================================================
            LEAD INFORMATION
        ====================================================== */}

        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderLeft}>
              <View style={styles.iconCircle}>
                <Ionicons
                  name="person-outline"
                  size={18}
                  color={Colors.primary}
                />
              </View>
              <Text style={styles.sectionTitle}>Lead Information</Text>
            </View>
          </View>

          <View style={styles.fieldContainer}>
            <Input
              label="Lead Name"
              value={leadName}
              onChangeText={setLeadName}
              placeholder="Enter Lead Name"
            />
          </View>

          <View style={styles.fieldContainer}>
            <Input
              label="Company Name"
              value={companyName}
              onChangeText={setCompanyName}
              placeholder="Enter Company Name"
            />
          </View>

          <View style={styles.fieldContainer}>
            <MobileDropdown
              label="Status"
              selectedValue={status}
              options={STATUS_OPTIONS}
              onSelect={(value) =>
                setStatus(value as 'active' | 'inactive')
              }
              placeholder="Select Status"
            />
          </View>

          <View style={styles.fieldContainerLast}>
            <MobileDatePicker
              label="Follow-up Date"
              value={followUpDate}
              onChangeDate={(value: string) => setFollowUpDate(value)}
            />
          </View>
        </View>

        {/* =====================================================
            CONTACT INFORMATION
        ====================================================== */}

        <View style={styles.card}>
          <View style={styles.cardHeaderBetween}>
            <View style={styles.cardHeaderLeft}>
              <View style={styles.iconCircle}>
                <Ionicons
                  name="people-outline"
                  size={18}
                  color={Colors.primary}
                />
              </View>
              <Text style={styles.sectionTitle}>Contacts Information</Text>
            </View>

            <TouchableOpacity
              style={styles.addContactBtn}
              onPress={addContact}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={styles.addContactText}>Add</Text>
            </TouchableOpacity>
          </View>

          {contacts.map((contact, index) => (
            <View key={contact.id} style={styles.mobileContactCard}>
              <View style={styles.contactCardHeader}>
                <View style={styles.contactHeaderLeft}>
                  <View style={styles.contactNumberCircle}>
                    <Text style={styles.contactNumberText}>
                      {index + 1}
                    </Text>
                  </View>

                  <Text style={styles.contactCardTitle}>
                    Contact #{index + 1}
                  </Text>

                  {contact.isDefault && (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultBadgeText}>Default</Text>
                    </View>
                  )}
                </View>

                {contacts.length > 1 && (
                  <TouchableOpacity
                    style={styles.removeContactBtn}
                    onPress={() => removeContact(index)}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={17}
                      color={Colors.danger}
                    />
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.contactCardBody}>
                <View style={styles.fieldContainer}>
                  <Input
                    label="Full Name"
                    value={contact.fullName}
                    onChangeText={(value: string) =>
                      handleContactChange(index, 'fullName', value)
                    }
                    placeholder="Full name"
                  />
                  {index === 0 && errors.fullName && (
                    <Text style={styles.errorText}>{errors.fullName}</Text>
                  )}
                </View>

                <View style={styles.fieldContainer}>
                  <Input
                    label="Contact Number"
                    value={contact.contactNumber}
                    onChangeText={(value: string) => {
                      const cleaned = value.replace(/[^0-9]/g, '');
                      handleContactChange(
                        index,
                        'contactNumber',
                        cleaned.slice(0, 10)
                      );
                    }}
                    placeholder="10-digit"
                    keyboardType="phone-pad"
                  />
                  {index === 0 && errors.contactNumber && (
                    <Text style={styles.errorText}>
                      {errors.contactNumber}
                    </Text>
                  )}
                </View>

                <View style={styles.fieldContainer}>
                  <Input
                    label="Email"
                    value={contact.email}
                    onChangeText={(value: string) =>
                      handleContactChange(index, 'email', value)
                    }
                    placeholder="Email"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.fieldContainer}>
                  <Input
                    label="Position"
                    value={contact.position}
                    onChangeText={(value: string) =>
                      handleContactChange(index, 'position', value)
                    }
                    placeholder="Position"
                  />
                </View>

                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() =>
                    handleContactChange(
                      index,
                      'isDefault',
                      !contact.isDefault
                    )
                  }
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.checkbox,
                      contact.isDefault && styles.checkboxActive,
                    ]}
                  >
                    {contact.isDefault && (
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    )}
                  </View>
                  <Text style={styles.checkboxLabel}>
                    Set as Default Contact
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* =====================================================
            ADDRESS INFORMATION
        ====================================================== */}

        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderLeft}>
              <View style={styles.iconCircle}>
                <Ionicons
                  name="location-outline"
                  size={18}
                  color={Colors.primary}
                />
              </View>
              <Text style={styles.sectionTitle}>Address Information</Text>
            </View>
          </View>

          <View style={styles.fieldContainer}>
            <Input
              label="Street Name"
              value={streetName}
              onChangeText={setStreetName}
              placeholder="Enter Street Name / Building"
            />
          </View>

          <View style={styles.fieldContainer}>
            <Input
              label="City"
              value={city}
              onChangeText={setCity}
              placeholder="Enter City"
            />
          </View>

          <View style={styles.fieldContainer}>
            <MobileDropdown
              label="State"
              selectedValue={state}
              options={STATE_OPTIONS}
              onSelect={(value) => setState(String(value))}
              placeholder="Select State"
            />
          </View>

          <View style={styles.fieldContainerLast}>
            <Input
              label="Pincode"
              value={pincode}
              onChangeText={(value) => {
                const cleaned = value.replace(/[^0-9]/g, '');
                setPincode(cleaned.slice(0, 6));
              }}
              placeholder="Enter Pincode"
              keyboardType="number-pad"
            />
            {errors.pincode && (
              <Text style={styles.errorText}>{errors.pincode}</Text>
            )}
          </View>
        </View>

        {/* =====================================================
            OTHER DETAILS
        ====================================================== */}

        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderLeft}>
              <View style={styles.iconCircle}>
                <Ionicons
                  name="document-text-outline"
                  size={18}
                  color={Colors.primary}
                />
              </View>
              <Text style={styles.sectionTitle}>Other Details</Text>
            </View>
          </View>

          <View style={styles.fieldContainer}>
            <Input
              label="GST Number"
              value={gstNo}
              onChangeText={setGstNo}
              placeholder="Enter GST Number"
              autoCapitalize="characters"
            />
          </View>

          <View style={styles.fieldContainer}>
            <Input
              label="PAN Number"
              value={panNo}
              onChangeText={setPanNo}
              placeholder="Enter PAN Number"
              autoCapitalize="characters"
            />
          </View>

          <View style={styles.fieldContainer}>
            <Input
              label="CIN Number"
              value={cinNo}
              onChangeText={setCinNo}
              placeholder="Enter CIN Number"
              autoCapitalize="characters"
            />
          </View>

          <View style={styles.fieldContainerLast}>
            <Input
              label="Adhar Number"
              value={adharNo}
              onChangeText={(value) => {
                const cleaned = value.replace(/[^0-9]/g, '');
                setAdharNo(cleaned.slice(0, 12));
              }}
              placeholder="Enter Adhar Number"
              keyboardType="number-pad"
            />
          </View>
        </View>

        {/* =====================================================
            ACTION BUTTONS
        ====================================================== */}

        <View style={styles.actionButtonsContainer}>

          {isEditing && (
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={handleDelete}
              disabled={saving || deleting}
              activeOpacity={0.8}
            >
              {deleting ? (
                <ActivityIndicator size="small" color={Colors.danger} />
              ) : (
                <Ionicons name="trash-outline" size={17} color={Colors.danger} />
              )}
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.actionButton, styles.saveButton]}
            onPress={handleSave}
            disabled={saving || deleting}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons
                name={isEditing ? 'checkmark-outline' : 'save-outline'}
                size={17}
                color="#fff"
              />
            )}
            <Text style={styles.saveButtonText}>
              {saving ? 'Saving...' : isEditing ? 'Update' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpace} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

/* ============================================================
 * STYLES  — matched to Lead Details / Lead form theme
 * ============================================================ */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

 flexOne: {
  flex: 1,
},

scrollContent: {
  flexGrow: 1,
  padding: 16,
  paddingBottom: 180,
},

  /* ---------- CARD (same as Lead Details) ---------- */

  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  cardHeaderRow: {
    marginBottom: 14,
  },

  cardHeaderBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryMuted,
    marginRight: 10,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.slate800,
  },

  /* ---------- FIELDS ---------- */

  fieldContainer: {
    marginBottom: 12,
  },

  fieldContainerLast: {
    marginBottom: 0,
  },

  errorText: {
    color: Colors.danger,
    fontSize: 12,
    marginTop: 5,
    marginLeft: 2,
  },

  /* ---------- ADD CONTACT BUTTON ---------- */

  addContactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    gap: 4,
  },

  addContactText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },

  /* ---------- CONTACT CARD ---------- */

  mobileContactCard: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceAlt,
  },

  contactCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },

  contactHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  contactNumberCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },

  contactNumberText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },

  contactCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.slate800,
  },

  defaultBadge: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: Colors.successLight,
  },

  defaultBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.success,
  },

  removeContactBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  contactCardBody: {
    padding: 12,
  },

  /* ---------- CHECKBOX ---------- */

  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },

  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: Colors.slate400,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },

  checkboxActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },

  checkboxLabel: {
    fontSize: 13,
    color: Colors.slate700,
    fontWeight: '500',
  },

  /* ---------- ACTION BUTTONS ---------- */

  actionButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },

  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: 10,
    gap: 5,
  },

  ghostButton: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  ghostButtonText: {
    color: Colors.slate600,
    fontSize: 13,
    fontWeight: '600',
  },

  deleteButton: {
    backgroundColor: Colors.dangerLight,
    borderWidth: 1,
    borderColor: '#fecaca',
  },

  deleteButtonText: {
    color: Colors.danger,
    fontSize: 13,
    fontWeight: '700',
  },

  saveButton: {
    backgroundColor: Colors.primary,
    minWidth: 110,
  },

  saveButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },

  bottomSpace: {
    height: 20,
  },
});

export default AddContactScreen;