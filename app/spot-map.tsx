import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SpotMapScreen } from './(tabs)/map';
import { Colors, FontSize, Spacing } from '@/constants/theme';

export default function SpotMapRoute() {
  const { spotId } = useLocalSearchParams<{ spotId?: string }>();
  const parsedSpotId = spotId ? Number(spotId) : NaN;

  if (!Number.isFinite(parsedSpotId) || parsedSpotId <= 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.message}>取景地地图参数无效</Text>
      </View>
    );
  }

  return <SpotMapScreen spotId={parsedSpotId} />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxl,
    backgroundColor: Colors.background,
  },
  message: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    textAlign: 'center',
  },
});
