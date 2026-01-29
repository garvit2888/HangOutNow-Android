import React, { useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View, TextInput, Alert, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { useGroupStore } from '@/store/groupStore';
import { useUserStore } from '@/store/userStore';
import { useChatStore } from '@/store/chatStore';
import { Coffee, Utensils, Zap, Film, Footprints, Cloud, MapPin, Users, Map } from 'lucide-react-native';

interface GroupCreationModalProps {
  visible: boolean;
  onClose: () => void;
}

const moodOptions = [
  { id: 'party', label: 'Party', color: '#FFB3BA' },
  { id: 'coffee', label: 'Coffee', color: '#E6C9A8' },
  { id: 'food', label: 'Food', color: '#FFD0D0' },
  { id: 'chill', label: 'Chill', color: '#D0E8FF' },
  { id: 'movie', label: 'Movie', color: '#E6B3FF' },
  { id: 'walk', label: 'Walk', color: '#D0FFD6' },
];

const memberCountOptions = [3, 4, 5, 6, 8, 10];

export default function GroupCreationModal({ visible, onClose }: GroupCreationModalProps) {
  const { createGroup } = useGroupStore();
  const { loginEmail, profile } = useUserStore();
  const currentUserId = loginEmail || profile?.email || 'current_user_id';
  const { upsertChatPreview } = useChatStore();
  const [selectedMood, setSelectedMood] = useState<string>('');
  const [groupName, setGroupName] = useState<string>('');
  const [selectedMemberCount, setSelectedMemberCount] = useState<number>(5);
  const [meetingLocation, setMeetingLocation] = useState<string>('');
  const [showMapPicker, setShowMapPicker] = useState<boolean>(false);
  const [selectedLocation, setSelectedLocation] = useState<{latitude: number, longitude: number, address: string} | null>(null);

  const handleCreateGroup = () => {
    if (!selectedMood || !groupName.trim() || (!meetingLocation.trim() && !selectedLocation)) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const location = selectedLocation || { latitude: 37.7858, longitude: -122.4064 };
    const locationName = selectedLocation?.address || meetingLocation.trim();

    const newGroup = createGroup({
      name: groupName.trim(),
      mood: selectedMood,
      location: location,
      distance: 0,
      members: [],
      maxMembers: selectedMemberCount,
      createdBy: currentUserId,
      isActive: true,
      isPublic: true,
      meetingLocation: locationName,
    });

    // Make sure a chat preview exists so it shows in Messages tab
    upsertChatPreview({
      id: newGroup.chatId,
      userId: newGroup.id,
      name: newGroup.name,
      avatar: newGroup.groupAvatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(newGroup.name),
      lastMessage: '',
      timestamp: new Date().toISOString(),
      unread: 0,
    });

    Alert.alert('Success', 'Group created successfully!');
    onClose();
    resetForm();
  };

  const handleMapLocationSelect = (location: {latitude: number, longitude: number, address: string}) => {
    setSelectedLocation(location);
    setMeetingLocation(location.address);
    setShowMapPicker(false);
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  const resetForm = () => {
    setSelectedMood('');
    setGroupName('');
    setSelectedMemberCount(5);
    setMeetingLocation('');
    setSelectedLocation(null);
    setShowMapPicker(false);
  };

  const handleClose = () => {
    onClose();
    resetForm();
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        <View style={styles.centeredView}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.modalView}>
          <Text style={styles.modalTitle}>Create New Group</Text>

          {/* Group Name Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Group Name</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter group name..."
              placeholderTextColor={Colors.gray}
              value={groupName}
              onChangeText={setGroupName}
              maxLength={50}
            />
          </View>

          {/* Mood Selection */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Choose Mood</Text>
            <View style={styles.moodOptionsContainer}>
              {moodOptions.map((mood) => (
                <TouchableOpacity
                  key={mood.id}
                  style={[
                    styles.moodOption,
                    { backgroundColor: mood.color },
                    selectedMood === mood.id && styles.selectedMoodOption,
                  ]}
                  onPress={() => setSelectedMood(mood.id)}
                >
                  <Text style={styles.moodEmoji}>
                    {mood.id === 'party' && '⚡'}
                    {mood.id === 'coffee' && '☕'}
                    {mood.id === 'food' && '🍴'}
                    {mood.id === 'chill' && '☁️'}
                    {mood.id === 'movie' && '🎬'}
                    {mood.id === 'walk' && '🚶'}
                  </Text>
                  <Text style={styles.moodOptionText}>{mood.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Member Count Selection */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Max Members</Text>
            <View style={styles.memberCountContainer}>
              {memberCountOptions.map((count) => (
                <TouchableOpacity
                  key={count}
                  style={[
                    styles.memberCountOption,
                    selectedMemberCount === count && styles.selectedMemberCountOption,
                  ]}
                  onPress={() => setSelectedMemberCount(count)}
                >
                  <Users size={16} color={selectedMemberCount === count ? Colors.white : Colors.primary} />
                  <Text style={[
                    styles.memberCountText,
                    selectedMemberCount === count && styles.selectedMemberCountText,
                  ]}>
                    {count}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Meeting Location */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Meeting Location</Text>
            <View style={styles.locationInputContainer}>
              <MapPin size={20} color={Colors.gray} style={styles.locationIcon} />
              <TextInput
                style={styles.locationInput}
                placeholder="Where will you meet? (e.g., Central Park, Starbucks on 5th Ave)"
                placeholderTextColor={Colors.gray}
                value={meetingLocation}
                onChangeText={setMeetingLocation}
                maxLength={100}
                multiline
              />
            </View>
            <TouchableOpacity 
              style={styles.mapButton} 
              onPress={() => setShowMapPicker(true)}
            >
              <Map size={16} color={Colors.primary} />
              <Text style={styles.mapButtonText}>Add on Map</Text>
            </TouchableOpacity>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.createButton} onPress={handleCreateGroup}>
              <Text style={styles.createButtonText}>Create Group</Text>
            </TouchableOpacity>
          </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
      
      {/* Map Picker Modal */}
      <Modal
        visible={showMapPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowMapPicker(false)}
      >
        <View style={styles.mapModalContainer}>
          <View style={styles.mapModalContent}>
            <Text style={styles.mapModalTitle}>Select Meeting Location</Text>
            <Text style={styles.mapModalSubtitle}>
              Choose a location on the map. Groups within 5km will be able to see this location.
            </Text>
            
            {/* Placeholder for map component */}
            <View style={styles.mapPlaceholder}>
              <Map size={48} color={Colors.gray} />
              <Text style={styles.mapPlaceholderText}>Map View</Text>
              <Text style={styles.mapPlaceholderSubtext}>
                In a real app, this would show an interactive map
              </Text>
            </View>
            
            <View style={styles.mapModalActions}>
              <TouchableOpacity 
                style={styles.mapCancelButton} 
                onPress={() => setShowMapPicker(false)}
              >
                <Text style={styles.mapCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.mapConfirmButton} 
                onPress={() => handleMapLocationSelect({
                  latitude: 37.7858,
                  longitude: -122.4064,
                  address: 'Selected Location on Map'
                })}
              >
                <Text style={styles.mapConfirmButtonText}>Confirm Location</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalView: {
    margin: 20,
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    width: '100%',
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.black,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: Colors.lightGray,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.black,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  sectionContainer: {
    width: '100%',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.black,
    marginBottom: 12,
  },
  moodOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  moodOption: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  selectedMoodOption: {
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  moodEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  moodOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  memberCountContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  memberCountOption: {
    width: '15%',
    aspectRatio: 1,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.lightGray,
    borderWidth: 2,
    borderColor: 'transparent',
    marginBottom: 8,
  },
  selectedMemberCountOption: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  memberCountText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.primary,
    marginTop: 2,
  },
  selectedMemberCountText: {
    color: Colors.white,
  },
  locationInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.lightGray,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  locationIcon: {
    marginTop: 2,
    marginRight: 12,
  },
  locationInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.black,
    minHeight: 40,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: Colors.lightGray,
    borderRadius: 12,
    paddingVertical: 14,
    marginRight: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: Colors.darkGray,
    fontSize: 16,
    fontWeight: '600',
  },
  createButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    marginLeft: 10,
    alignItems: 'center',
  },
  createButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.lightGray,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  mapButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  mapModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapModalContent: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  mapModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  mapModalSubtitle: {
    fontSize: 14,
    color: Colors.darkGray,
    textAlign: 'center',
    marginBottom: 20,
  },
  mapPlaceholder: {
    height: 200,
    backgroundColor: Colors.lightGray,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  mapPlaceholderText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.darkGray,
    marginTop: 8,
  },
  mapPlaceholderSubtext: {
    fontSize: 12,
    color: Colors.gray,
    textAlign: 'center',
    marginTop: 4,
  },
  mapModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  mapCancelButton: {
    flex: 1,
    backgroundColor: Colors.lightGray,
    borderRadius: 12,
    paddingVertical: 12,
    marginRight: 8,
    alignItems: 'center',
  },
  mapCancelButtonText: {
    color: Colors.darkGray,
    fontSize: 16,
    fontWeight: '600',
  },
  mapConfirmButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    marginLeft: 8,
    alignItems: 'center',
  },
  mapConfirmButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
