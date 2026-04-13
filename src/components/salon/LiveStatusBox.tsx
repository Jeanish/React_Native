/**
 * TrimCity — Live Status Box
 * 3 boxes: Seated Now | Total Seats | Currently Waiting
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Radius, Spacing, Shadow } from '../../constants/theme';

interface LiveStatusBoxProps {
  seatedNow: number;
  totalSeats: number;
  waitingNow: number;
}

interface StatusBoxItemProps {
  value: number;
  label: string;
  color: string;
  bgColor: string;
}

function StatusBoxItem({ value, label, color, bgColor }: StatusBoxItemProps) {
  return (
    <View style={[styles.box, { backgroundColor: bgColor }]}>
      <Text style={[styles.value, { color }]}>{value}</Text>
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

export function LiveStatusBox({
  seatedNow,
  totalSeats,
  waitingNow,
}: LiveStatusBoxProps) {
  return (
    <View style={styles.container}>
      <StatusBoxItem
        value={seatedNow}
        label="Seated Now"
        color={Colors.available}
        bgColor={Colors.availableSurface}
      />
      <View style={styles.divider} />
      <StatusBoxItem
        value={totalSeats}
        label="Total Seats"
        color={Colors.info}
        bgColor="#E3F2FD"
      />
      <View style={styles.divider} />
      <StatusBoxItem
        value={waitingNow}
        label="Waiting"
        color={waitingNow > 0 ? Colors.busy : Colors.textTertiary}
        bgColor={waitingNow > 0 ? Colors.busySurface : Colors.borderLight}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  box: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing[4],
  },
  divider: {
    width: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing[2],
  },
  value: {
    fontSize: Typography['2xl'],
    fontWeight: Typography.black,
    lineHeight: 32,
  },
  label: {
    fontSize: Typography.xs,
    fontWeight: Typography.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
});
