/**
 * TrimCity — useAuth Hook
 * Bootstraps auth state from stored JWT tokens on app start.
 */
import { useEffect } from 'react';
import { initAuthFromStorage } from '../services/api/client';
import { fetchCurrentUserProfile } from '../services/api/auth.service';
import { initPushNotifications } from '../services/firebase/notifications.service';
import { useAuthStore } from '../store/authStore';

export function useAuth() {
  const { setUser, setLoading, user, isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const hasTokens = await initAuthFromStorage();
        if (!hasTokens) {
          if (!cancelled) setUser(null);
          return;
        }
        const result = await fetchCurrentUserProfile();
        if (cancelled) return;
        if (result.data) {
          setUser(result.data);
          initPushNotifications();
        } else {
          setUser(null);
        }
      } catch {
        // token invalid — force re-login
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();

    return () => {
      cancelled = true;
    };
  }, []);

  return { user, isAuthenticated, isLoading };
}
