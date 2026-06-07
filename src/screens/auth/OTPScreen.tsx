/**
 * TrimCity — OTP Verification Screen
 * Premium animated UI — pulsing rings hero + slide-up white card
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { OtpInput } from 'react-native-otp-entry';
import type { AuthStackParamList } from '../../types';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../constants/theme';
import { verifyOTP } from '../../services/firebase/auth.service';
import { useAuthStore } from '../../store/authStore';
import { sanitizeOTP } from '../../services/security/sanitizer';
import { validateOTP } from '../../services/security/validator';

type NavProp      = NativeStackNavigationProp<AuthStackParamList, 'OTP'>;
type RoutePropType = RouteProp<AuthStackParamList, 'OTP'>;

const RESEND_TIMEOUT = 30;
const HERO_GRADIENT  = ['#0D0000', '#5C0000', '#B71C1C', '#D32F2F'] as const;
const CTA_GRADIENT   = ['#EF5350', '#D32F2F', '#B71C1C'] as const;
const CTA_DISABLED   = ['#BDBDBD', '#9E9E9E'] as const;

export function OTPScreen() {
  const navigation = useNavigation<NavProp>();
  const route      = useRoute<RoutePropType>();
  const { phone, verificationId, role } = route.params;

  const { setUser } = useAuthStore();

  const [otp, setOtp]               = useState('');
  const [error, setError]           = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendTimer, setResendTimer] = useState(RESEND_TIMEOUT);

  // ── Entrance animations ───────────────────────────────────────────────────
  const heroOpacity  = useRef(new Animated.Value(0)).current;
  const heroSlide    = useRef(new Animated.Value(-20)).current;
  const cardOpacity  = useRef(new Animated.Value(0)).current;
  const cardSlide    = useRef(new Animated.Value(80)).current;

  // Pulse ring 1 & 2
  const ring1Scale   = useRef(new Animated.Value(1)).current;
  const ring1Opacity = useRef(new Animated.Value(0.6)).current;
  const ring2Scale   = useRef(new Animated.Value(1)).current;
  const ring2Opacity = useRef(new Animated.Value(0.4)).current;

  // Icon bounce
  const iconScale    = useRef(new Animated.Value(0)).current;

  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Entrance
    Animated.parallel([
      Animated.timing(heroOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(heroSlide, {
        toValue: 0, duration: 600, delay: 100,
        easing: Easing.out(Easing.poly(4)), useNativeDriver: true,
      }),
      Animated.timing(iconScale, {
        toValue: 1, duration: 700, delay: 200,
        easing: Easing.out(Easing.back(1.4)), useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, { toValue: 1, duration: 500, delay: 350, useNativeDriver: true }),
      Animated.timing(cardSlide, {
        toValue: 0, duration: 650, delay: 300,
        easing: Easing.out(Easing.poly(4)), useNativeDriver: true,
      }),
    ]).start();

    // Pulsing rings
    const pulse = (scale: Animated.Value, opacity: Animated.Value, delayMs: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delayMs),
          Animated.parallel([
            Animated.timing(scale, {
              toValue: 2.2, duration: 1800,
              easing: Easing.out(Easing.quad), useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0, duration: 1800, useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(scale,   { toValue: 1, duration: 0, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0.6, duration: 0, useNativeDriver: true }),
          ]),
        ]),
      );

    const p1 = pulse(ring1Scale, ring1Opacity, 0);
    const p2 = pulse(ring2Scale, ring2Opacity, 900);
    p1.start();
    p2.start();

    // Resend countdown
    timerRef.current = setInterval(() => {
      setResendTimer(prev => {
        if (prev <= 1) { clearInterval(timerRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timerRef.current!);
      p1.stop();
      p2.stop();
    };
  // Animated.Value refs are stable across renders — safe to omit from deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────
  async function handleVerify(code?: string) {
    const otpCode = sanitizeOTP(code ?? otp);
    if (!validateOTP(otpCode)) {
      setError('Please enter a valid 6-digit OTP.');
      return;
    }
    setIsVerifying(true);
    setError('');

    const result = await verifyOTP(verificationId, otpCode, role);
    if (result.error) {
      setError(result.error);
      setIsVerifying(false);
      return;
    }
    if (result.data) { setUser(result.data); }
    setIsVerifying(false);
  }

  function handleResend() {
    // Going back triggers PhoneScreen → user taps "Get OTP" again → new sendOTP call
    navigation.goBack();
  }

  // Format "+91 98765 43210"
  const formattedPhone = `+91 ${phone.substring(0, 5)} ${phone.substring(5)}`;
  const canSubmit = otp.length === 6 && !isVerifying;

  return (
    <View style={styles.root}>
      <StatusBar backgroundColor="transparent" translucent barStyle="light-content" />

      {/* Full-screen gradient */}
      <LinearGradient colors={HERO_GRADIENT} locations={[0, 0.3, 0.65, 1]} style={StyleSheet.absoluteFill} />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <SafeAreaView edges={['top']} style={styles.heroSafe}>
        <Animated.View
          style={[styles.heroContent, { opacity: heroOpacity, transform: [{ translateY: heroSlide }] }]}>

          {/* Custom back */}
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Text style={styles.backText}>← Change number</Text>
          </TouchableOpacity>

          {/* Pulsing icon */}
          <View style={styles.iconWrapper}>
            <Animated.View style={[styles.ring, { transform: [{ scale: ring1Scale }], opacity: ring1Opacity }]} />
            <Animated.View style={[styles.ring, styles.ring2, { transform: [{ scale: ring2Scale }], opacity: ring2Opacity }]} />
            <Animated.View style={[styles.iconCircle, { transform: [{ scale: iconScale }] }]}>
              <Text style={styles.iconEmoji}>📱</Text>
            </Animated.View>
          </View>

          <Text style={styles.heroTitle}>OTP Sent!</Text>
          <Text style={styles.heroSub}>
            Sent to <Text style={styles.phoneBold}>{formattedPhone}</Text>
          </Text>
        </Animated.View>
      </SafeAreaView>

      {/* ── Bottom Card ──────────────────────────────────────────────────── */}
      <KeyboardAvoidingView
        style={styles.kavFlex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Animated.View
          style={[styles.card, { opacity: cardOpacity, transform: [{ translateY: cardSlide }] }]}>
          <ScrollView
            contentContainerStyle={styles.cardContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>

            <Text style={styles.cardTitle}>Verify your number</Text>
            <Text style={styles.cardSubtitle}>Enter the 6-digit code below</Text>

            {/* ── OTP Boxes ───────────────────────────────────────────── */}
            <View style={styles.otpWrapper}>
              <OtpInput
                numberOfDigits={6}
                onTextChange={setOtp}
                onFilled={handleVerify}
                focusColor={Colors.navigationRed}
                theme={{
                  containerStyle:          styles.otpContainer,
                  inputsContainerStyle:    styles.otpInputsRow,
                  pinCodeContainerStyle:   styles.otpBox,
                  pinCodeTextStyle:        styles.otpText,
                  focusedPinCodeContainerStyle: styles.otpBoxFocused,
                }}
              />
            </View>

            {/* ── Error banner ────────────────────────────────────────── */}
            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>⚠️  {error}</Text>
              </View>
            ) : null}

            {/* ── Verify CTA ──────────────────────────────────────────── */}
            <TouchableOpacity
              style={[styles.cta, !canSubmit && styles.ctaDisabled]}
              onPress={() => handleVerify()}
              disabled={!canSubmit}
              activeOpacity={0.85}>
              <LinearGradient
                colors={canSubmit ? CTA_GRADIENT : CTA_DISABLED}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.ctaGradient}>
                {isVerifying
                  ? <ActivityIndicator color={Colors.white} size="small" />
                  : <Text style={styles.ctaText}>Verify  ✓</Text>
                }
              </LinearGradient>
            </TouchableOpacity>

            {/* ── Resend ──────────────────────────────────────────────── */}
            <View style={styles.resendRow}>
              <Text style={styles.resendPrefix}>Didn't receive it?  </Text>
              {resendTimer > 0 ? (
                <View style={styles.timerChip}>
                  <Text style={styles.timerText}>Resend in {resendTimer}s</Text>
                </View>
              ) : (
                <TouchableOpacity onPress={handleResend} activeOpacity={0.8}>
                  <Text style={styles.resendLink}>Resend OTP</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Security note */}
            <Text style={styles.secNote}>🔒  This code expires in 10 minutes</Text>

          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0D0000' },

  // Hero
  heroSafe:    { flex: 2 },
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

  // Pulse icon
  iconWrapper: {
    width: 110,
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[5],
  },
  ring: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  ring2: { borderColor: 'rgba(255,255,255,0.25)' },
  iconCircle: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: { fontSize: 38 },

  heroTitle: {
    fontSize: Typography['3xl'],
    fontWeight: Typography.black,
    color: Colors.white,
    letterSpacing: -0.3,
  },
  heroSub: {
    fontSize: Typography.base,
    color: 'rgba(255,255,255,0.7)',
    marginTop: Spacing[2],
    fontWeight: Typography.medium,
  },
  phoneBold: { color: Colors.white, fontWeight: Typography.bold },

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

  // OTP
  otpWrapper:      { marginBottom: Spacing[5] },
  otpContainer:    {},
  otpInputsRow:    { justifyContent: 'space-between' },
  otpBox: {
    width: 48,
    height: 60,
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceMuted,
    ...Shadow.sm,
  },
  otpBoxFocused: {
    borderColor: Colors.navigationRed,
    backgroundColor: Colors.navigationRedSurface,
    ...Shadow.md,
  },
  otpText: {
    fontSize: Typography['2xl'],
    fontWeight: Typography.black,
    color: Colors.navigationRed,
  },

  // Error
  errorBanner: {
    backgroundColor: '#FFF3F3',
    borderRadius: Radius.lg,
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[4],
    marginBottom: Spacing[4],
    borderWidth: 1,
    borderColor: Colors.errorLight,
  },
  errorBannerText: {
    color: Colors.error,
    fontSize: Typography.sm,
    fontWeight: Typography.medium,
  },

  // CTA
  cta:        { borderRadius: Radius.xl, overflow: 'hidden', ...Shadow.lg, marginBottom: Spacing[5] },
  ctaDisabled: { opacity: 0.55 },
  ctaGradient: { paddingVertical: 18, alignItems: 'center', justifyContent: 'center' },
  ctaText: {
    fontSize: Typography.lg,
    fontWeight: Typography.black,
    color: Colors.white,
    letterSpacing: 0.8,
  },

  // Resend
  resendRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing[4] },
  resendPrefix: { fontSize: Typography.sm, color: Colors.textTertiary },
  timerChip: {
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing[3],
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  timerText: { fontSize: Typography.xs, color: Colors.textSecondary, fontWeight: Typography.semibold },
  resendLink: {
    fontSize: Typography.sm,
    color: Colors.navigationRed,
    fontWeight: Typography.bold,
    textDecorationLine: 'underline',
  },

  // Security note
  secNote: {
    textAlign: 'center',
    fontSize: Typography.xs,
    color: Colors.textTertiary,
    letterSpacing: 0.3,
  },
});
