import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import { useUserStore } from '@/store/userStore';
import { uploadUserAvatar } from '@/services/storageService';
import { doc, updateDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '@/config/firebase';
import { useGroupStore } from '@/store/groupStore';
import { useChatStore } from '@/store/chatStore';
import { Settings, LogOut, Camera, Clock, Shield, FileText, Mail } from 'lucide-react-native';
import AppSettingsModal from '../components/AppSettingsModal';
import PastActivitiesModal from '@/components/PastActivitiesModal';
import { signOut } from 'firebase/auth';

export default function ProfileScreen() {
  const router = useRouter();
  const { profile, setProfile, maxAgeDifference = 5, setMaxAgeDifference, setProfileAvatar } = useUserStore();
  const { updateUserAvatar, clearAllGroups } = useGroupStore();
  const { chats, upsertChatPreview, clearAllChats } = useChatStore();
  const currentUserId = profile?.uid || '';
  const [profileImage, setProfileImage] = useState(profile?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format');
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [pastActivitiesVisible, setPastActivitiesVisible] = useState(false);

  const handleProfilePicturePress = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Permission to access camera roll is required!');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        const localUri = result.assets[0].uri;

        try {
          // Show loading state
          Alert.alert('Uploading...', 'Please wait while we upload your profile picture');

          // Upload to Firebase Storage
          console.log('📤 Uploading profile picture to Firebase Storage...');
          const cloudUrl = await uploadUserAvatar(localUri, currentUserId);
          console.log('✅ Profile picture uploaded to cloud:', cloudUrl);

          // Update in Firestore
          const currentUser = auth.currentUser;
          if (currentUser) {
            await updateDoc(doc(db, 'users', currentUser.uid), {
              avatar: cloudUrl,
            });
            console.log('✅ Profile picture updated in Firestore');

            // Update user's avatar in ALL activities where they're a member
            console.log('🔄 Updating avatar in all activities...');
            console.log('🔍 Looking for user ID:', currentUser.uid);
            const activitiesRef = collection(db, 'activities');
            const activitiesSnapshot = await getDocs(activitiesRef);

            const updatePromises = [];
            activitiesSnapshot.forEach((activityDoc) => {
              const activityData = activityDoc.data();
              console.log('🔍 Checking activity:', activityDoc.id, 'with members:', activityData.members.map((m: any) => ({ id: m.id, email: m.email })));

              const memberIndex = activityData.members.findIndex((member: any) =>
                member.id === currentUser.uid || member.email === currentUser.uid
              );

              if (memberIndex !== -1) {
                console.log('✅ Found user in activity:', activityDoc.id, 'at index:', memberIndex);
                // User is a member of this activity, update their avatar
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
              } else {
                console.log('❌ User not found in activity:', activityDoc.id);
              }
            });

            if (updatePromises.length > 0) {
              await Promise.all(updatePromises);
              console.log(`✅ Updated avatar in ${updatePromises.length} activities`);
            } else {
              console.log('⚠️ No activities found to update');
            }
          }

          // Update local state
          setProfileImage(cloudUrl);
          setProfileAvatar(cloudUrl);

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

          console.log('✅ Profile picture updated everywhere');
          Alert.alert('Success', 'Profile picture updated in all your activities!');

          // Force refresh the map by reloading activities
          console.log('🔄 Refreshing activities to show updated avatar...');
          setTimeout(() => {
            // This will trigger the real-time listener to refresh
            console.log('⏰ Map should refresh with new avatar now');
          }, 2000);
        } catch (uploadError) {
          console.error('❌ Error uploading profile picture:', uploadError);
          Alert.alert('Error', 'Failed to upload profile picture. Please try again.');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
      console.error('Image picker error:', error);
    }
  };

  const handleSupportPress = async () => {
    const email = 'hangoutnow@gmail.com';
    const subject = '';
    const body = '';
    const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    try {
      const canOpen = await Linking.canOpenURL(mailtoUrl);
      if (canOpen) {
        await Linking.openURL(mailtoUrl);
      } else {
        Alert.alert('Error', 'Unable to open email app. Please ensure you have an email app installed.');
      }
    } catch (error) {
      console.error('Error opening email app:', error);
      Alert.alert('Error', 'Failed to open email app.');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🔄 Starting logout process...');

              // Sign out from Firebase
              await signOut(auth);

              // NOTE: We DON'T clear any data on logout!
              // Like Instagram/WhatsApp, when you log back in, your data is still there
              // All data (profile, chats, activities) persists in AsyncStorage

              console.log('✅ User signed out successfully');
              router.replace('/login');
            } catch (error) {
              console.error('❌ Logout error:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.primary }}>
      <LinearGradient colors={[Colors.primary, Colors.darkPurple]} style={styles.container}>
        <View style={styles.header} />
        <View style={styles.contentWrapper}>
          <View style={styles.profileContainer}>
            <TouchableOpacity onPress={handleProfilePicturePress} style={styles.profileImageContainer}>
              <Image
                source={{ uri: profileImage }}
                style={styles.profileImage}
              />
              <View style={styles.cameraIconContainer}>
                <Camera size={16} color={Colors.white} />
              </View>
            </TouchableOpacity>
            <Text style={styles.name}>{profile?.fullName || 'User'}</Text>
            <Text style={styles.username}>{profile?.email || 'user@example.com'}</Text>

            {profile?.gender && (
              <View style={styles.infoContainer}>
                <Text style={styles.infoText}>Gender: {profile.gender}</Text>
              </View>
            )}

            {profile?.instagramUsername && (
              <View style={styles.infoContainer}>
                <Text style={styles.infoText}>Instagram: @{profile.instagramUsername}</Text>
              </View>
            )}
          </View>

          <View style={styles.settingsContainer}>
            <TouchableOpacity style={styles.settingItem} onPress={() => setSettingsVisible(true)}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingText}>App Settings</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingItem} onPress={() => setPastActivitiesVisible(true)}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingText}>Past Activities</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingItem} onPress={() => router.push('/privacy-policy')}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingText}>Privacy Policy</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingItem} onPress={() => router.push('/terms-and-conditions')}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingText}>Terms and Conditions</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingItem} onPress={handleSupportPress}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingText}>Support</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <LogOut size={20} color={Colors.white} />
              <Text style={styles.logoutText}>Log Out</Text>
            </TouchableOpacity>
          </View>
        </View>
        <AppSettingsModal
          visible={settingsVisible}
          initialMaxAgeDiff={maxAgeDifference}
          onClose={() => setSettingsVisible(false)}
          onSave={setMaxAgeDifference}
        />
        <PastActivitiesModal
          visible={pastActivitiesVisible}
          onClose={() => setPastActivitiesVisible(false)}
        />
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
  },
  contentWrapper: {
    flex: 1,
  },
  profileContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.primary,
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.white,
  },
  username: {
    fontSize: 16,
    color: Colors.white,
    opacity: 0.8,
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '60%',
    marginTop: 10,
  },
  infoContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
    alignSelf: 'center',
  },
  infoText: {
    fontSize: 14,
    color: Colors.white,
    opacity: 0.9,
  },
  settingsContainer: {
    flex: 1,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 120, // Extra padding to extend past navigation bar
    minHeight: '100%', // Ensure it fills the space
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingText: {
    fontSize: 16,
    color: Colors.black,
    fontWeight: 'bold',
  },
  connectButton: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  connectText: {
    color: Colors.primary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  connectedBadge: {
    backgroundColor: Colors.lightGray,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  connectedText: {
    color: Colors.darkGray,
    fontWeight: 'bold',
    fontSize: 14,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 15,
    marginBottom: 80,
  },
  logoutText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});