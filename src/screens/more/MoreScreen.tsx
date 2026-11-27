import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/common/Header';
import { useAuth } from '../../context/AuthContext';
import { useCompany } from '../../context/CompanyContext';
import { useMenu } from '../../context/MenuContext';
import { userPermissionService, UserPermissionItem } from '../../api/userPermissionService';
import { Colors } from '../../theme/colors';

if (
  Platform.OS === 'android' &&
  !(globalThis as any).nativeFabricUIManager &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface MoreScreenProps {
  navigation: any;
}

// Maps Web CRM Bootstrap Icon class (bi bi-*) to Ionicons glyph name
export const mapBootstrapIconToIonic = (
  iconClass?: string,
  menuName?: string
): keyof typeof Ionicons.glyphMap => {
  const ic = (iconClass || '').toLowerCase().trim();
  const name = (menuName || '').toLowerCase().trim();

  if (ic.includes('speedometer') || name.includes('dashbord') || name.includes('dashboard')) return 'bar-chart';
  if (ic.includes('buildings') || name.includes('company')) return 'business';
  if (ic.includes('shield') || name.includes('user master') || name.includes('user') || name.includes('role')) return 'shield-checkmark';
  if (ic.includes('person-plus') || name.includes('add lead')) return 'person-add';
  if (ic.includes('funnel') || name === 'sales') return 'funnel';
  if (ic.includes('card-checklist') || ic.includes('checklist') || name.includes('quotation')) return 'document-text';
  if (ic.includes('people') || name.includes('contact')) return 'people';
  if (ic.includes('alarm') || name.includes('reminder')) return 'alarm';
  if (ic.includes('credit-card') || name.includes('credit master') || name === 'credit') return 'card';
  if (ic.includes('plus-square') || name.includes('new transaction')) return 'add-circle';
  if (ic.includes('arrow') || name.includes('payment collection') || name.includes('receipt')) return 'arrow-down-circle';
  if (ic.includes('whatsapp')) return 'logo-whatsapp';
  if (ic.includes('chat') || name.includes('sms')) return 'chatbox-ellipses';
  if (ic.includes('envelope') || name.includes('email')) return 'mail';
  if (ic.includes('call') || name.includes('voice')) return 'call';
  if (ic.includes('dots') || name.includes('rcs')) return 'chatbubbles';
  if (ic.includes('repeat') || name.includes('bulk')) return 'repeat';
  if (ic.includes('list') || name.includes('template')) return 'list';
  if (ic.includes('box') || name.includes('inventory') || name.includes('stock')) return 'cube-outline';
  if (ic.includes('cart') || name.includes('order') || name.includes('purchase')) return 'cart-outline';

  return 'apps';
};

// Maps Web action or menu name to App navigation target
export const getNavigationTarget = (action?: string, menuName?: string) => {
  const act = (action || '').toLowerCase().trim();
  const name = (menuName || '').toLowerCase().trim();

  // Dashboards
  if (act.includes('dashboard') || name.includes('dashboard') || name.includes('dashbord')) {
    return { screen: 'Main', params: { screen: 'DashboardTab' } };
  }
  // Company Master -> CompaniesList
  if (act.includes('company') || name.includes('company')) {
    return { screen: 'CompaniesList' };
  }
  // Users / Roles / User Master -> UsersList
  if (
    act.includes('users') ||
    act.includes('role') ||
    act.includes('permission') ||
    name.includes('user master') ||
    name.includes('user') ||
    name.includes('role')
  ) {
    return { screen: 'UsersList' };
  }
  // Leads & Add Lead
  if (name === 'add lead' || act.includes('add-lead')) {
    return { screen: 'LeadsList' };
  }
  if (act.includes('leads') || name.includes('lead')) {
    return { screen: 'Main', params: { screen: 'LeadsTab' } };
  }
  // Quotations
  if (act.includes('quotation') || act.includes('quatation') || name.includes('quotation') || name.includes('quatation')) {
    return { screen: 'Quotations' };
  }
  // Follow-Up
  if (act.includes('follow') || name.includes('follow')) {
    return { screen: 'SalesFollowUp' };
  }
  // Contacts
  if (act.includes('contact') || name.includes('contact')) {
    return { screen: 'Contacts' };
  }
  // Sales Reminder
  if (act.includes('salesreminder') || name.includes('sales reminder')) {
    return { screen: 'SalesReminder' };
  }
  // Credit Master
  if (act.includes('credit-master') || name.includes('credit master')) {
    return { screen: 'CreditMaster' };
  }
  // New Transaction
  if (act.includes('new-transaction') || name.includes('new transaction') || name.includes('transaction')) {
    return { screen: 'NewTransaction' };
  }
  // Payment Collection / Receipts
  if (
    act.includes('receipt') ||
    act.includes('payment') ||
    name.includes('payment collection') ||
    name.includes('payment') ||
    name.includes('collection') ||
    name.includes('receipt')
  ) {
    return { screen: 'Receipts' };
  }
  // Credit Reminder
  if (act.includes('reminder-setting') || name.includes('credit reminder')) {
    return { screen: 'CreditReminder' };
  }
  // Reminders
  if (act.includes('reminder') || name.includes('reminder')) {
    return { screen: 'Reminder' };
  }
  // Tasks
  if (act.includes('task') || name.includes('task')) {
    return { screen: 'MyTasks' };
  }
  // Notes
  if (act.includes('note') || name.includes('note')) {
    return { screen: 'Notes' };
  }
  // Chat / Messages
  if (
    act.includes('chat') ||
    act.includes('msg') ||
    act.includes('sms') ||
    act.includes('whatsapp') ||
    name.includes('chat') ||
    name.includes('sms') ||
    name.includes('whatsapp')
  ) {
    return { screen: 'InternalChat' };
  }

  // Fallback to Main
  return { screen: 'Main' };
};

// Explicit string-based exclusion list for menus that should not be shown in More screen
// (e.g. Dashboard is Tab 1, Reports are in Tab 4, Dev Utility, Activities, Follow-up)
export const EXCLUDED_MENU_NAMES = [
  'dashboard',
  'dashbord',
  'admin dashbord',
  'admin dashboard',
  'report',
  'reports',
  'visit report',
  'outstanding report',
  'dev utility',
  'devutility',
  'column auth',
  'columnauth',
  'server config',
  'activities',
  'activity',
  'follow-up',
  'followup',
  'both follow-up',
  'bothfollowup',
];

export const isExcludedMenuString = (
  menuName?: string,
  action?: string,
  parentName?: string
): boolean => {
  const name = (menuName || '').toLowerCase().trim();
  const act = (action || '').toLowerCase().trim();
  const parent = (parentName || '').toLowerCase().trim();

  // Exclude entire modules that should not be on More screen:
  // Activities, Reports (already on Report tab), Dashboard (Tab 1), Dev Utility
  if (
    parent.includes('activit') ||
    parent.includes('report') ||
    parent.includes('dashbord') ||
    parent.includes('dashboard') ||
    parent.includes('dev utility') ||
    parent.includes('utility') ||
    parent.includes('column auth') ||
    name === 'activities' ||
    name === 'activity' ||
    name === 'crm inbox' ||
    name === 'notes' ||
    name === 'my task' ||
    name === 'mytask' ||
    name === 'reminder' ||
    name === 'remainder'
  ) {
    return true;
  }

  // NEVER exclude any of the screenshot menus under any circumstances
  if (
    name.includes('company') ||
    name.includes('user master') ||
    name.includes('lead') ||
    name.includes('quotation') ||
    name.includes('quatation') ||
    name.includes('contact') ||
    name.includes('transaction') ||
    name.includes('credit master') ||
    name.includes('payment') ||
    name.includes('collection') ||
    name.includes('receipt') ||
    name.includes('sales reminder') ||
    name.includes('credit reminder') ||
    name.includes('text sms') ||
    name.includes('whatsapp') ||
    name.includes('email') ||
    name.includes('voice') ||
    name.includes('rcs')
  ) {
    return false;
  }

  // String-based validation check
  return EXCLUDED_MENU_NAMES.some((ex) => name === ex || name.includes(ex) || act.includes(ex));
};

export interface LayoutTileConfig {
  key: string;
  defaultMenuID: number;
  menuName: string;
  icon: keyof typeof Ionicons.glyphMap;
  action: string;
  screen: string;
  params?: any;
  matchPatterns: string[];
}

export interface LayoutSectionConfig {
  id: string;
  moduleName: string;
  icon: keyof typeof Ionicons.glyphMap;
  isFiveTileRow?: boolean;
  tiles: LayoutTileConfig[];
}

// Blueprint matching user reference screenshot layout
const SCREENSHOT_LAYOUT_BLUEPRINT: LayoutSectionConfig[] = [
  {
    id: 'Admin Masters',
    moduleName: 'Admin Masters',
    icon: 'shield-checkmark',
    tiles: [
      {
        key: 'company-master',
        defaultMenuID: 9,
        menuName: 'Company Master',
        icon: 'business',
        action: '/company',
        screen: 'CompaniesList',
        matchPatterns: ['company', 'company master', '/company'],
      },
      {
        key: 'user-master',
        defaultMenuID: 10,
        menuName: 'User Master',
        icon: 'shield-checkmark',
        action: '/users',
        screen: 'UsersList',
        matchPatterns: ['user master', 'users', 'user', 'role', '/users'],
      },
    ],
  },
  {
    id: 'Sales',
    moduleName: 'Sales',
    icon: 'funnel',
    tiles: [
      {
        key: 'add-lead',
        defaultMenuID: 12,
        menuName: 'Add Lead',
        icon: 'person-add',
        action: '/sales/leads',
        screen: 'LeadsList',
        matchPatterns: ['add lead', 'lead', '/sales/leads', 'sales/leads'],
      },
      {
        key: 'quotation-list',
        defaultMenuID: 39,
        menuName: 'Quotation List',
        icon: 'document-text',
        action: 'sales/Quatation',
        screen: 'Quotations',
        matchPatterns: ['quotation', 'quatation', 'quotation list'],
      },
      {
        key: 'update-contact',
        defaultMenuID: 27,
        menuName: 'Update Contact',
        icon: 'people',
        action: 'sales/contacts',
        screen: 'Contacts',
        matchPatterns: ['update contact', 'contact', 'contacts', 'contacts list'],
      },
      {
        key: 'sales-reminder',
        defaultMenuID: 77,
        menuName: 'Sales Reminder',
        icon: 'alarm',
        action: 'sales/SalesReminder',
        screen: 'SalesReminder',
        matchPatterns: ['sales reminder', 'salesreminder', 'reminder'],
      },
    ],
  },
  {
    id: 'Credit',
    moduleName: 'Credit',
    icon: 'card',
    tiles: [
      {
        key: 'credit-master',
        defaultMenuID: 58,
        menuName: 'Credit Master',
        icon: 'card',
        action: 'credit-mgm/credit-master',
        screen: 'CreditMaster',
        matchPatterns: ['credit master', 'credit-master'],
      },
      {
        key: 'new-transaction',
        defaultMenuID: 60,
        menuName: 'New Transaction',
        icon: 'add-circle',
        action: 'credit-mgm/new-transaction',
        screen: 'NewTransaction',
        matchPatterns: ['new transaction', 'new-transaction', 'transaction'],
      },
      {
        key: 'payment-collection',
        defaultMenuID: 20,
        menuName: 'Payment Collection',
        icon: 'arrow-down-circle',
        action: 'credit-mgm/payment-collection',
        screen: 'Receipts',
        matchPatterns: ['payment collection', 'collection', 'payment', 'receipt'],
      },
      {
        key: 'credit-reminder',
        defaultMenuID: 62,
        menuName: 'Credit Reminder',
        icon: 'alarm',
        action: '/credit-mgm/reminder-setting',
        screen: 'CreditReminder',
        matchPatterns: ['credit reminder', 'reminder-setting'],
      },
    ],
  },
  {
    id: 'Bulk Messaging',
    moduleName: 'Bulk Messaging',
    icon: 'repeat',
    isFiveTileRow: true,
    tiles: [
      {
        key: 'bulk-sms',
        defaultMenuID: 50,
        menuName: 'Text SMS',
        icon: 'chatbox-ellipses',
        action: 'BulkMessaging/TextMsg',
        screen: 'InternalChat',
        matchPatterns: ['text msg', 'text sms', 'sms'],
      },
      {
        key: 'bulk-whatsapp',
        defaultMenuID: 55,
        menuName: 'WhatsApp',
        icon: 'logo-whatsapp',
        action: 'BulkMessaging/Whatapp',
        screen: 'InternalChat',
        matchPatterns: ['whatsapp', 'whatapp'],
      },
      {
        key: 'bulk-email',
        defaultMenuID: 56,
        menuName: 'Email',
        icon: 'mail',
        action: 'BulkMessaging/Email',
        screen: 'InternalChat',
        matchPatterns: ['email', 'mail'],
      },
      {
        key: 'bulk-voice',
        defaultMenuID: 66,
        menuName: 'Voice Call',
        icon: 'call',
        action: 'BulkMessaging/VoiceCall',
        screen: 'InternalChat',
        matchPatterns: ['voice call', 'voice'],
      },
      {
        key: 'bulk-rcs',
        defaultMenuID: 67,
        menuName: 'RCS',
        icon: 'chatbubbles',
        action: 'BulkMessaging/RCSMsg',
        screen: 'InternalChat',
        matchPatterns: ['rcs msg', 'rcs'],
      },
    ],
  },
  {
    id: 'Templates',
    moduleName: 'Templates',
    icon: 'list',
    isFiveTileRow: true,
    tiles: [
      {
        key: 'tmpl-sms',
        defaultMenuID: 70,
        menuName: 'Text SMS',
        icon: 'chatbox-ellipses',
        action: 'Templates/TextMsgTemplates',
        screen: 'InternalChat',
        matchPatterns: ['text msg', 'text sms', 'sms'],
      },
      {
        key: 'tmpl-whatsapp',
        defaultMenuID: 72,
        menuName: 'WhatsApp',
        icon: 'logo-whatsapp',
        action: 'Templates/WhatappTemplates',
        screen: 'InternalChat',
        matchPatterns: ['whatsapp', 'whatapp'],
      },
      {
        key: 'tmpl-email',
        defaultMenuID: 73,
        menuName: 'Email',
        icon: 'mail',
        action: 'Templates/EmailTemplates',
        screen: 'InternalChat',
        matchPatterns: ['email', 'mail'],
      },
      {
        key: 'tmpl-voice',
        defaultMenuID: 69,
        menuName: 'Voice Call',
        icon: 'call',
        action: 'Templates/VoiceCallTemplates',
        screen: 'InternalChat',
        matchPatterns: ['voice call', 'voice'],
      },
      {
        key: 'tmpl-rcs',
        defaultMenuID: 71,
        menuName: 'RCS',
        icon: 'chatbubbles',
        action: 'Templates/RCSMsgTemplates',
        screen: 'InternalChat',
        matchPatterns: ['rcs msg', 'rcs'],
      },
    ],
  },
];

export const MoreScreen: React.FC<MoreScreenProps> = ({ navigation }) => {
  const { user, logout } = useAuth();
  const { companies } = useCompany();
  const { refreshMenus } = useMenu();

  const userRole = (user?.role || '').toLowerCase();
  const isAdmin = userRole.includes('admin') || userRole.includes('super');

  const [authorizedSections, setAuthorizedSections] = useState<LayoutSectionConfig[]>([]);
  const [loading, setLoading] = useState(true);

  // Dynamic Loader: Evaluates blueprint layout AND dynamically surfaces newly created Web CRM menus!
  const loadDynamicMenus = useCallback(async () => {
    if (!isAdmin && companies.length === 0) {
      setAuthorizedSections([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const uId = Number(user?.id || (user as any)?.userID || 0);
      const res = await userPermissionService.getUserPermissions(uId);

      interface FlatPermItem {
        menuID: number;
        menuName: string;
        rawName: string;
        action: string;
        icon?: string;
        auth: boolean;
        parentID?: number | null;
        parentName: string;
      }

      const flatPerms: FlatPermItem[] = [];

      if (res && res.menus) {
        res.menus.forEach((parent) => {
          flatPerms.push({
            menuID: Number(parent.menuID),
            menuName: (parent.menuName || '').toLowerCase().trim(),
            rawName: parent.menuName || 'Menu',
            action: (parent.action || '').toLowerCase().trim(),
            icon: parent.icon,
            auth: !!parent.auth,
            parentID: 0,
            parentName: '',
          });

          if (parent.children && parent.children.length > 0) {
            parent.children.forEach((child) => {
              flatPerms.push({
                menuID: Number(child.menuID),
                menuName: (child.menuName || '').toLowerCase().trim(),
                rawName: child.menuName || 'Sub Menu',
                action: (child.action || '').toLowerCase().trim(),
                icon: child.icon,
                auth: !!child.auth,
                parentID: Number(parent.menuID),
                parentName: (parent.menuName || '').toLowerCase().trim(),
              });
            });
          }
        });
      }

      // Track which database items got matched by blueprint tiles
      const matchedDbMenuIds = new Set<number>();

      // 1. First Pass: Evaluate Blueprint layout sections and tiles
      const evaluatedSections: LayoutSectionConfig[] = SCREENSHOT_LAYOUT_BLUEPRINT.map((section) => {
        const secLower = section.id.toLowerCase();

        // If the parent module in DB is explicitly revoked (auth === false), hide the whole section
        const parentModuleInDb = flatPerms.find((p) => {
          if (p.parentID !== 0) return false;
          if (secLower.includes('sales') && p.menuName.includes('sales')) return true;
          if (secLower.includes('credit') && p.menuName.includes('credit')) return true;
          if (secLower.includes('bulk') && p.menuName.includes('bulk')) return true;
          if (secLower.includes('template') && (p.menuName.includes('template') || p.menuName.includes('templte'))) return true;
          return false;
        });
        if (parentModuleInDb && parentModuleInDb.auth === false) {
          return {
            ...section,
            tiles: [],
          };
        }

        const allowedTiles = section.tiles.filter((tile) => {
          // Find matching database item with parent-module awareness
          const dbMatch = flatPerms.find((p) => {
            if (p.menuID === tile.defaultMenuID) return true;
            if (p.parentName) {
              if (secLower.includes('sales') && !p.parentName.includes('sales')) return false;
              if (secLower.includes('credit') && !p.parentName.includes('credit')) return false;
              if (secLower.includes('bulk') && !p.parentName.includes('bulk')) return false;
              if (secLower.includes('template') && !p.parentName.includes('template')) return false;
              if (secLower.includes('admin') && p.parentID !== 0) return false;
            }
            return tile.matchPatterns.some((pattern) => {
              const pat = pattern.toLowerCase();
              return p.menuName.includes(pat) || (p.action && p.action.includes(pat));
            });
          });

          if (dbMatch) {
            matchedDbMenuIds.add(dbMatch.menuID);
            // Strictly require auth === true from database (no admin bypass!)
            // Matches Web CRM MainLayout.jsx: if permission is removed, hide immediately
            return dbMatch.auth === true;
          }

          // If not in database permissions or no match, do not show
          return false;
        });

        return {
          ...section,
          tiles: [...allowedTiles],
        };
      });

      // 2. Second Pass: Dynamically discover ANY newly created menus from Web CRM!
      // If a new menu was created in web and granted auth, append it to its module!
      flatPerms.forEach((item) => {
        // Strictly require auth === true from database (no admin bypass!)
        if (!item.auth) return;
        if (matchedDbMenuIds.has(item.menuID)) return; // Already matched in blueprint!

        // String-based validation check to exclude menus that should not be shown in More
        // (Dashboard is Tab 1, Reports are in Tab 4, Dev Utility, Activities, Follow-up)
        if (isExcludedMenuString(item.menuName, item.action, item.parentName)) {
          return;
        }

        // Exclude root module containers (like standalone "sales", "credit" with no children)
        if (item.parentID === 0) {
          const n = item.menuName;
          if (n === 'sales' || n === 'credit' || n === 'bulk messaging' || n === 'templates') {
            return;
          }
        }

        const nav = getNavigationTarget(item.action, item.rawName);
        const dynamicTile: LayoutTileConfig = {
          key: `dynamic-${item.menuID}-${item.rawName}`,
          defaultMenuID: item.menuID,
          menuName: item.rawName,
          icon: mapBootstrapIconToIonic(item.icon, item.rawName),
          action: item.action,
          screen: nav.screen,
          params: nav.params,
          matchPatterns: [item.menuName],
        };

        const pName = item.parentName || '';

        // Safe helper to append tile only if not duplicate
        const appendIfUnique = (targetSecId: string): boolean => {
          const s = evaluatedSections.find((sec) => sec.id === targetSecId);
          if (s) {
            const alreadyExists = s.tiles.some(
              (t) =>
                t.defaultMenuID === item.menuID ||
                t.menuName.toLowerCase().trim() === item.rawName.toLowerCase().trim() ||
                (t.action && item.action && t.action.toLowerCase().trim() === item.action.toLowerCase().trim())
            );
            if (!alreadyExists) {
              s.tiles.push(dynamicTile);
            }
            matchedDbMenuIds.add(item.menuID);
            return true;
          }
          return false;
        };

        // Case A: Belongs to existing module (Sales, Credit, Bulk Messaging, Templates)
        if (pName.includes('sales')) {
          if (appendIfUnique('Sales')) return;
        }
        if (pName.includes('credit')) {
          if (appendIfUnique('Credit')) return;
        }
        if (pName.includes('bulk')) {
          if (appendIfUnique('Bulk Messaging')) return;
        }
        if (pName.includes('template')) {
          if (appendIfUnique('Templates')) return;
        }

        // Case B: Standalone Root menu -> Append to Admin Masters
        if (item.parentID === 0) {
          if (appendIfUnique('Admin Masters')) return;
        }

        // Case C: Newly created custom Parent Module in Web (e.g. Inventory, HR, etc.)
        if (item.parentName) {
          const existingSec = evaluatedSections.find(
            (sec) => sec.moduleName.toLowerCase() === item.parentName.toLowerCase()
          );
          if (existingSec) {
            const alreadyExists = existingSec.tiles.some(
              (t) =>
                t.defaultMenuID === item.menuID ||
                t.menuName.toLowerCase().trim() === item.rawName.toLowerCase().trim()
            );
            if (!alreadyExists) {
              existingSec.tiles.push(dynamicTile);
            }
          } else {
            // Create a new module section dynamically!
            const parentRecord = flatPerms.find((p) => p.menuName === item.parentName);
            evaluatedSections.push({
              id: `custom-module-${item.parentID}`,
              moduleName: parentRecord?.rawName || item.parentName.toUpperCase(),
              icon: mapBootstrapIconToIonic(parentRecord?.icon, item.parentName),
              isFiveTileRow: false,
              tiles: [dynamicTile],
            });
          }
          matchedDbMenuIds.add(item.menuID);
        }
      });

      // Filter out sections that have 0 authorized tiles
      const finalSections = evaluatedSections.filter((section) => section.tiles.length > 0);
      setAuthorizedSections(finalSections);
    } catch (err) {
      console.warn('Error dynamically evaluating MoreScreen menus:', err);
      setAuthorizedSections([]);
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin, companies.length]);

  useEffect(() => {
    loadDynamicMenus();
  }, [loadDynamicMenus]);

  // Refresh dynamic permissions whenever user navigates back to More tab
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadDynamicMenus();
      refreshMenus().catch(() => {});
    });
    return unsubscribe;
  }, [navigation, loadDynamicMenus, refreshMenus]);

  const handleTilePress = (tile: LayoutTileConfig) => {
    if (tile.params) {
      navigation.navigate(tile.screen, tile.params);
    } else {
      navigation.navigate(tile.screen);
    }
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out of Techno CRM?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* App Header with 'Menu' title */}
      <Header title="Menu" showBack={false} currentRoute="MoreTab" />

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#645695" />
            <Text style={styles.loadingText}>Loading dynamic menus...</Text>
          </View>
        ) : authorizedSections.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="shield-outline" size={38} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No Menus Assigned</Text>
            <Text style={styles.emptySubtitle}>
              No menu permissions have been assigned to your account yet. Please contact your administrator.
            </Text>
          </View>
        ) : (
          authorizedSections.map((section) => (
            <View key={section.id} style={styles.sectionBlock}>
              {/* Module Header */}
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderIconBox}>
                  <Ionicons name={section.icon} size={15} color="#645695" />
                </View>
                <Text style={styles.sectionHeadingTitle}>{section.moduleName}</Text>
              </View>

              {/* Module Tiles */}
              <View style={section.isFiveTileRow ? styles.fiveTilesRow : styles.standardTilesRow}>
                {section.tiles.map((tile) => (
                  <TouchableOpacity
                    key={tile.key}
                    style={section.isFiveTileRow ? styles.gridTileFive : styles.gridTileStandard}
                    onPress={() => handleTilePress(tile)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={section.isFiveTileRow ? styles.tileIconBoxFive : styles.tileIconBoxStandard}
                    >
                      <Ionicons
                        name={tile.icon}
                        size={section.isFiveTileRow ? 17 : 19}
                        color="#645695"
                      />
                    </View>
                    <Text
                      style={section.isFiveTileRow ? styles.tileMenuNameFive : styles.tileMenuNameStandard}
                      numberOfLines={2}
                    >
                      {tile.menuName}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))
        )}

        {/* Log Out Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={18} color="#dc2626" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 40,
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  sectionBlock: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
    paddingHorizontal: 2,
  },
  sectionHeaderIconBox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: '#ede9fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeadingTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#1e293b',
    letterSpacing: 0.2,
  },
  standardTilesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  fiveTilesRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    gap: 5,
  },
  gridTileStandard: {
    width: '22.8%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e8ecf4',
    shadowColor: '#645695',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
    minHeight: 88,
  },
  gridTileFive: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e8ecf4',
    shadowColor: '#645695',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
    minHeight: 78,
  },
  tileIconBoxStandard: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#ede9fe',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 7,
  },
  tileIconBoxFive: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#ede9fe',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  tileMenuNameStandard: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
    lineHeight: 13,
  },
  tileMenuNameFive: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
    lineHeight: 12,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginVertical: 10,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#475569',
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.2,
    borderColor: '#fca5a5',
    borderRadius: 12,
    paddingVertical: 13,
    marginTop: 8,
    marginBottom: 16,
    gap: 8,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#dc2626',
  },
});
