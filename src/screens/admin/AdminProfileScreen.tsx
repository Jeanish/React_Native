/**
 * TrimCity — Admin Profile Screen
 * Platform stats overview and sign out.
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  ScrollView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../constants/theme';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../store/authStore';
import { fetchSalons, toSalonWithMetaFromApi } from '../../services/api/salon.service';
import { formatPhone } from '../../utils/formatters';
import type { Salon } from '../../types';

const ADMIN_INDIGO = '#3949AB';

export function AdminProfileScreen() {
  const { user, logout } = useAuthStore();
  const [salons, setSalons] = useState<Salon[]>([]);

  useEffect(() => {
    fetchSalons({ limit: 100 }).then(result => {
      if (result.data) setSalons(result.data.map(s => toSalonWithMetaFromApi(s) as any));
    });
  }, []);

  const verified = salons.filter(s => s.isVerified).length;
  const pending = salons.filter(s => !s.isVerified).length;
  const openNow = salons.filter(s => s.isVerified && s.isOpen).length;

  function handleLogout() {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar backgroundColor="transparent" translucent barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        <LinearGradient
          colors={['#1A237E', '#283593', '#3949AB']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name ? user.name.charAt(0).toUpperCase() : '🛡'}
            </Text>
          </View>
          <Text style={styles.displayName}>{user?.name || 'Admin'}</Text>
          <Text style={styles.phone}>{formatPhone(user?.phone ?? '')}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>🛡 App Administrator</Text>
          </View>
        </LinearGradient>

        {/* Platform Stats */}
        <View style={styles.statsRow}>
          {[
            { label: 'Total Salons', value: salons.length, color: ADMIN_INDIGO },
            { label: 'Live Now', value: verified, color: Colors.available },
            { label: 'Open Now', value: openNow, color: Colors.info },
            { label: 'Pending', value: pending, color: Colors.busy },
          ].map(stat => (
            <View key={stat.label} style={[styles.statCard, { borderTopColor: stat.color }]}>
              <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Account */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Account</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Name</Text>
            <Text style={styles.infoValue}>{user?.name || '—'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Phone</Text>
            <Text style={styles.infoValue}>{formatPhone(user?.phone ?? '')}</Text>
          </View>
          <View style={[styles.infoRow, styles.infoRowLast]}>
            <Text style={styles.infoLabel}>Role</Text>
            <View style={styles.adminBadge}>
              <Text style={styles.adminBadgeText}>ADMIN</Text>
            </View>
          </View>
        </View>

        {/* About */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>About</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>App</Text>
            <Text style={styles.infoValue}>TrimCity</Text>
          </View>
          <View style={[styles.infoRow, styles.infoRowLast]}>
            <Text style={styles.infoLabel}>Version</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>
        </View>

        <View style={styles.logoutWrapper}>
          <Button
            title="Sign Out"
            onPress={handleLogout}
            variant="danger"
            fullWidth
            size="lg"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingBottom: Spacing[10] },

  header: {
    alignItems: 'center',
    paddingTop: Spacing[8],
    paddingBottom: Spacing[6],
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    marginBottom: Spacing[4],
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[3],
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarText: { fontSize: 38, color: Colors.white, fontWeight: Typography.bold },
  displayName: {
    fontSize: Typography.xl,
    fontWeight: Typography.black,
    color: Colors.white,
    marginBottom: 4,
  },
  phone: {
    fontSize: Typography.base,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: Typography.medium,
    marginBottom: Spacing[2],
  },
  roleBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing[3],
    paddingVertical: 4,
  },
  roleText: { color: Colors.white, fontSize: Typography.sm, fontWeight: Typography.semibold },

  statsRow: {
    flexDirection: 'row',
    marginHorizontal: Spacing[4],
    marginBottom: Spacing[4],
    gap: Spacing[2],
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing[2],
    alignItems: 'center',
    borderTopWidth: 3,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadow.sm,
  },
  statValue: { fontSize: Typography.xl, fontWeight: Typography.black },
  statLabel: {
    fontSize: 9,
    color: Colors.textTertiary,
    fontWeight: Typography.semibold,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    textAlign: 'center',
  },

  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    marginHorizontal: Spacing[4],
    marginBottom: Spacing[3],
    padding: Spacing[4],
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadow.sm,
  },
  cardTitle: {
    fontSize: Typography.base,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing[3],
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  infoRowLast: { borderBottomWidth: 0 },
  infoLabel: { fontSize: Typography.sm, color: Colors.textSecondary, fontWeight: Typography.medium },
  infoValue: { fontSize: Typography.sm, color: Colors.textPrimary, fontWeight: Typography.semibold },

  adminBadge: {
    backgroundColor: '#E8EAF6',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing[2],
    paddingVertical: 3,
  },
  adminBadgeText: {
    fontSize: Typography.xs,
    fontWeight: Typography.black,
    color: ADMIN_INDIGO,
    letterSpacing: 0.5,
  },

  logoutWrapper: { marginHorizontal: Spacing[4], marginTop: Spacing[2] },
});
