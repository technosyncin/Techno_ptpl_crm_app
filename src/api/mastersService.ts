import { apiClient } from './client';

export interface CompanyMaster {
  companyID: number;
  companyName: string;
  code?: string;
  city?: string;
  state?: string;
  phone?: string;
  email?: string;
  gstNo?: string;
  panNo?: string;
  address?: string;
  status?: string;
  isActive?: boolean;
}

export interface UserMaster {
  userID: number;
  userName: string;
  fullName: string;
  email?: string;
  role?: string;
  department?: string;
  isActive?: boolean;
}

export interface LeadSourceMaster {
  leadSourceID: number;
  leadSourceName: string;
  description?: string;
  status?: string | boolean;
}

export interface LeadStatusMaster {
  leadStatusID: number;
  leadStatusName: string;
  description?: string;
  status?: string | boolean;
}

export interface LookupItem {
  id: number | string;
  name: string;
  code?: string;
}

export interface MenuMaster {
  menuID: number;
  menuOrderID: number;
  menuName: string;
  parentID: number;
  action: string;
  icon?: string;
  auth?: boolean;
  isActive?: boolean;
}

export const mastersService = {
  // Get all Companies from /Company (matches Desktop companyService.getAllCompanies)
  getCompanies: async (): Promise<CompanyMaster[]> => {
    try {
      const res = await apiClient.get('/Company', {
        params: { page: 1, limit: 1000, status: 'all', includeDeleted: false },
      });
      if (res && res.data) {
        const raw = Array.isArray(res.data) ? res.data : (res.data.data || res.data.$values || []);
        if (Array.isArray(raw)) {
          return raw.map((c: any) => ({
            companyID: Number(c.companyID || c.CompanyID || c.id),
            companyName: c.companyName || c.CompanyName || c.name || 'Company',
            code: c.companyCode || c.CompanyCode || c.code || '',
            city: c.city || c.City || '',
            state: c.state || c.State || '',
            address: c.addressLine1 || c.AddressLine1 || c.address || '',
            email: c.email || c.Email || '',
            phone: c.mobileNo || c.MobileNo || c.phone || '',
            status: (c.status || c.Status || 'active').toString().toLowerCase(),
            isActive: c.isActive ?? c.IsActive ?? true,
          }));
        }
      }
    } catch (err) {
      console.error('Error fetching companies from /Company:', err);
    }
    return [];
  },

  // Get Users for assignment dynamically from /Users or /Master
  getUsers: async (companyId?: number): Promise<UserMaster[]> => {
    try {
      const params: any = { page: 1, limit: 1000, status: 'all' };
      if (companyId) params.companyId = companyId;

      let res: any;
      try {
        res = await apiClient.get('/Master', { params });
      } catch {
        res = await apiClient.get('/Users', { params });
      }

      if (res && res.data) {
        const raw = Array.isArray(res.data) ? res.data : (res.data.data || res.data.$values || []);
        if (Array.isArray(raw)) {
          return raw.map((u: any) => ({
            userID: u.userID || u.UserID || u.userId || u.id,
            userName: u.userName || u.UserName || u.username || 'User',
            fullName: u.fullName || u.FullName || u.name || u.userName || 'User',
            email: u.email || u.Email,
            role: u.role || u.Role,
            department: u.department || u.Department,
            isActive: u.isActive ?? true,
          }));
        }
      }
    } catch (err) {
      console.error('Error fetching users dynamically:', err);
    }
    return [];
  },

  // Get User details by ID dynamically from /Master/{id} or /Users/{id}
  getUserById: async (userId: number | string): Promise<any> => {
    try {
      try {
        const res = await apiClient.get(`/Master/${userId}`);
        if (res && res.data) return res.data.data || res.data;
      } catch {
        const res = await apiClient.get(`/Users/${userId}`);
        if (res && res.data) return res.data.data || res.data;
      }
    } catch (err) {
      console.warn(`Error fetching user ${userId} details:`, err);
    }
    return null;
  },

  // Get Lead Sources from /LeadSource (matches Desktop leadSourceService.getAllLeadSources)
  getLeadSources: async (): Promise<LeadSourceMaster[]> => {
    try {
      let res;
      try {
        res = await apiClient.get('/LeadSource');
      } catch {
        res = await apiClient.get('/Master');
      }
      if (res && res.data) {
        const raw = Array.isArray(res.data)
          ? res.data
          : (res.data.leadSources || res.data.data || res.data.$values || []);
        if (Array.isArray(raw)) {
          return raw.map((s: any) => ({
            leadSourceID: s.leadSourceID || s.LeadSourceID || s.id,
            leadSourceName: s.leadSourceName || s.LeadSourceName || s.name || '',
            description: s.description,
            status: s.status,
          }));
        }
      }
    } catch (err) {
      console.warn('Error fetching lead sources from /LeadSource:', err);
    }
    return [];
  },

  // Get Lead Statuses from /LeadStatus (matches Desktop leadStatusService.getAllLeadStatuses)
  getLeadStatuses: async (): Promise<LeadStatusMaster[]> => {
    try {
      const res = await apiClient.get('/LeadStatus');
      if (res && res.data) {
        const raw = Array.isArray(res.data) ? res.data : (res.data.data || res.data.$values || []);
        if (Array.isArray(raw)) {
          return raw.map((s: any) => ({
            leadStatusID: s.leadStatusID || s.LeadStatusID || s.id,
            leadStatusName: s.leadStatusName || s.LeadStatusName || s.name || '',
            description: s.description,
            status: s.status,
          }));
        }
      }
    } catch (err) {
      console.error('Error fetching lead statuses from /LeadStatus:', err);
    }
    return [];
  },

  // Get Call Purposes from /CallPurpose
  getCallPurposes: async (): Promise<LookupItem[]> => {
    try {
      const res = await apiClient.get('/CallPurpose');
      if (res && res.data) {
        const raw = Array.isArray(res.data) ? res.data : (res.data.data || res.data.$values || []);
        if (Array.isArray(raw)) {
          return raw.map((p: any) => ({
            id: p.callPurposeID || p.id,
            name: p.purposeName || p.callPurposeName || p.name || 'Follow-up',
          }));
        }
      }
    } catch (err) {
      console.warn('Error fetching call purposes:', err);
    }
    return [];
  },

  // Get Follow-up Outcomes from /FollowUpOutcome
  getFollowUpOutcomes: async (): Promise<LookupItem[]> => {
    try {
      const res = await apiClient.get('/FollowUpOutcome');
      if (res && res.data) {
        const raw = Array.isArray(res.data) ? res.data : (res.data.data || res.data.$values || []);
        if (Array.isArray(raw)) {
          return raw.map((o: any) => ({
            id: o.outcomeID || o.id,
            name: o.outcomeName || o.name || 'Completed',
          }));
        }
      }
    } catch (err) {
      console.warn('Error fetching follow-up outcomes:', err);
    }
    return [];
  },

  // Get Payment Modes from /PaymentMode
  getPaymentModes: async (): Promise<LookupItem[]> => {
    try {
      const res = await apiClient.get('/PaymentMode');
      if (res && res.data) {
        const raw = Array.isArray(res.data) ? res.data : (res.data.data || res.data.$values || []);
        if (Array.isArray(raw)) {
          return raw.map((m: any) => ({
            id: m.paymentModeID || m.id,
            name: m.modeName || m.paymentModeName || m.name,
          }));
        }
      }
    } catch (err) {
      console.warn('Error fetching payment modes:', err);
    }
    return [];
  },

  // Create Payment Mode
  createPaymentMode: async (data: { paymentModeName: string; description?: string; status?: string; companyID?: number }): Promise<any> => {
    try {
      const res = await apiClient.post('/PaymentMode', {
        paymentModeName: data.paymentModeName.trim(),
        description: data.description?.trim() || '',
        status: data.status || 'Active',
        companyID: data.companyID || 1,
      });
      return res.data;
    } catch (err) {
      console.error('Error creating payment mode:', err);
      throw err;
    }
  },

  // Get User Permitted Menus from /Menu/user/{userId}/menus
  getUserMenus: async (userId: number | string): Promise<MenuMaster[]> => {
    try {
      const res = await apiClient.get(`/Menu/user/${userId}/menus`);
      if (res && res.data) {
        const raw = Array.isArray(res.data) ? res.data : (res.data.data || res.data.menus || res.data.$values || []);
        if (Array.isArray(raw)) {
          return raw.map((m: any) => {
            const rawAuth = m.auth !== undefined ? m.auth : m.Auth;
            const rawActive = m.isActive !== undefined ? m.isActive : m.IsActive;
            return {
              menuID: Number(m.menuID || m.MenuID),
              menuOrderID: m.menuOrderID || m.MenuOrderID,
              menuName: m.menuName || m.MenuName,
              parentID: m.parentID !== undefined ? m.parentID : m.ParentID,
              action: m.action || m.Action || '',
              icon: m.icon || m.Icon,
              auth: rawAuth === true || rawAuth === 1 || rawAuth === '1' || String(rawAuth).toLowerCase() === 'true',
              isActive: rawActive === undefined || rawActive === true || rawActive === 1 || rawActive === '1' || String(rawActive).toUpperCase() === 'Y' || String(rawActive).toLowerCase() === 'true',
            };
          });
        }
      }
    } catch (err) {
      console.warn('Error fetching user menus:', err);
    }
    return [];
  },

  // Dynamically get Document ObjTypes from database Menu table (/Menu/by-parent/60 and /Menu/doc-types)
  getMenuDocTypes: async (parentId: number = 60): Promise<{ menuID: number; menuName: string; parentID: number; objType: number }[]> => {
    try {
      // 1. First attempt: /Menu/by-parent/{parentId} (returns submenus directly from Menu table in database)
      try {
        const res = await apiClient.get(`/Menu/by-parent/${parentId}`);
        const raw = Array.isArray(res.data) ? res.data : (res.data?.data || res.data?.value || []);
        if (Array.isArray(raw) && raw.length > 0) {
          return raw.map((m: any) => ({
            menuID: Number(m.menuID || m.MenuID),
            menuName: String(m.menuName || m.MenuName || ''),
            parentID: Number(m.parentID || m.ParentID || parentId),
            objType: Number(m.objType || m.ObjType || 0),
          }));
        }
      } catch (parentErr) {
        // Fallback to /Menu/doc-types
      }

      // 2. Fallback: /Menu/doc-types (queries Menu table WHERE ObjType IS NOT NULL)
      const docRes = await apiClient.get('/Menu/doc-types');
      const rawDocs = Array.isArray(docRes.data) ? docRes.data : (docRes.data?.data || docRes.data?.value || []);
      if (Array.isArray(rawDocs) && rawDocs.length > 0) {
        return rawDocs.map((m: any) => ({
          menuID: Number(m.menuID || m.MenuID),
          menuName: String(m.menuName || m.MenuName || ''),
          parentID: Number(m.parentID || m.ParentID || 0),
          objType: Number(m.objType || m.ObjType || 0),
        }));
      }
    } catch (err) {
      console.warn('Error fetching Menu ObjTypes from database Menu table:', err);
    }
    return [];
  },
};
