/**
 * TrimCity — OTP Verification Screen
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { OtpInput } from 'react-native-otp-entry';
import type { AuthStackParamList } from '../../types';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';
import { Button } from '../../components/ui/Button';
import { Strings } from '../../constants/strings';
import { verifyOTP } from '../../services/firebase/auth.service';
import { useAuthStore } from '../../store/authStore';
import { sanitizeOTP } from '../../services/security/sanitizer';
import { validateOTP } from '../../services/security/validator';

type NavProp = NativeStackNavigationProp<AuthStackParamList, 'OTP'>;
type RoutePropType = RouteProp<AuthStackParamList, 'OTP'>;

const RESEND_TIMEOUT = 30;

export function OTPScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const { phone, verificationId, role } = route.params;

  const { setUser, setLoading } = useAuthStore();
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendTimer, setResendTimer] = useState(RESEND_TIMEOUT);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Countdown timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setResendTimer(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, []);

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

    if (result.data) {
      setUser(result.data);
      // Navigation is handled by RootNavigator based on auth state
    }
    setIsVerifying(false);
  }

  function handleResend() {
    // Re-trigger OTP send — go back to phone screen
    navigation.goBack();
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        backgroundColor={Colors.navigationRedDark}
        barStyle="light-content"
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">

          {/* Illustration */}
          <View style={styles.illustrationContainer}>
            <Text style={styles.illustrationEmoji}>📱</Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>{Strings.auth.otpTitle}</Text>
          <Text style={styles.subtitle}>{Strings.auth.otpSubtitle(phone)}</Text>

          {/* OTP Input */}
          <View style={styles.otpContainer}>
            <OtpInput
              numberOfDigits={6}
              onTextChange={setOtp}
              onFilled={handleVerify}
              focusColor={Colors.navigationRed}
              theme={{
                containerStyle: styles.otpRow,
                inputsContainerStyle: styles.otpInputsRow,
                pinCodeContainerStyle: styles.otpBox,
                pinCodeTextStyle: styles.otpText,
                focusedPinCodeContainerStyle: styles.otpBoxFocused,
              }}
            />
          </View>

          {/* Error */}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* Verify Button */}
          <Button
            title={Strings.auth.verifyOtp}
            onPress={() => handleVerify()}
            isLoading={isVerifying}
            disabled={otp.length !== 6}
            fullWidth
            size="lg"
            style={styles.button}
          />

          {/* Resend */}
          <View style={styles.resendRow}>
            {resendTimer > 0 ? (
              <Text style={styles.resendTimer}>
                {Strings.auth.resendIn(resendTimer)}
              </Text>
            ) : (
              <TouchableOpacity onPress={handleResend} activeOpacity={0.8}>
                <Text style={styles.resendLink}>{Strings.auth.resendOtp}</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.changeNumber}
            activeOpacity={0.8}>
            <Text style={styles.changeNumberText}>{Strings.auth.changeNumber}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.white },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: Spacing[6], paddingTop: Spacing[8] },

  illustrationContainer: {
    alignSelf: 'center',
    width: 100,
    height: 100,
    backgroundColor: Colors.navigationRedSurface,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[5],
  },
  illustrationEmoji: { fontSize: 50 },

  title: {
    fontSize: Typography['3xl'],
    fontWeight: Typography.black,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing[2],
  },
  subtitle: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing[8],
    fontWeight: Typography.medium,
  },

  otpContainer: { marginBottom: Spacing[4] },
  otpRow: {},
  otpInputsRow: { justifyContent: 'center', gap: Spacing[2] },
  otpBox: {
    width: 48,
    height: 56,
    borderRadius: Radius.md,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceMuted,
  },
  otpBoxFocused: { borderColor: Colors.navigationRed },
  otpText: {
    fontSize: Typography.xl,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },

  errorText: {
    color: Colors.error,
    fontSize: Typography.sm,
    textAlign: 'center',
    marginBottom: Spacing[3],
    fontWeight: Typography.medium,
  },

  button: { marginBottom: Spacing[5] },

  resendRow: {
    alignItems: 'center',
    marginBottom: Spacing[3],
  },
  resendTimer: {
    fontSize: Typography.sm,
    color: Colors.textTertiary,
    fontWeight: Typography.medium,
  },
  resendLink: {
    fontSize: Typography.sm,
    color: Colors.navigationRed,
    fontWeight: Typography.bold,
  },
  changeNumber: { alignItems: 'center', paddingVertical: Spacing[3] },
  changeNumberText: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.medium,
    textDecorationLine: 'underline',
  },
});
