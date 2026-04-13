/**
 * TrimCity — Phone Number Screen
 * Entry point for OTP login. Supports +91 Indian numbers.
 */
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AuthStackParamList, UserRole } from '../../types';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';
import { Button } from '../../components/ui/Button';
import { Strings } from '../../constants/strings';
import { validateIndianPhone } from '../../services/security/validator';
import { sanitizePhoneNumber } from '../../services/security/sanitizer';

type NavProp = NativeStackNavigationProp<AuthStackParamList, 'Phone'>;

export function PhoneScreen() {
  const navigation = useNavigation<NavProp>();
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('customer');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  function handlePhoneChange(text: string) {
    const cleaned = sanitizePhoneNumber(text).substring(0, 10);
    setPhone(cleaned);
    if (error) setError('');
  }

  async function handleSendOTP() {
    const cleaned = sanitizePhoneNumber(phone);
    if (!validateIndianPhone(cleaned)) {
      setError(Strings.auth.phoneError);
      return;
    }

    setIsLoading(true);
    try {
      // In production: pass Firebase RecaptchaVerifier
      // For now navigate with placeholder verificationId
      // Real implementation: call sendOTP(cleaned, recaptchaVerifier)
      navigation.navigate('OTP', {
        phone: cleaned,
        verificationId: 'FIREBASE_VERIFICATION_ID',
        role,
      });
    } catch (err) {
      setError(Strings.errors.generic);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        backgroundColor={Colors.navigationRed}
        barStyle="light-content"
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">

          {/* Hero */}
          <View style={styles.hero}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoEmoji}>✂️</Text>
            </View>
            <Text style={styles.appName}>{Strings.app.name}</Text>
            <Text style={styles.tagline}>{Strings.app.tagline}</Text>
          </View>

          {/* Role Toggle */}
          <View style={styles.roleToggle}>
            <TouchableOpacity
              style={[styles.roleBtn, role === 'customer' && styles.roleBtnActive]}
              onPress={() => setRole('customer')}
              activeOpacity={0.8}>
              <Text style={styles.roleEmoji}>💇</Text>
              <Text style={[styles.roleLabel, role === 'customer' && styles.roleLabelActive]}>
                Customer
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.roleBtn, role === 'owner' && styles.roleBtnActive]}
              onPress={() => setRole('owner')}
              activeOpacity={0.8}>
              <Text style={styles.roleEmoji}>💼</Text>
              <Text style={[styles.roleLabel, role === 'owner' && styles.roleLabelActive]}>
                Salon Owner
              </Text>
            </TouchableOpacity>
          </View>

          {/* Phone Input */}
          <View style={styles.form}>
            <Text style={styles.formLabel}>{Strings.auth.phoneLabel}</Text>
            <View style={[styles.phoneInput, error ? styles.phoneInputError : null]}>
              <View style={styles.countryCode}>
                <Text style={styles.flag}>🇮🇳</Text>
                <Text style={styles.code}>+91</Text>
              </View>
              <View style={styles.divider} />
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={handlePhoneChange}
                placeholder={Strings.auth.phonePlaceholder}
                placeholderTextColor={Colors.textTertiary}
                keyboardType="number-pad"
                maxLength={10}
                returnKeyType="done"
                onSubmitEditing={handleSendOTP}
              />
            </View>
            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : (
              <Text style={styles.hintText}>{Strings.auth.phoneHint}</Text>
            )}

            <Button
              title={Strings.auth.sendOtp}
              onPress={handleSendOTP}
              isLoading={isLoading}
              disabled={phone.length !== 10}
              fullWidth
              size="lg"
              style={styles.button}
            />
          </View>

          {/* Footer */}
          <Text style={styles.footer}>
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.navigationRed },
  flex: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { flexGrow: 1, paddingBottom: Spacing[8] },

  hero: {
    backgroundColor: Colors.navigationRed,
    alignItems: 'center',
    paddingTop: Spacing[8],
    paddingBottom: Spacing[8],
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  logoContainer: {
    width: 80,
    height: 80,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[3],
  },
  logoEmoji: { fontSize: 40 },
  appName: {
    fontSize: Typography['4xl'],
    fontWeight: Typography.black,
    color: Colors.white,
    letterSpacing: 2,
  },
  tagline: {
    fontSize: Typography.base,
    color: 'rgba(255,255,255,0.8)',
    marginTop: Spacing[2],
    fontWeight: Typography.medium,
  },

  roleToggle: {
    flexDirection: 'row',
    margin: Spacing[5],
    gap: Spacing[3],
  },
  roleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing[4],
    gap: Spacing[2],
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  roleBtnActive: {
    borderColor: Colors.navigationRed,
    backgroundColor: Colors.navigationRedSurface,
  },
  roleEmoji: { fontSize: 20 },
  roleLabel: {
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
    color: Colors.textSecondary,
  },
  roleLabelActive: { color: Colors.navigationRed },

  form: { paddingHorizontal: Spacing[5] },
  formLabel: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
    color: Colors.textSecondary,
    marginBottom: Spacing[2],
    letterSpacing: 0.3,
  },
  phoneInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    backgroundColor: Colors.white,
    minHeight: 56,
    overflow: 'hidden',
  },
  phoneInputError: { borderColor: Colors.error },
  countryCode: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[3],
    gap: 6,
  },
  flag: { fontSize: 20 },
  code: {
    fontSize: Typography.base,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  divider: { width: 1, height: 32, backgroundColor: Colors.border },
  input: {
    flex: 1,
    paddingHorizontal: Spacing[3],
    fontSize: Typography.lg,
    fontWeight: Typography.semibold,
    color: Colors.textPrimary,
    letterSpacing: 1,
  },
  errorText: {
    color: Colors.error,
    fontSize: Typography.xs,
    marginTop: Spacing[2],
    fontWeight: Typography.medium,
  },
  hintText: {
    color: Colors.textTertiary,
    fontSize: Typography.xs,
    marginTop: Spacing[2],
  },
  button: { marginTop: Spacing[5] },
  footer: {
    textAlign: 'center',
    color: Colors.textTertiary,
    fontSize: Typography.xs,
    paddingHorizontal: Spacing[8],
    marginTop: Spacing[5],
    lineHeight: 18,
  },
});
