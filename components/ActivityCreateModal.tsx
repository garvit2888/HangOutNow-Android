import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, Platform, ScrollView, ActivityIndicator } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Colors from '@/constants/colors';
import { useGroupStore } from '@/store/groupStore';
import { useUserStore } from '@/store/userStore';
import { useChatStore } from '@/store/chatStore';
import LocationSearchModal from './LocationSearchModal';
import PinPlacementModal from './PinPlacementModal';
import * as Location from 'expo-location';
import { createActivity } from '@/services/activityService';
import { auth } from '@/config/firebase';

export default function ActivityCreateModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { createGroup, canUserCreateActivity } = useGroupStore();
  const { loginEmail, profile } = useUserStore();
  const { upsertChatPreview, saveUserChatsToFirestore } = useChatStore();
  const currentUserId = profile?.uid || loginEmail || 'current_user_id';
  const currentUserName = profile?.fullName || 'You';
  const currentUserAvatar = (profile as any)?.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(currentUserName);
  
  // Debug: Log avatar on modal open
  useEffect(() => {
    if (visible) {
      console.log('📸 Current user avatar when creating activity:', currentUserAvatar);
      console.log('📸 Profile avatar field:', (profile as any)?.avatar);
    }
  }, [visible]);

  // Check if user can create activity when modal opens
  useEffect(() => {
    if (visible && !canUserCreateActivity(currentUserId)) {
      Alert.alert(
        'Activity Limit Reached',
        'You can only create one activity at a time. Please wait for your current activity to expire or delete it before creating a new one.',
        [{ text: 'OK', onPress: onClose }]
      );
    }
  }, [visible]);

  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    // Set initial time to current time, or 1 hour from now if current time is in the past
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    return oneHourFromNow;
  });
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [max, setMax] = useState(5);
  const [locationName, setLocationName] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [showLocationSearch, setShowLocationSearch] = useState(false);
  const [showPinPlacement, setShowPinPlacement] = useState(false);
  const [isCheckingPermissions, setIsCheckingPermissions] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Pre-check location permissions when modal opens
  useEffect(() => {
    if (visible) {
      checkLocationPermissions();
    }
  }, [visible]);

  const checkLocationPermissions = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        // Permissions not granted, but don't block the UI
        console.log('Location permissions not granted');
      }
    } catch (error) {
      console.log('Error checking permissions:', error);
    }
  };

  const validateEmoji = (text: string) => {
    // Check if the input contains only emojis
    const emojiRegex = /^[\p{Emoji}\p{Emoji_Component}]+$/u;
    return emojiRegex.test(text);
  };

  const handleEmojiChange = (text: string) => {
    if (text === '' || validateEmoji(text)) {
      setEmoji(text);
    } else {
      Alert.alert('Emoji only', 'Please enter only emoji characters');
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Helper function to calculate distance between two coordinates (in km)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleTimeChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    // On iOS, keep picker visible
    if (date) {
      // Simply accept the date from the picker without validation here
      // We'll validate in handleCreate instead
      setSelectedDate(date);
    }
  };

  const handleCreate = async () => {
    console.log('handleCreate called');
    console.log('Form values:', { name, emoji, locationName, selectedLocation });
    
    if (!name.trim() || !emoji.trim() || !locationName.trim() || !selectedLocation) {
      Alert.alert('Missing info', 'Please fill in all fields and select a location on the map.');
      return;
    }

    // Validate time is within 6 hours
    const now = new Date();
    
    // Create a proper date for the selected time
    // Extract hours and minutes from selectedDate
    const selectedHours = selectedDate.getHours();
    const selectedMinutes = selectedDate.getMinutes();
    
    // Create a date object for today with the selected time
    const selectedTimeToday = new Date(now);
    selectedTimeToday.setHours(selectedHours, selectedMinutes, 0, 0);
    
    // If the selected time today is in the past, it means the user wants next day
    let selectedTime: Date;
    if (selectedTimeToday <= now) {
      // It's in the past today, so it must be for tomorrow
      selectedTime = new Date(selectedTimeToday);
      selectedTime.setDate(selectedTime.getDate() + 1);
    } else {
      // It's in the future today
      selectedTime = selectedTimeToday;
    }
    
    // Check if selected time is in the future
    if (selectedTime <= now) {
      Alert.alert('Invalid Time', 'Please select a time in the future!');
      return;
    }
    
    // Check if selected time is more than 6 hours from now
    const timeDiffMs = selectedTime.getTime() - now.getTime();
    const timeDiffHours = timeDiffMs / (1000 * 60 * 60);
    if (timeDiffHours > 6) {
      Alert.alert('Time Limit', 'Activities can only be created for the next 6 hours!');
      return;
    }

    // Validate location is within 30km of user's current location
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        const userLocation = await Location.getCurrentPositionAsync({});
        const distance = calculateDistance(
          userLocation.coords.latitude,
          userLocation.coords.longitude,
          selectedLocation.latitude,
          selectedLocation.longitude
        );

        if (distance > 30) {
          Alert.alert(
            'Location Too Far',
            `The selected location is ${distance.toFixed(1)}km away. Activities can only be created within 30km of your current location to promote local meetups.`,
            [{ text: 'OK' }]
          );
          return;
        }
      }
    } catch (error) {
      console.log('Could not validate location distance:', error);
    }

    const mood = ((): string => {
      if (emoji.includes('☕')) return 'coffee';
      if (emoji.includes('🍔')) return 'food';
      if (emoji.includes('🧘')) return 'chill';
      if (emoji.includes('🚶')) return 'walk';
      if (emoji.includes('🎬')) return 'movie';
      if (emoji.includes('⚽')) return 'party';
      return 'party';
    })();

    // Open pin placement modal instead of creating directly
    console.log('Opening pin placement modal, selectedLocation:', selectedLocation);
    setShowPinPlacement(true);
    console.log('showPinPlacement set to true');
  };

  const handlePinPlacementConfirm = async (finalLocation: { latitude: number; longitude: number }) => {
    if (isCreating) return; // prevent double taps
    setIsCreating(true);
    const mood = ((): string => {
      if (emoji.includes('☕')) return 'coffee';
      if (emoji.includes('🍔')) return 'food';
      if (emoji.includes('🧘')) return 'chill';
      if (emoji.includes('🚶')) return 'walk';
      if (emoji.includes('🎬')) return 'movie';
      if (emoji.includes('⚽')) return 'party';
      return 'party';
    })();

    try {
      // Check if user is authenticated
      console.log('🔐 Auth state check:', {
        currentUserId,
        authCurrentUser: auth.currentUser?.uid,
        profileUid: profile?.uid,
        loginEmail
      });
      
      if (!currentUserId || currentUserId === 'current_user_id' || !auth.currentUser) {
        console.error('❌ User not authenticated, cannot create activity');
        Alert.alert('Error', 'You must be logged in to create an activity.');
        return;
      }

      // Calculate the correct selected time (accounting for next-day scenarios)
      const now = new Date();
      const selectedHours = selectedDate.getHours();
      const selectedMinutes = selectedDate.getMinutes();
      
      // Create a date object for today with the selected time
      const selectedTimeToday = new Date(now);
      selectedTimeToday.setHours(selectedHours, selectedMinutes, 0, 0);
      
      // If the selected time today is in the past, it means the user wants next day
      let correctSelectedTime: Date;
      if (selectedTimeToday <= now) {
        // It's in the past today, so it must be for tomorrow
        correctSelectedTime = new Date(selectedTimeToday);
        correctSelectedTime.setDate(correctSelectedTime.getDate() + 1);
      } else {
        // It's in the future today
        correctSelectedTime = selectedTimeToday;
      }

      // Create activity data
      const activityData = {
        name: name.trim(),
        mood,
        emoji: emoji.trim(),
        location: finalLocation,
        distance: 0,
        members: [{
          id: currentUserId,
          name: currentUserName,
          avatar: currentUserAvatar,
          dateOfBirth: profile?.dateOfBirth,
          location: finalLocation,
          distance: 0,
          mood: mood,
          mutualFriends: 0,
          isOnline: true,
        }], // Creator is automatically a member
        maxMembers: max,
        createdBy: currentUserId,
        creatorName: currentUserName,
        creatorAvatar: currentUserAvatar,
        isActive: true,
        isPublic: true,
        meetingLocation: locationName.trim(),
        expiresAt: correctSelectedTime.toISOString(),
      };

      // Save to Firestore (cloud sync across all devices)
      console.log('🔥 Saving activity to Firestore...');
      console.log('📋 Activity data being sent:', JSON.stringify(activityData, null, 2));
      console.log('👤 Current user ID:', currentUserId);
      console.log('👥 Members in activity data:', activityData.members.map(m => ({ id: m.id, name: m.name })));
      const { activityId, chatId } = await createActivity(activityData);
      console.log('✅ Activity saved to Firestore:', activityId);

      // Also save locally for immediate UI update
      const group = createGroup({
        ...activityData,
        id: activityId, // Use Firestore ID
        chatId: chatId, // Use Firestore chatId
      } as any); // Type assertion needed as createGroup expects partial group data

      // Create chat preview for the creator since they're automatically a member
      // Use group.id (activity ID) consistently, not chatId, to match the rest of the codebase
      upsertChatPreview({
        id: group.id, // Use activity ID consistently (matches map.tsx and other places)
        userId: group.id,
        name: group.name,
        avatar: group.groupAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(group.name)}&background=random`,
        lastMessage: 'No messages yet',
        timestamp: new Date().toISOString(),
        unread: 0,
        isGroupChat: true,
      });
      
      // Save chat preview to Firestore for persistence
      await saveUserChatsToFirestore(currentUserId);

      // Clear form
      setName('');
      setEmoji('');
      setSelectedDate(new Date());
      setMax(5);
      setLocationName('');
      setSelectedLocation(null);
      setShowPinPlacement(false);

      onClose();
      Alert.alert('Created!', `Your activity "${name.trim()}" is now live on the map and visible to everyone!`);
    } catch (error) {
      console.error('❌ Error creating activity:', error);
      Alert.alert('Error', 'Failed to create activity. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handlePinPlacementCancel = () => {
    setShowPinPlacement(false);
    // Keep the form filled so user can try again
  };

  return (
    <>
      {!showLocationSearch && !showPinPlacement && (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
          <View style={styles.overlay}>
            <View style={styles.modal}>
              <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.title}>Create Activity</Text>
              
              {/* Activity Name */}
              <TextInput 
                style={styles.input} 
                placeholder="Activity Name" 
                placeholderTextColor={Colors.gray} 
                value={name} 
                onChangeText={setName} 
              />

              {/* Emoji Input */}
              <Text style={styles.label}>Activity Emoji</Text>
              <View style={styles.emojiContainer}>
                <Text style={styles.emojiPlaceholderText}>{emoji || 'Tap to enter emoji'}</Text>
                <TextInput 
                  style={styles.emojiInput} 
                  placeholder="" 
                  placeholderTextColor="transparent"
                  value={emoji} 
                  onChangeText={handleEmojiChange}
                  maxLength={2}
                />
              </View>

              {/* Time Picker */}
              <Text style={styles.label}>Meeting Time</Text>
              <TouchableOpacity 
                style={styles.timePickerButton} 
                onPress={() => setShowTimePicker(true)}
              >
                <Text style={styles.timePickerText}>
                  {formatTime(selectedDate)}
                </Text>
              </TouchableOpacity>

              {showTimePicker && Platform.OS === 'ios' && (
                <View style={styles.iosTimePickerContainer}>
                  <DateTimePicker
                    value={selectedDate}
                    mode="time"
                    is24Hour={false}
                    display="spinner"
                    onChange={handleTimeChange}
                    textColor={Colors.primary}
                  />
                  <TouchableOpacity 
                    style={styles.doneButton} 
                    onPress={() => setShowTimePicker(false)}
                  >
                    <Text style={styles.doneButtonText}>Done</Text>
                  </TouchableOpacity>
                </View>
              )}

              {showTimePicker && Platform.OS === 'android' && (
                <DateTimePicker
                  value={selectedDate}
                  mode="time"
                  is24Hour={false}
                  display="default"
                  onChange={handleTimeChange}
                />
              )}

              {/* Max People */}
              <Text style={styles.label}>Max People</Text>
              <View style={styles.maxRow}>
                {[3, 4, 5, 6, 8, 10].map(n => (
                  <TouchableOpacity 
                    key={n} 
                    style={[styles.maxPill, max === n && styles.maxPillActive]} 
                    onPress={() => setMax(n)}
                  >
                    <Text style={[styles.maxText, max === n && styles.maxTextActive]}>{n}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Location Search */}
              <Text style={styles.label}>Meeting Location</Text>
              <TouchableOpacity 
                style={styles.locationButton} 
                onPress={() => {
                  console.log('Location button pressed, opening search modal');
                  setShowLocationSearch(true);
                }}
                activeOpacity={0.7}
              >
                <Text style={selectedLocation ? styles.locationSelectedText : styles.locationPlaceholderText}>
                  {locationName || 'Search for a location'}
                </Text>
              </TouchableOpacity>
              
              {/* Debug info */}
              {__DEV__ && (
                <Text style={{ fontSize: 10, color: 'gray', marginTop: 5 }}>
                  Search Modal State: {showLocationSearch ? 'OPEN' : 'CLOSED'}
                </Text>
              )}

              {/* Actions */}
              <View style={styles.actions}>
                <TouchableOpacity style={styles.cancel} onPress={onClose}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.create} onPress={handleCreate}>
                  <Text style={styles.createText}>Create</Text>
                </TouchableOpacity>
              </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* Location Search Modal - Rendered separately */}
      <LocationSearchModal
        visible={showLocationSearch}
        onClose={() => {
          console.log('Closing location search modal');
          setShowLocationSearch(false);
        }}
        onSelectLocation={(location, name) => {
          console.log('Location selected:', location, name);
          setSelectedLocation(location);
          setLocationName(name);
          setShowLocationSearch(false);
        }}
      />

      {/* Pin Placement Modal */}
      {selectedLocation && (
        <PinPlacementModal
          visible={showPinPlacement}
          emoji={emoji}
          initialLocation={selectedLocation}
          activityName={name}
          onConfirm={handlePinPlacementConfirm}
          onCancel={handlePinPlacementCancel}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'flex-end' },
  modal: { backgroundColor: Colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, width: '100%', maxHeight: '85%' },
  title: { color: Colors.primary, fontSize: 22, fontWeight: '800', marginBottom: 20, textAlign: 'center' },
  label: { color: Colors.darkGray, fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 8 },
  input: { backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: Colors.primary, marginBottom: 12, fontSize: 16 },
  emojiContainer: { backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 12, marginBottom: 12, position: 'relative', height: 60, justifyContent: 'center', alignItems: 'center' },
  emojiPlaceholderText: { position: 'absolute', fontSize: 12, color: Colors.gray, textAlign: 'center', zIndex: 0 },
  emojiInput: { fontSize: 32, textAlign: 'center', backgroundColor: 'transparent', width: '100%', color: Colors.primary, zIndex: 1 },
  timePickerButton: { backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 16, marginBottom: 12, alignItems: 'center' },
  timePickerText: { color: Colors.primary, fontSize: 18, fontWeight: '700' },
  iosTimePickerContainer: { backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 12, marginBottom: 12, paddingVertical: 10 },
  doneButton: { backgroundColor: Colors.secondary, marginHorizontal: 16, marginTop: 10, marginBottom: 10, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  doneButtonText: { color: Colors.black, fontSize: 16, fontWeight: '700' },
  locationButton: { backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 16, marginBottom: 12, alignItems: 'center' },
  locationPlaceholderText: { color: Colors.gray, fontSize: 15 },
  locationSelectedText: { color: Colors.primary, fontSize: 15, fontWeight: '600' },
  maxRow: { flexDirection: 'row', gap: 10, marginBottom: 16, justifyContent: 'space-around' },
  maxPill: { backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 20, paddingHorizontal: 18, paddingVertical: 10, borderWidth: 2, borderColor: 'transparent', minWidth: 50, alignItems: 'center' },
  maxPillActive: { backgroundColor: Colors.secondary, borderColor: Colors.primary },
  maxText: { color: Colors.primary, fontWeight: '700', fontSize: 16 },
  maxTextActive: { color: Colors.black },
  actions: { flexDirection: 'row', gap: 12, marginTop: 20, marginBottom: 10 },
  cancel: { flex: 1, backgroundColor: Colors.lightGray, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  cancelText: { color: Colors.darkGray, fontWeight: '700', fontSize: 17 },
  create: { flex: 1, backgroundColor: Colors.secondary, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  createText: { color: Colors.black, fontWeight: '800', fontSize: 17 },
});
