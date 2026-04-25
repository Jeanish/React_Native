import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  ACCESS: '@trimcity/access_token',
  REFRESH: '@trimcity/refresh_token',
  USER: '@trimcity/user',
} as const;

export async function saveTokens(access: string, refresh: string) {
  await AsyncStorage.multiSet([
    [KEYS.ACCESS, access],
    [KEYS.REFRESH, refresh],
  ]);
}

export async function loadTokens(): Promise<{ access: string | null; refresh: string | null }> {
  const pairs = await AsyncStorage.multiGet([KEYS.ACCESS, KEYS.REFRESH]);
  return { access: pairs[0][1], refresh: pairs[1][1] };
}

export async function clearTokens() {
  await AsyncStorage.multiRemove([KEYS.ACCESS, KEYS.REFRESH, KEYS.USER]);
}

export async function saveUser(user: unknown) {
  await AsyncStorage.setItem(KEYS.USER, JSON.stringify(user));
}

export async function loadUser<T = unknown>(): Promise<T | null> {
  const raw = await AsyncStorage.getItem(KEYS.USER);
  return raw ? JSON.parse(raw) : null;
}
