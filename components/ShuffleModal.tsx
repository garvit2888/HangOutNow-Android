import React, { useEffect, useRef, useState } from 'react';
import { 
  Animated, 
  Dimensions, 
  Modal, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View 
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { MessageCircle, X, Shuffle, Users, Zap } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { User } from '@/types';
import { mockUsers } from '@/constants/mockData';
import { useUserStore } from '@/store/userStore';
import { useGroupStore } from '@/store/groupStore';
import { useChatStore } from '@/store/chatStore';
import { differenceInYears } from 'date-fns';

type ShuffleModalProps = {
  visible: boolean;
  onClose: () => void;
};

const { width } = Dimensions.get('window');

export default function ShuffleModal({ visible, onClose }: ShuffleModalProps) {
  const { selectedMood, profile, maxAgeDifference } = useUserStore();
  const { createGroup } = useGroupStore();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isShuffling, setIsShuffling] = useState(true);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const cardPosition = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.8)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const router = useRouter();

  const { loginEmail, profile: currentProfile } = useUserStore();
  const currentUserId = loginEmail || currentProfile?.email || 'current_user_id';
  const currentUserName = currentProfile?.fullName || 'You';
  const currentUserAvatar = (currentProfile as any)?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format';
  const { upsertChatPreview } = useChatStore();

  // Utility to get age from yyyy-mm-dd string
  function getAge(dob?: string): number | undefined {
    if (!dob) return undefined;
    const d = new Date(dob);
    return new Date().getFullYear() - d.getFullYear();
  }

  // Filter only online users with matching mood for shuffling
  useEffect(() => {
    if (visible && selectedMood && profile) {
      setIsShuffling(true);
      setSelectedUser(null);
      const thisAge = getAge(profile.dateOfBirth);
      const matchingUsers = mockUsers.filter(user => {
        if (!user.isOnline || user.mood !== selectedMood) return false;
        if (typeof user.dateOfBirth !== 'string') return true; // fallback: no age data, allow match
        if (!thisAge) return true;
        const thatAge = getAge(user.dateOfBirth);
        if (!thatAge) return true;
        return Math.abs(thisAge - thatAge) <= maxAgeDifference;
      });
      setAvailableUsers(matchingUsers);
      
      // Start with animation values reset
      cardPosition.setValue(width);
      cardScale.setValue(0.8);
      cardOpacity.setValue(0);
      
      // Trigger haptic feedback when modal opens
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Start shuffle animation
      startShuffleAnimation();
    }
  }, [visible, selectedMood, profile, maxAgeDifference]);

  const startShuffleAnimation = () => {
    // Show cards flying in and out rapidly
    const shuffleDuration = 1500; // 1.5 seconds of shuffling
    const cardChanges = 8; // Show 8 different cards during shuffle
    const intervalTime = shuffleDuration / cardChanges;
    
    let count = 0;
    const shuffleInterval = setInterval(() => {
      // Pick a random user for each card
      const randomIndex = Math.floor(Math.random() * availableUsers.length);
      const randomUser = availableUsers[randomIndex];
      setSelectedUser(randomUser);
      
      // Animate card flying in
      Animated.sequence([
        Animated.parallel([
          Animated.timing(cardPosition, {
            toValue: 0,
            duration: intervalTime * 0.5,
            useNativeDriver: true,
          }),
          Animated.timing(cardOpacity, {
            toValue: 1,
            duration: intervalTime * 0.3,
            useNativeDriver: true,
          }),
          Animated.timing(cardScale, {
            toValue: 1,
            duration: intervalTime * 0.5,
            useNativeDriver: true,
          }),
        ]),
        // If not the last card, animate flying out
        count < cardChanges - 1 ? 
          Animated.parallel([
            Animated.timing(cardPosition, {
              toValue: -width,
              duration: intervalTime * 0.5,
              useNativeDriver: true,
            }),
            Animated.timing(cardOpacity, {
              toValue: 0,
              duration: intervalTime * 0.3,
              useNativeDriver: true,
            }),
            Animated.timing(cardScale, {
              toValue: 0.8,
              duration: intervalTime * 0.5,
              useNativeDriver: true,
            }),
          ]) : 
          Animated.delay(0) // No exit animation for final card
      ]).start();
      
      // Reset position for next card
      if (count < cardChanges - 1) {
        setTimeout(() => {
          cardPosition.setValue(width);
        }, intervalTime * 0.6);
      }
      
      count++;
      if (count >= cardChanges) {
        clearInterval(shuffleInterval);
        setIsShuffling(false);
        
        // Final haptic feedback when shuffle completes
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }, intervalTime);
  };

  const handleShuffleAgain = () => {
    setIsShuffling(true);
    
    // Animate current card out
    Animated.parallel([
      Animated.timing(cardPosition, {
        toValue: -width,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(cardScale, {
        toValue: 0.8,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Reset position for next shuffle
      cardPosition.setValue(width);
      
      // Start shuffle animation again
      startShuffleAnimation();
    });
    
    // Trigger haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleCreateGroup = () => {
    if (selectedUser && selectedMood) {
      const groupName = `${selectedMood.charAt(0).toUpperCase() + selectedMood.slice(1)} Meetup`;

      const currentUser = {
        id: currentUserId,
        name: currentUserName,
        avatar: currentUserAvatar,
        location: { latitude: 37.7858, longitude: -122.4064 },
        distance: 0,
        mood: selectedMood,
        mutualFriends: 0,
        isOnline: true,
      };

      const newGroup = createGroup({
        name: groupName,
        mood: selectedMood,
        location: { latitude: 37.7858, longitude: -122.4064 },
        distance: 0,
        members: [currentUser, selectedUser],
        maxMembers: 5,
        createdBy: currentUserId,
        isActive: true,
        isPublic: true,
        meetingLocation: 'TBD',
      });

      // Upsert chat preview so it shows in Messages
      upsertChatPreview({
        id: newGroup.chatId,
        userId: newGroup.id,
        name: newGroup.name,
        avatar: newGroup.groupAvatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(newGroup.name),
        lastMessage: '',
        timestamp: new Date().toISOString(),
        unread: 0,
      });

      onClose();
      router.push(`/group-chat/${newGroup.id}`);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color={Colors.white} />
          </TouchableOpacity>
          
          <Text style={styles.title}>
            {isShuffling ? "Finding someone..." : 
             availableUsers.length === 0 ? "No matches found" : "Found someone!"}
          </Text>
          
          {availableUsers.length > 0 && selectedUser && (
            <Animated.View
              style={[
                styles.cardContainer,
                {
                  transform: [
                    { translateX: cardPosition },
                    { scale: cardScale }
                  ],
                  opacity: cardOpacity
                }
              ]}
            >
              <View style={styles.card}>
                <Image 
                  source={{ uri: selectedUser.avatar }} 
                  style={styles.avatar}
                />
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{selectedUser.name}</Text>
                  <View style={styles.detailsRow}>
                    <Text style={styles.detailText}>
                      {selectedUser.distance} mi away • {selectedUser.mutualFriends} mutual friends
                    </Text>
                  </View>
                  <View style={styles.moodContainer}>
                    <Text style={styles.moodLabel}>In the mood for:</Text>
                    <View style={[styles.moodTag, styles[`mood${selectedUser.mood}`] as any]}>
                      <Text style={styles.moodText}>
                        {selectedUser.mood.charAt(0).toUpperCase() + selectedUser.mood.slice(1)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </Animated.View>
          )}
          
          {!isShuffling && availableUsers.length === 0 && (
            <View style={styles.noMatchContainer}>
              <Text style={styles.noMatchText}>
                No one with the same mood is available right now.
              </Text>
              <Text style={styles.noMatchSubtext}>
                Try again later or create a group to wait for others!
              </Text>
            </View>
          )}
          
          {!isShuffling && selectedUser && availableUsers.length > 0 && (
            <View style={styles.actionsContainer}>
              <TouchableOpacity 
                style={styles.shuffleButton} 
                onPress={handleShuffleAgain}
              >
                <Shuffle size={20} color={Colors.white} />
                <Text style={styles.buttonText}>Shuffle Again</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.createGroupButton} 
                onPress={handleCreateGroup}
              >
                <Users size={20} color={Colors.white} />
                <Text style={styles.buttonText}>Create Group</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: Colors.primary,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  closeButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    zIndex: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 20,
    marginTop: 10,
  },
  cardContainer: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 20,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: 'center',
    marginBottom: 15,
  },
  userInfo: {
    alignItems: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.black,
    marginBottom: 5,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailText: {
    fontSize: 14,
    color: Colors.darkGray,
  },
  moodContainer: {
    alignItems: 'center',
    marginTop: 5,
  },
  moodLabel: {
    fontSize: 14,
    color: Colors.darkGray,
    marginBottom: 5,
  },
  moodTag: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
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
    fontSize: 14,
    fontWeight: '600',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,
  },
  shuffleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.darkPurple,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flex: 1,
    marginRight: 10,
  },
  createGroupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.secondary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flex: 1,
    marginLeft: 10,
  },
  noMatchContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noMatchText: {
    fontSize: 16,
    color: Colors.white,
    textAlign: 'center',
    marginBottom: 8,
  },
  noMatchSubtext: {
    fontSize: 14,
    color: Colors.secondary,
    textAlign: 'center',
    opacity: 0.8,
  },
  buttonText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 8,
  },
});