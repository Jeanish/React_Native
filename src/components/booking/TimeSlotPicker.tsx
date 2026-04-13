/**
 * TrimCity — Time Slot Picker
 * Shows grid of time slots, greyed out if booked.
 */
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Colors, Typography, Radius, Spacing } from '../../constants/theme';

interface TimeSlotPickerProps {
  slots: string[];
  bookedSlots: string[];
  selectedSlot: string | null;
  onSelect: (slot: string) => void;
}

export function TimeSlotPicker({
  slots,
  bookedSlots,
  selectedSlot,
  onSelect,
}: TimeSlotPickerProps) {
  return (
    <View>
      <View style={styles.grid}>
        {slots.map(slot => {
          const isBooked = bookedSlots.includes(slot);
          const isSelected = selectedSlot === slot;

          return (
            <TouchableOpacity
              key={slot}
              onPress={() => !isBooked && onSelect(slot)}
              disabled={isBooked}
              activeOpacity={0.8}
              style={[
                styles.slot,
                isBooked && styles.slotBooked,
                isSelected && styles.slotSelected,
              ]}>
              <Text
                style={[
                  styles.slotText,
                  isBooked && styles.slotTextBooked,
                  isSelected && styles.slotTextSelected,
                ]}>
                {slot}
              </Text>
              {isBooked && <Text style={styles.bookedBadge}>Booked</Text>}
            </TouchableOpacity>
          );
        })}
      </View>
      {slots.length === 0 && (
        <Text style={styles.noSlots}>No slots available today.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[2],
  },
  slot: {
    width: '30%',
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[2],
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    alignItems: 'center',
  },
  slotBooked: {
    backgroundColor: Colors.borderLight,
    borderColor: Colors.border,
    opacity: 0.6,
  },
  slotSelected: {
    backgroundColor: Colors.navigationRed,
    borderColor: Colors.navigationRed,
  },
  slotText: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
    color: Colors.textPrimary,
  },
  slotTextBooked: {
    color: Colors.textTertiary,
    textDecorationLine: 'line-through',
  },
  slotTextSelected: {
    color: Colors.white,
  },
  bookedBadge: {
    fontSize: 9,
    color: Colors.textTertiary,
    marginTop: 2,
    fontWeight: Typography.medium,
  },
  noSlots: {
    color: Colors.textSecondary,
    fontSize: Typography.sm,
    textAlign: 'center',
    paddingVertical: Spacing[6],
  },
});
