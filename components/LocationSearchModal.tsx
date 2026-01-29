import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, Alert, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native';
import * as Location from 'expo-location';
import Colors from '@/constants/colors';
import { X, Search, MapPin } from 'lucide-react-native';

interface LocationSearchModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectLocation: (location: { latitude: number; longitude: number }, locationName: string) => void;
}

type SearchResult = {
  latitude?: number;
  longitude?: number;
  displayName: string;
  placeId?: string;
  source: 'google' | 'mapbox' | 'geocode';
};

export default function LocationSearchModal({ visible, onClose, onSelectLocation }: LocationSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestSearchIdRef = useRef(0);
  const mapboxAbortControllerRef = useRef<AbortController | null>(null);
  const rawMapboxToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
  const sanitizedMapboxToken = rawMapboxToken?.trim();
  const hasMapboxToken =
    !!sanitizedMapboxToken && sanitizedMapboxToken !== 'undefined' && sanitizedMapboxToken !== 'null';
  const rawGoogleApiKey = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
  const sanitizedGoogleApiKey = rawGoogleApiKey?.trim();
  const hasGoogleApiKey =
    !!sanitizedGoogleApiKey && sanitizedGoogleApiKey !== 'undefined' && sanitizedGoogleApiKey !== 'null';
  const googleAbortControllerRef = useRef<AbortController | null>(null);
  const createAutocompleteSessionToken = () =>
    `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
  const autocompleteSessionTokenRef = useRef<string>(createAutocompleteSessionToken());

  // Preload user location for proximity-based suggestions
  useEffect(() => {
    if (!visible) {
      return;
    }

    let isMounted = true;

    autocompleteSessionTokenRef.current = createAutocompleteSessionToken();

    (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({});
          if (isMounted) {
            setUserLocation({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            });
          }
        }
      } catch (locError) {
        console.log('Could not preload user location for suggestions:', locError);
      }
    })();

    return () => {
      isMounted = false;
      if (mapboxAbortControllerRef.current) {
        mapboxAbortControllerRef.current.abort();
        mapboxAbortControllerRef.current = null;
      }
      if (googleAbortControllerRef.current) {
        googleAbortControllerRef.current.abort();
        googleAbortControllerRef.current = null;
      }
    };
  }, [visible]);

  // Auto-search as user types with debounce
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.trim().length >= 3) {
      searchTimeoutRef.current = setTimeout(() => {
        handleSearch();
      }, 800); // Wait 800ms after user stops typing
    } else if (searchQuery.trim().length === 0) {
      setSearchResults([]);
      setErrorMessage(''); // Clear error when search query is cleared
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const handleSearch = async () => {
    const trimmedQuery = searchQuery.trim();

    if (trimmedQuery.length < 3) {
      return;
    }

    const searchId = ++latestSearchIdRef.current;

    setIsSearching(true);
    setErrorMessage('');

    if (hasGoogleApiKey) {
      if (googleAbortControllerRef.current) {
        googleAbortControllerRef.current.abort();
      }

      const controller = new AbortController();
      googleAbortControllerRef.current = controller;

      try {
        const params = new URLSearchParams({
          input: trimmedQuery,
          key: sanitizedGoogleApiKey!,
          language: 'en',
          sessiontoken: autocompleteSessionTokenRef.current,
          types: 'geocode',
        });

        if (userLocation) {
          params.append('location', `${userLocation.latitude},${userLocation.longitude}`);
          params.append('radius', '50000');
        }

        const response = await fetch(
          `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params.toString()}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error(`Google Places autocomplete failed with status ${response.status}`);
        }

        const data = await response.json();

        if (latestSearchIdRef.current !== searchId) {
          return;
        }

        if (data.status === 'OK') {
          const predictions = Array.isArray(data.predictions) ? data.predictions : [];

          const formattedResults: SearchResult[] = predictions.map((prediction: any) => ({
            displayName:
              prediction.description ||
              prediction?.structured_formatting?.main_text ||
              trimmedQuery,
            placeId: prediction.place_id,
            source: 'google',
          }));

          setSearchResults(formattedResults);

          if (formattedResults.length === 0) {
            setErrorMessage('No locations found. Try a different search term or location.');
          }
        } else if (data.status === 'ZERO_RESULTS') {
          setSearchResults([]);
          setErrorMessage('No locations found. Try a different search term or location.');
        } else {
          console.error('Google Places autocomplete error:', data);
          setSearchResults([]);
          setErrorMessage(
            data.error_message || 'Unable to fetch suggestions right now. Please try again.'
          );
        }
      } catch (error: any) {
        if (error?.name === 'AbortError') {
          return;
        }

        console.error('Google Places search error:', error);

        if (latestSearchIdRef.current !== searchId) {
          return;
        }

        setErrorMessage('Unable to fetch suggestions right now. Please try again.');
        setSearchResults([]);
      } finally {
        if (latestSearchIdRef.current === searchId) {
          setIsSearching(false);
        }
        if (googleAbortControllerRef.current === controller) {
          googleAbortControllerRef.current = null;
        }
      }

      return;
    }

    if (hasMapboxToken) {
      if (mapboxAbortControllerRef.current) {
        mapboxAbortControllerRef.current.abort();
      }

      const controller = new AbortController();
      mapboxAbortControllerRef.current = controller;

      try {
        const params = new URLSearchParams({
          access_token: sanitizedMapboxToken!,
          autocomplete: 'true',
          limit: '8',
          language: 'en',
          types: 'address,poi,neighborhood,place,locality,region',
        });

        if (userLocation) {
          params.append('proximity', `${userLocation.longitude},${userLocation.latitude}`);
        }

        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(trimmedQuery)}.json?${params.toString()}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error(`Mapbox request failed with status ${response.status}`);
        }

        const data = await response.json();
        const features = Array.isArray(data?.features) ? data.features : [];

        if (latestSearchIdRef.current !== searchId) {
          return;
        }

        const formattedResults: SearchResult[] = features
          .map((feature: any) => {
            const [lng, lat] = feature?.center || [];
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
              return null;
            }

            return {
              latitude: lat,
              longitude: lng,
              displayName: feature?.place_name || trimmedQuery,
              placeId: feature?.id,
              source: 'mapbox' as const,
            };
          })
          .filter((result: SearchResult | null): result is SearchResult => result !== null);

        setSearchResults(formattedResults);

        if (formattedResults.length === 0) {
          setErrorMessage('No locations found. Try a different search term or location.');
        }
      } catch (error: any) {
        if (error?.name === 'AbortError') {
          return;
        }

        console.error('Mapbox search error:', error);

        if (latestSearchIdRef.current !== searchId) {
          return;
        }

        setErrorMessage('Unable to fetch suggestions right now. Please try again.');
        setSearchResults([]);
      } finally {
        if (latestSearchIdRef.current === searchId) {
          setIsSearching(false);
        }
        if (mapboxAbortControllerRef.current === controller) {
          mapboxAbortControllerRef.current = null;
        }
      }

      return;
    }

    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Search timeout')), 15000)
      );

      const searchVariations = [trimmedQuery, `${trimmedQuery}, nearby`, `${trimmedQuery} area`];

      let allResults: Location.LocationGeocodedLocation[] = [];

      for (const variation of searchVariations) {
        if (latestSearchIdRef.current !== searchId) {
          return;
        }

        try {
          const results = (await Promise.race([
            Location.geocodeAsync(variation),
            timeoutPromise,
          ])) as Location.LocationGeocodedLocation[];

          if (results && results.length > 0) {
            allResults = [...allResults, ...results];
          }
        } catch (err) {
          console.log(`Variation "${variation}" failed:`, err);
        }
      }

      if (latestSearchIdRef.current !== searchId) {
        return;
      }

      if (allResults.length === 0) {
        setErrorMessage('No locations found. Try a different search term or location.');
        setSearchResults([]);
        return;
      }

      const uniqueResults: Location.LocationGeocodedLocation[] = [];
      for (const result of allResults) {
        const isDuplicate = uniqueResults.some(unique => {
          const distance = calculateDistance(
            result.latitude,
            result.longitude,
            unique.latitude,
            unique.longitude
          );
          return distance < 0.1;
        });

        if (!isDuplicate) {
          uniqueResults.push(result);
        }
      }

      let filteredResults = uniqueResults;
      if (userLocation) {
        filteredResults = uniqueResults.filter(result => {
          const distance = calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            result.latitude,
            result.longitude
          );
          return distance <= 50;
        });
      }

      const topResults = filteredResults.slice(0, 8);

      const formattedResults: SearchResult[] = await Promise.all(
        topResults.map(async (result, index) => {
          try {
            const reverseResults = await Location.reverseGeocodeAsync({
              latitude: result.latitude,
              longitude: result.longitude,
            });

            if (reverseResults && reverseResults.length > 0) {
              const place = reverseResults[0];
              const parts = [
                place.name,
                place.street,
                place.city || place.subregion,
                place.region,
              ].filter(Boolean);

              const displayName =
                parts.length > 0 ? parts.slice(0, 3).join(', ') : `${trimmedQuery} (Location ${index + 1})`;

              return {
                latitude: result.latitude,
                longitude: result.longitude,
                displayName,
                source: 'geocode' as const,
              };
            }
          } catch (reverseError) {
            console.log('Reverse geocoding failed for result:', reverseError);
          }

          return {
            latitude: result.latitude,
            longitude: result.longitude,
            displayName: `${trimmedQuery} (Location ${index + 1})`,
            source: 'geocode' as const,
          };
        })
      );

      if (latestSearchIdRef.current !== searchId) {
        return;
      }

      setSearchResults(formattedResults);

      if (formattedResults.length === 0) {
        setErrorMessage('No locations found. Try a different search term or location.');
      }
    } catch (error: any) {
      console.error('Search error:', error);

      if (latestSearchIdRef.current !== searchId) {
        return;
      }

      if (error.message === 'Search timeout') {
        setErrorMessage('Search is taking too long. Please try again or use a more specific location.');
      } else {
        setErrorMessage('Could not search for location. Please check your internet connection and try again.');
      }
      setSearchResults([]);
    } finally {
      if (latestSearchIdRef.current === searchId) {
        setIsSearching(false);
      }
    }
  };

  // Helper function to calculate distance between two coordinates (in km)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const fetchGooglePlaceDetails = async (placeId: string) => {
    if (!hasGoogleApiKey) {
      return null;
    }

    try {
      const params = new URLSearchParams({
        place_id: placeId,
        key: sanitizedGoogleApiKey!,
        language: 'en',
        fields: 'geometry/location,formatted_address,name',
        sessiontoken: autocompleteSessionTokenRef.current,
      });

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error(`Google Place details failed with status ${response.status}`);
      }

      const data = await response.json();

      if (data.status !== 'OK') {
        console.error('Google Place details error:', data);
        return null;
      }

      const location = data.result?.geometry?.location;

      if (!location || !Number.isFinite(location.lat) || !Number.isFinite(location.lng)) {
        return null;
      }

      const displayName =
        data.result?.formatted_address || data.result?.name || 'Selected location';

      return {
        latitude: location.lat as number,
        longitude: location.lng as number,
        displayName,
      };
    } catch (error) {
      console.error('Google Place details fetch error:', error);
      return null;
    }
  };

  const handleSelectResult = async (result: SearchResult) => {
    let latitude = result.latitude;
    let longitude = result.longitude;
    let displayName = result.displayName;

    if (
      result.source === 'google' &&
      result.placeId &&
      hasGoogleApiKey &&
      (latitude === undefined || longitude === undefined)
    ) {
      setIsSearching(true);
      try {
        const details = await fetchGooglePlaceDetails(result.placeId);
        if (!details) {
          Alert.alert(
            'Location unavailable',
            'Could not load coordinates for this place. Please try another search.'
          );
          return;
        }
        latitude = details.latitude;
        longitude = details.longitude;
        displayName = details.displayName;
      } finally {
        setIsSearching(false);
      }
    }

    if (latitude === undefined || longitude === undefined) {
      Alert.alert(
        'Location unavailable',
        'Could not load coordinates for this place. Please try another search.'
      );
      return;
    }

    autocompleteSessionTokenRef.current = createAutocompleteSessionToken();

    const coordinate = {
      latitude,
      longitude,
    };

    onSelectLocation(coordinate, displayName);
    setSearchQuery('');
    setSearchResults([]);
    setErrorMessage('');
  };

  const handleClose = () => {
    if (mapboxAbortControllerRef.current) {
      mapboxAbortControllerRef.current.abort();
      mapboxAbortControllerRef.current = null;
    }
    setSearchQuery('');
    setSearchResults([]);
    setErrorMessage('');
    setIsSearching(false);
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal 
      visible={visible} 
      animationType="slide" 
      onRequestClose={handleClose}
      transparent={false}
      statusBarTranslucent={false}
      presentationStyle="fullScreen"
    >
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          {/* Header */}
          <View style={styles.header}>
          <TouchableOpacity onPress={handleClose}>
            <X size={28} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Search Location</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Search size={20} color={Colors.gray} />
            <TextInput
              style={styles.searchInput}
              placeholder="Type to search"
              placeholderTextColor={Colors.gray}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              autoFocus
            />
            {isSearching && <ActivityIndicator size="small" color={Colors.primary} style={{ marginLeft: 8 }} />}
          </View>
        </View>

        {/* Search Results */}
        <ScrollView style={styles.resultsContainer} keyboardShouldPersistTaps="handled">
          {errorMessage ? (
            <View style={styles.errorState}>
              <Search size={48} color={Colors.gray} />
              <Text style={styles.errorTitle}>Unable to Find Location</Text>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : searchResults.length > 0 ? (
            <>
              <Text style={styles.resultsTitle}>Search Results</Text>
              {searchResults.map((result, index) => (
                <TouchableOpacity
                  key={result.placeId ?? `${result.latitude}-${result.longitude}-${index}`}
                  style={styles.resultItem}
                  onPress={() => handleSelectResult(result)}
                >
                  <View style={styles.resultIconContainer}>
                    <MapPin size={20} color={Colors.primary} />
                  </View>
                  <View style={styles.resultTextContainer}>
                    <Text style={styles.resultName}>{result.displayName}</Text>
                    <Text style={styles.resultCoords}>
                      {result.latitude !== undefined && result.longitude !== undefined
                        ? `${result.latitude.toFixed(4)}, ${result.longitude.toFixed(4)}`
                        : 'Tap to view details'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </>
          ) : (
            <View style={styles.emptyState}>
              <Search size={48} color={Colors.gray} />
              <Text style={styles.emptyTitle}>Search for a Location</Text>
              <Text style={styles.emptySubtitle}>
                Enter a place name, address, or landmark{'\n'}to find its location
              </Text>
            </View>
          )}
        </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.white },
  container: { flex: 1, backgroundColor: Colors.white },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20, 
    paddingTop: 16, 
    paddingBottom: 16, 
    backgroundColor: Colors.white, 
    borderBottomWidth: 1, 
    borderBottomColor: Colors.lightGray 
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: Colors.primary },
  searchContainer: { 
    paddingHorizontal: 16, 
    paddingVertical: 16, 
    backgroundColor: Colors.white, 
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray
  },
  searchBar: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: Colors.lightGray, 
    borderRadius: 12, 
    paddingHorizontal: 14, 
    gap: 10 
  },
  searchInput: { flex: 1, fontSize: 16, color: Colors.black, paddingVertical: 14 },
  searchButton: { 
    backgroundColor: Colors.secondary, 
    borderRadius: 12, 
    paddingHorizontal: 24, 
    paddingVertical: 14, 
    justifyContent: 'center',
    minWidth: 90,
    alignItems: 'center'
  },
  searchButtonDisabled: { backgroundColor: Colors.gray },
  searchButtonText: { color: Colors.black, fontWeight: '700', fontSize: 16 },
  resultsContainer: { flex: 1 },
  resultsTitle: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: Colors.darkGray, 
    paddingHorizontal: 20, 
    paddingVertical: 16 
  },
  resultItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: Colors.lightGray,
    backgroundColor: Colors.white
  },
  resultIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  resultTextContainer: { flex: 1 },
  resultName: { fontSize: 16, fontWeight: '600', color: Colors.black, marginBottom: 4 },
  resultCoords: { fontSize: 13, color: Colors.darkGray },
  emptyState: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 80,
    paddingHorizontal: 40
  },
  emptyTitle: { 
    fontSize: 20, 
    fontWeight: '700', 
    color: Colors.primary, 
    marginTop: 16,
    marginBottom: 8 
  },
  emptySubtitle: { 
    fontSize: 15, 
    color: Colors.darkGray, 
    textAlign: 'center',
    lineHeight: 22
  },
  errorState: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 80,
    paddingHorizontal: 40
  },
  errorTitle: { 
    fontSize: 20, 
    fontWeight: '700', 
    color: '#FF3B30', 
    marginTop: 16,
    marginBottom: 8 
  },
  errorText: { 
    fontSize: 15, 
    color: Colors.darkGray, 
    textAlign: 'center',
    lineHeight: 22
  },
  exampleBox: {
    backgroundColor: Colors.lightGray,
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    width: '100%'
  },
  exampleTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 8
  },
  exampleText: {
    fontSize: 14,
    color: Colors.darkGray,
    marginBottom: 4
  },
});

