import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { useGroupStore } from '@/store/groupStore';
import { Group } from '@/types';
import { MapPin, Users, Clock, ArrowLeft, Zap } from 'lucide-react-native';

interface GroupsMapViewProps {
  onClose: () => void;
}

export default function GroupsMapView({ onClose }: GroupsMapViewProps) {
  const { activeGroups } = useGroupStore();

  // Mock map view - in a real app, you'd use react-native-maps
  const renderMapPlaceholder = () => (
    <View style={styles.mapPlaceholder}>
      <MapPin size={60} color={Colors.primary} />
      <Text style={styles.mapPlaceholderText}>Interactive Map View</Text>
      <Text style={styles.mapPlaceholderSubtext}>
        {activeGroups.length} groups nearby
      </Text>
    </View>
  );

  const getMoodStyle = (mood: string) => {
    switch(mood) {
      case 'coffee':
        return styles.moodcoffee;
      case 'food':
        return styles.moodfood;
      case 'chill':
        return styles.moodchill;
      case 'walk':
        return styles.moodwalk;
      case 'party':
        return styles.moodparty;
      case 'movie':
        return styles.moodmovie;
      default:
        return {};
    }
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m left`;
    } else {
      return `${minutes}m left`;
    }
  };

  return (
    <Modal
      visible={true}
      animationType="slide"
      presentationStyle="fullScreen"
    >
      <LinearGradient
        colors={[Colors.primary, Colors.darkPurple]}
        style={styles.container}
      >
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Groups on Map</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.mapContainer}>
        {renderMapPlaceholder()}
        
        {/* Mock map pins for groups */}
        <View style={styles.mapPinsContainer}>
          {activeGroups.map((group, index) => (
            <View
              key={group.id}
              style={[
                styles.mapPin,
                { 
                  left: 20 + (index * 60) % 200,
                  top: 30 + (index * 40) % 150,
                }
              ]}
            >
              <View style={[styles.pinMood, getMoodStyle(group.mood)]}>
                <Text style={styles.pinMoodText}>
                  {group.mood.charAt(0).toUpperCase()}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.groupsListContainer}>
        <Text style={styles.groupsListTitle}>Groups Nearby</Text>
        <ScrollView 
          style={styles.groupsList}
          showsVerticalScrollIndicator={false}
        >
          {activeGroups.map((group) => (
            <View key={group.id} style={styles.groupItem}>
              <View style={styles.groupItemHeader}>
                <View style={styles.groupTimeContainer}>
                  <Clock size={12} color={Colors.darkGray} />
                  <Text style={styles.groupTimeText}>
                    {getTimeRemaining(group.expiresAt)}
                  </Text>
                </View>
              </View>
              
              <Text style={styles.groupName}>{group.name}</Text>
              
              <View style={styles.groupDetails}>
                <View style={styles.groupDetail}>
                  <Users size={14} color={Colors.darkGray} />
                  <Text style={styles.groupDetailText}>
                    {group.members.length}/{group.maxMembers} members
                  </Text>
                </View>
                <View style={styles.groupDetail}>
                  <MapPin size={14} color={Colors.darkGray} />
                  <Text style={styles.groupDetailText}>
                    {group.distance} mi away
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
      </LinearGradient>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.white,
  },
  placeholder: {
    width: 40,
  },
  mapContainer: {
    flex: 1,
    margin: 20,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: Colors.white,
    position: 'relative',
    minHeight: 300,
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  mapPlaceholderText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
    marginTop: 12,
  },
  mapPlaceholderSubtext: {
    fontSize: 14,
    color: Colors.darkGray,
    marginTop: 4,
  },
  mapPinsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  mapPin: {
    position: 'absolute',
    alignItems: 'center',
  },
  pinMood: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  moodcoffee: {
    backgroundColor: '#E6C9A8',
  },
  moodfood: {
    backgroundColor: '#FFD0D0',
  },
  moodchill: {
    backgroundColor: '#D0E8FF',
  },
  moodwalk: {
    backgroundColor: '#D0FFD6',
  },
  moodparty: {
    backgroundColor: '#FFB3BA',
  },
  moodmovie: {
    backgroundColor: '#E6B3FF',
  },
  pinMoodText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.black,
  },
  groupsListContainer: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    maxHeight: '40%',
  },
  groupsListTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.black,
    marginBottom: 16,
  },
  groupsList: {
    flex: 1,
  },
  groupItem: {
    backgroundColor: Colors.lightGray,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  groupItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  groupMoodTag: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  groupMoodText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.black,
  },
  groupTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  groupTimeText: {
    fontSize: 12,
    color: Colors.darkGray,
    fontWeight: '500',
  },
  groupName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.black,
    marginBottom: 8,
  },
  groupDetails: {
    flexDirection: 'row',
    gap: 16,
  },
  groupDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  groupDetailText: {
    fontSize: 12,
    color: Colors.darkGray,
  },
});
