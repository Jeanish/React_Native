/**
 * TrimCity — Admin: Add New Salon
 * Admin creates a salon (auto-verified, immediately live for customers).
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../constants/theme';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuthStore } from '../../store/authStore';
import { adminCreateSalon } from '../../services/firebase/salon.service';
import type { SalonCategory, SalonService, WorkingHours } from '../../types';

const CATEGORIES: SalonCategory[] = ['men', 'women', 'unisex'];

function defaultWorkingHours(): WorkingHours {
  const day = { isOpen: true, openTime: '09:00', closeTime: '21:00' };
  return { mon: day, tue: day, wed: day, thu: day, fri: day, sat: day, sun: { isOpen: false, openTime: '09:00', closeTime: '18:00' } };
}

export function AdminAddSalonScreen() {
  const { user } = useAuthStore();

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [category, setCategory] = useState<SalonCategory>('unisex');
  const [seats, setSeats] = useState('4');
  const [ownerId, setOwnerId] = useState('');

  // Services
  const [services, setServices] = useState<SalonService[]>([]);
  const [svcName, setSvcName] = useState('');
  const [svcPrice, setSvcPrice] = useState('');
  const [svcDuration, setSvcDuration] = useState('30');

  const [saving, setSaving] = useState(false);

  function addService() {
    if (!svcName.trim() || !svcPrice.trim()) {
      Alert.alert('Missing', 'Enter service name and price.');
      return;
    }
    const svc: SalonService = {
      id: Date.now().toString(),
      name: svcName.trim(),
      priceInr: parseInt(svcPrice, 10) || 0,
      durationMinutes: parseInt(svcDuration, 10) || 30,
    };
    setServices(prev => [...prev, svc]);
    setSvcName('');
    setSvcPrice('');
    setSvcDuration('30');
  }

  function removeService(id: string) {
    setServices(prev => prev.filter(s => s.id !== id));
  }

  async function handleSave() {
    if (!name.trim() || !address.trim()) {
      Alert.alert('Required', 'Salon name and address are required.');
      return;
    }
    if (!latitude.trim() || !longitude.trim()) {
      Alert.alert('Required', 'Latitude and longitude are required for nearby search.\n\nGet them from Google Maps: long-press location → copy coordinates.');
      return;
    }
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (isNaN(lat) || isNaN(lng)) {
      Alert.alert('Invalid', 'Latitude and longitude must be valid numbers.');
      return;
    }

    setSaving(true);
    const result = await adminCreateSalon({
      name: name.trim(),
      address: address.trim(),
      phone: phone.trim(),
      latitude: lat,
      longitude: lng,
      category,
      totalSeats: parseInt(seats, 10) || 4,
      isOpen: false,
      ownerId: ownerId.trim() || (user?.uid ?? ''),
      services,
      photos: [],
      workingHours: defaultWorkingHours(),
      isVerified: true,
    });
    setSaving(false);

    if (result.error) {
      Alert.alert('Error', result.error);
    } else {
      Alert.alert('Success', `Salon "${name}" is now live!`, [
        { text: 'OK', onPress: () => {
          setName(''); setAddress(''); setPhone('');
          setLatitude(''); setLongitude(''); setOwnerId('');
          setSeats('4'); setCategory('unisex'); setServices([]);
        }},
      ]);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar backgroundColor="transparent" translucent barStyle="light-content" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <LinearGradient
            colors={['#1A237E', '#283593', '#3949AB']}
            style={styles.header}>
            <Text style={styles.headerTitle}>Add New Salon</Text>
            <Text style={styles.headerSub}>Admin-created salons go live immediately</Text>
          </LinearGradient>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Info</Text>
            <Input label="Salon Name *" value={name} onChangeText={setName} placeholder="e.g. Raj Hair Studio" autoCapitalize="words" />
            <Input label="Address *" value={address} onChangeText={setAddress} placeholder="e.g. Shop 12, MG Road, Pune" autoCapitalize="sentences" />
            <Input label="Phone" value={phone} onChangeText={setPhone} placeholder="10-digit number" keyboardType="number-pad" maxLength={10} />
            <Input label="Owner UID (optional)" value={ownerId} onChangeText={setOwnerId} placeholder="Paste Firebase UID of owner" autoCapitalize="none" />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location (for Nearby Search)</Text>
            <Text style={styles.hint}>Get coords: Google Maps → long-press → tap coordinates to copy</Text>
            <View style={styles.row}>
              <View style={styles.half}>
                <Input label="Latitude *" value={latitude} onChangeText={setLatitude} placeholder="e.g. 18.5204" keyboardType="decimal-pad" />
              </View>
              <View style={styles.half}>
                <Input label="Longitude *" value={longitude} onChangeText={setLongitude} placeholder="e.g. 73.8567" keyboardType="decimal-pad" />
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Category</Text>
            <View style={styles.chipRow}>
              {CATEGORIES.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.chip, category === c && styles.chipActive]}
                  onPress={() => setCategory(c)}
                  activeOpacity={0.8}>
                  <Text style={[styles.chipText, category === c && styles.chipTextActive]}>
                    {c === 'men' ? '👨 Men' : c === 'women' ? '👩 Women' : '✂️ Unisex'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Capacity</Text>
            <View style={styles.chipRow}>
              {[2, 4, 6, 8, 10].map(n => (
                <TouchableOpacity
                  key={n}
                  style={[styles.chip, seats === String(n) && styles.chipActive]}
                  onPress={() => setSeats(String(n))}
                  activeOpacity={0.8}>
                  <Text style={[styles.chipText, seats === String(n) && styles.chipTextActive]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Services</Text>

            {services.map(svc => (
              <View key={svc.id} style={styles.svcRow}>
                <View style={styles.svcInfo}>
                  <Text style={styles.svcName}>{svc.name}</Text>
                  <Text style={styles.svcMeta}>₹{svc.priceInr} · {svc.durationMinutes} min</Text>
                </View>
                <TouchableOpacity onPress={() => removeService(svc.id)} style={styles.svcRemove}>
                  <Text style={styles.svcRemoveText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}

            <View style={styles.svcAdd}>
              <Input label="Service Name" value={svcName} onChangeText={setSvcName} placeholder="e.g. Haircut" autoCapitalize="words" />
              <View style={styles.row}>
                <View style={styles.half}>
                  <Input label="Price (₹)" value={svcPrice} onChangeText={setSvcPrice} placeholder="200" keyboardType="number-pad" />
                </View>
                <View style={styles.half}>
                  <Input label="Duration (min)" value={svcDuration} onChangeText={setSvcDuration} placeholder="30" keyboardType="number-pad" />
                </View>
              </View>
              <TouchableOpacity style={styles.addSvcBtn} onPress={addService} activeOpacity={0.8}>
                <Text style={styles.addSvcText}>+ Add Service</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.saveRow}>
            <Button
              title="Create Salon (Live Now)"
              onPress={handleSave}
              isLoading={saving}
              fullWidth
              size="lg"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[4],
    paddingBottom: Spacing[5],
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: { fontSize: Typography.xl, fontWeight: Typography.black, color: Colors.white },
  headerSub: { fontSize: Typography.sm, color: 'rgba(255,255,255,0.7)', marginTop: 2 },

  section: {
    margin: Spacing[4],
    marginBottom: 0,
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing[4],
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadow.sm,
  },
  sectionTitle: {
    fontSize: Typography.md,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing[3],
  },
  hint: {
    fontSize: Typography.xs,
    color: Colors.textTertiary,
    marginBottom: Spacing[2],
    fontStyle: 'italic',
  },
  row: { flexDirection: 'row', gap: Spacing[2] },
  half: { flex: 1 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[2] },
  chip: {
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  chipActive: { borderColor: '#3949AB', backgroundColor: '#E8EAF6' },
  chipText: { fontSize: Typography.sm, color: Colors.textSecondary, fontWeight: Typography.semibold },
  chipTextActive: { color: '#3949AB' },

  svcRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing[2],
    paddingHorizontal: Spacing[3],
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radius.md,
    marginBottom: Spacing[2],
  },
  svcInfo: { flex: 1 },
  svcName: { fontSize: Typography.sm, fontWeight: Typography.semibold, color: Colors.textPrimary },
  svcMeta: { fontSize: Typography.xs, color: Colors.textTertiary },
  svcRemove: { padding: Spacing[1] },
  svcRemoveText: { color: Colors.error, fontSize: Typography.base, fontWeight: Typography.bold },

  svcAdd: { marginTop: Spacing[2] },
  addSvcBtn: {
    backgroundColor: '#E8EAF6',
    borderRadius: Radius.md,
    paddingVertical: Spacing[2],
    alignItems: 'center',
    marginTop: Spacing[1],
  },
  addSvcText: { color: '#3949AB', fontSize: Typography.sm, fontWeight: Typography.bold },

  saveRow: { margin: Spacing[4], marginTop: Spacing[5] },
});
