/**
 * TrimCity — Auth Store (Zustand)
 * Global authentication state. Persisted via AsyncStorage.
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppUser } from '../types';

interface AuthState {
  user: AppUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  setUser: (user: AppUser | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;
  updateUserName: (name: string) => void;
  updateFcmToken: (token: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,

      setUser: (user) =>
        set({ user, isAuthenticated: user !== null, error: null }),

      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error }),

      logout: () =>
        set({ user: null, isAuthenticated: false, error: null }),

      updateUserName: (name) =>
        set(state => ({
          user: state.user ? { ...state.user, name } : null,
        })),

      updateFcmToken: (fcmToken) =>
        set(state => ({
          user: state.user ? { ...state.user, fcmToken } : null,
        })),
    }),
    {
      name: 'trimcity-auth',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    },
  ),
);
