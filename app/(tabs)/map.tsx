import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform, Linking, Modal, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { useGroupStore } from '@/store/groupStore';
import { useUserStore } from '@/store/userStore';
import { useChatStore } from '@/store/chatStore';
import { useNotificationStore } from '@/store/notificationStore';
import { Group } from '@/types';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MapPin, Clock, Users as UsersIcon, Navigation, Bell, List, RefreshCw } from 'lucide-react-native';
import { mockGroups } from '@/constants/mockData';
import ActivityCreateModal from '@/components/ActivityCreateModal';
import ActivityDetailsModal from '@/components/ActivityDetailsModal';
import * as Location from 'expo-location';
import { subscribeToActivities, getActiveActivities, joinActivity as joinActivityFirestore, leaveActivity as leaveActivityFirestore, deleteActivity } from '@/services/activityService';

import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

const moodEmoji: Record<string, string> = {
  coffee: '☕️',
  food: '🍔',
  chill: '🧘',
  walk: '🚶‍♀️',
  party: '⚽️',
  movie: '🎬'
};

const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#1d1d1d' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#f5f5f5' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1d1d1d' }] },
  {
    featureType: 'administrative',
    elementType: 'geometry',
    stylers: [{ color: '#3a3a3a' }],
  },
  {
    featureType: 'poi',
    elementType: 'geometry',
    stylers: [{ color: '#2a2a2a' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#b7b7b7' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#243b2f' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#2c2c2c' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#101010' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#3a3a3a' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1f1f1f' }],
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#242424' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#0d1626' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#4e6c9b' }],
  },
];

// Helper function to calculate age from date of birth
const getAge = (dob?: string): number | undefined => {
  if (!dob) return undefined;

  try {
    // Handle DD/MM/YYYY format (from onboarding)
    if (dob.includes('/')) {
      const parts = dob.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
        const year = parseInt(parts[2], 10);

        if (isNaN(day) || isNaN(month) || isNaN(year)) {
          return undefined;
        }

        const date = new Date(year, month, day);
        if (isNaN(date.getTime())) {
          return undefined;
        }

        const now = new Date();
        let age = now.getFullYear() - date.getFullYear();
        const m = now.getMonth() - date.getMonth();

        // Adjust age if birthday hasn't occurred this year
        if (m < 0 || (m === 0 && now.getDate() < date.getDate())) {
          age--;
        }

        // Validate age is reasonable (between 0 and 150)
        if (age < 0 || age > 150) {
          return undefined;
        }

        return age;
      }
    }

    // Try parsing as ISO date string (fallback)
    const date = new Date(dob);
    if (isNaN(date.getTime())) {
      return undefined;
    }

    const now = new Date();
    let age = now.getFullYear() - date.getFullYear();
    const m = now.getMonth() - date.getMonth();

    if (m < 0 || (m === 0 && now.getDate() < date.getDate())) {
      age--;
    }

    if (age < 0 || age > 150) {
      return undefined;
    }

    return age;
  } catch (error) {
    console.error('❌ Error calculating age:', error, 'DOB:', dob);
    return undefined;
  }
};

