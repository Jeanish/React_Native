/**
 * TrimCity — Customer Navigator
 * Bottom tabs (RED) + nested stack for salon detail & booking confirm.
 */
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, View, StyleSheet } from 'react-native';
import { Colors, Typography } from '../constants/theme';
import type { CustomerTabParamList, CustomerStackParamList } from '../types';

// Screens
import { HomeScreen } from '../screens/customer/HomeScreen';
import { SalonDetailScreen } from '../screens/customer/SalonDetailScreen';
import { BookingConfirmScreen } from '../screens/customer/BookingConfirmScreen';
import { AppointmentsScreen } from '../screens/customer/AppointmentsScreen';
import { ProfileScreen } from '../screens/customer/ProfileScreen';

const Tab = createBottomTabNavigator<CustomerTabParamList>();
const Stack = createNativeStackNavigator<CustomerStackParamList>();

// ── Tab Icons ──────────────────────────────────────────────────────────────────
function TabIcon({ emoji, label, focused }: { emoji: string; label: string; focused: boolean }) {
  return (
    <View style={styles.tabItem}>
      <Text style={[styles.tabEmoji, focused && styles.tabEmojiFocused]}>{emoji}</Text>
      <Text style={[styles.tabLabel, focused && styles.tabLabelFocused]}>{label}</Text>
    </View>
  );
}

// ── Home Stack (includes SalonDetail + Confirm) ────────────────────────────────
function HomeStack() {
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
        name="HomeTab"
        component={HomeScreen}
        options={{ title: 'TrimCity', headerShown: false }}
      />
      <Stack.Screen
        name="SalonDetail"
        component={SalonDetailScreen}
        options={({ route }) => ({ title: route.params.salonName })}
      />
      <Stack.Screen
        name="BookingConfirm"
        component={BookingConfirmScreen}
        options={{ title: 'Booking Confirmed', headerShown: false }}
      />
    </Stack.Navigator>
  );
}

// ── Bottom Tab Navigator ───────────────────────────────────────────────────────
export function CustomerNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: Colors.navigationRed,
        tabBarInactiveTintColor: Colors.textTertiary,
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopColor: Colors.borderLight,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
        },
      }}>
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🔍" label="Explore" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Appointments"
        component={AppointmentsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="📅" label="Bookings" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="👤" label="Profile" focused={focused} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabItem: { alignItems: 'center', justifyContent: 'center' },
  tabEmoji: { fontSize: 22, opacity: 0.5 },
  tabEmojiFocused: { opacity: 1 },
  tabLabel: {
    fontSize: 10,
    color: Colors.textTertiary,
    fontWeight: Typography.semibold,
    marginTop: 2,
  },
  tabLabelFocused: { color: Colors.navigationRed },
});
