import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { mastersService, MenuMaster } from '../api/mastersService';
import { useAuth } from './AuthContext';
import { SafeStorage } from '../utils/storage';

const MENU_CACHE_KEY_PREFIX = 'crm_cached_menus_';

export interface MenuItemNode {
  menuID: number;
  menuOrderID: number;
  menuName: string;
  parentID: number;
  action: string;
  icon?: string;
  auth: boolean;
  children: MenuItemNode[];
  route?: string;
}

interface MenuContextType {
  menus: MenuMaster[];
  authorizedMenus: MenuMaster[];
  authorizedMenuIds: Set<number>;
  rootMenus: MenuItemNode[];
  loadingMenus: boolean;
  isMenusInitialized: boolean;
  canAccessDashboard: boolean;
  canAccessSales: boolean;
  canAccessCredit: boolean;
  canAccessReports: boolean;
  canAccessMore: boolean;
  canAccessMyTasks: boolean;
  canAccessNotes: boolean;
  canAccessCRMInbox: boolean;
  canAccessReminders: boolean;
  canAccessActivities: boolean;
  hasPermission: (menuNameOrActionOrId: string | number) => boolean;
  refreshMenus: () => Promise<void>;
}

const MenuContext = createContext<MenuContextType>({
  menus: [],
  authorizedMenus: [],
  authorizedMenuIds: new Set<number>(),
  rootMenus: [],
  loadingMenus: false,
  isMenusInitialized: false,
  canAccessDashboard: false,
  canAccessSales: false,
  canAccessCredit: false,
  canAccessReports: false,
  canAccessMore: false,
  canAccessMyTasks: false,
  canAccessNotes: false,
  canAccessCRMInbox: false,
  canAccessReminders: false,
  canAccessActivities: false,
  hasPermission: () => false,
  refreshMenus: async () => {},
});

// Helper to map menu name to React Navigation Screen name
export const getScreenForMenu = (menuName: string, action?: string): string | null => {
  const name = (menuName || '').toLowerCase().trim();
  const act = (action || '').toLowerCase().trim();

  if (name.includes('dashboard')) return 'DashboardTab';
  if (name.includes('lead') && !name.includes('source')) return 'LeadsTab';
  if (name.includes('quotation')) return 'Quotations';
  if (name.includes('follow') || name.includes('follow-up') || name.includes('followup')) return 'SalesFollowUp';
  if (name.includes('new transaction') || act.includes('new-transaction') || act.includes('newtransaction')) return 'NewTransaction';
  if (name.includes('receipt')) return 'Receipts';
  if (name.includes('outstanding')) return 'OutstandingReports';
  if (name.includes('credit')) return 'CreditTab';
  if (name.includes('activit')) return 'ActivitiesTab';
  if (
    (name.includes('contact') && (name.includes('list') || act.includes('list'))) ||
    name === 'contacts list' ||
    name === 'contact list' ||
    name === 'contacts'
  ) {
    return 'Contacts';
  }
  if (name.includes('contact')) return 'AddContact';
  if (name.includes('company') || act.includes('company')) return 'AddCompany';
  if (name.includes('user') || act.includes('user')) return 'AddUser';
  if (name.includes('profile')) return 'UserProfile';
  if (name.includes('server') || name.includes('setting') || act.includes('config')) return 'ServerConfig';

  return null;
};

