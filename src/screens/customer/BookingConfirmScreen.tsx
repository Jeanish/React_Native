/**
 * TrimCity — Booking Confirmation Screen
 * Shows confirmed appointment with map embed + directions button.
 */
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Linking,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, CommonActions } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { CustomerStackParamList } from '../../types';
import LinearGradient from 'react-native-linear-gradient';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../constants/theme';
import { Button } from '../../components/ui/Button';
import { AppointmentBadge } from '../../components/ui/Badge';
import { formatDate, formatPrice, formatDuration } from '../../utils/formatters';
import { Strings } from '../../constants/strings';

type RoutePropType = RouteProp<CustomerStackParamList, 'BookingConfirm'>;

function DetailRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailLeft}>
        <Text style={styles.detailIcon}>{icon}</Text>
        <Text style={styles.detailLabel}>{label}</Text>
      </View>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

export function BookingConfirmScreen() {
  const navigation = useNavigation();
  const route = useRoute<RoutePropType>();
  const { appointment } = route.params;

  // Entrance animation
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 7,
        tension: 60,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  function handleDirections() {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${appointment.salonLatitude},${appointment.salonLongitude}`;
    Linking.openURL(url).catch(() => {});
  }

  function handleViewBookings() {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Customer' }],
      }),
    );
  }

  const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${appointment.salonLatitude},${appointment.salonLongitude}&zoom=16&size=600x200&maptype=roadmap&markers=color:red%7C${appointment.salonLatitude},${appointment.salonLongitude}&key=YOUR_GOOGLE_MAPS_KEY`;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="transparent" translucent barStyle="light-content" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* Success Hero */}
        <LinearGradient
          colors={['#7B0000', '#C62828', '#D32F2F']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.successHero}>
          <Animated.View
            style={[
              styles.successContainer,
              { transform: [{ scale: scaleAnim }], opacity: opacityAnim },
            ]}>
            <View style={styles.successCircle}>
              <Text style={styles.successEmoji}>✅</Text>
            </View>
            <Text style={styles.successTitle}>{Strings.confirmation.title}</Text>
            <Text style={styles.successSubtitle}>{Strings.confirmation.subtitle}</Text>
            <AppointmentBadge status={appointment.status} />
          </Animated.View>
        </LinearGradient>

        {/* Appointment Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{Strings.confirmation.appointmentDetails}</Text>

          <DetailRow icon="✂️" label="Salon" value={appointment.salonName} />
          <DetailRow icon="💇" label="Service" value={appointment.service} />
          <DetailRow icon="👤" label="Name" value={appointment.customerName} />
          <DetailRow icon="📅" label="Date" value={formatDate(appointment.date)} />
          <DetailRow icon="🕐" label="Time" value={appointment.timeSlot} />
          <DetailRow icon="💰" label="Price" value={formatPrice(appointment.servicePriceInr)} />
          <DetailRow icon="⏱" label="Duration" value={formatDuration(appointment.serviceDurationMinutes)} />

          <View style={styles.divider} />

          {/* Address */}
          <View style={styles.addressRow}>
            <Text style={styles.addressIcon}>📍</Text>
            <Text style={styles.addressText}>{appointment.salonAddress}</Text>
          </View>

          {/* Map placeholder (static map or react-native-maps) */}
          <View style={styles.mapContainer}>
            <View style={styles.mapPlaceholder}>
              <Text style={styles.mapPlaceholderText}>🗺️</Text>
              <Text style={styles.mapLabel}>{appointment.salonName}</Text>
              <Text style={styles.mapCoords}>
                {appointment.salonLatitude.toFixed(5)}, {appointment.salonLongitude.toFixed(5)}
              </Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.gradientBtn}
            onPress={handleDirections}
            activeOpacity={0.85}>
            <LinearGradient
              colors={['#EF5350', '#D32F2F', '#B71C1C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientBtnInner}>
              <Text style={styles.gradientBtnText}>🗺️  Get Directions</Text>
            </LinearGradient>
          </TouchableOpacity>
          <Button
            title={Strings.confirmation.viewBookings}
            onPress={handleViewBookings}
            variant="outline"
            fullWidth
            size="lg"
            style={styles.secondaryBtn}
          />
        </View>

        {/* Booking ID */}
        <Text style={styles.bookingId}>
          Booking ID: {appointment.appointmentId.substring(0, 8).toUpperCase()}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingBottom: Spacing[10] },

  successHero: {
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    marginBottom: Spacing[4],
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: Spacing[8],
    paddingHorizontal: Spacing[4],
  },
  successCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[4],
  },
  successEmoji: { fontSize: 52 },
  successTitle: {
    fontSize: Typography['3xl'],
    fontWeight: Typography.black,
    color: Colors.white,
    marginBottom: Spacing[2],
  },
  successSubtitle: {
    fontSize: Typography.base,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: Spacing[3],
    fontWeight: Typography.medium,
  },

  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing[4],
    marginHorizontal: Spacing[4],
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: Spacing[4],
    ...Shadow.md,
  },
  cardTitle: {
    fontSize: Typography.md,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing[4],
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  detailLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing[2] },
  detailIcon: { fontSize: 16, width: 24 },
  detailLabel: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.medium,
  },
  detailValue: {
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    maxWidth: '55%',
    textAlign: 'right',
  },
  divider: { height: 1, backgroundColor: Colors.divider, marginVertical: Spacing[3] },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing[2],
    marginBottom: Spacing[3],
  },
  addressIcon: { fontSize: 16 },
  addressText: {
    flex: 1,
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    fontWeight: Typography.medium,
  },
  mapContainer: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    height: 140,
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: Colors.navigationRedSurface,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  mapPlaceholderText: { fontSize: 36, marginBottom: Spacing[2] },
  mapLabel: {
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
    color: Colors.navigationRed,
  },
  mapCoords: {
    fontSize: Typography.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },

  actions: { gap: Spacing[3], marginBottom: Spacing[4], marginHorizontal: Spacing[4] },
  gradientBtn: { borderRadius: Radius.xl, overflow: 'hidden', ...Shadow.lg },
  gradientBtnInner: { paddingVertical: 18, alignItems: 'center', justifyContent: 'center' },
  gradientBtnText: {
    fontSize: Typography.md,
    fontWeight: Typography.black,
    color: Colors.white,
    letterSpacing: 0.4,
  },
  secondaryBtn: {},

  bookingId: {
    textAlign: 'center',
    fontSize: Typography.xs,
    color: Colors.textTertiary,
    fontWeight: Typography.medium,
    letterSpacing: 0.5,
    paddingHorizontal: Spacing[4],
  },
});