export default function MapTab() {
  const router = useRouter();
  const mapProvider = Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined;
  const mapType = Platform.OS === 'ios' ? 'mutedStandard' : 'standard';
  const { activeGroups, setActiveGroups, clearActiveGroups, joinGroup, currentUserActiveGroupId } = useGroupStore();
  const { loginEmail, profile, maxAgeDifference, sos, requestSOSModal } = useUserStore();
  const { upsertChatPreview, saveUserChatsToFirestore } = useChatStore();
  const { unreadCount, addNotification, markAllAsRead } = useNotificationStore();

  const currentUserId = profile?.uid || loginEmail || 'current_user_id';
  const currentUserName = profile?.fullName || 'You';
  const currentUserAvatar = (profile as any)?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format';

  const [selectedActivity, setSelectedActivity] = useState<Group | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showListView, setShowListView] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [initialRegion, setInitialRegion] = useState({
    latitude: 37.7858,
    longitude: -122.4064,
    latitudeDelta: 0.06,
    longitudeDelta: 0.06,
  });
  const mapRef = useRef<MapView>(null);

  // Refresh activities from Firestore
  const refreshActivities = async () => {
    try {
      setIsRefreshing(true);
      console.log('🔄 Manually refreshing activities...');

      // Clear current activities
      clearActiveGroups();

      // Reload from Firestore
      const activities = await getActiveActivities();
      setActiveGroups(activities);

      console.log(`✅ Refreshed ${activities.length} activities`);
    } catch (error) {
      console.error('❌ Error refreshing activities:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Track previous activity states for detecting changes (member joins/leaves, new activities)
  const previousActivitiesRef = useRef<Map<string, { members: any[], createdAt: string }>>(new Map());

  // Load activities from Firestore on mount and subscribe to real-time updates
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const loadAndSubscribe = async () => {
      try {
        // Only proceed if user is authenticated
        if (!currentUserId || currentUserId === 'current_user_id') {
          console.log('⚠️ User not authenticated, skipping activity subscription');
          return;
        }

        console.log('🔥 Loading activities from Firestore for user:', currentUserId);

        // Initial load
        const activities = await getActiveActivities();

        // Initialize previous activities map
        activities.forEach(activity => {
          previousActivitiesRef.current.set(activity.id, {
            members: [...activity.members],
            createdAt: activity.createdAt,
          });
        });

        setActiveGroups(activities);
        console.log(`✅ Loaded ${activities.length} activities from Firestore`);

        // Subscribe to real-time updates
        unsubscribe = subscribeToActivities((updatedActivities) => {
          console.log(`🔄 Real-time update: ${updatedActivities.length} activities`);

          // Detect changes and create notifications
          updatedActivities.forEach(activity => {
            const isUserMember = activity.members.some(m => m.id === currentUserId || m.email === currentUserId);
            const previousActivity = previousActivitiesRef.current.get(activity.id);

            if (previousActivity) {
              // Check for member changes
              const previousMemberIds = new Set(
                previousActivity.members.map(m => m.id || m.email).filter(Boolean)
              );
              const currentMemberIds = new Set(
                activity.members.map(m => m.id || m.email).filter(Boolean)
              );

              // Find new members (joined)
              const newMemberIds = Array.from(currentMemberIds).filter(id => !previousMemberIds.has(id));
              // Find removed members (left)
              const removedMemberIds = Array.from(previousMemberIds).filter(id => !currentMemberIds.has(id));

              // Only notify if user is a member of this activity
              if (isUserMember) {
                // Notify about new members (excluding self)
                newMemberIds.forEach(async (newMemberId) => {
                  if (newMemberId !== currentUserId) {
                    const newMember = activity.members.find(m => (m.id || m.email) === newMemberId);
                    if (newMember) {
                      // In-app notification
                      addNotification({
                        type: 'member_joined',
                        activityId: activity.id,
                        activityName: activity.name,
                        activityEmoji: activity.emoji,
                        title: 'Someone joined your activity',
                        description: `${newMember.name || 'Someone'} joined ${activity.name}`,
                        userId: newMemberId,
                        userName: newMember.name,
                      });

                      // Push notification
                      try {
                        const { notifyMemberJoined } = require('@/services/pushNotificationService');
                        await notifyMemberJoined(
                          activity.name,
                          newMember.name || 'Someone',
                          activity.id,
                          activity.emoji
                        );
                      } catch (err) {
                        console.error('Error sending join push notification:', err);
                      }
                    }
                  }
                });

                // Notify about members who left (excluding self)
                removedMemberIds.forEach(async (removedMemberId) => {
                  if (removedMemberId !== currentUserId) {
                    const previousMember = previousActivity.members.find(m => (m.id || m.email) === removedMemberId);
                    if (previousMember) {
                      // In-app notification
                      addNotification({
                        type: 'member_left',
                        activityId: activity.id,
                        activityName: activity.name,
                        activityEmoji: activity.emoji,
                        title: 'Someone left your activity',
                        description: `${previousMember.name || 'Someone'} left ${activity.name}`,
                        userId: removedMemberId,
                        userName: previousMember.name,
                      });

                      // Push notification
                      try {
                        const { notifyMemberLeft } = require('@/services/pushNotificationService');
                        await notifyMemberLeft(
                          activity.name,
                          previousMember.name || 'Someone',
                          activity.id,
                          activity.emoji
                        );
                      } catch (err) {
                        console.error('Error sending leave push notification:', err);
                      }
                    }
                  }
                });

                // Check if activity is getting popular (reached 5 members)
                if (activity.members.length >= 5 && previousActivity.members.length < 5) {
                  addNotification({
                    type: 'activity_popular',
                    activityId: activity.id,
                    activityName: activity.name,
                    activityEmoji: activity.emoji,
                    title: `${activity.name} is getting popular!`,
                    description: `${activity.members.length} people have joined this activity`,
                  });
                }
              }

              // Update stored previous state
              previousActivitiesRef.current.set(activity.id, {
                members: [...activity.members],
                createdAt: activity.createdAt,
              });
            } else {
              // New activity - check if user is a member or if it's nearby
              if (!isUserMember) {
                // Could add notification for new nearby activities, but let's skip for now to avoid spam
                // Only notify about activities user might be interested in
              }

              // Store initial state
              previousActivitiesRef.current.set(activity.id, {
                members: [...activity.members],
                createdAt: activity.createdAt,
              });
            }
          });

          // Remove activities that no longer exist
          const currentActivityIds = new Set(updatedActivities.map(a => a.id));
          previousActivitiesRef.current.forEach((_, activityId) => {
            if (!currentActivityIds.has(activityId)) {
              previousActivitiesRef.current.delete(activityId);
            }
          });

          console.log('📋 Updated activities:', updatedActivities.map(a => ({
            id: a.id,
            name: a.name,
            members: a.members.length,
            memberIds: a.members.map(m => m.id)
          })));

          setActiveGroups(updatedActivities);
        });

      } catch (error) {
        console.error('❌ Error loading activities:', error);
        // Fallback to mock data if Firestore fails
        if (activeGroups.length === 0) {
          console.log('⚠️ Falling back to mock data');
          setActiveGroups(mockGroups);
        }
      }
    };

    loadAndSubscribe();

    // Cleanup subscription on unmount
    return () => {
      if (unsubscribe) {
        console.log('🧹 Unsubscribing from activity updates');
        unsubscribe();
      }
    };
  }, [currentUserId]); // Run when user authentication changes

  // Update chat previews only for groups the user is actually a member of
  // But don't overwrite last message - let the group chat screen handle message updates
  // This effect just ensures the chat exists in the list
  useEffect(() => {
    activeGroups.forEach(group => {
      // Only create chat preview if user is actually a member
      const isUserMember = group.members.some(m => m.id === currentUserId || m.email === currentUserId);
      if (isUserMember) {
        // Only create if it doesn't exist, don't overwrite existing preview
        // Check both by activity ID and by chatId to handle any edge cases
        const { chats } = useChatStore.getState();
        const existingChatById = chats.find(c => c.id === group.id);
        const existingChatByChatId = group.chatId ? chats.find(c => c.id === group.chatId) : null;

        // Don't create if a chat preview already exists (checking both ID formats for safety)
        if (!existingChatById && !existingChatByChatId) {
          // Create initial preview without overwriting last message
          upsertChatPreview({
            id: group.id, // Use activity ID consistently (matches ActivityCreateModal now)
            userId: group.id,
            name: group.name,
            avatar: group.groupAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(group.name)}&background=random`,
            lastMessage: 'No messages yet',
            timestamp: new Date().toISOString(),
            unread: 0,
            isGroupChat: true,
          });
        } else if (existingChatByChatId && !existingChatById) {
          // Edge case: If we have a chat preview with chatId but not with activity ID,
          // remove the old one and create the new one with consistent ID
          console.log('🔧 Migrating chat preview from chatId to activity ID for:', group.name);
          const { chats: currentChats } = useChatStore.getState();
          const cleanedChats = currentChats.filter(c => c.id !== group.chatId);
          useChatStore.setState({ chats: cleanedChats });
          upsertChatPreview({
            id: group.id,
            userId: group.id,
            name: group.name,
            avatar: group.groupAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(group.name)}&background=random`,
            lastMessage: existingChatByChatId.lastMessage || 'No messages yet',
            timestamp: existingChatByChatId.timestamp || new Date().toISOString(),
            unread: existingChatByChatId.unread || 0,
            isGroupChat: true,
          });
        }
      }
    });
  }, [activeGroups, currentUserId]);

  // Get user's current location on mount
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({});
          const newRegion = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.06,
            longitudeDelta: 0.06,
          };
          setInitialRegion(newRegion);
          mapRef.current?.animateToRegion(newRegion, 1000);
        }
      } catch (error) {
        console.log('Error getting location:', error);
      }
    })();
  }, []);

  const handleMyLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please enable location permissions to use this feature.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      mapRef.current?.animateToRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }, 1000);
    } catch (error) {
      Alert.alert('Error', 'Could not get your location. Please try again.');
    }
  };

  const now = new Date();
  const groups = activeGroups.filter(g => {
    const expiresAt = new Date(g.expiresAt);
    const isExpired = expiresAt <= now;
    if (isExpired) {
      console.log(`⏰ Filtering out expired activity: ${g.name} (expired at ${expiresAt.toISOString()})`);
    }
    return !isExpired;
  });

  console.log(`🗺️ Map showing ${groups.length} non-expired activities out of ${activeGroups.length} total activities`);

  const openInMaps = async (lat: number, lng: number) => {
    if (Platform.OS === 'ios') {
      // iOS: Try Apple Maps first, then Google Maps app, then Google Maps web
      const appleMapsUrl = `maps://app?daddr=${lat},${lng}`;
      const googleMapsAppUrl = `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`;
      const googleMapsWebUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

      try {
        // Check if Apple Maps is available
        const canOpenAppleMaps = await Linking.canOpenURL(appleMapsUrl);
        if (canOpenAppleMaps) {
          await Linking.openURL(appleMapsUrl);
          return;
        }

        // If Apple Maps not available, try Google Maps app
        const canOpenGoogleMaps = await Linking.canOpenURL(googleMapsAppUrl);
        if (canOpenGoogleMaps) {
          await Linking.openURL(googleMapsAppUrl);
          return;
        }

        // Fallback to Google Maps web
        await Linking.openURL(googleMapsWebUrl);
      } catch (error) {
        console.error('Error opening maps:', error);
        // Final fallback to Google Maps web
        await Linking.openURL(googleMapsWebUrl);
      }
    } else {
      // Android: Try Google Maps app first, then web
      const googleMapsAppUrl = `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`;
      const googleMapsWebUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

      try {
        const canOpenGoogleMaps = await Linking.canOpenURL(googleMapsAppUrl);
        if (canOpenGoogleMaps) {
          await Linking.openURL(googleMapsAppUrl);
        } else {
          await Linking.openURL(googleMapsWebUrl);
        }
      } catch (error) {
        console.error('Error opening maps:', error);
        await Linking.openURL(googleMapsWebUrl);
      }
    }
  };

  const handleMarkerPress = (group: Group) => {
    console.log('🎯 MARKER PRESSED:', group.name);
    console.log('🎯 Group object:', group);
    console.log('🎯 Before setState - showDetails:', showDetails, 'selectedActivity:', selectedActivity?.name);

    setSelectedActivity(group);
    setShowDetails(true);

    // Verify state after a small delay
    setTimeout(() => {
      console.log('🎯 After setState - showDetails should be true, selectedActivity should be:', group.name);
    }, 100);
  };

  const handleJoinActivity = async () => {
    if (!selectedActivity) return;

    const isMember = selectedActivity.members.some(m => m.id === currentUserId || m.email === currentUserId);
    console.log('🔍 Checking if user is member:', {
      currentUserId,
      members: selectedActivity.members.map(m => ({ id: m.id, email: m.email })),
      isMember
    });

    if (isMember) {
      console.log('✅ User is already a member, going to chat');
      router.push(`/group-chat/${selectedActivity.id}`);
      setShowDetails(false);
      return;
    }

    // Check if user is already in ANY activity (using actual Firestore data, not local state)
    const userInAnyActivity = activeGroups.some(group =>
      group.members.some(m => m.id === currentUserId || m.email === currentUserId)
    );

    if (userInAnyActivity) {
      Alert.alert('Already in an activity', 'You can only join one activity at a time. Leave your current activity before joining another.');
      return;
    }

    if (selectedActivity.members.length >= selectedActivity.maxMembers) {
      Alert.alert('Activity Full', 'This activity has reached its maximum capacity.');
      return;
    }

    try {
      // Sync with Firestore first
      console.log('🔍 Attempting to join activity with ID:', selectedActivity.id);
      console.log('🔍 Selected activity details:', {
        id: selectedActivity.id,
        name: selectedActivity.name,
        members: selectedActivity.members.length
      });
      console.log('👤 User details for join:', {
        id: currentUserId,
        idType: typeof currentUserId,
        name: currentUserName,
        avatar: currentUserAvatar,
        profileUid: profile?.uid,
        loginEmail: loginEmail
      });

      try {
        console.log('🔍 Joining activity with user data:', {
          id: currentUserId,
          name: currentUserName,
          avatar: currentUserAvatar,
          email: currentUserId,
        });
        await joinActivityFirestore(selectedActivity.id, {
          id: currentUserId,
          name: currentUserName,
          avatar: currentUserAvatar,
          email: currentUserId,
          dateOfBirth: profile?.dateOfBirth,
        });
        console.log('✅ Successfully joined activity in Firestore');
      } catch (error) {
        console.error('❌ Error joining activity in Firestore:', error);
        throw error;
      }

      // Wait a moment for Firestore to update
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Update selectedActivity to reflect the new member
      const updatedSelectedActivity = {
        ...selectedActivity,
        members: [
          ...selectedActivity.members,
          {
            id: currentUserId,
            name: currentUserName,
            avatar: currentUserAvatar,
            email: currentUserId,
            location: selectedActivity.location,
            distance: 0,
            mood: selectedActivity.mood,
            mutualFriends: 0,
            isOnline: true,
          }
        ]
      };
      setSelectedActivity(updatedSelectedActivity);

      // Create chat preview - it will be updated with actual messages by the group-chat screen
      // or by background listeners when messages arrive
      upsertChatPreview({
        id: selectedActivity.id, // Use activity ID consistently
        userId: selectedActivity.id,
        name: selectedActivity.name,
        avatar: selectedActivity.groupAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedActivity.name)}&background=random`,
        lastMessage: 'No messages yet',
        timestamp: new Date().toISOString(),
        unread: 0,
        isGroupChat: true,
      });

      // Save to Firestore for persistence
      await saveUserChatsToFirestore(currentUserId);

      console.log('✅ Successfully joined activity, redirecting to chat...');
      setShowDetails(false);
      router.push(`/group-chat/${selectedActivity.id}?justJoined=true`);
    } catch (error) {
      console.error('❌ Error joining activity:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack
      });
      Alert.alert('Error', `Failed to join activity: ${error.message}`);
    }
  };

  const handleLeaveActivity = () => {
    if (!selectedActivity) return;

    const isCreator = selectedActivity.createdBy === currentUserId;
    const title = isCreator ? 'Stop Activity' : 'Leave Activity';
    const message = isCreator
      ? 'Are you sure you want to stop this activity? It will be removed from the map and you can create a new one.'
      : 'Are you sure you want to leave this activity?';
    const buttonText = isCreator ? 'Stop' : 'Leave';
    const successMessage = isCreator ? 'Activity stopped successfully. You can now create a new activity!' : 'You have left the activity';

    Alert.alert(
      title,
      message,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: buttonText,
          style: 'destructive',
          onPress: async () => {
            try {
              if (isCreator) {
                // Creator stops the activity - remove it from Firestore and local
                await deleteActivity(selectedActivity.id);
                console.log('🛑 Creator stopped activity in Firestore:', selectedActivity.name);

                const { stopActivity } = useGroupStore.getState();
                stopActivity(selectedActivity.id, currentUserId);
              } else {
                // Member leaves - remove from Firestore and local
                await leaveActivityFirestore(selectedActivity.id, currentUserId);
                console.log('👋 Member left activity in Firestore:', selectedActivity.name);

                const { leaveGroup } = useGroupStore.getState();
                leaveGroup(selectedActivity.id, currentUserId);
              }
              setShowDetails(false);
              Alert.alert(title, successMessage);
            } catch (error) {
              console.error('❌ Error leaving/stopping activity:', error);
              Alert.alert('Error', 'Failed to perform action. Please try again.');
            }
          },
        },
      ]
    );
  };

  // Helper function to calculate distance between two points (Haversine formula)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Filter groups within 5km radius and age range
  const nearbyGroups = groups.filter(g => {
    const distance = calculateDistance(
      initialRegion.latitude,
      initialRegion.longitude,
      g.location.latitude,
      g.location.longitude
    );

    // First check distance
    if (distance > 5) return false;

    // Then check age difference if available
    const currentUserAge = getAge(profile?.dateOfBirth);
    if (!currentUserAge) return true; // No age data for user, show all activities

    // Check if any member in the activity is within age range
    const hasMemberInAgeRange = g.members.some(member => {
      const memberAge = getAge((member as any).dateOfBirth);
      if (!memberAge) return true; // No age data for member, allow it
      return Math.abs(currentUserAge - memberAge) <= maxAgeDifference;
    });

    return hasMemberInAgeRange;
  });

  return (
    <>
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.primary }}>
        <LinearGradient colors={[Colors.primary, Colors.darkPurple]} style={styles.container}>
          {/* Header */}
          <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View>
              <Text style={{ color: Colors.white, fontSize: 24, fontWeight: '800' }}>Ready to</Text>
              <Text style={{ color: Colors.secondary, fontSize: 32, fontWeight: '900' }}>hang out?</Text>
            </View>

            {/* Header Buttons */}
            <View style={styles.headerButtons}>
              {/* Refresh Button */}
              <TouchableOpacity
                style={styles.refreshButton}
                onPress={refreshActivities}
                disabled={isRefreshing}
              >
                <RefreshCw
                  size={20}
                  color={Colors.white}
                  style={isRefreshing ? { transform: [{ rotate: '180deg' }] } : {}}
                />
              </TouchableOpacity>

              {/* Notifications Bell */}
              <TouchableOpacity
                style={styles.notificationBell}
                onPress={() => {
                  // Clear notification count when bell is tapped
                  if (unreadCount > 0) {
                    markAllAsRead();
                  }
                  router.push('/notifications');
                }}
              >
                <Bell size={24} color={Colors.white} />
                {/* Notification Badge */}
                {unreadCount > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationBadgeText}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Map */}
          <View style={styles.mapContainer}>
            <MapView
              ref={mapRef}
              provider={mapProvider}
              style={{ flex: 1 }}
              initialRegion={initialRegion}
              showsUserLocation
              mapType={mapType}
              userInterfaceStyle={Platform.OS === 'ios' ? 'dark' : undefined}
              customMapStyle={Platform.OS === 'android' ? darkMapStyle : undefined}
            >
              {groups
                .filter((g, index, self) =>
                  // Remove duplicates by keeping only the first occurrence of each ID
                  index === self.findIndex(activity => activity.id === g.id)
                )
                .map((g) => {
                  const participantCount = g.members.length;
                  const isPopular = participantCount >= 3;
                  // Use custom emoji if available, otherwise fall back to mood emoji
                  const displayEmoji = g.emoji || moodEmoji[g.mood] || '📍';

                  // Get first 3 members to show their avatars
                  const visibleMembers = g.members.slice(0, 3);

                  return (
                    <Marker
                      key={g.id}
                      coordinate={g.location}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleMarkerPress(g);
                      }}
                    >
                      <View style={styles.markerContainer}>
                        <View style={[styles.markerPill, isPopular && styles.markerPillPopular]}>
                          <Text
                            style={[styles.markerEmoji, isPopular && styles.markerEmojiPopular]}
                            allowFontScaling={false}
                          >
                            {displayEmoji}
                          </Text>
                        </View>

//                         {/* TEMPORARILY DISABLED - Avatar rendering causes Android clipping
// {/* Profile pictures around the emoji */}
//                         {visibleMembers.map((member, index) => {
//                           // Position avatars around the circle
//                           const angle = (index * 120) - 90; // 120° apart, starting from top
//                           const radius = 25; // Distance from center (increased to prevent overlap)
//                           const x = Math.cos(angle * Math.PI / 180) * radius;
//                           const y = Math.sin(angle * Math.PI / 180) * radius;
// 
//                           return (
//                             <View
//                               key={member.id}
//                               style={[
//                                 styles.memberAvatar,
//                                 {
//                                   left: x + 35, // Center offset (container width 70 / 2)
//                                   top: y + 35,  // Center offset (container height 70 / 2)
//                                 }
//                               ]}
//                             >
//                               <Image
//                                 source={{ uri: member.avatar }}
//                                 style={styles.memberAvatarImage}
//                               />
//                             </View>
//                           );
                        })}
*/}
                      </View>
                    </Marker>
                  );
                })}
            </MapView>

            {/* List View Button */}
            <TouchableOpacity style={styles.listViewButton} onPress={() => setShowListView(true)}>
              <List size={22} color={Colors.primary} />
              {nearbyGroups.length > 0 && (
                <View style={styles.listBadge}>
                  <Text style={styles.listBadgeText}>{nearbyGroups.length}</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* My Location Button */}
            <TouchableOpacity style={styles.myLocationButton} onPress={handleMyLocation}>
              <Navigation size={22} color={Colors.primary} />
            </TouchableOpacity>

            {/* Floating + */}
            <TouchableOpacity style={styles.fab} onPress={() => setShowCreate(true)}>
              <Text style={styles.fabPlus}>+</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </SafeAreaView>

      {/* List View Modal */}
      <Modal
        visible={showListView}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowListView(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.listModalContainer}>
            <View style={styles.listModalHeader}>
              <Text style={styles.listModalTitle}>Activities Nearby (5km)</Text>
              <TouchableOpacity onPress={() => setShowListView(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.listModalScroll} showsVerticalScrollIndicator={false}>
              {nearbyGroups.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No activities nearby</Text>
                  <Text style={styles.emptyStateSubtext}>Be the first to create one!</Text>
                </View>
              ) : (
                nearbyGroups.map(g => {
                  const displayEmoji = g.emoji || moodEmoji[g.mood] || '📍';
                  const distance = calculateDistance(
                    initialRegion.latitude,
                    initialRegion.longitude,
                    g.location.latitude,
                    g.location.longitude
                  );
                  return (
                    <View key={g.id} style={styles.listCard}>
                      <View style={styles.listCardHeader}>
                        <View style={styles.listCardRow}>
                          <Text style={styles.listCardEmoji}>{displayEmoji}</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.listCardName}>{g.name}</Text>
                            <Text style={styles.listCardMood}>{g.mood.charAt(0).toUpperCase() + g.mood.slice(1)}</Text>
                          </View>
                        </View>
                      </View>

                      <View style={styles.listCardInfo}>
                        <View style={styles.listCardInfoRow}>
                          <UsersIcon size={14} color={Colors.darkGray} />
                          <Text style={styles.listCardMeta}>{g.members.length}/{g.maxMembers} people</Text>
                        </View>
                        <View style={styles.listCardInfoRow}>
                          <MapPin size={14} color={Colors.darkGray} />
                          <Text style={styles.listCardMeta}>{distance.toFixed(1)} km away</Text>
                        </View>
                        <View style={styles.listCardInfoRow}>
                          <Clock size={14} color={Colors.darkGray} />
                          <Text style={styles.listCardMeta}>
                            {Math.max(1, Math.floor((new Date(g.expiresAt).getTime() - now.getTime()) / 60000))}m left
                          </Text>
                        </View>
                      </View>

                      <View style={styles.listCardActions}>
                        <TouchableOpacity
                          style={styles.listCardSecondaryBtn}
                          onPress={() => openInMaps(g.location.latitude, g.location.longitude)}
                        >
                          <Text style={styles.listCardSecondaryText}>Directions</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.listCardPrimaryBtn}
                          onPress={() => {
                            setShowListView(false);
                            handleMarkerPress(g);
                          }}
                        >
                          <Text style={styles.listCardPrimaryText}>View Details</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modals rendered outside SafeAreaView for proper z-index */}
      <ActivityCreateModal visible={showCreate} onClose={() => setShowCreate(false)} />

      {console.log('🔍 RENDERING ActivityDetailsModal - visible:', showDetails, 'activity:', selectedActivity?.name, 'activityObj:', selectedActivity)}

      <ActivityDetailsModal
        visible={showDetails}
        activity={selectedActivity}
        onClose={() => {
          console.log('🚪 CLOSING modal');
          setShowDetails(false);
        }}
        onJoin={handleJoinActivity}
        onLeave={handleLeaveActivity}
        isUserMember={selectedActivity ? selectedActivity.members.some(m => m.id === currentUserId || m.email === currentUserId) : false}
        currentUserId={currentUserId}
      />

      {/* Floating SOS button when a started activity exists and modal was closed */}
      {sos?.active && (
        <TouchableOpacity
          onPress={() => requestSOSModal()}
          style={styles.floatingSOS}
          activeOpacity={0.9}
        >
          <LinearGradient colors={["#FF3B30", "#FF1744"]} style={styles.floatingSOSInner}>
            <Text style={styles.floatingSOSText}>SOS</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}

    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mapContainer: { flex: 1, marginHorizontal: 8, marginBottom: 8, borderRadius: 20, overflow: 'hidden', backgroundColor: Colors.white, position: 'relative' },
  markerContainer: { width: 50, height: 50, alignItems: 'center', justifyContent: 'center' },
  markerPill: { backgroundColor: Colors.white, width: 46, height: 46, borderRadius: 23, borderWidth: 2, borderColor: '#333', justifyContent: 'center', alignItems: 'center' },
  floatingSOS: { position: 'absolute', left: 16, bottom: 170, width: 56, height: 56, borderRadius: 28, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 4 }, elevation: 8, zIndex: 9999 },
  floatingSOSInner: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  floatingSOSText: { color: Colors.white, fontWeight: '900', letterSpacing: 1, fontSize: 14 },
  markerPillPopular: { width: 52, height: 52, borderRadius: 26, borderWidth: 3, borderColor: Colors.secondary },
  markerEmoji: { fontSize: 28, textAlign: 'center' },
  markerEmojiPopular: { fontSize: 32 },
  memberAvatar: { position: 'absolute', width: 18, height: 18, borderRadius: 9, overflow: 'hidden', borderWidth: 2, borderColor: Colors.white, backgroundColor: Colors.white, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.3, shadowRadius: 2, elevation: 3 },
  memberAvatarImage: { width: '100%', height: '100%', borderRadius: 7 },
  listViewButton: { position: 'absolute', bottom: 162, right: 16, width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
  listBadge: { position: 'absolute', top: -2, right: -2, backgroundColor: Colors.secondary, borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.white },
  listBadgeText: { color: Colors.black, fontSize: 12, fontWeight: '800' },
  myLocationButton: { position: 'absolute', bottom: 100, right: 16, width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
  fab: { position: 'absolute', bottom: 30, right: 16, width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.secondary, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 6 },
  fabPlus: { color: Colors.black, fontSize: 30, lineHeight: 30, fontWeight: '900' },
  headerButtons: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  refreshButton: { padding: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)' },
  notificationBell: { position: 'relative', padding: 8 },
  notificationBadge: { position: 'absolute', top: 2, right: 2, backgroundColor: Colors.secondary, borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  notificationBadgeText: { color: Colors.black, fontSize: 12, fontWeight: '800' },
  // List Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  listModalContainer: { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%', paddingBottom: 20 },
  listModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: Colors.lightGray },
  listModalTitle: { fontSize: 20, fontWeight: '800', color: Colors.black },
  closeButton: { fontSize: 28, color: Colors.darkGray, fontWeight: '300' },
  listModalScroll: { padding: 20 },
  listCard: { backgroundColor: Colors.lightGray, borderRadius: 16, padding: 16, marginBottom: 16 },
  listCardHeader: { marginBottom: 12 },
  listCardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  listCardEmoji: { fontSize: 32 },
  listCardName: { fontSize: 18, fontWeight: '700', color: Colors.black },
  listCardMood: { fontSize: 14, color: Colors.darkGray, marginTop: 2 },
  listCardInfo: { marginBottom: 12, gap: 8 },
  listCardInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  listCardMeta: { fontSize: 14, color: Colors.darkGray },
  listCardActions: { flexDirection: 'row', gap: 10 },
  listCardSecondaryBtn: { flex: 1, backgroundColor: Colors.white, borderRadius: 12, alignItems: 'center', paddingVertical: 12, borderWidth: 1, borderColor: Colors.darkGray },
  listCardSecondaryText: { color: Colors.darkGray, fontWeight: '700', fontSize: 14 },
  listCardPrimaryBtn: { flex: 1, backgroundColor: Colors.secondary, borderRadius: 12, alignItems: 'center', paddingVertical: 12 },
  listCardPrimaryText: { color: Colors.black, fontWeight: '800', fontSize: 14 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyStateText: { fontSize: 18, fontWeight: '700', color: Colors.darkGray, marginBottom: 8 },
  emptyStateSubtext: { fontSize: 14, color: Colors.darkGray },
});
