/**
 * TrimCity — User Profile Screen
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Alert,
  ScrollView,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../constants/theme';
import { Input } from '../../components/ui/Input';
import { useAuthStore } from '../../store/authStore';
import { signOut, updateUserProfile } from '../../services/firebase/auth.service';
import { Strings } from '../../constants/strings';
import { formatPhone } from '../../utils/formatters';

export function ProfileScreen() {
  const { user, logout, setUser } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [location, setLocation] = useState(user?.location ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  async function handleSave() {
    if (!user) return;
    const trimmedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }
    const trimmedPhone = phone.trim();
    if (trimmedPhone.length < 10) {
      Alert.alert('Invalid Phone', 'Please enter a valid 10-digit phone number.');
      return;
    }
    setIsSaving(true);
    const result = await updateUserProfile(user.uid, {
      email: trimmedEmail,
      phone: trimmedPhone,
      location: location.trim(),
    });
    if (result.error) {
      Alert.alert('Error', result.error);
    } else if (result.data) {
      setUser(result.data);
      setIsEditing(false);
    }
    setIsSaving(false);
  }

  function handleLogout() {
    Alert.alert(
      Strings.profile.logout,
      Strings.profile.logoutConfirm,
      [
        { text: Strings.profile.logoutConfirmNo, style: 'cancel' },
        {
          text: Strings.profile.logoutConfirmYes,
          style: 'destructive',
          onPress: async () => {
            await signOut();
            logout();
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="transparent" translucent barStyle="light-content" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>

        {/* Premium Header */}
        <LinearGradient
          colors={['#4A0000', '#7B0000', '#B71C1C']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {user?.name ? user.name.charAt(0).toUpperCase() : '👤'}
            </Text>
          </View>
          <Text style={styles.displayName}>{user?.name || 'Customer'}</Text>
          <Text style={styles.roleText}>💇 Customer Account</Text>
        </LinearGradient>

        {/* Profile Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleContainer}>
              <Text style={styles.cardIcon}>👤</Text>
              <Text style={styles.cardTitle}>Profile Information</Text>
            </View>
            {!isEditing && (
              <TouchableOpacity
                onPress={() => {
                  setIsEditing(true);
                  setEmail(user?.email ?? '');
                  setPhone(user?.phone ?? '');
                  setLocation(user?.location ?? '');
                }}
                activeOpacity={0.7}
                style={styles.editButton}>
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>

          {isEditing ? (
            <View style={styles.editForm}>
              <Input
                label="EMAIL ADDRESS"
                value={email}
                onChangeText={setEmail}
                placeholder="example@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
              />
              <Input
                label="PHONE NUMBER"
                value={phone}
                onChangeText={setPhone}
                placeholder="10-digit phone number"
                keyboardType="phone-pad"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Input
                label="LOCATION NAME"
                value={location}
                onChangeText={setLocation}
                placeholder="City / Area (e.g. Delhi)"
                autoCapitalize="words"
                autoCorrect={false}
              />
              <View style={styles.editActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => {
                    setIsEditing(false);
                    setEmail(user?.email ?? '');
                    setPhone(user?.phone ?? '');
                    setLocation(user?.location ?? '');
                  }}
                  activeOpacity={0.7}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleSave}
                  activeOpacity={0.7}
                  disabled={isSaving}>
                  <Text style={styles.saveBtnText}>{isSaving ? 'Saving...' : 'Save'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.infoBlock}>
              <View style={styles.infoRow}>
                <View style={styles.infoLeft}>
                  <Text style={styles.infoIcon}>✉️</Text>
                  <Text style={styles.infoLabel}>Email</Text>
                </View>
                <Text style={styles.infoValue}>{user?.email || '—'}</Text>
              </View>

              <View style={styles.infoRow}>
                <View style={styles.infoLeft}>
                  <Text style={styles.infoIcon}>📱</Text>
                  <Text style={styles.infoLabel}>Phone</Text>
                </View>
                <Text style={styles.infoValue}>{formatPhone(user?.phone ?? '')}</Text>
              </View>

              <View style={styles.infoRow}>
                <View style={styles.infoLeft}>
                  <Text style={styles.infoIcon}>📍</Text>
                  <Text style={styles.infoLabel}>Location</Text>
                </View>
                <Text style={styles.infoValue}>{user?.location || 'Not set'}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Preferences Card */}
        <View style={styles.card}>
          <View style={styles.cardTitleContainer}>
            <Text style={styles.cardIcon}>⚙️</Text>
            <Text style={styles.cardTitle}>App Preferences</Text>
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingIcon}>🔔</Text>
              <Text style={styles.settingLabel}>{Strings.profile.notificationsEnabled}</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ true: '#D32F2F', false: Colors.border }}
              thumbColor={Colors.white}
            />
          </View>
        </View>

        {/* About App Card */}
        <View style={styles.card}>
          <View style={styles.cardTitleContainer}>
            <Text style={styles.cardIcon}>ℹ️</Text>
            <Text style={styles.cardTitle}>About TrimCity</Text>
          </View>

          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Version</Text>
            <Text style={styles.aboutValue}>{Strings.app.version}</Text>
          </View>
          <View style={[styles.aboutRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.aboutLabel}>Platform Status</Text>
            <Text style={[styles.aboutValue, { color: '#2E7D32' }]}>🟢 Live & Healthy</Text>
          </View>
        </View>

        {/* Logout Button */}
        <View style={styles.logoutContainer}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.85}>
            <LinearGradient
              colors={['#C62828', '#B71C1C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.logoutGradient}>
              <Text style={styles.logoutText}>🚪 {Strings.profile.logout}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F9FA' },
  scrollContent: { paddingBottom: Spacing[8] },

  // Header Style
  header: {
    alignItems: 'center',
    paddingTop: Spacing[8],
    paddingBottom: Spacing[7],
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    marginBottom: Spacing[5],
    ...Shadow.lg,
  },
  avatarContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[3],
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
  avatarText: {
    fontSize: 40,
    color: Colors.white,
    fontWeight: Typography.bold,
  },
  displayName: {
    fontSize: 22,
    fontWeight: Typography.black,
    color: Colors.white,
    marginBottom: Spacing[1],
    letterSpacing: 0.5,
  },
  roleText: {
    fontSize: 12,
    fontWeight: Typography.bold,
    color: 'rgba(255,255,255,0.85)',
    backgroundColor: 'rgba(0,0,0,0.15)',
    paddingHorizontal: Spacing[3],
    paddingVertical: 4,
    borderRadius: Radius.full,
    marginTop: Spacing[1],
  },

  // Card Style
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    marginHorizontal: Spacing[4],
    marginBottom: Spacing[4],
    padding: Spacing[4],
    borderWidth: 1,
    borderColor: '#EAEAEA',
    ...Shadow.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingBottom: Spacing[2],
    marginBottom: Spacing[3],
  },
  cardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  cardIcon: {
    fontSize: 18,
  },
  cardTitle: {
    fontSize: Typography.base,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  editButton: {
    backgroundColor: '#FBE9E7',
    paddingHorizontal: Spacing[3],
    paddingVertical: 6,
    borderRadius: Radius.md,
  },
  editButtonText: {
    color: '#D32F2F',
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
  },

  // Edit Form Styles
  editForm: {
    marginTop: Spacing[1],
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing[3],
    marginTop: Spacing[4],
  },
  cancelBtn: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    borderRadius: Radius.md,
    backgroundColor: '#F5F5F5',
  },
  cancelBtnText: {
    color: Colors.textSecondary,
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
  },
  saveBtn: {
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[2],
    borderRadius: Radius.md,
    backgroundColor: '#D32F2F',
    ...Shadow.xs,
  },
  saveBtnText: {
    color: Colors.white,
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
  },

  // Info Block Styles
  infoBlock: {
    marginTop: Spacing[1],
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  infoIcon: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  infoLabel: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.medium,
  },
  infoValue: {
    fontSize: Typography.sm,
    color: Colors.textPrimary,
    fontWeight: Typography.bold,
  },

  // Setting Styles
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing[2],
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  settingIcon: {
    fontSize: 16,
  },
  settingLabel: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.medium,
  },

  // About Styles
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  aboutLabel: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.medium,
  },
  aboutValue: {
    fontSize: Typography.sm,
    color: Colors.textPrimary,
    fontWeight: Typography.semibold,
  },

  // Logout Button
  logoutContainer: {
    marginHorizontal: Spacing[4],
    marginTop: Spacing[3],
    borderRadius: Radius.xl,
    overflow: 'hidden',
    ...Shadow.md,
  },
  logoutButton: {
    width: '100%',
  },
  logoutGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: {
    color: Colors.white,
    fontSize: Typography.base,
    fontWeight: Typography.black,
    letterSpacing: 0.5,
  },
});
