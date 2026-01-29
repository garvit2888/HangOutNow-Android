import React from 'react';
import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';
import Colors from '@/constants/colors';
import { Map as MapIcon, MessageSquare, User } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.secondary,
        tabBarInactiveTintColor: Colors.white,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        headerStyle: styles.header,
        headerTitleStyle: styles.headerTitle,
        headerTintColor: Colors.white,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="map"
        options={{
          headerShown: false,
          tabBarIcon: ({ color }) => <MapIcon size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          headerShown: false,
          tabBarIcon: ({ color }) => <MessageSquare size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          headerShown: false,
          tabBarIcon: ({ color }) => <User size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          href: null, // Hide from tab bar
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.primary,
    borderTopWidth: 0,
    elevation: 0,
    height: 60,
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  header: {
    backgroundColor: Colors.primary,
    shadowColor: 'transparent',
    elevation: 0,
  },
  headerTitle: {
    fontWeight: 'bold',
    fontSize: 20,
  },
});