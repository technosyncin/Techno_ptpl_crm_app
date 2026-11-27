import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { SafeStorage } from '../utils/storage';

// Keys for AsyncStorage
export const STORAGE_KEYS = {
  API_BASE_URL: 'crm_api_base_url',
  LAST_ACTIVE_ENV: 'crm_last_active_env',
  LAST_ENDPOINT_CONFIG: 'crm_last_endpoint_config',
  TOKEN: 'crm_token',
  SESSION_TOKEN: 'crm_session_token',
  USER: 'crm_user',
  REMEMBER_ME: 'crm_remember_me',
};

export const clearAuthStorage = async (): Promise<void> => {
  await SafeStorage.clearAuth(STORAGE_KEYS.TOKEN, STORAGE_KEYS.SESSION_TOKEN, STORAGE_KEYS.USER);
  await SafeStorage.removeItem(STORAGE_KEYS.REMEMBER_ME);
  await SafeStorage.removeItem('crm_selected_company_id');
};

export type SessionExpiredHandler = (message?: string) => void;
let globalSessionExpiredHandler: SessionExpiredHandler | null = null;

export const setSessionExpiredHandler = (handler: SessionExpiredHandler | null) => {
  globalSessionExpiredHandler = handler;
};

// ============================================================================
// 🌍 ENVIRONMENT CONFIGURATION
// Change this ONE parameter to switch endpoints: 'local' | 'test' | 'production'
// ============================================================================
export type Environment = 'local' | 'test' | 'production';

export const ACTIVE_ENV: Environment = 'local'; // 👈 CHANGE THIS VALUE ('local' | 'test' | 'production')

export const ENV_ENDPOINTS: Record<Environment, string> = {
  local: 'http://192.168.1.12:5000/api',
  test: 'https://crmtest.technosync.in/api',
  production: 'https://crm.technosync.in/api',
};
// Standard Presets (Backwards compatibility)
export const DEFAULT_API_URL = ENV_ENDPOINTS.production;
export const LIVE_TUNNEL_URL = ENV_ENDPOINTS.test;
export const LOCAL_SERVER_API_URL = 'http://localhost:5251/api';
export const LOCAL_MOBILE_API_URL = 'http://localhost:5000/api';

// Current API URL configured by ACTIVE_ENV
export const Endpoint = ENV_ENDPOINTS[ACTIVE_ENV];

// Helper to check if a string is a valid IPv4 address
const isValidIpv4 = (ip: string): boolean => {
  if (!ip) return false;
  const parts = ip.split('.');
  if (parts.length !== 4) return false;
  return parts.every((p) => {
    const num = Number(p);
    return !isNaN(num) && num >= 0 && num <= 255 && String(num) === p;
  });
};

// Fallback LAN IP and Port of development machine
const LOCAL_DEV_LAN_IP = '192.168.1.12';
const LOCAL_DEV_PORT = '5000';

// Resolve 'localhost' / '127.0.0.1' to PC Wi-Fi IP when running on physical mobile device or Expo Go
export const resolveDeviceUrl = (rawUrl: string): string => {
  if (!rawUrl) return rawUrl;
  let url = rawUrl;

  // Auto-upgrade any old/dead port 5251 references to 5000 (since Mobile API runs on 5000)
  if (url.includes(':5251')) {
    url = url.replace(':5251', `:${LOCAL_DEV_PORT}`);
  }

  // Auto-cleanse any previously corrupted Expo/ngrok tunnel hosts
  if (url.includes('exp.direct') || url.includes('ngrok') || url.includes('localtunnel')) {
    url = url.replace(/https?:\/\/[^\/:]+(?::\d+)?/gi, `http://${LOCAL_DEV_LAN_IP}:${LOCAL_DEV_PORT}`);
  }

  // On Web, localhost is directly reachable on PC browser
  if (Platform.OS === 'web') {
    return url;
  }

  // On native device (iOS / Android / Expo Go), localhost points to the phone itself, not the PC
  if (url.includes('localhost') || url.includes('127.0.0.1')) {
    try {
      const hostUri =
        Constants.expoConfig?.hostUri ||
        (Constants as any).manifest?.debuggerHost ||
        (Constants as any).manifest2?.extra?.expoGo?.debuggerHost ||
        '';

      const candidateIp = hostUri ? hostUri.split(':')[0] : '';
      // Only use candidateIp if it's a genuine IPv4 address and NOT an Expo/Metro tunnel host (e.g. xxx.exp.direct)
      const isTunnelHost =
        candidateIp.includes('exp.direct') ||
        candidateIp.includes('ngrok') ||
        candidateIp.includes('localtunnel');

      if (candidateIp && !isTunnelHost && isValidIpv4(candidateIp) && candidateIp !== 'localhost' && candidateIp !== '127.0.0.1') {
        url = url.replace(/localhost|127\.0\.0\.1/g, candidateIp);
      } else {
        url = url.replace(/localhost|127\.0\.0\.1/g, LOCAL_DEV_LAN_IP);
      }
    } catch {
      url = url.replace(/localhost|127\.0\.0\.1/g, LOCAL_DEV_LAN_IP);
    }
  }

  return url;
};

