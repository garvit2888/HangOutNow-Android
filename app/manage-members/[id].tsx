import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, SafeAreaView, ScrollView, Modal, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import Colors from '@/constants/colors';
import { useGroupStore } from '@/store/groupStore';
import { useUserStore } from '@/store/userStore';
import { ArrowLeft, Users as UsersIcon } from 'lucide-react-native';
import { removeMemberFromActivity, leaveActivity as leaveActivityFirestore } from '@/services/activityService';
import ReportModal from '@/components/ReportModal';

export const options = { headerShown: false };

export default function ManageMembersScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { activeGroups, groups, leaveGroup } = useGroupStore();
  const { loginEmail, profile } = useUserStore();
  const currentUserId = profile?.uid || loginEmail || 'current_user_id';

  const [activity, setActivity] = useState<any>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [zoomScale] = useState(new Animated.Value(1));
  const [zoomTranslate] = useState({ x: new Animated.Value(0), y: new Animated.Value(0) });
  const currentScale = useRef(1);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);

  useEffect(() => {
    // Look in both groups and activeGroups (Firestore synced activities)
    // Prioritize activeGroups since activities are stored there
    const foundActivity = activeGroups.find(g => g.id === id) || groups.find(g => g.id === id);
    if (foundActivity) {
      setActivity(foundActivity);
    }
  }, [id, groups, activeGroups]);

  const isCreator = activity?.createdBy === currentUserId;

  const handleRemoveMember = async (member: any) => {
    if (!isCreator) {
      Alert.alert('Error', 'Only the activity creator can remove members');
      return;
    }
    
    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${member.name} from this activity?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeMemberFromActivity(activity.id, member.id);
              // Refresh the activity
              const updatedActivity = activeGroups.find(g => g.id === id) || groups.find(g => g.id === id);
              if (updatedActivity) {
                setActivity(updatedActivity);
              }
              Alert.alert('Success', `${member.name} has been removed from the activity`);
            } catch (error) {
              console.error('❌ Error removing member:', error);
              Alert.alert('Error', 'Failed to remove member. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleReportMember = (member: any) => {
    setSelectedMember(member);
    setShowReportModal(true);
  };

  // Handle leaving activity after reporting (without confirmation prompt)
  const handleLeaveAfterReport = async () => {
    if (!activity) return;
    
    try {
      // Leave from Firestore
      await leaveActivityFirestore(activity.id, currentUserId);
      console.log('👋 Member left activity after report:', activity.name);
      
      // Leave from local store
      leaveGroup(activity.id, currentUserId);
      
      // Navigate back to map
      router.replace('/(tabs)/map');
    } catch (error) {
      console.error('❌ Error leaving activity after report:', error);
      Alert.alert('Error', 'Failed to leave activity. Please try again.');
    }
  };

  const handleImagePress = (imageUri: string) => {
    setSelectedImage(imageUri);
    // Reset zoom
    currentScale.current = 1;
    zoomScale.setValue(1);
    zoomTranslate.x.setValue(0);
    zoomTranslate.y.setValue(0);
    
    // Auto-zoom in slightly after a short delay
    setTimeout(() => {
      currentScale.current = 1.3;
      Animated.spring(zoomScale, {
        toValue: 1.3, // Slight zoom (30% larger)
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    }, 100);
  };

  const handleZoomIn = () => {
    const newScale = currentScale.current * 1.2;
    currentScale.current = newScale;
    Animated.spring(zoomScale, {
      toValue: newScale,
      useNativeDriver: true,
    }).start();
  };

  const handleZoomOut = () => {
    const newScale = Math.max(1, currentScale.current * 0.8);
    currentScale.current = newScale;
    Animated.spring(zoomScale, {
      toValue: newScale,
      useNativeDriver: true,
    }).start();
    if (newScale <= 1.1) {
      Animated.spring(zoomTranslate.x, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
      Animated.spring(zoomTranslate.y, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    }
  };

  if (!activity) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.primary }}>
        <LinearGradient colors={[Colors.primary, Colors.darkPurple]} style={styles.container}>
          <View style={styles.centerContainer}>
            <Text style={styles.errorText}>Activity not found</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.primary }}>
      <LinearGradient colors={[Colors.primary, Colors.darkPurple]} style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isCreator ? 'Manage Members' : 'View Members'}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.membersSection}>
            <Text style={styles.sectionTitle}>
              Members ({activity.members.length}/{activity.maxMembers})
            </Text>
            
            {activity.members.map((member: any, index: number) => {
              const isActivityCreator = member.id === activity.createdBy;
              const isCurrentUser = member.id === currentUserId || member.email === currentUserId;
              const avatarUrl = member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}`;
              
              return (
                <View key={member.id || index} style={styles.memberCard}>
                  <TouchableOpacity
                    onPress={() => handleImagePress(avatarUrl)}
                    activeOpacity={0.8}
                  >
                    <Image
                      source={{ uri: avatarUrl }}
                      style={styles.memberAvatar}
                      contentFit="cover"
                      transition={200}
                    />
                  </TouchableOpacity>
                  <View style={styles.memberInfo}>
                    <View style={styles.memberNameRow}>
                      <Text style={styles.memberName}>{member.name}</Text>
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
                    {member.age && <Text style={styles.memberAge}>{member.age} years old</Text>}
                  </View>
                  
                  {isCreator && member.id !== activity.createdBy && (
                    <View style={styles.actionButtons}>
                      <TouchableOpacity 
                        style={styles.reportButton} 
                        onPress={() => handleReportMember(member)}
                      >
                        <Text style={styles.reportButtonText}>Report</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.removeButton} 
                        onPress={() => handleRemoveMember(member)}
                      >
                        <Text style={styles.removeButtonText}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>

        {/* Image Zoom Modal */}
        <Modal
          visible={selectedImage !== null}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setSelectedImage(null)}
        >
          <View style={styles.imageModalOverlay}>
            <TouchableOpacity
              style={styles.imageModalCloseButton}
              onPress={() => setSelectedImage(null)}
            >
              <Text style={styles.imageModalCloseText}>✕</Text>
            </TouchableOpacity>
            
            <Animated.View
              style={[
                styles.zoomedImageContainer,
                {
                  transform: [
                    { scale: zoomScale },
                    { translateX: zoomTranslate.x },
                    { translateY: zoomTranslate.y },
                  ],
                },
              ]}
            >
              {selectedImage && (
                <Image
                  source={{ uri: selectedImage }}
                  style={styles.zoomedImage}
                  contentFit="contain"
                />
              )}
            </Animated.View>
            
            <View style={styles.zoomControls}>
              <TouchableOpacity style={styles.zoomButton} onPress={handleZoomIn}>
                <Text style={styles.zoomButtonText}>🔍+</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.zoomButton} onPress={handleZoomOut}>
                <Text style={styles.zoomButtonText}>🔍-</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Report Modal */}
        {activity && (
          <ReportModal
            visible={showReportModal}
            onClose={() => {
              setShowReportModal(false);
              setSelectedMember(null);
            }}
            reportType={selectedMember ? 'member' : 'group'}
            reportedItemId={selectedMember ? selectedMember.id : activity.id}
            reporterUserId={currentUserId}
            members={activity.members}
            activityName={activity.name}
            onLeaveActivity={selectedMember ? undefined : handleLeaveAfterReport}
          />
        )}
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
  membersSection: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
    minHeight: '100%',
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
  memberAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginRight: 16,
  },
  memberInfo: {
    flex: 1,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    flexWrap: 'wrap',
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
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  reportButton: {
    backgroundColor: Colors.lightGray,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  reportButtonText: {
    color: Colors.secondary,
    fontWeight: '700',
    fontSize: 14,
  },
  removeButton: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  removeButtonText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
  imageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalCloseButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalCloseText: {
    color: Colors.white,
    fontSize: 24,
    fontWeight: 'bold',
  },
  zoomedImageContainer: {
    width: '90%',
    height: '70%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomedImage: {
    width: '100%',
    height: '100%',
  },
  zoomControls: {
    position: 'absolute',
    bottom: 40,
    flexDirection: 'row',
    gap: 20,
  },
  zoomButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomButtonText: {
    fontSize: 24,
  },
});

