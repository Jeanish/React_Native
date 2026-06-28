import nodemailer from 'nodemailer';
import { env, isDevelopment } from '../config/environment';
import { logger } from '../utils/logger';

export interface EmailSendResult {
  success: boolean;
  provider: string;
}

let transporter: nodemailer.Transporter | null = null;

// Initialize the Nodemailer SMTP transporter if config is provided
const getTransporter = (): nodemailer.Transporter | null => {
  if (transporter) return transporter;

  const smtpUser = env.SMTP_USER || process.env.SMTP_USER;
  const smtpPass = env.SMTP_PASS || process.env.SMTP_PASS;

  if (!smtpUser || !smtpPass) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(env.SMTP_PORT) || 587,
    secure: Number(env.SMTP_PORT) === 465, // True for port 465, false for 587
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  return transporter;
};

/**
 * Sends a 6-digit verification code to the customer's email.
 */
export async function sendOtpEmail(email: string, otp: string): Promise<EmailSendResult> {
  const cleanEmail = email.trim().toLowerCase();

  // If in development or SMTP is not configured, fallback to console logging
  const mailTransporter = getTransporter();

  if (!mailTransporter) {
    logger.info('');
    logger.info('════════════════════════════════════════════════════');
    logger.info(`  EMAIL OTP FOR: ${cleanEmail}  →  ${otp}`);
    if (!isDevelopment) {
      logger.warn('[EMAIL] SMTP credentials missing. Logged to console as fallback.');
    }
    logger.info('════════════════════════════════════════════════════');
    logger.info('');
    return { success: true, provider: 'console' };
  }

  // Log in console for local debugging but still send the email
  logger.info(`[Email-DEV] Sending SMTP OTP to ${cleanEmail} → ${otp}`);

  try {
    const fromEmail = env.SMTP_FROM_EMAIL || env.SMTP_USER || 'noreply@trimcity.com';
    
    const mailOptions = {
      from: `"TrimCity App" <${fromEmail}>`,
      to: cleanEmail,
      subject: 'Your TrimCity Verification OTP',
      text: `Your TrimCity verification OTP is ${otp}. It is valid for 10 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #D32F2F; text-align: center;">TrimCity Verification Code</h2>
          <p>Hello,</p>
          <p>Your one-time password (OTP) to sign in or register with TrimCity is:</p>
          <div style="background-color: #f9f9f9; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #D32F2F; border-radius: 4px; margin: 20px 0;">
            ${otp}
          </div>
          <p>This code is valid for 10 minutes and can only be used once.</p>
          <p>If you did not request this code, you can safely ignore this email.</p>
          <br/>
          <p>Best regards,<br/>The TrimCity Team</p>
        </div>
      `,
    };

    await mailTransporter.sendMail(mailOptions);
    logger.info(`[Email] OTP sent successfully to ${cleanEmail}`);
    return { success: true, provider: 'nodemailer' };
  } catch (err: any) {
    logger.error('[Email] Nodemailer send failed:', err.message);
    // Fallback to logging in console so development/beta testing doesn't break
    logger.info(`[Email-FALLBACK] OTP for ${cleanEmail} → ${otp}`);
    return { success: false, provider: 'console-fallback' };
  }
}

export default { sendOtpEmail };
