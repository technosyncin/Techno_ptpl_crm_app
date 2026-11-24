import { apiClient } from './client';

export interface UserItem {
  userID: number;
  username: string;
  fullName: string;
  password?: string;
  email: string;
  mobileNo: string;
  role: string;
  companyID?: number | null;
  companyName?: string | null;
  companyIds?: number[];
  defaultCompanyId?: number | null;
  departmentID?: number | null;
  departmentName?: string | null;
  designation?: string | null;
  empId?: string | null;
  userCode?: string | null;
  joiningDate?: string | null;
  dateOfBirth?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  country?: string | null;
  profilePicture?: string | null;
  profilePic?: string | null;
  isActive: boolean;
}

export interface CreateUserPayload {
  username: string;
  password: string;
  fullName: string;
  email?: string;
  mobile?: string;
  mobileNo?: string;
  role: string;
  companyID?: number | null;
  companyIds?: number[];
  defaultCompanyId?: number | null;
  departmentID?: number | null;
  designation?: string | null;
  empId?: string | null;
  userCode?: string | null;
  joiningDate?: string | null;
  dateOfBirth?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  country?: string | null;
  isActive?: boolean | string;
  profilePicture?: string | null;
}

export interface UpdateUserPayload {
  username?: string;
  password?: string;
  fullName?: string;
  email?: string;
  mobile?: string;
  mobileNo?: string;
  role?: string;
  companyID?: number | null;
  companyIds?: number[];
  defaultCompanyId?: number | null;
  departmentID?: number | null;
  designation?: string | null;
  empId?: string | null;
  userCode?: string | null;
  joiningDate?: string | null;
  dateOfBirth?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  country?: string | null;
  profilePicture?: string | null;
  profilePic?: string | null;
  isActive?: boolean | string;
}

export interface DynamicOption {
  id: number;
  name: string;
}

export const normalizeUserStatus = (value: any): boolean => {
  if (value === false || value === 0) return false;
  const normalized = String(value ?? '').trim().toLowerCase();
  if (['0', 'false', 'inactive', 'n', 'no'].includes(normalized)) {
    return false;
  }
  return true;
};

