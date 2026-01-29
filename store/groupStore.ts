import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Group, GroupMessage } from '@/types';

interface GroupState {
  groups: Group[];
  activeGroups: Group[];
  myGroups: Group[];
  groupMessages: { [groupId: string]: GroupMessage[] };
  currentUserActiveGroupId?: Record<string, string | null>;
  userCreatedActivityId?: Record<string, string | null>; // Track user's created activity
  
  // Actions
  setGroups: (groups: Group[]) => void;
  addGroup: (group: Group) => void;
  updateGroup: (updated: Group) => void;
  joinGroup: (groupId: string, userId: string, name?: string, avatar?: string) => void;
  leaveGroup: (groupId: string, userId: string) => void;
  stopActivity: (groupId: string, creatorId: string) => void;
  updateUserAvatar: (userId: string, newAvatar: string) => void;
  setActiveGroups: (groups: Group[]) => void;
  clearActiveGroups: () => void;
  addGroupMessage: (groupId: string, message: GroupMessage) => void;
  setGroupMessages: (groupId: string, messages: GroupMessage[]) => void;
  setMyGroups: (groups: Group[]) => void;
  createGroup: (groupData: {
    name: string;
    mood: string;
    emoji?: string;
    location: { latitude: number; longitude: number };
    distance: number;
    members: User[];
    maxMembers: number;
    createdBy: string;
    creatorName?: string;
    creatorAvatar?: string;
    isActive: boolean;
    isPublic: boolean;
    meetingLocation: string;
    expiresAt?: string;
  }) => Group;
  canUserCreateActivity: (userId: string) => boolean;
  removeUserCreatedActivity: (userId: string) => void;
  clearAllGroups: () => void;
  clearUserSpecificData: (userId: string) => void;
}

