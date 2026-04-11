import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import MapView, { Polyline, Marker } from 'react-native-maps';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getRouteDetail } from '@/api/route';
import { Button } from '@/components/Button';
import { formatDistance, formatDuration } from '@/utils/geo';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';

export default function RouteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ['route', Number(id)],
    queryFn: () => getRouteDetail(Number(id)),
  });

  const route = data?.data;

  if (isLoading || !route) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const startPoint = route.trackPoints[0];
  const region = startPoint
    ? {
        latitude: startPoint.latitude,
        longitude: startPoint.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }
    : {
        latitude: 35.6762,
        longitude: 139.6503,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      };

  return (
    <View style={styles.container}>
      {/* 地图：路径轨迹 + 转折点 */}
      <MapView style={styles.map} initialRegion={region}>
        {/* 路径轨迹线 */}
        <Polyline
          coordinates={route.trackPoints.map((p) => ({
            latitude: p.latitude,
            longitude: p.longitude,
          }))}
          strokeColor={Colors.primary}
          strokeWidth={4}
        />
        {/* 转折点标注 */}
        {route.waypoints.map((wp) => (
          <Marker
            key={wp.id}
            coordinate={{
              latitude: wp.location.latitude,
              longitude: wp.location.longitude,
            }}
            title={`标注 ${wp.orderIndex + 1}`}
            description={wp.description}
            pinColor={Colors.secondary}
          />
        ))}
        {/* 起点 / 终点 */}
        {startPoint && (
          <Marker
            coordinate={{
              latitude: startPoint.latitude,
              longitude: startPoint.longitude,
            }}
            title="起点"
            pinColor="green"
          />
        )}
        {route.trackPoints.length > 1 && (
          <Marker
            coordinate={{
              latitude: route.trackPoints[route.trackPoints.length - 1].latitude,
              longitude: route.trackPoints[route.trackPoints.length - 1].longitude,
            }}
            title="终点"
            pinColor="red"
          />
        )}
      </MapView>

      {/* 路径信息面板 */}
      <View style={styles.panel}>
        <Text style={styles.title}>{route.title}</Text>
        <Text style={styles.author}>by {route.authorName}</Text>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{formatDistance(route.distance)}</Text>
            <Text style={styles.statLabel}>距离</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{formatDuration(route.duration)}</Text>
            <Text style={styles.statLabel}>时长</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{route.rating.toFixed(1)}</Text>
            <Text style={styles.statLabel}>评分</Text>
          </View>
        </View>

        <Button
          title="开始跟走"
          size="lg"
          onPress={() => {
            // TODO: 进入跟走导航模式
          }}
          style={{ marginTop: Spacing.md }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  map: {
    flex: 1,
  },
  panel: {
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  author: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.primary,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
