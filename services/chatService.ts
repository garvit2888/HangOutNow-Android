import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
  doc,
  getDoc
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { GroupMessage } from '@/types';

/**
 * Chat Service - Manages chat messages in Firestore
 * Messages are stored in subcollections under each activity
 */

/**
 * Send a message to an activity's chat
 */
export const sendMessage = async (
  activityId: string,
  message: {
    senderId: string;
    senderName: string;
    senderAvatar?: string;
    text: string;
    imageUri?: string;
  }
): Promise<string> => {
  try {
    console.log('🔥 Sending message to Firestore:', activityId);

    const messagesRef = collection(db, 'activities', activityId, 'messages');
    const docRef = await addDoc(messagesRef, {
      ...message,
      timestamp: serverTimestamp(), // Use server timestamp for consistency
      createdAt: new Date().toISOString(),
    });

    console.log('✅ Message sent to Firestore:', docRef.id);

    // Trigger push notification to other members
    sendPushNotificationToMembers(activityId, message.senderId, message.text, message.senderName).catch(err =>
      console.error('⚠️ Failed to send push notification:', err)
    );

    return docRef.id;
  } catch (error) {
    console.error('❌ Error sending message to Firestore:', error);
    throw error;
  }
};

/**
 * Send push notification to all activity members except sender
 */
const sendPushNotificationToMembers = async (
  activityId: string,
  senderId: string,
  messageText: string,
  senderName: string
) => {
  try {
    const activityRef = doc(db, 'activities', activityId);
    const activitySnap = await getDoc(activityRef);

    if (!activitySnap.exists()) return;

    const activityData = activitySnap.data();
    const members = activityData.members || [];
    const activityName = activityData.name || 'Activity';

    // Collect push tokens from all members
    const tokens: string[] = [];

    // We need to fetch each user's latest token from the users collection
    // This is expensive (N reads) but necessary as tokens aren't synced to activity members
    const memberPromises = members.map(async (member: any) => {
      const memberId = member.id || member; // Handle object or string

      // Skip sender
      if (memberId === senderId) return;

      try {
        const userDoc = await getDoc(doc(db, 'users', memberId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData?.pushToken) {
            tokens.push(userData.pushToken);
          }
        }
      } catch (e) {
        console.warn('Error fetching token for user:', memberId);
      }
    });

    await Promise.all(memberPromises);

    if (tokens.length === 0) return;

    // Send to Expo Push API
    // Note: Expo handles batching automatically for arrays of tokens
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: tokens,
        sound: 'default',
        title: activityName,
        body: `${senderName}: ${messageText}`,
        data: { activityId, type: 'new_message' },
      }),
    });

    console.log(`🚀 Sent push notification to ${tokens.length} devices`);
  } catch (error) {
    console.error('Error in sendPushNotificationToMembers:', error);
  }
};

/**
 * Subscribe to real-time messages for an activity
 * Returns an unsubscribe function
 */
export const subscribeToMessages = (
  activityId: string,
  callback: (messages: GroupMessage[]) => void
): (() => void) => {
  try {
    console.log('🔥 Subscribing to messages for activity:', activityId);

    const messagesRef = collection(db, 'activities', activityId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messages: GroupMessage[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        messages.push({
          id: doc.id,
          groupId: activityId,
          senderId: data.senderId,
          senderName: data.senderName,
          senderAvatar: data.senderAvatar,
          text: data.text,
          imageUri: data.imageUri,
          timestamp: data.timestamp?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
        });
      });

      console.log(`🔄 Real-time messages update: ${messages.length} messages`);
      callback(messages);
    }, (error) => {
      console.error('❌ Error in message subscription:', error);
    });

    return unsubscribe;
  } catch (error) {
    console.error('❌ Error subscribing to messages:', error);
    return () => { };
  }
};

