/**
 * Notification Service - Manages notification creation and storage
 */

export type NotificationType = 
  | 'new_message' 
  | 'member_joined' 
  | 'member_left' 
  | 'new_activity_nearby' 
  | 'activity_starting_soon'
  | 'activity_popular';

export interface Notification {
  id: string;
  type: NotificationType;
  activityId?: string;
  activityName?: string;
  activityEmoji?: string;
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  userId?: string; // For member_joined/member_left
  userName?: string; // For member_joined/member_left
}

/**
 * Format timestamp to relative time (e.g., "2 minutes ago")
 */
export const formatTimestamp = (timestamp: string): string => {
  const now = new Date();
  const notificationTime = new Date(timestamp);
  const diffInSeconds = Math.floor((now.getTime() - notificationTime.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'Just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  }
};

/**
 * Get notification icon based on type
 */
export const getNotificationEmoji = (type: NotificationType, activityEmoji?: string): string => {
  switch (type) {
    case 'new_message':
      return activityEmoji || '💬';
    case 'member_joined':
      return activityEmoji || '👋';
    case 'member_left':
      return activityEmoji || '👋';
    case 'new_activity_nearby':
      return activityEmoji || '📍';
    case 'activity_starting_soon':
      return activityEmoji || '⏰';
    case 'activity_popular':
      return activityEmoji || '🔥';
    default:
      return '🔔';
  }
};

