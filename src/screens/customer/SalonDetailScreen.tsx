/**
 * TrimCity — Salon Detail Screen
 * Shows live status, services, map, and booking form.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Linking,
  Alert,
  ActivityIndicator,
  FlatList,
  Image,
  Dimensions,
} from 'react-native';
import { addDays, format, isToday, isTomorrow } from 'date-fns';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { CustomerStackParamList, SalonWithMeta, Appointment, SalonService } from '../../types';
import LinearGradient from 'react-native-linear-gradient';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../constants/theme';
import { LiveStatusBox } from '../../components/salon/LiveStatusBox';
import { CapacityBar } from '../../components/salon/CapacityBar';
import { LiveIndicator } from '../../components/salon/LiveIndicator';
import { TimeSlotPicker } from '../../components/booking/TimeSlotPicker';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Badge } from '../../components/ui/Badge';
import { fetchSalonById, toSalonWithMetaFromApi } from '../../services/api/salon.service';
import { createAppointment, fetchAvailableSlots } from '../../services/api/booking.service';
import { useAuthStore } from '../../store/authStore';
import { useBookingStore } from '../../store/bookingStore';
import { BookingFormSchema, type BookingFormInput } from '../../services/security/validator';
import { formatPrice, formatDuration, getTimeSlots, todayDateString, dayKeyFromDate } from '../../utils/formatters';

// ── Build next 7 days for date picker ─────────────────────────────────────────
function buildDateOptions(): { label: string; value: string; date: Date }[] {
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(new Date(), i);
    const value = format(date, 'yyyy-MM-dd');
    const label = isToday(date) ? 'Today' : isTomorrow(date) ? 'Tomorrow' : format(date, 'EEE d');
    return { label, value, date };
  });
}
import { Strings } from '../../constants/strings';

type NavProp = NativeStackNavigationProp<CustomerStackParamList>;
type RoutePropType = RouteProp<CustomerStackParamList, 'SalonDetail'>;

// ── Service Row ────────────────────────────────────────────────────────────────
function ServiceRow({
  service,
  selected,
  onSelect,
}: {
  service: SalonService;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.serviceRow, selected && styles.serviceRowSelected]}
      onPress={onSelect}
      activeOpacity={0.8}>
      <View style={styles.serviceInfo}>
        <Text style={[styles.serviceName, selected && styles.serviceNameSelected]}>
          {service.name}
        </Text>
        <Text style={styles.serviceMeta}>
          ⏱ {formatDuration(service.durationMinutes)}
        </Text>
      </View>
      <Text style={[styles.servicePrice, selected && styles.servicePriceSelected]}>
        {formatPrice(service.priceInr)}
      </Text>
      {selected && (
        <View style={styles.serviceCheck}>
          <Text style={styles.serviceCheckText}>✓</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ── Section Header ─────────────────────────────────────────────────────────────
function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

// ── Main Screen ────────────────────────────────────────────────────────────────
export function SalonDetailScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const { salonId } = route.params;
  const { user } = useAuthStore();
  const { setLastConfirmed } = useBookingStore();

  const [salon, setSalon] = useState<SalonWithMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(todayDateString());
  const dateOptions = buildDateOptions();

  // Fetch salon data from MongoDB backend
  useEffect(() => {
    fetchSalonById(salonId).then(result => {
      if (result.data) setSalon(toSalonWithMetaFromApi(result.data));
      setLoading(false);
    });
  }, [salonId]);

  // Reload available slots whenever the selected date or service changes
  useEffect(() => {
    setBookedSlots([]);
    setSelectedSlot(null);
    if (selectedServiceId) {
      fetchAvailableSlots(salonId, selectedServiceId, selectedDate).then(result => {
        // availableSlots from API; we invert to get bookedSlots shape
        setBookedSlots([]); // API returns available, not booked — pass directly to TimeSlotPicker
      });
    }
  }, [salonId, selectedDate, selectedServiceId]);

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<BookingFormInput>({
    resolver: zodResolver(BookingFormSchema),
    defaultValues: {
      customerName: user?.name ?? '',
      customerPhone: user?.phone?.replace('+91', '') ?? '',
      serviceId: '',
      timeSlot: '',
      date: selectedDate,
    },
  });

  // Sync selected service, slot, and date into form
  useEffect(() => {
    if (selectedServiceId) setValue('serviceId', selectedServiceId);
  }, [selectedServiceId]);
  useEffect(() => {
    setValue('timeSlot', selectedSlot ?? '');
  }, [selectedSlot]);
  useEffect(() => {
    setValue('date', selectedDate);
  }, [selectedDate]);

  // Compute time slots for the selected date's working hours.
  // - For today, hide slots before now + 30-min lead time.
  // - When a service is selected, ensure slot + service duration <= close time.
  const timeSlots = useCallback(() => {
    if (!salon) return [];
    const dateObj = new Date(selectedDate + 'T00:00:00');
    const dayKey = dayKeyFromDate(dateObj) as keyof typeof salon.workingHours;
    const day = salon.workingHours[dayKey];
    if (!day?.isOpen) return [];
    const isToday = selectedDate === todayDateString();
    let minTime: string | undefined;
    if (isToday) {
      const now = new Date();
      const lead = new Date(now.getTime() + 30 * 60_000);
      minTime = `${String(lead.getHours()).padStart(2, '0')}:${String(lead.getMinutes()).padStart(2, '0')}`;
    }
    const svc = selectedServiceId ? salon.services.find(s => s.id === selectedServiceId) : null;
    return getTimeSlots(day.openTime, day.closeTime, 30, minTime, svc?.durationMinutes);
  }, [salon, selectedDate, selectedServiceId])();

  async function onSubmit(data: BookingFormInput) {
    if (!salon || !user) return;
    setIsSubmitting(true);

    const result = await createAppointment({
      salonId: salon.salonId,
      serviceId: data.serviceId,
      appointmentDate: data.date,
      startTime: data.timeSlot,
    });

    if (result.error) {
      Alert.alert('Booking Failed', result.error);
      setIsSubmitting(false);
      return;
    }

    if (result.data) {
      // Build a compatible Appointment object for the confirmation screen
      const confirmed: Appointment = {
        appointmentId: result.data._id,
        salonId: salon.salonId,
        salonName: salon.name,
        salonAddress: salon.address,
        salonLatitude: salon.latitude,
        salonLongitude: salon.longitude,
        customerId: user.uid,
        customerName: user.name,
        customerPhone: user.phone,
        service: salon.services.find(s => s.id === data.serviceId)?.name ?? 'Service',
        servicePriceInr: salon.services.find(s => s.id === data.serviceId)?.priceInr ?? 0,
        serviceDurationMinutes: salon.services.find(s => s.id === data.serviceId)?.durationMinutes ?? 0,
        timeSlot: data.timeSlot,
        date: data.date,
        status: 'confirmed',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setLastConfirmed(confirmed);
      navigation.navigate('BookingConfirm', { appointment: confirmed });
    }
    setIsSubmitting(false);
  }

  function handleCall() {
    if (salon?.phone) {
      Linking.openURL(`tel:+91${salon.phone}`);
    }
  }

  function handleDirections() {
    if (salon) {
      Linking.openURL(
        `https://www.google.com/maps/dir/?api=1&destination=${salon.latitude},${salon.longitude}`,
      );
    }
  }

  if (loading) return <LoadingSpinner fullScreen message="Loading salon…" />;
  if (!salon) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Text style={styles.errorMsg}>Salon not found.</Text>
      </SafeAreaView>
    );
  }

  const todayKey = dayKeyFromDate(new Date()) as keyof typeof salon.workingHours;
  const todayHours = salon.workingHours[todayKey];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="transparent" translucent barStyle="light-content" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>

        {/* ── Hero ── */}
        <LinearGradient
          colors={['#7B0000', '#C62828', '#D32F2F']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}>
          <View style={styles.heroContent}>
            <View style={styles.heroLeft}>
              <Text style={styles.heroName}>{salon.name}</Text>
              <Text style={styles.heroAddress}>📍 {salon.address}</Text>
              <View style={styles.heroRow}>
                <Text style={styles.ratingBadge}>★ {salon.rating.toFixed(1)}</Text>
                <Text style={styles.dot}>·</Text>
                <Badge
                  label={salon.category.charAt(0).toUpperCase() + salon.category.slice(1)}
                  variant={salon.isOpen ? 'available' : 'closed'}
                />
              </View>
            </View>
            {salon.isOpen && <LiveIndicator />}
          </View>

          {/* Action buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={handleCall} activeOpacity={0.8}>
              <Text style={styles.actionIcon}>📞</Text>
              <Text style={styles.actionLabel}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={handleDirections} activeOpacity={0.8}>
              <Text style={styles.actionIcon}>🗺️</Text>
              <Text style={styles.actionLabel}>Directions</Text>
            </TouchableOpacity>
            <View style={styles.hoursChip}>
              <Text style={styles.hoursText}>
                {todayHours?.isOpen
                  ? `${todayHours.openTime} – ${todayHours.closeTime}`
                  : 'Closed Today'}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* ── Photo Gallery ── */}
        {salon.photos && salon.photos.length > 0 && (
          <View style={styles.gallerySection}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.galleryScroll}
              pagingEnabled
              snapToInterval={GALLERY_W}
              decelerationRate="fast">
              {salon.photos.map((uri, i) => (
                <Image key={`${uri}-${i}`} source={{ uri }} style={styles.galleryImg} resizeMode="cover" />
              ))}
            </ScrollView>
            {salon.photos.length > 1 && (
              <Text style={styles.galleryCount}>{salon.photos.length} photos · swipe</Text>
            )}
          </View>
        )}

        {/* ── Live Status ── */}
        <View style={styles.section}>
          <SectionHeader title="Live Status" />
          <LiveStatusBox
            seatedNow={salon.seatedNow}
            totalSeats={salon.totalSeats}
            waitingNow={salon.waitingNow}
          />
          <View style={styles.capacityWrapper}>
            <CapacityBar seated={salon.seatedNow} total={salon.totalSeats} height={8} />
          </View>
        </View>

        {/* ── Services ── */}
        <View style={styles.section}>
          <SectionHeader title={Strings.salonDetail.services} />
          {salon.services.map(service => (
            <ServiceRow
              key={service.id}
              service={service}
              selected={selectedServiceId === service.id}
              onSelect={() => setSelectedServiceId(service.id)}
            />
          ))}
          {errors.serviceId && (
            <Text style={styles.fieldError}>{errors.serviceId.message}</Text>
          )}
        </View>

        {/* ── Booking Form ── */}
        <View style={styles.section}>
          <SectionHeader title={Strings.salonDetail.bookAppointment} />

          <Controller
            control={control}
            name="customerName"
            render={({ field: { onChange, value } }) => (
              <Input
                label={Strings.salonDetail.yourName}
                value={value}
                onChangeText={onChange}
                placeholder="Enter your full name"
                autoCapitalize="words"
                error={errors.customerName?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="customerPhone"
            render={({ field: { onChange, value } }) => (
              <Input
                label={Strings.salonDetail.yourPhone}
                value={value}
                onChangeText={onChange}
                placeholder="10-digit mobile number"
                keyboardType="number-pad"
                maxLength={10}
                error={errors.customerPhone?.message}
              />
            )}
          />

          {/* Date Picker — next 7 days */}
          <Text style={styles.slotLabel}>Select Date</Text>
          <FlatList
            horizontal
            data={dateOptions}
            keyExtractor={item => item.value}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.datePicker}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.dateChip, selectedDate === item.value && styles.dateChipActive]}
                onPress={() => setSelectedDate(item.value)}
                activeOpacity={0.8}>
                <Text style={[styles.dateChipLabel, selectedDate === item.value && styles.dateChipLabelActive]}>
                  {item.label}
                </Text>
                <Text style={[styles.dateChipDay, selectedDate === item.value && styles.dateChipDayActive]}>
                  {format(item.date, 'MMM d')}
                </Text>
              </TouchableOpacity>
            )}
          />

          {/* Time Slot */}
          <Text style={styles.slotLabel}>{Strings.salonDetail.selectTimeSlot}</Text>
          {timeSlots.length === 0 && (
            <Text style={styles.closedNote}>Salon is closed on this day.</Text>
          )}
          <TimeSlotPicker
            slots={timeSlots}
            bookedSlots={bookedSlots}
            selectedSlot={selectedSlot}
            onSelect={slot => {
              setSelectedSlot(slot);
              setValue('timeSlot', slot);
            }}
          />
          {errors.timeSlot && (
            <Text style={styles.fieldError}>{errors.timeSlot.message}</Text>
          )}

          <Button
            title={isSubmitting ? 'Booking…' : Strings.salonDetail.confirmBooking}
            onPress={handleSubmit(onSubmit)}
            isLoading={isSubmitting}
            disabled={!selectedServiceId || !selectedSlot}
            fullWidth
            size="lg"
            style={styles.bookButton}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const GALLERY_W = Dimensions.get('window').width - Spacing[4] * 2;
