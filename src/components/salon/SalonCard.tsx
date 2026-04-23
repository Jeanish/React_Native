/**
 * TrimCity — Salon Card
 * Main card shown in the explore list. Fully animated.
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Colors, Typography, Radius, Spacing, Shadow } from '../../constants/theme';
import { CapacityBar } from './CapacityBar';
import { LiveIndicator } from './LiveIndicator';
import { Badge } from '../ui/Badge';
import type { SalonWithMeta } from '../../types';
import { formatRating, formatPrice } from '../../utils/formatters';

interface SalonCardProps {
  salon: SalonWithMeta;
  onPress: () => void;
}

function CategoryLabel({ category }: { category: string }) {
  const labels: Record<string, string> = {
    men: 'Men',
    women: 'Women',
    unisex: 'Unisex',
  };
  return (
    <View style={styles.categoryChip}>
      <Text style={styles.categoryText}>{labels[category] ?? category}</Text>
    </View>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <View style={styles.ratingRow}>
      <Text style={styles.starIcon}>★</Text>
      <Text style={styles.ratingText}>{formatRating(rating)}</Text>
    </View>
  );
}

export function SalonCard({ salon, onPress }: SalonCardProps) {
  const statusBadgeVariant =
    salon.availabilityStatus === 'available'
      ? 'available'
      : salon.availabilityStatus === 'busy'
      ? 'busy'
      : salon.availabilityStatus === 'full'
      ? 'full'
      : 'closed';

  const statusLabel =
    salon.availabilityStatus === 'available'
      ? 'Available'
      : salon.availabilityStatus === 'busy'
      ? 'Busy'
      : salon.availabilityStatus === 'full'
      ? 'Full'
      : 'Closed';

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.92}>
      {/* Header Image / Placeholder */}
      <View style={styles.imageContainer}>
        {salon.photos.length > 0 ? (
          <Image source={{ uri: salon.photos[0] }} style={styles.image} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.placeholderEmoji}>✂️</Text>
          </View>
        )}
        {/* Live indicator overlay */}
        {salon.isOpen && (
          <View style={styles.liveOverlay}>
            <LiveIndicator showLabel size="sm" />
          </View>
        )}
        {/* Category chip */}
        <View style={styles.categoryOverlay}>
          <CategoryLabel category={salon.category} />
        </View>
      </View>

      {/* Body */}
      <View style={styles.body}>
        {/* Row 1: Name + Rating */}
        <View style={styles.row}>
          <Text style={styles.salonName} numberOfLines={1}>
            {salon.name}
          </Text>
          <StarRating rating={salon.rating} />
        </View>

        {/* Address */}
        <Text style={styles.address} numberOfLines={1}>
          📍 {salon.address}
        </Text>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Stats row */}
        <View style={styles.statsRow}>
          <StatChip
            icon="💺"
            value={`${salon.seatedNow}/${salon.totalSeats}`}
            label="Seated"
          />
          <StatChip
            icon="⏳"
            value={String(salon.waitingNow)}
            label="Waiting"
          />
          <View style={styles.statusBadgeContainer}>
            <Badge label={statusLabel} variant={statusBadgeVariant} />
          </View>
        </View>

        {/* Capacity Bar */}
        <View style={styles.capacityWrapper}>
          <CapacityBar
            seated={salon.seatedNow}
            total={salon.totalSeats}
            showLabel={false}
            height={5}
          />
        </View>

        {/* Price hint */}
        {salon.services.length > 0 && (
          <Text style={styles.priceHint}>
            Starting from {formatPrice(Math.min(...salon.services.map(s => s.priceInr)))}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

function StatChip({
  icon,
  value,
  label,
}: {
  icon: string;
  value: string;
  label: string;
}) {
  return (
    <View style={styles.statChip}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
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
    ...Shadow.md,
  },
  imageContainer: {
    height: 140,
    backgroundColor: Colors.surfaceMuted,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.navigationRedSurface,
  },
  placeholderEmoji: { fontSize: 48 },
  liveOverlay: {
    position: 'absolute',
    top: Spacing[2],
    left: Spacing[2],
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing[2],
    paddingVertical: 4,
    borderRadius: Radius.full,
    ...Shadow.sm,
  },
  categoryOverlay: {
    position: 'absolute',
    top: Spacing[2],
    right: Spacing[2],
  },
  categoryChip: {
    backgroundColor: Colors.navigationRed,
    paddingHorizontal: Spacing[3],
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  categoryText: {
    color: Colors.white,
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
    letterSpacing: 0.5,
  },
  body: {
    padding: Spacing[4],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  salonName: {
    flex: 1,
    fontSize: Typography.md,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    marginRight: Spacing[2],
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  starIcon: { fontSize: 13, color: Colors.star },
  ratingText: {
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  address: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing[3],
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: Spacing[2],
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing[3],
  },
  statChip: {
    alignItems: 'center',
  },
  statIcon: { fontSize: 14, marginBottom: 2 },
  statValue: {
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: 10,
    color: Colors.textTertiary,
    fontWeight: Typography.medium,
  },
  statusBadgeContainer: {
    alignItems: 'flex-end',
  },
  capacityWrapper: {
    marginBottom: Spacing[2],
  },
  priceHint: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    fontWeight: Typography.medium,
    marginTop: 4,
  },
});
