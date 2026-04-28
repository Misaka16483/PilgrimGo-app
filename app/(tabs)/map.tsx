import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useQuery } from '@tanstack/react-query';
import { useCurrentLocation } from '@/hooks/useLocation';
import { getNearbySpots } from '@/api/spot';
import { useRouter } from 'expo-router';
import { Colors, FontSize, Spacing } from '@/constants/theme';

export default function MapScreen() {
  const router = useRouter();
  const { location, error } = useCurrentLocation();

  const { data } = useQuery({
    queryKey: ['nearbySpots', location?.latitude, location?.longitude],
    queryFn: () =>
      getNearbySpots({
        latitude: location!.latitude,
        longitude: location!.longitude,
        radius: 5000,
      }),
    enabled: !!location,
  });

  const spots = data?.data ?? [];

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={
          location
            ? {
                latitude: location.latitude,
                longitude: location.longitude,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }
            : {
                // 默认：东京
                latitude: 35.6762,
                longitude: 139.6503,
                latitudeDelta: 0.1,
                longitudeDelta: 0.1,
              }
        }
        showsUserLocation
        showsMyLocationButton
      >
        {spots.map((spot) => (
          <Marker
            key={spot.id}
            coordinate={{
              latitude: spot.latitude,
              longitude: spot.longitude,
            }}
            title={spot.name}
            description={spot.animeTitle}
            onCalloutPress={() => router.push(`/spot/${spot.id}`)}
            pinColor={Colors.primary}
          />
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xxl,
  },
  errorText: {
    fontSize: FontSize.md,
    color: Colors.error,
    textAlign: 'center',
  },
});
