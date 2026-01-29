import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Notification, formatTimestamp, getNotificationEmoji } from '@/services/notificationService';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  
  // Actions
  addNotification: (notification: Omit<Notification, 'id' | 'read' | 'timestamp'>) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  clearNotification: (notificationId: string) => void;
  clearAllNotifications: () => void;
  getUnreadCount: () => number;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,

      addNotification: (notificationData) => {
        const notification: Notification = {
          ...notificationData,
          id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          read: false,
          timestamp: new Date().toISOString(),
        };

        set((state) => {
          // Don't add duplicate notifications for the same event
          const isDuplicate = state.notifications.some(
            (n) =>
              n.type === notification.type &&
              n.activityId === notification.activityId &&
              !n.read &&
              // For member notifications, also check userId
              (notification.type === 'member_joined' || notification.type === 'member_left'
                ? n.userId === notification.userId
                : true)
          );

          if (isDuplicate) {
            return state;
          }

          // Add to beginning of array (most recent first)
          const updatedNotifications = [notification, ...state.notifications].slice(0, 100); // Keep last 100 notifications
          const unreadCount = updatedNotifications.filter((n) => !n.read).length;

          return {
            notifications: updatedNotifications,
            unreadCount,
          };
        });
      },

      markAsRead: (notificationId) => {
        set((state) => {
          const updatedNotifications = state.notifications.map((n) =>
            n.id === notificationId ? { ...n, read: true } : n
          );
          const unreadCount = updatedNotifications.filter((n) => !n.read).length;

          return {
            notifications: updatedNotifications,
            unreadCount,
          };
        });
      },

      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
          unreadCount: 0,
        }));
      },

      clearNotification: (notificationId) => {
        set((state) => {
          const updatedNotifications = state.notifications.filter(
            (n) => n.id !== notificationId
          );
          const unreadCount = updatedNotifications.filter((n) => !n.read).length;

          return {
            notifications: updatedNotifications,
            unreadCount,
          };
        });
      },

      clearAllNotifications: () => {
        set({
          notifications: [],
          unreadCount: 0,
        });
      },

      getUnreadCount: () => {
        return get().notifications.filter((n) => !n.read).length;
      },
    }),
    {
      name: 'notification-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