export const userService = {
  // Get all users from DB Users / Master table (Exact Web Parity)
  getUsers: async (companyId?: number, search?: string, status?: string): Promise<UserItem[]> => {
    try {
      const params: any = {
        page: 1,
        limit: 1000,
        status: status || 'all',
      };
      if (companyId && companyId > 0) params.companyId = companyId;
      if (search && search.trim()) params.search = search.trim();

      let res: any;
      try {
        res = await apiClient.get('/Master', { params });
      } catch (err) {
        res = await apiClient.get('/Users', { params });
      }

      if (res && res.data) {
        const raw = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data?.users)
          ? res.data.users
          : [];

        if (Array.isArray(raw)) {
          return raw.map((u: any) => {
            const rawCompanyIds = u.companyIds || u.CompanyIds || u.companyIDs || [];
            let parsedCompanyIds: number[] = [];
            if (Array.isArray(rawCompanyIds) && rawCompanyIds.length > 0) {
              parsedCompanyIds = rawCompanyIds
                .map((c: any) => (typeof c === 'object' ? Number(c.companyID || c.id) : Number(c)))
                .filter((n: number) => !isNaN(n) && n > 0);
            } else if (u.companyID || u.CompanyID || u.companyId) {
              const singleId = Number(u.companyID || u.CompanyID || u.companyId);
              if (!isNaN(singleId) && singleId > 0) {
                parsedCompanyIds = [singleId];
              }
            }

            const rawDefComp = u.defaultCompanyId ?? u.DefaultCompanyId ?? u.companyID ?? u.CompanyID;
            const defCompId =
              rawDefComp != null && !isNaN(Number(rawDefComp))
                ? Number(rawDefComp)
                : parsedCompanyIds.length > 0
                ? parsedCompanyIds[0]
                : null;

            const activeStatus = normalizeUserStatus(u.isActive ?? u.IsActive ?? u.status ?? u.Status);

            return {
              userID: Number(u.userID || u.UserID || u.id),
              username: String(u.username || u.Username || ''),
              fullName: String(u.fullName || u.FullName || u.username || u.Username || 'User'),
              password: String(u.password || u.Password || ''),
              email: String(u.email || u.Email || ''),
              mobileNo: String(u.mobile || u.Mobile || u.mobileNo || u.MobileNo || ''),
              role: String(u.role || u.Role || 'User'),
              companyID: defCompId,
              companyName: u.companyName || u.CompanyName || null,
              companyIds: parsedCompanyIds,
              defaultCompanyId: defCompId,
              departmentID: u.departmentID || u.DepartmentID || u.departmentId || null,
              departmentName: u.departmentName || u.DepartmentName || u.department || u.Department || '',
              designation: u.designation || u.Designation || '',
              empId: u.empId != null ? String(u.empId) : '',
              userCode: u.userCode || u.UserCode || '',
              joiningDate: u.joiningDate || u.JoiningDate || '',
              dateOfBirth: u.dateOfBirth || u.DateOfBirth || '',
              addressLine1: u.addressLine1 || u.AddressLine1 || '',
              addressLine2: u.addressLine2 || u.AddressLine2 || '',
              city: u.city || u.City || '',
              state: u.state || u.State || '',
              pincode: u.pincode || u.Pincode || '',
              country: u.country || u.Country || 'India',
              isActive: activeStatus,
              profilePicture: u.profilePicture || u.ProfilePicture || u.profilePic || null,
              profilePic: u.profilePic || u.profilePicture || u.ProfilePicture || null,
            };
          });
        }
      }
    } catch (err) {
      console.warn('Error fetching users in userService:', err);
    }
    return [];
  },

  // Get user by ID (Web Parity)
  getUserById: async (id: number): Promise<UserItem | null> => {
    try {
      let res: any;
      try {
        res = await apiClient.get(`/Master/${id}`);
      } catch {
        res = await apiClient.get(`/Users/${id}`);
      }

      if (res && res.data) {
        const raw = res.data?.data || res.data;
        if (!raw) return null;

        const rawCompanyIds = raw.companyIds || raw.CompanyIds || raw.companyIDs || [];
        let cIds: number[] = [];
        if (Array.isArray(rawCompanyIds) && rawCompanyIds.length > 0) {
          cIds = rawCompanyIds
            .map((c: any) => (typeof c === 'object' ? Number(c.companyID || c.id) : Number(c)))
            .filter((n: number) => !isNaN(n) && n > 0);
        } else if (raw.companyID || raw.CompanyID) {
          const sId = Number(raw.companyID || raw.CompanyID);
          if (!isNaN(sId) && sId > 0) cIds = [sId];
        }

        const rawDef = raw.defaultCompanyId ?? raw.DefaultCompanyId ?? raw.companyID ?? raw.CompanyID;
        const defId =
          rawDef != null && !isNaN(Number(rawDef))
            ? Number(rawDef)
            : cIds.length > 0
            ? cIds[0]
            : null;

        return {
          userID: Number(raw.userID || raw.UserID || raw.id || id),
          username: String(raw.username || raw.Username || ''),
          fullName: String(raw.fullName || raw.FullName || raw.username || raw.Username || 'User'),
          password: String(raw.password || raw.Password || ''),
          email: String(raw.email || raw.Email || ''),
          mobileNo: String(raw.mobile || raw.Mobile || raw.mobileNo || raw.MobileNo || ''),
          role: String(raw.role || raw.Role || 'User'),
          companyID: defId,
          companyName: raw.companyName || raw.CompanyName || null,
          companyIds: cIds,
          defaultCompanyId: defId,
          departmentID: raw.departmentID || raw.DepartmentID || raw.departmentId || null,
          departmentName: raw.departmentName || raw.DepartmentName || raw.department || raw.Department || '',
          designation: raw.designation || raw.Designation || '',
          empId: raw.empId != null ? String(raw.empId) : '',
          userCode: raw.userCode || raw.UserCode || '',
          joiningDate: raw.joiningDate || raw.JoiningDate || '',
          dateOfBirth: raw.dateOfBirth || raw.DateOfBirth || '',
          addressLine1: raw.addressLine1 || raw.AddressLine1 || '',
          addressLine2: raw.addressLine2 || raw.AddressLine2 || '',
          city: raw.city || raw.City || '',
          state: raw.state || raw.State || '',
          pincode: raw.pincode || raw.Pincode || '',
          country: raw.country || raw.Country || 'India',
          isActive: normalizeUserStatus(raw.isActive ?? raw.IsActive ?? raw.status ?? raw.Status),
          profilePicture: raw.profilePicture || raw.ProfilePicture || raw.profilePic || null,
          profilePic: raw.profilePic || raw.profilePicture || raw.ProfilePicture || null,
        };
      }
    } catch (err) {
      console.warn('Error fetching user by id in userService:', err);
    }
    return null;
  },

  // Create new user (Exact Web Parity)
  createUser: async (payload: CreateUserPayload): Promise<{ success: boolean; userId?: number; message?: string }> => {
    const apiData: any = {
      username: payload.username,
      fullName: payload.fullName,
      email: payload.email || '',
      mobile: payload.mobileNo || payload.mobile || '',
      mobileNo: payload.mobileNo || payload.mobile || '',
      role: payload.role,
      password: payload.password,
      isActive: payload.isActive === false || String(payload.isActive).toLowerCase() === 'false' ? 'false' : 'true',
      companyIds: payload.companyIds || (payload.companyID ? [payload.companyID] : []),
      defaultCompanyId: payload.defaultCompanyId ?? payload.companyID ?? null,
      companyID: payload.companyID ?? payload.defaultCompanyId ?? null,
      profilePicture: payload.profilePicture || null,
    };

    if (payload.empId) apiData.empId = payload.empId;
    if (payload.designation) apiData.designation = payload.designation;
    if (payload.joiningDate) apiData.joiningDate = payload.joiningDate;
    if (payload.dateOfBirth) apiData.dateOfBirth = payload.dateOfBirth;
    if (payload.userCode) apiData.userCode = payload.userCode;
    if (payload.addressLine1) apiData.addressLine1 = payload.addressLine1;
    if (payload.addressLine2) apiData.addressLine2 = payload.addressLine2;
    if (payload.city) apiData.city = payload.city;
    if (payload.state) apiData.state = payload.state;
    if (payload.pincode) apiData.pincode = payload.pincode;
    if (payload.country) apiData.country = payload.country;

    if (payload.departmentID) {
      apiData.departmentID = payload.departmentID;
      apiData.DepartmentID = payload.departmentID;
    }

    try {
      const res = await apiClient.post('/Master', apiData);
      return res.data;
    } catch (firstErr: any) {
      const res = await apiClient.post('/Users', apiData);
      return res.data;
    }
  },

  // Update existing user (Exact Web Parity)
  updateUser: async (id: number, payload: UpdateUserPayload): Promise<{ success: boolean; message?: string }> => {
    const apiData: any = {};

    if (payload.username !== undefined) apiData.username = payload.username;
    if (payload.fullName !== undefined) apiData.fullName = payload.fullName;
    if (payload.email !== undefined) apiData.email = payload.email;

    const mob = payload.mobile || payload.mobileNo;
    if (mob !== undefined) {
      apiData.mobile = mob;
      apiData.mobileNo = mob;
    }

    if (payload.role !== undefined) apiData.role = payload.role;

    if (payload.isActive !== undefined) {
      apiData.isActive =
        payload.isActive === false || String(payload.isActive).toLowerCase() === 'false' ? 'false' : 'true';
    }

    if (payload.companyIds && Array.isArray(payload.companyIds)) {
      apiData.companyIds = payload.companyIds;
    }

    if (payload.defaultCompanyId !== undefined) {
      apiData.defaultCompanyId = payload.defaultCompanyId;
      apiData.companyID = payload.defaultCompanyId;
    }

    if (payload.password && payload.password.trim() !== '') {
      apiData.password = payload.password;
    }

    if (payload.empId !== undefined) apiData.empId = payload.empId;
    if (payload.designation !== undefined) apiData.designation = payload.designation;
    if (payload.joiningDate !== undefined) apiData.joiningDate = payload.joiningDate;
    if (payload.dateOfBirth !== undefined) apiData.dateOfBirth = payload.dateOfBirth;
    if (payload.userCode !== undefined) apiData.userCode = payload.userCode;
    if (payload.addressLine1 !== undefined) apiData.addressLine1 = payload.addressLine1;
    if (payload.addressLine2 !== undefined) apiData.addressLine2 = payload.addressLine2;
    if (payload.city !== undefined) apiData.city = payload.city;
    if (payload.state !== undefined) apiData.state = payload.state;
    if (payload.pincode !== undefined) apiData.pincode = payload.pincode;
    if (payload.country !== undefined) apiData.country = payload.country;

    const pic = payload.profilePicture || payload.profilePic;
    if (pic !== undefined) {
      apiData.profilePicture = pic;
    }

    const deptId = payload.departmentID;
    if (deptId !== undefined) {
      apiData.DepartmentID = deptId;
      apiData.departmentID = deptId;
    }

    try {
      const res = await apiClient.put(`/Master/${id}`, apiData);
      return res.data;
    } catch (firstErr: any) {
      console.warn('PUT /Master failed, trying fallback to /Users:', firstErr?.response?.data || firstErr?.message);
      const res = await apiClient.put(`/Users/${id}`, apiData);
      return res.data;
    }
  },

  // Delete user (Exact Web Parity)
  deleteUser: async (id: number): Promise<{ success: boolean; message?: string }> => {
    let res: any;
    try {
      res = await apiClient.delete(`/Master/${id}`);
    } catch {
      res = await apiClient.delete(`/Users/${id}`);
    }
    if (res && res.data && res.data.success === false) {
      throw new Error(res.data.message || 'Failed to delete user');
    }
    return res?.data || { success: true };
  },

  // Dynamically load active roles from DB (Exact Web Parity)
  getRoles: async (): Promise<DynamicOption[]> => {
    try {
      let res: any;
      try {
        res = await apiClient.get('/Role');
      } catch {
        try {
          res = await apiClient.get('/Users/roles');
        } catch {
          res = await apiClient.get('/Masters/roles');
        }
      }

      if (res && res.data) {
        const raw = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data.data)
          ? res.data.data
          : Array.isArray(res.data.roles)
          ? res.data.roles
          : [];
        if (Array.isArray(raw)) {
          return raw
            .map((r: any) => ({
              id: Number(r.id || r.Id || r.roleId || r.RoleId),
              name: String(r.roleName || r.RoleName || r.name || ''),
            }))
            .filter((r: any) => Boolean(r.name));
        }
      }
    } catch (err) {
      console.warn('Error loading dynamic roles:', err);
    }
    return [];
  },

  // Dynamically load active departments from DB (Exact Web Parity)
  getDepartments: async (): Promise<DynamicOption[]> => {
    try {
      let res: any;
      try {
        res = await apiClient.get('/Department');
      } catch {
        try {
          res = await apiClient.get('/Users/departments');
        } catch {
          res = await apiClient.get('/Masters/departments');
        }
      }

      if (res && res.data) {
        const raw = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data.data)
          ? res.data.data
          : Array.isArray(res.data.departments)
          ? res.data.departments
          : [];
        if (Array.isArray(raw)) {
          return raw
            .map((d: any) => ({
              id: Number(d.id || d.Id || d.deptId || d.DeptId),
              name: String(d.deptName || d.DeptName || d.name || ''),
            }))
            .filter((d: any) => Boolean(d.name));
        }
      }
    } catch (err) {
      console.warn('Error loading dynamic departments:', err);
    }
    return [];
  },
};
