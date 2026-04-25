/**
 * Bootstraps auth state on app start.
 * Source of truth: backend JWT (persisted in AsyncStorage).
 * Firebase is used only for phone OTP, not as a source of identity.
 */
import { useEffect } from 'react';
import { initAuthFromStorage } from '../services/api/client';
import { fetchUserProfile } from '../services/firebase/auth.service';
import { useAuthStore } from '../store/authStore';

export function useAuth() {
  const { setUser, setLoading, user, isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const hasTokens = await initAuthFromStorage();
      if (!hasTokens) {
        // No tokens → forcibly clear any stale persisted user. Prevents the
        // "logged-in but every API 401s" state after sign-out or app wipe.
        if (!cancelled) {
          setUser(null);
          setLoading(false);
        }
        return;
      }
      const result = await fetchUserProfile();
      if (cancelled) return;
      if (result.data) setUser(result.data);
      else setUser(null); // token invalid — force re-login
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  return { user, isAuthenticated, isLoading };
}
