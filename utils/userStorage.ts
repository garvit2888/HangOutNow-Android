import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * User-specific storage key manager
 * Ensures each user has isolated storage
 */

let currentUserId: string | null = null;

export const setCurrentUserId = (userId: string | null) => {
  currentUserId = userId;
  console.log('📝 Current user ID set to:', userId);
};

export const getCurrentUserId = (): string | null => {
  return currentUserId;
};

/**
 * Get user-specific storage key
 * Format: "user:{userId}:{storeName}"
 */
export const getUserStorageKey = (storeName: string): string => {
  if (!currentUserId) {
    // Fallback to generic key if no user is logged in
    return storeName;
  }
  return `user:${currentUserId}:${storeName}`;
};

/**
 * Clear all data for a specific user
 */
export const clearUserData = async (userId: string) => {
  try {
    console.log('🧹 Clearing data for user:', userId);
    
    // Get all keys
    const allKeys = await AsyncStorage.getAllKeys();
    
    // Filter keys that belong to this user
    const userKeys = allKeys.filter(key => key.startsWith(`user:${userId}:`));
    
    // Remove user-specific keys
    if (userKeys.length > 0) {
      await AsyncStorage.multiRemove(userKeys);
      console.log(`✅ Cleared ${userKeys.length} keys for user:`, userId);
    }
  } catch (error) {
    console.error('❌ Error clearing user data:', error);
  }
};

/**
 * Clear data for the current user
 */
export const clearCurrentUserData = async () => {
  if (currentUserId) {
    await clearUserData(currentUserId);
  }
};

/**
 * Get storage statistics for debugging
 */
export const getStorageStats = async () => {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const userKeys = allKeys.filter(key => key.startsWith('user:'));
    
    // Group by user
    const userGroups: Record<string, string[]> = {};
    userKeys.forEach(key => {
      const match = key.match(/^user:([^:]+):/);
      if (match) {
        const userId = match[1];
        if (!userGroups[userId]) {
          userGroups[userId] = [];
        }
        userGroups[userId].push(key);
      }
    });
    
    console.log('📊 Storage Stats:');
    console.log('Total keys:', allKeys.length);
    console.log('User-specific keys:', userKeys.length);
    console.log('Users in storage:', Object.keys(userGroups).length);
    
    Object.entries(userGroups).forEach(([userId, keys]) => {
      console.log(`  User ${userId}: ${keys.length} keys`);
    });
    
    return { allKeys, userKeys, userGroups };
  } catch (error) {
    console.error('❌ Error getting storage stats:', error);
    return null;
  }
};

