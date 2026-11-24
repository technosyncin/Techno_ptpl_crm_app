import AsyncStorage from '@react-native-async-storage/async-storage';

// Memory cache fallback in case native storage fails
const memoryStore = new Map<string, string>();

export const SafeStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      const val = await AsyncStorage.getItem(key);
      if (val !== null) return val;
    } catch (e) {
      // fallback to memoryStore
    }
    return memoryStore.get(key) || null;
  },

  setItem: async (key: string, value: string): Promise<void> => {
    memoryStore.set(key, value);
    try {
      await AsyncStorage.setItem(key, value);
    } catch (e) {
      // Memory store is already updated
    }
  },

  removeItem: async (key: string): Promise<void> => {
    memoryStore.delete(key);
    try {
      await AsyncStorage.removeItem(key);
    } catch (e) {
      // ignore
    }
  },

  clearAuth: async (tokenKey: string, sessionKey: string, userKey: string): Promise<void> => {
    memoryStore.delete(tokenKey);
    memoryStore.delete(sessionKey);
    memoryStore.delete(userKey);
    try {
      await AsyncStorage.removeItem(tokenKey);
      await AsyncStorage.removeItem(sessionKey);
      await AsyncStorage.removeItem(userKey);
    } catch (e) {
      // ignore
    }
  },
};
