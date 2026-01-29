import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy,
  serverTimestamp,
  Timestamp,
  doc
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
    return docRef.id;
  } catch (error) {
    console.error('❌ Error sending message to Firestore:', error);
    throw error;
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
    return () => {};
  }
};

