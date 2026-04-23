/**
 * TrimCity — Filter Chips
 * Horizontal scrollable filter row for the home screen.
 */
import React from 'react';
import {
  ScrollView,
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
} from 'react-native';
import { Colors, Typography, Radius, Spacing } from '../../constants/theme';
import type { FilterChip } from '../../types';
import { Strings } from '../../constants/strings';

interface FilterChipsProps {
  active: FilterChip;
  onSelect: (filter: FilterChip) => void;
}

const CHIPS: { id: FilterChip; label: string }[] = [
  { id: 'all', label: Strings.home.filters.all },
  { id: 'available_now', label: Strings.home.filters.availableNow },
  { id: 'low_wait', label: Strings.home.filters.lowWait },
  { id: 'top_rated', label: Strings.home.filters.topRated },
  { id: 'men', label: Strings.home.filters.men },
  { id: 'women', label: Strings.home.filters.women },
  { id: 'unisex', label: Strings.home.filters.unisex },
];

export function FilterChips({ active, onSelect }: FilterChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      style={styles.scroll}>
      {CHIPS.map(chip => {
        const isActive = chip.id === active;
        return (
          <TouchableOpacity
            key={chip.id}
            onPress={() => onSelect(chip.id)}
            activeOpacity={0.75}
            style={[styles.chip, isActive && styles.chipActive]}>
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {chip.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0 },
  scrollContent: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    gap: Spacing[2],
  },
  chip: {
    paddingHorizontal: Spacing[4],
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.navigationRed,
    borderColor: Colors.navigationRed,
  },
  label: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
    color: Colors.textSecondary,
  },
  labelActive: {
    color: Colors.white,
  },
});
