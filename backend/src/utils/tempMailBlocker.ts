import { logger } from './logger';

// List of popular temporary/disposable email domains to block
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'mailinator.com',
  'yopmail.com',
  'temp-mail.org',
  '10minutemail.com',
  'dispostable.com',
  'guerrillamail.com',
  'sharklasers.com',
  'guerrillamailblock.com',
  'guerrillamail.net',
  'guerrillamail.org',
  'guerrillamail.biz',
  'tempmail.net',
  'tempmailo.com',
  'maildrop.cc',
  'throwawaymail.com',
  'getairmail.com',
  'tempr.email',
  'mailnesia.com',
  'mailcatch.com',
  'generator.email',
  'emailfake.com',
  'fakeinbox.com',
  'trashmail.com',
  'mintemail.com',
  'mytrashmail.com',
  'spambox.us',
  'disposablemail.com',
  'mailmoat.com',
  'duck.com',
]);

/**
 * Checks if a given email address belongs to a disposable or temporary mail provider.
 */
export const isTempEmail = (email: string): boolean => {
  if (!email || typeof email !== 'string') return false;
  
  const cleanEmail = email.trim().toLowerCase();
  const domain = cleanEmail.split('@')[1];
  
  if (!domain) return false;
  
  const isTemp = DISPOSABLE_EMAIL_DOMAINS.has(domain);
  if (isTemp) {
    logger.warn(`Blocked registration attempt from disposable email: ${cleanEmail}`);
  }
  
  return isTemp;
};
