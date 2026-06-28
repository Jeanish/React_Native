/**
 * TrimCity — Admin: Salon Management
 * Lists all salons (verified + pending). Admin can verify, reject, or delete.
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../constants/theme';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  subscribeToAllSalonsAdmin,
  verifySalon,
  adminDeleteSalon,
} from '../../services/firebase/salon.service';
import type { Salon } from '../../types';

type Tab = 'pending' | 'verified' | 'all';

export function AdminSalonsScreen() {
  const [salons, setSalons] = useState<Salon[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('pending');

  useEffect(() => {
    const unsub = subscribeToAllSalonsAdmin(
      data => { setSalons(data); setLoading(false); },
      () => setLoading(false),
    );
    return () => unsub();
  }, []);

  const filtered = salons.filter(s => {
    if (tab === 'pending') return !s.isVerified;
    if (tab === 'verified') return s.isVerified;
    return true;
  });

  async function handleVerify(salon: Salon, approve: boolean) {
    Alert.alert(
      approve ? 'Verify Salon?' : 'Reject Salon?',
      `${salon.name} — ${salon.address}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: approve ? 'Verify ✓' : 'Reject ✕',
          style: approve ? 'default' : 'destructive',
          onPress: async () => {
            const result = await verifySalon(salon.salonId, approve);
            if (result.error) Alert.alert('Error', result.error);
          },
        },
      ],
    );
  }

  async function handleDelete(salon: Salon) {
    Alert.alert(
      'Delete Salon?',
      `This will permanently remove "${salon.name}". This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await adminDeleteSalon(salon.salonId);
            if (result.error) Alert.alert('Error', result.error);
          },
        },
      ],
    );
  }

  const renderItem = ({ item }: { item: Salon }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.cardLeft}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{item.name}</Text>
            <View style={[styles.badge, item.isVerified ? styles.badgeVerified : styles.badgePending]}>
              <Text style={[styles.badgeText, item.isVerified ? styles.badgeTextVerified : styles.badgeTextPending]}>
                {item.isVerified ? '✓ Verified' : '⏳ Pending'}
              </Text>
            </View>
          </View>
          <Text style={styles.address}>📍 {item.address}</Text>
          <Text style={styles.meta}>
            {item.category.toUpperCase()} · {item.totalSeats} seats · {item.services.length} services
          </Text>
          <Text style={styles.meta}>
            📞 {item.phone || 'No phone'} · ★ {item.rating.toFixed(1)}
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        {!item.isVerified ? (
          <TouchableOpacity
            style={[styles.actionBtn, styles.verifyBtn]}
            onPress={() => handleVerify(item, true)}
            activeOpacity={0.8}>
            <Text style={styles.verifyText}>✓ Verify</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.actionBtn, styles.rejectBtn]}
            onPress={() => handleVerify(item, false)}
            activeOpacity={0.8}>
            <Text style={styles.rejectText}>✕ Unverify</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.actionBtn, styles.deleteBtn]}
          onPress={() => handleDelete(item)}
          activeOpacity={0.8}>
          <Text style={styles.deleteText}>🗑 Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) return <LoadingSpinner fullScreen message="Loading salons…" />;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar backgroundColor="transparent" translucent barStyle="light-content" />
      <LinearGradient
        colors={['#1A237E', '#283593', '#3949AB']}
        style={styles.header}>
        <Text style={styles.headerTitle}>Salon Management</Text>
        <Text style={styles.headerSub}>{salons.length} total salons</Text>
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['pending', 'verified', 'all'] as Tab[]).map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
            activeOpacity={0.8}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'pending'
                ? `Pending (${salons.filter(s => !s.isVerified).length})`
                : t === 'verified'
                ? `Live (${salons.filter(s => s.isVerified).length})`
                : `All (${salons.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        renderItem={renderItem}
        keyExtractor={item => item.salonId}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="🏪"
            title={tab === 'pending' ? 'No pending salons' : 'No salons found'}
            subtitle={tab === 'pending' ? 'All salons are verified.' : 'Add a salon using the + tab.'}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[4],
    paddingBottom: Spacing[5],
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: { fontSize: Typography.xl, fontWeight: Typography.black, color: Colors.white },
  headerSub: { fontSize: Typography.sm, color: 'rgba(255,255,255,0.7)', marginTop: 2 },

  tabs: {
    flexDirection: 'row',
    marginHorizontal: Spacing[4],
    marginTop: Spacing[3],
    marginBottom: Spacing[2],
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radius.lg,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing[2],
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: Colors.white, ...Shadow.sm },
  tabText: { fontSize: Typography.xs, color: Colors.textTertiary, fontWeight: Typography.semibold },
  tabTextActive: { color: '#3949AB' },

  list: { paddingHorizontal: Spacing[4], paddingBottom: Spacing[8] },

  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing[3],
    marginBottom: Spacing[3],
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadow.sm,
  },
  cardTop: { marginBottom: Spacing[3] },
  cardLeft: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[2], marginBottom: 4, flexWrap: 'wrap' },
  name: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.textPrimary },
  badge: {
    paddingHorizontal: Spacing[2],
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  badgeVerified: { backgroundColor: '#E8F5E9' },
  badgePending: { backgroundColor: '#FFF8E1' },
  badgeText: { fontSize: 10, fontWeight: Typography.bold },
  badgeTextVerified: { color: '#2E7D32' },
  badgeTextPending: { color: '#F57F17' },
  address: { fontSize: Typography.sm, color: Colors.textSecondary, marginBottom: 2 },
  meta: { fontSize: Typography.xs, color: Colors.textTertiary, marginTop: 2 },

  actions: { flexDirection: 'row', gap: Spacing[2] },
  actionBtn: {
    flex: 1,
    paddingVertical: Spacing[2],
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  verifyBtn: { backgroundColor: '#E8F5E9' },
  verifyText: { color: '#2E7D32', fontSize: Typography.sm, fontWeight: Typography.bold },
  rejectBtn: { backgroundColor: '#FFF3E0' },
  rejectText: { color: '#E65100', fontSize: Typography.sm, fontWeight: Typography.bold },
  deleteBtn: { backgroundColor: '#FFEBEE' },
  deleteText: { color: Colors.error, fontSize: Typography.sm, fontWeight: Typography.bold },
});
