import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, Alert, ScrollView, Platform } from 'react-native';
import MapView, { Marker, PROVIDER_APPLE } from 'react-native-maps';
import * as Location from 'expo-location';
import Colors from '@/constants/colors';
import { X, MapPin, Search } from 'lucide-react-native';

interface MapLocationPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelectLocation: (location: { latitude: number; longitude: number }, locationName: string) => void;
}

export default function MapLocationPicker({ visible, onClose, onSelectLocation }: MapLocationPickerProps) {
  const [region, setRegion] = useState({
    latitude: 37.7858,
    longitude: -122.4064,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });
  const [selectedPin, setSelectedPin] = useState<{ latitude: number; longitude: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [locationName, setLocationName] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setRegion({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
      }
    })();
  }, []);

  const handleMapPress = async (event: any) => {
    const coordinate = event.nativeEvent.coordinate;
    setSelectedPin(coordinate);
    
    // Reverse geocode to get location name
    try {
      const results = await Location.reverseGeocodeAsync(coordinate);
      if (results.length > 0) {
        const result = results[0];
        const name = [result.name, result.street, result.city].filter(Boolean).join(', ');
        setLocationName(name || 'Selected Location');
      } else {
        setLocationName('Selected Location');
      }
    } catch (error) {
      setLocationName('Selected Location');
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const results = await Location.geocodeAsync(searchQuery);
      if (results.length > 0) {
        const searchResultsWithNames = await Promise.all(
          results.map(async (result) => {
            try {
              const reverseGeo = await Location.reverseGeocodeAsync({
                latitude: result.latitude,
                longitude: result.longitude,
              });
              const name = reverseGeo.length > 0
                ? [reverseGeo[0].name, reverseGeo[0].street, reverseGeo[0].city].filter(Boolean).join(', ')
                : 'Location';
              return { ...result, name };
            } catch {
              return { ...result, name: 'Location' };
            }
          })
        );
        setSearchResults(searchResultsWithNames);
      } else {
        Alert.alert('No Results', 'No locations found for your search.');
        setSearchResults([]);
      }
    } catch (error) {
      Alert.alert('Search Error', 'Could not search for location. Please try again.');
      setSearchResults([]);
    }
    setIsSearching(false);
  };

  const handleSelectSearchResult = (result: any) => {
    const coordinate = {
      latitude: result.latitude,
      longitude: result.longitude,
    };
    setSelectedPin(coordinate);
    setLocationName(result.name);
    setRegion({
      latitude: result.latitude,
      longitude: result.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });
    setSearchResults([]);
    setSearchQuery('');
  };

  const handleConfirm = () => {
    if (selectedPin && locationName) {
      onSelectLocation(selectedPin, locationName);
    } else {
      Alert.alert('No Location Selected', 'Please select a location on the map or search for one.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <X size={28} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Select Location</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Search size={20} color={Colors.gray} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for a place..."
              placeholderTextColor={Colors.gray}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
          </View>
          <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
            <Text style={styles.searchButtonText}>Search</Text>
          </TouchableOpacity>
        </View>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <ScrollView style={styles.searchResults} keyboardShouldPersistTaps="handled">
            {searchResults.map((result, index) => (
              <TouchableOpacity
                key={index}
                style={styles.searchResultItem}
                onPress={() => handleSelectSearchResult(result)}
              >
                <MapPin size={18} color={Colors.primary} />
                <Text style={styles.searchResultText}>{result.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Map */}
        <MapView
          provider={PROVIDER_APPLE}
          style={styles.map}
          region={region}
          onRegionChangeComplete={setRegion}
          onPress={handleMapPress}
          showsUserLocation
          showsMyLocationButton
        >
          {selectedPin && (
            <Marker coordinate={selectedPin} pinColor={Colors.secondary} />
          )}
        </MapView>

        {/* Selected Location Info */}
        {selectedPin && (
          <View style={styles.selectedLocationInfo}>
            <MapPin size={20} color={Colors.primary} />
            <Text style={styles.selectedLocationText}>{locationName}</Text>
          </View>
        )}

        {/* Confirm Button */}
        <TouchableOpacity
          style={[styles.confirmButton, !selectedPin && styles.confirmButtonDisabled]}
          onPress={handleConfirm}
          disabled={!selectedPin}
        >
          <Text style={styles.confirmButtonText}>Confirm Location</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.lightGray },
  headerTitle: { fontSize: 20, fontWeight: '800', color: Colors.primary },
  searchContainer: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.white, gap: 8 },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.lightGray, borderRadius: 12, paddingHorizontal: 12, gap: 8 },
  searchInput: { flex: 1, fontSize: 16, color: Colors.black, paddingVertical: 12 },
  searchButton: { backgroundColor: Colors.secondary, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12, justifyContent: 'center' },
  searchButtonText: { color: Colors.black, fontWeight: '700', fontSize: 15 },
  searchResults: { maxHeight: 200, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.lightGray },
  searchResultItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, gap: 12, borderBottomWidth: 1, borderBottomColor: Colors.lightGray },
  searchResultText: { fontSize: 15, color: Colors.black, flex: 1 },
  map: { flex: 1 },
  selectedLocationInfo: { position: 'absolute', top: 200, left: 20, right: 20, backgroundColor: Colors.white, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 4 },
  selectedLocationText: { fontSize: 15, color: Colors.primary, fontWeight: '600', flex: 1 },
  confirmButton: { backgroundColor: Colors.secondary, marginHorizontal: 20, marginVertical: 16, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  confirmButtonDisabled: { backgroundColor: Colors.gray },
  confirmButtonText: { color: Colors.black, fontSize: 18, fontWeight: '800' },
});


