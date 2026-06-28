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
import type { AuthStackParamList, UserRole } from '../../types';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../constants/theme';
import { Strings } from '../../constants/strings';
import { requestOTP } from '../../services/auth/auth.service';
import { useAuthStore } from '../../store/authStore';
import { API_BASE_URL } from '../../services/api/client';

type NavProp = NativeStackNavigationProp<AuthStackParamList, 'Email'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TOGGLE_PADDING = 4;
const TOGGLE_INNER_WIDTH = SCREEN_WIDTH - Spacing[5] * 2 - TOGGLE_PADDING * 2;
const INDICATOR_WIDTH = TOGGLE_INNER_WIDTH / 2;

// ─── Gradient palette ────────────────────────────────────────────────────────
const HERO_GRADIENT = ['#0D0000', '#5C0000', '#B71C1C', '#D32F2F'];
const CTA_GRADIENT  = ['#EF5350', '#D32F2F', '#B71C1C'];
const CTA_DISABLED  = ['#BDBDBD', '#9E9E9E'];

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function EmailScreen() {
  const navigation = useNavigation<NavProp>();
  const { setUser } = useAuthStore();
  
  const [email, setEmail]       = useState('');
  const [role, setRole]         = useState<UserRole>('customer');
  const [error, setError]       = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // ── Entrance animations ───────────────────────────────────────────────────
  const logoScale  = useRef(new Animated.Value(0)).current;
  const logoSlide  = useRef(new Animated.Value(-24)).current;
  const heroOpacity = useRef(new Animated.Value(0)).current;
  const cardSlide  = useRef(new Animated.Value(80)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  // Continuous float
  const logoFloat  = useRef(new Animated.Value(0)).current;
  // Role indicator position (left offset)
  const indicatorX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Staggered entrance
    Animated.parallel([
      Animated.timing(heroOpacity, {
        toValue: 1, duration: 500, useNativeDriver: true,
      }),
      Animated.timing(logoScale, {
        toValue: 1, duration: 700, delay: 150,
        easing: Easing.out(Easing.back(1.3)), useNativeDriver: true,
      }),
      Animated.timing(logoSlide, {
        toValue: 0, duration: 600, delay: 150,
        easing: Easing.out(Easing.poly(4)), useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1, duration: 500, delay: 350, useNativeDriver: true,
      }),
      Animated.timing(cardSlide, {
        toValue: 0, duration: 650, delay: 300,
        easing: Easing.out(Easing.poly(4)), useNativeDriver: true,
      }),
    ]).start();

    // Gentle floating loop on logo
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoFloat, {
          toValue: -9, duration: 2000,
          easing: Easing.inOut(Easing.sin), useNativeDriver: true,
        }),
        Animated.timing(logoFloat, {
          toValue: 0, duration: 2000,
          easing: Easing.inOut(Easing.sin), useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);


  // ── Handlers ──────────────────────────────────────────────────────────────
  function handleRoleSwitch(newRole: UserRole) {
    setRole(newRole);
    Animated.timing(indicatorX, {
      toValue: newRole === 'customer' ? 0 : INDICATOR_WIDTH,
      duration: 260,
      easing: Easing.out(Easing.poly(4)),
      useNativeDriver: false,
    }).start();
  }

  function handleEmailChange(text: string) {
    setEmail(text.trim());
    if (error) setError('');
  }

  async function handleContinue() {
    // If owner role is selected, navigate to owner register/login screen
    if (role === 'owner') {
      navigation.navigate('OwnerAuth' as any);
      return;
    }

    const cleaned = email.trim().toLowerCase();
    if (!emailRegex.test(cleaned)) {
      setError('Please enter a valid email address.');
      return;
    }
    
    setIsLoading(true);
    setError('');
    try {
      const result = await requestOTP(cleaned);
      if (result.error) {
        setError(result.error);
        return;
      }
      navigation.navigate('OTP', {
        email: cleaned,
        verificationId: 'native',
        role,
      });
    } catch {
      setError(Strings.errors.generic);
    } finally {
      setIsLoading(false);
    }
  }

  const isOwnerMode = role === 'owner';
  const canSubmit = isOwnerMode ? !isLoading : (emailRegex.test(email) && !isLoading);

  return (
    <View style={styles.root}>
      <StatusBar backgroundColor="transparent" translucent barStyle="light-content" />

      {/* Full-screen gradient */}
      <LinearGradient colors={HERO_GRADIENT} locations={[0, 0.3, 0.65, 1]} style={StyleSheet.absoluteFill} />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <SafeAreaView edges={['top']} style={styles.heroSafe}>
        <Animated.View
          style={[
            styles.heroContent,
            { opacity: heroOpacity },
          ]}>

          {/* Floating logo */}
          <Animated.View
            style={{
              transform: [
                { scale: logoScale },
                { translateY: Animated.add(logoSlide, logoFloat) },
              ],
            }}>
            <View style={styles.logoRing}>
              <View style={styles.logoInner}>
                <Text style={styles.logoEmoji}>✂️</Text>
              </View>
            </View>
          </Animated.View>

          <Text style={styles.appName}>{Strings.app.name}</Text>
          <Text style={styles.tagline}>{Strings.app.tagline}</Text>
        </Animated.View>
      </SafeAreaView>

      {/* ── Bottom Card ──────────────────────────────────────────────────── */}
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

            <Text style={styles.cardTitle}>Welcome</Text>
            <Text style={styles.cardSubtitle}>Sign in with email or Google</Text>

            {/* ── Role Toggle ─────────────────────────────────────────── */}
            <View style={styles.toggleWrapper}>
              {/* Sliding white pill */}
              <Animated.View
                style={[styles.toggleIndicator, { left: Animated.add(indicatorX, TOGGLE_PADDING) }]}
              />
              <TouchableOpacity
                style={styles.toggleBtn}
                onPress={() => handleRoleSwitch('customer')}
                activeOpacity={0.85}>
                <Text style={styles.toggleEmoji}>💇</Text>
                <Text style={[styles.toggleLabel, role === 'customer' && styles.toggleLabelActive]}>
                  Customer
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.toggleBtn}
                onPress={() => handleRoleSwitch('owner')}
                activeOpacity={0.85}>
                <Text style={styles.toggleEmoji}>💼</Text>
                <Text style={[styles.toggleLabel, role === 'owner' && styles.toggleLabelActive]}>
                  Salon Owner
                </Text>
              </TouchableOpacity>
            </View>

            {/* ── Email Input (hidden for owner mode) ─────────────────── */}
            {!isOwnerMode && (
              <>
                <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
                <View
                  style={[
                    styles.inputRow,
                    isFocused && styles.inputRowFocused,
                    !!error   && styles.inputRowError,
                  ]}>
                  <View style={styles.prefix}>
                    <Text style={styles.prefixEmoji}>✉️</Text>
                  </View>
                  <View style={styles.prefixDivider} />
                  <TextInput
                    style={styles.emailInput}
                    value={email}
                    onChangeText={handleEmailChange}
                    placeholder="example@email.com"
                    placeholderTextColor={Colors.textTertiary}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={handleContinue}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                  />
                  {emailRegex.test(email) && (
                    <View style={styles.checkBadge}>
                      <Text style={styles.checkMark}>✓</Text>
                    </View>
                  )}
                </View>
              </>
            )}

            {error
              ? <Text style={styles.errorText}>{error}</Text>
              : !isOwnerMode
                ? <Text style={styles.hintText}>We'll send a 6-digit OTP code to verify</Text>
                : <Text style={styles.hintText}>Register or log in with your salon owner credentials</Text>
            }

            {/* ── OTP Button ──────────────────────────────────────────── */}
            <TouchableOpacity
              style={[styles.cta, !canSubmit && styles.ctaDisabled]}
              onPress={handleContinue}
              disabled={!canSubmit}
              activeOpacity={0.85}>
              <LinearGradient
                colors={canSubmit ? CTA_GRADIENT : CTA_DISABLED}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.ctaGradient}>
                {isLoading
                  ? <ActivityIndicator color={Colors.white} size="small" />
                  : <Text style={styles.ctaText}>{isOwnerMode ? 'Continue  →' : 'Get OTP  →'}</Text>
                }
              </LinearGradient>
            </TouchableOpacity>



            {/* Footer */}
            <Text style={styles.footer}>
              By continuing you agree to our{' '}
              <Text style={styles.footerLink}>Terms</Text>
              {' '}&amp;{' '}
              <Text style={styles.footerLink}>Privacy Policy</Text>
            </Text>

            {/* Debug API Base URL */}
            <Text style={{ textAlign: 'center', fontSize: 11, color: 'rgba(210, 0, 0, 0.4)', marginTop: 24 }}>
              Backend: {API_BASE_URL}
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
  heroSafe: { flex: 2 },
  heroContent: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  logoRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginBottom: Spacing[5],
  },
  logoInner: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoEmoji: { fontSize: 38 },

  appName: {
    fontSize: Typography['4xl'],
    fontWeight: Typography.black,
    color: Colors.white,
    letterSpacing: 3,
    textAlign: 'center',
  },
  tagline: {
    fontSize: Typography.sm,
    color: 'rgba(255,255,255,0.65)',
    marginTop: Spacing[2],
    fontWeight: Typography.medium,
    letterSpacing: 0.8,
    textAlign: 'center',
  },

  // Card
  kavFlex: { flex: 3 },
  card: {
    flex: 1,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    ...Shadow.xl,
  },
  cardContent: {
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[7],
    paddingBottom: Spacing[10],
  },
  cardTitle: {
    fontSize: Typography['3xl'],
    fontWeight: Typography.black,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  cardSubtitle: {
    fontSize: Typography.base,
    color: Colors.textTertiary,
    marginTop: Spacing[1],
    marginBottom: Spacing[6],
  },

  // Role toggle
  toggleWrapper: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: Radius.xl,
    height: 52,
    marginBottom: Spacing[6],
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    zIndex: 1,
  },
  toggleEmoji: { fontSize: 17 },
  toggleLabel: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
    color: Colors.textTertiary,
  },
  toggleLabelActive: { color: Colors.navigationRed },

  // Input
  inputLabel: {
    fontSize: 10,
    fontWeight: Typography.bold,
    color: Colors.textTertiary,
    letterSpacing: 1.5,
    marginBottom: Spacing[2],
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.xl,
    backgroundColor: Colors.white,
    minHeight: 60,
    ...Shadow.sm,
  },
  inputRowFocused: { borderColor: Colors.navigationRed, ...Shadow.md },
  inputRowError:   { borderColor: Colors.error },
  prefix: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
  },
  prefixEmoji: { fontSize: 20 },
  prefixDivider: { width: 1.5, height: 32, backgroundColor: Colors.borderLight },
  emailInput: {
    flex: 1,
    paddingHorizontal: Spacing[4],
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.textPrimary,
  },
  checkBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing[3],
  },
  checkMark: { color: Colors.white, fontSize: 13, fontWeight: Typography.bold },

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
    letterSpacing: 0.2,
  },

  // CTA
  cta: { marginTop: Spacing[6], borderRadius: Radius.xl, overflow: 'hidden', ...Shadow.lg },
  ctaDisabled: { opacity: 0.55 },
  ctaGradient: { paddingVertical: 18, alignItems: 'center', justifyContent: 'center' },
  ctaText: {
    fontSize: Typography.lg,
    fontWeight: Typography.black,
    color: Colors.white,
    letterSpacing: 0.8,
  },

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing[5],
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.borderLight,
  },
  dividerText: {
    marginHorizontal: Spacing[4],
    color: Colors.textTertiary,
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
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
    color: Colors.navigationRed,
    fontWeight: Typography.semibold,
  },
});
