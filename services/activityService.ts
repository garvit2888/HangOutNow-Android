import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  getDoc,
  onSnapshot, 
  query, 
  where,
  Timestamp,
  setDoc
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Group } from '@/types';

/**
 * Activity Service - Manages activities in Firestore
 * Activities are stored in a public collection so all users can see them
 */

const ACTIVITIES_COLLECTION = 'activities';

/**
 * Create a new activity in Firestore
 */
export const createActivity = async (activityData: Omit<Group, 'id' | 'chatId' | 'createdAt'>): Promise<{ activityId: string; chatId: string }> => {
  try {
    console.log('🔥 Creating activity in Firestore:', activityData.name);
    
    // Generate a unique ID
    const activityId = `activity_${Date.now()}`;
    const chatId = `chat_${Date.now()}`;
    
    // Ensure each initial member includes a joinedAt timestamp
    const initialMembers = (activityData as any).members?.map((m: any) => ({
      ...m,
      joinedAt: m.joinedAt || new Date().toISOString(),
    })) || [];

    const newActivity = {
      ...activityData,
      members: initialMembers,
      id: activityId,
      chatId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // Use setDoc with custom ID instead of addDoc
    await setDoc(doc(db, ACTIVITIES_COLLECTION, activityId), newActivity);
    
    console.log('✅ Activity created in Firestore:', activityId);
    return { activityId, chatId };
  } catch (error) {
    console.error('❌ Error creating activity in Firestore:', error);
    console.error('📋 Activity data that failed:', JSON.stringify(activityData, null, 2));
    console.error('🔍 Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    throw error;
  }
};

/**
 * Update an existing activity in Firestore
 */
export const updateActivity = async (activityId: string, updates: Partial<Group>): Promise<void> => {
  try {
    const activityRef = doc(db, ACTIVITIES_COLLECTION, activityId);
    await updateDoc(activityRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Error updating activity in Firestore:', error);
    throw error;
  }
};

/**
 * Delete an activity from Firestore (when creator stops it)
 */
export const deleteActivity = async (activityId: string): Promise<void> => {
  try {
    console.log('🔥 Deleting activity from Firestore:', activityId);
    
    const activityRef = doc(db, ACTIVITIES_COLLECTION, activityId);
    await deleteDoc(activityRef);
    
    console.log('✅ Activity deleted from Firestore');
  } catch (error) {
    console.error('❌ Error deleting activity from Firestore:', error);
    throw error;
  }
};

/**
 * Get all active activities from Firestore
 */
export const getActiveActivities = async (): Promise<Group[]> => {
  try {
    console.log('🔥 Fetching activities from Firestore...');
    
    const activitiesRef = collection(db, ACTIVITIES_COLLECTION);
    const snapshot = await getDocs(activitiesRef);
    
    const activities: Group[] = [];
    const now = new Date();
    
    snapshot.forEach((doc) => {
      const data = doc.data() as Group;
      
      // Filter out expired activities (don't delete automatically to prevent loops)
      if (data.expiresAt) {
        const expiresAt = new Date(data.expiresAt);
        if (expiresAt > now) {
          activities.push({ ...data, id: doc.id });
        } else {
          console.log(`⏰ Activity ${doc.id} has expired, filtering out`);
        }
      } else {
        activities.push({ ...data, id: doc.id });
      }
    });
    
    console.log(`✅ Fetched ${activities.length} active activities from Firestore`);
    return activities;
  } catch (error) {
    console.error('❌ Error fetching activities from Firestore:', error);
    return [];
  }
};

/**
 * Subscribe to real-time activity updates
 * Returns an unsubscribe function
 */
export const subscribeToActivities = (callback: (activities: Group[]) => void): (() => void) => {
  try {
    console.log('🔥 Subscribing to real-time activity updates...');
    
    const activitiesRef = collection(db, ACTIVITIES_COLLECTION);
    let lastUpdateTime = 0;
    const THROTTLE_MS = 1000; // Throttle updates to max once per second
    
    const unsubscribe = onSnapshot(activitiesRef, (snapshot) => {
      const now = Date.now();
      if (now - lastUpdateTime < THROTTLE_MS) {
        return;
      }
      lastUpdateTime = now;
      
      const activities: Group[] = [];
      const currentTime = new Date();
      
      snapshot.forEach((doc) => {
        const data = doc.data() as Group;
        
        // Filter out expired activities (don't delete automatically to prevent loops)
        if (data.expiresAt) {
          const expiresAt = new Date(data.expiresAt);
          if (expiresAt > currentTime) {
            activities.push({ ...data, id: doc.id });
          }
        } else {
          activities.push({ ...data, id: doc.id });
        }
      });
      
      callback(activities);
    }, (error) => {
      console.error('❌ Error in activity subscription:', error);
    });
    
    return unsubscribe;
  } catch (error) {
    console.error('❌ Error subscribing to activities:', error);
    return () => {};
  }
};

/**
 * Join an activity (update members list)
 */
export const joinActivity = async (
  activityId: string, 
  user: { id: string; name: string; avatar: string; email?: string; dateOfBirth?: string }
): Promise<void> => {
  try {
    console.log('🔥 User joining activity in Firestore:', activityId);
    console.log('🔍 Looking for activity ID:', activityId);
    
    // Get all activities
    const activitiesRef = collection(db, ACTIVITIES_COLLECTION);
    const snapshot = await getDocs(activitiesRef);
    
    console.log('📋 Found activities:', snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name })));
    
    let currentActivity: Group | null = null;
    const allActivities: { id: string; data: Group }[] = [];
    
    snapshot.forEach((doc) => {
      const data = doc.data() as Group;
      allActivities.push({ id: doc.id, data });
      if (doc.id === activityId) {
        currentActivity = data;
        console.log('✅ Found matching activity:', doc.id);
      }
    });
    
    if (!currentActivity) {
      console.log('❌ Activity not found! Available IDs:', snapshot.docs.map(doc => doc.id));
      throw new Error('Activity not found');
    }
    
    // Check if user is already a member of the target activity
    const isMember = currentActivity.members.some(m => m.id === user.id || m.email === user.email);
    if (isMember) {
      console.log('⚠️ User already a member of this activity');
      return;
    }
    
    // FIRST: Remove user from ALL other activities
    const leavePromises = allActivities
      .filter(activity => activity.id !== activityId) // Don't leave the target activity
      .map(async (activity) => {
        const isUserInActivity = activity.data.members.some(m => m.id === user.id || m.email === user.email);
        if (isUserInActivity) {
          const updatedMembers = activity.data.members.filter(m => m.id !== user.id && m.email !== user.email);
          await updateActivity(activity.id, { members: updatedMembers });
        }
      });
    
    await Promise.all(leavePromises);
    
    // SECOND: Add user to the target activity
    const updatedMembers = [
      ...currentActivity.members,
      {
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        email: user.email,
        dateOfBirth: user.dateOfBirth,
        location: currentActivity.location,
        distance: 0,
        mood: currentActivity.mood,
        mutualFriends: 0,
        isOnline: true,
        joinedAt: new Date().toISOString(),
      }
    ];
    
    await updateActivity(activityId, { members: updatedMembers });
    
    // Note: In a production app, push notifications for member join/leave
    // would be sent via a backend to each member's device.
    // For now, this is handled by Firestore listeners in the app.
    console.log(`✅ ${user.name} joined ${currentActivity.name}`);
  } catch (error) {
    console.error('❌ Error joining activity:', error);
    throw error;
  }
};

