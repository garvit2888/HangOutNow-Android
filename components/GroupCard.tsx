import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Group } from '@/types';
import Colors from '@/constants/colors';
import { Users, MapPin, Clock, MessageCircle } from 'lucide-react-native';

type GroupCardProps = {
  group: Group;
  onJoinGroup?: (groupId: string) => void;
  showJoinButton?: boolean;
  onPress?: () => void;
  currentUserId?: string;
  isMember?: boolean;
};

export default function GroupCard({ group, onJoinGroup, showJoinButton = true, onPress, currentUserId, isMember }: GroupCardProps) {
  const router = useRouter();
  
  const handlePress = () => {
    if (onPress) onPress();
  };

  const handleJoinPress = () => {
    if (onJoinGroup) {
      onJoinGroup(group.id);
    }
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

  // Calculate time remaining
  const getTimeRemaining = () => {
    const now = new Date();
    const expiry = new Date(group.expiresAt);
    const diff = expiry.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m left`;
    } else {
      return `${minutes}m left`;
    }
  };

  const isFull = group.members.length >= group.maxMembers;

  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <LinearGradient
        colors={[Colors.white, Colors.lightGray]}
        style={styles.cardGradient}
      >
        <View style={styles.header}>
          <View style={styles.timeContainer}>
            <Clock size={12} color={Colors.darkGray} />
            <Text style={styles.timeText}>{getTimeRemaining()}</Text>
          </View>
        </View>

        <Text style={styles.groupName}>{group.name}</Text>
        
        <View style={styles.detailsContainer}>
          <View style={styles.detail}>
            <Users size={14} color={Colors.darkGray} />
            <Text style={styles.detailText}>
              {group.members.length}/{group.maxMembers} people
            </Text>
          </View>
          
          <View style={styles.detail}>
            <MapPin size={14} color={Colors.darkGray} />
            <Text style={styles.detailText}>
              {group.distance} mi away
            </Text>
          </View>
        </View>

        {group.meetingLocation && (
          <View style={styles.meetingLocationContainer}>
            <MapPin size={12} color={Colors.primary} />
            <Text style={styles.meetingLocationText}>
              {group.meetingLocation}
            </Text>
          </View>
        )}

        <View style={styles.membersContainer}>
          <Text style={styles.membersLabel}>Members:</Text>
          <View style={styles.memberAvatars}>
            {group.members.slice(0, 4).map((member, index) => (
              <View key={member.id} style={[styles.memberAvatar, { zIndex: 4 - index }]}>
                <Text style={styles.memberInitial}>
                  {member.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            ))}
            {group.members.length > 4 && (
              <View style={styles.memberAvatar}>
                <Text style={styles.memberInitial}>+{group.members.length - 4}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.actionsContainer}>
          {isMember ? (
            <TouchableOpacity style={styles.chatButton} onPress={handlePress}>
              <MessageCircle size={16} color={Colors.white} />
              <Text style={styles.chatButtonText}>View Chat</Text>
            </TouchableOpacity>
          ) : !isFull && showJoinButton ? (
            <TouchableOpacity style={styles.joinButton} onPress={e => { e.stopPropagation?.(); handleJoinPress(); }}>
              <Text style={styles.joinButtonText}>Join Group</Text>
            </TouchableOpacity>
          ) : isFull ? (
            <View style={styles.fullButton}>
              <Text style={styles.fullButtonText}>Group Full</Text>
            </View>
          ) : null}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardGradient: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  moodTag: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
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
    fontSize: 12,
    fontWeight: '600',
    color: Colors.black,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 12,
    color: Colors.darkGray,
    fontWeight: '500',
  },
  groupName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.black,
    marginBottom: 8,
  },
  detailsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
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
  membersContainer: {
    marginBottom: 16,
  },
  membersLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.black,
    marginBottom: 8,
  },
  memberAvatars: {
    flexDirection: 'row',
  },
  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -8,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  memberInitial: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.white,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  chatButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 10,
    gap: 6,
  },
  chatButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  joinButton: {
    flex: 1,
    backgroundColor: Colors.secondary,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  joinButtonText: {
    color: Colors.black,
    fontSize: 14,
    fontWeight: 'bold',
  },
  fullButton: {
    flex: 1,
    backgroundColor: Colors.lightGray,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  fullButtonText: {
    color: Colors.darkGray,
    fontSize: 14,
    fontWeight: '600',
  },
  meetingLocationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 69, 19, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    gap: 6,
  },
  meetingLocationText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
    flex: 1,
  },
});
