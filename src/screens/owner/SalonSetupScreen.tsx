/**
 * TrimCity — Salon Profile Setup Screen
 * Owner configures salon name, location, category, services, hours.
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../constants/theme';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useAuthStore } from '../../store/authStore';
import { fetchSalonByOwner, upsertSalon } from '../../services/firebase/salon.service';
import type { Salon, SalonService, SalonCategory } from '../../types';
import { sanitizeText, sanitizeName, sanitizePrice, sanitizeDuration, sanitizeSeats } from '../../services/security/sanitizer';
import { Strings } from '../../constants/strings';

function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

export function SalonSetupScreen() {
  const { user } = useAuthStore();
  const [salon, setSalon] = useState<Partial<Salon>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState<SalonCategory>('unisex');
  const [totalSeats, setTotalSeats] = useState('4');
  const [services, setServices] = useState<SalonService[]>([]);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceDuration, setNewServiceDuration] = useState('30');
  const [newServicePrice, setNewServicePrice] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');

  useEffect(() => {
    async function load() {
      if (!user) return;
      const existing = await fetchSalonByOwner(user.uid);
      if (existing) {
        setSalon(existing);
        setName(existing.name);
        setAddress(existing.address);
        setPhone(existing.phone);
        setCategory(existing.category);
        setTotalSeats(String(existing.totalSeats));
        setServices(existing.services);
        setLatitude(String(existing.latitude));
        setLongitude(String(existing.longitude));
      }
      setLoading(false);
    }
    load();
  }, [user?.uid]);

  function handleAddService() {
    if (!newServiceName.trim()) {
      Alert.alert('Missing Info', 'Please enter a service name.');
      return;
    }
    const newSvc: SalonService = {
      id: generateId(),
      name: sanitizeName(newServiceName),
      durationMinutes: sanitizeDuration(parseInt(newServiceDuration, 10)),
      priceInr: sanitizePrice(parseFloat(newServicePrice)),
    };
    setServices(prev => [...prev, newSvc]);
    setNewServiceName('');
    setNewServiceDuration('30');
    setNewServicePrice('');
  }

  function handleRemoveService(id: string) {
    setServices(prev => prev.filter(s => s.id !== id));
  }

  async function handleSave() {
    if (!user) return;

    if (!name.trim() || !address.trim()) {
      Alert.alert('Missing Fields', 'Please fill in salon name and address.');
      return;
    }
    if (services.length === 0) {
      Alert.alert('No Services', 'Please add at least one service.');
      return;
    }

    setSaving(true);
    const result = await upsertSalon({
      salonId: salon.salonId,
      ownerId: user.uid,
      name: sanitizeName(name),
      address: sanitizeText(address),
      phone: phone.replace(/\D/g, '').substring(0, 10),
      category,
      totalSeats: sanitizeSeats(parseInt(totalSeats, 10)),
      services,
      latitude: parseFloat(latitude) || 0,
      longitude: parseFloat(longitude) || 0,
    });

    if (result.error) {
      Alert.alert('Save Failed', result.error);
    } else {
      Alert.alert('Saved!', 'Your salon profile has been saved. An admin will verify it shortly.');
      if (!salon.salonId && result.data) {
        setSalon(prev => ({ ...prev, salonId: result.data }));
      }
    }
    setSaving(false);
  }

  if (loading) return <LoadingSpinner fullScreen message="Loading salon profile…" />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="transparent" translucent barStyle="light-content" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">

        {/* Header */}
        <LinearGradient
          colors={['#7B0000', '#C62828', '#D32F2F']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}>
          <Text style={styles.headerTitle}>{Strings.salonSetup.screenTitle}</Text>
          <Text style={styles.headerSubtitle}>
            {salon.salonId
              ? 'Update your salon details'
              : 'Set up your salon to start accepting bookings'}
          </Text>
        </LinearGradient>

        {/* Basic Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Basic Information</Text>
          <Input
            label={Strings.salonSetup.salonName}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Royal Cuts"
            autoCapitalize="words"
          />
          <Input
            label={Strings.salonSetup.address}
            value={address}
            onChangeText={setAddress}
            placeholder="Full salon address"
            multiline
            numberOfLines={2}
          />
          <Input
            label="Phone Number"
            value={phone}
            onChangeText={setPhone}
            placeholder="10-digit mobile number"
            keyboardType="number-pad"
            maxLength={10}
          />
        </View>

        {/* Category */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{Strings.salonSetup.category}</Text>
          <View style={styles.categoryRow}>
            {(['men', 'women', 'unisex'] as SalonCategory[]).map(cat => (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryBtn, category === cat && styles.categoryBtnActive]}
                onPress={() => setCategory(cat)}
                activeOpacity={0.8}>
                <Text style={styles.categoryEmoji}>
                  {cat === 'men' ? '👨' : cat === 'women' ? '👩' : '👥'}
                </Text>
                <Text style={[styles.categoryLabel, category === cat && styles.categoryLabelActive]}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Capacity */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{Strings.salonSetup.totalSeats}</Text>
          <View style={styles.seatsRow}>
            {['2', '4', '6', '8', '10', '12'].map(n => (
              <TouchableOpacity
                key={n}
                style={[styles.seatBtn, totalSeats === n && styles.seatBtnActive]}
                onPress={() => setTotalSeats(n)}
                activeOpacity={0.8}>
                <Text style={[styles.seatBtnText, totalSeats === n && styles.seatBtnTextActive]}>
                  {n}
                </Text>
              </TouchableOpacity>
            ))}
            <TextInput
              style={styles.seatCustom}
              value={totalSeats}
              onChangeText={setTotalSeats}
              keyboardType="number-pad"
              placeholder="Custom"
              maxLength={3}
            />
          </View>
        </View>

        {/* Location */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Location (GPS Coordinates)</Text>
          <Text style={styles.cardHint}>
            Go to Google Maps, long-press your salon location, and copy the coordinates shown.
          </Text>
          <View style={styles.coordsRow}>
            <Input
              label="Latitude"
              value={latitude}
              onChangeText={setLatitude}
              placeholder="e.g. 12.9716"
              keyboardType="decimal-pad"
              containerStyle={styles.coordInput}
            />
            <Input
              label="Longitude"
              value={longitude}
              onChangeText={setLongitude}
              placeholder="e.g. 77.5946"
              keyboardType="decimal-pad"
              containerStyle={styles.coordInput}
            />
          </View>
        </View>

        {/* Services */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{Strings.salonSetup.services}</Text>

          {/* Existing services */}
          {services.map(svc => (
            <View key={svc.id} style={styles.serviceItem}>
              <View style={styles.serviceItemLeft}>
                <Text style={styles.serviceName}>{svc.name}</Text>
                <Text style={styles.serviceMeta}>
                  {svc.durationMinutes} min · ₹{svc.priceInr}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => handleRemoveService(svc.id)}
                style={styles.removeBtn}
                activeOpacity={0.8}>
                <Text style={styles.removeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}

          {/* Add new service */}
          <View style={styles.addServiceForm}>
            <Text style={styles.addServiceTitle}>{Strings.salonSetup.addService}</Text>
            <Input
              label={Strings.salonSetup.serviceName}
              value={newServiceName}
              onChangeText={setNewServiceName}
              placeholder="e.g. Haircut"
            />
            <View style={styles.coordsRow}>
              <Input
                label={Strings.salonSetup.duration}
                value={newServiceDuration}
                onChangeText={setNewServiceDuration}
                keyboardType="number-pad"
                placeholder="30"
                containerStyle={styles.coordInput}
              />
              <Input
                label={Strings.salonSetup.price}
                value={newServicePrice}
                onChangeText={setNewServicePrice}
                keyboardType="decimal-pad"
                placeholder="200"
                containerStyle={styles.coordInput}
              />
            </View>
            <Button
              title="+ Add Service"
              onPress={handleAddService}
              variant="secondary"
              size="sm"
              fullWidth
            />
          </View>
        </View>

        {/* Save */}
        <View style={styles.saveWrapper}>
          <Button
            title={salon.salonId ? 'Update Profile' : Strings.salonSetup.saveProfile}
            onPress={handleSave}
            isLoading={saving}
            fullWidth
            size="lg"
          />
          {!salon.isVerified && salon.salonId && (
            <Text style={styles.pendingNote}>
              ⏳ Pending admin verification. You'll be notified once approved.
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingBottom: Spacing[10] },
  header: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[4],
    paddingBottom: Spacing[5],
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: Spacing[4],
  },
  headerTitle: { fontSize: Typography['2xl'], fontWeight: Typography.black, color: Colors.white },
  headerSubtitle: { fontSize: Typography.sm, color: 'rgba(255,255,255,0.8)', marginTop: 4, fontWeight: Typography.medium },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    marginHorizontal: Spacing[4],
    marginBottom: Spacing[3],
    padding: Spacing[4],
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadow.sm,
  },
  cardTitle: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.textPrimary, marginBottom: Spacing[3] },
  cardHint: { fontSize: Typography.xs, color: Colors.textTertiary, marginBottom: Spacing[3], lineHeight: 18 },
  categoryRow: { flexDirection: 'row', gap: Spacing[2] },
  categoryBtn: {
    flex: 1, alignItems: 'center', paddingVertical: Spacing[3],
    borderRadius: Radius.lg, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.white,
  },
  categoryBtnActive: { borderColor: Colors.navigationRed, backgroundColor: Colors.navigationRedSurface },
  categoryEmoji: { fontSize: 22, marginBottom: 4 },
  categoryLabel: { fontSize: Typography.xs, fontWeight: Typography.bold, color: Colors.textSecondary },
  categoryLabelActive: { color: Colors.navigationRed },
  seatsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[2], alignItems: 'center' },
  seatBtn: {
    width: 44, height: 44, borderRadius: Radius.md,
    borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center',
  },
  seatBtnActive: { borderColor: Colors.navigationRed, backgroundColor: Colors.navigationRedSurface },
  seatBtnText: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.textSecondary },
  seatBtnTextActive: { color: Colors.navigationRed },
  seatCustom: {
    width: 70, height: 44, borderRadius: Radius.md,
    borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: Spacing[2],
    fontSize: Typography.sm, color: Colors.textPrimary, textAlign: 'center',
  },
  coordsRow: { flexDirection: 'row', gap: Spacing[3] },
  coordInput: { flex: 1, marginBottom: 0 },
  serviceItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: Spacing[2], borderBottomWidth: 1, borderBottomColor: Colors.divider,
  },
  serviceItemLeft: { flex: 1 },
  serviceName: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary },
  serviceMeta: { fontSize: Typography.xs, color: Colors.textTertiary, marginTop: 2 },
  removeBtn: { padding: Spacing[2] },
  removeBtnText: { color: Colors.error, fontSize: Typography.base, fontWeight: Typography.bold },
  addServiceForm: {
    marginTop: Spacing[3], paddingTop: Spacing[3],
    borderTopWidth: 1, borderTopColor: Colors.divider,
  },
  addServiceTitle: { fontSize: Typography.sm, fontWeight: Typography.bold, color: Colors.textSecondary, marginBottom: Spacing[2] },
  saveWrapper: { marginHorizontal: Spacing[4], marginTop: Spacing[2] },
  pendingNote: {
    textAlign: 'center', color: Colors.busy, fontSize: Typography.xs,
    fontWeight: Typography.medium, marginTop: Spacing[3], lineHeight: 18,
  },
});
