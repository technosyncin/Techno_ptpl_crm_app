// File: src/screens/user/UserMasterScreen.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
  KeyboardAvoidingView, Platform, Modal, TextInput, ActivityIndicator,
  Switch, LayoutAnimation, UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/common/Header';
import { Input } from '../../components/common/Input';
import { MobileDatePicker } from '../../components/common/MobileDatePicker';
import { MobileDropdown, DropdownOption } from '../../components/common/MobileDropdown';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import { userService, CreateUserPayload, UpdateUserPayload, DynamicOption } from '../../api/userService';
import { userPermissionService, UserPermissionItem } from '../../api/userPermissionService';
import { useCompany } from '../../context/CompanyContext';
import { useAuth } from '../../context/AuthContext';
import { companyService } from '../../api/companyService';
import { CompanyMaster } from '../../api/mastersService';
import { mapBootstrapIconToIonic } from '../more/MoreScreen';
import { Colors } from '../../theme/colors';
import { toTitleCase, INDIAN_STATES, EMAIL_REGEX } from '../../utils/formUtils';

// Enable LayoutAnimation on Android
if (
  Platform.OS === 'android' &&
  !(globalThis as any).nativeFabricUIManager &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const STATUS_OPTIONS: DropdownOption[] = [
  { label: 'Active', value: 'active', subtitle: 'Account is active and can login' },
  { label: 'Inactive', value: 'inactive', subtitle: 'Account is disabled' },
];

export const UserMasterScreen: React.FC<{ navigation: any; route?: any }> = ({ navigation, route }) => {
  const { companies, allCompanies, refreshCompanies } = useCompany();
  const { user: loggedInUser, updateUser: updateAuthUser } = useAuth();

  const [localCompanies, setLocalCompanies] = useState<CompanyMaster[]>([]);
  const editingUser = route?.params?.user;
  const isEditing = Boolean(editingUser && (editingUser.userID || editingUser.id));
  const editId = editingUser?.userID || editingUser?.id;

  // ---------------- Companies list ----------------
  const companyList = useMemo(() => {
    const list = localCompanies.length > 0 ? localCompanies : allCompanies?.length > 0 ? allCompanies : companies;
    return list
      .map((c: any) => ({
        ...c,
        companyID: Number(c.companyID || c.CompanyID || c.id),
        companyName: c.companyName || c.CompanyName || c.name || 'Company',
        city: c.city || c.City || '',
        status: (c.status || c.Status || 'active').toString().toLowerCase(),
      }))
      .filter((c: any) => !c.status || c.status === 'active');
  }, [localCompanies, allCompanies, companies]);

  const initialCompanyIds = useMemo<number[]>(() => {
    if (editingUser?.companyIds?.length > 0) return editingUser.companyIds.map((id: any) => Number(id));
    if (editingUser?.companyID) return [Number(editingUser.companyID)];
    return [];
  }, [editingUser]);

  const initialDefaultCompanyId = useMemo<number | null>(() => {
    if (editingUser?.defaultCompanyId) return Number(editingUser.defaultCompanyId);
    if (editingUser?.companyID) return Number(editingUser.companyID);
    return null;
  }, [editingUser]);

  // ---------------- Form fields ----------------
  const [fullName, setFullName] = useState(editingUser?.fullName || '');
  const [username, setUsername] = useState(editingUser?.username || '');
  const [password, setPassword] = useState(editingUser?.password || '');
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState(editingUser?.email || '');
  const [mobileNo, setMobileNo] = useState(editingUser?.mobileNo || '');
  const [selectedRole, setSelectedRole] = useState<string | number>(editingUser?.role || '');
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<number[]>(initialCompanyIds);
  const [defaultCompanyId, setDefaultCompanyId] = useState<number | null>(initialDefaultCompanyId);
  const [companyModalVisible, setCompanyModalVisible] = useState(false);
  const [companySearch, setCompanySearch] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string | number>(
    editingUser?.departmentID ? String(editingUser.departmentID) : ''
  );
  const [designation, setDesignation] = useState(editingUser?.designation || '');
  const [empId, setEmpId] = useState(editingUser?.empId ? String(editingUser.empId) : '');
  const [joiningDate, setJoiningDate] = useState(editingUser?.joiningDate || '');
  const [dateOfBirth, setDateOfBirth] = useState(editingUser?.dateOfBirth || '');
  const [addressLine1, setAddressLine1] = useState(editingUser?.addressLine1 || '');
  const [city, setCity] = useState(editingUser?.city || '');
  const [state, setState] = useState<string | number>(editingUser?.state || '');
  const [pincode, setPincode] = useState(editingUser?.pincode || '');
  const [status, setStatus] = useState<string | number>(
    editingUser?.isActive === false ? 'inactive' : 'active'
  );

  const [rolesList, setRolesList] = useState<DynamicOption[]>([]);
  const [departmentsList, setDepartmentsList] = useState<DynamicOption[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // ---------------- Permissions state ----------------
  const [permissions, setPermissions] = useState<UserPermissionItem[]>([]);
  const [localAuthMap, setLocalAuthMap] = useState<Record<number, boolean>>({});
  const [originalAuthMap, setOriginalAuthMap] = useState<Record<number, boolean>>({});
  const [expandedModules, setExpandedModules] = useState<Record<number, boolean>>({});
  const [permSearch, setPermSearch] = useState('');
  const [loadingPerms, setLoadingPerms] = useState(false);

  // ---------------- Dropdown options ----------------
  const roleOptions: DropdownOption[] = useMemo(
    () => rolesList.map((r) => ({ label: r.name, value: r.name })),
    [rolesList]
  );

  const selectedDefaultCompanyName = useMemo(() => {
    if (!defaultCompanyId) return 'None';
    const found = companyList.find((c) => c.companyID === defaultCompanyId);
    return found?.companyName || `Company #${defaultCompanyId}`;
  }, [defaultCompanyId, companyList]);

  const filteredCompanies = useMemo(() => {
    if (!companySearch.trim()) return companyList;
    const q = companySearch.toLowerCase().trim();
    return companyList.filter(
      (c) => c.companyName.toLowerCase().includes(q) || (c.city && c.city.toLowerCase().includes(q))
    );
  }, [companyList, companySearch]);

  const departmentOptions: DropdownOption[] = useMemo(
    () => departmentsList.map((d) => ({ label: d.name, value: String(d.id) })),
    [departmentsList]
  );

  const stateOptions: DropdownOption[] = useMemo(
    () => INDIAN_STATES.map((s) => ({ label: s, value: s })),
    []
  );

  // ---------------- Load lookups ----------------
  useEffect(() => {
    let isMounted = true;
    const loadDynamicData = async () => {
      setLoadingLookups(true);
      try {
        const [rolesData, deptsData, freshCompanies] = await Promise.all([
          userService.getRoles(),
          userService.getDepartments(),
          companyService.getCompanies({ status: 'all' }).catch(() => []),
        ]);
        if (isMounted) {
          setRolesList(rolesData);
          setDepartmentsList(deptsData);
          if (freshCompanies?.length > 0) setLocalCompanies(freshCompanies);
          refreshCompanies().catch(() => {});
        }
      } catch (err) {
        console.warn('Error fetching dynamic data:', err);
      } finally {
        if (isMounted) setLoadingLookups(false);
      }
    };
    loadDynamicData();
    return () => { isMounted = false; };
  }, []);

  // ---------------- Sync editingUser ----------------
  useEffect(() => {
    if (!editingUser) return;
    setFullName(editingUser.fullName || '');
    setUsername(editingUser.username || '');
    if (editingUser.password) setPassword(editingUser.password);
    setEmail(editingUser.email || '');
    setMobileNo(editingUser.mobileNo || '');
    setSelectedRole(editingUser.role || '');

    const rawIds = editingUser.companyIds?.length > 0
      ? editingUser.companyIds.map((id: any) => typeof id === 'object' ? Number(id.companyID || id.id) : Number(id)).filter((n: number) => !isNaN(n) && n > 0)
      : editingUser.companyID ? [Number(editingUser.companyID)] : [];
    setSelectedCompanyIds(rawIds);
    setDefaultCompanyId(
      editingUser.defaultCompanyId != null ? Number(editingUser.defaultCompanyId)
      : editingUser.companyID ? Number(editingUser.companyID) : (rawIds[0] ?? null)
    );

    setSelectedDepartment(editingUser.departmentID ? String(editingUser.departmentID) : '');
    setDesignation(editingUser.designation || '');
    setEmpId(editingUser.empId ? String(editingUser.empId) : '');
    setJoiningDate(editingUser.joiningDate || '');
    setDateOfBirth(editingUser.dateOfBirth || '');
    setAddressLine1(editingUser.addressLine1 || '');
    setCity(editingUser.city || '');
    setState(editingUser.state || '');
    setPincode(editingUser.pincode || '');
    setStatus(editingUser.isActive === false ? 'inactive' : 'active');
  }, [editingUser]);

  // ---------------- Fetch fresh user ----------------
  useEffect(() => {
    let isMounted = true;
    const loadFullUser = async () => {
      if (editingUser && editId) {
        try {
          const freshUser = await userService.getUserById(editId);
          if (isMounted && freshUser) {
            if (freshUser.password) setPassword(freshUser.password);
            const rawIds = freshUser.companyIds || editingUser.companyIds || [];
            let parsed: number[] = [];
            if (Array.isArray(rawIds) && rawIds.length > 0) {
              parsed = rawIds.map((id: any) => typeof id === 'object' ? Number(id.companyID || id.id) : Number(id)).filter((n: number) => !isNaN(n) && n > 0);
            } else if (freshUser.companyID || editingUser.companyID) {
              parsed = [Number(freshUser.companyID || editingUser.companyID)];
            }
            if (parsed.length > 0) {
              setSelectedCompanyIds(parsed);
              setDefaultCompanyId(
                freshUser.defaultCompanyId != null ? Number(freshUser.defaultCompanyId)
                : editingUser.defaultCompanyId != null ? Number(editingUser.defaultCompanyId) : (parsed[0] ?? null)
              );
            }
          }
        } catch (e) {
          console.warn('Error fetching fresh user:', e);
        }
      }
    };
    loadFullUser();
    return () => { isMounted = false; };
  }, [editingUser, editId]);

  // ---------------- Load permissions ----------------
  const loadPermissionsForUser = useCallback(async (userId: number = 0) => {
    setLoadingPerms(true);
    try {
      const res = await userPermissionService.getUserPermissions(userId);
      if (res && res.menus) {
        setPermissions(res.menus);

        const initialMap: Record<number, boolean> = {};
        res.menus.forEach((parent) => {
          initialMap[parent.menuID] = !!parent.auth;
          (parent.children || []).forEach((child) => {
            initialMap[child.menuID] = !!child.auth;
          });
        });
        setLocalAuthMap(initialMap);
        setOriginalAuthMap(initialMap);
        setExpandedModules({}); // Initially collapsed
      }
    } catch (err) {
      console.error('Failed to load permissions:', err);
    } finally {
      setLoadingPerms(false);
    }
  }, []);

  useEffect(() => {
    if (editId) {
      loadPermissionsForUser(Number(editId));
    } else {
      // Dynamically load all system menus so permissions can be configured before creation
      loadPermissionsForUser(0);
    }
  }, [editId, loadPermissionsForUser]);

  // ---------------- Handlers ----------------
  const handleToggleCompany = (companyId: number) => {
    if (selectedCompanyIds.includes(companyId)) {
      const next = selectedCompanyIds.filter((id) => id !== companyId);
      setSelectedCompanyIds(next);
      if (defaultCompanyId === companyId) setDefaultCompanyId(next.length > 0 ? next[0] : null);
    } else {
      const next = [...selectedCompanyIds, companyId];
      setSelectedCompanyIds(next);
      if (!defaultCompanyId) setDefaultCompanyId(companyId);
    }
    if (errors.companies) setErrors((prev) => ({ ...prev, companies: '' }));
  };

  const handleSetDefaultCompany = (companyId: number) => {
    if (!selectedCompanyIds.includes(companyId)) setSelectedCompanyIds((prev) => [...prev, companyId]);
    setDefaultCompanyId(companyId);
  };

  const toggleAccordion = (moduleId: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedModules((prev) => ({ ...prev, [moduleId]: !prev[moduleId] }));
  };

  const handleToggleChild = (childMenuId: number, currentVal: boolean, parentMenuId?: number) => {
    const nextVal = !currentVal;
    setLocalAuthMap((prev) => {
      const next = { ...prev, [childMenuId]: nextVal };
      if (parentMenuId && nextVal) {
        next[parentMenuId] = true;
      }
      return next;
    });
  };

  const toggleModuleSelectAll = (parent: UserPermissionItem, kids: UserPermissionItem[], currentAllState: boolean) => {
    const newMap = { ...localAuthMap };
    const targetVal = !currentAllState;
    newMap[parent.menuID] = targetVal;
    kids.forEach(k => { newMap[k.menuID] = targetVal; });
    setLocalAuthMap(newMap);
  };

  const handleToggleParentStandalone = (parentMenuId: number, currentVal: boolean) => {
    setLocalAuthMap((prev) => ({ ...prev, [parentMenuId]: !currentVal }));
  };

  const handleExpandAll = (expand: boolean) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const next: Record<number, boolean> = {};
    if (expand) {
      permissions.forEach(p => { next[p.menuID] = true; });
    }
    setExpandedModules(next);
  };

  const handleSelectAllGlobal = (targetVal: boolean) => {
    const newMap: Record<number, boolean> = {};
    permissions.forEach(p => {
      newMap[p.menuID] = targetVal;
      (p.children || []).forEach(k => {
        newMap[k.menuID] = targetVal;
      });
    });
    setLocalAuthMap(newMap);
  };

  const filteredPermissions = useMemo(() => {
    if (!permSearch.trim()) return permissions;
    const q = permSearch.toLowerCase().trim();
    return permissions.map((parent) => {
      const parentMatches = parent.menuName.toLowerCase().includes(q);
      const matchedChildren = (parent.children || []).filter((child) => child.menuName.toLowerCase().includes(q));
      if (parentMatches) return parent;
      if (matchedChildren.length > 0) return { ...parent, children: matchedChildren };
      return null;
    }).filter(Boolean) as UserPermissionItem[];
  }, [permissions, permSearch]);

  const permStats = useMemo(() => {
    let total = 0, enabled = 0;
    permissions.forEach((parent) => {
      const kids = parent.children || [];
      if (kids.length === 0) {
        total++;
        if (localAuthMap[parent.menuID]) enabled++;
      } else {
        kids.forEach((child) => {
          total++;
          if (localAuthMap[child.menuID]) enabled++;
        });
      }
    });
    return { total, enabled };
  }, [permissions, localAuthMap]);

  // ---------------- Validation & Save ----------------
  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!fullName.trim()) errs.fullName = 'Full Name is required';
    if (!username.trim()) errs.username = 'Username is required';
    if (!isEditing && !password.trim()) errs.password = 'Password is required';
    if (!selectedRole) errs.role = 'Role is required';
    if (selectedCompanyIds.length === 0) errs.companies = 'At least one company required';
    if (!mobileNo.trim()) errs.mobileNo = 'Mobile number is required';
    else if (mobileNo.trim().length !== 10) errs.mobileNo = 'Must be exactly 10 digits';
    if (email.trim() && !EMAIL_REGEX.test(email.trim())) errs.email = 'Invalid email address';
    if (pincode.trim() && pincode.trim().length !== 6) errs.pincode = 'Must be exactly 6 digits';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      Alert.alert('Validation Error', 'Please check the highlighted required fields.');
      return;
    }
    setSaving(true);
    try {
      let persistedUserId: number | null = editId ? Number(editId) : null;
      const payloadBase = {
        fullName: fullName.trim(), email: email.trim() || undefined, mobile: mobileNo.trim() || undefined,
        mobileNo: mobileNo.trim() || undefined, role: String(selectedRole),
        companyID: defaultCompanyId ?? selectedCompanyIds[0] ?? null, companyIds: selectedCompanyIds,
        defaultCompanyId: defaultCompanyId ?? selectedCompanyIds[0] ?? null,
        departmentID: selectedDepartment ? Number(selectedDepartment) : null,
        designation: designation.trim() || undefined, empId: empId.trim() || undefined,
        joiningDate: joiningDate.trim() || undefined, dateOfBirth: dateOfBirth.trim() || undefined,
        addressLine1: addressLine1.trim() || undefined, city: city.trim() || undefined,
        state: state ? String(state) : undefined, pincode: pincode.trim() || undefined,
        country: 'India', isActive: status === 'active',
      };

      if (isEditing && editId) {
        await userService.updateUser(editId, { ...payloadBase, ...(password.trim() && { password: password.trim() }) });
        if (updateAuthUser && String(editId) === String(loggedInUser?.id || loggedInUser?.userID)) {
          await updateAuthUser({ companyIds: selectedCompanyIds, defaultCompanyId: defaultCompanyId ?? selectedCompanyIds[0] ?? null });
        }
      } else {
        const created: any = await userService.createUser({ ...payloadBase, username: username.trim(), password: password.trim() });
        persistedUserId = created?.userID || created?.id || created?.data?.userID || created?.data?.id || null;
      }

      if (persistedUserId && permissions.length > 0) {
        const permsPayload = Object.entries(localAuthMap).map(([idStr, auth]) => ({ menuID: Number(idStr), auth: !!auth }));
        try {
          await userPermissionService.savePermissions(persistedUserId, permsPayload);
          setOriginalAuthMap({ ...localAuthMap });
        } catch (permErr) {
          Alert.alert('Partial Success', 'User saved, but permissions could not be saved.');
        }
      }

      await refreshCompanies();
      setSuccessMessage(`User "${fullName || username}" ${isEditing ? 'updated' : 'created'}!`);
      setSuccessModalVisible(true);
      setTimeout(() => { setSuccessModalVisible(false); navigation.goBack(); }, 2000);
    } catch (err: any) {
  console.log('USER MASTER SAVE ERROR:', err);
  console.log('API URL:', err?.config?.url);
  console.log('API METHOD:', err?.config?.method);
  console.log('STATUS:', err?.response?.status);
  console.log('RESPONSE:', err?.response?.data);

  Alert.alert(
    'Operation Failed',
    err?.response?.data?.message ||
    err?.message ||
    'Failed to save user.'
  );
}finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    Alert.alert('Reset Form', 'Clear all fields?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset', style: 'destructive',
        onPress: () => {
          setFullName(''); if (!isEditing) setUsername(''); setPassword(''); setEmail(''); setMobileNo('');
          setSelectedRole(isEditing ? editingUser?.role || '' : ''); setSelectedCompanyIds([]); setDefaultCompanyId(null);
          setSelectedDepartment(''); setDesignation(''); setEmpId(''); setJoiningDate(''); setDateOfBirth('');
          setAddressLine1(''); setCity(''); setState(''); setPincode(''); setStatus('active');
          setErrors({}); setLocalAuthMap({ ...originalAuthMap });
        },
      },
    ]);
  };

  const handleDeleteUser = async () => {
    if (!editId) return;
    setDeleting(true);
    try {
      await userService.deleteUser(editId);
      setDeleteModalVisible(false);
      Alert.alert('Success', 'User deleted!', [{ text: 'OK', onPress: () => navigation.navigate('UsersList') }]);
    } catch (err: any) {
      Alert.alert('Delete Failed', err?.response?.data?.message || 'Could not delete user');
    } finally {
      setDeleting(false);
    }
  };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Header showBack={false} navigation={navigation} />

      <ScrollView style={styles.flexOne} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        
        {/* ───── SECTION 1: User Details ───── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconWrap}><Ionicons name="person" size={18} color={Colors.primary} /></View>
            <Text style={styles.sectionTitle}>User Details</Text>
          </View>

          <View style={styles.fieldWrapper}>
            <Text style={styles.fieldLabel}>Company <Text style={styles.requiredAsterisk}>*</Text></Text>
            <TouchableOpacity style={[styles.companySelectorTrigger, errors.companies ? styles.companySelectorTriggerError : null]} onPress={() => setCompanyModalVisible(true)} activeOpacity={0.7}>
              <View style={styles.companySelectorLeft}>
                <Ionicons name="business-outline" size={18} color={Colors.primary} />
                <View style={{ flex: 1 }}>
                  {selectedCompanyIds.length > 0 ? (
                    <View style={styles.companySelectorRow}>
                      <Text style={styles.companySelectorText} numberOfLines={1}>{selectedDefaultCompanyName}</Text>
                      {defaultCompanyId ? <View style={styles.defaultPill}><Ionicons name="star" size={10} color="#b45309" /><Text style={styles.defaultPillText}>Default</Text></View> : null}
                      {selectedCompanyIds.length > 1 && <View style={styles.allocatedCountPill}><Text style={styles.allocatedCountPillText}>+{selectedCompanyIds.length - 1} more</Text></View>}
                    </View>
                  ) : (
                    <Text style={styles.companySelectorPlaceholder}>Select Company...</Text>
                  )}
                </View>
              </View>
              <Ionicons name="chevron-down" size={18} color={Colors.slate400} />
            </TouchableOpacity>
            {errors.companies ? <Text style={styles.errorText}>{errors.companies}</Text> : null}
          </View>

          <MobileDropdown label="Role" placeholder="Select Role..." options={roleOptions} selectedValue={selectedRole} onSelect={(val) => { setSelectedRole(val); if (errors.role) setErrors((prev) => ({ ...prev, role: '' })); }} loading={loadingLookups} required error={errors.role} searchable={false} />

          <Input label="Username" required placeholder="Enter username" autoCapitalize="none" editable={!isEditing} value={username} onChangeText={(text) => { setUsername(text); if (errors.username) setErrors((prev) => ({ ...prev, username: '' })); }} error={errors.username} leftIcon="at-outline" />

          <View style={styles.passwordWrapper}>
            <Input label="Password" required={!isEditing} placeholder="Enter password" secureTextEntry={!showPassword} value={password} onChangeText={(text) => { setPassword(text); if (errors.password) setErrors((prev) => ({ ...prev, password: '' })); }} error={errors.password} leftIcon="lock-closed-outline" />
            <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.slate500} />
            </TouchableOpacity>
          </View>

          <Input label="Full Name" required placeholder="Enter Full Name" value={fullName} onChangeText={(text) => { setFullName(toTitleCase(text)); if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: '' })); }} error={errors.fullName} leftIcon="person-outline" />

          <Input label="Mobile" required placeholder="Enter 10-digit mobile number" keyboardType="numeric" maxLength={10} value={mobileNo} onChangeText={(text) => { const cleaned = text.replace(/[^0-9]/g, '').slice(0, 10); setMobileNo(cleaned); if (errors.mobileNo) setErrors((prev) => ({ ...prev, mobileNo: '' })); }} error={errors.mobileNo} leftIcon="call-outline" />

          <Input label="Email" placeholder="Enter email" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={(text) => { setEmail(text); if (errors.email) setErrors((prev) => ({ ...prev, email: '' })); }} error={errors.email} leftIcon="mail-outline" />

          <MobileDatePicker label="Date of Birth" value={dateOfBirth} onChangeDate={setDateOfBirth} />

          <Input label="Employee ID" placeholder="Enter employee ID" keyboardType="numeric" value={empId} onChangeText={setEmpId} leftIcon="id-card-outline" />

          <MobileDropdown label="Department" placeholder="Select Department..." options={departmentOptions} selectedValue={selectedDepartment} onSelect={setSelectedDepartment} loading={loadingLookups} searchable={false} />

          <Input label="Designation" placeholder="Enter designation" value={designation} onChangeText={(text) => setDesignation(toTitleCase(text))} leftIcon="ribbon-outline" />

          <MobileDatePicker label="Joining Date" value={joiningDate} onChangeDate={setJoiningDate} />

          <MobileDropdown label="Status" placeholder="Select Status..." options={STATUS_OPTIONS} selectedValue={status} onSelect={setStatus} searchable={false} required />
        </View>

        {/* ───── SECTION 2: Address Information ───── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconWrap}><Ionicons name="location" size={18} color={Colors.primary} /></View>
            <Text style={styles.sectionTitle}>Address Information</Text>
          </View>

          <Input label="Street Name" placeholder="Enter Street Name" value={addressLine1} onChangeText={(text) => setAddressLine1(toTitleCase(text))} leftIcon="navigate-outline" />
          <Input label="City" placeholder="Enter City" value={city} onChangeText={(text) => setCity(toTitleCase(text))} leftIcon="business-outline" />
          <MobileDropdown label="State" placeholder="Select State..." options={stateOptions} selectedValue={state} onSelect={setState} searchable={true} searchPlaceholder="Search Indian State..." />
          <Input label="Pincode" placeholder="Enter Pincode" keyboardType="numeric" maxLength={6} value={pincode} onChangeText={(text) => { const cleaned = text.replace(/[^0-9]/g, '').slice(0, 6); setPincode(cleaned); if (errors.pincode) setErrors((prev) => ({ ...prev, pincode: '' })); }} error={errors.pincode} leftIcon="pin-outline" />
        </View>

        {/* ───── SECTION 3: Menu Permissions (Collapsible Cards) ───── */}
        <View style={styles.permissionsWrapper}>
          <View style={styles.permHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={styles.permHeaderIconBox}>
                <Ionicons name="shield-checkmark" size={18} color={Colors.primary} />
              </View>
              <View>
                <Text style={styles.permMainTitle}>User Permission</Text>
                <Text style={styles.permSubTitle}>Configure module & menu permissions</Text>
              </View>
            </View>
            <View style={styles.permCountPill}>
              <Ionicons name="checkbox-outline" size={13} color={Colors.primary} />
              <Text style={styles.permCountText}>{permStats.enabled}/{permStats.total} Enabled</Text>
            </View>
          </View>

          {/* Quick Global Action Buttons */}
          <View style={styles.permToolbarRow}>
            <View style={styles.permToolbarGroup}>
              <TouchableOpacity
                style={styles.toolbarBtn}
                onPress={() => handleSelectAllGlobal(permStats.enabled < permStats.total)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={permStats.enabled === permStats.total && permStats.total > 0 ? "close-circle-outline" : "checkmark-done-circle-outline"}
                  size={15}
                  color={Colors.primary}
                />
                <Text style={styles.toolbarBtnText}>
                  {permStats.enabled === permStats.total && permStats.total > 0 ? "Clear All" : "Select All"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.toolbarBtn}
                onPress={() => {
                  const anyOpen = Object.values(expandedModules).some(Boolean);
                  handleExpandAll(!anyOpen);
                }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={Object.values(expandedModules).some(Boolean) ? "contract-outline" : "expand-outline"}
                  size={15}
                  color={Colors.slate600}
                />
                <Text style={[styles.toolbarBtnText, { color: Colors.slate600 }]}>
                  {Object.values(expandedModules).some(Boolean) ? "Collapse All" : "Expand All"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Search Bar */}
          <View style={styles.permSearchBox}>
            <Ionicons name="search" size={16} color={Colors.slate400} />
            <TextInput
              style={styles.permSearchInput}
              placeholder="Search modules or menus..."
              placeholderTextColor={Colors.slate400}
              value={permSearch}
              onChangeText={setPermSearch}
            />
            {permSearch.length > 0 && (
              <TouchableOpacity onPress={() => setPermSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={16} color={Colors.slate400} />
              </TouchableOpacity>
            )}
          </View>

          {loadingPerms ? (
            <View style={styles.permLoadingWrap}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.permLoadingText}>Loading dynamic menus...</Text>
            </View>
          ) : permissions.length === 0 ? (
            <View style={styles.emptyPermsBox}>
              <Ionicons name="alert-circle-outline" size={32} color={Colors.slate400} />
              <Text style={styles.emptyPerms}>No menus configured in system.</Text>
            </View>
          ) : (
            <View style={styles.cardsGrid}>
              {filteredPermissions.map((parent) => {
                const isOpen = !!expandedModules[parent.menuID];
                const kids = parent.children || [];
                const pIcon = mapBootstrapIconToIonic(parent.icon, parent.menuName);
                const isSingle = kids.length === 0;
                const isParentStandaloneAuth = !!localAuthMap[parent.menuID];
                const enabledKids = kids.filter((k) => localAuthMap[k.menuID]).length;
                const isAllSelected = kids.length > 0 && enabledKids === kids.length;

                if (isSingle) {
                  return (
                    <TouchableOpacity
                      key={parent.menuID}
                      style={styles.moduleCard}
                      onPress={() => handleToggleParentStandalone(parent.menuID, isParentStandaloneAuth)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.moduleHeader}>
                        <View style={styles.moduleHeaderLeft}>
                          <View style={styles.moduleIconWrap}>
                            <Ionicons
                              name={pIcon}
                              size={18}
                              color={Colors.slate700}
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.moduleTitle}>
                              {parent.menuName}
                            </Text>
                          </View>
                        </View>
                        <Switch
                          value={isParentStandaloneAuth}
                          onValueChange={() =>
                            handleToggleParentStandalone(parent.menuID, isParentStandaloneAuth)
                          }
                          trackColor={{ false: '#e2e8f0', true: '#c4b5fd' }}
                          thumbColor={isParentStandaloneAuth ? Colors.primary : '#ffffff'}
                          style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
                        />
                      </View>
                    </TouchableOpacity>
                  );
                }

                return (
                  <View key={parent.menuID} style={[styles.moduleCard, isOpen && styles.moduleCardExpanded]}>
                    <TouchableOpacity
                      style={[styles.moduleHeader, isOpen && styles.moduleHeaderExpanded]}
                      onPress={() => toggleAccordion(parent.menuID)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.moduleHeaderLeft}>
                        <View style={[styles.moduleIconWrap, isOpen && styles.moduleIconWrapActive]}>
                          <Ionicons name={pIcon} size={18} color={isOpen ? Colors.primary : Colors.slate700} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.moduleTitle} numberOfLines={1}>
                            {parent.menuName}
                          </Text>
                          <Text style={styles.moduleMetaText}>
                            {enabledKids} of {kids.length} enabled
                          </Text>
                        </View>
                      </View>

                      <View style={styles.moduleHeaderRight}>
                        <View style={[styles.moduleBadge, enabledKids > 0 && styles.moduleBadgeActive]}>
                          <Text style={[styles.moduleBadgeText, enabledKids > 0 && styles.moduleBadgeTextActive]}>
                            {enabledKids}/{kids.length}
                          </Text>
                        </View>
                        <View style={styles.chevronWrap}>
                          <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.slate500} />
                        </View>
                      </View>
                    </TouchableOpacity>

                    {isOpen && (
                      <View style={styles.moduleBody}>
                        <View style={styles.moduleSubHeaderRow}>
                          <Text style={styles.subHeaderCountText}>Sub-menus ({kids.length})</Text>
                          <TouchableOpacity
                            style={styles.moduleSelectAllBtn}
                            onPress={() => toggleModuleSelectAll(parent, kids, isAllSelected)}
                            activeOpacity={0.7}
                          >
                            <Ionicons
                              name={isAllSelected ? 'checkbox' : 'square-outline'}
                              size={18}
                              color={isAllSelected ? Colors.primary : Colors.slate500}
                            />
                            <Text
                              style={[
                                styles.moduleSelectAllText,
                                isAllSelected && { color: Colors.primary, fontWeight: '700' },
                              ]}
                            >
                              {isAllSelected ? 'Deselect All' : 'Select All'}
                            </Text>
                          </TouchableOpacity>
                        </View>

                        {kids.map((child, idx) => {
                          const cAuth = !!localAuthMap[child.menuID];
                          const isLast = idx === kids.length - 1;
                          return (
                            <View key={child.menuID} style={[styles.childRow, isLast && { borderBottomWidth: 0 }]}>
                              <View style={styles.childInfo}>
                                <Text style={[styles.childTitle, cAuth && styles.childTitleActive]}>
                                  {child.menuName}
                                </Text>
                                {child.action ? (
                                  <Text style={styles.childActionText} numberOfLines={1}>
                                    {child.action}
                                  </Text>
                                ) : null}
                              </View>
                              <Switch
                                value={cAuth}
                                onValueChange={() => handleToggleChild(child.menuID, cAuth, parent.menuID)}
                                trackColor={{ false: '#e2e8f0', true: '#c4b5fd' }}
                                thumbColor={cAuth ? Colors.primary : '#ffffff'}
                                style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
                              />
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* ───── Action Buttons ───── */}
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity style={styles.resetButton} onPress={handleReset} activeOpacity={0.7} disabled={saving}>
            <Ionicons name="refresh-outline" size={18} color={Colors.slate600} />
            <Text style={styles.resetButtonText}>Reset</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} activeOpacity={0.8} disabled={saving}>
            {saving ? <ActivityIndicator color={Colors.textInverse} size="small" /> : (
              <>
                <Ionicons name={isEditing ? 'checkmark-done' : 'save-outline'} size={20} color={Colors.textInverse} />
                <Text style={styles.submitButtonText}>{isEditing ? 'Update' : 'Save'}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {isEditing && (
          <TouchableOpacity style={styles.deleteButton} onPress={() => setDeleteModalVisible(true)} activeOpacity={0.75}>
            <Ionicons name="trash-outline" size={18} color={Colors.danger} />
            <Text style={styles.deleteButtonText}>Delete User</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Delete Modal */}
      <ConfirmationModal visible={deleteModalVisible} title="Delete User" message={`Are you sure you want to delete "${fullName || username}"?`} confirmText="Delete" cancelText="Cancel" isDestructive loading={deleting} icon="trash" onConfirm={handleDeleteUser} onCancel={() => setDeleteModalVisible(false)} />

      {/* Company Selection Modal */}
      <Modal visible={companyModalVisible} animationType="slide" transparent={true} onRequestClose={() => setCompanyModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <View style={styles.modalTitleIconBox}><Ionicons name="business" size={18} color={Colors.primary} /></View>
                <View><Text style={styles.modalTitle}>Assign Companies</Text><Text style={styles.modalSubTitle}>Select companies & assign default</Text></View>
              </View>
              <TouchableOpacity onPress={() => setCompanyModalVisible(false)} style={styles.modalCloseBtn}><Ionicons name="close" size={20} color={Colors.slate600} /></TouchableOpacity>
            </View>

            <View style={styles.modalSearchBox}>
              <Ionicons name="search-outline" size={17} color={Colors.slate400} />
              <TextInput style={styles.modalSearchInput} placeholder="Search company by name or city..." placeholderTextColor={Colors.slate400} value={companySearch} onChangeText={setCompanySearch} />
            </View>

            <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
              {filteredCompanies.length === 0 ? (
                <View style={styles.emptyList}><Ionicons name="alert-circle-outline" size={32} color={Colors.slate400} /><Text style={styles.emptyListText}>No companies match "{companySearch}"</Text></View>
              ) : (
                filteredCompanies.map((comp) => {
                  const isSelected = selectedCompanyIds.includes(comp.companyID);
                  const isDefault = defaultCompanyId === comp.companyID;
                  return (
                    <View key={comp.companyID} style={[styles.companyRow, isSelected ? styles.companyRowSelected : null]}>
                      <TouchableOpacity style={styles.companyRowMain} onPress={() => handleToggleCompany(comp.companyID)} activeOpacity={0.7}>
                        <Ionicons name={isSelected ? 'checkbox' : 'square-outline'} size={22} color={isSelected ? Colors.primary : Colors.slate400} />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={[styles.companyRowName, isSelected ? styles.companyRowNameSelected : null]} numberOfLines={1}>{comp.companyName}</Text>
                          {comp.city ? <Text style={styles.companyRowCity}>{comp.city}</Text> : null}
                        </View>
                      </TouchableOpacity>

                      {isSelected ? (
                        isDefault ? (
                          <View style={styles.activeDefaultBadge}><Ionicons name="star" size={12} color="#15803d" /><Text style={styles.activeDefaultBadgeText}>Default</Text></View>
                        ) : (
                          <TouchableOpacity style={styles.setDefaultBtn} onPress={() => handleSetDefaultCompany(comp.companyID)} activeOpacity={0.7}>
                            <Ionicons name="star-outline" size={13} color={Colors.primary} /><Text style={styles.setDefaultBtnText}>Set Default</Text>
                          </TouchableOpacity>
                        )
                      ) : null}
                    </View>
                  );
                })
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalFooterSelectedCount}>{selectedCompanyIds.length} {selectedCompanyIds.length === 1 ? 'Company' : 'Companies'} Assigned</Text>
                {defaultCompanyId ? <Text style={styles.modalFooterDefaultInfo} numberOfLines={1}>Default: {selectedDefaultCompanyName}</Text> : null}
              </View>
              <TouchableOpacity style={styles.modalDoneBtn} onPress={() => setCompanyModalVisible(false)}><Text style={styles.modalDoneBtnText}>Done</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal visible={successModalVisible} transparent animationType="fade">
        <View style={styles.successBackdrop}>
          <View style={styles.successModalCard}>
            <View style={styles.successIconCircle}><Ionicons name="checkmark" size={32} color="#ffffff" /></View>
            <Text style={styles.successTitle}>Saved Successfully</Text>
            <Text style={styles.successSubtitle}>{successMessage}</Text>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

// ============================================================
// STYLES
// ============================================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flexOne: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: 16, paddingBottom: 180 },

  // Section Cards
  sectionCard: { backgroundColor: Colors.surface, borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: Colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  sectionIconWrap: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#f5f3ff', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },

  // Form Fields
  fieldWrapper: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.slate800, marginBottom: 6 },
  requiredAsterisk: { color: Colors.danger, fontWeight: '700' },
  errorText: { fontSize: 12, color: Colors.danger, marginTop: 4 },

  // Company Selector
  companySelectorTrigger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, backgroundColor: '#ffffff', paddingHorizontal: 12, paddingVertical: 10 },
  companySelectorTriggerError: { borderColor: Colors.danger },
  companySelectorLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingRight: 6 },
  companySelectorRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  companySelectorText: { fontSize: 14, fontWeight: '600', color: Colors.slate900, maxWidth: 200 },
  companySelectorPlaceholder: { fontSize: 14, color: Colors.slate400 },
  defaultPill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#fef3c7', borderWidth: 0.5, borderColor: '#f59e0b', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 1.5 },
  defaultPillText: { fontSize: 10, fontWeight: '800', color: '#b45309', textTransform: 'uppercase' },
  allocatedCountPill: { backgroundColor: '#ede9fe', borderWidth: 0.5, borderColor: '#c4b5fd', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 1.5 },
  allocatedCountPillText: { fontSize: 10, fontWeight: '700', color: Colors.primary },
  passwordWrapper: { position: 'relative' },
  eyeBtn: { position: 'absolute', right: 12, top: 36, zIndex: 10, padding: 4 },

  // Action Buttons
  actionButtonsRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  resetButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 50, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, gap: 8 },
  resetButtonText: { fontSize: 15, fontWeight: '600', color: Colors.slate700 },
  submitButton: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 50, borderRadius: 12, backgroundColor: Colors.primary, gap: 8, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
  submitButtonText: { fontSize: 15, fontWeight: '700', color: Colors.textInverse },
  deleteButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 48, borderRadius: 12, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', gap: 8, marginTop: 12 },
  deleteButtonText: { fontSize: 14, fontWeight: '700', color: Colors.danger },

  // Permissions (Module-Wise Collapsible Cards)
  permissionsWrapper: { marginBottom: 16 },
  permHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingHorizontal: 4 },
  permHeaderIconBox: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#ede9fe', alignItems: 'center', justifyContent: 'center' },
  permMainTitle: { fontSize: 17, fontWeight: '800', color: Colors.slate900 },
  permSubTitle: { fontSize: 11, color: Colors.slate500, marginTop: 1 },
  permCountPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#f5f3ff', borderWidth: 1, borderColor: '#ddd6fe', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14 },
  permCountText: { fontSize: 11.5, fontWeight: '700', color: Colors.primary },
  
  permToolbarRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 10, paddingHorizontal: 4 },
  permToolbarGroup: { flexDirection: 'row', gap: 8 },
  toolbarBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 5, paddingHorizontal: 10, backgroundColor: '#ffffff', borderRadius: 8, borderWidth: 1, borderColor: Colors.borderLight },
  toolbarBtnText: { fontSize: 11.5, fontWeight: '700', color: Colors.primary },

  permSearchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 10, paddingHorizontal: 12, height: 44, borderWidth: 1, borderColor: Colors.border, marginBottom: 14 },
  permSearchInput: { flex: 1, marginLeft: 8, fontSize: 13.5, color: Colors.slate800, paddingVertical: 0 },
  
  permLoadingWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24, backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1, borderColor: Colors.borderLight },
  permLoadingText: { fontSize: 13, color: Colors.slate600, fontWeight: '600' },
  emptyPermsBox: { alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1, borderColor: Colors.borderLight, gap: 8 },
  emptyPerms: { textAlign: 'center', color: Colors.slate500, fontSize: 13 },

  cardsGrid: { flexDirection: 'column', gap: 10 },
  moduleCard: { backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  moduleCardExpanded: { borderColor: '#c4b5fd' },
  moduleHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 14, backgroundColor: '#fcfcfc' },
  moduleHeaderExpanded: { backgroundColor: '#fbfaff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  moduleHeaderLeft: { flex: 1, flexDirection: 'row', 
    
    
    alignItems: 'center', gap: 10, paddingRight: 8 },
  moduleIconWrap: { width: 34, height: 34, borderRadius: 9, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  moduleIconWrapActive: { backgroundColor: '#ede9fe' },
  moduleTitle: { fontSize: 14.5, fontWeight: '700', color: Colors.slate900 },
  moduleMetaText: { fontSize: 11, color: Colors.slate500, marginTop: 1 },
  moduleHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  moduleBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
  moduleBadgeActive: { backgroundColor: '#ede9fe' },
  moduleBadgeText: { fontSize: 10.5, fontWeight: '700', color: Colors.slate600 },
  moduleBadgeTextActive: { color: Colors.primary, fontWeight: '800' },
  chevronWrap: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },

  // Child Body
  moduleBody: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#ffffff' },
  moduleSubHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', marginBottom: 4 },
  subHeaderCountText: { fontSize: 11.5, fontWeight: '700', color: Colors.slate400, textTransform: 'uppercase' },
  moduleSelectAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 2, paddingHorizontal: 4 },
  moduleSelectAllText: { fontSize: 12, fontWeight: '600', color: Colors.slate600 },
  childRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  childInfo: { flex: 1, paddingRight: 10 },
  childTitle: { fontSize: 13.5, color: Colors.slate700, fontWeight: '500' },
  childTitleActive: { color: Colors.primary, fontWeight: '700' },
  childActionText: { fontSize: 11, color: Colors.slate400, marginTop: 1 },
  emptySubmenuRow: { paddingVertical: 12 },
  emptyModuleText: { fontSize: 12.5, color: Colors.slate500, fontStyle: 'italic' },

  // Modals (Company)
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.55)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%', paddingBottom: Platform.OS === 'ios' ? 24 : 16 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 18, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  modalTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  modalTitleIconBox: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#ede9fe', alignItems: 'center', justifyContent: 'center' },
  modalTitle: { fontSize: 16, fontWeight: '700', color: Colors.slate900 },
  modalSubTitle: { fontSize: 11, color: Colors.slate500, marginTop: 1 },
  modalCloseBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.slate100, alignItems: 'center', justifyContent: 'center' },
  modalSearchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: Colors.border, borderRadius: 10, marginHorizontal: 16, marginVertical: 12, paddingHorizontal: 12, height: 42, gap: 8 },
  modalSearchInput: { flex: 1, fontSize: 13, color: Colors.slate900, paddingVertical: 0 },
  modalList: { paddingHorizontal: 16, maxHeight: 340 },
  companyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: Colors.borderLight, backgroundColor: '#ffffff', marginBottom: 8 },
  companyRowSelected: { borderColor: '#c4b5fd', backgroundColor: '#faf5ff' },
  companyRowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingRight: 8 },
  companyRowName: { fontSize: 14, fontWeight: '600', color: Colors.slate800 },
  companyRowNameSelected: { color: Colors.primary, fontWeight: '700' },
  companyRowCity: { fontSize: 11, color: Colors.slate400, marginTop: 2 },
  activeDefaultBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#dcfce7', borderWidth: 1, borderColor: '#86efac', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  activeDefaultBadgeText: { fontSize: 11.5, fontWeight: '800', color: '#15803d', textTransform: 'uppercase', lineHeight: 15 },
  setDefaultBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ffffff', borderWidth: 1, borderColor: Colors.primary, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  setDefaultBtnText: { fontSize: 11, fontWeight: '700', color: Colors.primary },
  emptyList: { alignItems: 'center', justifyContent: 'center', paddingVertical: 36, gap: 8 },
  emptyListText: { fontSize: 13, color: Colors.slate500 },
  modalFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.borderLight, marginTop: 6 },
  modalFooterSelectedCount: { fontSize: 13, fontWeight: '700', color: Colors.slate900 },
  modalFooterDefaultInfo: { fontSize: 11, color: '#b45309', fontWeight: '600', marginTop: 2 },
  modalDoneBtn: { backgroundColor: Colors.primary, paddingHorizontal: 22, paddingVertical: 10, borderRadius: 10 },
  modalDoneBtnText: { fontSize: 13, fontWeight: '700', color: '#ffffff' },

  // Success Modal
  successBackdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.45)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  successModalCard: { width: '100%', maxWidth: 320, backgroundColor: '#ffffff', borderRadius: 20, paddingVertical: 28, paddingHorizontal: 24, alignItems: 'center', shadowColor: '#000000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
  successIconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.success, alignItems: 'center', justifyContent: 'center', marginBottom: 16, shadowColor: Colors.success, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  successTitle: { fontSize: 18, fontWeight: '800', color: Colors.slate900, marginBottom: 6, textAlign: 'center' },
  successSubtitle: { fontSize: 13, color: Colors.slate500, textAlign: 'center', lineHeight: 18 },
});