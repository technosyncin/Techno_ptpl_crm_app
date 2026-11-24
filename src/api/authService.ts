import { apiClient, STORAGE_KEYS, clearAuthStorage } from './client';
import { SafeStorage } from '../utils/storage';

export interface UserProfile {
  id: number | string;
  userID?: number | string;
  username: string;
  fullName: string;
  email: string;
  role: string;
  mobileNo?: string;
  profilePicture?: string | null;
  profilePic?: string | null;
  sessionToken?: string;
  companyIds?: number[];
  defaultCompanyId?: number | null;
}

export interface LoginResponse {
  token: string;
  sessionToken?: string;
  user: UserProfile;
  message?: string;
}

export const authService = {
  // Login with username and password (matches Desktop validateUser in Login.js)
  login: async (username: string, password: string, rememberMe = true): Promise<LoginResponse> => {
    const cleanUsername = username.trim();
    const cleanPassword = password;

    const response = await apiClient.post('/Auth/login', {
      username: cleanUsername,
      password: cleanPassword,
    });

    if (response.data && response.data.token) {
      const data = response.data;
      const token = data.token;
      const userData = data.user || {};
      const sessToken = data.sessionToken || userData.sessionToken || '';
      const userId = userData.id || userData.userID;

      // AFTER LOGIN, fetch complete user details including companies (matching Desktop Login.js lines 18-47)
      let fetchedDetails: any = null;
      let companyIds: number[] = [];
      let defaultCompanyId: number | null = null;

      try {
        if (userId) {
          let userRes: any;
          try {
            userRes = await apiClient.get(`/Master/${userId}`);
          } catch {
            userRes = await apiClient.get(`/Users/${userId}`);
          }
          if (userRes && userRes.data) {
            fetchedDetails = userRes.data.data || userRes.data;
            companyIds = fetchedDetails.companyIds || fetchedDetails.companyIDs || [];
            defaultCompanyId = fetchedDetails.defaultCompanyId || fetchedDetails.defaultCompanyID || null;
          }
        }
      } catch (err) {
        console.warn('Could not fetch user companies details:', err);
      }

      const profilePic =
        fetchedDetails?.profilePicture ||
        fetchedDetails?.ProfilePicture ||
        fetchedDetails?.profilePic ||
        userData?.profilePicture ||
        userData?.profilePic ||
        null;

      const profile: UserProfile = {
        id: userId || 1,
        userID: userId || 1,
        username: userData.username || cleanUsername,
        fullName: userData.fullName || fetchedDetails?.fullName || cleanUsername,
        email: userData.email || fetchedDetails?.email || '',
        role: userData.role || fetchedDetails?.role || 'User',
        mobileNo: userData.mobile || userData.mobileNo || fetchedDetails?.mobile || '',
        profilePicture: profilePic,
        sessionToken: sessToken,
        companyIds: companyIds.length > 0 ? companyIds : (userData.companyIds || (userData.companyID ? [userData.companyID] : [])),
        defaultCompanyId: defaultCompanyId || userData.defaultCompanyId || userData.companyID || null,
      };

      await SafeStorage.setItem(STORAGE_KEYS.TOKEN, token);
      if (sessToken) {
        await SafeStorage.setItem(STORAGE_KEYS.SESSION_TOKEN, sessToken);
      }
      await SafeStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(profile));
      if (rememberMe) {
        await SafeStorage.setItem(STORAGE_KEYS.REMEMBER_ME, 'true');
      } else {
        await SafeStorage.removeItem(STORAGE_KEYS.REMEMBER_ME);
      }

      return {
        token,
        sessionToken: sessToken,
        user: profile,
        message: data.message || 'Login successful',
      };
    } else {
      throw new Error(response.data?.message || 'Invalid Username or Password');
    }
  },

  // Validate active single session
  validateSession: async (
    userId?: number | string,
    sessionToken?: string
  ): Promise<{ valid: boolean; message?: string }> => {
    if (!userId || !sessionToken) {
      return { valid: false, message: 'Invalid session credentials' };
    }
    try {
      const response = await apiClient.get('/Auth/validate-session', {
        params: { userId, sessionToken },
        timeout: 6000,
      });

      if (response && response.data && response.data.valid === false) {
        return {
          valid: false,
          message:
            response.data.message ||
            'Another login was detected for this account. You have been logged out.',
        };
      }
      return { valid: true };
    } catch (err: any) {
      // If server explicitly returned 401 Unauthorized or valid === false
      if (
        err.response?.status === 401 ||
        (err.response?.data && err.response.data.valid === false)
      ) {
        return {
          valid: false,
          message:
            err.response?.data?.message ||
            'Another login was detected for this account. You have been logged out.',
        };
      }
      // Transient network drops or timeouts shouldn't kick the user out
      return { valid: true };
    }
  },

  // Logout & terminate session (matches Desktop AuthController)
  logout: async (userId?: number | string): Promise<void> => {
    try {
      const uid = userId ? Number(userId) : undefined;
      await apiClient.post('/Auth/logout', { userId: uid }).catch(() => {});
    } finally {
      await clearAuthStorage();
    }
  },

  // Check stored credentials & user session
  getCurrentSession: async (): Promise<{ token: string | null; user: UserProfile | null }> => {
    try {
      const rememberMe = await SafeStorage.getItem(STORAGE_KEYS.REMEMBER_ME);
      if (rememberMe !== 'true') {
        // If user didn't select Remember Me on login, don't auto-restore session on next cold app launch
        await clearAuthStorage();
        return { token: null, user: null };
      }
      const token = await SafeStorage.getItem(STORAGE_KEYS.TOKEN);
      const userStr = await SafeStorage.getItem(STORAGE_KEYS.USER);
      if (!token || !userStr) {
        return { token: null, user: null };
      }
      const user = JSON.parse(userStr);
      return { token, user };
    } catch {
      return { token: null, user: null };
    }
  },

  // Get active companies for signup
  getCompanies: async (): Promise<{ companyID: number; companyName: string }[]> => {
    try {
      const res = await apiClient.get('/Auth/companies');
      return res.data?.data || res.data || [];
    } catch {
      try {
        const fallback = await apiClient.get('/Company?limit=100');
        return fallback.data?.data || fallback.data || [];
      } catch {
        return [];
      }
    }
  },

  // User Sign Up / Registration (Full Name, Mobile, Username, Password, Company)
  signUp: async (payload: {
    fullName: string;
    mobile: string;
    username: string;
    password: string;
    companyID?: number | null;
    email?: string;
  }): Promise<{ success: boolean; message: string; userId?: number; username?: string }> => {
    const res = await apiClient.post('/Auth/signup', payload);
    return res.data;
  },

  // Reset forgotten password
  forgotPassword: async (payload: { mobile: string; newPassword: string }): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.post('/Auth/forgot-password', payload);
    return res.data;
  },
};


