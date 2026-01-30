import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, SafeAreaView, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import Colors from '@/constants/colors';
import { useGroupStore } from '@/store/groupStore';
import { useUserStore } from '@/store/userStore';
import { uploadGroupAvatar } from '@/services/storageService';
import { doc, updateDoc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useChatStore } from '@/store/chatStore';
import { ArrowLeft, Camera, MapPin, Clock, User } from 'lucide-react-native';
import { sendMessage } from '@/services/chatService';
import { Group } from '@/types';

export const options = { headerShown: false };

export default function GroupDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { groups, activeGroups, updateGroup } = useGroupStore();
  const { loginEmail, profile } = useUserStore();
  const { upsertChatPreview } = useChatStore();
  const currentUserId = profile?.uid || loginEmail || 'current_user_id';

  const [group, setGroup] = useState<any>(null);
  const lastKnownMembersRef = useRef<any[]>([]);

  useEffect(() => {
    if (!id) return;

    const hydrateGroup = (baseGroup?: Group | null, fallbackMembers: any[] = []) => {
      if (!baseGroup) return null;
      const mergedMembers =
        Array.isArray(baseGroup.members) && baseGroup.members.length > 0
          ? baseGroup.members
          : fallbackMembers.length > 0
            ? fallbackMembers
            : lastKnownMembersRef.current;

      const hydrated = { ...baseGroup, members: mergedMembers };
      if (Array.isArray(hydrated.members) && hydrated.members.length > 0) {
        lastKnownMembersRef.current = hydrated.members;
      }
      return hydrated;
    };

    const fetchMembersFromHistory = async (groupId: string) => {
      try {
        const activityDoc = await getDoc(doc(db, 'activities', groupId));
        if (activityDoc.exists()) {
          const data = activityDoc.data() as Group;
          const members = Array.isArray(data.members) ? data.members : [];
          if (members.length > 0) {
            return members;
          }
        }
      } catch (error) {
        console.log('Could not fetch members from activities collection:', error);
      }

      try {
        const archiveRef = collection(db, 'archived_activities');
        const snapshot = await getDocs(archiveRef);
        for (const docSnapshot of snapshot.docs) {
          const data = docSnapshot.data() as Group;
          if (docSnapshot.id === groupId && Array.isArray(data.members) && data.members.length > 0) {
            return data.members;
          }
        }
      } catch (error) {
        console.log('Could not fetch members from archived activities:', error);
      }

      return lastKnownMembersRef.current;
    };

    const storeGroup =
      activeGroups.find(g => g.id === id) ||
      groups.find(g => g.id === id);

    const hydratedStoreGroup = hydrateGroup(storeGroup);
    if (hydratedStoreGroup) {
      setGroup(prev => (prev?.id === hydratedStoreGroup.id ? { ...prev, ...hydratedStoreGroup } : hydratedStoreGroup));
    }

    let isMounted = true;

    const fetchGroupFromFirestore = async () => {
      try {
        const groupDoc = await getDoc(doc(db, 'activities', id as string));
        if (!isMounted) return;
        if (groupDoc.exists()) {
          const firestoreGroup = groupDoc.data() as Group;
          let hydratedFirestoreGroup = hydrateGroup(
            {
              ...(storeGroup || {}),
              ...firestoreGroup,
              id: groupDoc.id,
            } as Group,
            Array.isArray(storeGroup?.members) ? storeGroup?.members : []
          );

          if (
            hydratedFirestoreGroup &&
            (!Array.isArray(hydratedFirestoreGroup.members) || hydratedFirestoreGroup.members.length === 0)
          ) {
            const historicalMembers = await fetchMembersFromHistory(id as string);
            if (historicalMembers.length > 0) {
              hydratedFirestoreGroup = { ...hydratedFirestoreGroup, members: historicalMembers };
            }
          }

          if (hydratedFirestoreGroup) {
            setGroup(prev => {
              if (!prev) return hydratedFirestoreGroup;
              const prevCount = Array.isArray(prev.members) ? prev.members.length : 0;
              const newCount = Array.isArray(hydratedFirestoreGroup.members) ? hydratedFirestoreGroup.members.length : 0;
              if (prev.id !== hydratedFirestoreGroup.id || prevCount !== newCount) {
                return hydratedFirestoreGroup;
              }
              return prev;
            });

            if (storeGroup) {
              const storeCount = Array.isArray(storeGroup.members) ? storeGroup.members.length : 0;
              const newCount = Array.isArray(hydratedFirestoreGroup.members) ? hydratedFirestoreGroup.members.length : 0;
              if (newCount !== storeCount && newCount > 0) {
                updateGroup(hydratedFirestoreGroup);
              }
            }
          }
        } else if (!storeGroup) {
          setGroup(null);
        }
      } catch (error) {
        console.error('❌ Error fetching group details from Firestore:', error);
      }
    };

    fetchGroupFromFirestore();

    return () => {
      isMounted = false;
    };
  }, [id, groups, activeGroups, updateGroup]);

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

  const handleGroupAvatarPress = async () => {
    if (!group || group.createdBy !== currentUserId) {
      Alert.alert('Permission Denied', 'Only the activity creator can change the group picture.');
      return;
    }

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
          Alert.alert('Uploading...', 'Please wait while we upload the group picture');

          // Upload to Firebase Storage
          console.log('📤 Uploading group avatar to Firebase Storage...');
          const cloudUrl = await uploadGroupAvatar(localUri, group.id);
          console.log('✅ Group avatar uploaded to cloud:', cloudUrl);

          // Update in Firestore
          await updateDoc(doc(db, 'activities', group.id), {
            groupAvatar: cloudUrl,
          });
          console.log('✅ Group avatar updated in Firestore');

          // Update local group state
          const updatedGroup = { ...group, groupAvatar: cloudUrl };
          updateGroup(updatedGroup);
          setGroup(updatedGroup);

          // Update chat preview avatar
          upsertChatPreview({
            id: group.id,
            userId: group.id,
            name: group.name,
            avatar: cloudUrl,
            lastMessage: 'Group picture updated',
            timestamp: new Date().toISOString(),
            unread: 0,
            isGroupChat: true,
          });

          // Post system message in chat about picture change
          try {
            await sendMessage(group.id, {
              senderId: 'system',
              senderName: 'System',
              senderAvatar: '',
              text: 'Group picture was changed',
            });
          } catch (e) {
            // ignore
          }

          console.log('✅ Group picture updated everywhere');
          Alert.alert('Success', 'Group picture updated and visible to everyone!');
        } catch (uploadError) {
          console.error('❌ Error uploading group avatar:', uploadError);
          Alert.alert('Error', 'Failed to upload group picture. Please try again.');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
      console.error('Image picker error:', error);
    }
  };

  if (!group) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.primary }}>
        <LinearGradient colors={[Colors.primary, Colors.darkPurple]} style={styles.container}>
          <View style={styles.centerContainer}>
            <Text style={styles.errorText}>Group not found</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  const isCreator = group.createdBy === currentUserId;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.primary }}>
      <LinearGradient colors={[Colors.primary, Colors.darkPurple]} style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Group Details</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Group Avatar */}
          <View style={styles.avatarSection}>
            <TouchableOpacity
              onPress={handleGroupAvatarPress}
              style={styles.avatarContainer}
              disabled={!isCreator}
            >
              {(group.groupAvatar && !group.groupAvatar.includes('ui-avatars.com')) ? (
                <Image
                  source={{ uri: group.groupAvatar }}
                  style={styles.groupAvatar}
                />
              ) : (
                <View style={[styles.groupAvatar, styles.defaultGroupAvatar]}>
                  <User size={60} color="#FFFFFF" fill="#FFFFFF" />
                </View>
              )}
              {isCreator && (
                <View style={styles.cameraIconContainer}>
                  <Camera size={20} color={Colors.white} />
                </View>
              )}
            </TouchableOpacity>
            <Text style={styles.groupName}>{group.name}</Text>
            <Text style={styles.groupEmoji}>{group.emoji || '✨'}</Text>
          </View>

          {/* Activity Info */}
          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <MapPin size={18} color={Colors.secondary} />
              <Text style={styles.infoText}>{group.meetingLocation}</Text>
            </View>
            <View style={styles.infoRow}>
              <Clock size={18} color={Colors.secondary} />
              <Text style={styles.infoText}>
                Expires {new Date(group.expiresAt).toLocaleString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          </View>

          {/* Members Section */}
          <View style={styles.membersSection}>
            <Text style={styles.sectionTitle}>Members ({group.members.length}/{group.maxMembers})</Text>

            {group.members.map((member: any, index: number) => {
              console.log('👤 Rendering member:', { id: member.id, name: member.name, email: member.email });
              console.log('🔍 Current user ID:', currentUserId);
              console.log('🔍 Member matches current user:', member.id === currentUserId || member.email === currentUserId);
              const age = calculateAge(member.dateOfBirth);
              const isActivityCreator = member.id === group.createdBy;
              const isCurrentUser = member.id === currentUserId || member.email === currentUserId;
              const avatarUrl = member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}`;

              return (
                <View key={member.id || index} style={[styles.memberCard, isCurrentUser && styles.currentUserCard]}>
                  <Image
                    source={{ uri: avatarUrl }}
                    style={styles.memberAvatar}
                    contentFit="cover"
                    transition={200}
                  />
                  <View style={styles.memberInfo}>
                    <View style={styles.memberNameRow}>
                      <Text style={styles.memberName}>{member.name || 'Unknown User'}</Text>
                      {isCurrentUser && (
                        <View style={styles.currentUserBadge}>
                          <Text style={styles.currentUserText}>You</Text>
                        </View>
                      )}
                      {isActivityCreator && (
                        <View style={styles.creatorBadge}>
                          <Text style={styles.creatorText}>Creator</Text>
                        </View>
                      )}
                    </View>
                    {age !== null && age !== undefined && (
                      <Text style={styles.memberAge}>{age} years old</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: Colors.white,
    fontSize: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.white,
  },
  content: {
    paddingBottom: 32,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  groupAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: Colors.secondary,
  },
  defaultGroupAvatar: {
    backgroundColor: '#dbdbdb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.primary,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.secondary,
  },
  groupName: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.white,
    textAlign: 'center',
    marginBottom: 8,
  },
  groupEmoji: {
    fontSize: 40,
  },
  infoSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    color: Colors.white,
    fontSize: 16,
    marginLeft: 12,
    flex: 1,
  },
  membersSection: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.primary,
    marginBottom: 20,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.lightGray,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  currentUserCard: {
    backgroundColor: Colors.secondary,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  memberAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  memberInfo: {
    flex: 1,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  memberName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.black,
    marginRight: 8,
  },
  memberAge: {
    fontSize: 14,
    color: Colors.darkGray,
  },
  currentUserBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginRight: 8,
  },
  currentUserText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.white,
  },
  creatorBadge: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  creatorText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
});

