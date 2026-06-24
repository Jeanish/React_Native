import axios from 'axios';
import { logger } from '../utils/logger';
import { env, isDevelopment } from '../config/environment';

export interface SmsSendResult {
  success: boolean;
  provider?: string;
  messageId?: string;
}

/**
 * Send OTP via SMS.
 *
 * Development: prints the OTP to the server console (zero cost).
 * Production:  calls Fast2SMS (free trial credits for India, ₹0.15/SMS after).
 *
 * To swap providers, replace the production branch with any SMS API.
 */
export async function sendOtpSms(phone: string, otp: string): Promise<SmsSendResult> {
  const fullPhone = phone.startsWith('+') ? phone : `+91${phone}`;
  const tenDigit = phone.replace(/^\+91/, '').replace(/^\+/, '');

  if (isDevelopment) {
    logger.info('');
    logger.info('════════════════════════════════════════');
    logger.info(`  OTP for ${fullPhone}  →  ${otp}`);
    logger.info('════════════════════════════════════════');
    logger.info('');
    return { success: true, provider: 'console' };
  }

  const apiKey = env.SMS_API_KEY;

  if (!apiKey) {
    logger.warn('[SMS] No SMS_API_KEY configured — logging OTP to console instead');
    logger.info(`[SMS-FALLBACK] OTP for ${fullPhone} → ${otp}`);
    return { success: true, provider: 'console-fallback' };
  }

  try {
    const res = await axios.post(
      'https://www.fast2sms.com/dev/bulkV2',
      null,
      {
        params: {
          authorization: apiKey,
          message: `Your TrimCity OTP is ${otp}. Valid for 10 minutes.`,
          language: 'english',
          route: 'q',
          numbers: tenDigit,
        },
        headers: { 'Cache-Control': 'no-cache' },
        timeout: 10000,
      },
    );

    const ok = res.data?.return === true || res.status === 200;
    logger.info(`[SMS] Sent to ${fullPhone} — ${ok ? 'OK' : 'FAIL'}`);
    return { success: ok, provider: 'fast2sms', messageId: res.data?.request_id };
  } catch (err: any) {
    logger.error('[SMS] Send failed:', err.message);
    logger.info(`[SMS-FALLBACK] OTP for ${fullPhone} → ${otp}`);
    return { success: false, provider: 'fast2sms' };
  }
}

export default { sendOtpSms };