// Auto-detect PC IP address from Expo connection or use current Wi-Fi IP
export const getAutoDetectedServerUrl = (): string => {
  try {
    const hostUri =
      Constants.expoConfig?.hostUri ||
      (Constants as any).manifest?.debuggerHost ||
      (Constants as any).manifest2?.extra?.expoGo?.debuggerHost ||
      '';

    if (hostUri) {
      const candidateIp = hostUri.split(':')[0];
      const isTunnel =
        candidateIp.includes('exp.direct') ||
        candidateIp.includes('ngrok') ||
        candidateIp.includes('localtunnel');

      if (candidateIp && !isTunnel && isValidIpv4(candidateIp) && candidateIp !== 'localhost' && candidateIp !== '127.0.0.1') {
        return `http://${candidateIp}:${LOCAL_DEV_PORT}/api`;
      }
    }
  } catch (e) {
    console.warn('Could not auto-detect host IP', e);
  }

  return `http://${LOCAL_DEV_LAN_IP}:${LOCAL_DEV_PORT}/api`;
};

let currentBaseUrl = resolveDeviceUrl(Endpoint);

// Create Axios Instance
export const apiClient: AxiosInstance = axios.create({
  baseURL: currentBaseUrl,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'Bypass-Tunnel-Reminder': 'true',
  },
});

// Sanitize API URL to fix typos (e.g., .5000 instead of :5000) and ensure valid format
export const sanitizeApiUrl = (rawUrl: string): string => {
  let cleanUrl = (rawUrl || '').trim();
  if (!cleanUrl) return cleanUrl;

  // Auto-correct common typo: dot before port number instead of colon
  cleanUrl = cleanUrl.replace(/(\b\d{1,3}(?:\.\d{1,3}){3})\.(\d{4,5})/g, '$1:$2');
  cleanUrl = cleanUrl.replace(/(localhost)\.(\d{4,5})/gi, '$1:$2');

  if (cleanUrl.endsWith('/')) {
    cleanUrl = cleanUrl.slice(0, -1);
  }

  if (!cleanUrl.toLowerCase().endsWith('/api') && !cleanUrl.toLowerCase().includes('/api/')) {
    cleanUrl = `${cleanUrl}/api`;
  }
  return cleanUrl;
};

