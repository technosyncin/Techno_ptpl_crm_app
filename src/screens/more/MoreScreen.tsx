import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/common/Header';
import { useAuth } from '../../context/AuthContext';
import { useCompany } from '../../context/CompanyContext';
import { useMenu } from '../../context/MenuContext';
import { apiClient } from '../../api/client';
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

export interface MenuItemData {
  menuID: number;
  menuOrderID?: number;
  menuName: string;
  parentID?: number | null;
  action?: string;
  icon?: string;
  isActive?: boolean;
}

// Exact 1:1 Mapping of Web CRM Bootstrap Icon class (bi bi-*) to Ionicons glyph name
export const mapBootstrapIconToIonic = (
  iconClass?: string,
  menuName?: string
): keyof typeof Ionicons.glyphMap => {
  const ic = (iconClass || '').toLowerCase().trim();
  const name = (menuName || '').toLowerCase().trim();

  // Dashboard & Speedometers
  if (ic.includes('speedometer') || name.includes('admin dashbord') || name.includes('admin dashboard')) return 'speedometer';
  if (ic.includes('bar-chart') || name.includes('dashboard') || name.includes('dashbord')) return 'bar-chart';

  // Company & User / Administration
  if (ic.includes('buildings') || name.includes('company')) return 'business';
  if (
    ic.includes('shield-lock') ||
    ic.includes('shield') ||
    name.includes('user master') ||
    name.includes('role') ||
    name.includes('user')
  )
    return 'shield-checkmark';

  // Sales & Leads
  if (ic.includes('person-plus') || name.includes('add lead')) return 'person-add';
  if (ic.includes('funnel') || name === 'sales') return 'funnel';
  if (ic.includes('card-checklist') || ic.includes('checklist') || name.includes('quotation') || name.includes('quatation'))
    return 'document-text';
  if (ic.includes('people') || name.includes('update contact') || name.includes('contact')) return 'people';
  if (
    ic.includes('telephone-outbound') ||
    ic.includes('telephone-inbound') ||
    ic.includes('telephone') ||
    name.includes('follow-up') ||
    name.includes('followup') ||
    name.includes('call')
  )
    return 'call';

  // Credit & Finance
  if (ic.includes('credit-card') || name.includes('credit master') || name === 'credit' || name.includes('recovery'))
    return 'card';
  if (ic.includes('plus-square') || name.includes('new transaction')) return 'add-circle';
  if (ic.includes('box-arrow-in-down') || name.includes('payment collection')) return 'arrow-down-circle';
  if (ic.includes('receipt') || name.includes('receipt')) return 'receipt';
  if (ic.includes('cash') || name.includes('payment')) return 'cash';
  if (ic.includes('clock-history') || name.includes('outstanding')) return 'time';
  if (ic.includes('file-earmark-text') || ic.includes('invoice')) return 'document';
  if (ic.includes('arrow-counterclockwise') || name.includes('return')) return 'refresh';
  if (ic.includes('journal') || name.includes('journal entry')) return 'journal';

  // Activities & Tasks
  if (ic.includes('check2-square') || ic.includes('flag') || name.includes('my task') || name.includes('task'))
    return 'checkbox';
  if (ic.includes('alarm') || name.includes('reminder') || name.includes('remainder')) return 'alarm';
  if (ic.includes('book') || name.includes('notes') || name.includes('note')) return 'book';
  if (ic.includes('chat-dots') || name.includes('crm inbox') || name.includes('inbox') || name.includes('rcs'))
    return 'chatbubbles';
  if (ic.includes('person-video') || name.includes('meeting')) return 'videocam';
  if (ic.includes('activity')) return 'pulse';

  // Messaging & Templates
  if (ic.includes('whatsapp') || name.includes('whatapp') || name.includes('whatsapp')) return 'logo-whatsapp';
  if (ic.includes('chat-text') || name.includes('sms') || name.includes('text msg')) return 'chatbox-ellipses';
  if (ic.includes('envelope') || name.includes('email') || name.includes('mail')) return 'mail';
  if (ic.includes('arrow-repeat') || name.includes('bulk messaging')) return 'repeat';
  if (ic.includes('list') || name.includes('template')) return 'list';

  // Reports & Utility
  if (ic.includes('geo-alt') || name.includes('visit')) return 'location';
  if (ic.includes('collection') || name.includes('reports') || name.includes('report')) return 'layers';
  if (ic.includes('code-slash') || name.includes('dev utility') || name.includes('menu')) return 'code-slash';
  if (ic.includes('sliders')) return 'options';

  return 'apps';
};

