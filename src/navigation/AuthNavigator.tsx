/**
 * TrimCity — Auth Navigator
 * Stack: Phone → OTP
 */
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Colors } from '../constants/theme';
import type { AuthStackParamList } from '../types';

// Screens (lazy imports for perf)
import { PhoneScreen } from '../screens/auth/PhoneScreen';
import { OTPScreen } from '../screens/auth/OTPScreen';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: Colors.navigationRed },
        headerTintColor: Colors.white,
        headerTitleStyle: { fontWeight: '700', fontSize: 18 },
        headerShadowVisible: false,
        animation: 'slide_from_right',
        statusBarColor: Colors.navigationRedDark,
        statusBarStyle: 'light',
      }}>
      <Stack.Screen
        name="Phone"
        component={PhoneScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="OTP"
        component={OTPScreen}
        options={{ title: 'Verify Number' }}
      />
    </Stack.Navigator>
  );
}