// Helper to map Web Icon to Ionicons glyph
export const getIonicIconForMenu = (iconClass?: string, menuName?: string): any => {
  const name = (menuName || '').toLowerCase();
  const ic = (iconClass || '').toLowerCase();

  if (name.includes('dashboard') || ic.includes('speedometer')) return 'grid-outline';
  if (name.includes('lead') || ic.includes('funnel')) return 'funnel-outline';
  if (name.includes('quotation') || ic.includes('file-text')) return 'document-text-outline';
  if (name.includes('follow') || ic.includes('clock')) return 'time-outline';
  if (name.includes('sales') || ic.includes('cart') || ic.includes('graph')) return 'trending-up-outline';
  if (name.includes('credit') || name.includes('receipt') || ic.includes('wallet')) return 'wallet-outline';
  if (name.includes('report') || ic.includes('bar-chart')) return 'bar-chart-outline';
  if (name.includes('activit') || ic.includes('check')) return 'checkbox-outline';
  if (name.includes('contact') || ic.includes('people') || ic.includes('person')) return 'people-outline';
  if (name.includes('setting') || ic.includes('gear')) return 'settings-outline';
  if (name.includes('master') || ic.includes('collection')) return 'layers-outline';

  return 'folder-outline';
};

// Helper to build authorized menus and tree
const processMenuHierarchy = (allMenus: MenuMaster[], _isAdmin?: boolean) => {
  const authSet = new Set<number>();
  const authList: MenuMaster[] = [];

  allMenus.forEach((m) => {
    // Strictly follow database auth: no admin bypass
    const isAuth = m.auth === true;
    const isActive = m.isActive !== false;
    if (isAuth && isActive) {
      authSet.add(Number(m.menuID));
      authList.push(m);
    }
  });

  const roots = authList
    .filter((m) => !m.parentID || m.parentID === 0)
    .sort((a, b) => (a.menuOrderID || 0) - (b.menuOrderID || 0));

  const tree: MenuItemNode[] = roots.map((root) => {
    const children = authList
      .filter((m) => m.parentID === root.menuID)
      .sort((a, b) => (a.menuOrderID || 0) - (b.menuOrderID || 0))
      .map((child) => ({
        menuID: child.menuID,
        menuOrderID: child.menuOrderID,
        menuName: child.menuName,
        parentID: child.parentID,
        action: child.action,
        icon: child.icon,
        auth: true,
        children: [],
        route: getScreenForMenu(child.menuName, child.action) || undefined,
      }));

    return {
      menuID: root.menuID,
      menuOrderID: root.menuOrderID,
      menuName: root.menuName,
      parentID: root.parentID,
      action: root.action,
      icon: root.icon,
      auth: true,
      children,
      route: children.length === 0 ? getScreenForMenu(root.menuName, root.action) || undefined : undefined,
    };
  });

  return { authList, authSet, tree };
};

