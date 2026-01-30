import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import * as Location from 'expo-location';
import { Alert, Linking, AppState, AppStateStatus } from 'react-native';
import { useUserStore } from '@/store/userStore';
import { useGroupStore } from '@/store/groupStore';
import ActivityStartedModal from '@/components/ActivityStartedModal';
import { leaveActivity as leaveActivityFirestore } from '@/services/activityService';
import { collection, getDocs, query, where, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestNotificationPermissions, setupNotificationListeners, getPushToken } from '@/services/pushNotificationService';
import { useRouter, useSegments } from 'expo-router';
import { Group } from '@/types';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: "index",
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) {
      console.error(error);
      throw error;
    }
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  // Initialize Firebase auth listener
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const { hasRequestedLocationPermission, setHasRequestedLocationPermission, setLocation, profile, loginEmail, sos, setSOSActive, clearSOSRequest } = useUserStore();
  const { activeGroups, leaveGroup } = useGroupStore();
  const currentUserId = profile?.uid || loginEmail || '';
  const currentUserName = profile?.fullName || 'User';
  const currentUserEmail = profile?.email || loginEmail || '';

  // State for activity started modal
  const [showActivityStartedModal, setShowActivityStartedModal] = useState(false);
  const [startedActivity, setStartedActivity] = useState<{ id: string; name: string; emoji?: string } | null>(null);

  // Track which activities have already shown the modal to avoid duplicates
  const shownActivityIds = useRef<Set<string>>(new Set());
  const [isLoadingShownIds, setIsLoadingShownIds] = useState(true);

  // Load persisted shown activity IDs from AsyncStorage
  useEffect(() => {
    const loadShownIds = async () => {
      try {
        const stored = await AsyncStorage.getItem('shownActivityStartedIds');
        if (stored) {
          const ids = JSON.parse(stored) as string[];
          shownActivityIds.current = new Set(ids);
          console.log('📋 Loaded', ids.length, 'shown activity IDs from storage');
        }
      } catch (error) {
        console.error('❌ Error loading shown activity IDs:', error);
      } finally {
        setIsLoadingShownIds(false);
      }
    };

    if (user) {
      loadShownIds();
    }
  }, [user]);

  // Register push token on login
  useEffect(() => {
    const registerToken = async () => {
      if (user && profile?.uid) {
        try {
          const token = await getPushToken();
          // Only update if token is different to save writes
          if (token && token !== profile.pushToken) {
            console.log('📱 Registering push token:', token);
            await updateDoc(doc(db, 'users', profile.uid), {
              pushToken: token
            });
          }
        } catch (error) {
          console.error('❌ Error registering push token:', error);
        }
      }
    };

    registerToken();
  }, [user, profile?.uid]);

  // Save shown activity IDs to AsyncStorage
  const saveShownIds = async (ids: Set<string>) => {
    try {
      const idsArray = Array.from(ids);
      await AsyncStorage.setItem('shownActivityStartedIds', JSON.stringify(idsArray));
    } catch (error) {
      console.error('❌ Error saving shown activity IDs:', error);
    }
  };

  // Check for started activities - only show modal for the most recently started activity that user created or joined
  const checkForStartedActivities = async () => {
    // Don't check if user is not logged in or still loading authentication
    if (!user || loading) {
      console.log('⚠️ Skipping check - user not logged in or auth still loading');
      return;
    }

    if (!currentUserId || isLoadingShownIds) {
      console.log('⚠️ Skipping check - no userId or still loading shown IDs');
      return;
    }

    // Ensure we have a valid user ID (not just empty string)
    if (!currentUserId || currentUserId === 'current_user_id' || currentUserId.trim() === '') {
      console.log('⚠️ Skipping check - invalid userId');
      return;
    }

    try {
      const now = new Date();
      // Only consider activities that started within the last 1 day to avoid old activities
      const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);

      // Check if there's an active SOS state that should be cleared (6 hours after activity started)
      if (sos?.active && sos?.activityId) {
        try {
          const activityDoc = await getDoc(doc(db, 'activities', sos.activityId));
          if (activityDoc.exists()) {
            const data = activityDoc.data() as Group;
            if (data.expiresAt) {
              const expiresAt = new Date(data.expiresAt);
              // Calculate 6 hours after activity started (expiresAt)
              const sixHoursAfterStart = new Date(expiresAt.getTime() + 6 * 60 * 60 * 1000);

              // If more than 6 hours have passed since activity started, clear SOS
              if (now > sixHoursAfterStart) {
                console.log('⏰ Activity SOS expired (6 hours passed), clearing SOS state');
                setSOSActive(false);
                setShowActivityStartedModal(false);
                setStartedActivity(null);
              }
            }
          } else {
            // Activity doesn't exist anymore, clear SOS
            console.log('⚠️ Activity no longer exists, clearing SOS state');
            setSOSActive(false);
            setShowActivityStartedModal(false);
            setStartedActivity(null);
          }
        } catch (error) {
          console.error('❌ Error checking SOS expiration:', error);
        }
      }

      // Query Firestore directly for activities where user might be a member
      // We can't use a where clause for array-contains on nested members, so we get all and filter
      const activitiesRef = collection(db, 'activities');
      const snapshot = await getDocs(activitiesRef);

      const startedActivities: Array<{ id: string; name: string; emoji?: string; expiresAt: Date; createdAt?: Date }> = [];

      snapshot.forEach((doc) => {
        const data = doc.data() as Group; // Cast to Group type like getPastActivities does

        // Check if activity has started (expiresAt <= now)
        if (data.expiresAt) {
          const expiresAt = new Date(data.expiresAt);
          const hasStarted = expiresAt <= now;

          if (hasStarted) {
            // Only consider activities that started recently (within last 1 day)
            // This filters out very old activities
            const startedRecently = expiresAt >= oneDayAgo;

            if (startedRecently) {

              // Check if user is a member
              const members = data.members || [];
              const isMember = members.some((m: any) => {
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

              // Check if user created this activity
              const isCreator = data.createdBy === currentUserId ||
                data.createdBy === profile?.uid ||
                (data.createdBy && typeof data.createdBy === 'string' &&
                  (data.createdBy.includes(currentUserId) || data.createdBy.includes(loginEmail || '')));

              // Check if we haven't explicitly ended/dismissed this this activity
              // We use shownActivityIds to track activities the user has "ended" or "dismissed"
              const notEndedYet = !shownActivityIds.current.has(doc.id);

              // Only include activities the user created or joined AND hasn't ended yet
              if ((isCreator || isMember) && notEndedYet) {
                const createdAt = data.createdAt ? new Date(data.createdAt) : undefined;

                // Get emoji exactly like PastActivitiesModal does: access activity.emoji directly
                // Use only the specific emoji field, no mood fallback
                const activityEmoji = data.emoji ? String(data.emoji).trim() : undefined;

                if (activityEmoji) {
                  startedActivities.push({
                    id: doc.id,
                    name: data.name || 'Unknown Activity',
                    emoji: activityEmoji,
                    expiresAt,
                    createdAt,
                  });
                }
              }
            }
          }
        }
      });

      // Sort by expiration date (most recent first)
      // This ensures we get the activity that most recently started
      startedActivities.sort((a, b) => b.expiresAt.getTime() - a.expiresAt.getTime());

      // Show modal ONLY for the most recently started activity (first one after sorting)
      if (startedActivities.length > 0) {
        const mostRecentActivity = startedActivities[0];

        // Only update SOS if this is a different activity than currently tracked
        // This ensures we only show ONE activity (the latest) at any time
        if (sos?.activityId !== mostRecentActivity.id) {
          const chosen = {
            id: mostRecentActivity.id,
            name: mostRecentActivity.name,
            emoji: mostRecentActivity.emoji, // Use only the specific emoji from the activity
          };
          setStartedActivity(chosen);
          setSOSActive(true, { id: chosen.id, name: chosen.name });
          setShowActivityStartedModal(true);
        }
      }
    } catch (error) {
      console.error('❌ Error checking for started activities:', error);
    }
  };

  // Reset modal state when user logs out or during initial loading
  useEffect(() => {
    if (!user || loading) {
      // Reset modal state when user logs out or during initial auth loading
      setShowActivityStartedModal(false);
      setStartedActivity(null);
      if (!user) {
        setSOSActive(false);
      }
    }
  }, [user, loading, setSOSActive]);

  // Handle app state changes (when user returns to app)
  useEffect(() => {
    // Don't set up listeners if user is not logged in or still loading
    if (!user || loading) {
      return;
    }

    if (isLoadingShownIds) return;

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      // Only check when app becomes active AND user is logged in AND has valid ID
      if (nextAppState === 'active' && user && currentUserId &&
        currentUserId !== 'current_user_id' && currentUserId.trim() !== '' &&
        !isLoadingShownIds) {
        // App became active, check for started activities
        console.log('📱 App became active, checking for started activities...');
        // Add small delay to ensure stores are loaded
        setTimeout(() => {
          checkForStartedActivities();
        }, 1000);
      }
    });

    // Also check immediately when component mounts (if user is logged in, IDs are loaded, and has valid ID)
    if (user && currentUserId &&
      currentUserId !== 'current_user_id' && currentUserId.trim() !== '' &&
      !isLoadingShownIds) {
      setTimeout(() => {
        checkForStartedActivities();
      }, 2000);
    }

    return () => {
      subscription.remove();
    };
  }, [user, currentUserId, profile?.uid, loginEmail, isLoadingShownIds]);

  // If map (or anywhere) requests reopening the modal, show it
  useEffect(() => {
    // Don't show modal if user is not logged in or auth is still loading
    if (!user || loading) return;

    if (sos?.requestModal && sos?.active && sos.activityId && sos.activityName) {
      // Fetch the activity from Firestore to get the emoji
      const fetchActivityEmoji = async () => {
        try {
          const activityDoc = await getDoc(doc(db, 'activities', sos.activityId!));
          if (activityDoc.exists()) {
            const data = activityDoc.data() as Group;
            const activityEmoji = data.emoji ? String(data.emoji).trim() : undefined;
            setStartedActivity({
              id: sos.activityId!,
              name: sos.activityName!,
              emoji: activityEmoji
            });
            setShowActivityStartedModal(true);
          } else {
            // Fallback if document doesn't exist
            console.warn('⚠️ Activity document not found when reopening modal');
            setStartedActivity({ id: sos.activityId!, name: sos.activityName! });
            setShowActivityStartedModal(true);
          }
        } catch (error) {
          console.error('❌ Error fetching activity emoji:', error);
          // Fallback - show modal without emoji
          setStartedActivity({ id: sos.activityId!, name: sos.activityName! });
          setShowActivityStartedModal(true);
        }
        clearSOSRequest();
      };
      fetchActivityEmoji();
    }
  }, [sos?.requestModal, user, loading]);

  // Check periodically while app is active (every 30 seconds)
  useEffect(() => {
    // Don't set up interval if user is not logged in or still loading
    if (!user || loading) return;

    if (isLoadingShownIds) return;

    // Don't check if user ID is invalid
    if (!currentUserId || currentUserId === 'current_user_id' || currentUserId.trim() === '') {
      return;
    }

    const interval = setInterval(() => {
      if (AppState.currentState === 'active' &&
        user &&
        !loading &&
        currentUserId &&
        currentUserId !== 'current_user_id' &&
        currentUserId.trim() !== '' &&
        !isLoadingShownIds) {
        checkForStartedActivities();
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [user, loading, currentUserId, isLoadingShownIds]);

  // Handle activity ended
  const handleActivityEnded = async () => {
    if (!startedActivity) return;

    try {
      // Leave from Firestore
      await leaveActivityFirestore(startedActivity.id, currentUserId);

      // Leave from local store
      leaveGroup(startedActivity.id, currentUserId);

      console.log('👋 User marked activity as ended:', startedActivity.name);
      console.log('👋 User marked activity as ended:', startedActivity.name);

      // Add to ignore list so it doesn't pop up again
      shownActivityIds.current.add(startedActivity.id);
      await saveShownIds(shownActivityIds.current);

      setSOSActive(false);
      setStartedActivity(null);
      setShowActivityStartedModal(false);
    } catch (error) {
      console.error('❌ Error leaving activity:', error);
      Alert.alert('Error', 'Failed to leave activity. Please try again.');
    }
  };

  // Request location permission once after successful login/signup
  useEffect(() => {
    const requestLocationOnce = async () => {
      if (!user) return;
      if (hasRequestedLocationPermission) return;
      try {
        const current = await Location.getForegroundPermissionsAsync();
        if (current.status !== 'granted') {
          if (current.canAskAgain) {
            const requested = await Location.requestForegroundPermissionsAsync();
            if (requested.status === 'granted') {
              const position = await Location.getCurrentPositionAsync({});
              setLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
            }
          } else {
            Alert.alert(
              'Enable Location',
              'Please enable location permissions in Settings to show nearby activities.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Open Settings', onPress: () => Linking.openSettings?.() }
              ]
            );
          }
        } else {
          const position = await Location.getCurrentPositionAsync({});
          setLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        }
      } catch (e) {
        // ignore
      } finally {
        setHasRequestedLocationPermission(true);
      }
    };
    requestLocationOnce();
  }, [user, hasRequestedLocationPermission, setHasRequestedLocationPermission, setLocation]);

  // Request notification permissions and set up listeners
  useEffect(() => {
    if (!user) return;

    const setupNotifications = async () => {
      // Request permissions (safe in Expo Go)
      await requestNotificationPermissions();

      // Set up listeners (safe in Expo Go)
      const cleanupListeners = setupNotificationListeners(router);
      return cleanupListeners;
    };

    const cleanupPromise = setupNotifications();
    return () => {
      cleanupPromise.then(cleanup => cleanup && cleanup());
    };
  }, [user, router]);

  // Show nothing while checking authentication state
  if (loading) {
    return null;
  }

  // Check if we are on a safe screen to show the modal
  const currentSegment = segments[0] as string | undefined;
  const unsafeSegments = [
    'index',
    'login',
    'onboarding',
    'email-verification',
    'upload-profile-picture',
    'photo-verification',
    'instagram-connect',
    'privacy-policy',
    'terms-and-conditions'
  ];

  // Also check if we're in the auth flow even if segment is null/undefined (initial load)
  // If user is logged in, we assume safe unless on specific unsafe routes
  const onSafeScreen = !unsafeSegments.includes(currentSegment || '');

  return (
    <>
      <Stack
        screenOptions={{
          headerBackTitle: "Back",
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="email-verification" options={{ headerShown: false }} />
        <Stack.Screen name="upload-profile-picture" options={{ headerShown: false }} />
        <Stack.Screen name="photo-verification" options={{ headerShown: false }} />
        <Stack.Screen name="instagram-connect" options={{ headerShown: false }} />
        <Stack.Screen name="home" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="group-chat/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="group-details/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{ headerShown: false }} />
        <Stack.Screen name="privacy-policy" options={{ headerShown: false }} />
        <Stack.Screen name="terms-and-conditions" options={{ headerShown: false }} />
        <Stack.Screen name="manage-members/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: "modal" }} />
      </Stack>

      {/* Activity Started Modal - Only show if user is logged in and authentication is complete AND on a safe screen */}
      {!loading && user && startedActivity && currentUserId &&
        currentUserId !== 'current_user_id' && currentUserId.trim() !== '' && onSafeScreen && (
          <ActivityStartedModal
            visible={showActivityStartedModal}
            activityName={startedActivity.name}
            activityId={startedActivity.id}
            userId={currentUserId}
            userName={currentUserName}
            userEmail={currentUserEmail}
            activityEmoji={startedActivity.emoji}
            onActivityEnded={handleActivityEnded}
            onClose={() => {
              setShowActivityStartedModal(false);
              setSOSActive(true, { id: startedActivity.id, name: startedActivity.name });
            }}
          />
        )}
    </>
  );
}
