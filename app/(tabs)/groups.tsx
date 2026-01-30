import React, { useState, useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View, TouchableOpacity, Alert, Linking, Animated, Easing, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import GroupCard from '@/components/GroupCard';
import GroupCreationModal from '@/components/GroupCreationModal';
import GroupsMapView from '@/components/GroupsMapView';
import GroupEditModal from '@/components/GroupEditModal';
import { useGroupStore } from '@/store/groupStore';
import { useUserStore } from '@/store/userStore';
import { Group } from '@/types';
import { mockGroups } from '@/constants/mockData';
import { Plus, Map, Settings, Users as UsersIcon } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useChatStore } from '@/store/chatStore';
import { Image } from 'expo-image';
import ManageMembersModal from '@/components/ManageMembersModal';
import EdgeBubbles from '@/components/EdgeBubbles';

// helper to compute age if dob exists
const getAge = (dob?: string): string => {
  if (!dob) return '—';

  try {
    // Handle DD/MM/YYYY format (from onboarding)
    if (dob.includes('/')) {
      const parts = dob.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
        const year = parseInt(parts[2], 10);

        if (isNaN(day) || isNaN(month) || isNaN(year)) {
          return '—';
        }

        const d = new Date(year, month, day);
        if (isNaN(d.getTime())) {
          return '—';
        }

        const now = new Date();
        let age = now.getFullYear() - d.getFullYear();
        const m = now.getMonth() - d.getMonth();

        // Adjust age if birthday hasn't occurred this year
        if (m < 0 || (m === 0 && now.getDate() < d.getDate())) {
          age--;
        }

        // Validate age is reasonable (between 0 and 150)
        if (age < 0 || age > 150) {
          return '—';
        }

        return String(age);
      }
    }

    // Try parsing as ISO date string (fallback)
    const d = new Date(dob);
    if (isNaN(d.getTime())) {
      return '—';
    }

    const now = new Date();
    let age = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();

    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) {
      age--;
    }

    if (age < 0 || age > 150) {
      return '—';
    }

    return String(age);
  } catch (error) {
    console.error('❌ Error calculating age:', error, 'DOB:', dob);
    return '—';
  }
};