// Initialize Base URL from Storage or fallback to Endpoint
export const initApiBaseUrl = async (): Promise<string> => {
  try {
    const lastEnv = await SafeStorage.getItem(STORAGE_KEYS.LAST_ACTIVE_ENV);
    const lastEndpointConfig = await SafeStorage.getItem(STORAGE_KEYS.LAST_ENDPOINT_CONFIG);
    const savedUrl = await SafeStorage.getItem(STORAGE_KEYS.API_BASE_URL);
    const expectedEndpoint = ENV_ENDPOINTS[ACTIVE_ENV];

    // Check if saved URL was contaminated with an Expo tunnel host or obsolete/unreachable port 5251
    const isCorrupted = savedUrl && (savedUrl.includes('exp.direct') || savedUrl.includes('ngrok') || savedUrl.includes(':5251'));

    // If developer changed ACTIVE_ENV OR changed the URL in ENV_ENDPOINTS OR storage was poisoned
    if (isCorrupted || lastEnv !== ACTIVE_ENV || lastEndpointConfig !== expectedEndpoint) {
      const activeUrl = resolveDeviceUrl(sanitizeApiUrl(expectedEndpoint));
      currentBaseUrl = activeUrl;
      apiClient.defaults.baseURL = currentBaseUrl;
      await SafeStorage.setItem(STORAGE_KEYS.API_BASE_URL, activeUrl);
      await SafeStorage.setItem(STORAGE_KEYS.LAST_ACTIVE_ENV, ACTIVE_ENV);
      await SafeStorage.setItem(STORAGE_KEYS.LAST_ENDPOINT_CONFIG, expectedEndpoint);
      return currentBaseUrl;
    }
    if (savedUrl?.includes('192.168.1.49')) {
      const updatedUrl = 'http://192.168.1.12:5000/api';

      await SafeStorage.setItem(
        STORAGE_KEYS.API_BASE_URL,
        updatedUrl
      );

      currentBaseUrl = updatedUrl;
      apiClient.defaults.baseURL = currentBaseUrl;

      return currentBaseUrl;
    }
    if (savedUrl && savedUrl.trim()) {
      const sanitized = sanitizeApiUrl(savedUrl);
      const resolved = resolveDeviceUrl(sanitized);
      currentBaseUrl = resolved;
      apiClient.defaults.baseURL = currentBaseUrl;
      return currentBaseUrl;
    }
  } catch (err) {
    console.warn('Failed to load saved API URL', err);
  }

  const defaultResolved = resolveDeviceUrl(sanitizeApiUrl(Endpoint));
  currentBaseUrl = defaultResolved;
  apiClient.defaults.baseURL = currentBaseUrl;
  try {
    await SafeStorage.setItem(STORAGE_KEYS.API_BASE_URL, defaultResolved);
    await SafeStorage.setItem(STORAGE_KEYS.LAST_ACTIVE_ENV, ACTIVE_ENV);
    await SafeStorage.setItem(STORAGE_KEYS.LAST_ENDPOINT_CONFIG, ENV_ENDPOINTS[ACTIVE_ENV]);
  } catch {
    // Ignore safe storage error on init
  }
  return currentBaseUrl;
};

// Update and persist Base URL
export const setApiBaseUrl = async (newUrl: string): Promise<void> => {
  const cleanUrl = resolveDeviceUrl(sanitizeApiUrl(newUrl));
  currentBaseUrl = cleanUrl;
  apiClient.defaults.baseURL = currentBaseUrl;
  await SafeStorage.setItem(STORAGE_KEYS.API_BASE_URL, cleanUrl);
};

export const getApiBaseUrl = (): string => {
  return apiClient.defaults.baseURL || currentBaseUrl;
};

// Request Interceptor: Attach Auth Token, Session Token, and User Headers
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    if (config.baseURL && !config.baseURL.endsWith('/')) {
      config.baseURL = `${config.baseURL}/`;
    }
    if (config.url?.startsWith('/')) {
      config.url = config.url.substring(1);
    }

    try {
      const token = await SafeStorage.getItem(STORAGE_KEYS.TOKEN);
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      const sessionToken = await SafeStorage.getItem(STORAGE_KEYS.SESSION_TOKEN);
      if (sessionToken && config.headers) {
        config.headers['X-Session-Token'] = sessionToken;
      }

      const activeCompId = await SafeStorage.getItem('crm_selected_company_id');
      if (activeCompId && config.headers) {
        config.headers['X-Company-Id'] = String(activeCompId);
      }

      const userStr = await SafeStorage.getItem(STORAGE_KEYS.USER);
      if (userStr && config.headers) {
        const user = JSON.parse(userStr);
        if (user.id || user.userID) {
          config.headers['X-User-Id'] = String(user.id || user.userID);
        }
        if (user.role) {
          config.headers['X-User-Role'] = String(user.role).toLowerCase();
        }
        if (user.username) {
          config.headers['X-Username'] = String(user.username);
        }
        if (user.fullName) {
          config.headers['X-User-Full-Name'] = String(user.fullName);
        }
      }
    } catch (error) {
      console.warn('Error applying auth headers to request', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle Unauthorized / Multi-session logout
apiClient.interceptors.response.use(
  (response) => {
    if (
      response.data &&
      response.data.valid === false &&
      (response.data.message?.toLowerCase().includes('another login') ||
        response.data.message?.toLowerCase().includes('duplicate') ||
        response.data.message?.toLowerCase().includes('logged out'))
    ) {
      clearAuthStorage();
      if (globalSessionExpiredHandler) {
        globalSessionExpiredHandler(response.data.message || 'Another login was detected for this account. You have been logged out.');
      }
    }
    return response;
  },
  async (error) => {
    if (error.response?.status === 401) {
      const msg =
        error.response?.data?.message ||
        'Your session has expired or another login was detected for this account. You have been logged out.';
      clearAuthStorage();
      if (globalSessionExpiredHandler) {
        globalSessionExpiredHandler(msg);
      }
    }
    return Promise.reject(error);
  }
);