export const MenuProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [menus, setMenus] = useState<MenuMaster[]>([]);
  const [authorizedMenus, setAuthorizedMenus] = useState<MenuMaster[]>([]);
  const [authorizedMenuIds, setAuthorizedMenuIds] = useState<Set<number>>(new Set());
  const [rootMenus, setRootMenus] = useState<MenuItemNode[]>([]);
  const [loadingMenus, setLoadingMenus] = useState<boolean>(false);
  const [isMenusInitialized, setIsMenusInitialized] = useState<boolean>(false);

  // Instant hydration from local cache on startup
  useEffect(() => {
    if (!isAuthenticated || !user) {
      setMenus([]);
      setAuthorizedMenus([]);
      setAuthorizedMenuIds(new Set());
      setRootMenus([]);
      setIsMenusInitialized(false);
      return;
    }

    let isMounted = true;
    const hydrateFromCache = async () => {
      try {
        const userId = user.id || (user as any).userID || 0;
        const cacheKey = `${MENU_CACHE_KEY_PREFIX}${userId}`;
        const cachedStr = await SafeStorage.getItem(cacheKey);
        if (cachedStr && isMounted) {
          const cachedMenus: MenuMaster[] = JSON.parse(cachedStr);
          if (Array.isArray(cachedMenus) && cachedMenus.length > 0) {
            const role = (user.role || '').toLowerCase();
            const isAdmin = role.includes('admin') || role.includes('super');
            const { authList, authSet, tree } = processMenuHierarchy(cachedMenus, isAdmin);
            setMenus(cachedMenus);
            setAuthorizedMenus(authList);
            setAuthorizedMenuIds(authSet);
            setRootMenus(tree);
            setIsMenusInitialized(true);
          }
        }
      } catch (err) {
        console.warn('Error hydrating cached menus:', err);
      }
    };

    hydrateFromCache();
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, user?.id, (user as any)?.userID]);

  const fetchMenus = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setMenus([]);
      setAuthorizedMenus([]);
      setAuthorizedMenuIds(new Set());
      setRootMenus([]);
      setIsMenusInitialized(false);
      return;
    }

    setLoadingMenus(true);
    try {
      const userId = user.id || user.userID || 0;
      const allMenus = await mastersService.getUserMenus(userId);
      setMenus(allMenus);

      // Check if user is admin
      const role = (user.role || '').toLowerCase();
      const isAdmin = role.includes('admin') || role.includes('super');

      const { authList, authSet, tree } = processMenuHierarchy(allMenus, isAdmin);
      setAuthorizedMenus(authList);
      setAuthorizedMenuIds(authSet);
      setRootMenus(tree);

      // Save to cache for zero-latency startup on app reboot
      if (userId) {
        SafeStorage.setItem(`${MENU_CACHE_KEY_PREFIX}${userId}`, JSON.stringify(allMenus)).catch(() => {});
      }
      setIsMenusInitialized(true);
    } catch (err) {
      console.warn('Error loading dynamic menus:', err);
      setMenus([]);
      setAuthorizedMenus([]);
      setAuthorizedMenuIds(new Set());
      setRootMenus([]);
    } finally {
      setLoadingMenus(false);
      setIsMenusInitialized(true);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    fetchMenus();
  }, [fetchMenus]);

  const isAdmin = useMemo(() => {
    const role = (user?.role || '').toLowerCase();
    return role.includes('admin') || role.includes('super');
  }, [user]);

  // Specific module authorization checks matching Web CRM (Strict Database Auth)
  const canAccessDashboard = useMemo(() => {
    if (!user) return false;
    return authorizedMenus.some(
      (m) =>
        m.menuID === 38 ||
        m.menuID === 75 ||
        m.menuID === 59 ||
        m.menuID === 80 ||
        (m.action && m.action.toLowerCase().includes('dashboard')) ||
        (m.menuName && m.menuName.toLowerCase().includes('dashboard'))
    );
  }, [user, authorizedMenus]);

  const canAccessSales = useMemo(() => {
    if (!user) return false;
    return authorizedMenus.some(
      (m) =>
        m.parentID === 11 ||
        m.menuID === 11 ||
        m.menuID === 12 ||
        m.menuID === 39 ||
        m.menuID === 27 ||
        m.menuID === 77 ||
        m.menuID === 74 ||
        (m.action && m.action.toLowerCase().includes('sales')) ||
        (m.menuName && m.menuName.toLowerCase().includes('lead')) ||
        (m.menuName && m.menuName.toLowerCase().includes('sales')) ||
        (m.menuName && m.menuName.toLowerCase().includes('follow-up'))
    );
  }, [user, authorizedMenus]);

  const canAccessCredit = useMemo(() => {
    if (!user) return false;
    return authorizedMenus.some(
      (m) =>
        m.parentID === 19 ||
        m.menuID === 19 ||
        m.menuID === 58 ||
        m.menuID === 60 ||
        m.menuID === 20 ||
        m.menuID === 62 ||
        m.menuID === 61 ||
        (m.action && m.action.toLowerCase().includes('credit')) ||
        (m.action && m.action.toLowerCase().includes('recovery')) ||
        (m.menuName && m.menuName.toLowerCase().includes('credit'))
    );
  }, [user, authorizedMenus]);

  const canAccessReports = useMemo(() => {
    if (!user) return false;
    return authorizedMenus.some(
      (m) =>
        m.parentID === 63 ||
        m.menuID === 63 ||
        m.menuID === 53 ||
        (m.action && m.action.toLowerCase().includes('report')) ||
        (m.action && m.action.toLowerCase().includes('visit')) ||
        (m.menuName && m.menuName.toLowerCase().includes('report'))
    );
  }, [user, authorizedMenus]);

  const canAccessMore = useMemo(() => {
    if (!user) return false;
    return authorizedMenus.length > 0;
  }, [user, authorizedMenus]);

  const canAccessMyTasks = useMemo(() => {
    if (!user) return false;
    const match = menus.find(
      (m) =>
        m.menuID === 51 ||
        (m.action && (m.action.toLowerCase().includes('mytask') || m.action.toLowerCase().includes('task'))) ||
        (m.menuName && (m.menuName.toLowerCase().includes('my task') || m.menuName.toLowerCase().includes('task')))
    );
    if (match) {
      return match.auth === true;
    }
    return false;
  }, [user, menus]);

  const canAccessNotes = useMemo(() => {
    if (!user) return false;
    const match = menus.find(
      (m) =>
        m.menuID === 68 ||
        (m.action && m.action.toLowerCase().includes('notes')) ||
        (m.menuName && (m.menuName.toLowerCase().includes('notes') || m.menuName.toLowerCase() === 'note'))
    );
    if (match) {
      return match.auth === true;
    }
    return false;
  }, [user, menus]);

  const canAccessCRMInbox = useMemo(() => {
    if (!user) return false;
    const match = menus.find(
      (m) =>
        m.menuID === 78 ||
        (m.action && (m.action.toLowerCase().includes('crminbox') || m.action.toLowerCase() === 'chat' || m.action.toLowerCase().includes('inbox'))) ||
        (m.menuName && (m.menuName.toLowerCase().includes('crm inbox') || m.menuName.toLowerCase().includes('inbox') || m.menuName.toLowerCase().includes('chat')))
    );
    if (match) {
      return match.auth === true;
    }
    return false;
  }, [user, menus]);

  const canAccessReminders = useMemo(() => {
    if (!user) return false;
    const match = menus.find(
      (m) =>
        m.menuID === 57 ||
        m.menuID === 77 ||
        m.menuID === 62 ||
        (m.action && (m.action.toLowerCase().includes('remainder') || m.action.toLowerCase().includes('reminder'))) ||
        (m.menuName && (m.menuName.toLowerCase().includes('remainder') || m.menuName.toLowerCase().includes('reminder')))
    );
    if (match) {
      return match.auth === true;
    }
    return false;
  }, [user, menus]);

  const canAccessActivities = useMemo(() => {
    return canAccessMyTasks || canAccessNotes || canAccessCRMInbox || canAccessReminders;
  }, [canAccessMyTasks, canAccessNotes, canAccessCRMInbox, canAccessReminders]);

  const hasPermission = useCallback(
    (target: string | number): boolean => {
      if (!user) return false;

      if (typeof target === 'number') {
        return authorizedMenuIds.has(target);
      }

      if (authorizedMenus.length === 0) return false;

      const query = String(target).toLowerCase().trim();
      return authorizedMenus.some(
        (m) =>
          (m.menuName && m.menuName.toLowerCase().includes(query)) ||
          (m.action && m.action.toLowerCase().includes(query))
      );
    },
    [user, authorizedMenuIds, authorizedMenus]
  );

  return (
    <MenuContext.Provider
      value={{
        menus,
        authorizedMenus,
        authorizedMenuIds,
        rootMenus,
        loadingMenus,
        isMenusInitialized,
        canAccessDashboard,
        canAccessSales,
        canAccessCredit,
        canAccessReports,
        canAccessMore,
        canAccessMyTasks,
        canAccessNotes,
        canAccessCRMInbox,
        canAccessReminders,
        canAccessActivities,
        hasPermission,
        refreshMenus: fetchMenus,
      }}
    >
      {children}
    </MenuContext.Provider>
  );
};

export const useMenu = () => useContext(MenuContext);