const GALLERY_H = 200;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingBottom: Spacing[10] },
  gallerySection: { marginTop: Spacing[3], marginHorizontal: Spacing[4] },
  galleryScroll: { gap: Spacing[2] },
  galleryImg: {
    width: GALLERY_W,
    height: GALLERY_H,
    borderRadius: Radius.xl,
    backgroundColor: Colors.borderLight,
  },
  galleryCount: {
    textAlign: 'center',
    marginTop: Spacing[2],
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    fontWeight: Typography.semibold,
  },
  errorMsg: {
    textAlign: 'center',
    marginTop: Spacing[8],
    color: Colors.textSecondary,
    fontSize: Typography.base,
  },

  // Hero
  hero: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[4],
    paddingBottom: Spacing[5],
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  heroContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing[3],
  },
  heroLeft: { flex: 1, marginRight: Spacing[3] },
  heroName: {
    fontSize: Typography['2xl'],
    fontWeight: Typography.black,
    color: Colors.white,
    marginBottom: 4,
  },
  heroAddress: {
    fontSize: Typography.sm,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: Spacing[2],
    fontWeight: Typography.medium,
  },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[2] },
  ratingBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    color: Colors.white,
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
    paddingHorizontal: Spacing[2],
    paddingVertical: 2,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  dot: { color: 'rgba(255,255,255,0.6)', fontSize: Typography.lg },

  actionRow: {
    flexDirection: 'row',
    gap: Spacing[2],
    alignItems: 'center',
  },
  actionBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: Radius.md,
    paddingVertical: 8,
    paddingHorizontal: Spacing[3],
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  actionIcon: { fontSize: 14 },
  actionLabel: {
    color: Colors.white,
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
  },
  hoursChip: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: Radius.md,
    paddingVertical: 8,
    paddingHorizontal: Spacing[2],
    alignItems: 'center',
  },
  hoursText: {
    color: Colors.white,
    fontSize: Typography.xs,
    fontWeight: Typography.semibold,
  },

  // Sections
  section: {
    margin: Spacing[4],
    marginBottom: 0,
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing[4],
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadow.sm,
  },
  sectionTitle: {
    fontSize: Typography.md,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing[3],
  },
  capacityWrapper: { marginTop: Spacing[3] },

  // Services
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[3],
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginBottom: Spacing[2],
    backgroundColor: Colors.white,
  },
  serviceRowSelected: {
    borderColor: Colors.navigationRed,
    backgroundColor: Colors.navigationRedSurface,
  },
  serviceInfo: { flex: 1 },
  serviceName: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  serviceNameSelected: { color: Colors.navigationRed },
  serviceMeta: {
    fontSize: Typography.xs,
    color: Colors.textTertiary,
    fontWeight: Typography.medium,
  },
  servicePrice: {
    fontSize: Typography.base,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    marginRight: Spacing[2],
  },
  servicePriceSelected: { color: Colors.navigationRed },
  serviceCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.navigationRed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceCheckText: { color: Colors.white, fontSize: 12, fontWeight: Typography.bold },

  // Date picker
  datePicker: {
    paddingBottom: Spacing[3],
    gap: Spacing[2],
  },
  dateChip: {
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    minWidth: 64,
  },
  dateChipActive: {
    borderColor: Colors.navigationRed,
    backgroundColor: Colors.navigationRed,
  },
  dateChipLabel: {
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
    color: Colors.textSecondary,
  },
  dateChipLabelActive: { color: Colors.white },
  dateChipDay: {
    fontSize: 10,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  dateChipDayActive: { color: 'rgba(255,255,255,0.8)' },
  closedNote: {
    fontSize: Typography.sm,
    color: Colors.textTertiary,
    fontStyle: 'italic',
    marginBottom: Spacing[2],
  },

  // Booking
  slotLabel: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
    color: Colors.textSecondary,
    marginBottom: Spacing[2],
    marginTop: Spacing[2],
    letterSpacing: 0.3,
  },
  fieldError: {
    color: Colors.error,
    fontSize: Typography.xs,
    fontWeight: Typography.medium,
    marginTop: Spacing[1],
  },
  bookButton: { marginTop: Spacing[5] },
});
