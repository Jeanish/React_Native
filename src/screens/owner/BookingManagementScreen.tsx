/**
 * TrimCity — Booking Management Screen
 * Owner: confirm/reject bookings, add walk-ins.
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../constants/theme';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { AppointmentBadge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useAuthStore } from '../../store/authStore';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { OwnerTabParamList } from '../../types';
import { fetchMySalon, toSalonWithMetaFromApi, type ApiSalon } from '../../services/api/salon.service';
import { fetchSalonAppointments, updateAppointmentStatus, createWalkInAppointment, type ApiAppointment } from '../../services/api/booking.service';
import { isValidIndianPhone, normalizePhone } from '../../utils/phone';
import type { Appointment, Salon } from '../../types';
import { todayDateString, formatPrice } from '../../utils/formatters';
import { Strings } from '../../constants/strings';

export function BookingManagementScreen() {
  const { user } = useAuthStore();
  const navigation = useNavigation<BottomTabNavigationProp<OwnerTabParamList>>();
  const [salon, setSalon] = useState<Salon | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [walkInName, setWalkInName] = useState('');
  const [walkInPhone, setWalkInPhone] = useState('');
  const [walkInService, setWalkInService] = useState('');
  const [addingWalkIn, setAddingWalkIn] = useState(false);

  function apiApptToAppointment(a: ApiAppointment): Appointment {
    const svc = typeof a.serviceId === 'object' ? a.serviceId : null;
    const cust = typeof a.customerId === 'object' ? a.customerId : null;
    const statusMap: Record<string, Appointment['status']> = {
      pending: 'waiting', confirmed: 'confirmed', 'in-progress': 'confirmed',
      completed: 'completed', cancelled: 'cancelled', 'no-show': 'completed',
    };
    return {
      appointmentId: a._id,
      salonId: typeof a.salonId === 'string' ? a.salonId : (a.salonId as any)?._id ?? '',
      salonName: salon?.name ?? '', salonAddress: '', salonLatitude: 0, salonLongitude: 0,
      customerId: cust?._id ?? (typeof a.customerId === 'string' ? a.customerId : ''),
      customerName: cust ? `${cust.firstName} ${cust.lastName}`.trim() : 'Customer',
      customerPhone: cust?.phone ?? '',
      service: svc?.name ?? 'Service',
      servicePriceInr: svc?.price ?? a.totalAmount ?? 0,
      serviceDurationMinutes: svc?.duration ?? 0,
      timeSlot: a.startTime, date: a.appointmentDate?.slice(0, 10) ?? '',
      status: statusMap[a.status] ?? 'confirmed',
      createdAt: new Date(a.createdAt).getTime(),
      updatedAt: new Date(a.createdAt).getTime(),
    };
  }

  useEffect(() => {
    if (!user) return;
    fetchMySalon().then(result => {
      if (result.data) setSalon(toSalonWithMetaFromApi(result.data) as any);
      setLoading(false);
    });
  }, [user?.uid]);

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

  async function handleAction(appt: Appointment, action: 'confirmed' | 'cancelled') {
    Alert.alert(
      action === 'confirmed' ? 'Confirm Booking?' : 'Reject Booking?',
      `${appt.customerName} — ${appt.service} at ${appt.timeSlot}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action === 'confirmed' ? 'Confirm' : 'Reject',
          style: action === 'cancelled' ? 'destructive' : 'default',
          onPress: async () => {
            const result = await updateAppointmentStatus(appt.appointmentId, action);
            if (result.error) Alert.alert('Error', result.error);
            else setAppointments(prev =>
              prev.map(a => a.appointmentId === appt.appointmentId ? { ...a, status: action } : a)
            );
          },
        },
      ],
    );
  }

  async function handleAddWalkIn() {
    if (!walkInName.trim()) {
      Alert.alert('Missing name', 'Please enter the customer\'s name.');
      return;
    }
    if (!isValidIndianPhone(walkInPhone)) {
      Alert.alert('Invalid phone', 'Please enter a valid 10-digit phone number.');
      return;
    }
    if (!walkInService) {
      Alert.alert('Pick a service', 'Please select a service for this walk-in.');
      return;
    }
    setAddingWalkIn(true);
    // Walk-ins go in for the current 30-min slot, today.
    const now = new Date();
    const startTime = `${String(now.getHours()).padStart(2, '0')}:${String(Math.floor(now.getMinutes() / 30) * 30).padStart(2, '0')}`;
    const result = await createWalkInAppointment({
      customerName: walkInName.trim(),
      customerPhone: normalizePhone(walkInPhone),
      serviceId: walkInService,
      appointmentDate: todayDateString(),
      startTime,
    });
    setAddingWalkIn(false);
    if (result.error) {
      Alert.alert('Walk-in failed', result.error);
      return;
    }
    setShowWalkInModal(false);
    setWalkInName('');
    setWalkInPhone('');
    setWalkInService('');
    // Refresh today's bookings
    const r = await fetchSalonAppointments({ date: todayDateString() });
    if (r.data) setAppointments(r.data.map(apiApptToAppointment));
  }

  const renderItem = ({ item }: { item: Appointment }) => (
    <View style={styles.apptCard}>
      <View style={styles.apptHeader}>
        <View style={styles.apptLeft}>
          <Text style={styles.customerName}>{item.customerName}</Text>
          <Text style={styles.serviceName}>{item.service}</Text>
          <Text style={styles.apptMeta}>
            🕐 {item.timeSlot} · 📞 {item.customerPhone}
          </Text>
          <Text style={styles.apptMeta}>
            💰 {formatPrice(item.servicePriceInr)}
          </Text>
        </View>
        <AppointmentBadge status={item.status} />
      </View>

      {item.status === 'waiting' && (
        <View style={styles.apptActions}>
          <TouchableOpacity
            style={[styles.apptActionBtn, styles.confirmBtn]}
            onPress={() => handleAction(item, 'confirmed')}
            activeOpacity={0.8}>
            <Text style={styles.confirmBtnText}>✓ Confirm</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.apptActionBtn, styles.rejectBtn]}
            onPress={() => handleAction(item, 'cancelled')}
            activeOpacity={0.8}>
            <Text style={styles.rejectBtnText}>✕ Reject</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  if (loading) return <LoadingSpinner fullScreen message="Loading bookings…" />;

  if (!salon) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar backgroundColor="transparent" translucent barStyle="light-content" />
        <LinearGradient
          colors={['#7B0000', '#C62828', '#D32F2F']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}>
          <Text style={styles.headerTitle}>Booking Management</Text>
        </LinearGradient>
        <EmptyState
          icon="📋"
          title="No Salon Found"
          subtitle="Set up your salon profile before you can manage bookings."
          actionLabel="Set Up My Salon"
          onAction={() => navigation.navigate('SalonSetup')}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="transparent" translucent barStyle="light-content" />

      {/* Header */}
      <LinearGradient
        colors={['#7B0000', '#C62828', '#D32F2F']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}>
        <Text style={styles.headerTitle}>{Strings.bookingManagement.screenTitle}</Text>
        <TouchableOpacity
          style={styles.walkInBtn}
          onPress={() => setShowWalkInModal(true)}
          activeOpacity={0.8}>
          <Text style={styles.walkInBtnText}>+ Walk-in</Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* Stats */}
      <View style={styles.statsRow}>
        {[
          { label: 'Total', count: appointments.length, color: Colors.info },
          { label: 'Waiting', count: appointments.filter(a => a.status === 'waiting').length, color: Colors.busy },
          { label: 'Confirmed', count: appointments.filter(a => a.status === 'confirmed').length, color: Colors.available },
          { label: 'Done', count: appointments.filter(a => a.status === 'completed').length, color: Colors.textTertiary },
        ].map(stat => (
          <View key={stat.label} style={[styles.statBox, { borderTopColor: stat.color }]}>
            <Text style={[styles.statValue, { color: stat.color }]}>{stat.count}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* List */}
      <FlatList
        data={appointments}
        renderItem={renderItem}
        keyExtractor={item => item.appointmentId}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="📋"
            title={Strings.bookingManagement.emptyBookings}
            subtitle="No bookings for today yet."
            actionLabel="+ Add Walk-in"
            onAction={() => setShowWalkInModal(true)}
          />
        }
      />

      {/* Walk-In Modal */}
      <Modal
        visible={showWalkInModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowWalkInModal(false)}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalWrapper}>
            <View style={styles.modal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {Strings.bookingManagement.addWalkIn}
                </Text>
                <TouchableOpacity
                  onPress={() => setShowWalkInModal(false)}
                  style={styles.modalClose}>
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              <Input
                label={Strings.bookingManagement.walkInName}
                value={walkInName}
                onChangeText={setWalkInName}
                placeholder="Customer name"
                autoCapitalize="words"
                autoFocus
              />
              <Input
                label={Strings.bookingManagement.walkInPhone}
                value={walkInPhone}
                onChangeText={setWalkInPhone}
                placeholder="10-digit number (required)"
                keyboardType="number-pad"
                maxLength={10}
              />

              {/* Service selector — tap chip OR type custom */}
              <Text style={styles.serviceSelectLabel}>
                {Strings.bookingManagement.walkInService}
              </Text>
              {(salon?.services?.length ?? 0) > 0 && (
                <View style={styles.serviceChips}>
                  {salon!.services.map(svc => (
                    <TouchableOpacity
                      key={svc.id}
                      style={[
                        styles.serviceOption,
                        walkInService === svc.id && styles.serviceOptionActive,
                      ]}
                      onPress={() => setWalkInService(svc.id)}
                      activeOpacity={0.8}>
                      <Text style={[
                        styles.serviceOptionText,
                        walkInService === svc.id && styles.serviceOptionTextActive,
                      ]}>
                        {svc.name} · ₹{svc.priceInr}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <Input
                label="Or type service name"
                value={walkInService}
                onChangeText={setWalkInService}
                placeholder="e.g. Haircut, Shave…"
                autoCapitalize="words"
              />

              <Button
                title={Strings.bookingManagement.addToQueue}
                onPress={handleAddWalkIn}
                isLoading={addingWalkIn}
                fullWidth
                size="lg"
                style={styles.modalSubmitBtn}
              />
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[4],
    paddingBottom: Spacing[5],
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: { fontSize: Typography.xl, fontWeight: Typography.black, color: Colors.white },
  walkInBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
  },
  walkInBtnText: { color: Colors.white, fontSize: Typography.sm, fontWeight: Typography.bold },

  statsRow: {
    flexDirection: 'row',
    marginHorizontal: Spacing[4],
    marginVertical: Spacing[3],
    gap: Spacing[2],
  },
  statBox: {
    flex: 1, backgroundColor: Colors.white,
    borderRadius: Radius.lg, padding: Spacing[2],
    alignItems: 'center', borderTopWidth: 3,
    borderWidth: 1, borderColor: Colors.borderLight,
    ...Shadow.sm,
  },
  statValue: { fontSize: Typography.xl, fontWeight: Typography.black },
  statLabel: { fontSize: 10, color: Colors.textTertiary, fontWeight: Typography.semibold, marginTop: 2, textTransform: 'uppercase' },

  listContent: { paddingHorizontal: Spacing[4], paddingBottom: Spacing[8] },

  apptCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing[3],
    marginBottom: Spacing[2],
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadow.sm,
  },
  apptHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: Spacing[2] },
  apptLeft: { flex: 1, marginRight: Spacing[2] },
  customerName: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.textPrimary },
  serviceName: { fontSize: Typography.sm, color: Colors.navigationRed, fontWeight: Typography.semibold, marginTop: 2 },
  apptMeta: { fontSize: Typography.xs, color: Colors.textTertiary, marginTop: 2, fontWeight: Typography.medium },
  apptActions: { flexDirection: 'row', gap: Spacing[2] },
  apptActionBtn: { flex: 1, paddingVertical: Spacing[2], borderRadius: Radius.md, alignItems: 'center' },
  confirmBtn: { backgroundColor: Colors.availableSurface },
  confirmBtnText: { color: Colors.available, fontSize: Typography.sm, fontWeight: Typography.bold },
  rejectBtn: { backgroundColor: '#FFEBEE' },
  rejectBtnText: { color: Colors.error, fontSize: Typography.sm, fontWeight: Typography.bold },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  modalWrapper: { justifyContent: 'flex-end' },
  modal: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: Spacing[5], paddingBottom: Spacing[8],
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: Spacing[4],
  },
  modalTitle: { fontSize: Typography.lg, fontWeight: Typography.black, color: Colors.textPrimary },
  modalClose: { padding: Spacing[1] },
  modalCloseText: { fontSize: Typography.lg, color: Colors.textSecondary, fontWeight: Typography.bold },
  serviceSelectLabel: {
    fontSize: Typography.sm, fontWeight: Typography.semibold,
    color: Colors.textSecondary, marginBottom: Spacing[2], letterSpacing: 0.3,
  },
  serviceChips: { marginBottom: Spacing[2] },
  serviceOption: {
    paddingVertical: Spacing[3], paddingHorizontal: Spacing[3],
    borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border,
    marginBottom: Spacing[2], backgroundColor: Colors.white,
  },
  serviceOptionActive: { borderColor: Colors.navigationRed, backgroundColor: Colors.navigationRedSurface },
  serviceOptionText: { fontSize: Typography.sm, fontWeight: Typography.semibold, color: Colors.textSecondary },
  serviceOptionTextActive: { color: Colors.navigationRed },
  modalSubmitBtn: { marginTop: Spacing[4] },
});
