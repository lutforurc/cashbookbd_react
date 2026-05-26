import AsyncStorage from '@react-native-async-storage/async-storage';

const tokenKey = 'cashbookbd.authToken';
const userKey = 'cashbookbd.user';

export const tokenStorage = {
  async getToken() {
    return AsyncStorage.getItem(tokenKey);
  },

  async setToken(token: string) {
    await AsyncStorage.setItem(tokenKey, token);
  },

  async getUser<T>() {
    const raw = await AsyncStorage.getItem(userKey);
    return raw ? (JSON.parse(raw) as T) : null;
  },

  async setUser(user: unknown) {
    await AsyncStorage.setItem(userKey, JSON.stringify(user));
  },

  async clear() {
    await AsyncStorage.multiRemove([tokenKey, userKey]);
  },
};
