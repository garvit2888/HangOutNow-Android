import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import Colors from '@/constants/colors';
import { useUserStore } from '@/store/userStore';
import { uploadUserAvatar } from '@/services/storageService';
import { doc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { db, auth } from '@/config/firebase';
import { useGroupStore } from '@/store/groupStore';
import { useChatStore } from '@/store/chatStore';

export default function UploadProfilePictureScreen() {
  const router = useRouter();
  const { profile, setProfile, setProfileAvatar, setOnboardingCompleted } = useUserStore();
  const { updateUserAvatar } = useGroupStore();
  const { chats, upsertChatPreview } = useChatStore();
  const currentUserId = profile?.uid || auth.currentUser?.uid || '';
  const currentUserName = profile?.fullName || 'User';
  
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  const handleSelectImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Permission to access camera roll is required to upload your profile picture.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image. Please try again.');
      console.error('Image picker error:', error);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Permission to access camera is required to take a photo.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo. Please try again.');
      console.error('Camera error:', error);
    }
  };

  const handleContinue = async () => {
    if (!selectedImage) {
      Alert.alert('Profile Picture Required', 'Please select or take a profile picture to continue.');
      return;
    }

    setIsUploading(true);
    setUploadProgress('Uploading your profile picture...');

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('No authenticated user found');
      }

      // Upload to Firebase Storage
      console.log('📤 Uploading profile picture to Firebase Storage...');
      const cloudUrl = await uploadUserAvatar(selectedImage, currentUser.uid);
      console.log('✅ Profile picture uploaded to cloud:', cloudUrl);
      setUploadProgress('Updating your profile...');

      // Update in Firestore
      await updateDoc(doc(db, 'users', currentUser.uid), {
        avatar: cloudUrl,
        hasCompletedOnboarding: true,
        updatedAt: new Date().toISOString(),
      });
      console.log('✅ Profile picture updated in Firestore');

      // Update user's avatar in ALL activities where they're a member
      setUploadProgress('Updating your activities...');
      const activitiesRef = collection(db, 'activities');
      const activitiesSnapshot = await getDocs(activitiesRef);
      
      const updatePromises = [];
      activitiesSnapshot.forEach((activityDoc) => {
        const activityData = activityDoc.data();
        
        const memberIndex = activityData.members.findIndex((member: any) => 
          member.id === currentUser.uid || member.email === currentUser.uid
        );
        
        if (memberIndex !== -1) {
          const updatedMembers = [...activityData.members];
          updatedMembers[memberIndex] = {
            ...updatedMembers[memberIndex],
            avatar: cloudUrl
          };
          
          updatePromises.push(
            updateDoc(doc(db, 'activities', activityDoc.id), {
              members: updatedMembers
            })
          );
        }
      });
      
      if (updatePromises.length > 0) {
        await Promise.all(updatePromises);
        console.log(`✅ Updated avatar in ${updatePromises.length} activities`);
      }

      // Update local state - update both avatar and full profile
      setProfileAvatar(cloudUrl);
      if (profile) {
        setProfile({
          ...profile,
          avatar: cloudUrl,
        });
      }
      
      // Update avatar in ALL existing groups where this user is a member
      updateUserAvatar(currentUserId, cloudUrl);
      
      // Update avatar in ALL chat previews for groups where this user is a member
      chats.forEach(chat => {
        if (chat.isGroupChat) {
          // Update the chat preview avatar if needed
          upsertChatPreview({
            ...chat,
            avatar: chat.avatar, // Keep group avatar, not user avatar
          });
        }
      });
      
      // Mark onboarding as completed
      setOnboardingCompleted(true);
      
      console.log('✅ Profile picture setup complete - onboarding finished');

      // Redirect to app
      router.replace('/(tabs)/map');
    } catch (error) {
      console.error('❌ Error uploading profile picture:', error);
      Alert.alert('Error', 'Failed to upload profile picture. Please try again.');
      setIsUploading(false);
      setUploadProgress('');
    }
  };

  return (
    <LinearGradient
      colors={[Colors.primary, Colors.darkPurple]}
      style={styles.container}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Add Profile Picture</Text>
          <Text style={styles.subtitle}>
            Upload a profile picture so others can see who you are
          </Text>
        </View>

        <View style={styles.imageContainer}>
          {selectedImage ? (
            <View style={styles.imageWrapper}>
              <Image
                source={{ uri: selectedImage }}
                style={styles.profileImage}
                contentFit="cover"
              />
              <TouchableOpacity
                style={styles.changeButton}
                onPress={handleSelectImage}
                disabled={isUploading}
              >
                <Text style={styles.changeButtonText}>Change</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.placeholderContainer}>
              <View style={styles.placeholderCircle}>
                <Text style={styles.placeholderIcon}>📷</Text>
              </View>
              <Text style={styles.placeholderText}>No picture selected</Text>
            </View>
          )}
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.selectButton]}
            onPress={handleSelectImage}
            disabled={isUploading}
          >
            <Text style={styles.selectButtonText}>Choose from Gallery</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.cameraButton]}
            onPress={handleTakePhoto}
            disabled={isUploading}
          >
            <Text style={styles.cameraButtonText}>Take Photo</Text>
          </TouchableOpacity>
        </View>

        {isUploading && (
          <View style={styles.uploadingContainer}>
            <ActivityIndicator size="large" color={Colors.secondary} />
            <Text style={styles.uploadingText}>{uploadProgress}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.continueButton, (!selectedImage || isUploading) && styles.continueButtonDisabled]}
          onPress={handleContinue}
          disabled={!selectedImage || isUploading}
        >
          <Text style={styles.continueButtonText}>
            {isUploading ? 'Setting up...' : 'Continue'}
          </Text>
        </TouchableOpacity>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Photo Guidelines:</Text>
          <Text style={styles.infoText}>• Clear face photo</Text>
          <Text style={styles.infoText}>• Good lighting</Text>
          <Text style={styles.infoText}>• No filters or sunglasses</Text>
          <Text style={styles.infoText}>• This will be your profile picture</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.white,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 30,
    minHeight: 200,
    justifyContent: 'center',
  },
  imageWrapper: {
    alignItems: 'center',
  },
  profileImage: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 4,
    borderColor: Colors.secondary,
  },
  changeButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
  },
  changeButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  placeholderContainer: {
    alignItems: 'center',
  },
  placeholderCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 3,
    borderColor: Colors.secondary,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderIcon: {
    fontSize: 64,
  },
  placeholderText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.white,
    opacity: 0.7,
  },
  buttonContainer: {
    gap: 12,
    marginBottom: 20,
  },
  actionButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: '100%',
  },
  selectButton: {
    backgroundColor: Colors.secondary,
  },
  selectButtonText: {
    color: Colors.black,
    fontSize: 18,
    fontWeight: 'bold',
  },
  cameraButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 2,
    borderColor: Colors.secondary,
  },
  cameraButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  uploadingContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  uploadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.white,
    opacity: 0.8,
  },
  continueButton: {
    backgroundColor: Colors.secondary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  continueButtonDisabled: {
    backgroundColor: Colors.gray,
    opacity: 0.5,
  },
  continueButtonText: {
    color: Colors.black,
    fontSize: 18,
    fontWeight: 'bold',
  },
  infoBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 16,
    width: '100%',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: Colors.white,
    marginBottom: 4,
    opacity: 0.9,
  },
});