/**
 * Get past activities where user was a member
 * @param userId - Primary user identifier (uid, email, or loginEmail)
 */
export const getPastActivities = async (userId: string): Promise<Group[]> => {
  try {
    
    
    if (!userId) {
      console.warn('⚠️ No userId provided for getPastActivities');
      return [];
    }
    
    const activitiesRef = collection(db, ACTIVITIES_COLLECTION);
    const snapshot = await getDocs(activitiesRef);
    
    
    
    const pastActivities: Group[] = [];
    const now = new Date();
    let activitiesChecked = 0;
    let expiredActivitiesFound = 0;
    
    snapshot.forEach((doc) => {
      try {
        activitiesChecked++;
        const data = doc.data() as Group;
        
        // Check if activity is expired
        if (data.expiresAt) {
          const expiresAt = new Date(data.expiresAt);
          const isExpired = expiresAt <= now;
          
          if (isExpired) {
            expiredActivitiesFound++;
            
            // Check if user created this activity
            const isCreator = data.createdBy === userId || 
                             (data.createdBy && typeof data.createdBy === 'string' && userId && typeof userId === 'string' && 
                              (data.createdBy.includes(userId) || userId.includes(data.createdBy)));
            
            // Check if user was a member - comprehensive matching
            const members = data.members || [];
            
            
            
            // If user is the creator, include the activity
            if (isCreator) {
              pastActivities.push({ ...data, id: doc.id });
              return; // Skip member check since we already found it
            }
            
            if (!Array.isArray(members) || members.length === 0) {
              // Skip activities with no members (and user is not creator)
              return;
            }
            
            // Check all members for a match
            const wasMember = members.some((m: any) => {
              if (!m) return false;
              
              // Handle different member data structures
              const memberId = m.id || m;
              const memberEmail = m.email;
              
              // Exact matches
              if (memberId === userId || memberEmail === userId) {
                return true;
              }
              
              // Case-insensitive email matching
              if (memberEmail && userId && 
                  typeof memberEmail === 'string' && typeof userId === 'string') {
                if (memberEmail.toLowerCase() === userId.toLowerCase()) {
                  return true;
                }
              }
              
              // Partial matches (in case of ID variations)
              if (memberId && userId && 
                  typeof memberId === 'string' && typeof userId === 'string') {
                // Check if one contains the other
                if (memberId.includes(userId) || userId.includes(memberId)) {
                  return true;
                }
              }
              
              return false;
            });
            
            if (wasMember) {
              pastActivities.push({ ...data, id: doc.id });
            }
          }
        }
      } catch (docError) {
        
      }
    });
    
    // Sort by expiration date (most recent first)
    pastActivities.sort((a, b) => {
      const timeA = new Date(a.expiresAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.expiresAt || b.createdAt || 0).getTime();
      return timeB - timeA;
    });
    
    return pastActivities;
  } catch (error: any) {
    return [];
  }
};

