import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Alert, AppState, AppStateStatus } from 'react-native';
import { authService, UserProfile } from '../api/authService';
import { userService } from '../api/userService';
import { initApiBaseUrl, STORAGE_KEYS, setSessionExpiredHandler } from '../api/client';
import { SafeStorage } from '../utils/storage';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  sessionExpiredMessage: string | null;
  clearSessionExpiredMessage: () => void;
  login: (username: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updatedData: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,
  sessionExpiredMessage: null,
  clearSessionExpiredMessage: () => {},
  login: async () => {},
  logout: async () => {},
  updateUser: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState<string | null>(null);

  const isLoggingOutRef = useRef(false);

  const clearSessionExpiredMessage = () => {
    setSessionExpiredMessage(null);
  };

  // Central handler when another login is detected on another device
  const handleDuplicateSessionLogout = async (message?: string) => {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;

    const alertMsg =
      message || 'Another login was detected for this account. You have been logged out.';

    try {
      const uId = user?.id || user?.userID;
      await authService.logout(uId);
      await SafeStorage.removeItem('crm_selected_company_id');
    } catch {
      // Ignore logout cleanup failure
    } finally {
      setToken(null);
      setUser(null);
      setSessionExpiredMessage(alertMsg);
      isLoggingOutRef.current = false;

      // Show immediate native alert to the user
      Alert.alert(
        'Session Expired ⚠️',
        alertMsg,
        [{ text: 'OK' }],
        { cancelable: true }
      );
    }
  };

  // Wire up client.ts Axios response interceptor to this React auth state
  useEffect(() => {
    setSessionExpiredHandler((msg) => {
      handleDuplicateSessionLogout(msg);
    });
    return () => {
      setSessionExpiredHandler(null);
    };
  }, [user]);

  // Initial App Launch Bootstrap
  useEffect(() => {
    const bootstrap = async () => {
      try {
        await initApiBaseUrl();
        const session = await authService.getCurrentSession();
        if (session.token && session.user) {
          const sessionCheck = await authService.validateSession(
            session.user.id || session.user.userID,
            session.user.sessionToken
          );

          if (sessionCheck.valid) {
            setToken(session.token);
            setUser(session.user);

            // Dynamically refresh user profile from DB to get latest assigned companies and default company (Web parity)
            const uId = Number(session.user.id || session.user.userID);
            if (uId > 0) {
              try {
                const freshUser = await userService.getUserById(uId);
                if (freshUser) {
                  const updatedUser = {
                    ...session.user,
                    ...freshUser,
                    companyIds: freshUser.companyIds || [],
                    defaultCompanyId: freshUser.defaultCompanyId ?? null,
                  };
                  setUser(updatedUser);
                  await SafeStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
                }
              } catch (e) {
                console.warn('Could not refresh user profile on bootstrap:', e);
              }
            }
          } else {
            await authService.logout(session.user.id || session.user.userID);
            await SafeStorage.removeItem('crm_selected_company_id');
            setToken(null);
            setUser(null);
            setSessionExpiredMessage(sessionCheck.message || 'Another login was detected for this account.');
          }
        } else {
          setToken(null);
          setUser(null);
        }
      } catch (e) {
        console.warn('Failed to bootstrap auth session', e);
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    bootstrap();
  }, []);

  // 🔒 Single Active Session Heartbeat Check (Periodically verifies if this device holds the active session)
  useEffect(() => {
    if (!token || !user) return;

    let isMounted = true;
    let isChecking = false;

    const validateActiveSession = async () => {
      if (isChecking || !isMounted || isLoggingOutRef.current) return;
      isChecking = true;
      try {
        const uId = user.id || user.userID;
        const sToken = user.sessionToken || (await SafeStorage.getItem(STORAGE_KEYS.SESSION_TOKEN));

        if (uId && sToken) {
          const sessionCheck = await authService.validateSession(uId, sToken);
          if (!sessionCheck.valid && isMounted) {
            await handleDuplicateSessionLogout(sessionCheck.message);
          }
        }
      } catch {
        // Ignore transient errors so brief connection loss doesn't logout
      } finally {
        isChecking = false;
      }
    };

    // Heartbeat check every 5 seconds (rapidly kicks out duplicate login)
    const intervalId = setInterval(validateActiveSession, 5000);

    // AppState check: immediately validate whenever user resumes the mobile app
    const appStateSub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        validateActiveSession();
      }
    });

    return () => {
      isMounted = false;
      clearInterval(intervalId);
      appStateSub.remove();
    };
  }, [token, user]);

  const login = async (username: string, password: string, rememberMe = true) => {
    setSessionExpiredMessage(null);
    const res = await authService.login(username, password, rememberMe);
    setToken(res.token);
    setUser(res.user);

    // Refresh full user details from DB to guarantee mapped companies and default company
    const uId = Number(res.user.id || res.user.userID);
    if (uId > 0) {
      try {
        const freshUser = await userService.getUserById(uId);
        if (freshUser) {
          const updatedUser = {
            ...res.user,
            ...freshUser,
            companyIds: freshUser.companyIds || [],
            defaultCompanyId: freshUser.defaultCompanyId ?? null,
          };
          setUser(updatedUser);
          await SafeStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
        }
      } catch (e) {
        console.warn('Could not refresh user profile on login:', e);
      }
    }
  };

  const logout = async () => {
    const uId = user?.id || user?.userID;
    await authService.logout(uId);
    await SafeStorage.removeItem('crm_selected_company_id');
    setToken(null);
    setUser(null);
    setSessionExpiredMessage(null);
  };

  const updateUser = async (updatedData: Partial<UserProfile>) => {
    if (!user) return;
    const updated = { ...user, ...updatedData };
    setUser(updated);
    await SafeStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updated));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token && !!user,
        sessionExpiredMessage,
        clearSessionExpiredMessage,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
