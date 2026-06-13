import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { saveTokens, loadTokens, clearTokens } from './storage';

const DEV_URL = 'https://bcfe-2401-4900-5768-2b6-a9fb-3d65-2c0f-bda2.ngrok-free.app/api/v1';
const PROD_URL = 'https://api.trimcity.in/api/v1';

export const API_BASE_URL = __DEV__ ? DEV_URL : PROD_URL;

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
