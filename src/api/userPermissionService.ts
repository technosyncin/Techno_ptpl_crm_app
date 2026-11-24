import { apiClient } from './client';

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
  user: UserSummary;
  menus: UserPermissionItem[];
  totalMenus: number;
  message?: string;
}

export interface SavePermissionItem {
  menuID: number;
  auth: boolean;
}

export interface SavePermissionsRequest {
  userID: number;
  permissions: SavePermissionItem[];
}

import { userService } from './userService';

export const userPermissionService = {
  // Fetch active users for the permission dropdown (with automatic multi-tier fallback)
  getUsers: async (): Promise<UserSummary[]> => {
    // Attempt 1: Standard userService.getUsers() (Web Parity)
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
      console.warn('userService.getUsers failed in userPermissionService:', serviceErr);
    }

    // Attempt 2: Dedicated permission users endpoint
    try {
      const response = await apiClient.get<UserSummary[]>('/user-permissions/users');
      if (response && response.data && Array.isArray(response.data) && response.data.length > 0) {
        return response.data.map((u: any) => ({
          userID: Number(u.userID || u.UserID || u.id),
          fullName: String(u.fullName || u.FullName || u.username || u.Username || `User #${u.userID || u.UserID}`),
          email: String(u.email || u.Email || ''),
          role: String(u.role || u.Role || 'User'),
          isActive: u.isActive !== undefined ? !!u.isActive : true,
        }));
      }
    } catch (error) {
      console.warn('Dedicated /user-permissions/users endpoint failed:', error);
    }

    return [];
  },

  // Fetch hierarchical menus with effective permissions for a specific user
  getUserPermissions: async (userId: number): Promise<UserPermissionsResponse> => {
    try {
      const response = await apiClient.get<UserPermissionsResponse>(`/user-permissions/user/${userId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching permissions for user ${userId}:`, error);
      throw error;
    }
  },

  // Batch save / upsert user menu permissions
  savePermissions: async (userId: number, permissions: SavePermissionItem[]) => {
    try {
      const payload: SavePermissionsRequest = {
        userID: userId,
        permissions,
      };
      const response = await apiClient.post('/user-permissions/save', payload);
      return response.data;
    } catch (error) {
      console.error('Error saving user permissions:', error);
      throw error;
    }
  },

  // Toggle a single permission
  togglePermission: async (userId: number, menuId: number, auth: boolean) => {
    try {
      const response = await apiClient.post(`/user-permissions/toggle?userId=${userId}`, {
        menuID: menuId,
        auth,
      });
      return response.data;
    } catch (error) {
      console.error('Error toggling permission:', error);
      throw error;
    }
  },
};
