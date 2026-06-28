/**
 * TrimCity — Salon Profile Setup Screen
 * Owner configures salon name, location, category, services, hours.
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../constants/theme';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useAuthStore } from '../../store/authStore';
import { fetchMySalon, upsertMySalon } from '../../services/api/salon.service';
import type { Salon, SalonService, SalonCategory } from '../../types';
import { sanitizeText, sanitizeName, sanitizePrice, sanitizeDuration, sanitizeSeats } from '../../services/security/sanitizer';
import { Strings } from '../../constants/strings';
import { SalonPhotoManager } from '../../components/salon/SalonPhotoManager';
import { ensureCoords } from '../../services/location/location.service';
import apiClient from '../../services/api/client';

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
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
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
      const res = await fetchMySalon();
      if (res.data) {
        const existing = res.data;
        setSalon({
          salonId: existing._id,
          name: existing.name,
          phone: existing.phone,
          category: existing.category as any,
          totalSeats: existing.totalSeats,
          address: [existing.address?.street, existing.address?.city, existing.address?.state].filter(Boolean).join(', '),
          latitude: existing.location?.coordinates?.[1] ?? 0,
          longitude: existing.location?.coordinates?.[0] ?? 0,
        });
        setName(existing.name);
        setStreet(existing.address?.street ?? '');
        setCity(existing.address?.city ?? '');
        setState(existing.address?.state ?? '');
        setZipCode(existing.address?.zipCode ?? '');
        setPhone(existing.phone);
        setCategory(existing.category as any);
        setTotalSeats(String(existing.totalSeats ?? 4));
        if (existing.services) {
          setServices(existing.services.map(s => ({
            id: s._id,
            name: s.name,
            durationMinutes: s.duration,
            priceInr: s.price,
          })));
        }
        if (existing.location?.coordinates) {
          setLatitude(String(existing.location.coordinates[1]));
          setLongitude(String(existing.location.coordinates[0]));
        }
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

  const [fetchingLocation, setFetchingLocation] = useState(false);

  async function handleUseMyLocation() {
    setFetchingLocation(true);
    const coords = await ensureCoords({ offerOpenSettings: true });
    setFetchingLocation(false);
    if (!coords) return; 
    setLatitude(coords.latitude.toFixed(6));
    setLongitude(coords.longitude.toFixed(6));
  }

  async function handleSave() {
    if (!user) return;

    if (!name.trim() || !street.trim() || !city.trim() || !state.trim() || !zipCode.trim()) {
      Alert.alert('Missing Fields', 'Please fill in salon name and full address.');
      return;
    }
    if (services.length === 0) {
      Alert.alert('No Services', 'Please add at least one service.');
      return;
    }

    setSaving(true);
    const payload = {
      name: sanitizeName(name),
      phone: phone.replace(/\D/g, '').substring(0, 10),
      category,
      totalSeats: sanitizeSeats(parseInt(totalSeats, 10)),
      address: {
        street: sanitizeText(street),
        city: sanitizeText(city),
        state: sanitizeText(state),
        zipCode: sanitizeText(zipCode),
        country: 'India',
      },
      location: {
        type: 'Point' as const,
        coordinates: [parseFloat(longitude) || 73.8567, parseFloat(latitude) || 18.5204] as [number, number],
      },
    };

    const result = await upsertMySalon(payload);

    if (result.error) {
      Alert.alert('Save Failed', result.error);
    } else {
      const savedSalon = result.data;
      if (savedSalon && savedSalon._id) {
        // Sync services: Fetch current services in DB
        const currentDb = await apiClient.get(`/services/salons/${savedSalon._id}/services`).catch(() => ({ data: { data: [] } }));
        const dbServices: any[] = currentDb.data?.data ?? [];

        // Delete removed services
        for (const dbSvc of dbServices) {
          const stillExists = services.some(s => s.id === dbSvc._id);
          if (!stillExists) {
            await apiClient.delete(`/services/${dbSvc._id}`).catch(err => console.error('Delete service error:', err));
          }
        }

        // Add new services
        const hex24Regex = /^[0-9a-fA-F]{24}$/;
        for (const localSvc of services) {
          const isNew = !hex24Regex.test(localSvc.id);
          if (isNew) {
            await apiClient.post(`/services/salons/${savedSalon._id}/services`, {
              name: localSvc.name,
              price: localSvc.priceInr,
              duration: localSvc.durationMinutes,
              description: localSvc.name,
            }).catch(err => console.error('Create service error:', err));
          }
        }
      }

      Alert.alert('Saved!', 'Your salon profile has been saved. An admin will verify it shortly.');
      if (savedSalon) {
        setSalon({
          salonId: savedSalon._id,
          name: savedSalon.name,
          phone: savedSalon.phone,
          category: savedSalon.category as any,
          totalSeats: savedSalon.totalSeats,
        });
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
            label="Street Address"
            value={street}
            onChangeText={setStreet}
            placeholder="e.g. Shop 12, Main Road"
          />
          <View style={{ flexDirection: 'row', gap: Spacing[2] }}>
            <View style={{ flex: 1 }}>
              <Input
                label="City"
                value={city}
                onChangeText={setCity}
                placeholder="e.g. Pune"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="State"
                value={state}
                onChangeText={setState}
                placeholder="e.g. Maharashtra"
              />
            </View>
          </View>
          <Input
            label="Zip Code"
            value={zipCode}
            onChangeText={setZipCode}
            placeholder="e.g. 411001"
            keyboardType="number-pad"
            maxLength={6}
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
          <Text style={styles.cardTitle}>Salon Location</Text>
          <Text style={styles.cardHint}>
            Tap the button while standing at your salon, or update later if you move.
          </Text>
          <Button
            title={fetchingLocation ? 'Detecting…' : '📍 Use my current location'}
            onPress={handleUseMyLocation}
            isLoading={fetchingLocation}
            variant="secondary"
            fullWidth
            size="md"
            style={{ marginBottom: Spacing[3] }}
          />
          {(!!latitude && !!longitude) && (
            <Text style={[styles.cardHint, { marginTop: 0 }]}>
              Detected: {Number(latitude).toFixed(4)}, {Number(longitude).toFixed(4)} — tap again to refresh.
            </Text>
          )}
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
