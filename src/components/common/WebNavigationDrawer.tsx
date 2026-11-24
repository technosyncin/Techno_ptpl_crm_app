import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TouchableWithoutFeedback,
  Alert,
  Dimensions,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useCompany } from '../../context/CompanyContext';
import { useMenu, MenuItemNode, getIonicIconForMenu } from '../../context/MenuContext';
import { CompanySelectorModal } from './CompanySelectorModal';
import { Colors } from '../../theme/colors';

const SCREEN_WIDTH = Dimensions.get('window').width;
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.82, 340);

interface WebNavigationDrawerProps {
  visible: boolean;
  onClose: () => void;
  navigation: any;
  currentRoute?: string;
}

export const WebNavigationDrawer: React.FC<WebNavigationDrawerProps> = ({
  visible,
  onClose,
  navigation,
  currentRoute,
}) => {
  const { user, logout } = useAuth();
  const { selectedCompany, isAllCompanies } = useCompany();
  const { rootMenus } = useMenu();

  const [expandedKeys, setExpandedKeys] = useState<{ [key: string]: boolean }>({
    'menu-Sales': true,
    'menu-Credit': true,
  });
  const [companyModalVisible, setCompanyModalVisible] = useState(false);

  const toggleExpand = (key: string) => {
    setExpandedKeys((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleNavigate = (route?: string) => {
    if (!route) return;
    onClose();
    // Navigate via navigation prop
    try {
      navigation.navigate(route);
    } catch (e) {
      console.warn('Navigation target not found:', route);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          onClose();
          await logout();
        },
      },
    ]);
  };

  const userInitial = (user?.fullName || user?.username || 'U').charAt(0).toUpperCase();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.modalRoot}>
        {/* Backdrop */}
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        {/* Drawer Content */}
        <View style={styles.drawerContainer}>
          {/* Top Brand & Close Header */}
          <View style={styles.brandHeader}>
            <View style={styles.brandLeft}>
              <Image
                source={require('../../../assets/logo.png')}
                style={styles.drawerLogo}
                resizeMode="contain"
              />
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={20} color={Colors.slate500} />
            </TouchableOpacity>
          </View>

          {/* User Profile Card (Web Style) */}
          <View style={styles.userCard}>
            <View style={styles.userCardLeft}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{userInitial}</Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName} numberOfLines={1}>
                  {user?.fullName || user?.username || 'Team Member'}
                </Text>
                <Text style={styles.userEmail} numberOfLines={1}>
                  {user?.email || user?.username || 'user@techno.com'}
                </Text>
                <View style={styles.roleBadge}>
                  <Text style={styles.roleBadgeText}>
                    {(user?.role || 'Staff').toUpperCase()}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Active Company Bar */}
          <TouchableOpacity
            style={styles.companyBar}
            onPress={() => setCompanyModalVisible(true)}
            activeOpacity={0.7}
          >
            <View style={styles.companyBarLeft}>
              <Ionicons name="business" size={16} color={Colors.primary} />
              <View style={styles.companyBarInfo}>
                <Text style={styles.companyBarLabel}>ACTIVE WORKSPACE</Text>
                <Text style={styles.companyBarName} numberOfLines={1}>
                  {isAllCompanies ? '🏢 All Companies' : selectedCompany?.companyName || 'All Companies'}
                </Text>
              </View>
            </View>
            <Ionicons name="swap-horizontal" size={16} color={Colors.primary} />
          </TouchableOpacity>

          {/* Menu Section */}
          <ScrollView style={styles.menuScroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionHeading}>MODULES & MENUS</Text>

            {/* Standard Dashboard Item */}
            <TouchableOpacity
              style={[styles.menuItem, currentRoute === 'DashboardTab' && styles.menuItemActive]}
              onPress={() => handleNavigate('DashboardTab')}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <Ionicons
                  name="grid-outline"
                  size={19}
                  color={currentRoute === 'DashboardTab' ? Colors.primary : Colors.slate600}
                />
                <Text style={[styles.menuItemText, currentRoute === 'DashboardTab' && styles.menuItemTextActive]}>
                  Dashboard
                </Text>
              </View>
            </TouchableOpacity>

            {/* Dynamic Authorized Menus Tree */}
            {rootMenus.map((root) => {
              // Skip dashboard if already added above
              if (root.menuName.toLowerCase() === 'dashboard') return null;

              const hasChildren = root.children && root.children.length > 0;
              const menuKey = `menu-${root.menuID}`;
              const isExpanded = !!expandedKeys[menuKey];
              const iconName = getIonicIconForMenu(root.icon, root.menuName);

              if (hasChildren) {
                return (
                  <View key={menuKey} style={styles.accordionContainer}>
                    <TouchableOpacity
                      style={styles.accordionHeader}
                      onPress={() => toggleExpand(menuKey)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.menuItemLeft}>
                        <Ionicons name={iconName} size={19} color={Colors.slate600} />
                        <Text style={styles.menuItemText}>{root.menuName}</Text>
                      </View>
                      <Ionicons
                        name={isExpanded ? 'chevron-down' : 'chevron-forward'}
                        size={16}
                        color={Colors.slate400}
                      />
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={styles.subItemContainer}>
                        {root.children.map((child) => {
                          const childIcon = getIonicIconForMenu(child.icon, child.menuName);
                          const isChildActive = child.route === currentRoute;
                          return (
                            <TouchableOpacity
                              key={`child-${child.menuID}`}
                              style={[styles.subItemRow, isChildActive && styles.subItemRowActive]}
                              onPress={() => handleNavigate(child.route)}
                              activeOpacity={0.7}
                            >
                              <Ionicons
                                name={childIcon}
                                size={15}
                                color={isChildActive ? Colors.primary : Colors.slate500}
                              />
                              <Text
                                style={[
                                  styles.subItemText,
                                  isChildActive && styles.subItemTextActive,
                                ]}
                              >
                                {child.menuName}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </View>
                );
              }

              // Single root menu item
              const isActive = root.route === currentRoute;
              return (
                <TouchableOpacity
                  key={menuKey}
                  style={[styles.menuItem, isActive && styles.menuItemActive]}
                  onPress={() => handleNavigate(root.route)}
                  activeOpacity={0.7}
                >
                  <View style={styles.menuItemLeft}>
                    <Ionicons
                      name={iconName}
                      size={19}
                      color={isActive ? Colors.primary : Colors.slate600}
                    />
                    <Text style={[styles.menuItemText, isActive && styles.menuItemTextActive]}>
                      {root.menuName}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}

            {/* Quick Access to Main Modules if dynamic menus are empty/loading */}
            {rootMenus.length === 0 && (
              <>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleNavigate('LeadsTab')}
                >
                  <View style={styles.menuItemLeft}>
                    <Ionicons name="funnel-outline" size={19} color={Colors.slate600} />
                    <Text style={styles.menuItemText}>Leads Management</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleNavigate('Quotations')}
                >
                  <View style={styles.menuItemLeft}>
                    <Ionicons name="document-text-outline" size={19} color={Colors.slate600} />
                    <Text style={styles.menuItemText}>Quotations</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleNavigate('CreditTab')}
                >
                  <View style={styles.menuItemLeft}>
                    <Ionicons name="wallet-outline" size={19} color={Colors.slate600} />
                    <Text style={styles.menuItemText}>Credit & Outstanding</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleNavigate('Activities')}
                >
                  <View style={styles.menuItemLeft}>
                    <Ionicons name="checkbox-outline" size={19} color={Colors.slate600} />
                    <Text style={styles.menuItemText}>Daily Activities</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleNavigate('InternalChat')}
                >
                  <View style={styles.menuItemLeft}>
                    <Ionicons name="chatbubbles-outline" size={19} color={Colors.slate600} />
                    <Text style={styles.menuItemText}>CRM Inbox (Internal Chat)</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleNavigate('Contacts')}
                >
                  <View style={styles.menuItemLeft}>
                    <Ionicons name="list-outline" size={19} color={Colors.slate600} />
                    <Text style={styles.menuItemText}>Contacts List</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleNavigate('AddContact')}
                >
                  <View style={styles.menuItemLeft}>
                    <Ionicons name="people-outline" size={19} color={Colors.slate600} />
                    <Text style={styles.menuItemText}>Update Contact</Text>
                  </View>
                </TouchableOpacity>
              </>
            )}

            <View style={styles.divider} />

            {/* Organization & Masters */}
            <Text style={styles.sectionHeading}>ORGANIZATION & MASTERS</Text>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleNavigate('AddCompany')}
            >
              <View style={styles.menuItemLeft}>
                <Ionicons name="business-outline" size={19} color={Colors.slate600} />
                <Text style={styles.menuItemText}>Company Master</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleNavigate('AddUser')}
            >
              <View style={styles.menuItemLeft}>
                <Ionicons name="people-outline" size={19} color={Colors.slate600} />
                <Text style={styles.menuItemText}>User Master</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Settings & Profile */}
            <Text style={styles.sectionHeading}>SYSTEM & PROFILE</Text>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleNavigate('UserProfile')}
            >
              <View style={styles.menuItemLeft}>
                <Ionicons name="person-outline" size={19} color={Colors.slate600} />
                <Text style={styles.menuItemText}>My Profile</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleNavigate('ServerConfig')}
            >
              <View style={styles.menuItemLeft}>
                <Ionicons name="server-outline" size={19} color={Colors.slate600} />
                <Text style={styles.menuItemText}>Server Configuration</Text>
              </View>
            </TouchableOpacity>
          </ScrollView>

          {/* Drawer Footer with Logout */}
          <View style={styles.drawerFooter}>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <Ionicons name="log-out-outline" size={18} color={Colors.danger} />
              <Text style={styles.logoutButtonText}>Sign Out</Text>
            </TouchableOpacity>
            <Text style={styles.versionText}>Techno CRM v1.0.0 (Web Sync)</Text>
          </View>
        </View>

        <CompanySelectorModal
          visible={companyModalVisible}
          onClose={() => setCompanyModalVisible(false)}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
  },
  drawerContainer: {
    width: DRAWER_WIDTH,
    height: '100%',
    backgroundColor: Colors.surface,
    paddingTop: 45,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 16,
    display: 'flex',
    flexDirection: 'column',
  },
  brandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  brandLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  drawerLogo: {
    width: 170,
    height: 48,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: Colors.slate100,
  },
  userCard: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.primaryMuted,
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.15)',
  },
  userCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: Colors.textInverse,
    fontSize: 18,
    fontWeight: '700',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.slate900,
  },
  userEmail: {
    fontSize: 11,
    color: Colors.slate600,
    marginTop: 1,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.surface,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.primary,
  },
  companyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 12,
    marginTop: 10,
    borderRadius: 10,
  },
  companyBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  companyBarInfo: {
    flex: 1,
  },
  companyBarLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.slate400,
    letterSpacing: 0.5,
  },
  companyBarName: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.slate800,
  },
  menuScroll: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  sectionHeading: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.slate400,
    letterSpacing: 0.8,
    marginTop: 10,
    marginBottom: 6,
    paddingHorizontal: 6,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 3,
  },
  menuItemActive: {
    backgroundColor: Colors.primaryMuted,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.slate700,
  },
  menuItemTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  accordionContainer: {
    marginBottom: 3,
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  subItemContainer: {
    paddingLeft: 22,
    paddingVertical: 2,
  },
  subItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginBottom: 2,
  },
  subItemRowActive: {
    backgroundColor: Colors.primaryMuted,
  },
  subItemText: {
    fontSize: 12,
    color: Colors.slate600,
    fontWeight: '500',
  },
  subItemTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
    marginHorizontal: 4,
  },
  drawerFooter: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: Colors.dangerLight,
  },
  logoutButtonText: {
    color: Colors.danger,
    fontSize: 13,
    fontWeight: '700',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 10,
    color: Colors.slate400,
    marginTop: 8,
  },
});
