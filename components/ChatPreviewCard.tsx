import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChatPreview } from '@/types';
import Colors from '@/constants/colors';
import { User } from 'lucide-react-native';

type ChatPreviewCardProps = {
  chat: ChatPreview;
};

export default function ChatPreviewCard({ chat }: ChatPreviewCardProps) {
  const router = useRouter();

  const handlePress = () => {
    // Route to group chat if it's a group, otherwise to DM chat
    if (chat.isGroupChat) {
      router.push(`/group-chat/${chat.userId}`);
    } else {
      router.push(`/chat/${chat.userId}`);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.round(diffMs / 60000);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h`;
    return `${Math.floor(diffMins / 1440)}d`;
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        {(!chat.avatar || chat.avatar.includes('ui-avatars.com')) ? (
          <View style={[styles.avatar, styles.defaultAvatar]}>
            <User size={24} color="#FFFFFF" fill="#FFFFFF" />
          </View>
        ) : (
          <Image source={{ uri: chat.avatar }} style={styles.avatar} />
        )}
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.headerContainer}>
          <Text style={styles.name}>{chat.name}</Text>
          <Text style={styles.time}>{formatTime(chat.timestamp)}</Text>
        </View>

        <View style={styles.messageContainer}>
          <Text style={styles.message} numberOfLines={1}>
            {chat.lastMessage}
          </Text>

          {chat.unread > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{chat.unread}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  defaultAvatar: {
    backgroundColor: '#dbdbdb', // Light grey like Instagram default
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.black,
    flex: 1,
  },
  time: {
    fontSize: 12,
    color: Colors.darkGray,
  },
  messageContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  message: {
    flex: 1,
    fontSize: 14,
    color: Colors.darkGray,
    marginRight: 8,
  },
  unreadBadge: {
    backgroundColor: Colors.secondary, // Yellow badge for unread
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    paddingHorizontal: 6,
  },
  unreadText: {
    color: Colors.black, // Black text for better contrast on yellow background
    fontSize: 12,
    fontWeight: 'bold',
  },
});