import { create } from 'zustand';
import { mockUsers } from '@/constants/mockData';
import { User } from '@/types';

interface FriendsState {
  nearbyUsers: User[];
  filteredUsers: User[];
  selectedMood: string;
  
  // Actions
  setNearbyUsers: (users: User[]) => void;
  filterByMood: (mood: string) => void;
}

export const useFriendsStore = create<FriendsState>()((set, get) => ({
  nearbyUsers: mockUsers,
  filteredUsers: mockUsers,
  selectedMood: 'all',
  
  setNearbyUsers: (users) => set({ nearbyUsers: users, filteredUsers: users }),
  
  filterByMood: (mood) => set((state) => {
    if (mood === 'all') {
      return { filteredUsers: state.nearbyUsers, selectedMood: mood };
    } else {
      return {
        filteredUsers: state.nearbyUsers.filter(user => user.mood === mood),
        selectedMood: mood
      };
    }
  }),
}));