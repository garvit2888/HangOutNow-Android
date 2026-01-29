import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChatPreview, Message } from '@/types';
import { saveUserChats, loadUserChats, addUserChat, updateUserChat, removeUserChat } from '@/services/userChatService';

interface ChatState {
  chats: ChatPreview[];
  messages: Record<string, Message[]>;
  activeChat: string | null;
  
  // Actions
  setActiveChat: (chatId: string | null) => void;
  sendMessage: (chatId: string, text: string) => void;
  upsertChatPreview: (chat: ChatPreview) => void;
  incrementUnread: (chatId: string) => void;
  markAsRead: (chatId: string) => void;
  clearAllChats: () => void;
  loadUserChatsFromFirestore: (userId: string) => Promise<void>; // Load chats from Firestore for specific user
  saveUserChatsToFirestore: (userId: string) => Promise<void>; // Save current chats to Firestore for specific user
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      chats: [],
      messages: {},
      activeChat: null,
  
  setActiveChat: (chatId) => set({ activeChat: chatId }),
  
  sendMessage: (chatId, text) => set((state) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      senderId: 'me',
      text,
      timestamp: new Date().toISOString(),
    };
    
    const updatedMessages = { ...state.messages };
    
    if (updatedMessages[chatId]) {
      updatedMessages[chatId] = [...updatedMessages[chatId], newMessage];
    } else {
      updatedMessages[chatId] = [newMessage];
    }
    
    const updatedChats = state.chats.map(chat => {
      if (chat.id === chatId) {
        return {
          ...chat,
          lastMessage: text,
          timestamp: newMessage.timestamp,
          unread: 0,
        };
      }
      return chat;
    });
    
    return {
      messages: updatedMessages,
      chats: updatedChats,
    };
  }),

  upsertChatPreview: (chat) => set((state) => {
    const exists = state.chats.some(c => c.id === chat.id);
    let updatedChats;
    
    if (exists) {
      // Update existing chat, preserve unread count unless explicitly set
      updatedChats = state.chats.map(c => 
        c.id === chat.id 
          ? { ...c, ...chat, unread: chat.unread !== undefined ? chat.unread : c.unread }
          : c
      );
    } else {
      updatedChats = [chat, ...state.chats];
    }
    
    return { chats: updatedChats };
  }),

  incrementUnread: (chatId) => set((state) => ({
    chats: state.chats.map(chat => 
      chat.id === chatId 
        ? { ...chat, unread: chat.unread + 1 }
        : chat
    ),
  })),

  markAsRead: (chatId) => set((state) => ({
    chats: state.chats.map(chat => 
      chat.id === chatId 
        ? { ...chat, unread: 0 }
        : chat
    ),
  })),

  clearAllChats: () => set({
    chats: [],
    messages: {},
    activeChat: null,
  }),

  // Load chats from Firestore for specific user
  loadUserChatsFromFirestore: async (userId: string) => {
    try {
      console.log('📱 Loading chats from Firestore for user:', userId);
      const firestoreChats = await loadUserChats(userId);
      set({ chats: firestoreChats });
      console.log('✅ Loaded user chats from Firestore:', firestoreChats.length);
    } catch (error) {
      console.error('❌ Error loading user chats:', error);
    }
  },

  // Save current chats to Firestore for specific user
  saveUserChatsToFirestore: async (userId: string) => {
    try {
      const { chats } = get();
      console.log('💾 Saving chats to Firestore for user:', userId, chats.length);
      await saveUserChats(userId, chats);
      console.log('✅ Saved user chats to Firestore');
    } catch (error) {
      console.error('❌ Error saving user chats:', error);
    }
  },
    }),
    {
      name: 'chat-storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        console.log('📱 Chat store rehydrated from storage:', state?.chats?.length || 0, 'chats');
        if (state && state.chats && state.chats.length > 0) {
          console.log('📱 Rehydrated chats:', state.chats.map(c => ({ id: c.id, name: c.name })));
        } else {
          console.log('⚠️ No chats found in storage during rehydration');
        }
      },
      partialize: (state) => ({
        chats: state.chats,
        messages: state.messages,
        activeChat: state.activeChat,
      }),
    }
  )
);