import { getFirebaseMessaging } from '../config/firebase';
import { User } from '../models/User';
import { logger } from '../utils/logger';
import mongoose from 'mongoose';

export interface PushPayload {
  title: string;
  body: string;
  /** Optional extra data — keys/values must be strings (FCM requirement). */
  data?: Record<string, string>;
}

/** Invalid-token FCM error codes that mean: stop trying, drop the token. */
const TOKEN_DEAD_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',
]);

/**
 * Send a push to a single user by their user id. Drops the token if invalid.
 */
export async function sendToUser(
  userId: string | mongoose.Types.ObjectId,
  payload: PushPayload,
): Promise<void> {
  try {
    const user = await User.findById(userId).select('fcmToken').lean();
    const token = (user as any)?.fcmToken;
    if (!token) return;
    await sendToToken(token, payload, userId);
  } catch (err: any) {
    logger.error(`sendToUser(${userId}) failed:`, err?.message ?? err);
  }
}

/**
 * Send a push to many users in parallel. Cheaper than calling sendToUser in a loop
 * because we batch the user lookup.
 */
export async function sendToUsers(
  userIds: Array<string | mongoose.Types.ObjectId>,
  payload: PushPayload,
): Promise<void> {
  try {
    if (!userIds.length) return;
    const users = await User.find({ _id: { $in: userIds }, fcmToken: { $exists: true, $ne: null } })
      .select('_id fcmToken')
      .lean();
    await Promise.all(
      users.map((u: any) => sendToToken(u.fcmToken, payload, u._id)),
    );
  } catch (err: any) {
    logger.error('sendToUsers failed:', err?.message ?? err);
  }
}

/** Low-level send. Stringifies all data values per FCM rules. */
async function sendToToken(
  token: string,
  payload: PushPayload,
  ownerId: string | mongoose.Types.ObjectId,
): Promise<void> {
  const data: Record<string, string> = {};
  if (payload.data) {
    for (const [k, v] of Object.entries(payload.data)) data[k] = String(v);
  }
  try {
    await getFirebaseMessaging().send({
      token,
      notification: { title: payload.title, body: payload.body },
      data,
      android: { priority: 'high', notification: { channelId: 'trimcity-default' } },
      apns: { payload: { aps: { sound: 'default' } } },
    });
  } catch (err: any) {
    const code = err?.errorInfo?.code ?? err?.code;
    if (TOKEN_DEAD_CODES.has(code)) {
      // Token is invalid; remove it so we don't keep retrying.
      await User.updateOne({ _id: ownerId }, { $unset: { fcmToken: 1 } }).catch(() => {});
      logger.warn(`Dropped invalid FCM token for user ${ownerId}`);
      return;
    }
    logger.error(`FCM send failed for user ${ownerId}:`, code ?? err?.message ?? err);
  }
}

/**
 * Run a notification call in the background so the HTTP request can return immediately.
 * Logs but never throws.
 */
export function fireAndForget<T>(promise: Promise<T>): void {
  promise.catch(err => logger.error('Background notification error:', err?.message ?? err));
}
