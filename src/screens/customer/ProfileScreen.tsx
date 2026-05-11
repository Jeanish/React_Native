/**
 * TrimCity — User Profile Screen
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Alert,
  ScrollView,
  Switch,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../constants/theme';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuthStore } from '../../store/authStore';
import { updateUserProfile } from '../../services/firebase/auth.service';
import { sanitizeName } from '../../services/security/sanitizer';
import { Strings } from '../../constants/strings';
import { formatPhone } from '../../utils/formatters';

export function ProfileScreen() {
  const { user, logout, updateUserName } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  async function handleSave() {
    if (!user) return;
    const sanitized = sanitizeName(name);
    if (sanitized.length < 2) {
      Alert.alert('Invalid Name', 'Name must be at least 2 characters.');
      return;
    }
    setIsSaving(true);
    const result = await updateUserProfile({ name: sanitized });
    if (result.error) {
      Alert.alert('Error', result.error);
    } else {
      updateUserName(sanitized);
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
            await logout();
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

        {/* Header */}
        <LinearGradient
          colors={['#7B0000', '#C62828', '#D32F2F']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarEmoji}>
              {user?.name ? user.name.charAt(0).toUpperCase() : '👤'}
            </Text>
          </View>
          <Text style={styles.displayName}>{user?.name || 'Set your name'}</Text>
          <Text style={styles.phoneText}>{formatPhone(user?.phone ?? '')}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>
              {user?.role === 'owner' ? '💼 Salon Owner' : '💇 Customer'}
            </Text>
          </View>
        </LinearGradient>

        {/* Edit Profile */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{Strings.profile.editProfile}</Text>
            {!isEditing && (
              <TouchableOpacity onPress={() => setIsEditing(true)} activeOpacity={0.8}>
                <Text style={styles.editLink}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>

          {isEditing ? (
            <>
              <Input
                label={Strings.profile.name}
                value={name}
                onChangeText={setName}
                placeholder="Enter your full name"
                autoCapitalize="words"
                autoFocus
              />
              <View style={styles.editActions}>
                <Button
                  title="Cancel"
                  onPress={() => { setIsEditing(false); setName(user?.name ?? ''); }}
                  variant="ghost"
                  size="sm"
                />
                <Button
                  title="Save"
                  onPress={handleSave}
                  isLoading={isSaving}
                  size="sm"
                />
              </View>
            </>
          ) : (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Name</Text>
              <Text style={styles.infoValue}>{user?.name || '—'}</Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Phone</Text>
            <Text style={styles.infoValue}>{formatPhone(user?.phone ?? '')}</Text>
          </View>
        </View>

        {/* Settings */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Settings</Text>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingIcon}>🔔</Text>
              <Text style={styles.settingLabel}>{Strings.profile.notificationsEnabled}</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ true: Colors.navigationRed, false: Colors.border }}
              thumbColor={Colors.white}
            />
          </View>
        </View>

        {/* App Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>About</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>App</Text>
            <Text style={styles.infoValue}>TrimCity</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Version</Text>
            <Text style={styles.infoValue}>{Strings.app.version}</Text>
          </View>
        </View>

        {/* Logout */}
        <View style={styles.logoutWrapper}>
          <Button
            title={Strings.profile.logout}
            onPress={handleLogout}
            variant="danger"
            fullWidth
            size="lg"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingBottom: Spacing[10] },

  header: {
    alignItems: 'center',
    paddingTop: Spacing[8],
    paddingBottom: Spacing[6],
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    marginBottom: Spacing[4],
  },
  avatarContainer: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[3],
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarEmoji: { fontSize: 38, color: Colors.white, fontWeight: Typography.bold },
  displayName: {
    fontSize: Typography.xl,
    fontWeight: Typography.black,
    color: Colors.white,
    marginBottom: 4,
  },
  phoneText: {
    fontSize: Typography.base,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: Typography.medium,
    marginBottom: Spacing[2],
  },
  roleBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing[3],
    paddingVertical: 4,
  },
  roleText: {
    color: Colors.white,
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
  },

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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing[3],
  },
  cardTitle: {
    fontSize: Typography.base,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing[3],
  },
  editLink: {
    color: Colors.navigationRed,
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
  },
  editActions: {
    flexDirection: 'row',
    gap: Spacing[2],
    justifyContent: 'flex-end',
    marginTop: Spacing[2],
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  infoLabel: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.medium,
  },
  infoValue: {
    fontSize: Typography.sm,
    color: Colors.textPrimary,
    fontWeight: Typography.semibold,
  },

  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing[2],
  },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing[2] },
  settingIcon: { fontSize: 18 },
  settingLabel: {
    fontSize: Typography.base,
    color: Colors.textPrimary,
    fontWeight: Typography.medium,
  },

  logoutWrapper: { marginHorizontal: Spacing[4], marginTop: Spacing[2] },
});
