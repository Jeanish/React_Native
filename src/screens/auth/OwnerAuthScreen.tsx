/**
 * TrimCity — Salon Owner Auth Screen
 * Register / Login tabs for salon owners.
 * Register calls POST /auth/salon/register → creates salon_admin user.
 * Login calls POST /auth/salon/login → authenticates existing owner.
 * Salon starts as "pending" and requires admin approval.
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Animated,
  Easing,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../types';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../constants/theme';
import { registerSalonOwner, loginSalonOwner } from '../../services/auth/auth.service';
import { useAuthStore } from '../../store/authStore';

type NavProp = NativeStackNavigationProp<AuthStackParamList, 'OwnerAuth'>;
type AuthTab = 'register' | 'login';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TOGGLE_PADDING = 4;
const TOGGLE_INNER_WIDTH = SCREEN_WIDTH - Spacing[5] * 2 - TOGGLE_PADDING * 2;
const INDICATOR_WIDTH = TOGGLE_INNER_WIDTH / 2;

const HERO_GRADIENT = ['#0D0000', '#1A237E', '#283593', '#3949AB'] as const;
const CTA_GRADIENT  = ['#5C6BC0', '#3949AB', '#283593'] as const;
const CTA_DISABLED  = ['#BDBDBD', '#9E9E9E'] as const;

export function OwnerAuthScreen() {
  const navigation = useNavigation<NavProp>();
  const { setUser } = useAuthStore();

  const [tab, setTab]           = useState<AuthTab>('register');
  const [error, setError]       = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Register fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [phone, setPhone]         = useState('');
  const [salonName, setSalonName] = useState('');

  // Login fields
  const [loginEmail, setLoginEmail]       = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // ── Animations ────────────────────────────────────────────────────
  const heroOpacity  = useRef(new Animated.Value(0)).current;
  const cardOpacity  = useRef(new Animated.Value(0)).current;
  const cardSlide    = useRef(new Animated.Value(80)).current;
  const indicatorX   = useRef(new Animated.Value(0)).current;
  const iconScale    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(heroOpacity, {
        toValue: 1, duration: 500, useNativeDriver: true,
      }),
      Animated.timing(iconScale, {
        toValue: 1, duration: 700, delay: 150,
        easing: Easing.out(Easing.back(1.3)), useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1, duration: 500, delay: 350, useNativeDriver: true,
      }),
      Animated.timing(cardSlide, {
        toValue: 0, duration: 650, delay: 300,
        easing: Easing.out(Easing.poly(4)), useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────
  function handleTabSwitch(newTab: AuthTab) {
    setTab(newTab);
    setError('');
    Animated.timing(indicatorX, {
      toValue: newTab === 'register' ? 0 : INDICATOR_WIDTH,
      duration: 260,
      easing: Easing.out(Easing.poly(4)),
      useNativeDriver: false,
    }).start();
  }

  async function handleRegister() {
    if (!firstName.trim() || !lastName.trim()) {
      setError('First and last name are required.');
      return;
    }
    if (!email.trim() || !password.trim()) {
      setError('Email and password are required.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (!phone.trim()) {
      setError('Phone number is required.');
      return;
    }
    if (!salonName.trim()) {
      setError('Salon name is required.');
      return;
    }

    setIsLoading(true);
    setError('');
    const result = await registerSalonOwner({
      email: email.trim().toLowerCase(),
      password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      salonName: salonName.trim(),
    });

    if (result.error) {
      setError(result.error);
      setIsLoading(false);
      return;
    }
    if (result.data) {
      setUser(result.data);
    }
    setIsLoading(false);
  }

  async function handleLogin() {
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setError('Email and password are required.');
      return;
    }

    setIsLoading(true);
    setError('');
    const result = await loginSalonOwner(
      loginEmail.trim().toLowerCase(),
      loginPassword,
    );

    if (result.error) {
      setError(result.error);
      setIsLoading(false);
      return;
    }
    if (result.data) {
      setUser(result.data);
    }
    setIsLoading(false);
  }

  const canSubmitRegister =
    firstName.trim() && lastName.trim() && email.trim() &&
    password.length >= 8 && phone.trim() && salonName.trim() && !isLoading;

  const canSubmitLogin =
    loginEmail.trim() && loginPassword.trim() && !isLoading;

  const canSubmit = tab === 'register' ? canSubmitRegister : canSubmitLogin;
  const handleSubmit = tab === 'register' ? handleRegister : handleLogin;

  return (
    <View style={styles.root}>
      <StatusBar backgroundColor="transparent" translucent barStyle="light-content" />
      <LinearGradient colors={HERO_GRADIENT} locations={[0, 0.3, 0.65, 1]} style={StyleSheet.absoluteFill} />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <SafeAreaView edges={['top']} style={styles.heroSafe}>
        <Animated.View style={[styles.heroContent, { opacity: heroOpacity }]}>
          {/* Back button */}
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          <Animated.View style={{ transform: [{ scale: iconScale }] }}>
            <View style={styles.logoRing}>
              <View style={styles.logoInner}>
                <Text style={styles.logoEmoji}>💼</Text>
              </View>
            </View>
          </Animated.View>

          <Text style={styles.appName}>Salon Owner</Text>
          <Text style={styles.tagline}>Register your salon & grow your business</Text>
        </Animated.View>
      </SafeAreaView>

      {/* ── Bottom Card ─────────────────────────────────────────────── */}
      <KeyboardAvoidingView
        style={styles.kavFlex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Animated.View
          style={[
            styles.card,
            { opacity: cardOpacity, transform: [{ translateY: cardSlide }] },
          ]}>
          <ScrollView
            contentContainerStyle={styles.cardContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>

            {/* ── Tab Toggle ───────────────────────────────────────── */}
            <View style={styles.toggleWrapper}>
              <Animated.View
                style={[styles.toggleIndicator, { left: Animated.add(indicatorX, TOGGLE_PADDING) }]}
              />
              <TouchableOpacity
                style={styles.toggleBtn}
                onPress={() => handleTabSwitch('register')}
                activeOpacity={0.85}>
                <Text style={[styles.toggleLabel, tab === 'register' && styles.toggleLabelActive]}>
                  Register
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.toggleBtn}
                onPress={() => handleTabSwitch('login')}
                activeOpacity={0.85}>
                <Text style={[styles.toggleLabel, tab === 'login' && styles.toggleLabelActive]}>
                  Login
                </Text>
              </TouchableOpacity>
            </View>

            {/* ── Register Form ────────────────────────────────────── */}
            {tab === 'register' && (
              <View style={styles.formSection}>
                <View style={styles.row}>
                  <View style={styles.halfField}>
                    <Text style={styles.inputLabel}>FIRST NAME</Text>
                    <TextInput
                      style={styles.textInput}
                      value={firstName}
                      onChangeText={setFirstName}
                      placeholder="John"
                      placeholderTextColor={Colors.textTertiary}
                      autoCapitalize="words"
                    />
                  </View>
                  <View style={styles.halfField}>
                    <Text style={styles.inputLabel}>LAST NAME</Text>
                    <TextInput
                      style={styles.textInput}
                      value={lastName}
                      onChangeText={setLastName}
                      placeholder="Doe"
                      placeholderTextColor={Colors.textTertiary}
                      autoCapitalize="words"
                    />
                  </View>
                </View>

                <Text style={styles.inputLabel}>EMAIL</Text>
                <TextInput
                  style={styles.textInput}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="owner@example.com"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <Text style={styles.inputLabel}>PASSWORD</Text>
                <TextInput
                  style={styles.textInput}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Min 8 chars, upper/lower/number/special"
                  placeholderTextColor={Colors.textTertiary}
                  secureTextEntry
                />

                <Text style={styles.inputLabel}>PHONE NUMBER</Text>
                <TextInput
                  style={styles.textInput}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+91 9876543210"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="phone-pad"
                />

                <Text style={styles.inputLabel}>SALON NAME</Text>
                <TextInput
                  style={styles.textInput}
                  value={salonName}
                  onChangeText={setSalonName}
                  placeholder="e.g. Royal Cuts"
                  placeholderTextColor={Colors.textTertiary}
                  autoCapitalize="words"
                />

                <Text style={styles.noteText}>
                  💡 After registration, set up your salon details. An admin will review and approve your salon before it goes live.
                </Text>
              </View>
            )}

            {/* ── Login Form ──────────────────────────────────────── */}
            {tab === 'login' && (
              <View style={styles.formSection}>
                <Text style={styles.inputLabel}>EMAIL</Text>
                <TextInput
                  style={styles.textInput}
                  value={loginEmail}
                  onChangeText={setLoginEmail}
                  placeholder="owner@example.com"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <Text style={styles.inputLabel}>PASSWORD</Text>
                <TextInput
                  style={styles.textInput}
                  value={loginPassword}
                  onChangeText={setLoginPassword}
                  placeholder="Your password"
                  placeholderTextColor={Colors.textTertiary}
                  secureTextEntry
                />
              </View>
            )}

            {/* ── Error ──────────────────────────────────────────── */}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {/* ── Submit CTA ────────────────────────────────────── */}
            <TouchableOpacity
              style={[styles.cta, !canSubmit && styles.ctaDisabled]}
              onPress={handleSubmit}
              disabled={!canSubmit}
              activeOpacity={0.85}>
              <LinearGradient
                colors={canSubmit ? CTA_GRADIENT : CTA_DISABLED}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.ctaGradient}>
                {isLoading
                  ? <ActivityIndicator color={Colors.white} size="small" />
                  : <Text style={styles.ctaText}>
                      {tab === 'register' ? 'Create Account  →' : 'Login  →'}
                    </Text>
                }
              </LinearGradient>
            </TouchableOpacity>

            <Text style={styles.footer}>
              By continuing you agree to our{' '}
              <Text style={styles.footerLink}>Terms</Text>
              {' '}&amp;{' '}
              <Text style={styles.footerLink}>Privacy Policy</Text>
            </Text>

          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0D0000' },

  // Hero
  heroSafe: { flex: 1.4 },
  heroContent: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  backBtn: {
    position: 'absolute',
    top: 0,
    left: Spacing[4],
    paddingVertical: Spacing[2],
    paddingHorizontal: Spacing[2],
  },
  backText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
  },

  logoRing: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginBottom: Spacing[4],
  },
  logoInner: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoEmoji: { fontSize: 34 },

  appName: {
    fontSize: Typography['3xl'],
    fontWeight: Typography.black,
    color: Colors.white,
    letterSpacing: 2,
    textAlign: 'center',
  },
  tagline: {
    fontSize: Typography.sm,
    color: 'rgba(255,255,255,0.65)',
    marginTop: Spacing[2],
    fontWeight: Typography.medium,
    letterSpacing: 0.6,
    textAlign: 'center',
  },

  // Card
  kavFlex: { flex: 3.6 },
  card: {
    flex: 1,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    ...Shadow.xl,
  },
  cardContent: {
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[6],
    paddingBottom: Spacing[10],
  },

  // Toggle
  toggleWrapper: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: Radius.xl,
    height: 48,
    marginBottom: Spacing[5],
    position: 'relative',
  },
  toggleIndicator: {
    position: 'absolute',
    top: TOGGLE_PADDING,
    bottom: TOGGLE_PADDING,
    width: INDICATOR_WIDTH - TOGGLE_PADDING * 2,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    ...Shadow.sm,
  },
  toggleBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  toggleLabel: {
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
    color: Colors.textTertiary,
  },
  toggleLabelActive: { color: '#3949AB' },

  // Form
  formSection: { marginBottom: Spacing[3] },
  row: { flexDirection: 'row', gap: Spacing[3] },
  halfField: { flex: 1 },

  inputLabel: {
    fontSize: 10,
    fontWeight: Typography.bold,
    color: Colors.textTertiary,
    letterSpacing: 1.5,
    marginBottom: Spacing[1],
    marginTop: Spacing[3],
  },
  textInput: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing[4],
    paddingVertical: 14,
    fontSize: Typography.base,
    fontWeight: Typography.medium,
    color: Colors.textPrimary,
    backgroundColor: Colors.white,
  },

  noteText: {
    marginTop: Spacing[4],
    fontSize: Typography.xs,
    color: Colors.textTertiary,
    lineHeight: 18,
    textAlign: 'center',
  },

  errorText: {
    color: Colors.error,
    fontSize: Typography.xs,
    marginBottom: Spacing[3],
    fontWeight: Typography.medium,
    textAlign: 'center',
  },

  // CTA
  cta: { marginTop: Spacing[3], borderRadius: Radius.xl, overflow: 'hidden', ...Shadow.lg },
  ctaDisabled: { opacity: 0.55 },
  ctaGradient: { paddingVertical: 18, alignItems: 'center', justifyContent: 'center' },
  ctaText: {
    fontSize: Typography.lg,
    fontWeight: Typography.black,
    color: Colors.white,
    letterSpacing: 0.8,
  },

  // Footer
  footer: {
    textAlign: 'center',
    color: Colors.textTertiary,
    fontSize: Typography.xs,
    marginTop: Spacing[5],
    lineHeight: 20,
  },
  footerLink: {
    color: '#3949AB',
    fontWeight: Typography.semibold,
  },
});