export default function GroupsScreen() {
  const { activeGroups, joinGroup, createGroup, setActiveGroups, updateGroup, currentUserActiveGroupId, leaveGroup } = useGroupStore();
  const [selectedMood, setSelectedMood] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMapView, setShowMapView] = useState(false);
  const { loginEmail, profile } = useUserStore();
  const currentUserId = loginEmail || profile?.email;
  const currentUserName = profile?.fullName || 'Current User';
  const currentUserAvatar = (profile as any)?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format';
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [editing, setEditing] = useState(false);
  const router = useRouter();
  const { upsertChatPreview } = useChatStore();

  // add state for manage members modal
  const [showManageMembers, setShowManageMembers] = useState(false);

  // Initialize with mock data
  useEffect(() => {
    if (activeGroups.length === 0) {
      setActiveGroups(mockGroups);
    }
  }, [activeGroups.length, setActiveGroups]);

  const moodOptions = ['all', 'party', 'coffee', 'food', 'chill', 'movie', 'walk'];

  // Filter lists (computed live)
  const now = new Date();
  const nonExpiredGroups = activeGroups.filter(group => new Date(group.expiresAt) > now);
  const moodFilteredGroups = selectedMood === 'all' ? nonExpiredGroups : nonExpiredGroups.filter(group => group.mood === selectedMood);

  // Active group detail logic
  const activeGroupId = currentUserActiveGroupId?.[currentUserId as string] || null;
  const activeGroup = nonExpiredGroups.find(g => g.id === activeGroupId) || null;

  // Simple enter animation for detail view
  const detailAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (activeGroup) {
      detailAnim.setValue(0);
      Animated.timing(detailAnim, {
        toValue: 1,
        duration: 350,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [activeGroup, detailAnim]);

  const handleJoinGroup = (groupId: string) => {
    const existing = currentUserActiveGroupId?.[currentUserId as string];
    if (existing && existing !== groupId) {
      Alert.alert('Already in a group', 'You can only join one group at a time. Leave your current group before joining another.');
      return;
    }
    Alert.alert(
      'Join Group',
      'Are you sure you want to join this group?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Join',
          onPress: () => {
            joinGroup(groupId, currentUserId as string, currentUserName, currentUserAvatar);
            const group = activeGroups.find(g => g.id === groupId);
            if (group) {
              upsertChatPreview({
                id: group.chatId,
                userId: group.id,
                name: group.name,
                avatar: group.groupAvatar || '',
                lastMessage: '',
                timestamp: new Date().toISOString(),
                unread: 0,
              });
            }
            Alert.alert('Success', 'You have joined the group!');
          }
        },
      ]
    );
  };

  const handleCreateGroup = () => {
    setShowCreateModal(true);
  };

  const handleGroupPress = (group: Group) => {
    const isMember = group.members.some(m => m.id === currentUserId);
    if (isMember) {
      router.push(`/group-chat/${group.id}`);
    } else {
      const existing = currentUserActiveGroupId?.[currentUserId as string];
      if (existing && existing !== group.id) {
        Alert.alert('Already in a group', 'You can only join one group at a time. Leave your current group before joining another.');
        return;
      }
      Alert.alert(
        'Join Group?',
        'You must join this group to access its chat. Join?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Join',
            onPress: () => {
              joinGroup(group.id, currentUserId as string, currentUserName, currentUserAvatar);
              upsertChatPreview({
                id: group.chatId,
                userId: group.id,
                name: group.name,
                avatar: group.groupAvatar || '',
                lastMessage: '',
                timestamp: new Date().toISOString(),
                unread: 0,
              });
              router.push(`/group-chat/${group.id}`);
            }
          },
        ]
      );
    }
  };

  const openInMaps = (lat: number, lng: number, label: string) => {
    const apple = `http://maps.apple.com/?daddr=${lat},${lng}`;
    const google = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    Linking.openURL(Platform.select({ ios: apple, android: google, default: google }) as string);
  };

  const handleLeaveActiveGroup = () => {
    if (!activeGroup) return;
    Alert.alert(
      'Leave Group',
      'Are you sure you want to leave this group?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave', style: 'destructive', onPress: () => {
            leaveGroup(activeGroup.id, currentUserId as string);
          }
        }
      ]
    );
  };

  const handleReportGroup = () => {
    Alert.alert('Report Group', 'Thanks for your report. Our team will review this group.');
  };

  // If user is in an active group, show detail-only view with animation
  if (activeGroup) {
    const translateY = detailAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] });
    const opacity = detailAnim;
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.primary }}>
        <LinearGradient colors={[Colors.primary, Colors.darkPurple]} style={styles.container}>
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} pointerEvents="none">
            <EdgeBubbles />
          </View>
          <Animated.View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 20, opacity, transform: [{ translateY }] }}>
            {/* title centered */}
            <View style={{ marginBottom: 16, alignItems: 'center' }}>
              <Text style={{ color: Colors.white, fontSize: 26, fontWeight: '800', textAlign: 'center' }}>{activeGroup.name}</Text>
              <Text style={{ color: Colors.secondary, marginTop: 6, fontWeight: '600' }}>{activeGroup.members.length}/{activeGroup.maxMembers} members</Text>
            </View>

            {/* creator controls row (if creator) */}
            {activeGroup.createdBy === (currentUserId as string) && (
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                <TouchableOpacity
                  onPress={() => setSelectedGroup(activeGroup)}
                  style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
                >
                  <Text style={{ color: Colors.white, fontWeight: '700' }}>Edit Details</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowManageMembers(true)}
                  style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
                >
                  <Text style={{ color: Colors.white, fontWeight: '700' }}>Manage Members</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* members list card */}
            <View style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <UsersIcon size={16} color={Colors.secondary} />
                <Text style={{ color: Colors.white, fontSize: 16, fontWeight: '700', marginLeft: 8 }}>Members</Text>
              </View>
              {activeGroup.members.map((m, idx) => (
                <Animated.View key={m.id} style={{
                  flexDirection: 'row', alignItems: 'center', marginBottom: 10,
                  opacity: detailAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
                  transform: [{ translateY: detailAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
                }}>
                  <Image
                    source={{ uri: m.avatar }}
                    style={{ width: 40, height: 40, borderRadius: 20, marginRight: 12, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' }}
                  />
                  <Text style={{ color: Colors.white, fontSize: 15, fontWeight: '600', flex: 1 }}>{m.name}</Text>
                  <Text style={{ color: Colors.secondary, fontWeight: '700' }}>{getAge((m as any).dateOfBirth)}</Text>
                </Animated.View>
              ))}
            </View>

            {/* details stacked card remains, but ensure vertical layout */}
            <View style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <Text style={{ color: Colors.white, fontSize: 16, fontWeight: '700', marginBottom: 8 }}>Details</Text>
              <Text style={{ color: Colors.white, marginBottom: 6 }}>Activity: {activeGroup.mood.charAt(0).toUpperCase() + activeGroup.mood.slice(1)}</Text>
              {activeGroup.meetingLocation ? (
                <Text style={{ color: Colors.white, marginBottom: 10 }}>Location: {activeGroup.meetingLocation}</Text>
              ) : null}
              <TouchableOpacity
                style={{ backgroundColor: Colors.secondary, borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 4 }}
                onPress={() => openInMaps(activeGroup.location.latitude, activeGroup.location.longitude, activeGroup.name)}
              >
                <Text style={{ color: Colors.black, fontWeight: '700' }}>Get Location on Map</Text>
              </TouchableOpacity>
            </View>

            {/* at bottom, keep CTA row (view chat / leave) and report button as before */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: Colors.secondary }}
                onPress={() => router.push(`/group-chat/${activeGroup.id}`)}
              >
                <Text style={{ color: Colors.white, fontWeight: '700' }}>View Chat</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: Colors.secondary, borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
                onPress={handleLeaveActiveGroup}
              >
                <Text style={{ color: Colors.black, fontWeight: '700' }}>Leave Group</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={{ marginTop: 12, alignItems: 'center', paddingVertical: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)' }}
              onPress={handleReportGroup}
            >
              <Text style={{ color: Colors.white, fontWeight: '700' }}>Report Group</Text>
            </TouchableOpacity>
          </Animated.View>
        </LinearGradient>

        {/* mount ManageMembersModal at bottom of component */}
        <ManageMembersModal
          visible={showManageMembers}
          members={activeGroup.members}
          adminId={activeGroup.createdBy}
          currentUserId={currentUserId as string}
          onRemove={(member: any) => updateGroup({ ...activeGroup, members: activeGroup.members.filter(m => m.id !== member.id) })}
          onReport={(member: any) => Alert.alert('Report Member', `Reported ${member.name}.`)}
          onClose={() => setShowManageMembers(false)}
        />

        {selectedGroup && (
          <GroupEditModal
            visible={!!selectedGroup}
            group={selectedGroup}
            editable={selectedGroup.createdBy === currentUserId}
            onClose={() => setSelectedGroup(null)}
            onSave={updatedGroup => {
              updateGroup(updatedGroup);
              setSelectedGroup(null);
            }}
          />
        )}
      </SafeAreaView>
    );
  }

  // Default list view if no active group joined
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.primary }}>
      <LinearGradient
        colors={[Colors.primary, Colors.darkPurple]}
        style={styles.container}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.mapButton}
            onPress={() => setShowMapView(true)}
          >
            <Map size={20} color={Colors.white} />
            <Text style={styles.mapButtonText}>Show on Map</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.createButton} onPress={handleCreateGroup}>
            <Plus size={24} color={Colors.white} />
          </TouchableOpacity>
        </View>

        <View style={styles.filtersContainer}>
          <Text style={styles.filtersTitle}>Filter by mood:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersScroll}
          >
            {moodOptions.map((mood) => (
              <TouchableOpacity
                key={mood}
                style={[styles.filterChip, selectedMood === mood && styles.filterChipActive]}
                onPress={() => setSelectedMood(mood)}
              >
                <Text style={[styles.filterText, selectedMood === mood && styles.filterTextActive]}>
                  {mood === 'all' ? 'All' : mood.charAt(0).toUpperCase() + mood.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {moodFilteredGroups.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No groups found</Text>
              <Text style={styles.emptySubtitle}>
                {selectedMood === 'all'
                  ? 'Create a group or check back later for new meetups'
                  : `No ${selectedMood} groups available right now`
                }
              </Text>
              <TouchableOpacity style={styles.emptyButton} onPress={handleCreateGroup}>
                <Text style={styles.emptyButtonText}>Create Group</Text>
              </TouchableOpacity>
            </View>
          ) : (
            moodFilteredGroups.map((group) => {
              const isMember = group.members.some(m => m.id === currentUserId);
              return (
                <GroupCard
                  key={group.id}
                  group={group}
                  currentUserId={currentUserId as string}
                  isMember={isMember}
                  onPress={() => handleGroupPress(group)}
                  onJoinGroup={handleJoinGroup}
                  showJoinButton={!isMember}
                />
              );
            })
          )}
        </ScrollView>

        <GroupCreationModal
          visible={showCreateModal}
          onClose={() => setShowCreateModal(false)}
        />

        {showMapView && (
          <GroupsMapView onClose={() => setShowMapView(false)} />
        )}

        {selectedGroup && (
          <GroupEditModal
            visible={!!selectedGroup}
            group={selectedGroup}
            editable={selectedGroup.createdBy === currentUserId}
            onClose={() => setSelectedGroup(null)}
            onSave={updatedGroup => {
              updateGroup(updatedGroup);
              setSelectedGroup(null);
            }}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    gap: 8,
  },
  mapButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  createButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  filtersContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  filtersTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
    marginBottom: 12,
  },
  filtersScroll: {
    paddingRight: 20,
  },
  filterChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  filterChipActive: {
    backgroundColor: Colors.secondary,
    borderColor: Colors.secondary,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.white,
  },
  filterTextActive: {
    color: Colors.black,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: Colors.secondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  emptyButton: {
    backgroundColor: Colors.secondary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyButtonText: {
    color: Colors.black,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
