import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../api/authService';
import { getApiBaseUrl } from '../../api/client';

interface LoginScreenProps {
  navigation: any;
}

// User CRM Brand Theme Tokens
const THEME = {
  primary: '#645695',
  primaryDark: '#4c3f7a',
  primaryLight: '#ede9fe',
  primarySoft: '#f5f3ff',
  textDark: '#1e293b',
  textSecondary: '#64748b',
  borderLine: '#e2e8f0',
  inputBg: '#f8fafc',
  bgPage: '#f8f9fa',
  errorRed: '#ef4444',
  errorBg: '#fef2f2',
  successGreen: '#10b981',
  successBg: '#f0fdf4',
};

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const { login, sessionExpiredMessage, clearSessionExpiredMessage } = useAuth();

  // Login Form States
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Auto-display session expired error banner if redirected due to duplicate login on another device
  useEffect(() => {
    if (sessionExpiredMessage) {
      setError(sessionExpiredMessage);
    }
  }, [sessionExpiredMessage]);

  // Sign Up Modal States (Full Name, Mobile, Username, Password)
  const [signUpModalVisible, setSignUpModalVisible] = useState(false);
  const [signUpFullName, setSignUpFullName] = useState('');
  const [signUpMobile, setSignUpMobile] = useState('');
  const [signUpUsername, setSignUpUsername] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [signUpLoading, setSignUpLoading] = useState(false);
  const [signUpError, setSignUpError] = useState('');

  // Forgot Password Modal States
  const [forgotModalVisible, setForgotModalVisible] = useState(false);
  const [forgotMobile, setForgotMobile] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');

  // Keyboard and Scroll Handling for Login Screen
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
const scrollViewRef = useRef<React.ElementRef<typeof ScrollView>>(null);
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setIsKeyboardVisible(true);
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setIsKeyboardVisible(false);
        setKeyboardHeight(0);
      }
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleScrollToInput = (yOffset: number) => {
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: yOffset, animated: true });
    }, 120);
  };

  // Handle Login
  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password');
      return;
    }
    setError('');
    setSuccessMsg('');
    clearSessionExpiredMessage();
    setLoading(true);

    try {
      await login(username.trim(), password, rememberMe);
    } catch (err: any) {
      const serverUrl = getApiBaseUrl();
      if (err.message === 'Network Error' || err.code === 'ERR_NETWORK' || !err.response) {
        setError(`Cannot connect to CRM backend at ${serverUrl}. Please check your connection.`);
      } else {
        setError(
          err.response?.data?.message ||
          err.response?.data?.title ||
          err.message ||
          'Invalid Username or Password'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle Sign Up (User Master registration)
  const handleSignUp = async () => {
    if (!signUpFullName.trim()) {
      setSignUpError('Please enter your full name');
      return;
    }
    if (!signUpMobile.trim() || signUpMobile.trim().length < 10) {
      setSignUpError('Please enter a valid 10-digit mobile number');
      return;
    }
    if (!signUpUsername.trim() || signUpUsername.trim().length < 3) {
      setSignUpError('Please enter a username (at least 3 characters)');
      return;
    }
    if (!signUpPassword.trim() || signUpPassword.trim().length < 4) {
      setSignUpError('Password must be at least 4 characters long');
      return;
    }

    setSignUpError('');
    setSignUpLoading(true);

    try {
      const res = await authService.signUp({
        companyID: null,
        fullName: signUpFullName.trim(),
        mobile: signUpMobile.trim(),
        username: signUpUsername.trim(),
        password: signUpPassword.trim(),
      });

      if (res && res.success) {
        setSignUpModalVisible(false);
        const createdUser = signUpUsername.trim();
        const createdPass = signUpPassword.trim();
        setUsername(createdUser);
        setPassword(createdPass);
        setSuccessMsg('Account created successfully! Tap LOGIN to proceed.');
        Alert.alert('Registration Successful', `Account created for ${signUpFullName.trim()}! You can now tap LOGIN.`);
        setSignUpFullName('');
        setSignUpMobile('');
        setSignUpUsername('');
        setSignUpPassword('');
      } else {
        setSignUpError(res?.message || 'Registration failed. Please try again.');
      }
    } catch (err: any) {
      setSignUpError(err.response?.data?.message || err.message || 'Failed to create account');
    } finally {
      setSignUpLoading(false);
    }
  };

  // Handle Forgot Password
  const handleForgotPassword = async () => {
    if (!forgotMobile.trim() || forgotMobile.trim().length < 10) {
      setForgotError('Please enter your registered 10-digit mobile number');
      return;
    }
    if (!forgotNewPassword.trim() || forgotNewPassword.trim().length < 4) {
      setForgotError('New password must be at least 4 characters long');
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError('Passwords do not match');
      return;
    }

    setForgotError('');
    setForgotLoading(true);

    try {
      const res = await authService.forgotPassword({
        mobile: forgotMobile.trim(),
        newPassword: forgotNewPassword.trim(),
      });

      if (res && res.success) {
        setForgotModalVisible(false);
        setUsername(forgotMobile.trim());
        setPassword('');
        setSuccessMsg('Password updated. Please log in with your new password.');
        Alert.alert('Success', 'Password has been updated. Please log in.');
        setForgotMobile('');
        setForgotNewPassword('');
        setForgotConfirmPassword('');
      } else {
        setForgotError(res?.message || 'Password update failed');
      }
    } catch (err: any) {
      setForgotError(err.response?.data?.message || err.message || 'Failed to reset password');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: isKeyboardVisible ? keyboardHeight + 60 : 40 },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={true}
        bounces={true}
        scrollEnabled={true}
      >
        {/* ================= TOP PURPLE SECTION (SHIFTED TO TOP, COMPACT) ================= */}
        <LinearGradient
          colors={['#4c1d95', '#645695', '#7c3aed']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.topPurpleSection}
        >
          {/* Top Bar */}
          <View style={styles.topBar}>
            <View style={styles.appBadge}>
              <View style={styles.badgeDot} />
              <Text style={styles.badgeText}>CRM Mobile</Text>
            </View>
          </View>

          {/* Full Techno CRM Logo in Clean Capsule */}
          <View style={styles.logoCapsule}>
            <Image
              source={require('../../../assets/logo.png')}
              style={styles.fullLogoImage}
              resizeMode="contain"
            />
          </View>
        </LinearGradient>

        {/* ================= BOTTOM SHEET CARD ================= */}
        <View style={styles.bottomCard}>
          {/* Card Title */}
          <Text style={styles.cardTitle}>Sign In to your Account</Text>

          {/* Error Banner */}
          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={THEME.errorRed} style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.errorText}>{error}</Text>
                {error.toLowerCase().includes('connect') ? (
                  <TouchableOpacity
                    onPress={() => navigation.navigate('ServerConfig')}
                    style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 4 }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="settings-outline" size={13} color={THEME.primary} />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.primary, textDecorationLine: 'underline' }}>
                      Configure Server / Switch Endpoint
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          ) : null}

          {/* Success Banner */}
          {successMsg ? (
            <View style={styles.successBox}>
              <Ionicons name="checkmark-circle" size={16} color={THEME.successGreen} />
              <Text style={styles.successText}>{successMsg}</Text>
            </View>
          ) : null}

          {/* Username Field (No email in placeholder) */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Username</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={(text) => {
                  setUsername(text);
                  if (error) setError('');
                }}
                onFocus={() => handleScrollToInput(80)}
                placeholder="Enter username"
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
              />
              {username ? (
                <TouchableOpacity onPress={() => setUsername('')} style={styles.clearBtn}>
                  <Ionicons name="close-circle" size={16} color="#cbd5e1" />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {/* Password Field with "Forgot password?" in label row */}
          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.fieldLabel}>Password</Text>
              <TouchableOpacity
                onPress={() => {
                  setForgotError('');
                  setForgotMobile(username.trim());
                  setForgotNewPassword('');
                  setForgotConfirmPassword('');
                  setForgotModalVisible(true);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.forgotPasswordLink}>Forgot password?</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (error) setError('');
                }}
                onFocus={() => handleScrollToInput(170)}
                placeholder="Enter password"
                placeholderTextColor="#94a3b8"
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color="#94a3b8"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Remember Me Checkbox */}
          <TouchableOpacity
            style={styles.rememberRow}
            onPress={() => setRememberMe(!rememberMe)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
              {rememberMe && <Ionicons name="checkmark" size={12} color="#ffffff" />}
            </View>
            <Text style={styles.rememberText}>Remember me</Text>
          </TouchableOpacity>

          {/* LOGIN BUTTON */}
          <TouchableOpacity
            style={[styles.loginBtn, loading && { opacity: 0.7 }]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.loginBtnText}>LOGIN</Text>
            )}
          </TouchableOpacity>

          {/* Not Registered Prompt Link */}
          <View style={styles.footerPrompt}>
            <Text style={styles.promptNormal}>Not registered yet? </Text>
            <TouchableOpacity
              onPress={() => {
                setSignUpError('');
                setSignUpModalVisible(true);
              }}
            >
              <Text style={styles.promptLink}>Create an account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

        {/* ================= SIGN UP MODAL (COMPANY, FULL NAME, MOBILE, USERNAME, PASSWORD) ================= */}
        <Modal
          visible={signUpModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setSignUpModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { maxHeight: '90%' }]}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Create Account</Text>
                  <Text style={styles.modalSubtitle}>Sign up for Techno CRM User Master</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setSignUpModalVisible(false)}
                  style={styles.modalCloseBtn}
                >
                  <Ionicons name="close" size={22} color="#64748b" />
                </TouchableOpacity>
              </View>

              {signUpError ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={15} color={THEME.errorRed} />
                  <Text style={styles.errorText}>{signUpError}</Text>
                </View>
              ) : null}

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
                {/* 1. Full Name */}
                <View style={styles.modalField}>
                  <Text style={styles.fieldLabel}>Full Name *</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="person-outline" size={18} color="#94a3b8" style={{ marginLeft: 14 }} />
                    <TextInput
                      style={[styles.input, { paddingLeft: 8 }]}
                      value={signUpFullName}
                      onChangeText={(text) => {
                        setSignUpFullName(text);
                        if (signUpError) setSignUpError('');
                      }}
                      placeholder="Enter your full name"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>
                </View>

                {/* 2. Mobile Number */}
                <View style={styles.modalField}>
                  <Text style={styles.fieldLabel}>Mobile Number *</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="call-outline" size={18} color="#94a3b8" style={{ marginLeft: 14 }} />
                    <TextInput
                      style={[styles.input, { paddingLeft: 8 }]}
                      value={signUpMobile}
                      onChangeText={(text) => {
                        const clean = text.replace(/[^0-9]/g, '');
                        setSignUpMobile(clean);
                        if (signUpError) setSignUpError('');
                      }}
                      placeholder="Enter 10-digit mobile"
                      placeholderTextColor="#94a3b8"
                      keyboardType="phone-pad"
                      maxLength={10}
                    />
                  </View>
                </View>

                {/* 3. Username */}
                <View style={styles.modalField}>
                  <Text style={styles.fieldLabel}>Username *</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="at-outline" size={18} color="#94a3b8" style={{ marginLeft: 14 }} />
                    <TextInput
                      style={[styles.input, { paddingLeft: 8 }]}
                      value={signUpUsername}
                      onChangeText={(text) => {
                        setSignUpUsername(text.trim());
                        if (signUpError) setSignUpError('');
                      }}
                      placeholder="Choose username for login"
                      placeholderTextColor="#94a3b8"
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                {/* 4. Password */}
                <View style={styles.modalField}>
                  <Text style={styles.fieldLabel}>Password *</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="lock-closed-outline" size={18} color="#94a3b8" style={{ marginLeft: 14 }} />
                    <TextInput
                      style={[styles.input, { paddingLeft: 8 }]}
                      value={signUpPassword}
                      onChangeText={(text) => {
                        setSignUpPassword(text);
                        if (signUpError) setSignUpError('');
                      }}
                      placeholder="Create a password"
                      placeholderTextColor="#94a3b8"
                      secureTextEntry={!showSignUpPassword}
                    />
                    <TouchableOpacity
                      onPress={() => setShowSignUpPassword(!showSignUpPassword)}
                      style={styles.eyeBtn}
                    >
                      <Ionicons
                        name={showSignUpPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={18}
                        color="#94a3b8"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Modal Buttons */}
                <View style={styles.modalBtnRow}>
                  <TouchableOpacity
                    style={styles.modalCancelBtn}
                    onPress={() => setSignUpModalVisible(false)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalSubmitBtn, signUpLoading && { opacity: 0.7 }]}
                    onPress={handleSignUp}
                    disabled={signUpLoading}
                    activeOpacity={0.85}
                  >
                    {signUpLoading ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.modalSubmitText}>Create Account</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* ================= FORGOT PASSWORD MODAL ================= */}
        <Modal
          visible={forgotModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setForgotModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Reset Password</Text>
                  <Text style={styles.modalSubtitle}>Enter registered mobile & new password</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setForgotModalVisible(false)}
                  style={styles.modalCloseBtn}
                >
                  <Ionicons name="close" size={22} color="#64748b" />
                </TouchableOpacity>
              </View>

              {forgotError ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={15} color={THEME.errorRed} />
                  <Text style={styles.errorText}>{forgotError}</Text>
                </View>
              ) : null}

              {/* Mobile */}
              <View style={styles.modalField}>
                <Text style={styles.fieldLabel}>Registered Mobile</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    value={forgotMobile}
                    onChangeText={(text) => {
                      setForgotMobile(text.replace(/[^0-9]/g, ''));
                      if (forgotError) setForgotError('');
                    }}
                    placeholder="Enter 10-digit mobile"
                    placeholderTextColor="#94a3b8"
                    keyboardType="phone-pad"
                    maxLength={10}
                  />
                </View>
              </View>

              {/* New Password */}
              <View style={styles.modalField}>
                <Text style={styles.fieldLabel}>New Password</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    value={forgotNewPassword}
                    onChangeText={(text) => {
                      setForgotNewPassword(text);
                      if (forgotError) setForgotError('');
                    }}
                    placeholder="Enter new password"
                    placeholderTextColor="#94a3b8"
                    secureTextEntry={!showForgotNewPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowForgotNewPassword(!showForgotNewPassword)}
                    style={styles.eyeBtn}
                  >
                    <Ionicons
                      name={showForgotNewPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color="#94a3b8"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Confirm Password */}
              <View style={styles.modalField}>
                <Text style={styles.fieldLabel}>Confirm New Password</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    value={forgotConfirmPassword}
                    onChangeText={(text) => {
                      setForgotConfirmPassword(text);
                      if (forgotError) setForgotError('');
                    }}
                    placeholder="Confirm new password"
                    placeholderTextColor="#94a3b8"
                    secureTextEntry={!showForgotNewPassword}
                  />
                </View>
              </View>

              {/* Modal Buttons */}
              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setForgotModalVisible(false)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalSubmitBtn, forgotLoading && { opacity: 0.7 }]}
                  onPress={handleForgotPassword}
                  disabled={forgotLoading}
                  activeOpacity={0.85}
                >
                  {forgotLoading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.modalSubmitText}>Update</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: '#ffffff',
  },
  topPurpleSection: {
    width: '100%',
    paddingTop: 45,
    paddingBottom: 72,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  topBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  appBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4ade80',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  logoCapsule: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 22,
    paddingHorizontal: 22,
    paddingVertical: 10,
    marginTop: 20,
    marginBottom: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  fullLogoImage: {
    width: 200,
    height: 56,
  },
  bottomCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -20,
    paddingHorizontal: 22,
    paddingTop: 36,
    paddingBottom: 40,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 6,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: THEME.textDark,
    textAlign: 'center',
    marginBottom: 24,
    marginTop: 6,
    letterSpacing: -0.3,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: THEME.errorBg,
    padding: 10,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: THEME.errorRed,
    fontWeight: '500',
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: THEME.successBg,
    padding: 10,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  successText: {
    flex: 1,
    fontSize: 12,
    color: THEME.successGreen,
    fontWeight: '600',
  },
  fieldGroup: {
    marginBottom: 18,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.textDark,
    marginBottom: 6,
  },
  forgotPasswordLink: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.primary,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.inputBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.borderLine,
    height: 48,
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: THEME.textDark,
    paddingVertical: 0,
  },
  clearBtn: {
    padding: 4,
  },
  eyeBtn: {
    padding: 4,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
    marginBottom: 20,
  },
  checkbox: {
    width: 17,
    height: 17,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  checkboxActive: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary,
  },
  rememberText: {
    fontSize: 13,
    color: THEME.textSecondary,
    fontWeight: '500',
  },
  loginBtn: {
    backgroundColor: THEME.primary,
    borderRadius: 14,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 4,
  },
  loginBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.8,
  },
  footerPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  promptNormal: {
    fontSize: 13,
    color: THEME.textSecondary,
  },
  promptLink: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.primary,
  },
  /* Modals */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    gap: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: THEME.textDark,
  },
  modalSubtitle: {
    fontSize: 12,
    color: THEME.textSecondary,
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalField: {
    marginBottom: 2,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalCancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.borderLine,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.textSecondary,
  },
  modalSubmitBtn: {
    flex: 1.5,
    height: 46,
    borderRadius: 12,
    backgroundColor: THEME.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubmitText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
});
