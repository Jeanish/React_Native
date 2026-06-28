/**
 * TrimCity — My Appointments Screen
 * Tabbed: Upcoming | Past
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  StatusBar,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Appointment } from '../../types';
import LinearGradient from 'react-native-linear-gradient';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';
import { BookingCard } from '../../components/booking/BookingCard';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { useBookings } from '../../hooks/useBookings';
import { cancelAppointment } from '../../services/api/booking.service';
import { useAuthStore } from '../../store/authStore';
import { Strings } from '../../constants/strings';

type Tab = 'upcoming' | 'past';

export function AppointmentsScreen() {
  const { user } = useAuthStore();
  const { upcoming, past, isLoading } = useBookings();
  const [activeTab, setActiveTab] = useState<Tab>('upcoming');
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  function handleCancel(appointmentId: string) {
    Alert.alert(
      Strings.appointments.cancelConfirmTitle,
      Strings.appointments.cancelConfirmMessage,
      [
        { text: Strings.appointments.cancelDismiss, style: 'cancel' },
        {
          text: Strings.appointments.cancelConfirm,
          style: 'destructive',
          onPress: async () => {
            if (!user) return;
            setCancellingId(appointmentId);
            const result = await cancelAppointment(appointmentId, 'Customer requested cancellation');
            if (result.error) {
              Alert.alert('Error', result.error);
            }
            setCancellingId(null);
          },
        },
      ],
    );
  }

  const renderItem = ({ item }: { item: Appointment }) => (
    <BookingCard
      appointment={item}
      onCancel={activeTab === 'upcoming' ? handleCancel : undefined}
    />
  );

  const data = activeTab === 'upcoming' ? upcoming : past;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="transparent" translucent barStyle="light-content" />

      {/* Header */}
      <LinearGradient
        colors={['#7B0000', '#C62828', '#D32F2F']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}>
        <Text style={styles.title}>{Strings.appointments.screenTitle}</Text>
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['upcoming', 'past'] as Tab[]).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.8}>
            <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
              {tab === 'upcoming'
                ? `${Strings.appointments.upcoming} (${upcoming.length})`
                : `${Strings.appointments.past} (${past.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      {isLoading ? (
        <LoadingSpinner message="Loading appointments…" />
      ) : (
        <FlatList
          data={data}
          renderItem={renderItem}
          keyExtractor={item => item.appointmentId}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              icon={activeTab === 'upcoming' ? '📅' : '🕐'}
              title={
                activeTab === 'upcoming'
                  ? Strings.appointments.emptyUpcoming
                  : Strings.appointments.emptyPast
              }
              subtitle={
                activeTab === 'upcoming'
                  ? Strings.appointments.emptyUpcomingSubtitle
                  : undefined
              }
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[4],
    paddingBottom: Spacing[5],
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  title: {
    fontSize: Typography['2xl'],
    fontWeight: Typography.black,
    color: Colors.white,
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: Spacing[4],
    marginTop: Spacing[4],
    marginBottom: Spacing[2],
    backgroundColor: Colors.borderLight,
    borderRadius: Radius.full,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing[2],
    alignItems: 'center',
    borderRadius: Radius.full,
  },
  tabActive: { backgroundColor: Colors.white },
  tabLabel: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
    color: Colors.textTertiary,
  },
  tabLabelActive: { color: Colors.navigationRed },
  listContent: { paddingBottom: Spacing[8] },
});
