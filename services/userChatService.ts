import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { ChatPreview } from '@/types';

/**
 * User Chat Service - Manages user-specific chat data in Firestore
 * Each user has their own chat collection stored in Firestore
 */

/**
 * Save user's chat previews to Firestore
 */
export const saveUserChats = async (userId: string, chats: ChatPreview[]): Promise<void> => {
  try {
    console.log('💾 Saving user chats to Firestore:', userId, chats.length);
    
    const userChatsRef = doc(db, 'userChats', userId);
    await setDoc(userChatsRef, {
      chats: chats,
      lastUpdated: serverTimestamp(),
      userId: userId
    }, { merge: true });
    
    console.log('✅ User chats saved to Firestore');
  } catch (error) {
    console.error('❌ Error saving user chats:', error);
    throw error;
  }
};

/**
 * Load user's chat previews from Firestore
 */
export const loadUserChats = async (userId: string): Promise<ChatPreview[]> => {
  try {
    console.log('📱 Loading user chats from Firestore:', userId);
    
    const userChatsRef = doc(db, 'userChats', userId);
    const userChatsDoc = await getDoc(userChatsRef);
    
    if (userChatsDoc.exists()) {
      const data = userChatsDoc.data();
      const chats = data.chats || [];
      console.log('✅ Loaded user chats from Firestore:', chats.length);
      return chats;
    } else {
      console.log('📱 No user chats found in Firestore, returning empty array');
      return [];
    }
  } catch (error) {
    console.error('❌ Error loading user chats:', error);
    return [];
  }
};

/**
 * Add a new chat preview for a user
 */
export const addUserChat = async (userId: string, chat: ChatPreview): Promise<void> => {
  try {
    console.log('➕ Adding chat for user:', userId, chat.name);
    
    const userChatsRef = doc(db, 'userChats', userId);
    await updateDoc(userChatsRef, {
      chats: arrayUnion(chat),
      lastUpdated: serverTimestamp()
    });
    
    console.log('✅ Chat added for user');
  } catch (error) {
    console.error('❌ Error adding user chat:', error);
    throw error;
  }
};

/**
 * Update a chat preview for a user
 */
export const updateUserChat = async (userId: string, chatId: string, updates: Partial<ChatPreview>): Promise<void> => {
  try {
    console.log('🔄 Updating chat for user:', userId, chatId);
    
    // First get current chats
    const currentChats = await loadUserChats(userId);
    
    // Update the specific chat
    const updatedChats = currentChats.map(chat => 
      chat.id === chatId ? { ...chat, ...updates } : chat
    );
    
    // Save back to Firestore
    await saveUserChats(userId, updatedChats);
    
    console.log('✅ Chat updated for user');
  } catch (error) {
    console.error('❌ Error updating user chat:', error);
    throw error;
  }
};

/**
 * Remove a chat preview for a user
 */
export const removeUserChat = async (userId: string, chatId: string): Promise<void> => {
  try {
    console.log('🗑️ Removing chat for user:', userId, chatId);
    
    // First get current chats
    const currentChats = await loadUserChats(userId);
    
    // Remove the specific chat
    const updatedChats = currentChats.filter(chat => chat.id !== chatId);
    
    // Save back to Firestore
    await saveUserChats(userId, updatedChats);
    
    console.log('✅ Chat removed for user');
  } catch (error) {
    console.error('❌ Error removing user chat:', error);
    throw error;
  }
};
