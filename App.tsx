/**
 * TrimCity — Root Application Entry Point
 *
 * Bootstraps:
 *   • GestureHandlerRootView (react-native-gesture-handler)
 *   • SafeAreaProvider
 *   • Toast notifications
 *   • Auth state listener (useAuth hook)
 *   • RootNavigator (handles Auth / Customer / Owner routing)
 */
import React, { useEffect } from 'react';
import { StyleSheet, LogBox } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';
import { RootNavigator } from './src/navigation';
import { useAuth } from './src/hooks/useAuth';

// Suppress known noisy RN warnings in dev
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'Require cycle',
]);

// ── Auth Bootstrap ────────────────────────────────────────────────────────────
function AuthBootstrap() {
  // Initialises Firebase auth listener and hydrates the auth store
  useAuth();
  return null;
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <AuthBootstrap />
        <RootNavigator />
        <Toast />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
