import { getFirebaseMessaging } from '../config/firebase';
import { logger } from '../utils/logger';

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}

/**
 * Send push notification to a single device
 */
export const sendPushNotification = async (
  fcmToken: string,
  payload: PushNotificationPayload
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  try {
    const messaging = getFirebaseMessaging();

    const message = {
      token: fcmToken,
      notification: {
        title: payload.title,
        body: payload.body,
        ...(payload.imageUrl && { imageUrl: payload.imageUrl }),
      },
      ...(payload.data && { data: payload.data }),
      android: {
        priority: 'high' as const,
        notification: {
          sound: 'default',
          channelId: 'salon_app_notifications',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    const messageId = await messaging.send(message);

    logger.info(`Push notification sent successfully. Message ID: ${messageId}`);
    return { success: true, messageId };
  } catch (error: any) {
    logger.error('Error sending push notification:', error);
    return {
      success: false,
      error: error.message || 'Failed to send push notification',
    };
  }
};

/**
 * Send OTP via push notification
 */
export const sendOTPNotification = async (
  fcmToken: string,
  otp: string,
  phone: string
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  const payload: PushNotificationPayload = {
    title: 'Your OTP Code',
    body: `Your verification code is: ${otp}. Valid for 10 minutes.`,
    data: {
      type: 'otp',
      otp,
      phone,
      timestamp: new Date().toISOString(),
    },
  };

  return sendPushNotification(fcmToken, payload);
};

/**
 * Send push notification to multiple devices
 */
export const sendMulticastNotification = async (
  fcmTokens: string[],
  payload: PushNotificationPayload
): Promise<{
  successCount: number;
  failureCount: number;
  responses: Array<{ success: boolean; messageId?: string; error?: string }>;
}> => {
  try {
    const messaging = getFirebaseMessaging();

    const message = {
      notification: {
        title: payload.title,
        body: payload.body,
        ...(payload.imageUrl && { imageUrl: payload.imageUrl }),
      },
      ...(payload.data && { data: payload.data }),
      android: {
        priority: 'high' as const,
        notification: {
          sound: 'default',
          channelId: 'salon_app_notifications',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
      tokens: fcmTokens,
    };

    const response = await messaging.sendEachForMulticast(message);

    logger.info(
      `Multicast notification sent. Success: ${response.successCount}, Failure: ${response.failureCount}`
    );

    const responses = response.responses.map((resp) => ({
      success: resp.success,
      messageId: resp.messageId,
      error: resp.error?.message,
    }));

    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
      responses,
    };
  } catch (error: any) {
    logger.error('Error sending multicast notification:', error);
    throw new Error('Failed to send multicast notification');
  }
};

/**
 * Verify FCM token validity
 */
export const verifyFCMToken = async (
  fcmToken: string
): Promise<boolean> => {
  try {
    const messaging = getFirebaseMessaging();

    // Try to send a dry-run message to verify token
    await messaging.send(
      {
        token: fcmToken,
        notification: {
          title: 'Test',
          body: 'Test',
        },
      },
      true // dry run
    );

    return true;
  } catch (error: any) {
    logger.warn(`Invalid FCM token: ${error.message}`);
    return false;
  }
};

/**
 * Send appointment notification
 */
export const sendAppointmentNotification = async (
  fcmToken: string,
  appointmentDetails: {
    salonName: string;
    date: string;
    time: string;
    status: string;
  }
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  const payload: PushNotificationPayload = {
    title: 'Appointment Update',
    body: `Your appointment at ${appointmentDetails.salonName} on ${appointmentDetails.date} at ${appointmentDetails.time} is ${appointmentDetails.status}`,
    data: {
      type: 'appointment',
      ...appointmentDetails,
    },
  };

  return sendPushNotification(fcmToken, payload);
};

/**
 * Send queue update notification
 */
export const sendQueueUpdateNotification = async (
  fcmToken: string,
  queueDetails: {
    salonName: string;
    position: number;
    estimatedWaitTime: number;
  }
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  const payload: PushNotificationPayload = {
    title: 'Queue Update',
    body: `You are #${queueDetails.position} in queue at ${queueDetails.salonName}. Estimated wait: ${queueDetails.estimatedWaitTime} minutes`,
    data: {
      type: 'queue',
      position: queueDetails.position.toString(),
      estimatedWaitTime: queueDetails.estimatedWaitTime.toString(),
    },
  };

  return sendPushNotification(fcmToken, payload);
};

export default {
  sendPushNotification,
  sendOTPNotification,
  sendMulticastNotification,
  verifyFCMToken,
  sendAppointmentNotification,
  sendQueueUpdateNotification,
};
