export const mockUsers = [
    {
      id: '1',
      name: 'Alex Kim',
      avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=200&auto=format',
      location: { latitude: 37.7858, longitude: -122.4064 },
      distance: 0.3,
      mood: 'coffee',
      mutualFriends: 5,
      isOnline: true,
    },
    {
      id: '2',
      name: 'Jamie Chen',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format',
      location: { latitude: 37.7878, longitude: -122.4074 },
      distance: 0.5,
      mood: 'chill',
      mutualFriends: 2,
      isOnline: true,
    },
    {
      id: '3',
      name: 'Taylor Lopez',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format',
      location: { latitude: 37.7818, longitude: -122.4124 },
      distance: 0.8,
      mood: 'walk',
      mutualFriends: 7,
      isOnline: true,
    },
    {
      id: '4',
      name: 'Jordan Smith',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format',
      location: { latitude: 37.7838, longitude: -122.4094 },
      distance: 1.2,
      mood: 'party',
      mutualFriends: 3,
      isOnline: true,
    },
    {
      id: '5',
      name: 'Riley Johnson',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=200&auto=format',
      location: { latitude: 37.7898, longitude: -122.4054 },
      distance: 1.5,
      mood: 'movie',
      mutualFriends: 1,
      isOnline: true,
    },
  ];

  export const mockGroups = [
    {
      id: 'group_1',
      name: 'Coffee Chat Group',
      mood: 'coffee',
      location: { latitude: 37.7858, longitude: -122.4064 },
      distance: 0.3,
      members: [
        {
          id: '1',
          name: 'Alex Kim',
          avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=200&auto=format',
          location: { latitude: 37.7858, longitude: -122.4064 },
          distance: 0.3,
          mood: 'coffee',
          mutualFriends: 5,
          isOnline: true,
        },
        {
          id: '2',
          name: 'Jamie Chen',
          avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format',
          location: { latitude: 37.7878, longitude: -122.4074 },
          distance: 0.5,
          mood: 'coffee',
          mutualFriends: 2,
          isOnline: true,
        },
      ],
      maxMembers: 4,
      createdBy: '1',
      createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
      expiresAt: new Date(Date.now() + 90 * 60 * 1000).toISOString(), // 90 minutes from now
      chatId: 'chat_group_1',
      isActive: true,
      meetingLocation: 'Blue Bottle Coffee, Mission District',
    },
    {
      id: 'group_2',
      name: 'Food Adventure Squad',
      mood: 'food',
      location: { latitude: 37.7828, longitude: -122.4084 },
      distance: 0.7,
      members: [
        {
          id: '3',
          name: 'Taylor Lopez',
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format',
          location: { latitude: 37.7818, longitude: -122.4124 },
          distance: 0.8,
          mood: 'food',
          mutualFriends: 7,
          isOnline: true,
        },
      ],
      maxMembers: 5,
      createdBy: '3',
      createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 minutes ago
      expiresAt: new Date(Date.now() + 105 * 60 * 1000).toISOString(), // 105 minutes from now
      chatId: 'chat_group_2',
      isActive: true,
      meetingLocation: 'Fisherman\'s Wharf, Pier 39',
    },
    {
      id: 'group_3',
      name: 'Movie Night Crew',
      mood: 'movie',
      location: { latitude: 37.7848, longitude: -122.4094 },
      distance: 0.5,
      members: [
        {
          id: '4',
          name: 'Jordan Smith',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format',
          location: { latitude: 37.7838, longitude: -122.4094 },
          distance: 1.2,
          mood: 'party',
          mutualFriends: 3,
          isOnline: true,
        },
        {
          id: '5',
          name: 'Riley Johnson',
          avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=200&auto=format',
          location: { latitude: 37.7898, longitude: -122.4054 },
          distance: 1.5,
          mood: 'movie',
          mutualFriends: 1,
          isOnline: true,
        },
      ],
      maxMembers: 6,
      createdBy: '5',
      createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // 45 minutes ago
      expiresAt: new Date(Date.now() + 75 * 60 * 1000).toISOString(), // 75 minutes from now
      chatId: 'chat_group_3',
      isActive: true,
      meetingLocation: 'AMC Metreon 16, Downtown',
    },
  ];
  
  export const mockPlaces = [
    {
      id: '1',
      name: 'Urban Brew Coffee',
      type: 'coffee',
      distance: 0.2,
      address: '123 Market St',
      image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?q=80&w=200&auto=format',
    },
    {
      id: '2',
      name: 'Central Park',
      type: 'chill',
      distance: 0.4,
      address: '456 Park Ave',
      image: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=200&auto=format',
    },
    {
      id: '3',
      name: 'Quick Bites',
      type: 'food',
      distance: 0.5,
      address: '789 Food St',
      image: 'https://images.unsplash.com/photo-1565299507177-b0ac66763828?q=80&w=200&auto=format',
    },
    {
      id: '4',
      name: 'Riverside Walk',
      type: 'walk',
      distance: 0.7,
      address: '321 River Rd',
      image: 'https://images.unsplash.com/photo-1516214104703-d870798883c5?q=80&w=200&auto=format',
    },
    {
      id: '5',
      name: 'Chill Zone Lounge',
      type: 'chill',
      distance: 0.9,
      address: '555 Chill Ave',
      image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=200&auto=format',
    },
  ];
  
  export const mockChats = [
    {
      id: '1',
      userId: '1',
      name: 'Alex Kim',
      avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=200&auto=format',
      lastMessage: "Hey, wanna grab coffee?",
      timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
      unread: 2,
    },
    {
      id: '2',
      userId: '2',
      name: 'Jamie Chen',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format',
      lastMessage: "I'm at the park, come join!",
      timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
      unread: 0,
    },
    {
      id: '3',
      userId: '3',
      name: 'Taylor Lopez',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format',
      lastMessage: "Let's meet at Urban Brew?",
      timestamp: new Date(Date.now() - 120 * 60000).toISOString(),
      unread: 0,
    },
  ];
  
  export const mockMessages = {
    '1': [
      {
        id: '1',
        senderId: '1',
        text: "Hey, are you free right now?",
        timestamp: new Date(Date.now() - 10 * 60000).toISOString(),
      },
      {
        id: '2',
        senderId: 'me',
        text: "Yeah, just turned on my status. What's up?",
        timestamp: new Date(Date.now() - 9 * 60000).toISOString(),
      },
      {
        id: '3',
        senderId: '1',
        text: "Wanna grab coffee? I'm near Urban Brew",
        timestamp: new Date(Date.now() - 7 * 60000).toISOString(),
      },
      {
        id: '4',
        senderId: '1',
        text: "They have that new seasonal drink I mentioned",
        timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
      },
    ],
    '2': [
      {
        id: '1',
        senderId: '2',
        text: "Hey! I noticed you're free",
        timestamp: new Date(Date.now() - 35 * 60000).toISOString(),
      },
      {
        id: '2',
        senderId: 'me',
        text: "Yeah, just finished class. What's up?",
        timestamp: new Date(Date.now() - 33 * 60000).toISOString(),
      },
      {
        id: '3',
        senderId: '2',
        text: "I'm at the park with some friends. Want to join?",
        timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
      },
    ],
  };
  
  export const moodOptions = [
    { id: 'all', label: 'All', icon: 'users' },
    { id: 'coffee', label: 'Coffee', icon: 'coffee' },
    { id: 'food', label: 'Food', icon: 'utensils' },
    { id: 'chill', label: 'Chill', icon: 'couch' },
    { id: 'walk', label: 'Walk', icon: 'walking' },
  ];