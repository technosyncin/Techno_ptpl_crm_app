import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useCompany } from '../../context/CompanyContext';
import { useAuth } from '../../context/AuthContext';
import { CompanySelectorModal } from './CompanySelectorModal';
import { Colors } from '../../theme/colors';

export interface HeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  navigation?: any;
  currentRoute?: string;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightPress?: () => void;
  rightComponent?: React.ReactNode;
  isTransparent?: boolean;
  showCompanyBadge?: boolean;
  showCompany?: boolean;
  showUserAvatar?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  showBack,
  onBack,
  navigation: propNavigation,
  currentRoute,
  rightIcon,
  onRightPress,
  rightComponent,
  isTransparent = false,
  showCompanyBadge = true,
  showCompany = true,
  showUserAvatar = true,
}) => {
  let hookNavigation: any = null;
  try {
    hookNavigation = useNavigation();
  } catch (e) {
    // In case rendered outside a navigation container
  }
  const navigation = propNavigation || hookNavigation;

  const { selectedCompany, isAllCompanies } = useCompany();
  const { user } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);

  const isBackVisible = false;

  const shouldShowCompany = showCompanyBadge && showCompany;
  const companyLabel = isAllCompanies ? 'All Companies' : selectedCompany?.companyName || 'All Companies';
  const userInitial = (user?.fullName || user?.username || 'U').charAt(0).toUpperCase();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  const handleLogoPress = () => {
    if (navigation?.navigate) {
      navigation.navigate('Main', { screen: 'DashboardTab' });
    }
  };

  const handleAvatarPress = () => {
    if (navigation?.navigate) {
      navigation.navigate('UserProfile');
    }
  };

  const hasSubHeader = Boolean(title || rightComponent);

  return (
    <>
      <StatusBar barStyle="dark-content" />
      <View style={[styles.wrapper, isTransparent && styles.transparent]}>
        {/* Fixed Top Navbar - 100% Identical to Dashboard across all screens */}
        <View style={styles.topbarContainer}>
          {/* Left Side: Brand Logo (clean brand logo without back button) */}
          <View style={styles.leftSide}>
            <TouchableOpacity
              onPress={handleLogoPress}
              style={styles.brandRow}
              activeOpacity={0.8}
            >
              <Image
                source={require('../../../assets/boldlogo.png')}
                style={styles.logoIcon}
                resizeMode="contain"
              />
              <Text style={styles.brandTitle}>
                PTPL <Text style={styles.brandTitleHighlight}>CRM</Text>
              </Text>
            </TouchableOpacity>
          </View>

          {/* Right Side: Company Selector Pill & User Avatar */}
          <View style={styles.rightSide}>
            {shouldShowCompany && (
              <TouchableOpacity
                style={styles.companyPill}
                onPress={() => setModalVisible(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="business" size={13} color={Colors.primary} />
                <Text style={styles.companyPillText} numberOfLines={1}>
                  {companyLabel}
                </Text>
                <Ionicons name="chevron-down" size={12} color={Colors.primary} />
              </TouchableOpacity>
            )}

            {!hasSubHeader && (rightComponent ? (
              rightComponent
            ) : rightIcon ? (
              <TouchableOpacity
                onPress={onRightPress}
                style={styles.iconCircle}
                activeOpacity={0.7}
              >
                <Ionicons name={rightIcon} size={18} color={Colors.primary} />
              </TouchableOpacity>
            ) : null)}

            {showUserAvatar && (
              <TouchableOpacity
                style={styles.avatarCircle}
                onPress={handleAvatarPress}
                activeOpacity={0.7}
              >
                <Text style={styles.avatarText}>{userInitial}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Page Sub-Header Bar: Cleanly displays page title & action buttons below the fixed navbar */}
        {hasSubHeader && (
          <View style={styles.subHeaderBar}>
            <View style={styles.subHeaderTitleContainer}>
              {isBackVisible && (
                <TouchableOpacity
                  onPress={handleBack}
                  style={styles.subHeaderBackBtn}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="arrow-back" size={18} color={Colors.slate800} />
                </TouchableOpacity>
              )}
              {Boolean(title) && (
                <View style={styles.subHeaderTitleTextWrapper}>
                  <Text style={styles.subHeaderTitle} numberOfLines={1}>
                    {title}
                  </Text>
                  {subtitle ? (
                    <Text style={styles.subHeaderSubtitle} numberOfLines={1}>
                      {subtitle}
                    </Text>
                  ) : null}
                </View>
              )}
            </View>

            {rightComponent ? (
              <View style={styles.subHeaderRight}>{rightComponent}</View>
            ) : rightIcon ? (
              <TouchableOpacity
                onPress={onRightPress}
                style={styles.subHeaderActionBtn}
                activeOpacity={0.7}
              >
                <Ionicons name={rightIcon} size={18} color={Colors.primary} />
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        {/* Company Selector Modal */}
        <CompanySelectorModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
        />
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  transparent: {
    backgroundColor: 'transparent',
    borderBottomWidth: 0,
  },
  topbarContainer: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
  },
  leftSide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: Colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoIcon: {
    width: 28,
    height: 28,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.slate900,
    letterSpacing: -0.2,
  },
  brandTitleHighlight: {
    color: Colors.primary,
  },
  rightSide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  companyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.primaryMuted,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.2)',
    maxWidth: 135,
  },
  companyPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary,
    maxWidth: 80,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.surface,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarText: {
    color: Colors.textInverse,
    fontSize: 13,
    fontWeight: '700',
  },
  subHeaderBar: {
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 40,
  },
  subHeaderTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subHeaderBackBtn: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
  },
  subHeaderTitleTextWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  subHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.slate800,
    letterSpacing: -0.2,
  },
  subHeaderSubtitle: {
    fontSize: 10.5,
    fontWeight: '500',
    color: Colors.slate500,
    marginTop: 1,
  },
  subHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  subHeaderActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
