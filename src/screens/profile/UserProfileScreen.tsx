import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { Header } from '../../components/common/Header';
import { Input } from '../../components/common/Input';
import { Badge } from '../../components/common/Badge';
import { userService } from '../../api/userService';
import { Colors } from '../../theme/colors';

const THEME_PRIMARY = '#645695';

interface UserProfileScreenProps {
  navigation: any;
}

export const UserProfileScreen: React.FC<UserProfileScreenProps> = ({ navigation }) => {
  const { user, logout, updateUser } = useAuth();

  // Form State matching Web CRM ProfileForm
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [mobileNo, setMobileNo] = useState(user?.mobileNo || '');
  const [profilePic, setProfilePic] = useState<string | null>(
    user?.profilePicture || user?.profilePic || null
  );

  const [saving, setSaving] = useState(false);
  const [fetchingPhoto, setFetchingPhoto] = useState(false);

  // Sync state when user changes & fetch fresh photo from DB (like Web CRM ProfileForm)
  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      setEmail(user.email || '');
      setMobileNo(user.mobileNo || '');
      setProfilePic(user.profilePicture || user.profilePic || null);

      const userId = Number(user.userID || user.id);
      if (userId > 0) {
        setFetchingPhoto(true);
        userService
          .getUserById(userId)
          .then((freshUser) => {
            if (freshUser) {
              if (freshUser.fullName) setFullName(freshUser.fullName);
              if (freshUser.email) setEmail(freshUser.email);
              if (freshUser.mobileNo) setMobileNo(freshUser.mobileNo);
              const pic =
                freshUser.profilePicture ||
                freshUser.profilePic ||
                (freshUser as any).ProfilePicture;
              if (pic) {
                setProfilePic(pic);
              }
            }
          })
          .catch((err) => {
            console.warn('Error fetching fresh profile info:', err);
          })
          .finally(() => {
            setFetchingPhoto(false);
          });
      }
    }
  }, [user?.id, user?.userID]);

  // Pick or Capture Profile Photo
  const handleSelectPhoto = () => {
    Alert.alert('Profile Photo', 'Choose an option to update your photo:', [
      {
        text: 'Take Photo',
        onPress: async () => {
          try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission Required', 'Camera permission is needed to take a photo.');
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.6,
              base64: true,
            });
            if (!result.canceled && result.assets && result.assets.length > 0) {
              const asset = result.assets[0];
              const base64Uri = asset.base64
                ? `data:image/jpeg;base64,${asset.base64}`
                : asset.uri;
              setProfilePic(base64Uri);
            }
          } catch (e) {
            console.warn('Error launching camera:', e);
          }
        },
      },
      {
        text: 'Choose from Gallery',
        onPress: async () => {
          try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission Required', 'Gallery permission is needed to select a photo.');
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.6,
              base64: true,
            });
            if (!result.canceled && result.assets && result.assets.length > 0) {
              const asset = result.assets[0];
              const base64Uri = asset.base64
                ? `data:image/jpeg;base64,${asset.base64}`
                : asset.uri;
              setProfilePic(base64Uri);
            }
          } catch (e) {
            console.warn('Error opening gallery:', e);
          }
        },
      },
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  // Save updated profile
  const handleSaveProfile = async () => {
    if (!fullName.trim()) {
      Alert.alert('Validation Error', 'Full Name cannot be empty.');
      return;
    }

    setSaving(true);
    try {
      const userId = Number(user?.userID || user?.id);
      if (userId > 0) {
        await userService.updateUser(userId, {
          fullName: fullName.trim(),
          email: email.trim(),
          mobileNo: mobileNo.trim(),
          mobile: mobileNo.trim(),
          profilePicture: profilePic,
          profilePic: profilePic,
        });
      }

      // Update auth context state and cache
      await updateUser({
        fullName: fullName.trim(),
        email: email.trim(),
        mobileNo: mobileNo.trim(),
        profilePicture: profilePic,
        profilePic: profilePic,
      });

      Alert.alert('Profile Updated', 'Your profile details have been successfully saved!');
    } catch (err: any) {
      console.warn('Error updating profile:', err);
      Alert.alert(
        'Update Failed',
        err?.response?.data?.message || err?.message || 'Failed to update profile.'
      );
    } finally {
      setSaving(false);
    }
  };

  // Sign out confirmation
  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out from Techno CRM?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  const getInitials = () => {
    if (fullName.trim()) {
      const parts = fullName.trim().split(/\s+/);
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return parts[0][0].toUpperCase();
    }
    return user?.username ? user.username[0].toUpperCase() : 'U';
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <Header
        title="My Profile"
        subtitle="Manage your personal info"
        showBack={true}
        onBack={() => navigation.goBack()}
      />

      <KeyboardAvoidingView
        style={styles.flexOne}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
        >
          {/* ========================================================================= */}
          {/* 1. HERO PROFILE CARD (Avatar with Photo Picker, Name, Role Badge)         */}
          {/* ========================================================================= */}
          <View style={styles.heroCard}>
            <View style={styles.avatarContainer}>
              <TouchableOpacity
                onPress={handleSelectPhoto}
                style={styles.avatarWrapper}
                activeOpacity={0.85}
              >
                {profilePic ? (
                  <Image source={{ uri: profilePic }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>{getInitials()}</Text>
                  </View>
                )}

                {/* Camera Overlay Icon */}
                <View style={styles.cameraBadge}>
                  <Ionicons name="camera" size={14} color="#ffffff" />
                </View>
              </TouchableOpacity>

              {fetchingPhoto && (
                <View style={styles.photoLoader}>
                  <ActivityIndicator size="small" color={THEME_PRIMARY} />
                </View>
              )}
            </View>

            <Text style={styles.heroName}>{fullName || user?.username || 'User'}</Text>
            <Text style={styles.heroEmail}>{email || 'user@technocrm.com'}</Text>

            <View style={styles.roleBadgeContainer}>
              <Badge label={user?.role || 'CRM User'} size="md" variant="primary" />
            </View>

            <TouchableOpacity
              onPress={handleSelectPhoto}
              style={styles.changePhotoBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="image-outline" size={13} color={THEME_PRIMARY} />
              <Text style={styles.changePhotoText}>Change Profile Photo</Text>
            </TouchableOpacity>
          </View>

          {/* ========================================================================= */}
          {/* 2. PROFILE INFORMATION CARD (Matching Web CRM ProfileForm.jsx)            */}
          {/* ========================================================================= */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="person-circle-outline" size={18} color={THEME_PRIMARY} />
              <Text style={styles.cardHeaderTitle}>Personal Information</Text>
            </View>

            {/* Field 1: Username (Read-Only / Fixed System Account) */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Username</Text>
              <View style={styles.readOnlyInput}>
                <Ionicons name="person-outline" size={18} color={Colors.slate400} />
                <Text style={styles.readOnlyText}>{user?.username || 'N/A'}</Text>
                <Ionicons name="lock-closed-outline" size={14} color={Colors.slate400} />
              </View>
              <Text style={styles.fieldHint}>Username is unique and cannot be modified.</Text>
            </View>

            {/* Field 2: Full Name (Editable) */}
            <View style={styles.fieldContainer}>
              <Input
                label="Full Name"
                placeholder="Enter full name"
                value={fullName}
                onChangeText={setFullName}
                required={true}
                leftIcon="create-outline"
              />
            </View>

            {/* Field 3: Email Address (Editable) */}
            <View style={styles.fieldContainer}>
              <Input
                label="Email Address"
                placeholder="Enter email address"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                leftIcon="mail-outline"
              />
            </View>

            {/* Field 4: Mobile Number (Editable) */}
            <View style={styles.fieldContainer}>
              <Input
                label="Mobile Number"
                placeholder="Enter mobile number"
                value={mobileNo}
                onChangeText={setMobileNo}
                keyboardType="phone-pad"
                leftIcon="call-outline"
              />
            </View>
          </View>

          {/* ========================================================================= */}
          {/* 3. SAVE CHANGES ACTION BUTTON                                             */}
          {/* ========================================================================= */}
          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.7 }]}
            onPress={handleSaveProfile}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Ionicons name="checkmark-done" size={20} color="#ffffff" />
                <Text style={styles.saveBtnText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>

          {/* ========================================================================= */}
          {/* 4. SIGN OUT BUTTON (Clean & Safe)                                         */}
          {/* ========================================================================= */}
          <TouchableOpacity
            style={styles.signOutBtn}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={18} color={Colors.danger} />
            <Text style={styles.signOutBtnText}>Sign Out</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  flexOne: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 180,
  },

  // 1. Hero Profile Card
  heroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarWrapper: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowColor: THEME_PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    backgroundColor: '#ede9fe',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 48,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: THEME_PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 34,
    fontWeight: '800',
    color: '#ffffff',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: THEME_PRIMARY,
    borderWidth: 2,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoLoader: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 2,
  },
  heroEmail: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 10,
  },
  roleBadgeContainer: {
    marginBottom: 12,
  },
  changePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: '#f3e8ff',
  },
  changePhotoText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME_PRIMARY,
  },

  // 2. Personal Information Card
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 12,
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  cardHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1e293b',
  },
  fieldContainer: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
  },
  readOnlyInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    gap: 10,
  },
  readOnlyText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  fieldHint: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 4,
    marginLeft: 2,
  },

  // 3. Save Changes Button
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 12,
    backgroundColor: THEME_PRIMARY,
    marginBottom: 14,
    shadowColor: THEME_PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },

  // 4. Sign Out Button
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    marginBottom: 20,
  },
  signOutBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.danger,
  },
});
