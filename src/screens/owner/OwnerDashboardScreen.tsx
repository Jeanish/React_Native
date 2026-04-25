/**
 * TrimCity — Owner Dashboard Screen
 * Today's summary, live queue, and quick-update controls.
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../constants/theme';
import { LiveStatusBox } from '../../components/salon/LiveStatusBox';
import { LiveIndicator } from '../../components/salon/LiveIndicator';
import { AppointmentBadge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useAuthStore } from '../../store/authStore';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { OwnerTabParamList } from '../../types';
import { fetchMySalon, toSalonWithMetaFromApi, type ApiSalon } from '../../services/api/salon.service';
import { fetchSalonAppointments, updateAppointmentStatus, type ApiAppointment } from '../../services/api/booking.service';
import type { Appointment, Salon } from '../../types';
import { todayDateString, formatPrice } from '../../utils/formatters';
import { Strings } from '../../constants/strings';

export function OwnerDashboardScreen() {
  const { user } = useAuthStore();
  const navigation = useNavigation<BottomTabNavigationProp<OwnerTabParamList>>();
  const [salon, setSalon] = useState<Salon | null>(null);
  const [apiSalon, setApiSalon] = useState<ApiSalon | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  function apiApptToAppointment(a: ApiAppointment): Appointment {
    const svc = typeof a.serviceId === 'object' ? a.serviceId : null;
    const s = typeof a.salonId === 'object' ? a.salonId : null;
    const statusMap: Record<string, Appointment['status']> = {
      pending: 'waiting', confirmed: 'confirmed', 'in-progress': 'confirmed',
      completed: 'completed', cancelled: 'cancelled', 'no-show': 'completed',
    };
    return {
      appointmentId: a._id,
      salonId: s?._id ?? (typeof a.salonId === 'string' ? a.salonId : ''),
      salonName: s?.name ?? salon?.name ?? '',
      salonAddress: '', salonLatitude: 0, salonLongitude: 0,
      customerId: typeof a.customerId === 'string' ? a.customerId : (a.customerId as any)?._id ?? '',
      customerName: typeof a.customerId === 'object' ? `${(a.customerId as any).firstName} ${(a.customerId as any).lastName}`.trim() : '',
      customerPhone: typeof a.customerId === 'object' ? (a.customerId as any).phone ?? '' : '',
      service: svc?.name ?? 'Service',
      servicePriceInr: svc?.price ?? a.totalAmount ?? 0,
      serviceDurationMinutes: svc?.duration ?? 0,
      timeSlot: a.startTime, date: a.appointmentDate?.slice(0, 10) ?? '',
      status: statusMap[a.status] ?? 'confirmed',
      createdAt: new Date(a.createdAt).getTime(),
    };
  }

  async function loadSalon() {
    if (!user) return;
    const result = await fetchMySalon();
    if (result.data) {
      setApiSalon(result.data);
      setSalon(toSalonWithMetaFromApi(result.data) as any);
    }
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    loadSalon();
  }, [user?.uid]);

  // Fetch today's appointments (poll every 30s)
  useEffect(() => {
    if (!salon) return;
    const load = async () => {
      const result = await fetchSalonAppointments({ date: todayDateString() });
      if (result.data) setAppointments(result.data.map(apiApptToAppointment));
    };
    load();
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, [salon?.salonId]);


  async function handleMarkStatus(appt: Appointment, newStatus: 'confirmed' | 'completed' | 'cancelled') {
    const result = await updateAppointmentStatus(appt.appointmentId, newStatus);
    if (result.error) Alert.alert('Error', result.error);
    else {
      setAppointments(prev =>
        prev.map(a => a.appointmentId === appt.appointmentId ? { ...a, status: newStatus } : a)
      );
    }
  }

  if (loading) return <LoadingSpinner fullScreen message="Loading dashboard…" />;

  if (!salon) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar backgroundColor="transparent" translucent barStyle="light-content" />
        <LinearGradient
          colors={['#7B0000', '#C62828', '#D32F2F']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>Welcome,</Text>
              <Text style={styles.salonName}>No Salon Yet</Text>
            </View>
          </View>
        </LinearGradient>
        <EmptyState
          icon="✂️"
          title="No Salon Found"
          subtitle="Set up your salon profile to start accepting bookings and managing your live queue."
          actionLabel="Set Up My Salon"
          onAction={() => navigation.navigate('SalonSetup')}
        />
      </SafeAreaView>
    );
  }

  const waiting = appointments.filter(a => a.status === 'waiting');
  const seated = appointments.filter(a => a.status === 'confirmed');
  const completedToday = appointments.filter(a => a.status === 'completed').length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="transparent" translucent barStyle="light-content" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadSalon(); }}
            colors={[Colors.navigationRed]}
            tintColor={Colors.navigationRed}
          />
        }>

        {/* Header */}
        <LinearGradient
          colors={['#7B0000', '#C62828', '#D32F2F']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>Welcome back,</Text>
              <Text style={styles.salonName}>{salon?.name ?? 'Your Salon'}</Text>
            </View>
            {salon?.isOpen && <LiveIndicator />}
          </View>

          {/* Auto Status — derived from working hours, not a toggle */}
          <View style={styles.openToggle}>
            <Text style={styles.openToggleLabel}>
              Salon is {salon?.isOpen ? 'OPEN' : 'CLOSED'}
            </Text>
            <Text style={styles.openToggleHint}>
              Auto-set from working hours · admin manages hours
            </Text>
          </View>
        </LinearGradient>

        {/* Today Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{Strings.ownerDashboard.todayBookings}</Text>
          <View style={styles.summaryGrid}>
            <SummaryCard
              icon="📋"
              value={appointments.length}
              label="Total Today"
              color={Colors.info}
            />
            <SummaryCard
              icon="💺"
              value={salon?.seatedNow ?? 0}
              label="Seated Now"
              color={Colors.available}
            />
            <SummaryCard
              icon="⏳"
              value={salon?.waitingNow ?? 0}
              label="Waiting"
              color={Colors.busy}
            />
            <SummaryCard
              icon="✅"
              value={completedToday}
              label="Done Today"
              color={Colors.textSecondary}
            />
          </View>
        </View>

        {/* Live Status */}
        {salon && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Live Capacity</Text>
            <LiveStatusBox
              seatedNow={salon.seatedNow}
              totalSeats={salon.totalSeats}
              waitingNow={salon.waitingNow}
            />
          </View>
        )}

        {/* Live Queue — Waiting */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {Strings.ownerDashboard.liveQueue} ({waiting.length})
          </Text>
          {waiting.length === 0 ? (
            <View style={styles.emptyQueue}>
              <Text style={styles.emptyQueueText}>No customers waiting 🎉</Text>
            </View>
          ) : (
            waiting.map((appt, idx) => (
              <QueueCard
                key={appt.appointmentId}
                appointment={appt}
                index={idx + 1}
                onMarkSeated={() => handleMarkStatus(appt, 'confirmed')}
                onMarkDone={() => handleMarkStatus(appt, 'completed')}
              />
            ))
          )}
        </View>

        {/* Currently Seated */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Currently Seated ({seated.length})</Text>
          {seated.length === 0 ? (
            <View style={styles.emptyQueue}>
              <Text style={styles.emptyQueueText}>No one seated right now</Text>
            </View>
          ) : (
            seated.map(appt => (
              <QueueCard
                key={appt.appointmentId}
                appointment={appt}
                index={0}
                onMarkDone={() => handleMarkStatus(appt, 'completed')}
                isSeated
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryCard({
  icon, value, label, color,
}: { icon: string; value: number; label: string; color: string }) {
  return (
    <View style={[summaryStyles.card, { borderTopColor: color }]}>
      <Text style={summaryStyles.icon}>{icon}</Text>
      <Text style={[summaryStyles.value, { color }]}>{value}</Text>
      <Text style={summaryStyles.label}>{label}</Text>
    </View>
  );
}
const summaryStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing[3],
    alignItems: 'center',
    borderTopWidth: 3,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadow.sm,
  },
  icon: { fontSize: 20, marginBottom: 4 },
  value: { fontSize: Typography.xl, fontWeight: Typography.black },
  label: { fontSize: 10, color: Colors.textTertiary, fontWeight: Typography.semibold, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.3 },
});

function QueueCard({
  appointment, index, onMarkSeated, onMarkDone, isSeated = false,
}: {
  appointment: Appointment;
  index: number;
  onMarkSeated?: () => void;
  onMarkDone?: () => void;
  isSeated?: boolean;
}) {
  return (
    <View style={queueStyles.card}>
      <View style={queueStyles.header}>
        {!isSeated && index > 0 && (
          <View style={queueStyles.queueBadge}>
            <Text style={queueStyles.queueNum}>#{index}</Text>
          </View>
        )}
        <View style={queueStyles.info}>
          <Text style={queueStyles.name}>{appointment.customerName}</Text>
          <Text style={queueStyles.service}>{appointment.service}</Text>
          <Text style={queueStyles.meta}>
            📞 {appointment.customerPhone} · 🕐 {appointment.timeSlot}
          </Text>
        </View>
        <AppointmentBadge status={appointment.status} />
      </View>
      <View style={queueStyles.actions}>
        {!isSeated && onMarkSeated && (
          <TouchableOpacity
            style={[queueStyles.actionBtn, queueStyles.seatBtn]}
            onPress={onMarkSeated}
            activeOpacity={0.8}>
            <Text style={queueStyles.seatBtnText}>💺 Mark Seated</Text>
          </TouchableOpacity>
        )}
        {onMarkDone && (
          <TouchableOpacity
            style={[queueStyles.actionBtn, queueStyles.doneBtn]}
            onPress={onMarkDone}
            activeOpacity={0.8}>
            <Text style={queueStyles.doneBtnText}>✅ Mark Done</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
const queueStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing[3],
    marginBottom: Spacing[2],
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadow.sm,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing[2], marginBottom: Spacing[2] },
  queueBadge: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.navigationRed,
    alignItems: 'center', justifyContent: 'center',
  },
  queueNum: { color: Colors.white, fontSize: Typography.xs, fontWeight: Typography.black },
  info: { flex: 1 },
  name: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.textPrimary },
  service: { fontSize: Typography.sm, color: Colors.navigationRed, fontWeight: Typography.semibold },
  meta: { fontSize: Typography.xs, color: Colors.textTertiary, marginTop: 2, fontWeight: Typography.medium },
  actions: { flexDirection: 'row', gap: Spacing[2] },
  actionBtn: { flex: 1, paddingVertical: Spacing[2], borderRadius: Radius.md, alignItems: 'center' },
  seatBtn: { backgroundColor: Colors.navigationRedSurface },
  seatBtnText: { color: Colors.navigationRed, fontSize: Typography.sm, fontWeight: Typography.bold },
  doneBtn: { backgroundColor: Colors.availableSurface },
  doneBtnText: { color: Colors.available, fontSize: Typography.sm, fontWeight: Typography.bold },
});

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingBottom: Spacing[10] },
  header: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[4],
    paddingBottom: Spacing[5],
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: Spacing[4],
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing[3],
  },
  greeting: { fontSize: Typography.sm, color: 'rgba(255,255,255,0.8)', fontWeight: Typography.medium },
  salonName: { fontSize: Typography.xl, fontWeight: Typography.black, color: Colors.white },
  openToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
  },
  openToggleLabel: { color: Colors.white, fontSize: Typography.base, fontWeight: Typography.bold },
  openToggleHint: { color: 'rgba(255,255,255,0.75)', fontSize: Typography.xs, marginTop: 2, fontWeight: Typography.medium },
  section: {
    marginHorizontal: Spacing[4],
    marginBottom: Spacing[4],
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing[4],
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadow.sm,
  },
  sectionTitle: {
    fontSize: Typography.base,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing[3],
  },
  summaryGrid: { flexDirection: 'row', gap: Spacing[2] },
  emptyQueue: {
    paddingVertical: Spacing[4],
    alignItems: 'center',
  },
  emptyQueueText: {
    fontSize: Typography.sm,
    color: Colors.textTertiary,
    fontWeight: Typography.medium,
  },
});
