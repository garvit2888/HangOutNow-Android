import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ActionSheetIOS, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { useGroupStore } from '@/store/groupStore';
import { useUserStore } from '@/store/userStore';
import { useChatStore } from '@/store/chatStore';
import { GroupMessage } from '@/types';
import { Send, ArrowLeft, Flag, LogOut, X, Plus, Camera, ImageIcon, User } from 'lucide-react-native';
import { sendMessage, subscribeToMessages } from '@/services/chatService';
import { uploadImage } from '@/services/storageService';
import { leaveActivity as leaveActivityFirestore } from '@/services/activityService';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Group } from '@/types';
import ReportModal from '@/components/ReportModal';
// Chat messages sync via Firestore

export const options = { headerShown: false };

export default function GroupChatScreen() {
  const { id, justJoined } = useLocalSearchParams();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { groups, activeGroups, groupMessages, addGroupMessage, leaveGroup } = useGroupStore();
  const { loginEmail, profile } = useUserStore();
  const { markAsRead, incrementUnread, upsertChatPreview, setActiveChat } = useChatStore();
  const currentUserId = profile?.uid || loginEmail || 'current_user_id';

  const [messageText, setMessageText] = useState('');
  const [group, setGroup] = useState<any>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [showMembersSheet, setShowMembersSheet] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isCheckingMembership, setIsCheckingMembership] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [activityExpired, setActivityExpired] = useState(false);
  const [chatEndTime, setChatEndTime] = useState<Date | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const hasPostedStartMsgRef = useRef(false);
  const hasPostedOneHourMsgRef = useRef(false);

  // Set active chat when screen opens, clear when unmounts
  useEffect(() => {
    if (id) {
      setActiveChat(id as string);
    }
    return () => {
      setActiveChat(null);
    };
  }, [id, setActiveChat]);

  // Handle back navigation to ensure it goes to map screen when swiping back
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
      // Only intercept if it's a back action
      if (e.data?.action?.type === 'GO_BACK') {
        // If we can't go back safely, navigate to map instead
        if (!router.canGoBack()) {
          e.preventDefault();
          router.replace('/(tabs)/map');
        }
        // Otherwise, let the default back behavior happen
      }
    });

    return unsubscribe;
  }, [navigation, router]);

  // Load group
  useEffect(() => {
    // Look in both groups and activeGroups (Firestore synced activities)
    const foundGroup = activeGroups.find(g => g.id === id) || groups.find(g => g.id === id);

    if (foundGroup) {
      setGroup(foundGroup);

      // Calculate chat end time (6 hours after activity expires)
      if (foundGroup.expiresAt) {
        const expiresAt = new Date(foundGroup.expiresAt);
        const chatEnd = new Date(expiresAt.getTime() + 6 * 60 * 60 * 1000); // Add 6 hours
        setChatEndTime(chatEnd);

        const now = new Date();
        // Chat has ended if chatEndTime has passed
        setActivityExpired(chatEnd <= now);
      } else {
        setChatEndTime(null);
        setActivityExpired(false);
      }

      // Debug logging
      console.log('🔍 Checking membership for group:', foundGroup.name);
      console.log('🔍 Current user ID:', currentUserId);
      console.log('🔍 Group members:', foundGroup.members.map(m => ({ id: m.id, email: m.email, name: m.name })));

      // Comprehensive membership check - check multiple possible matches
      const isMember = foundGroup.members.some(m => {
        const idMatch = m.id === currentUserId;
        const emailMatch = m.email === currentUserId;
        const profileUidMatch = m.id === profile?.uid;
        const loginEmailMatch = m.email === loginEmail;

        console.log('🔍 Member check for', m.name, ':', {
          idMatch,
          emailMatch,
          profileUidMatch,
          loginEmailMatch,
          memberId: m.id,
          memberEmail: m.email,
          currentUserId,
          profileUid: profile?.uid,
          loginEmail
        });

        return idMatch || emailMatch || profileUidMatch || loginEmailMatch;
      });
      console.log('🔍 Is member result:', isMember);

      // For expired activities, allow viewing chat even if not a member (within 6-hour window)
      // Only check membership strictly for active activities
      if (!isMember) {
        // If activity hasn't expired, check membership strictly
        const now = new Date();
        const expiresAt = foundGroup.expiresAt ? new Date(foundGroup.expiresAt) : null;
        const isActivityStarted = expiresAt && expiresAt <= now;

        if (!isActivityStarted) {
          // Activity is still active - user must be a member
          // If user just joined, wait for Firestore to sync with retries
          if (justJoined === 'true') {
            console.log('🔄 User just joined, waiting for Firestore sync...');
            setIsCheckingMembership(true);

            // Check Firestore directly with retries
            const checkMembershipWithRetries = async (retries = 5, delay = 1000) => {
              for (let i = 0; i < retries; i++) {
                try {
                  console.log(`🔄 Checking membership (attempt ${i + 1}/${retries})...`);
                  // Query Firestore directly to get fresh data
                  const activityDoc = await getDoc(doc(db, 'activities', id as string));

                  if (activityDoc.exists()) {
                    const activityData = activityDoc.data() as Group;
                    const members = activityData.members || [];

                    const isMemberInFirestore = members.some((m: any) => {
                      const memberId = m?.id || m;
                      const memberEmail = m?.email;
                      return (
                        memberId === currentUserId ||
                        memberEmail === currentUserId ||
                        memberId === profile?.uid ||
                        memberEmail === loginEmail ||
                        memberId === profile?.email
                      );
                    });

                    if (isMemberInFirestore) {
                      console.log('✅ Membership confirmed from Firestore!');
                      // Update local state
                      const updatedGroup = { ...activityData, id: activityDoc.id };
                      const updatedExpiresAt = updatedGroup.expiresAt ? new Date(updatedGroup.expiresAt) : null;
                      const updatedChatEnd = updatedExpiresAt ? new Date(updatedExpiresAt.getTime() + 6 * 60 * 60 * 1000) : null;
                      setChatEndTime(updatedChatEnd);
                      setGroup(updatedGroup);
                      markAsRead(id as string);
                      setIsCheckingMembership(false);
                      return; // Success, exit retry loop
                    }
                  }

                  // If not found yet, wait before next retry
                  if (i < retries - 1) {
                    await new Promise(resolve => setTimeout(resolve, delay));
                    delay *= 1.5; // Exponential backoff
                  }
                } catch (error) {
                  console.error(`❌ Error checking membership (attempt ${i + 1}):`, error);
                  if (i < retries - 1) {
                    await new Promise(resolve => setTimeout(resolve, delay));
                    delay *= 1.5;
                  }
                }
              }

              // After all retries failed, check local state one more time
              console.log('🔄 Final check in local state...');
              const finalGroup = activeGroups.find(g => g.id === id) || groups.find(g => g.id === id);
              if (finalGroup) {
                const finalIsMember = finalGroup.members.some(m => {
                  const idMatch = m.id === currentUserId;
                  const emailMatch = m.email === currentUserId;
                  const profileUidMatch = m.id === profile?.uid;
                  const loginEmailMatch = m.email === loginEmail;
                  return idMatch || emailMatch || profileUidMatch || loginEmailMatch;
                });
                if (finalIsMember) {
                  console.log('✅ Membership confirmed in local state');
                  setGroup(finalGroup);
                  markAsRead(id as string);
                  setIsCheckingMembership(false);
                  return;
                }
              }

              // If still not a member after all retries
              console.log('❌ Not a member after all retries');
              setIsCheckingMembership(false);
              Alert.alert('Not a member', 'You are no longer part of this group.', [
                { text: 'OK', onPress: () => router.replace('/(tabs)/map') }
              ]);
            };

            // Start checking with retries
            checkMembershipWithRetries();
          } else {
            // Not a member and activity is active - show alert
            Alert.alert('Not a member', 'You are no longer part of this group.', [
              { text: 'OK', onPress: () => router.replace('/(tabs)/map') }
            ]);
          }
        } else {
          // Activity has started/expired - allow viewing chat (no alert/redirect)
          // Chat can still be viewed within the 6-hour window
          markAsRead(id as string);
        }
      } else {
        // Mark chat as read when user opens it
        markAsRead(id as string);
      }
    } else {
      // Group not found - load from chat preview to keep chat visible
      const { chats } = useChatStore.getState();
      const chatPreview = chats.find(c => c.id === id);

      if (chatPreview) {
        // Create a minimal group object from chat preview to keep UI working
        const expiredTime = new Date(Date.now() - 1000);
        const chatEnd = new Date(expiredTime.getTime() + 6 * 60 * 60 * 1000); // 6 hours after expiration

        const minimalGroup = {
          id: id as string,
          name: chatPreview.name,
          members: [], // Empty members array since activity is stopped
          groupAvatar: chatPreview.avatar,
          expiresAt: expiredTime.toISOString(), // Expired timestamp
          createdBy: '',
          isActive: false,
        };
        setGroup(minimalGroup);
        setChatEndTime(chatEnd);
        const now = new Date();
        setActivityExpired(chatEnd <= now); // Only true if chat has fully ended
        // No alert - allow viewing chat within 6-hour window
      } else {
        // No chat preview found - could be just joined or data not synced yet
        if (justJoined === 'true') {
          console.log('🔄 Group not found but user just joined, waiting for Firestore sync...');
          setIsCheckingMembership(true);

          // Check Firestore directly with retries
          const checkMembershipWithRetries = async (retries = 5, delay = 1000) => {
            for (let i = 0; i < retries; i++) {
              try {
                console.log(`🔄 Checking membership from Firestore (attempt ${i + 1}/${retries})...`);
                const activityDoc = await getDoc(doc(db, 'activities', id as string));

                if (activityDoc.exists()) {
                  const activityData = activityDoc.data() as Group;
                  const members = activityData.members || [];

                  const isMemberInFirestore = members.some((m: any) => {
                    const memberId = m?.id || m;
                    const memberEmail = m?.email;
                    return (
                      memberId === currentUserId ||
                      memberEmail === currentUserId ||
                      memberId === profile?.uid ||
                      memberEmail === loginEmail ||
                      memberId === profile?.email
                    );
                  });

                  if (isMemberInFirestore) {
                    console.log('✅ Membership confirmed from Firestore!');
                    const updatedGroup = { ...activityData, id: activityDoc.id };
                    setGroup(updatedGroup);
                    setActivityExpired(false);
                    markAsRead(id as string);
                    setIsCheckingMembership(false);
                    return;
                  }
                }

                if (i < retries - 1) {
                  await new Promise(resolve => setTimeout(resolve, delay));
                  delay *= 1.5;
                }
              } catch (error) {
                console.error(`❌ Error checking membership (attempt ${i + 1}):`, error);
                if (i < retries - 1) {
                  await new Promise(resolve => setTimeout(resolve, delay));
                  delay *= 1.5;
                }
              }
            }

            // Final check in local state
            console.log('🔄 Final check in local state...');
            const finalGroup = activeGroups.find(g => g.id === id) || groups.find(g => g.id === id);
            if (finalGroup) {
              const finalIsMember = finalGroup.members.some(m => {
                const idMatch = m.id === currentUserId;
                const emailMatch = m.email === currentUserId;
                const profileUidMatch = m.id === profile?.uid;
                const loginEmailMatch = m.email === loginEmail;
                return idMatch || emailMatch || profileUidMatch || loginEmailMatch;
              });
              if (finalIsMember) {
                console.log('✅ Membership confirmed in local state');
                setGroup(finalGroup);
                setActivityExpired(false);
                markAsRead(id as string);
                setIsCheckingMembership(false);
                return;
              }
            }

            console.log('❌ Not a member after all retries');
            setIsCheckingMembership(false);
            Alert.alert('Not a member', 'You are no longer part of this group.', [
              { text: 'OK', onPress: () => router.replace('/(tabs)/map') }
            ]);
          };

          checkMembershipWithRetries();
        } else {
          // No chat preview and not just joined - this is an error case
          console.log('❌ Group not found and no chat preview - showing error');
        }
      }
    }
  }, [id, groups, activeGroups, currentUserId, justJoined]);

  // Subscribe to messages from Firestore
  useEffect(() => {
    if (!id || !group) return;

    let previousMessageCount = 0;
    const isChatOpen = true; // This chat screen is open, so messages are read

    const unsubscribe = subscribeToMessages(id as string, (firestoreMessages) => {

      // Check if there are new messages (not sent by current user)
      const newMessages = firestoreMessages.slice(previousMessageCount);
      const newMessagesFromOthers = newMessages.filter(msg => msg.senderId !== currentUserId);

      // Only increment unread if chat is NOT currently open (which is always false here since we're in the chat)
      // But we still track it in case user navigates away
      // Since chat is open, we mark as read when new messages arrive
      if (newMessagesFromOthers.length > 0 && isChatOpen) {
        // Chat is open, so mark as read immediately
        markAsRead(id as string);
      } else if (newMessagesFromOthers.length > 0) {
        // Chat is not open, increment unread
        incrementUnread(id as string);
      }

      // Update chat preview with latest message - preserve unread count
      if (firestoreMessages.length > 0 && group) {
        const lastMessage = firestoreMessages[firestoreMessages.length - 1];
        const { chats } = useChatStore.getState();
        const existingChat = chats.find(c => c.id === group.id);
        const currentUnread = existingChat?.unread || 0;

        upsertChatPreview({
          id: group.id,
          userId: group.id,
          name: group.name,
          avatar: group.groupAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(group.name)}&background=random`,
          lastMessage: lastMessage.imageUri ? '📷 Photo' : lastMessage.text,
          timestamp: lastMessage.timestamp,
          unread: isChatOpen ? 0 : currentUnread, // If chat is open, unread is 0
          isGroupChat: true,
        });
      }

      // Update previous message count for next comparison
      previousMessageCount = firestoreMessages.length;
      setMessages(firestoreMessages);

      // Post system messages (only creator posts, once, and only within relevant windows)
      try {
        if (group?.expiresAt) {
          const expiresAt = new Date(group.expiresAt);
          const chatEnd = new Date(expiresAt.getTime() + 6 * 60 * 60 * 1000);
          setChatEndTime(chatEnd);

          const now = new Date();
          const isCreator = group.createdBy === currentUserId;

          const hasStartMsg = firestoreMessages.some(
            (m) => m.text === 'Activity has started. Chat ends in 6 hours from now'
          );
          const hasOneHourMsg = firestoreMessages.some(
            (m) => m.text === 'Chat gets ended/closed in 1 hr'
          );

          // When activity just starts (expiresAt <= now) and within the 6-hour window
          if (
            isCreator &&
            expiresAt <= now &&
            now < chatEnd &&
            !hasStartMsg &&
            !hasPostedStartMsgRef.current
          ) {
            hasPostedStartMsgRef.current = true;
            sendMessage(group.id, {
              senderId: 'system',
              senderName: 'System',
              senderAvatar: '',
              text: 'Activity has started. Chat ends in 6 hours from now',
            }).catch(() => {
              hasPostedStartMsgRef.current = false;
            });
          }

          // One hour before chat end
          const oneHourBefore = new Date(chatEnd.getTime() - 60 * 60 * 1000);
          if (
            isCreator &&
            now >= oneHourBefore &&
            now < chatEnd &&
            !hasOneHourMsg &&
            !hasPostedOneHourMsgRef.current
          ) {
            hasPostedOneHourMsgRef.current = true;
            sendMessage(group.id, {
              senderId: 'system',
              senderName: 'System',
              senderAvatar: '',
              text: 'Chat gets ended/closed in 1 hr',
            }).catch(() => {
              hasPostedOneHourMsgRef.current = false;
            });
          }
        }
      } catch (e) {
        // silently ignore
      }

      // Scroll to bottom when new messages arrive
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    return () => {
      unsubscribe();
    };
  }, [id, group, currentUserId, markAsRead, incrementUnread, upsertChatPreview]);

  const handleSendMessage = async () => {
    if (messageText.trim() && group) {
      try {
        const messageData = {
          senderId: currentUserId,
          senderName: profile?.fullName || 'You',
          senderAvatar: (profile as any)?.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(profile?.fullName || 'You'),
          text: messageText.trim(),
        };

        // Send to Firestore (will sync to all devices)
        await sendMessage(group.id, messageData);

        // Also add to local store for immediate UI update (optional, since we have real-time listener)
        const newMessage: GroupMessage = {
          id: `msg_${Date.now()}`,
          groupId: group.id,
          ...messageData,
          timestamp: new Date().toISOString(),
        };
        addGroupMessage(group.id, newMessage);

        setMessageText('');
      } catch (error) {
        console.error('❌ Error sending message:', error);
        Alert.alert('Error', 'Failed to send message. Please try again.');
      }
    }
  };

  const handleLeaveGroup = () => {
    Alert.alert('Leave Group', 'Are you sure you want to leave this group?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: () => {
          if (group) {
            leaveGroup(group.id, currentUserId);
            router.replace('/(tabs)/map');
          }
        },
      },
    ]);
  };

  const handleReportGroup = () => {
    setSelectedMember(null); // Clear any selected member
    setShowReportModal(true);
  };

  // Handle leaving activity after reporting (without confirmation prompt)
  const handleLeaveAfterReport = async () => {
    if (!group) return;

    try {
      // Leave from Firestore
      await leaveActivityFirestore(group.id, currentUserId);
      console.log('👋 Member left activity after report:', group.name);

      // Leave from local store
      leaveGroup(group.id, currentUserId);

      // Navigate back to map
      router.replace('/(tabs)/map');
    } catch (error) {
      console.error('❌ Error leaving activity after report:', error);
      Alert.alert('Error', 'Failed to leave activity. Please try again.');
    }
  };

  const handleImageUpload = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Library'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            takePhoto();
          } else if (buttonIndex === 2) {
            pickImage();
          }
        }
      );
    } else {
      // Android: Show custom alert
      Alert.alert(
        'Upload Image',
        'Choose an option',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Take Photo', onPress: takePhoto },
          { text: 'Choose from Library', onPress: pickImage },
        ]
      );
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera permission is required to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        sendImageMessage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo');
      console.error('Camera error:', error);
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Photo library permission is required.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        sendImageMessage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
      console.error('Image picker error:', error);
    }
  };

  const sendImageMessage = async (imageUri: string) => {
    if (group) {
      try {
        // Show loading indicator
        setIsUploadingImage(true);

        // Upload image to Firebase Storage first
        const uploadedImageUrl = await uploadImage(imageUri, `chat-images/${group.id}`);

        const messageData = {
          senderId: currentUserId,
          senderName: profile?.fullName || 'You',
          senderAvatar: (profile as any)?.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(profile?.fullName || 'You'),
          text: '📷 Photo',
          imageUri: uploadedImageUrl, // Use cloud URL instead of local URI
        };

        // Send to Firestore (will sync to all devices)
        await sendMessage(group.id, messageData);

        // Also add to local store
        const newMessage: GroupMessage = {
          id: `msg_${Date.now()}`,
          groupId: group.id,
          ...messageData,
          timestamp: new Date().toISOString(),
        };
        addGroupMessage(group.id, newMessage);

        // Hide loading indicator
        setIsUploadingImage(false);
      } catch (error) {
        console.error('❌ Error sending image message:', error);
        setIsUploadingImage(false);
        Alert.alert('Error', 'Failed to send image. Please try again.');
      }
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const calculateAge = (dobString?: string): number | null => {
    if (!dobString) return null;

    try {
      // Handle DD/MM/YYYY format (from onboarding)
      if (dobString.includes('/')) {
        const parts = dobString.split('/');
        if (parts.length === 3) {
          const day = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
          const year = parseInt(parts[2], 10);

          if (isNaN(day) || isNaN(month) || isNaN(year)) {
            return null;
          }

          const dob = new Date(year, month, day);
          const today = new Date();

          // Validate the date is valid
          if (isNaN(dob.getTime())) {
            return null;
          }

          let age = today.getFullYear() - dob.getFullYear();
          const monthDiff = today.getMonth() - dob.getMonth();

          // Adjust age if birthday hasn't occurred this year
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
            age--;
          }

          // Validate age is reasonable (between 0 and 150)
          if (age < 0 || age > 150) {
            return null;
          }

          return age;
        }
      }

      // Try parsing as ISO date string (fallback)
      const dob = new Date(dobString);
      if (isNaN(dob.getTime())) {
        return null;
      }

      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();

      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
      }

      if (age < 0 || age > 150) {
        return null;
      }

      return age;
    } catch (error) {
      console.error('❌ Error calculating age:', error, 'DOB:', dobString);
      return null;
    }
  };

  if ((!group && !activityExpired) || isCheckingMembership) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <LinearGradient colors={[Colors.primary, Colors.darkPurple]} style={styles.container}>
          <View style={styles.centerContainer}>
            {isCheckingMembership ? (
              <>
                <ActivityIndicator size="large" color={Colors.white} />
                <Text style={styles.loadingText}>Verifying membership...</Text>
              </>
            ) : (
              <Text style={styles.errorText}>Loading chat...</Text>
            )}
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <LinearGradient
          colors={[Colors.primary, Colors.darkPurple]}
          style={[styles.container, { paddingBottom: insets.bottom }]}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => {
              // Check if we can go back, if not navigate to map
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(tabs)/map');
              }
            }} style={styles.backButton}>
              <ArrowLeft size={24} color={Colors.white} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.headerInfo}
              onPress={() => !activityExpired && router.push(`/group-details/${group.id}`)}
            >
              {(group.groupAvatar && !group.groupAvatar.includes('ui-avatars.com')) ? (
                <Image
                  source={{ uri: group.groupAvatar }}
                  style={styles.groupAvatar}
                  contentFit="cover"
                  transition={200}
                />
              ) : (
                <View style={[styles.groupAvatar, styles.defaultGroupAvatar]}>
                  <User size={20} color="#FFFFFF" fill="#FFFFFF" />
                </View>
              )}
              <View style={styles.headerTextContainer}>
                <Text style={styles.groupName}>{group.name}</Text>
                {!activityExpired && (
                  <Text style={styles.memberCount}>Tap to view {group.members.length} members</Text>
                )}
              </View>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleReportGroup}>
              <Flag size={20} color={Colors.white} />
            </TouchableOpacity>
          </View>

          {/* Activity Ended Banner */}
          {activityExpired && (
            <View style={styles.expiredBanner}>
              <Text style={styles.expiredBannerText}>⚠️ This activity has ended</Text>
            </View>
          )}

          {/* Messages */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
            keyboardShouldPersistTaps="handled"
          >
            {messages.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No messages yet</Text>
                <Text style={styles.emptySubtext}>Start the conversation!</Text>
              </View>
            ) : (
              messages.map((message) => (
                message.senderId === 'system' ? (
                  <View key={message.id} style={styles.systemMessageContainer}>
                    <Text style={styles.systemMessageText}>{message.text}</Text>
                  </View>
                ) : (
                  <View key={message.id} style={[styles.messageContainer, message.senderId === currentUserId && styles.ownMessage]}>
                    {message.senderId !== currentUserId && (
                      <Text style={styles.senderName}>{message.senderName}</Text>
                    )}
                    <View style={[styles.messageBubble, message.senderId === currentUserId && styles.ownMessageBubble, (message as any).imageUri && styles.imageBubble]}>
                      {(message as any).imageUri ? (
                        <Image
                          source={{ uri: (message as any).imageUri }}
                          style={styles.messageImage}
                          contentFit="cover"
                        />
                      ) : (
                        <Text style={[styles.messageText, message.senderId === currentUserId && styles.ownMessageText]}>
                          {message.text}
                        </Text>
                      )}
                    </View>
                    <Text style={styles.messageTime}>{formatTime(message.timestamp)}</Text>
                  </View>
                )
              ))
            )}
          </ScrollView>

          {/* Input - Only show if activity is not expired */}
          {!activityExpired && (
            <View style={styles.inputContainer}>
              <TouchableOpacity
                style={styles.plusButton}
                onPress={handleImageUpload}
                disabled={isUploadingImage}
              >
                <Plus size={24} color={isUploadingImage ? Colors.gray : Colors.white} />
              </TouchableOpacity>

              <TextInput
                style={styles.textInput}
                placeholder="Type a message..."
                editable={!isUploadingImage}
                placeholderTextColor={Colors.gray}
                value={messageText}
                onChangeText={setMessageText}
                multiline
                maxLength={500}
              />

              <TouchableOpacity
                style={[styles.sendButton, (!messageText.trim() || isUploadingImage) && styles.sendButtonDisabled]}
                onPress={handleSendMessage}
                disabled={!messageText.trim() || isUploadingImage}
              >
                {isUploadingImage ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Send size={20} color={Colors.white} />
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Uploading Indicator Overlay */}
          {isUploadingImage && (
            <View style={styles.uploadingOverlay}>
              <View style={styles.uploadingContainer}>
                <ActivityIndicator size="large" color={Colors.secondary} />
                <Text style={styles.uploadingText}>Uploading image...</Text>
              </View>
            </View>
          )}

          {/* Members Sheet (Instagram-style) */}
          {showMembersSheet && (
            <View style={styles.membersSheetOverlay}>
              <TouchableOpacity style={styles.membersSheetBackdrop} onPress={() => setShowMembersSheet(false)} />
              <View style={styles.membersSheet}>
                <View style={styles.membersSheetHeader}>
                  <Text style={styles.membersSheetTitle}>Members</Text>
                  <TouchableOpacity onPress={() => setShowMembersSheet(false)}>
                    <X size={24} color={Colors.black} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.membersList} showsVerticalScrollIndicator={false}>
                  {group.members.map((member: any, index: number) => (
                    <View key={member.id || index} style={styles.memberRow}>
                      <Image source={{ uri: member.avatar }} style={styles.memberAvatar} />
                      <View style={styles.memberInfo}>
                        <Text style={styles.memberName}>{member.name}</Text>
                        {(() => {
                          const age = calculateAge(member.dateOfBirth);
                          return age !== null && age !== undefined ? (
                            <Text style={styles.memberAge}>{age} years old</Text>
                          ) : null;
                        })()}
                      </View>
                    </View>
                  ))}
                </ScrollView>

                <View style={styles.membersSheetActions}>
                  <TouchableOpacity style={styles.leaveGroupButton} onPress={handleLeaveGroup}>
                    <LogOut size={18} color={Colors.white} />
                    <Text style={styles.leaveGroupText}>Leave Group</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.reportGroupButton} onPress={handleReportGroup}>
                    <Flag size={18} color="#FF3B30" />
                    <Text style={styles.reportGroupText}>Report Group</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </LinearGradient>

        {/* Report Modal */}
        {group && (
          <ReportModal
            visible={showReportModal}
            onClose={() => setShowReportModal(false)}
            reportType={selectedMember ? 'member' : 'group'}
            reportedItemId={selectedMember ? selectedMember.id : group.id}
            reporterUserId={currentUserId}
            members={group.members}
            activityName={group.name}
            onLeaveActivity={selectedMember ? undefined : handleLeaveAfterReport}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.primary },
  container: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 18, color: Colors.white, fontWeight: '600' },
  loadingText: { fontSize: 16, color: Colors.white, fontWeight: '500', marginTop: 12 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.1)' },
  backButton: { marginRight: 12 },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  groupAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12, borderWidth: 2, borderColor: 'rgba(255, 255, 255, 0.2)' },
  defaultGroupAvatar: { backgroundColor: '#dbdbdb', justifyContent: 'center', alignItems: 'center' },
  headerTextContainer: { flex: 1 },
  groupName: { fontSize: 18, fontWeight: 'bold', color: Colors.white },
  memberCount: { fontSize: 12, color: Colors.secondary, marginTop: 2 },
  messagesContainer: { flex: 1 },
  messagesContent: { paddingVertical: 16, paddingHorizontal: 16 },
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 18, color: Colors.white, fontWeight: '600', marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: Colors.secondary },
  messageContainer: { marginBottom: 16 },
  ownMessage: { alignItems: 'flex-end' },
  senderName: { fontSize: 12, color: Colors.secondary, marginBottom: 4, marginLeft: 12 },
  messageBubble: { backgroundColor: 'rgba(255, 255, 255, 0.15)', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, maxWidth: '80%' },
  ownMessageBubble: { backgroundColor: Colors.secondary },
  messageText: { fontSize: 16, color: Colors.white, lineHeight: 20 },
  ownMessageText: { color: Colors.black },
  systemMessageContainer: { alignItems: 'center', marginVertical: 8 },
  systemMessageText: { backgroundColor: 'rgba(255,255,255,0.15)', color: Colors.secondary, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12, fontSize: 12, fontWeight: '700' },
  messageTime: { fontSize: 10, color: Colors.secondary, marginTop: 4, marginLeft: 12 },
  imageBubble: { padding: 4, backgroundColor: 'transparent' },
  messageImage: { width: 200, height: 200, borderRadius: 12 },
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.1)' },
  plusButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.15)', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  textInput: { flex: 1, backgroundColor: 'rgba(255, 255, 255, 0.15)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, color: Colors.white, maxHeight: 100, marginRight: 8 },
  sendButton: { backgroundColor: Colors.secondary, borderRadius: 20, width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  sendButtonDisabled: { backgroundColor: Colors.gray },

  // Members Sheet (Instagram-style)
  membersSheetOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end' },
  membersSheetBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' },
  membersSheet: { backgroundColor: Colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%', paddingBottom: 20 },
  membersSheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Colors.lightGray },
  membersSheetTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.black },
  membersList: { maxHeight: 300 },
  memberRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.lightGray },
  memberAvatar: { width: 50, height: 50, borderRadius: 25, marginRight: 12 },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 16, fontWeight: '600', color: Colors.black },
  memberAge: { fontSize: 14, color: Colors.darkGray, marginTop: 2 },
  membersSheetActions: { paddingHorizontal: 20, paddingTop: 16, gap: 12 },
  leaveGroupButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, gap: 8 },
  leaveGroupText: { color: Colors.white, fontSize: 16, fontWeight: 'bold' },
  reportGroupButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.lightGray, borderRadius: 12, paddingVertical: 14, gap: 8 },
  reportGroupText: { color: '#FF3B30', fontSize: 16, fontWeight: 'bold' },

  // Uploading Indicator
  uploadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 999 },
  uploadingContainer: { backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: 16, paddingHorizontal: 32, paddingVertical: 24, alignItems: 'center', minWidth: 150 },
  uploadingText: { marginTop: 12, fontSize: 16, color: Colors.black, fontWeight: '600' },
  expiredBanner: { backgroundColor: '#FF3B30', paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center' },
  expiredBannerText: { color: Colors.white, fontSize: 14, fontWeight: '600' },
});
