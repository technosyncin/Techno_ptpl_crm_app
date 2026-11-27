// File: src/api/userPermissionService.ts
import { apiClient } from './client';
import { userService } from './userService';

export interface UserSummary {
  userID: number;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
}

export interface UserPermissionItem {
  menuID: number;
  menuOrderID: number;
  menuName: string;
  parentID: number;
  action?: string;
  icon?: string;
  isActive: boolean;
  auth: boolean;
  children?: UserPermissionItem[];
}

export interface UserPermissionsResponse {
  success: boolean;
  user?: UserSummary;
  menus: UserPermissionItem[];
  totalMenus: number;
  message?: string;
}

export interface SavePermissionItem {
  menuID: number;
  auth: boolean;
}

export const userPermissionService = {
  getUsers: async (): Promise<UserSummary[]> => {
    try {
      const userList = await userService.getUsers();
      if (userList && userList.length > 0) {
        return userList.map((u) => ({
          userID: u.userID,
          fullName: u.fullName || u.username || `User #${u.userID}`,
          email: u.email || '',
          role: u.role || 'User',
          isActive: u.isActive,
        }));
      }
    } catch (serviceErr) {
      console.warn('userService.getUsers failed:', serviceErr);
    }
    return [];
  },

  // Dynamically load all system menus with auth state (for edit user or new user)
  // EXACT WEB PARITY: Deduplication, parent/child mapping, and name normalization matching UsersRolesPage.jsx & MainLayout.jsx
  getUserPermissions: async (userId: number = 0): Promise<UserPermissionsResponse> => {
    try {
      let flatMenus: any[] = [];

      // 1. First attempt: call user-specific menus endpoint (works for userId > 0 and userId === 0)
      try {
        const response = await apiClient.get(`/Menu/user/${userId}/menus?status=all`);
        if (Array.isArray(response.data) && response.data.length > 0) {
          flatMenus = response.data;
        }
      } catch (userMenuErr) {
        console.warn(`Could not fetch /Menu/user/${userId}/menus, falling back to /Menu:`, userMenuErr);
      }

      // 2. Fallback: if user-specific call returned nothing, load all active menus directly from /Menu
      if (!flatMenus || flatMenus.length === 0) {
        try {
          const allMenusRes = await apiClient.get('/Menu');
          const raw = allMenusRes.data;
          if (Array.isArray(raw)) {
            flatMenus = raw.map((m: any) => ({
              ...m,
              auth: false,
            }));
          }
        } catch (menuErr) {
          console.error('Failed to fetch /Menu fallback:', menuErr);
        }
      }

      if (!flatMenus || !Array.isArray(flatMenus) || flatMenus.length === 0) {
        return { success: false, menus: [], totalMenus: 0 };
      }

      // If userId > 0, also fetch actual MenuAuth records to ensure 100% accuracy
      let userAuthMap: Record<number, boolean> = {};
      if (userId > 0) {
        try {
          const authRes = await apiClient.get(`/MenuAuth/user/${userId}`);
          if (Array.isArray(authRes.data)) {
            authRes.data.forEach((a: any) => {
              const mId = Number(a.menuID ?? a.MenuID);
              const isAuth = a.auth === true || a.auth === 1 || a.Auth === true || a.Auth === 1;
              if (mId) userAuthMap[mId] = isAuth;
            });
          }
        } catch (e) {
          // If this fails, we rely on flatMenus[].auth from /Menu/user/{id}/menus
        }
      }

      // Helper function matching cleanName from web app UsersRolesPage.jsx
      const cleanName = (name: string): string => {
        let n = (name || '').trim().toLowerCase();
        if (n === 'templtes') return 'templates';
        if (n === 'whatappmsg') return 'whatsappmsg';
        if (n === 'quatation') return 'quotation';
        return n;
      };

      // 3. Normalize all menus
      const normalizedMenus = flatMenus.map((menu: any) => {
        const menuID = Number(menu.menuID ?? menu.MenuID);
        const parentID = Number(menu.parentID ?? menu.ParentID ?? 0);
        const isAuthDirect = menu.auth === true || menu.auth === 1 || menu.Auth === true || menu.Auth === 1;
        const finalAuth = userId > 0 && menuID in userAuthMap ? userAuthMap[menuID] : isAuthDirect;

        return {
          menuID,
          menuOrderID: Number(menu.menuOrderID ?? menu.MenuOrderID ?? 0),
          menuName: String(menu.menuName ?? menu.MenuName ?? `Menu #${menuID}`).trim(),
          parentID,
          action: menu.action ?? menu.Action,
          icon: menu.icon ?? menu.Icon,
          isActive:
            menu.isActive !== false &&
            menu.isActive !== 0 &&
            menu.isActive !== 'false' &&
            menu.isActive !== '0' &&
            menu.IsActive !== false &&
            menu.IsActive !== 0 &&
            menu.IsActive !== 'false',
          auth: !!finalAuth,
        };
      });

      // 4. Deduplicate by MenuID (Only active menus, exactly like UsersRolesPage.jsx)
      const uniqueMenus: any[] = [];
      const seenMenuIds = new Set<number>();
      normalizedMenus.forEach((menu) => {
        if (menu.menuID && !seenMenuIds.has(menu.menuID) && menu.isActive) {
          seenMenuIds.add(menu.menuID);
          uniqueMenus.push(menu);
        }
      });

      // 5. Create menuMap lookup
      const menuMap: Record<number, UserPermissionItem> = {};
      uniqueMenus.forEach((menu) => {
        menuMap[menu.menuID] = {
          menuID: menu.menuID,
          menuOrderID: menu.menuOrderID,
          menuName: menu.menuName,
          parentID: menu.parentID,
          action: menu.action,
          icon: menu.icon,
          isActive: true,
          auth: menu.auth,
          children: [],
        };
      });

      // 6. Build rootMenus and nest children (EXACT Web UsersRolesPage.jsx algorithm)
      const rootMenus: UserPermissionItem[] = [];
      const rootMenuNames = new Set<string>();

      uniqueMenus.forEach((menu) => {
        const parentID = menu.parentID || 0;
        const mappedMenu = menuMap[menu.menuID];
        if (!mappedMenu) return;

        const menuNameClean = cleanName(mappedMenu.menuName);

        // Root Menu (ParentID === 0)
        if (parentID === 0 || parentID === null || parentID === undefined) {
          if (!rootMenuNames.has(menuNameClean)) {
            rootMenuNames.add(menuNameClean);
            rootMenus.push(mappedMenu);
          }
        } else if (menuMap[parentID]) {
          // Child Menu
          const parent = menuMap[parentID];
          const parentNameClean = cleanName(parent.menuName);

          // Skip if the child menu has the same name as the parent (duplicate module link in DB)
          if (menuNameClean !== parentNameClean) {
            // Check if child already exists under parent with same clean name
            const childExists = (parent.children || []).some(
              (child) => cleanName(child.menuName) === menuNameClean
            );
            if (!childExists) {
              parent.children!.push(mappedMenu);
            }
          }
        }
        // NOTE: If parentID !== 0 and menuMap[parentID] does NOT exist, do NOT add as phantom root!
      });

      // 7. Sort children and roots by menuOrderID, exactly like web
      Object.values(menuMap).forEach((menu) => {
        if (menu.children && menu.children.length > 0) {
          menu.children.sort((a, b) => (a.menuOrderID || 0) - (b.menuOrderID || 0));
        }
      });

      rootMenus.sort((a, b) => (a.menuOrderID || 0) - (b.menuOrderID || 0));

      return {
        success: true,
        menus: rootMenus,
        totalMenus: seenMenuIds.size,
      };
    } catch (error) {
      console.error(`Error fetching permissions for user ${userId}:`, error);
      throw error;
    }
  },

  // Save permissions (handles both new user and existing user updates via C# MenuAuthController)
  savePermissions: async (userId: number, permissions: SavePermissionItem[]) => {
    try {
      if (!userId || userId <= 0) {
        throw new Error('Valid User ID is required to save permissions.');
      }

      // 1. Fetch existing authorizations for this user
      let existingList: any[] = [];
      try {
        const res = await apiClient.get(`/MenuAuth/user/${userId}`);
        existingList = Array.isArray(res.data) ? res.data : [];
      } catch (err) {
        console.warn('Could not fetch existing MenuAuth for user', userId, err);
      }

      const existingMap = new Map<number, { authID: number; auth: boolean }>();
      existingList.forEach((item: any) => {
        const mId = Number(item.menuID ?? item.MenuID);
        const aId = Number(item.authID ?? item.AuthID);
        const isAuth = item.auth === true || item.auth === 1 || item.Auth === true || item.Auth === 1;
        if (mId && aId) {
          existingMap.set(mId, { authID: aId, auth: isAuth });
        }
      });

      const promises: Promise<any>[] = [];

      for (const perm of permissions) {
        const existing = existingMap.get(perm.menuID);

        if (existing) {
          // Record exists: update only if value changed
          if (existing.auth !== perm.auth) {
            promises.push(
              apiClient.put(`/MenuAuth/${existing.authID}/auth`, perm.auth, {
                headers: { 'Content-Type': 'application/json' },
              })
            );
          }
        } else {
          // No record exists yet: create if auth is true
          if (perm.auth) {
            promises.push(
              apiClient.post('/MenuAuth', {
                MenuID: perm.menuID,
                UserID: userId,
                Auth: true,
              })
            );
          }
        }
      }

      if (promises.length > 0) {
        await Promise.all(promises);
      }

      return { success: true, count: promises.length };
    } catch (error) {
      console.error('Error saving user permissions:', error);
      throw error;
    }
  },
};
