import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { saveTokens, loadTokens, clearTokens } from './storage';
import { API_BASE_URL as ENV_API_BASE_URL } from '@env';
import { Platform } from 'react-native';

const FALLBACK_DEV_URL = Platform.select({
  ios: 'http://localhost:5000/api/v1',
  android: 'http://10.0.2.2:5000/api/v1',
  default: 'http://localhost:5000/api/v1',
});
const PROD_URL = 'https://react-native-n4qn.onrender.com/api/v1';

export const API_BASE_URL = ENV_API_BASE_URL || (__DEV__ ? FALLBACK_DEV_URL : PROD_URL);

console.log('=============================================');
console.log('TrimCity API Base URL:', API_BASE_URL);
console.log('ENV_API_BASE_URL was:', ENV_API_BASE_URL);
console.log('=============================================');

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    // ngrok free tier shows an HTML interstitial unless this header is present.
    'ngrok-skip-browser-warning': 'true',
  },
});

let _accessToken: string | null = null;
let _refreshToken: string | null = null;
let _isRefreshing = false;
let _pendingQueue: Array<(token: string | null) => void> = [];

export function setAccessToken(token: string | null) {
  _accessToken = token;
}

export function getAccessToken() {
  return _accessToken;
}

export async function setAuthTokens(access: string, refresh: string) {
  _accessToken = access;
  _refreshToken = refresh;
  await saveTokens(access, refresh);
}

export async function clearAuthTokens() {
  _accessToken = null;
  _refreshToken = null;
  await clearTokens();
}

/** Call once at app startup to rehydrate tokens from storage. */
export async function initAuthFromStorage(): Promise<boolean> {
  const { access, refresh } = await loadTokens();
  if (access && refresh) {
    _accessToken = access;
    _refreshToken = refresh;
    return true;
  }
  return false;
}

async function refreshAccessToken(): Promise<string | null> {
  if (!_refreshToken) return null;
  try {
    const res = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
      refreshToken: _refreshToken,
    });
    const tokens = res.data?.data?.tokens;
    if (tokens?.accessToken && tokens?.refreshToken) {
      await setAuthTokens(tokens.accessToken, tokens.refreshToken);
      return tokens.accessToken;
    }
    return null;
  } catch {
    return null;
  }
}

apiClient.interceptors.request.use(config => {
  if (_accessToken) {
    config.headers.Authorization = `Bearer ${_accessToken}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  res => res,
  async (err: AxiosError) => {
    const original = err.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined;
    if (err.response?.status !== 401 || !original || original._retry || !_refreshToken) {
      if (err.response?.status === 401) await clearAuthTokens();
      return Promise.reject(err);
    }
    // Single-flight refresh — queue concurrent 401s until refresh resolves.
    if (_isRefreshing) {
      return new Promise((resolve, reject) => {
        _pendingQueue.push(token => {
          if (!token) return reject(err);
          original._retry = true;
          original.headers = { ...original.headers, Authorization: `Bearer ${token}` };
          apiClient.request(original).then(resolve).catch(reject);
        });
      });
    }
    _isRefreshing = true;
    const newToken = await refreshAccessToken();
    _isRefreshing = false;
    _pendingQueue.forEach(cb => cb(newToken));
    _pendingQueue = [];
    if (!newToken) {
      await clearAuthTokens();
      return Promise.reject(err);
    }
    original._retry = true;
    original.headers = { ...original.headers, Authorization: `Bearer ${newToken}` };
    return apiClient.request(original);
  },
);

export default apiClient;
