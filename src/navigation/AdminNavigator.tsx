/**
 * TrimCity — Admin Navigator
 * Bottom tabs for the admin panel (blue theme).
 */
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet } from 'react-native';
import { Colors, Typography } from '../constants/theme';
import type { AdminTabParamList } from '../types';
import { AdminSalonsScreen } from '../screens/admin/AdminSalonsScreen';
import { AdminAddSalonScreen } from '../screens/admin/AdminAddSalonScreen';
import { AdminProfileScreen } from '../screens/admin/AdminProfileScreen';

const Tab = createBottomTabNavigator<AdminTabParamList>();

function TabIcon({ emoji, label, focused }: { emoji: string; label: string; focused: boolean }) {
  return (
    <View style={styles.tabItem}>
      <Text style={[styles.tabEmoji, focused && styles.tabEmojiFocused]}>{emoji}</Text>
      <Text style={[styles.tabLabel, focused && styles.tabLabelFocused]}>{label}</Text>
    </View>
  );
}

export function AdminNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: '#3949AB',
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
        name="AdminSalons"
        component={AdminSalonsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🏪" label="Salons" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="AdminAdd"
        component={AdminAddSalonScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="➕" label="Add Salon" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="AdminProfile"
        component={AdminProfileScreen}
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
  tabLabelFocused: { color: '#3949AB' },
});
