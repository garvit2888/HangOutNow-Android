import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Message } from '@/types';
import Colors from '@/constants/colors';

type MessageBubbleProps = {
  message: Message;
  isMe: boolean;
};

export default function MessageBubble({ message, isMe }: MessageBubbleProps) {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  return (
    <View style={[
      styles.container,
      isMe ? styles.myMessageContainer : styles.theirMessageContainer
    ]}>
      <View style={[
        styles.bubble,
        isMe ? styles.myBubble : styles.theirBubble
      ]}>
        <Text style={[
          styles.messageText,
          isMe ? styles.myMessageText : styles.theirMessageText
        ]}>
          {message.text}
        </Text>
      </View>
      <Text style={styles.timeText}>
        {formatTime(message.timestamp)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    maxWidth: '80%',
    marginVertical: 4,
    alignItems: 'flex-end',
  },
  myMessageContainer: {
    alignSelf: 'flex-end',
  },
  theirMessageContainer: {
    alignSelf: 'flex-start',
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  myBubble: {
    backgroundColor: Colors.primary,
  },
  theirBubble: {
    backgroundColor: Colors.lightGray,
  },
  messageText: {
    fontSize: 16,
  },
  myMessageText: {
    color: Colors.white,
  },
  theirMessageText: {
    color: Colors.black,
  },
  timeText: {
    fontSize: 10,
    color: Colors.darkGray,
    marginTop: 2,
    marginHorizontal: 4,
  },
});