/**
 * TrimCity — Booking Card
 * Shown in My Appointments screen.
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Colors, Typography, Radius, Spacing, Shadow } from '../../constants/theme';
import { AppointmentBadge } from '../ui/Badge';
import type { Appointment } from '../../types';
import { formatDate, formatPrice } from '../../utils/formatters';

interface BookingCardProps {
  appointment: Appointment;
  onCancel?: (id: string) => void;
}

export function BookingCard({ appointment, onCancel }: BookingCardProps) {
  const isUpcoming =
    appointment.status === 'confirmed' || appointment.status === 'waiting';

  function handleDirections() {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${appointment.salonLatitude},${appointment.salonLongitude}`;
    Linking.openURL(url).catch(() => {
      // fallback: try maps app
      Linking.openURL(
        `geo:${appointment.salonLatitude},${appointment.salonLongitude}`,
      );
    });
  }

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.salonName}>{appointment.salonName}</Text>
          <Text style={styles.service}>{appointment.service}</Text>
        </View>
        <AppointmentBadge status={appointment.status} />
      </View>

      <View style={styles.divider} />

      {/* Details */}
      <View style={styles.details}>
        <DetailRow icon="📅" label={formatDate(appointment.date)} />
        <DetailRow icon="🕐" label={appointment.timeSlot} />
        <DetailRow icon="💰" label={formatPrice(appointment.servicePriceInr)} />
        <DetailRow icon="📍" label={appointment.salonAddress} />
      </View>

      {/* Actions */}
      {isUpcoming && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.directionBtn}
            onPress={handleDirections}
            activeOpacity={0.8}>
            <Text style={styles.directionBtnText}>🗺️ Directions</Text>
          </TouchableOpacity>
          {onCancel && (
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => onCancel(appointment.appointmentId)}
              activeOpacity={0.8}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

function DetailRow({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailIcon}>{icon}</Text>
      <Text style={styles.detailText} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    marginHorizontal: Spacing[4],
    marginVertical: Spacing[2],
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: Spacing[4],
    paddingBottom: Spacing[3],
  },
  headerLeft: { flex: 1, marginRight: Spacing[3] },
  salonName: {
    fontSize: Typography.md,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  service: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.medium,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginHorizontal: Spacing[4],
  },
  details: {
    padding: Spacing[4],
    gap: Spacing[2],
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  detailIcon: { fontSize: 14, width: 20 },
  detailText: {
    flex: 1,
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.regular,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing[2],
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[4],
  },
  directionBtn: {
    flex: 1,
    paddingVertical: Spacing[3],
    borderRadius: Radius.md,
    backgroundColor: Colors.navigationRedSurface,
    alignItems: 'center',
  },
  directionBtnText: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
    color: Colors.navigationRed,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: Spacing[3],
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.error,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
    color: Colors.error,
  },
});
