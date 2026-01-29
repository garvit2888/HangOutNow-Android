import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { User } from '@/types';
import Colors from '@/constants/colors';
import { MessageCircle, Users } from 'lucide-react-native';

type NearbyUserCardProps = {
  user: User;
};

export default function NearbyUserCard({ user }: NearbyUserCardProps) {
  const router = useRouter();
  
  const handlePress = () => {
    router.push(`/chat/${user.id}`);
  };
  
  // Helper function to get mood style
  const getMoodStyle = (mood: string) => {
    switch(mood) {
      case 'coffee':
        return styles.moodcoffee;
      case 'food':
        return styles.moodfood;
      case 'chill':
        return styles.moodchill;
      case 'walk':
        return styles.moodwalk;
      case 'party':
        return styles.moodparty;
      case 'movie':
        return styles.moodmovie;
      default:
        return {};
    }
  };
  
  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        <Image source={{ uri: user.avatar }} style={styles.avatar} />
        {user.isOnline && <View style={styles.onlineIndicator} />}
      </View>
      
      <View style={styles.infoContainer}>
        <Text style={styles.name}>{user.name}</Text>
        
        <View style={styles.detailsContainer}>
          <View style={styles.detail}>
            <Users size={14} color={Colors.darkGray} />
            <Text style={styles.detailText}>
              {user.mutualFriends} mutual
            </Text>
          </View>
          
          <View style={styles.detail}>
            <Text style={styles.detailText}>
              {user.distance} mi away
            </Text>
          </View>
          
          <View style={[styles.moodTag, getMoodStyle(user.mood)]}>
            <Text style={styles.moodText}>
              {user.mood.charAt(0).toUpperCase() + user.mood.slice(1)}
            </Text>
          </View>
        </View>
      </View>
      
      <TouchableOpacity style={styles.chatButton} onPress={handlePress}>
        <MessageCircle size={20} color={Colors.white} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.success,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  infoContainer: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    color: Colors.black,
  },
  detailsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  detail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: Colors.darkGray,
  },
  moodTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: Colors.lightGray,
  },
  moodcoffee: {
    backgroundColor: '#E6C9A8',
  },
  moodfood: {
    backgroundColor: '#FFD0D0',
  },
  moodchill: {
    backgroundColor: '#D0E8FF',
  },
  moodwalk: {
    backgroundColor: '#D0FFD6',
  },
  moodparty: {
    backgroundColor: '#FFB3BA',
  },
  moodmovie: {
    backgroundColor: '#E6B3FF',
  },
  moodText: {
    fontSize: 10,
    fontWeight: '500',
  },
  chatButton: {
    backgroundColor: Colors.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
});