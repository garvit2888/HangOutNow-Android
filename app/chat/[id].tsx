import React, { useEffect, useRef, useState } from 'react';
import { 
  FlatList, 
  KeyboardAvoidingView, 
  Platform, 
  StyleSheet, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  View 
} from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import Colors from '@/constants/colors';
import { useChatStore } from '@/store/chatStore';
import MessageBubble from '@/components/MessageBubble';
import MeetupSuggestion from '@/components/MeetupSuggestion';
import { mockPlaces } from '@/constants/mockData';
import { ArrowLeft, Send } from 'lucide-react-native';

export default function ChatDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { chats, messages, sendMessage } = useChatStore();
  const [text, setText] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const router = useRouter();
  
  const chat = chats.find(c => c.userId === id);
  const chatMessages = messages[id] || [];
  
  // Suggested place (in a real app, this would be more intelligent)
  const suggestedPlace = mockPlaces[0];
  
  const handleSend = () => {
    if (text.trim()) {
      sendMessage(id, text.trim());
      setText('');
    }
  };
  
  const handleSuggestionSend = (suggestionText: string) => {
    sendMessage(id, suggestionText);
  };
  
  useEffect(() => {
    // Scroll to bottom when messages change
    if (flatListRef.current && chatMessages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [chatMessages]);
  
  if (!chat) {
    return (
      <View style={styles.container}>
        <Text>Chat not found</Text>
      </View>
    );
  }
  
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <Stack.Screen
        options={{
          headerTitle: () => (
            <View style={styles.headerContainer}>
              <Image source={{ uri: chat.avatar }} style={styles.headerAvatar} />
              <Text style={styles.headerTitle}>{chat.name}</Text>
            </View>
          ),
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft size={24} color={Colors.white} />
            </TouchableOpacity>
          ),
          headerStyle: {
            backgroundColor: Colors.primary,
          },
          headerTintColor: Colors.white,
        }}
      />
      
      <LinearGradient
        colors={[Colors.primary, Colors.darkPurple]}
        style={styles.container}
      >
        <FlatList
          ref={flatListRef}
          data={chatMessages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MessageBubble 
              message={item} 
              isMe={item.senderId === 'me'} 
            />
          )}
          contentContainerStyle={styles.messagesContainer}
          ListHeaderComponent={
            <MeetupSuggestion 
              place={suggestedPlace} 
              onSend={handleSuggestionSend} 
            />
          }
        />
        
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor={Colors.darkGray}
            value={text}
            onChangeText={setText}
            multiline
          />
          <TouchableOpacity 
            style={styles.sendButton} 
            onPress={handleSend}
            disabled={!text.trim()}
          >
            <Send size={20} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
  },
  headerTitle: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  messagesContainer: {
    padding: 16,
    paddingBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.lightGray,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: Colors.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
    alignSelf: 'flex-end',
  },
});