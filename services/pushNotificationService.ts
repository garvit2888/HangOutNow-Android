/**
 * Push Notification Service
 * Handles device push notifications for messages and activity events
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { useNotificationStore } from '@/store/notificationStore';

import Constants from 'expo-constants';

// Check if running in Expo Go
const isExpoGo = Constants.appOwnership === 'expo';

// Configure notification behavior (only if not in Expo Go)
if (!isExpoGo) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/**
 * Request notification permissions
 */
export const requestNotificationPermissions = async (): Promise<boolean> => {
  if (isExpoGo) {
    console.log('⚠️ Skipping notification permissions in Expo Go');
    return false;
  }
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('⚠️ Notification permissions not granted');
      return false;
    }

    // Configure notification channel for Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });

      // Channel for messages
      await Notifications.setNotificationChannelAsync('messages', {
        name: 'Messages',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
      });

      // Channel for activity events
      await Notifications.setNotificationChannelAsync('activity', {
        name: 'Activity Events',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    console.log('✅ Notification permissions granted');
    return true;
  } catch (error) {
    console.error('❌ Error requesting notification permissions:', error);
    return false;
  }
};

/**
 * Get device push token (for future backend integration)
 */
export const getPushToken = async (): Promise<string | null> => {
  if (isExpoGo) return null;

  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      return null;
    }

    // Get project ID from Expo constants
    const { Constants } = require('expo-constants');
    const projectId = Constants?.expoConfig?.extra?.eas?.projectId ||
      Constants?.easConfig?.projectId;

    if (!projectId) {
      console.warn('⚠️ No Expo project ID found. Push tokens require a project ID.');
      return null;
    }

    const token = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    console.log('📱 Push token:', token.data);
    return token.data;
  } catch (error) {
    console.error('❌ Error getting push token:', error);
    return null;
  }
};

/**
 * Schedule a local push notification
 */
export const sendPushNotification = async (
  title: string,
  body: string,
  data?: { activityId?: string; type?: string;[key: string]: any },
  channelId: string = 'default'
): Promise<void> => {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      console.warn('⚠️ Cannot send notification: permissions not granted');
      return;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null, // Show immediately
    });
  } catch (error) {
    console.error('❌ Error sending push notification:', error);
  }
};

/**
 * Send notification for new message
 */
export const notifyNewMessage = async (
  activityName: string,
  senderName: string,
  messageText: string,
  activityId: string,
  activityEmoji?: string
): Promise<void> => {
  const title = activityEmoji
    ? `${activityEmoji} ${activityName}`
    : activityName;

  const body = messageText.length > 50
    ? `${senderName}: ${messageText.substring(0, 50)}...`
    : `${senderName}: ${messageText}`;

  await sendPushNotification(
    title,
    body,
    {
      activityId,
      type: 'new_message',
      activityName,
      activityEmoji,
    },
    Platform.OS === 'android' ? 'messages' : 'default'
  );
};

/**
 * Send notification for photo message
 */
export const notifyPhotoMessage = async (
  activityName: string,
  senderName: string,
  activityId: string,
  activityEmoji?: string
): Promise<void> => {
  const title = activityEmoji
    ? `${activityEmoji} ${activityName}`
    : activityName;

  await sendPushNotification(
    title,
    `${senderName} sent a photo`,
    {
      activityId,
      type: 'new_message',
      activityName,
      activityEmoji,
    },
    Platform.OS === 'android' ? 'messages' : 'default'
  );
};

/**
 * Send notification for member joined
 */
export const notifyMemberJoined = async (
  activityName: string,
  memberName: string,
  activityId: string,
  activityEmoji?: string
): Promise<void> => {
  const title = activityEmoji
    ? `${activityEmoji} ${activityName}`
    : activityName;

  await sendPushNotification(
    title,
    `${memberName} joined the activity`,
    {
      activityId,
      type: 'member_joined',
      activityName,
      activityEmoji,
    },
    Platform.OS === 'android' ? 'activity' : 'default'
  );
};

/**
 * Send notification for member left
 */
export const notifyMemberLeft = async (
  activityName: string,
  memberName: string,
  activityId: string,
  activityEmoji?: string
): Promise<void> => {
  const title = activityEmoji
    ? `${activityEmoji} ${activityName}`
    : activityName;

  await sendPushNotification(
    title,
    `${memberName} left the activity`,
    {
      activityId,
      type: 'member_left',
      activityName,
      activityEmoji,
    },
    Platform.OS === 'android' ? 'activity' : 'default'
  );
};

/**
 * Cancel all notifications
 */
export const cancelAllNotifications = async (): Promise<void> => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('❌ Error canceling notifications:', error);
  }
};

/**
 * Get badge count
 */
export const getBadgeCount = async (): Promise<number> => {
  try {
    return await Notifications.getBadgeCountAsync();
  } catch (error) {
    console.error('❌ Error getting badge count:', error);
    return 0;
  }
};

/**
 * Set badge count
 */
export const setBadgeCount = async (count: number): Promise<void> => {
  try {
    await Notifications.setBadgeCountAsync(count);
  } catch (error) {
    console.error('❌ Error setting badge count:', error);
  }
};

/**
 * Set up notification listeners
 */
export const setupNotificationListeners = (router: any) => {
  // Don't set up listeners in Expo Go
  if (isExpoGo) {
    console.log('⚠️ Skipping notification listeners setup in Expo Go');
    return () => { };
  }

  // Handle notifications received while app is in foreground
  const notificationListener = Notifications.addNotificationReceivedListener((notification: Notifications.Notification) => {
    console.log('📱 Notification received:', notification);
  });

  // Handle notification taps
  const responseListener = Notifications.addNotificationResponseReceivedListener((response: Notifications.NotificationResponse) => {
    const data = response.notification.request.content.data as any;
    console.log('👆 Notification tapped:', data);

    // Navigate based on notification type
    if (data?.activityId) {
      if (data.type === 'new_message') {
        router.push(`/group-chat/${data.activityId}`);
      } else if (data.type === 'member_joined' || data.type === 'member_left') {
        router.push(`/group-details/${data.activityId}`);
      }
    }
  });

  return () => {
    notificationListener.remove();
    responseListener.remove();
  };
};

