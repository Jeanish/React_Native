/**
 * TrimCity — useAuth Hook
 * Bootstraps auth state from Firebase on app start.
 */
import { useEffect } from 'react';
import { onAuthStateChange, fetchUserProfile } from '../services/firebase/auth.service';
import { useAuthStore } from '../store/authStore';

export function useAuth() {
  const { setUser, setLoading, user, isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    // Fallback: if Firebase doesn't respond within 5s (e.g. invalid config),
    // clear the loading state so the app can proceed to the Auth screen.
    const timeout = setTimeout(() => setLoading(false), 5000);

    let unsub: () => void;
    try {
      unsub = onAuthStateChange(async firebaseUser => {
        clearTimeout(timeout);
        if (firebaseUser) {
          const profile = await fetchUserProfile(firebaseUser.uid);
          // If Firestore is offline, profile is null — don't wipe the user
          // that verifyOTP already set (e.g. dev bypass or just-registered user)
          if (profile) {
            setUser(profile);
          }
          // else: keep existing store user set by verifyOTP
        } else {
          setUser(null);
        }
        setLoading(false);
      });
    } catch {
      clearTimeout(timeout);
      setLoading(false);
      unsub = () => {};
    }

    return () => {
      clearTimeout(timeout);
      unsub?.();
    };
  }, []);

  return { user, isAuthenticated, isLoading };
}
