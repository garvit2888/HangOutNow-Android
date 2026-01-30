import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, SafeAreaView, Alert, Platform } from 'react-native';
import MapView, { Marker, PROVIDER_APPLE } from 'react-native-maps';
import Colors from '@/constants/colors';
import { Check, X } from 'lucide-react-native';

interface PinPlacementModalProps {
  visible: boolean;
  emoji: string;
  initialLocation: { latitude: number; longitude: number };
  activityName: string;
  onConfirm: (location: { latitude: number; longitude: number }) => void;
  onCancel: () => void;
}

export default function PinPlacementModal({
  visible,
  emoji,
  initialLocation,
  activityName,
  onConfirm,
  onCancel,
}: PinPlacementModalProps) {
  const [pinLocation, setPinLocation] = useState(initialLocation);
  const [confirming, setConfirming] = useState(false);
  const mapRef = useRef<MapView>(null);

  console.log('PinPlacementModal render, visible:', visible);
  console.log('PinPlacementModal props:', { emoji, initialLocation, activityName });

  const handleMapPress = (event: any) => {
    const { coordinate } = event.nativeEvent;
    setPinLocation(coordinate);
  };

  const handleConfirm = () => {
    if (confirming) return;
    setConfirming(true);
    onConfirm(pinLocation);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel} style={styles.cancelButton}>
            <X size={24} color={Colors.white} />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Place Your Activity Pin</Text>
            <Text style={styles.headerSubtitle}>Tap to adjust location</Text>
          </View>
          <TouchableOpacity onPress={handleConfirm} style={[styles.confirmButton, confirming && styles.disabled]} disabled={confirming}>
            {confirming ? (
              <Text style={styles.confirmingText}>...</Text>
            ) : (
              <Check size={24} color={Colors.white} />
            )}
          </TouchableOpacity>
        </View>

        {/* Map */}
        <MapView
          ref={mapRef}
          provider={PROVIDER_APPLE}
          style={styles.map}
          initialRegion={{
            latitude: initialLocation.latitude,
            longitude: initialLocation.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          onPress={handleMapPress}
          showsUserLocation
        >
          {/* Draggable Pin */}
          <Marker
            coordinate={pinLocation}
            draggable
            onDragEnd={(e) => setPinLocation(e.nativeEvent.coordinate)}
          >
            <View style={styles.pinContainer}>
              <View style={styles.emojiPin}>
                <Text style={styles.emojiText}>{emoji}</Text>
              </View>
              <View style={styles.pinShadow} />
            </View>
          </Marker>
        </MapView>

        {/* Instructions */}
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>{activityName}</Text>
          <Text style={styles.instructionsText}>
            Tap anywhere on the map or drag the pin to set the exact location for your activity
          </Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'android' ? 50 : 12, // Extra padding for Android status bar
    backgroundColor: Colors.primary,
  },
  cancelButton: {
    padding: 8,
  },
  headerTextContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.white,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.secondary,
    marginTop: 2,
  },
  confirmButton: {
    padding: 8,
    backgroundColor: Colors.secondary,
    borderRadius: 20,
  },
  confirmingText: { color: Colors.white, fontWeight: '800', fontSize: 16, paddingHorizontal: 4 },
  disabled: { opacity: 0.6 },
  map: {
    flex: 1,
  },
  pinContainer: {
    alignItems: 'center',
  },
  emojiPin: {
    backgroundColor: Colors.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 25,
    borderWidth: 3,
    borderColor: Colors.secondary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  emojiText: {
    fontSize: 28,
  },
  pinShadow: {
    width: 8,
    height: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 4,
    marginTop: 4,
  },
  instructionsContainer: {
    backgroundColor: Colors.white,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary,
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 14,
    color: Colors.darkGray,
    lineHeight: 20,
  },
});