// Maps Web action or menu name to App navigation target
export const getNavigationTarget = (action?: string, menuName?: string) => {
  const act = (action || '').toLowerCase().trim();
  const name = (menuName || '').toLowerCase().trim();

  // Dashboards (fallback if any)
  if (act.includes('dashboard') || name.includes('dashboard') || name.includes('dashbord')) {
    return { screen: 'Main', params: { screen: 'DashboardTab' } };
  }
  // Company Master -> CompaniesList
  if (act.includes('company') || name.includes('company')) {
    return { screen: 'CompaniesList' };
  }
  // User Permission -> UserPermission
  if (
    act.includes('user-permission') ||
    act.includes('userpermission') ||
    name.includes('user permission') ||
    name.includes('user permision') ||
    name.includes('permission')
  ) {
    return { screen: 'UserPermission' };
  }
  // Users / Roles / Departments / User Master -> UsersList
  if (
    act.includes('users') ||
    act.includes('role') ||
    act.includes('department') ||
    name.includes('user master') ||
    name.includes('user')
  ) {
    return { screen: 'UsersList' };
  }
  // Leads & Add Lead
  if (name === 'add lead' || act.includes('sales/leads') || act.includes('add-lead')) {
    return { screen: 'LeadsList' };
  }
  if (act.includes('leads') || name.includes('lead')) {
    return { screen: 'Main', params: { screen: 'LeadsTab' } };
  }
  // Quotations
  if (act.includes('quatation') || act.includes('quotation') || name.includes('quotation') || name.includes('quatation')) {
    return { screen: 'Quotations' };
  }
  // Sales Follow-Up / Both Follow-Up
  if (
    act.includes('salesfollowup') ||
    act.includes('bothfollowup') ||
    act.includes('follow-up') ||
    act.includes('followup') ||
    name.includes('follow-up') ||
    name.includes('followup')
  ) {
    return { screen: 'SalesFollowUp' };
  }
  // Contacts List
  if (
    (name.includes('contact') && (name.includes('list') || act.includes('list'))) ||
    name === 'contacts list' ||
    name === 'contact list' ||
    name === 'contacts'
  ) {
    return { screen: 'Contacts' };
  }
  // Contacts (Open Update Contact Form directly like Lead)
  if (name === 'update contact' || name === 'add contact' || name.includes('contact') || act.includes('contacts')) {
    return { screen: 'Contacts' };
  }
  // Sales Reminder (Automated Lead Cadence)
  if (
    name.includes('sales reminder') ||
    act.includes('salesreminder') ||
    act.includes('sales/salesreminder')
  ) {
    return { screen: 'SalesReminder' };
  }
  // Credit Reminder (Automated Payment Cadence)
  if (
    name.includes('credit reminder') ||
    act.includes('credit-mgm/reminder-setting') ||
    act.includes('reminder-setting')
  ) {
    return { screen: 'CreditReminder' };
  }
  // Reminders
  if (act.includes('reminder') || act.includes('remainder') || name.includes('reminder') || name.includes('remainder')) {
    return { screen: 'Reminder' };
  }
  // Credit Master
  if (act.includes('credit-master') || name.includes('credit master')) {
    return { screen: 'CreditMaster' };
  }
  // New Transaction (Directly opens Doc Type selection & transaction creation like Web)
  if (
    name.includes('new transaction') ||
    act.includes('new-transaction') ||
    act.includes('newtransaction')
  ) {
    return { screen: 'NewTransaction' };
  }
  // Payment Collection / Receipts / Transactions
  if (
    act.includes('payment-collection') ||
    act.includes('receipt') ||
    act.includes('payment') ||
    name.includes('payment collection') ||
    name.includes('receipt') ||
    name.includes('invoice') ||
    act.includes('invoice')
  ) {
    return { screen: 'Receipts' };
  }
  // Outstanding reports
  if ((act.includes('reports') && act.includes('credit')) || name.includes('outstanding')) {
    return { screen: 'OutstandingReports' };
  }
  // Tasks
  if (act.includes('mytask') || name.includes('my task') || name.includes('task')) {
    return { screen: 'MyTasks' };
  }
  // Notes
  if (act.includes('notes') || name.includes('note')) {
    return { screen: 'Notes' };
  }
  // Internal Chat / Inbox
  if (act.includes('chat') || name.includes('inbox') || name.includes('chat')) {
    return { screen: 'InternalChat' };
  }
  // Calls / Meetings
  if (act.includes('calls') || act.includes('meetings') || name.includes('call') || name.includes('meeting')) {
    return { screen: 'Activities', params: { initialTab: 'Calls' } };
  }
  // Reports / Visit
  if (act.includes('visit') || act.includes('reports') || name.includes('report') || name.includes('visit')) {
    return { screen: 'Main', params: { screen: 'ReportsTab' } };
  }
  // Dev Utility / Column Auth
  if (act.includes('dev-utility') || act.includes('columnauth') || name.includes('dev utility')) {
    return { screen: 'ServerConfig' };
  }

  // Fallback to Main tab
  return { screen: 'Main' };
};

