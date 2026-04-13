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
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import type { RootStackParamList } from '../types';
import { Colors } from '../constants/theme';

const Root = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { user, isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Loading TrimCity…" />;
  }

  // Determine which flow to show based on user role
  const getInitialRoute = (): keyof RootStackParamList => {
    if (!isAuthenticated || !user) return 'Auth';
    if (user.role === 'owner') return 'Owner';
    return 'Customer';
  };

  return (
    <NavigationContainer>
      <Root.Navigator
        initialRouteName={getInitialRoute()}
        screenOptions={{ headerShown: false }}>
        <Root.Screen name="Auth" component={AuthNavigator} />
        <Root.Screen name="Customer" component={CustomerNavigator} />
        <Root.Screen name="Owner" component={OwnerNavigator} />
      </Root.Navigator>
    </NavigationContainer>
  );
}
