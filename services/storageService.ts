import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/config/firebase';

/**
 * Storage Service - Manages file uploads to Firebase Storage
 */

/**
 * Upload an image to Firebase Storage and return the download URL
 */
export const uploadImage = async (
  uri: string,
  folder: string = 'chat-images'
): Promise<string> => {
  try {
    console.log('🔥 Uploading image to Firebase Storage...');
    
    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const filename = `${timestamp}_${randomStr}.jpg`;
    
    // Create storage reference
    const storageRef = ref(storage, `${folder}/${filename}`);
    
    // Fetch the image as a blob
    const response = await fetch(uri);
    const blob = await response.blob();
    
    // Upload to Firebase Storage
    console.log('📤 Uploading blob to Firebase...');
    await uploadBytes(storageRef, blob);
    
    // Get download URL
    const downloadURL = await getDownloadURL(storageRef);
    console.log('✅ Image uploaded successfully:', downloadURL);
    
    return downloadURL;
  } catch (error) {
    console.error('❌ Error uploading image:', error);
    throw error;
  }
};

/**
 * Upload group avatar to Firebase Storage
 */
export const uploadGroupAvatar = async (uri: string, groupId: string): Promise<string> => {
  return uploadImage(uri, `group-avatars/${groupId}`);
};

/**
 * Upload user avatar to Firebase Storage
 */
export const uploadUserAvatar = async (uri: string, userId: string): Promise<string> => {
  return uploadImage(uri, `user-avatars/${userId}`);
};

