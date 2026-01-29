export type User = {
    id: string;
    name: string;
    avatar: string;
    email?: string; // Optional email field for activity members
    joinedAt?: string; // Optional: when the user joined an activity
    dateOfBirth?: string; // Optional: date of birth for age calculation
    location: {
      latitude: number;
      longitude: number;
    };
    distance: number;
    mood: string;
    mutualFriends: number;
    isOnline: boolean;
  };
  
  export type Place = {
    id: string;
    name: string;
    type: string;
    distance: number;
    address: string;
    image: string;
  };
  
  export type ChatPreview = {
    id: string;
    userId: string;
    name: string;
    avatar: string;
    lastMessage: string;
    timestamp: string;
    unread: number;
    isGroupChat?: boolean;
  };
  
  export type Message = {
    id: string;
    senderId: string;
    text: string;
    timestamp: string;
  };
  
  export type MoodOption = {
    id: string;
    label: string;
    icon: string;
  };

  export type Group = {
    id: string;
    name: string;
    mood: string;
    emoji?: string; // User's custom emoji for the activity
    groupAvatar?: string; // Group profile picture
    location: { latitude: number; longitude: number };
    distance: number;
    members: User[];
    maxMembers: number;
    createdBy: string; // new: user id or email
    isPublic: boolean; // new: public/private toggle
    createdAt: string;
    expiresAt: string;
    chatId: string;
    isActive: boolean;
    meetingLocation: string; // explicitly string
  };

  export type GroupMessage = {
    id: string;
    groupId: string;
    senderId: string;
    senderName: string;
    text: string;
    timestamp: string;
    imageUri?: string;
  };