export const useGroupStore = create<GroupState>()(
  persist(
    (set, get) => ({
      groups: [],
      activeGroups: [],
      groupMessages: {},
      myGroups: [],
      currentUserActiveGroupId: {},
      userCreatedActivityId: {},
      
      setGroups: (groups) => set({ groups }),
      
      addGroup: (group) => set((state) => ({
        groups: [...state.groups, group],
        activeGroups: group.isActive ? [...state.activeGroups, group] : state.activeGroups,
      })),
      
      updateGroup: (updated) => {
        set(state => ({
          groups: state.groups.map(g => g.id === updated.id ? { ...g, ...updated } : g),
          activeGroups: state.activeGroups.map(g => g.id === updated.id ? { ...g, ...updated } : g),
          myGroups: state.myGroups.map(g => g.id === updated.id ? { ...g, ...updated } : g),
        }));
      },
      
      joinGroup: (groupId, userId, name, avatar) => set((state) => {
        const activeMap = { ...(state.currentUserActiveGroupId || {}) };
        if (activeMap[userId] && activeMap[userId] !== groupId) {
          // user already in a different group — prevent join
          return {} as any;
        }
        const groups = state.groups.map(group => {
          if (group.id === groupId && group.members.length < group.maxMembers) {
            const isAlreadyMember = group.members.some(member => member.id === userId);
            if (!isAlreadyMember) {
              // Use real name and avatar
              const newMember = {
                id: userId,
                name: name || 'Current User',
                avatar: avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format',
                location: { latitude: 0, longitude: 0 },
                distance: 0,
                mood: 'chill',
                mutualFriends: 0,
                isOnline: true,
              };
              activeMap[userId] = groupId;
              return {
                ...group,
                members: [...group.members, newMember],
              };
            }
          }
          return group;
        });
        return { groups, currentUserActiveGroupId: activeMap };
      }),
      
      leaveGroup: (groupId, userId) => set((state) => {
        const groups = state.groups.map(group => {
          if (group.id === groupId) {
            return {
              ...group,
              members: group.members.filter(member => member.id !== userId),
            };
          }
          return group;
        });
        
        const activeMap = { ...(state.currentUserActiveGroupId || {}) };
        if (activeMap[userId] === groupId) activeMap[userId] = null;
        return { groups, myGroups: state.myGroups.filter(group => group.id !== groupId), currentUserActiveGroupId: activeMap };
      }),

      stopActivity: (groupId, creatorId) => set((state) => {
        // Completely remove the activity from all lists
        const groups = state.groups.filter(g => g.id !== groupId);
        const activeGroups = state.activeGroups.filter(g => g.id !== groupId);
        const myGroups = state.myGroups.filter(g => g.id !== groupId);
        
        // Clear creator's active group and created activity tracking
        const activeMap = { ...(state.currentUserActiveGroupId || {}) };
        if (activeMap[creatorId] === groupId) activeMap[creatorId] = null;
        
        const createdMap = { ...(state.userCreatedActivityId || {}) };
        if (createdMap[creatorId] === groupId) createdMap[creatorId] = null;
        
        return { 
          groups, 
          activeGroups, 
          myGroups, 
          currentUserActiveGroupId: activeMap,
          userCreatedActivityId: createdMap 
        };
      }),

      updateUserAvatar: (userId, newAvatar) => set((state) => {
        // Update avatar for this user in ALL groups where they're a member
        const updateMemberAvatar = (groups: Group[]) => 
          groups.map(group => ({
            ...group,
            members: group.members.map(member => 
              member.id === userId ? { ...member, avatar: newAvatar } : member
            )
          }));

        return {
          groups: updateMemberAvatar(state.groups),
          activeGroups: updateMemberAvatar(state.activeGroups),
          myGroups: updateMemberAvatar(state.myGroups),
        };
      }),
      
      setActiveGroups: (groups) => set((state) => {
        // Merge with existing groups to preserve local data like profile pictures
        const existingGroups = state.activeGroups || [];
        
        console.log('🔄 setActiveGroups called with:', groups.length, 'groups');
        console.log('🔄 Existing groups:', existingGroups.length);
        
        // Check if groups are actually different to prevent infinite loops
        const hasChanged = groups.length !== existingGroups.length || 
          groups.some((newGroup) => {
            const existingGroup = existingGroups.find(g => g.id === newGroup.id);
            if (!existingGroup) return true;
            if (newGroup.members.length !== existingGroup.members.length) return true;
            // Check if any member IDs are different
            const newMemberIds = newGroup.members.map(m => m.id).sort();
            const existingMemberIds = existingGroup.members.map(m => m.id).sort();
            return JSON.stringify(newMemberIds) !== JSON.stringify(existingMemberIds);
          });
        
        if (!hasChanged) {
          console.log('🔄 No changes detected, skipping update');
          return state;
        }
        
        console.log('🔄 Changes detected, updating activeGroups');
        
        // Filter out expired activities before merging
        const now = new Date();
        const nonExpiredGroups = groups.filter(group => {
          const expiresAt = new Date(group.expiresAt);
          const isExpired = expiresAt <= now;
          if (isExpired) {
            console.log(`⏰ Removing expired activity from store: ${group.name} (expired at ${expiresAt.toISOString()})`);
          }
          return !isExpired;
        });
        
        console.log(`🔄 Filtered ${nonExpiredGroups.length} non-expired activities out of ${groups.length} total`);
        
        const mergedGroups = nonExpiredGroups.map(firestoreGroup => {
          // Find existing group with same ID to preserve local data
          const existingGroup = existingGroups.find(g => g.id === firestoreGroup.id);
          if (existingGroup) {
            // Merge Firestore data with local data (preserve local profile pictures, etc.)
            return {
              ...firestoreGroup,
              // Keep local member avatars if they exist
              members: firestoreGroup.members.map(member => {
                const existingMember = existingGroup.members.find(m => m.id === member.id);
                return existingMember ? { ...member, avatar: existingMember.avatar } : member;
              })
            };
          }
          return firestoreGroup;
        });
        
        // Remove duplicates by ID to prevent React key conflicts
        const uniqueGroups = mergedGroups.filter((group, index, self) => 
          index === self.findIndex(g => g.id === group.id)
        );
        
        console.log('🔄 Merging activeGroups:', {
          firestoreCount: groups.length,
          existingCount: existingGroups.length,
          mergedCount: mergedGroups.length,
          uniqueCount: uniqueGroups.length
        });
        
        return { activeGroups: uniqueGroups };
      }),
      
      clearActiveGroups: () => set({ activeGroups: [] }),
      
      addGroupMessage: (groupId, message) => set((state) => ({
        groupMessages: {
          ...state.groupMessages,
          [groupId]: [...(state.groupMessages[groupId] || []), message],
        },
      })),
      
      setGroupMessages: (groupId, messages) => set((state) => ({
        groupMessages: {
          ...state.groupMessages,
          [groupId]: messages,
        },
      })),
      
      setMyGroups: (groups) => set({ myGroups: groups }),
      
      createGroup: (groupData) => {
        // Check if creator is already a member
        const creatorId = groupData.createdBy;
        const existing = groupData.members.find(m => m.id === creatorId || m.email === creatorId);
        let creatorUser: User | undefined = existing;
        if (!creatorUser) {
          // Get the actual user from userStore via import
          // Since we can't import userStore here directly (circular dependency), 
          // we need the caller to pass the creator info
          // For now, use a fallback that will be replaced
          creatorUser = {
            id: creatorId,
            name: groupData.creatorName || 'Admin',
            avatar: groupData.creatorAvatar || 'https://ui-avatars.com/api/?name=Admin',
            location: { latitude: groupData.location.latitude, longitude: groupData.location.longitude },
            distance: 0,
            mood: groupData.mood,
            mutualFriends: 0,
            isOnline: true,
          };
        }
        // Ensure creator is in members list (don't duplicate if already there)
        const membersWithCreator = groupData.members.some(m => m.id === creatorId) 
          ? groupData.members 
          : [creatorUser, ...groupData.members];
        
        console.log('🏗️ Creating group with members:', {
          creatorId,
          membersCount: membersWithCreator.length,
          members: membersWithCreator.map(m => ({ id: m.id, name: m.name }))
        });
        
        const newGroup: Group = {
          ...groupData,
          members: membersWithCreator,
          id: groupData.id || `group_${Date.now()}`, // Use passed ID or generate new one
          chatId: groupData.chatId || `chat_${Date.now()}`, // Use passed chatId or generate new one
          createdAt: groupData.createdAt || new Date().toISOString(),
          expiresAt: groupData.expiresAt || new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          isActive: true,
        };
        set((state) => {
          const activeMap = { ...(state.currentUserActiveGroupId || {}) };
          activeMap[creatorId] = newGroup.id;
          const createdMap = { ...(state.userCreatedActivityId || {}) };
          createdMap[creatorId] = newGroup.id;
          return {
            groups: [...state.groups, newGroup],
            myGroups: [...state.myGroups, newGroup],
            currentUserActiveGroupId: activeMap,
            userCreatedActivityId: createdMap,
          };
        });
        return newGroup;
      },

      canUserCreateActivity: (userId) => {
        const state = get();
        const createdActivityId = state.userCreatedActivityId?.[userId];
        if (!createdActivityId) return true;
        
        // Check if the created activity still exists and is not expired
        const activity = state.activeGroups.find(g => g.id === createdActivityId);
        if (!activity) {
          // Activity doesn't exist anymore, user can create new one
          return true;
        }
        
        const now = new Date();
        const expiry = new Date(activity.expiresAt);
        if (expiry <= now) {
          // Activity expired, user can create new one
          return true;
        }
        
        return false; // User still has an active activity
      },

      removeUserCreatedActivity: (userId) => {
        set((state) => {
          const createdMap = { ...(state.userCreatedActivityId || {}) };
          createdMap[userId] = null;
          return { userCreatedActivityId: createdMap };
        });
      },

      clearAllGroups: () => set({
        groups: [],
        activeGroups: [],
        myGroups: [],
        groupMessages: {},
        currentUserActiveGroupId: {},
        userCreatedActivityId: {},
      }),
      
      clearUserSpecificData: (userId: string) => set((state) => {
        // Clear user-specific tracking but keep the groups (activities)
        const activeMap = { ...(state.currentUserActiveGroupId || {}) };
        delete activeMap[userId];
        
        const createdMap = { ...(state.userCreatedActivityId || {}) };
        delete createdMap[userId];
        
        return {
          myGroups: [], // Clear user's joined groups
          groupMessages: {}, // Clear user's chat messages
          currentUserActiveGroupId: activeMap,
          userCreatedActivityId: createdMap,
        };
      }),
    }),
    {
      name: 'group-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
