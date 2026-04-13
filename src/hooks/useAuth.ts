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
    const unsub = onAuthStateChange(async firebaseUser => {
      if (firebaseUser) {
        const profile = await fetchUserProfile(firebaseUser.uid);
        setUser(profile);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return { user, isAuthenticated, isLoading };
}