// Function to strictly exclude unwanted menus
export const isExcludedMenu = (item: {
  menuID?: number;
  parentID?: number | null;
  menuName?: string;
  action?: string;
}): boolean => {
  const id = item.menuID;
  const parentId = item.parentID;
  const name = (item.menuName || '').toLowerCase().trim();
  const act = (item.action || '').toLowerCase().trim();

  // CRITICAL: NEVER exclude New Transaction or mandatory Credit/Sales/Admin tiles under any circumstances!
  if (
    id === 60 ||
    name.includes('new transaction') ||
    name.includes('new-transaction') ||
    act.includes('new-transaction') ||
    act.includes('newtransaction')
  ) {
    return false;
  }
  if (
    id === 58 ||
    id === 20 ||
    id === 62 ||
    id === 12 ||
    id === 39 ||
    id === 27 ||
    id === 77 ||
    id === 9 ||
    id === 10 ||
    id === 99
  ) {
    return false;
  }
  if (
    name.includes('user master') ||
    name.includes('company master') ||
    name === 'company' ||
    name.includes('user permission') ||
    name.includes('user permision') ||
    act.includes('user-permission') ||
    name.includes('credit master') ||
    name.includes('payment collection') ||
    name.includes('credit reminder') ||
    name.includes('add lead') ||
    name.includes('quotation') ||
    name.includes('quatation') ||
    name.includes('update contact') ||
    name.includes('sales reminder')
  ) {
    return false;
  }

  // 1. Dashboards & Dev Utility completely removed
  if (
    id === 38 ||
    id === 34 ||
    id === 75 ||
    id === 59 ||
    id === 79 ||
    id === 80 ||
    name.includes('dashboard') ||
    name.includes('dashbord') ||
    name.includes('dev utility') ||
    name.includes('utility') ||
    act.includes('dashboard') ||
    act.includes('dashbord') ||
    act.includes('dev-utility') ||
    act.includes('columnauth')
  ) {
    return true;
  }

  // 2. All Activities (Activities module and all its submenus: My Task, Notes, CRM Inbox, Reminder, Calls, Meeting)
  if (
    id === 48 ||
    parentId === 48 ||
    parentId === 13 ||
    name === 'activities' ||
    id === 51 || // My Task
    id === 68 || // Notes
    id === 78 || // CRM Inbox
    id === 57 || // Reminder
    id === 14 || // Calls
    id === 25 || // Meeting
    act.includes('activities/') ||
    act === 'chat'
  ) {
    return true;
  }

  // 3. Sales Follow-Up, Credit Follow-Up, and general Follow-Up
  if (
    id === 74 ||
    id === 61 ||
    id === 76 ||
    name.includes('sales follow-up') ||
    name.includes('sales follow up') ||
    name.includes('credit follow-up') ||
    name.includes('credit follow up') ||
    name === 'follow-up' ||
    name === 'follow up' ||
    act.includes('salesfollowup') ||
    act.includes('bothfollowup') ||
    act.includes('credit-mgm/follow-up')
  ) {
    return true;
  }

  // 4. Reports & Visit completely removed
  if (
    id === 63 ||
    id === 53 ||
    parentId === 63 ||
    name.includes('report') ||
    name.includes('visit') ||
    act.includes('report') ||
    act.includes('visit')
  ) {
    return true;
  }

  // 5. Under Sales (Parent: 11), ONLY allow: 1. Add Lead (12), 2. Quotation List (39), 3. Update Contact (27), 4. Sales Reminder (77)
  if (parentId === 11) {
    const isAllowedSales = id === 12 || id === 39 || id === 27 || id === 77;
    if (!isAllowedSales) return true;
  }

  // 6. Under Credit (Parent: 19), ONLY allow: 1. Credit Master (58), 2. New Transaction (60), 3. Payment Collection (20), 4. Credit Reminder (62)
  if (parentId === 19) {
    const isAllowedCredit = id === 58 || id === 60 || id === 20 || id === 62;
    if (!isAllowedCredit) return true;
  }

  // 7. Root module container menus (Admin Masters, Sales, Credit, Bulk Messaging, Templates) must never be tiles
  if (
    id === 11 ||
    name === 'sales' ||
    id === 19 ||
    name === 'credit' ||
    id === 64 ||
    name === 'bulk messaging' ||
    id === 65 ||
    name === 'templates' ||
    id === 63 ||
    name === 'reports' ||
    name === 'admin masters' ||
    name === 'administration'
  ) {
    return true;
  }

  return false;
};

// Web CRM Theme Badges - All unified to the elegant Sales module theme (#645695 / #ede9fe)
const SALES_MODULE_THEME = { bg: '#ede9fe', color: '#645695', border: '#ddd6fe' };

const CATEGORY_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  'Admin Masters': SALES_MODULE_THEME,
  Sales: SALES_MODULE_THEME,
  Credit: SALES_MODULE_THEME,
  'Bulk Messaging': SALES_MODULE_THEME,
  Templates: SALES_MODULE_THEME,
  Other: SALES_MODULE_THEME,
};

interface ModuleSection {
  id: string;
  moduleName: string;
  icon: keyof typeof Ionicons.glyphMap;
  theme: { bg: string; color: string; border: string };
  isFiveTileRow?: boolean;
  items: MenuItemData[];
}

