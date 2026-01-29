import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Platform, Linking, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { X, MapPin, Users, Clock, Calendar, Navigation2 } from 'lucide-react-native';
import { Group } from '@/types';
import { useRouter } from 'expo-router';

interface ActivityDetailsModalProps {
  visible: boolean;
  activity: Group | null;
  onClose: () => void;
  onJoin: () => void;
  onLeave: () => void;
  isUserMember: boolean;
  currentUserId: string;
}

export default function ActivityDetailsModal({ 
  visible, 
  activity, 
  onClose, 
  onJoin, 
  onLeave,
  isUserMember,
  currentUserId
}: ActivityDetailsModalProps) {
  const router = useRouter();
  
  console.log('📱 ActivityDetailsModal RENDER');
  console.log('📱   visible:', visible);
  console.log('📱   activity:', activity?.name);
  console.log('📱   activity object:', activity);
  console.log('📱   isUserMember:', isUserMember);
  
  if (!activity) {
    console.log('📱 ❌ No activity provided, returning null');
    return null;
  }
  
  console.log('📱 ✅ Activity exists, rendering modal');
  
  const isCreator = activity.createdBy === currentUserId;
  
  const handleManageMembers = () => {
    onClose();
    router.push(`/manage-members/${activity.id}`);
  };

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

  const getTimeRemaining = () => {
    const now = new Date();
    const expiry = new Date(activity.expiresAt);
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

  const handleShowDirections = () => {
    const { latitude, longitude } = activity.location;
    const label = encodeURIComponent(activity.name);
    
    // Create URLs for different map apps
    const appleMapsUrl = `maps://app?daddr=${latitude},${longitude}&q=${label}`;
    const googleMapsAppUrl = `comgooglemaps://?daddr=${latitude},${longitude}&directionsmode=driving`;
    const googleMapsWebUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    
    if (Platform.OS === 'ios') {
      // For iOS, try Apple Maps first, then Google Maps app, then Google Maps web
      Linking.canOpenURL(appleMapsUrl).then((canOpenAppleMaps) => {
        if (canOpenAppleMaps) {
          // Apple Maps is installed, use it
          return Linking.openURL(appleMapsUrl);
        } else {
          // Apple Maps not installed, try Google Maps app
          return Linking.canOpenURL(googleMapsAppUrl).then((canOpenGoogleMaps) => {
            if (canOpenGoogleMaps) {
              // Google Maps app is installed, use it
              return Linking.openURL(googleMapsAppUrl);
            } else {
              // Neither app installed, use Google Maps web
              return Linking.openURL(googleMapsWebUrl);
            }
          });
        }
      }).catch((error) => {
        console.log('Error opening maps:', error);
        // Final fallback to Google Maps web
        Linking.openURL(googleMapsWebUrl).catch(() => {
          Alert.alert('Error', 'Unable to open maps application');
        });
      });
    } else {
      // Android: Try Google Maps app first, then web version
      Linking.canOpenURL(googleMapsAppUrl).then((canOpenGoogleMaps) => {
        if (canOpenGoogleMaps) {
          Linking.openURL(googleMapsAppUrl);
        } else {
          // Fallback to Google Maps web
          Linking.openURL(googleMapsWebUrl).catch(() => {
            Alert.alert('Error', 'Unable to open maps application');
          });
        }
      }).catch(() => {
        Linking.openURL(googleMapsWebUrl).catch(() => {
          Alert.alert('Error', 'Unable to open maps application');
        });
      });
    }
  };

  console.log('📱 🎨 About to return Modal JSX, visible prop is:', visible);
  
  return (
    <Modal 
      visible={visible} 
      animationType="slide" 
      transparent={true}
      onRequestClose={onClose}
      onShow={() => console.log('📱 ✨ Modal onShow event fired!')}
      presentationStyle="overFullScreen"
      hardwareAccelerated={true}
    >
      {console.log('📱 🌟 Inside Modal component render')}
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
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
                {/* Mood label removed as requested */}
              </View>

              {/* Details */}
              <View style={styles.detailsContainer}>
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
                    <Text style={styles.detailLabel}>People</Text>
                    <Text style={styles.detailValue}>
                      {activity.members.length} / {activity.maxMembers} joined
                    </Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <Clock size={20} color={Colors.secondary} />
                  <View style={styles.detailText}>
                    <Text style={styles.detailLabel}>Time Remaining</Text>
                    <Text style={styles.detailValue}>{getTimeRemaining()}</Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <Calendar size={20} color={Colors.secondary} />
                  <View style={styles.detailText}>
                    <Text style={styles.detailLabel}>Created</Text>
                    <Text style={styles.detailValue}>
                      {new Date(activity.createdAt).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Show Directions Button */}
              <TouchableOpacity style={styles.directionsButton} onPress={handleShowDirections}>
                <Navigation2 size={20} color={Colors.primary} />
                <Text style={styles.directionsButtonText}>Show Directions</Text>
              </TouchableOpacity>

              {/* View/Manage Members Button - Show for all members */}
              {isUserMember && (
                <TouchableOpacity 
                  style={styles.membersButton} 
                  onPress={handleManageMembers}
                >
                  <Users size={20} color={Colors.white} />
                  <Text style={styles.membersButtonText}>
                    {isCreator ? 'Manage Members' : 'View Members'}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Action Button */}
              {isUserMember ? (
                <TouchableOpacity style={styles.leaveButton} onPress={onLeave}>
                  <Text style={styles.leaveButtonText}>
                    {activity.createdBy === currentUserId ? 'Stop Activity' : 'Leave Activity'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  style={[
                    styles.joinButton,
                    activity.members.length >= activity.maxMembers && styles.joinButtonDisabled
                  ]} 
                  onPress={onJoin}
                  disabled={activity.members.length >= activity.maxMembers}
                >
                  <Text style={styles.joinButtonText}>
                    {activity.members.length >= activity.maxMembers ? 'Activity Full' : 'Join Activity'}
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>
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
    width: '100%',
    height: '100%',
    zIndex: 9999,
    elevation: 9999,
  },
  modalContainer: {
    height: '75%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    backgroundColor: Colors.primary,
    zIndex: 10000,
    elevation: 10000,
  },
  gradient: {
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    padding: 8,
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
  },
  detailsContainer: {
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
  joinButton: {
    backgroundColor: Colors.secondary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  joinButtonDisabled: {
    backgroundColor: Colors.gray,
    opacity: 0.6,
  },
  joinButtonText: {
    color: Colors.black,
    fontSize: 18,
    fontWeight: '800',
  },
  directionsButton: {
    backgroundColor: Colors.secondary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  directionsButtonText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  membersButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  membersButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  leaveButton: {
    backgroundColor: 'rgba(255, 59, 48, 0.9)',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  leaveButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '800',
  },
});

