import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, FlatList, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { X, MapPin, Users, Clock, Calendar } from 'lucide-react-native';
import { useGroupStore } from '@/store/groupStore';
import { useUserStore } from '@/store/userStore';
import { Group } from '@/types';
import { getPastActivities } from '@/services/activityService';

interface PastActivitiesModalProps {
  visible: boolean;
  onClose: () => void;
}

interface ActivityDetailsProps {
  activity: Group;
  onClose: () => void;
}

function ActivityDetails({ activity, onClose }: ActivityDetailsProps) {
  const getMoodEmoji = (mood: string) => {
    const emojis: Record<string, string> = {
      coffee: '☕️',
      food: '🍔',
      chill: '🧘',
      walk: '🚶‍♀️',
      party: '⚽️',
      movie: '🎬',
    };
    return emojis[mood] || '✨';
  };

  return (
    <Modal visible={true} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.detailsOverlay}>
        <View style={styles.detailsContainer}>
          <LinearGradient
            colors={[Colors.primary, Colors.darkPurple]}
            style={styles.gradient}
          >
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={24} color={Colors.white} />
            </TouchableOpacity>

            <ScrollView contentContainerStyle={styles.content}>
              {/* Emoji & Title */}
              <View style={styles.header}>
                <Text style={styles.emojiLarge}>{activity.emoji || getMoodEmoji(activity.mood)}</Text>
                <Text style={styles.activityName}>{activity.name}</Text>
                <Text style={styles.activityMood}>
                  {activity.mood.charAt(0).toUpperCase() + activity.mood.slice(1)} Activity
                </Text>
                <View style={styles.expiredBadge}>
                  <Text style={styles.expiredText}>Completed</Text>
                </View>
              </View>

              {/* Details */}
              <View style={styles.detailsInfoContainer}>
                <View style={styles.detailRow}>
                  <MapPin size={20} color={Colors.secondary} />
                  <View style={styles.detailText}>
                    <Text style={styles.detailLabel}>Location</Text>
                    <Text style={styles.detailValue}>{activity.meetingLocation}</Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <Users size={20} color={Colors.secondary} />
                  <View style={styles.detailText}>
                    <Text style={styles.detailLabel}>Participants</Text>
                    <Text style={styles.detailValue}>
                      {activity.members.length} people joined
                    </Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <Calendar size={20} color={Colors.secondary} />
                  <View style={styles.detailText}>
                    <Text style={styles.detailLabel}>Date</Text>
                    <Text style={styles.detailValue}>
                      {new Date(activity.createdAt).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <Clock size={20} color={Colors.secondary} />
                  <View style={styles.detailText}>
                    <Text style={styles.detailLabel}>Duration</Text>
                    <Text style={styles.detailValue}>
                      Ended {new Date(activity.expiresAt).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Members List */}
              <View style={styles.membersSection}>
                <Text style={styles.membersTitle}>Participants</Text>
                {activity.members.map((member, index) => (
                  <View key={member.id} style={styles.memberItem}>
                    <Text style={styles.memberEmoji}>👤</Text>
                    <Text style={styles.memberName}>{member.name}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

export default function PastActivitiesModal({ visible, onClose }: PastActivitiesModalProps) {
  const { profile, loginEmail } = useUserStore();
  const currentUserId = profile?.uid || loginEmail || '';
  const [selectedActivity, setSelectedActivity] = useState<Group | null>(null);
  const [pastActivities, setPastActivities] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch past activities from Firestore when modal opens
  useEffect(() => {
    if (visible) {
      // Try multiple user identifiers
      const userIdsToTry = [
        profile?.uid,
        profile?.email,
        loginEmail,
        currentUserId
      ].filter(Boolean) as string[];
      
      if (userIdsToTry.length === 0) {
        console.warn('⚠️ No user identifiers available, cannot fetch past activities');
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setPastActivities([]); // Clear previous results
      
      // Try with all possible user identifiers and combine results
      const userIdsToCheck = [
        profile?.uid,
        profile?.email,
        loginEmail
      ].filter(Boolean) as string[];
      
      // Check with all identifiers and combine results
      Promise.all(userIdsToCheck.map(id => getPastActivities(id)))
        .then(results => {
          // Combine and deduplicate results
          const allActivities = results.flat();
          const uniqueActivities = Array.from(
            new Map(allActivities.map(a => [a.id, a])).values()
          );
          setPastActivities(uniqueActivities);
          setLoading(false);
        })
        .catch(error => {
          console.error('❌ Error loading past activities:', error);
          console.error('❌ Error details:', {
            code: error?.code,
            message: error?.message,
            userId: primaryUserId,
            userIdsToTry,
            profile: { uid: profile?.uid, email: profile?.email },
            loginEmail
          });
          setLoading(false);
        });
    } else {
      // Reset when modal closes
      setPastActivities([]);
    }
  }, [visible, currentUserId, profile?.uid, profile?.email, loginEmail]);

  const getMoodEmoji = (mood: string) => {
    const emojis: Record<string, string> = {
      coffee: '☕️',
      food: '🍔',
      chill: '🧘',
      walk: '🚶‍♀️',
      party: '⚽️',
      movie: '🎬',
    };
    return emojis[mood] || '✨';
  };

  if (selectedActivity) {
    return <ActivityDetails activity={selectedActivity} onClose={() => setSelectedActivity(null)} />;
  }

  return (
    <Modal 
      visible={visible} 
      animationType="slide" 
      transparent={true}
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={[Colors.primary, Colors.darkPurple]}
            style={styles.gradient}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.title}>Past Activities</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <X size={24} color={Colors.white} />
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={styles.emptyContainer}>
                <ActivityIndicator size="large" color={Colors.secondary} />
                <Text style={styles.emptyText}>Loading past activities...</Text>
              </View>
            ) : pastActivities.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No past activities yet</Text>
                <Text style={styles.emptySubtext}>
                  Activities you join will appear here after they end
                </Text>
              </View>
            ) : (
              <FlatList
                data={pastActivities}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContainer}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.activityCard}
                    onPress={() => setSelectedActivity(item)}
                  >
                    <View style={styles.cardLeft}>
                      <Text style={styles.cardEmoji}>{item.emoji || getMoodEmoji(item.mood)}</Text>
                      <View style={styles.cardInfo}>
                        <Text style={styles.cardName}>{item.name}</Text>
                        <Text style={styles.cardLocation}>{item.meetingLocation}</Text>
                        <Text style={styles.cardDate}>
                          {new Date(item.createdAt || item.expiresAt).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.cardRight}>
                      <Text style={styles.cardMembers}>{item.members.length} 👥</Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    height: '85%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  gradient: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.white,
  },
  closeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    padding: 8,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  activityCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardEmoji: {
    fontSize: 40,
    marginRight: 16,
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 4,
  },
  cardLocation: {
    fontSize: 14,
    color: Colors.secondary,
    marginBottom: 2,
  },
  cardDate: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  cardRight: {
    alignItems: 'flex-end',
  },
  cardMembers: {
    fontSize: 16,
    color: Colors.white,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.white,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  
  // Activity Details Styles
  detailsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  detailsContainer: {
    height: '85%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  content: {
    padding: 24,
    paddingTop: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  emojiLarge: {
    fontSize: 64,
    marginBottom: 16,
  },
  activityName: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.white,
    textAlign: 'center',
    marginBottom: 8,
  },
  activityMood: {
    fontSize: 16,
    color: Colors.secondary,
    fontWeight: '600',
    marginBottom: 12,
  },
  expiredBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.5)',
  },
  expiredText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '700',
  },
  detailsInfoContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  detailText: {
    marginLeft: 16,
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.secondary,
    fontWeight: '600',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: Colors.white,
    fontWeight: '500',
  },
  membersSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
  },
  membersTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 16,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  memberEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  memberName: {
    fontSize: 16,
    color: Colors.white,
    fontWeight: '500',
  },
});


