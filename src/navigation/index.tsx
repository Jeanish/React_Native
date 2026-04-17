/**
 * TrimCity — Root Navigator
 * Routes to Auth, Customer, or Owner based on auth state.
 */
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/authStore';
import { AuthNavigator } from './AuthNavigator';
import { CustomerNavigator } from './CustomerNavigator';
import { OwnerNavigator } from './OwnerNavigator';
import { AdminNavigator } from './AdminNavigator';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import type { RootStackParamList } from '../types';
import { Colors } from '../constants/theme';

const Root = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { user, isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Loading TrimCity…" />;
  }

  return (
    <NavigationContainer>
      <Root.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated || !user ? (
          <Root.Screen name="Auth" component={AuthNavigator} />
        ) : user.role === 'admin' ? (
          <Root.Screen name="Admin" component={AdminNavigator} />
        ) : user.role === 'owner' ? (
          <Root.Screen name="Owner" component={OwnerNavigator} />
        ) : (
          <Root.Screen name="Customer" component={CustomerNavigator} />
        )}
      </Root.Navigator>
    </NavigationContainer>
  );
}
