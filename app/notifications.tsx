import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import { ArrowLeft, Bell, Clock, MapPin, Users, TrendingUp, MessageSquare } from 'lucide-react-native';
import { useNotificationStore } from '@/store/notificationStore';
import { formatTimestamp, getNotificationEmoji } from '@/services/notificationService';

// Icon mapping for notification types
const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'new_message':
      return MessageSquare;
    case 'member_joined':
    case 'member_left':
      return Users;
    case 'new_activity_nearby':
      return MapPin;
    case 'activity_starting_soon':
      return Clock;
    case 'activity_popular':
      return TrendingUp;
    default:
      return Bell;
  }
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { notifications, markAsRead, markAllAsRead, clearAllNotifications } = useNotificationStore();

  const handleNotificationPress = (notification: any) => {
    // Mark as read when tapped
    if (!notification.read) {
      markAsRead(notification.id);
    }

    // Navigate based on notification type
    if (notification.activityId) {
      if (notification.type === 'new_message') {
        router.push(`/group-chat/${notification.activityId}`);
      } else {
        router.push(`/group-details/${notification.activityId}`);
      }
    }
  };

  const handleClearAll = () => {
    clearAllNotifications();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.primary }}>
      <LinearGradient colors={[Colors.primary, Colors.darkPurple]} style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Notifications List */}
        <ScrollView 
          style={styles.notificationsList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.notificationsContent}
        >
          {notifications.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No notifications yet</Text>
              <Text style={styles.emptySubtext}>You'll see notifications here when something new happens</Text>
            </View>
          ) : (
            notifications.map((notification) => {
              const IconComponent = getNotificationIcon(notification.type);
              const emoji = getNotificationEmoji(notification.type, notification.activityEmoji);
              
              return (
                <TouchableOpacity 
                  key={notification.id} 
                  style={styles.notificationItem}
                  activeOpacity={0.7}
                  onPress={() => handleNotificationPress(notification)}
                >
                  <View style={styles.notificationIcon}>
                    <Text style={styles.notificationEmoji}>{emoji}</Text>
                  </View>
                  
                  <View style={styles.notificationContent}>
                    <View style={styles.notificationHeader}>
                      <Text style={styles.notificationTitle}>{notification.title}</Text>
                      <View style={styles.iconBadge}>
                        <IconComponent size={14} color={Colors.secondary} />
                      </View>
                    </View>
                    <Text style={styles.notificationDescription}>{notification.description}</Text>
                    <Text style={styles.notificationTime}>{formatTimestamp(notification.timestamp)}</Text>
                  </View>

                  {/* Unread Indicator */}
                  {!notification.read && (
                    <View style={styles.unreadDot} />
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>

        {/* Clear All Button */}
        {notifications.length > 0 && (
          <View style={styles.footer}>
            <TouchableOpacity style={styles.clearButton} onPress={handleClearAll}>
              <Text style={styles.clearButtonText}>Clear All Notifications</Text>
            </TouchableOpacity>
          </View>
        )}
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.white,
  },
  notificationsList: {
    flex: 1,
  },
  notificationsContent: {
    padding: 16,
  },
  notificationItem: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    position: 'relative',
  },
  notificationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationEmoji: {
    fontSize: 24,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
    flex: 1,
  },
  iconBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 214, 10, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  notificationDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 6,
    lineHeight: 20,
  },
  notificationTime: {
    fontSize: 12,
    color: Colors.secondary,
    fontWeight: '600',
  },
  unreadDot: {
    position: 'absolute',
    top: 20,
    right: 16,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.secondary,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  clearButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  clearButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});