export const MoreScreen: React.FC<MoreScreenProps> = ({ navigation }) => {
  const { user, logout } = useAuth();
  const { selectedCompany, companies } = useCompany();
  const { authorizedMenuIds: contextAuthorizedMenuIds } = useMenu();

  const userRole = (user?.role || '').toLowerCase();
  const isAdmin = userRole.includes('admin') || userRole.includes('super');

  const [search, setSearch] = useState('');
  const [menus, setMenus] = useState<MenuItemData[]>([]);
  const [authorizedMenuIds, setAuthorizedMenuIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);

  // Exact menus from TSI_CRM database Menu table (with Admin Masters at top; Dashboards, Utility & Reports removed)
  const defaultTsiCrmMenus: MenuItemData[] = useMemo(
    () => [
      // Top Admin Masters (ParentID: 0) - 1. Company Master, 2. User Master, 3. User Permission
      { menuID: 9, menuOrderID: 1, menuName: 'Company Master', action: '/company', icon: 'bi bi-buildings', parentID: 0 },
      { menuID: 10, menuOrderID: 2, menuName: 'User Master', action: '/users', icon: 'bi bi-people', parentID: 0 },
      { menuID: 99, menuOrderID: 3, menuName: 'User Permission', action: '/user-permission', icon: 'bi bi-shield-lock', parentID: 0 },

      // Submenus under Sales (Parent: 11) - Exactly 4 requested tiles
      { menuID: 12, menuOrderID: 1, menuName: 'Add Lead', action: '/sales/leads', icon: 'bi-person-plus', parentID: 11 },
      { menuID: 39, menuOrderID: 2, menuName: 'Quotation List', action: 'sales/Quatation', icon: 'bi bi-card-checklist', parentID: 11 },
      { menuID: 27, menuOrderID: 3, menuName: 'Update Contact', action: 'sales/contacts', icon: 'bi bi-people', parentID: 11 },
      { menuID: 77, menuOrderID: 4, menuName: 'Sales Reminder', action: 'sales/SalesReminder', icon: 'bi bi-sliders', parentID: 11 },

      // Submenus under Credit (Parent: 19) - Exactly 4 requested tiles
      { menuID: 58, menuOrderID: 1, menuName: 'Credit Master', action: 'credit-mgm/credit-master', icon: 'bi bi-credit-card', parentID: 19 },
      { menuID: 60, menuOrderID: 2, menuName: 'New Transaction', action: 'credit-mgm/new-transaction', icon: 'bi-plus-square', parentID: 19 },
      { menuID: 20, menuOrderID: 3, menuName: 'Payment Collection', action: 'credit-mgm/payment-collection', icon: 'bi bi-box-arrow-in-down', parentID: 19 },
      { menuID: 62, menuOrderID: 4, menuName: 'Credit Reminder', action: '/credit-mgm/reminder-setting', icon: 'bi bi-sliders', parentID: 19 },

      // Submenus under Bulk Messaging (Parent: 64) - Exactly 5 tiles
      { menuID: 50, menuOrderID: 1, menuName: 'Text SMS', action: 'BulkMessaging/TextMsg', icon: 'bi bi-chat-text', parentID: 64 },
      { menuID: 55, menuOrderID: 2, menuName: 'WhatsApp', action: 'BulkMessaging/Whatapp', icon: 'bi bi-whatsapp', parentID: 64 },
      { menuID: 56, menuOrderID: 3, menuName: 'Email', action: 'BulkMessaging/Email', icon: 'bi bi-envelope-open', parentID: 64 },
      { menuID: 66, menuOrderID: 4, menuName: 'Voice Call', action: 'BulkMessaging/VoiceCall', icon: 'bi bi-telephone', parentID: 64 },
      { menuID: 67, menuOrderID: 5, menuName: 'RCS', action: 'BulkMessaging/RCSMsg', icon: 'bi bi-chat-dots', parentID: 64 },

      // Submenus under Templates (Parent: 65) - Exactly 5 tiles
      { menuID: 70, menuOrderID: 1, menuName: 'Text SMS', action: 'Templates/TextMsgTemplates', icon: 'bi bi-chat-text', parentID: 65 },
      { menuID: 72, menuOrderID: 2, menuName: 'WhatsApp', action: 'Templates/WhatappTemplates', icon: 'bi bi-whatsapp', parentID: 65 },
      { menuID: 73, menuOrderID: 3, menuName: 'Email', action: 'Templates/EmailTemplates', icon: 'bi bi-envelope-open', parentID: 65 },
      { menuID: 69, menuOrderID: 4, menuName: 'Voice Call', action: 'Templates/VoiceCallTemplates', icon: 'bi bi-telephone', parentID: 65 },
      { menuID: 71, menuOrderID: 5, menuName: 'RCS', action: 'Templates/RCSMsgTemplates', icon: 'bi bi-chat-dots', parentID: 65 },
    ],
    []
  );

  // Fetch menus dynamically and user permissions from DB
  const loadMenusAndPermissions = React.useCallback(async () => {
    if (!isAdmin && companies.length === 0) {
      setAuthorizedMenuIds(new Set());
      setMenus([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const uId = Number(user?.id || user?.userID);
      let allowed = new Set<number>();

      if (contextAuthorizedMenuIds && contextAuthorizedMenuIds.size > 0) {
        contextAuthorizedMenuIds.forEach((id) => allowed.add(id));
      }

      // 1. Fetch authorized permissions for current logged in user from MenuAuth
      if (uId && uId > 0) {
        try {
          const permRes = await userPermissionService.getUserPermissions(uId);
          if (permRes && permRes.menus) {
            const traverse = (items: UserPermissionItem[]) => {
              items.forEach((item) => {
                if (item.auth === true) {
                  allowed.add(Number(item.menuID));
                }
                if (item.children && item.children.length > 0) {
                  traverse(item.children);
                }
              });
            };
            traverse(permRes.menus);

            // Grant User Permission (99) if User Master (10) or Dev Utility (34) is authorized
            if (allowed.has(10) || allowed.has(34)) {
              allowed.add(99);
            }
          }
        } catch (permErr) {
          console.warn('Error fetching user permissions in MoreScreen:', permErr);
          // If system root admin, fallback to full admin set
          if (isAdmin && (user?.username?.toLowerCase() === 'admin' || uId === 1031)) {
            allowed = new Set<number>([9, 10, 99, 12, 39, 27, 77, 58, 60, 20, 62, 50, 55, 56, 66, 67, 70, 72, 73, 69, 71]);
          }
        }
      }

      setAuthorizedMenuIds(allowed);

      // 2. Fetch full menu list from backend
      const res = await apiClient.get('/Menu');
      if (res && res.data) {
        const list = Array.isArray(res.data) ? res.data : (res.data.data || []);
        if (list.length > 0) {
          const mapped = list
            .map((m: any) => ({
              menuID: m.MenuID || m.menuID,
              menuOrderID: m.MenuOrderID || m.menuOrderID,
              menuName: m.MenuName || m.menuName,
              parentID: m.ParentID !== undefined ? m.ParentID : m.parentID,
              action: m.Action || m.action,
              icon: m.Icon || m.icon,
              isActive: m.IsActive !== undefined ? m.IsActive : m.isActive,
            }))
            .filter((m: MenuItemData) => !isExcludedMenu(m));

          setMenus(mapped);
          return;
        }
      }
    } catch (err) {
      console.warn('Using default TSI_CRM database menu list:', err);
    } finally {
      setLoading(false);
    }
    setMenus(defaultTsiCrmMenus.filter((m) => !isExcludedMenu(m)));
  }, [user, defaultTsiCrmMenus, isAdmin, companies.length, contextAuthorizedMenuIds]);

  useEffect(() => {
    loadMenusAndPermissions();
  }, [loadMenusAndPermissions]);

  // Refresh permissions and menus whenever user navigates back to More tab
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadMenusAndPermissions();
    });
    return unsubscribe;
  }, [navigation, loadMenusAndPermissions]);

  // Determine category badge for each menu item
  const getCategoryForMenu = (item: MenuItemData): string => {
    const parentId = item.parentID;
    const name = (item.menuName || '').toLowerCase().trim();
    const act = (item.action || '').toLowerCase().trim();

    if (
      item.menuID === 10 ||
      item.menuID === 9 ||
      item.menuID === 99 ||
      name.includes('user master') ||
      name.includes('company') ||
      name.includes('user permission') ||
      name.includes('permission') ||
      name.includes('permision')
    ) {
      return 'Admin Masters';
    }
    if (
      parentId === 11 ||
      name.includes('sales') ||
      name.includes('lead') ||
      name.includes('quotation') ||
      name.includes('quatation')
    ) {
      return 'Sales';
    }
    if (
      parentId === 19 ||
      name.includes('credit') ||
      name.includes('transaction') ||
      act.includes('transaction') ||
      name.includes('collection') ||
      act.includes('credit') ||
      item.menuID === 60 ||
      item.menuID === 58 ||
      item.menuID === 20 ||
      item.menuID === 62
    ) {
      return 'Credit';
    }
    if (parentId === 64 || name.includes('messaging') || name.includes('whatapp') || name.includes('sms')) {
      return 'Bulk Messaging';
    }
    if (parentId === 65 || name.includes('template')) {
      return 'Templates';
    }
    return 'Other';
  };

  // Determine the exact Module Name for each tile (e.g. Admin Masters, Sales, Credit, Bulk Messaging, Templates)
  const getModuleName = (item: MenuItemData): string => {
    const nameLower = (item.menuName || '').toLowerCase().trim();
    const actLower = (item.action || '').toLowerCase().trim();

    if (
      item.menuID === 10 ||
      item.menuID === 9 ||
      item.menuID === 99 ||
      nameLower.includes('user master') ||
      nameLower.includes('company') ||
      nameLower.includes('user permission') ||
      nameLower.includes('permission') ||
      nameLower.includes('permision')
    ) {
      return 'Admin Masters';
    }

    if (
      item.parentID === 19 ||
      nameLower.includes('new transaction') ||
      actLower.includes('new-transaction') ||
      actLower.includes('newtransaction') ||
      nameLower.includes('credit master') ||
      nameLower.includes('payment collection') ||
      nameLower.includes('credit reminder') ||
      item.menuID === 60 ||
      item.menuID === 58 ||
      item.menuID === 20 ||
      item.menuID === 62
    ) {
      return 'Credit';
    }

    if (
      item.parentID === 11 ||
      nameLower.includes('add lead') ||
      nameLower.includes('quotation') ||
      nameLower.includes('quatation') ||
      nameLower.includes('update contact') ||
      nameLower.includes('sales reminder') ||
      item.menuID === 12 ||
      item.menuID === 39 ||
      item.menuID === 27 ||
      item.menuID === 77
    ) {
      return 'Sales';
    }

    if (item.parentID && item.parentID > 0) {
      const parent = menus.find((m) => m.menuID === item.parentID);
      if (parent && parent.menuName) {
        return parent.menuName;
      }
    }
    if (item.parentID === 64) return 'Bulk Messaging';
    if (item.parentID === 65) return 'Templates';

    return getCategoryForMenu(item);
  };

  // All actionable buttons that will be displayed as tiles (strictly authorized only)
  const allActionableButtons = useMemo(() => {
    return menus.filter((m) => {
      if (isExcludedMenu(m)) return false;
      if (!authorizedMenuIds.has(m.menuID)) return false;
      const hasChildren = menus.some((child) => child.parentID === m.menuID && !isExcludedMenu(child));
      // Pure module container roots that only hold children (like Sales, Credit, Bulk Messaging, Templates)
      // are not leaf tiles because their submenus render as tiles under their section!
      if (hasChildren) return false;
      return true;
    });
  }, [menus, authorizedMenuIds]);

  // Group tiles into module sections (Admin Masters at top, Sales, Credit, Bulk Messaging, Templates)
  const moduleSections = useMemo((): ModuleSection[] => {
    const sectionConfig: {
      id: string;
      moduleName: string;
      icon: keyof typeof Ionicons.glyphMap;
      themeKey: string;
      isFiveTileRow?: boolean;
    }[] = [
      { id: 'Admin Masters', moduleName: 'Admin Masters', icon: 'shield-checkmark', themeKey: 'Admin Masters' },
      { id: 'Sales', moduleName: 'Sales', icon: 'funnel', themeKey: 'Sales' },
      { id: 'Credit', moduleName: 'Credit', icon: 'card', themeKey: 'Credit' },
      { id: 'Bulk Messaging', moduleName: 'Bulk Messaging', icon: 'repeat', themeKey: 'Bulk Messaging', isFiveTileRow: true },
      { id: 'Templates', moduleName: 'Templates', icon: 'list', themeKey: 'Templates', isFiveTileRow: true },
    ];

    const buckets: Record<string, MenuItemData[]> = {
      'Admin Masters': [],
      Sales: [],
      Credit: [],
      'Bulk Messaging': [],
      Templates: [],
    };

    allActionableButtons.forEach((item) => {
      const mod = getModuleName(item);
      if (mod === 'Admin Masters') {
        buckets['Admin Masters'].push(item);
      } else if (mod === 'Sales') {
        buckets.Sales.push(item);
      } else if (mod === 'Credit') {
        buckets.Credit.push(item);
      } else if (mod === 'Bulk Messaging') {
        buckets['Bulk Messaging'].push(item);
      } else if (mod === 'Templates') {
        buckets.Templates.push(item);
      }
    });

    // Explicit 3 tiles for Admin Masters: 1. Company Master, 2. User Master, 3. User Permission
    const mandatoryAdminTiles: MenuItemData[] = [
      { menuID: 9, menuOrderID: 1, menuName: 'Company Master', action: '/company', icon: 'bi bi-buildings', parentID: 0 },
      { menuID: 10, menuOrderID: 2, menuName: 'User Master', action: '/users', icon: 'bi bi-people', parentID: 0 },
      { menuID: 99, menuOrderID: 3, menuName: 'User Permission', action: '/user-permission', icon: 'bi bi-shield-lock', parentID: 0 },
    ];
    const allowedAdminTiles = mandatoryAdminTiles.filter((t) => authorizedMenuIds.has(t.menuID));
    buckets['Admin Masters'] = allowedAdminTiles.map((req) => {
      const match = buckets['Admin Masters'].find(
        (m) =>
          m.menuID === req.menuID ||
          m.menuName.toLowerCase().trim() === req.menuName.toLowerCase().trim() ||
          (req.menuName === 'Company Master' && m.menuName.toLowerCase().includes('company')) ||
          (req.menuName === 'User Master' && m.menuName.toLowerCase().includes('user master')) ||
          (req.menuName === 'User Permission' &&
            (m.menuName.toLowerCase().includes('permission') ||
              m.menuName.toLowerCase().includes('permision') ||
              (m.action && m.action.toLowerCase().includes('user-permission'))))
      );
      if (match) {
        return {
          ...match,
          menuName: req.menuName,
          icon: req.icon,
          action: req.action,
        };
      }
      return req;
    });

    // Explicit 4 tiles for Sales: 1. Add Lead -> 2. Quotation List -> 3. Update Contact -> 4. Sales Reminder
    const mandatorySalesTiles: MenuItemData[] = [
      { menuID: 12, menuOrderID: 1, menuName: 'Add Lead', action: '/sales/leads', icon: 'bi-person-plus', parentID: 11 },
      { menuID: 39, menuOrderID: 2, menuName: 'Quotation List', action: 'sales/Quatation', icon: 'bi bi-card-checklist', parentID: 11 },
      { menuID: 27, menuOrderID: 3, menuName: 'Update Contact', action: 'sales/contacts', icon: 'bi bi-people', parentID: 11 },
      { menuID: 77, menuOrderID: 4, menuName: 'Sales Reminder', action: 'sales/SalesReminder', icon: 'bi bi-sliders', parentID: 11 },
    ];
    const allowedSalesTiles = mandatorySalesTiles.filter((t) => authorizedMenuIds.has(t.menuID));
    buckets.Sales = allowedSalesTiles.map((req) => {
      const match = buckets.Sales.find(
        (m) =>
          m.menuID === req.menuID ||
          m.menuName.toLowerCase().trim() === req.menuName.toLowerCase().trim() ||
          (req.menuName === 'Quotation List' && m.menuName.toLowerCase().includes('quotation')) ||
          (req.menuName === 'Update Contact' && m.menuName.toLowerCase().includes('contact')) ||
          (req.menuName === 'Sales Reminder' && m.menuName.toLowerCase().includes('reminder'))
      );
      if (match) {
        return {
          ...match,
          menuName: req.menuName,
          icon: req.icon,
        };
      }
      return req;
    });

    // Explicit 4 tiles for Credit: 1. Credit Master -> 2. New Transaction -> 3. Payment Collection -> 4. Credit Reminder
    const mandatoryCreditTiles: MenuItemData[] = [
      { menuID: 58, menuOrderID: 1, menuName: 'Credit Master', action: 'credit-mgm/credit-master', icon: 'bi bi-credit-card', parentID: 19 },
      { menuID: 60, menuOrderID: 2, menuName: 'New Transaction', action: 'credit-mgm/new-transaction', icon: 'bi-plus-square', parentID: 19 },
      { menuID: 20, menuOrderID: 3, menuName: 'Payment Collection', action: 'credit-mgm/payment-collection', icon: 'bi bi-box-arrow-in-down', parentID: 19 },
      { menuID: 62, menuOrderID: 4, menuName: 'Credit Reminder', action: '/credit-mgm/reminder-setting', icon: 'bi bi-sliders', parentID: 19 },
    ];
    const allowedCreditTiles = mandatoryCreditTiles.filter((t) => authorizedMenuIds.has(t.menuID));
    buckets.Credit = allowedCreditTiles.map((req) => {
      const match = buckets.Credit.find(
        (m) =>
          m.menuID === req.menuID ||
          m.menuName.toLowerCase().trim() === req.menuName.toLowerCase().trim() ||
          (req.menuName === 'New Transaction' &&
            (m.menuName.toLowerCase().includes('transaction') ||
              (m.action && m.action.toLowerCase().includes('transaction')))) ||
          (req.menuName === 'Credit Master' && m.menuName.toLowerCase().includes('credit master')) ||
          (req.menuName === 'Payment Collection' && m.menuName.toLowerCase().includes('collection')) ||
          (req.menuName === 'Credit Reminder' && m.menuName.toLowerCase().includes('reminder'))
      );
      if (match) {
        return {
          ...match,
          menuName: req.menuName,
          icon: req.icon,
        };
      }
      return req;
    });

    // Explicit 5 tiles for Bulk Messaging
    const mandatoryBulkTiles: MenuItemData[] = [
      { menuID: 50, menuOrderID: 1, menuName: 'Text SMS', action: 'BulkMessaging/TextMsg', icon: 'bi bi-chat-text', parentID: 64 },
      { menuID: 55, menuOrderID: 2, menuName: 'WhatsApp', action: 'BulkMessaging/Whatapp', icon: 'bi bi-whatsapp', parentID: 64 },
      { menuID: 56, menuOrderID: 3, menuName: 'Email', action: 'BulkMessaging/Email', icon: 'bi bi-envelope-open', parentID: 64 },
      { menuID: 66, menuOrderID: 4, menuName: 'Voice Call', action: 'BulkMessaging/VoiceCall', icon: 'bi bi-telephone', parentID: 64 },
      { menuID: 67, menuOrderID: 5, menuName: 'RCS', action: 'BulkMessaging/RCSMsg', icon: 'bi bi-chat-dots', parentID: 64 },
    ];
    const allowedBulkTiles = mandatoryBulkTiles.filter((t) => authorizedMenuIds.has(t.menuID));
    buckets['Bulk Messaging'] = allowedBulkTiles.map((req) => {
      const match = buckets['Bulk Messaging'].find(
        (m) =>
          m.menuID === req.menuID ||
          m.menuName.toLowerCase().trim() === req.menuName.toLowerCase().trim() ||
          (req.menuName === 'Text SMS' && m.menuName.toLowerCase().includes('sms')) ||
          (req.menuName === 'WhatsApp' && (m.menuName.toLowerCase().includes('whatsapp') || m.menuName.toLowerCase().includes('whatapp'))) ||
          (req.menuName === 'Email' && m.menuName.toLowerCase().includes('email')) ||
          (req.menuName === 'Voice Call' && m.menuName.toLowerCase().includes('voice')) ||
          (req.menuName === 'RCS' && m.menuName.toLowerCase().includes('rcs'))
      );
      if (match) {
        return {
          ...match,
          menuName: req.menuName,
          icon: req.icon,
        };
      }
      return req;
    });

    // Explicit 5 tiles for Templates
    const mandatoryTemplateTiles: MenuItemData[] = [
      { menuID: 70, menuOrderID: 1, menuName: 'Text SMS', action: 'Templates/TextMsgTemplates', icon: 'bi bi-chat-text', parentID: 65 },
      { menuID: 72, menuOrderID: 2, menuName: 'WhatsApp', action: 'Templates/WhatappTemplates', icon: 'bi bi-whatsapp', parentID: 65 },
      { menuID: 73, menuOrderID: 3, menuName: 'Email', action: 'Templates/EmailTemplates', icon: 'bi bi-envelope-open', parentID: 65 },
      { menuID: 69, menuOrderID: 4, menuName: 'Voice Call', action: 'Templates/VoiceCallTemplates', icon: 'bi bi-telephone', parentID: 65 },
      { menuID: 71, menuOrderID: 5, menuName: 'RCS', action: 'Templates/RCSMsgTemplates', icon: 'bi bi-chat-dots', parentID: 65 },
    ];
    const allowedTemplateTiles = mandatoryTemplateTiles.filter((t) => authorizedMenuIds.has(t.menuID));
    buckets.Templates = allowedTemplateTiles.map((req) => {
      const match = buckets.Templates.find(
        (m) =>
          m.menuID === req.menuID ||
          m.menuName.toLowerCase().trim() === req.menuName.toLowerCase().trim() ||
          (req.menuName === 'Text SMS' && m.menuName.toLowerCase().includes('sms')) ||
          (req.menuName === 'WhatsApp' && (m.menuName.toLowerCase().includes('whatsapp') || m.menuName.toLowerCase().includes('whatapp'))) ||
          (req.menuName === 'Email' && m.menuName.toLowerCase().includes('email')) ||
          (req.menuName === 'Voice Call' && m.menuName.toLowerCase().includes('voice')) ||
          (req.menuName === 'RCS' && m.menuName.toLowerCase().includes('rcs'))
      );
      if (match) {
        return {
          ...match,
          menuName: req.menuName,
          icon: req.icon,
        };
      }
      return req;
    });

    const q = search.trim().toLowerCase();

    return sectionConfig
      .map((cfg) => {
        let items = buckets[cfg.id] || [];
        if (q) {
          items = items.filter(
            (m) =>
              m.menuName.toLowerCase().includes(q) ||
              cfg.moduleName.toLowerCase().includes(q) ||
              (m.action && m.action.toLowerCase().includes(q))
          );
        }
        return {
          id: cfg.id,
          moduleName: cfg.moduleName,
          icon: cfg.icon,
          theme: CATEGORY_COLORS[cfg.themeKey] || CATEGORY_COLORS.Other,
          isFiveTileRow: cfg.isFiveTileRow,
          items,
        };
      })
      .filter((sec) => sec.items.length > 0);
  }, [allActionableButtons, search, menus, authorizedMenuIds]);

  const handleMenuPress = (item: MenuItemData) => {
    const target = getNavigationTarget(item.action, item.menuName);
    navigation.navigate(target.screen, target.params);
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
      <Header title="Menu" showBack={false} currentRoute="MoreTab" />

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#94a3b8" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search menus (e.g. Lead, Quotation, Task)..."
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color="#94a3b8" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Grouped Module Sections (Top heading: Sales, etc. with 3 tiles in 1 row) */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#645695" />
            <Text style={styles.loadingText}>Syncing TSI_CRM Menus...</Text>
          </View>
        ) : moduleSections.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name={search ? "search-outline" : "shield-outline"} size={38} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>{search ? "No Menus Found" : "No Menus Assigned"}</Text>
            <Text style={styles.emptySubtitle}>
              {search
                ? "Try changing your search query."
                : "No menu permissions have been assigned to your account yet. Please contact your administrator."}
            </Text>
            {search ? (
              <TouchableOpacity style={styles.clearFilterBtn} onPress={() => setSearch('')}>
                <Text style={styles.clearFilterBtnText}>Clear Search</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : (
          moduleSections.map((section) => (
            <View key={section.id} style={styles.sectionBlock}>
              {/* Module Heading: e.g. SALES */}
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionHeaderIconBox, { backgroundColor: section.theme.bg }]}>
                  <Ionicons name={section.icon} size={15} color={section.theme.color} />
                </View>
                <Text style={styles.sectionHeadingTitle}>{section.moduleName}</Text>
              </View>

              {/* Tiles Row: 5 tiles in 1 row for Bulk Messaging and Templates, standard for others */}
              <View style={section.isFiveTileRow ? styles.fiveTilesRow : styles.sectionTilesRow}>
                {section.items.map((item) => {
                  const ionicIcon = mapBootstrapIconToIonic(item.icon, item.menuName);

                  return (
                    <TouchableOpacity
                      key={`tile-${item.menuID}-${item.menuName}`}
                      style={section.isFiveTileRow ? styles.gridTileFive : styles.gridTile}
                      onPress={() => handleMenuPress(item)}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          section.isFiveTileRow ? styles.tileIconBoxFive : styles.tileIconBox,
                          { backgroundColor: section.theme.bg },
                        ]}
                      >
                        <Ionicons
                          name={ionicIcon}
                          size={section.isFiveTileRow ? 17 : 19}
                          color={section.theme.color}
                        />
                      </View>
                      <Text
                        style={section.isFiveTileRow ? styles.tileMenuNameFive : styles.tileMenuName}
                        numberOfLines={2}
                      >
                        {item.menuName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))
        )}

        {/* Logout Button */}
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
    backgroundColor: '#f8fafc',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 10,
    paddingBottom: 40,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#645695',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#645695',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  userAvatarText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1e293b',
  },
  userRole: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
  companyTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(100, 86, 149, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
    alignSelf: 'flex-start',
    gap: 4,
  },
  companyTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#645695',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1e293b',
    padding: 0,
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  sectionBlock: {
    marginBottom: 18,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeadingTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1e293b',
    letterSpacing: 0.3,
  },
  sectionCountBadge: {
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: 10,
  },
  sectionCountText: {
    fontSize: 10,
    fontWeight: '800',
  },
  sectionTilesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  fiveTilesRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    gap: 4,
  },
  gridTile: {
    width: '23.4%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 3,
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
    paddingVertical: 8,
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
    minHeight: 76,
  },
  tileIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  tileIconBoxFive: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  tileMenuName: {
    fontSize: 10,
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
    paddingVertical: 36,
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
    marginBottom: 14,
  },
  clearFilterBtn: {
    backgroundColor: '#645695',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  clearFilterBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    paddingVertical: 13,
    marginTop: 10,
    gap: 8,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#dc2626',
  },
});

