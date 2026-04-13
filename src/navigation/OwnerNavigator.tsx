/**
 * TrimCity — Owner Navigator
 * Bottom tabs (RED) for salon owner panel.
 */
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet } from 'react-native';
import { Colors, Typography } from '../constants/theme';
import type { OwnerTabParamList } from '../types';

import { OwnerDashboardScreen } from '../screens/owner/OwnerDashboardScreen';
import { SalonSetupScreen } from '../screens/owner/SalonSetupScreen';
import { BookingManagementScreen } from '../screens/owner/BookingManagementScreen';

const Tab = createBottomTabNavigator<OwnerTabParamList>();

function TabIcon({ emoji, label, focused }: { emoji: string; label: string; focused: boolean }) {
  return (
    <View style={styles.tabItem}>
      <Text style={[styles.tabEmoji, focused && styles.tabEmojiFocused]}>{emoji}</Text>
      <Text style={[styles.tabLabel, focused && styles.tabLabelFocused]}>{label}</Text>
    </View>
  );
}

export function OwnerNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: Colors.navigationRed },
        headerTintColor: Colors.white,
        headerTitleStyle: { fontWeight: '700', fontSize: 18 },
        headerShadowVisible: false,
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
        statusBarColor: Colors.navigationRedDark,
        statusBarStyle: 'light',
      }}>
      <Tab.Screen
        name="Dashboard"
        component={OwnerDashboardScreen}
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="📊" label="Dashboard" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="BookingMgmt"
        component={BookingManagementScreen}
        options={{
          title: 'Bookings',
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="📋" label="Bookings" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="SalonSetup"
        component={SalonSetupScreen}
        options={{
          title: 'My Salon',
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="✂️" label="Salon" focused={focused} />
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
