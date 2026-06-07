/**
 * TrimCity — Home / Explore Screen
 * Real-time salon list with live city stats bar, search, and filter chips.
 */
import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { CustomerStackParamList, SalonWithMeta } from '../../types';
import { Colors, Typography, Spacing, Shadow, Radius } from '../../constants/theme';
import { SalonCard } from '../../components/salon/SalonCard';
import { FilterChips } from '../../components/salon/FilterChips';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { LiveIndicator } from '../../components/salon/LiveIndicator';
import { useSalons } from '../../hooks/useSalons';
import { Strings } from '../../constants/strings';

type NavProp = NativeStackNavigationProp<CustomerStackParamList>;

// ── City Stats Bar ─────────────────────────────────────────────────────────────
function CityStatsBar({
  totalSalons,
  openNow,
  totalSeated,
  totalWaiting,
}: {
  totalSalons: number;
  openNow: number;
  totalSeated: number;
  totalWaiting: number;
}) {
  return (
    <View style={statsStyles.bar}>
      <StatItem value={totalSalons} label="Salons" icon="✂️" />
      <View style={statsStyles.sep} />
      <StatItem value={openNow} label="Open Now" icon="🟢" highlight />
      <View style={statsStyles.sep} />
      <StatItem value={totalSeated} label="Seated" icon="💺" />
      <View style={statsStyles.sep} />
      <StatItem value={totalWaiting} label="Waiting" icon="⏳" />
    </View>
  );
}

function StatItem({
  value,
  label,
  icon,
  highlight,
}: {
  value: number;
  label: string;
  icon: string;
  highlight?: boolean;
}) {
  return (
    <View style={statsStyles.item}>
      <Text style={statsStyles.icon}>{icon}</Text>
      <Text style={[statsStyles.value, highlight && statsStyles.valueHighlight]}>
        {value}
      </Text>
      <Text style={statsStyles.label}>{label}</Text>
    </View>
  );
}

const statsStyles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: Colors.navigationRed,
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[2],
  },
  item: { flex: 1, alignItems: 'center' },
  sep: { width: 1, backgroundColor: 'rgba(255,255,255,0.25)', marginVertical: 4 },
  icon: { fontSize: 14, marginBottom: 2 },
  value: {
    fontSize: Typography.lg,
    fontWeight: Typography.black,
    color: Colors.white,
    lineHeight: 22,
  },
  valueHighlight: { color: '#A5F3A5' },
  label: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: Typography.semibold,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
});

// ── Header ─────────────────────────────────────────────────────────────────────
function HomeHeader({
  search,
  onSearchChange,
}: {
  search: string;
  onSearchChange: (text: string) => void;
}) {
  return (
    <LinearGradient
      colors={['#7B0000', '#C62828', '#D32F2F']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={headerStyles.container}>
      {/* Title row */}
      <View style={headerStyles.titleRow}>
        <View>
          <Text style={headerStyles.title}>TrimCity</Text>
          <Text style={headerStyles.subtitle}>Find salons near you</Text>
        </View>
        <LiveIndicator showLabel size="sm" />
      </View>
      {/* Search */}
      <View style={headerStyles.searchWrapper}>
        <Text style={headerStyles.searchIcon}>🔍</Text>
        <TextInput
          style={headerStyles.searchInput}
          value={search}
          onChangeText={onSearchChange}
          placeholder={Strings.home.searchPlaceholder}
          placeholderTextColor={Colors.textTertiary}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>
    </LinearGradient>
  );
}

const headerStyles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[4],
    paddingBottom: Spacing[5],
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing[4],
  },
  title: {
    fontSize: Typography['2xl'],
    fontWeight: Typography.black,
    color: Colors.white,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: Typography.sm,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: Typography.medium,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing[3],
    height: 48,
    ...Shadow.sm,
  },
  searchIcon: { fontSize: 16, marginRight: Spacing[2] },
  searchInput: {
    flex: 1,
    fontSize: Typography.base,
    color: Colors.textPrimary,
    fontWeight: Typography.medium,
  },
});

// ── Main Screen ────────────────────────────────────────────────────────────────
export function HomeScreen() {
  const navigation = useNavigation<NavProp>();
  const { salons, cityStats, isLoading, filters, setSearch, setFilter } = useSalons();

  function handleSalonPress(salon: SalonWithMeta) {
    navigation.navigate('SalonDetail', {
      salonId: salon.salonId,
      salonName: salon.name,
    });
  }

  const renderSalon = useCallback(
    ({ item }: { item: SalonWithMeta }) => (
      <SalonCard salon={item} onPress={() => handleSalonPress(item)} />
    ),
    [],
  );

  const keyExtractor = useCallback((item: SalonWithMeta) => item.salonId, []);

  const ListHeader = (
    <>
      <HomeHeader search={filters.search} onSearchChange={setSearch} />
      <CityStatsBar
        totalSalons={cityStats?.totalSalons ?? salons.length}
        openNow={cityStats?.openNow ?? salons.filter(s => s.isOpen).length}
        totalSeated={cityStats?.totalSeated ?? salons.reduce((s, a) => s + a.seatedNow, 0)}
        totalWaiting={cityStats?.totalWaiting ?? salons.reduce((s, a) => s + a.waitingNow, 0)}
      />
      <FilterChips active={filters.activeFilter} onSelect={setFilter} />
      <Text style={styles.resultCount}>
        {salons.length} salon{salons.length !== 1 ? 's' : ''} found
      </Text>
    </>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar backgroundColor="transparent" translucent barStyle="light-content" />
        <HomeHeader search="" onSearchChange={() => {}} />
        <LoadingSpinner message={Strings.home.loadingText} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="transparent" translucent barStyle="light-content" />
      <FlatList
        data={salons}
        renderItem={renderSalon}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          <EmptyState
            icon="✂️"
            title={Strings.home.emptyTitle}
            subtitle={Strings.home.emptySubtitle}
            actionLabel="Clear Filter"
            onAction={() => { setSearch(''); setFilter('all'); }}
          />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[]}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  listContent: { paddingBottom: Spacing[8] },
  resultCount: {
    fontSize: Typography.sm,
    color: Colors.textTertiary,
    fontWeight: Typography.medium,
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[2],
    paddingBottom: Spacing[1],
  },
});
