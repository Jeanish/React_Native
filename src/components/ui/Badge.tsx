/**
 * TrimCity — Badge Component
 * For status chips: Confirmed, Waiting, Completed, Cancelled, etc.
 */
import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Typography, Radius, Spacing } from '../../constants/theme';
import type { AppointmentStatus } from '../../types';

type BadgeVariant =
  | 'confirmed'
  | 'waiting'
  | 'completed'
  | 'cancelled'
  | 'open'
  | 'closed'
  | 'available'
  | 'busy'
  | 'full'
  | 'live';

interface BadgeProps {
  label: string;
  variant: BadgeVariant;
  style?: ViewStyle;
}

const BADGE_CONFIG: Record<
  BadgeVariant,
  { bg: string; text: string; border?: string }
> = {
  confirmed: { bg: Colors.availableSurface, text: Colors.available },
  waiting: { bg: Colors.busySurface, text: Colors.busy },
  completed: { bg: Colors.borderLight, text: Colors.textSecondary },
  cancelled: { bg: '#FFEBEE', text: Colors.error },
  open: { bg: Colors.availableSurface, text: Colors.available },
  closed: { bg: Colors.borderLight, text: Colors.textTertiary },
  available: { bg: Colors.availableSurface, text: Colors.available },
  busy: { bg: Colors.busySurface, text: Colors.busy },
  full: { bg: '#FFEBEE', text: Colors.error },
  live: { bg: Colors.availableSurface, text: Colors.available },
};

export function Badge({ label, variant, style }: BadgeProps) {
  const config = BADGE_CONFIG[variant];
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: config.bg },
        style,
      ]}>
      <Text style={[styles.label, { color: config.text }]}>{label}</Text>
    </View>
  );
}

/** Convenience wrapper for appointment status */
export function AppointmentBadge({
  status,
}: {
  status: AppointmentStatus;
}) {
  const labels: Record<AppointmentStatus, string> = {
    confirmed: 'Confirmed',
    waiting: 'Waiting',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };
  return <Badge label={labels[status]} variant={status} />;
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing[3],
    paddingVertical: 4,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
});
