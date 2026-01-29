import React, { useEffect } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import ChatPreviewCard from '@/components/ChatPreviewCard';
import { useChatStore } from '@/store/chatStore';
import { useGroupStore } from '@/store/groupStore';
import { useUserStore } from '@/store/userStore';
import { useNotificationStore } from '@/store/notificationStore';
import { subscribeToMessages } from '@/services/chatService';
import { useIsFocused } from '@react-navigation/native';

export default function ChatScreen() {
  const { chats, upsertChatPreview, incrementUnread, activeChat } = useChatStore();
  const { activeGroups } = useGroupStore();
  const { profile, loginEmail } = useUserStore();
  const { addNotification } = useNotificationStore();
  const isChatTabFocused = useIsFocused();
  const currentUserId = profile?.uid || loginEmail || 'current_user_id';
  
  // Track last known unread counts to prevent race conditions
  const lastUnreadCounts = React.useRef<Record<string, number>>({});
  const processedMessageIds = React.useRef<Record<string, Set<string>>>({}); // Track processed message IDs per activity

  // Subscribe to messages for all chats the user is a member of
  // This updates chat previews in real-time even when user is in the chat list
  useEffect(() => {
    if (!currentUserId || currentUserId === 'current_user_id') return;

    const unsubscribes: (() => void)[] = [];
    
    // Find all activities the user is a member of
    const userActivities = activeGroups.filter(activity =>
      activity.members.some(m => m.id === currentUserId || m.email === currentUserId)
    );

    console.log('📱 Setting up message listeners for', userActivities.length, 'activities');

    // Initialize processed message IDs for activities
    userActivities.forEach(activity => {
      if (!processedMessageIds.current[activity.id]) {
        processedMessageIds.current[activity.id] = new Set();
      }
    });

    // Subscribe to messages for each activity
    userActivities.forEach(activity => {
      const unsubscribe = subscribeToMessages(activity.id, (firestoreMessages) => {
        if (firestoreMessages.length > 0) {
          const lastMessage = firestoreMessages[firestoreMessages.length - 1];
          
          // Get the set of already processed message IDs for this activity
          const processedIds = processedMessageIds.current[activity.id] || new Set();
          
          // Filter out messages we've already processed
          const newMessages = firestoreMessages.filter(msg => !processedIds.has(msg.id));
          const newMessagesFromOthers = newMessages.filter(msg => msg.senderId !== currentUserId);
          
          // Add new message IDs to the processed set
          newMessages.forEach(msg => {
            processedIds.add(msg.id);
          });
          
          console.log(`📬 Activity ${activity.id}: ${newMessages.length} new messages (${newMessagesFromOthers.length} from others)`);
          
          // Determine if chat is currently open and should be marked as read
          const isCurrentlyViewingChat = activeChat === activity.id;
          const shouldNotify = !isCurrentlyViewingChat && !isChatTabFocused;
          
          // Get current unread count from store
          const { chats: currentChats } = useChatStore.getState();
          const existingChat = currentChats.find(c => c.id === activity.id);
          let currentUnread = existingChat?.unread || 0;
          
          // Only increment if there are actually new messages from others
          if (!isCurrentlyViewingChat && newMessagesFromOthers.length > 0) {
            // Increment unread for each new message from others
            for (let i = 0; i < newMessagesFromOthers.length; i++) {
              incrementUnread(activity.id);
            }
            
            // Get updated unread count after incrementing
            const { chats: updatedChats } = useChatStore.getState();
            const updatedChat = updatedChats.find(c => c.id === activity.id);
            currentUnread = updatedChat?.unread || 0;
            
            // Create notification for new message
            if (shouldNotify) {
              const message = newMessagesFromOthers[newMessagesFromOthers.length - 1];
              
              // In-app notification
              addNotification({
                type: 'new_message',
                activityId: activity.id,
                activityName: activity.name,
                activityEmoji: activity.emoji,
                title: `New message in ${activity.name}`,
                description: message.imageUri ? `${message.senderName} sent a photo` : message.text,
              });

              // Push notification (only if app is in background or user not viewing chat)
              if (shouldNotify) {
                if (message.imageUri) {
                  const { notifyPhotoMessage } = require('@/services/pushNotificationService');
                  notifyPhotoMessage(
                    activity.name,
                    message.senderName,
                    activity.id,
                    activity.emoji
                  ).catch(err => console.error('Error sending photo notification:', err));
                } else {
                  const { notifyNewMessage } = require('@/services/pushNotificationService');
                  notifyNewMessage(
                    activity.name,
                    message.senderName,
                    message.text,
                    activity.id,
                    activity.emoji
                  ).catch(err => console.error('Error sending message notification:', err));
                }
              }
            }
          } else if (isCurrentlyViewingChat) {
            // Chat is open, unread count should be 0
            currentUnread = 0;
          }
          
          // Update last known unread count
          lastUnreadCounts.current[activity.id] = currentUnread;
          
          // Only update chat preview with latest message if the chat is NOT currently open
          // This prevents overwriting the unread count when the chat is open
          if (!isCurrentlyViewingChat) {
            upsertChatPreview({
              id: activity.id,
              userId: activity.id,
              name: activity.name,
              avatar: activity.groupAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(activity.name)}&background=random`,
              lastMessage: lastMessage.imageUri ? '📷 Photo' : lastMessage.text,
              timestamp: lastMessage.timestamp,
              unread: currentUnread,
              isGroupChat: true,
            });
          }
        }
      });

      unsubscribes.push(unsubscribe);
    });

    return () => {
      console.log('🧹 Cleaning up message listeners');
      unsubscribes.forEach(unsub => unsub());
    };
  }, [activeGroups, currentUserId, upsertChatPreview, incrementUnread, activeChat, isChatTabFocused, addNotification]);
  
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.primary }}>
      <LinearGradient
        colors={[Colors.primary, Colors.darkPurple]}
        style={styles.container}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Messages</Text>
        </View>
        
        <View style={styles.contentContainer}>
          <FlatList
            data={chats}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <ChatPreviewCard chat={item} />}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  No messages yet. Start a conversation with someone nearby!
                </Text>
              </View>
            }
          />
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: Colors.secondary,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  listContainer: {
    flexGrow: 1,
    paddingTop: 8,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptyText: {
    color: Colors.darkGray,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
});