/**
 * Leave an activity (remove from members list)
 */
export const leaveActivity = async (activityId: string, userId: string): Promise<void> => {
  try {
    console.log('🔥 User leaving activity in Firestore:', activityId);
    
    // Get current activity
    const activitiesRef = collection(db, ACTIVITIES_COLLECTION);
    const snapshot = await getDocs(activitiesRef);
    
    let currentActivity: Group | null = null;
    snapshot.forEach((doc) => {
      if (doc.id === activityId) {
        currentActivity = doc.data() as Group;
      }
    });
    
    if (!currentActivity) {
      throw new Error('Activity not found');
    }
    
    // Get the leaving user's name before removing them
    const leavingUser = currentActivity.members.find(m => m.id === userId || m.email === userId);
    const leavingUserName = leavingUser?.name || 'Someone';
    
    // Remove user from members (check both id and email)
    const updatedMembers = currentActivity.members.filter(m => m.id !== userId && m.email !== userId);
    
    await updateActivity(activityId, { members: updatedMembers });
    console.log('✅ User left activity');
    
    // Note: In a production app, push notifications for member join/leave
    // would be sent via a backend to each member's device.
    // For now, this is handled by Firestore listeners in the app.
    console.log(`✅ ${leavingUserName} left ${currentActivity.name}`);
  } catch (error) {
    console.error('❌ Error leaving activity:', error);
    throw error;
  }
};

/**
 * Remove a member from an activity (creator only)
 */
export const removeMemberFromActivity = async (
  activityId: string, 
  memberId: string
): Promise<void> => {
  try {
    console.log('🔥 Creator removing member from activity:', activityId, memberId);
    
    // Get current activity
    const activitiesRef = collection(db, ACTIVITIES_COLLECTION);
    const snapshot = await getDocs(activitiesRef);
    
    let currentActivity: Group | null = null;
    snapshot.forEach((doc) => {
      if (doc.id === activityId) {
        currentActivity = doc.data() as Group;
      }
    });
    
    if (!currentActivity) {
      throw new Error('Activity not found');
    }
    
    // Remove member from members array (check both id and email)
    const updatedMembers = currentActivity.members.filter(m => 
      m.id !== memberId && m.email !== memberId
    );
    
    await updateActivity(activityId, { members: updatedMembers });
    console.log('✅ Member removed from activity');
  } catch (error) {
    console.error('❌ Error removing member from activity:', error);
    throw error;
  }
};

