import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';

// Initialize Firebase Admin
admin.initializeApp();

// Initialize Expo SDK
const expo = new Expo();

/**
 * Helper function to get push tokens for users
 */
async function getPushTokensForUsers(userIds: string[]): Promise<string[]> {
    const tokens: string[] = [];

    for (const userId of userIds) {
        try {
            const tokensSnapshot = await admin.firestore()
                .collection('users')
                .doc(userId)
                .collection('pushTokens')
                .get();

            tokensSnapshot.forEach((doc) => {
                const token = doc.data().token;
                if (token && Expo.isExpoPushToken(token)) {
                    tokens.push(token);
                }
            });
        } catch (error) {
            console.error(`Error getting push tokens for user ${userId}:`, error);
        }
    }

    return tokens;
}

/**
 * Helper function to send push notifications
 */
async function sendPushNotifications(
    tokens: string[],
    title: string,
    body: string,
    data?: { [key: string]: any }
): Promise<void> {
    if (tokens.length === 0) {
        console.log('No valid push tokens to send to');
        return;
    }

    const messages: ExpoPushMessage[] = tokens.map((token) => ({
        to: token,
        sound: 'default',
        title,
        body,
        data: data || {},
        priority: 'high',
    }));

    // Split messages into chunks (Expo recommends max 100 per request)
    const chunks = expo.chunkPushNotifications(messages);

    for (const chunk of chunks) {
        try {
            const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
            console.log('Push notification tickets:', ticketChunk);
        } catch (error) {
            console.error('Error sending push notification chunk:', error);
        }
    }
}

/**
 * Cloud Function: Send notification when a new message is created
 * Triggers on: activities/{activityId}/messages/{messageId}
 */
export const sendMessageNotification = functions.firestore
    .document('activities/{activityId}/messages/{messageId}')
    .onCreate(async (snapshot, context) => {
        const activityId = context.params.activityId;
        const messageData = snapshot.data();

        console.log(`New message in activity ${activityId} from ${messageData.senderName}`);

        try {
            // Get activity details
            const activityDoc = await admin.firestore()
                .collection('activities')
                .doc(activityId)
                .get();

            if (!activityDoc.exists) {
                console.log('Activity not found');
                return;
            }

            const activityData = activityDoc.data();
            if (!activityData) {
                console.log('Activity data is empty');
                return;
            }

            // Get all member IDs except the sender
            const members = activityData.members || [];
            const recipientIds = members
                .map((m: any) => m.id || m.email)
                .filter((id: string) => id !== messageData.senderId);

            if (recipientIds.length === 0) {
                console.log('No recipients to notify');
                return;
            }

            // Get push tokens for recipients
            const tokens = await getPushTokensForUsers(recipientIds);

            // Prepare notification content
            const activityName = activityData.name || 'Activity';
            const emoji = activityData.emoji || '';
            const title = emoji ? `${emoji} ${activityName}` : activityName;

            let body: string;
            if (messageData.imageUri) {
                body = `${messageData.senderName} sent a photo`;
            } else {
                const messageText = messageData.text || '';
                const preview = messageText.length > 50
                    ? `${messageText.substring(0, 50)}...`
                    : messageText;
                body = `${messageData.senderName}: ${preview}`;
            }

            // Send notifications
            await sendPushNotifications(tokens, title, body, {
                activityId,
                type: 'new_message',
                activityName,
                activityEmoji: emoji,
            });

            console.log(`Sent message notifications to ${tokens.length} devices`);
        } catch (error) {
            console.error('Error sending message notification:', error);
        }
    });

/**
 * Cloud Function: Send notification when a member joins an activity
 * Triggers on: activities/{activityId} update
 */
export const sendMemberJoinedNotification = functions.firestore
    .document('activities/{activityId}')
    .onUpdate(async (change, context) => {
        const activityId = context.params.activityId;
        const beforeData = change.before.data();
        const afterData = change.after.data();

        if (!beforeData || !afterData) {
            return;
        }

        // Get member lists
        const beforeMembers = beforeData.members || [];
        const afterMembers = afterData.members || [];

        // Find new members (in after but not in before)
        const beforeMemberIds = new Set(beforeMembers.map((m: any) => m.id || m.email));
        const newMembers = afterMembers.filter((m: any) => {
            const memberId = m.id || m.email;
            return !beforeMemberIds.has(memberId);
        });

        if (newMembers.length === 0) {
            return; // No new members
        }

        try {
            // Get existing member IDs (exclude new members)
            const existingMemberIds = beforeMembers.map((m: any) => m.id || m.email);

            if (existingMemberIds.length === 0) {
                return; // No one to notify
            }

            // Get push tokens for existing members
            const tokens = await getPushTokensForUsers(existingMemberIds);

            // Prepare notification for each new member
            for (const newMember of newMembers) {
                const memberName = newMember.name || 'Someone';
                const activityName = afterData.name || 'Activity';
                const emoji = afterData.emoji || '';
                const title = emoji ? `${emoji} ${activityName}` : activityName;
                const body = `${memberName} joined the activity`;

                await sendPushNotifications(tokens, title, body, {
                    activityId,
                    type: 'member_joined',
                    activityName,
                    activityEmoji: emoji,
                });

                console.log(`Sent member joined notification to ${tokens.length} devices`);
            }
        } catch (error) {
            console.error('Error sending member joined notification:', error);
        }
    });

/**
 * Cloud Function: Send notification when a member leaves an activity
 * Triggers on: activities/{activityId} update
 */
export const sendMemberLeftNotification = functions.firestore
    .document('activities/{activityId}')
    .onUpdate(async (change, context) => {
        const activityId = context.params.activityId;
        const beforeData = change.before.data();
        const afterData = change.after.data();

        if (!beforeData || !afterData) {
            return;
        }

        // Get member lists
        const beforeMembers = beforeData.members || [];
        const afterMembers = afterData.members || [];

        // Find removed members (in before but not in after)
        const afterMemberIds = new Set(afterMembers.map((m: any) => m.id || m.email));
        const removedMembers = beforeMembers.filter((m: any) => {
            const memberId = m.id || m.email;
            return !afterMemberIds.has(memberId);
        });

        if (removedMembers.length === 0) {
            return; // No members left
        }

        try {
            // Get remaining member IDs
            const remainingMemberIds = afterMembers.map((m: any) => m.id || m.email);

            if (remainingMemberIds.length === 0) {
                return; // No one to notify
            }

            // Get push tokens for remaining members
            const tokens = await getPushTokensForUsers(remainingMemberIds);

            // Prepare notification for each removed member
            for (const removedMember of removedMembers) {
                const memberName = removedMember.name || 'Someone';
                const activityName = afterData.name || 'Activity';
                const emoji = afterData.emoji || '';
                const title = emoji ? `${emoji} ${activityName}` : activityName;
                const body = `${memberName} left the activity`;

                await sendPushNotifications(tokens, title, body, {
                    activityId,
                    type: 'member_left',
                    activityName,
                    activityEmoji: emoji,
                });

                console.log(`Sent member left notification to ${tokens.length} devices`);
            }
        } catch (error) {
            console.error('Error sending member left notification:', error);
        }
    });
