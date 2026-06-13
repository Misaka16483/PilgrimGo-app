import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView, Image, TouchableOpacity } from 'react-native';
import MapView, { Polyline, Marker, Callout } from 'react-native-maps';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRecordingStore } from '@/stores/recordingStore';
import { useAuthStore } from '@/stores/authStore';
import { useLocationTracking, useCurrentLocation } from '@/hooks/useLocation';
import { Button } from '@/components/Button';
import { UploadRouteModal } from '@/components/UploadRouteModal';
import { WaypointAnnotateModal } from '@/components/WaypointAnnotateModal';
import { SpotPickerModal } from '@/components/SpotPickerModal';
import { getDistance, getTotalDistance, formatDistance, formatDuration } from '@/utils/geo';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { getDisplayImageUrl } from '@/utils/image';
import type { GeoPoint, Spot } from '@/types';

/** 距离取景地多近时提醒（米） */
const SPOT_PROXIMITY_METERS = 50;

/** 录制时把当前位置拉回地图中央的最小间隔（毫秒） */
const RECENTER_INTERVAL_MS = 30000;

export default function RecordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ animeId?: string }>();
  const { location } = useCurrentLocation();
  const user = useAuthStore((s) => s.user);
  const {
    isRecording,
    trackPoints,
    waypoints,
    targetSpots,
    alertedSpotIds,
    startTime,
    animeId,
    startRecording,
    stopRecording,
    addTrackPoint,
    addWaypoint,
    setAnimeId,
    setTargetSpots,
    markSpotAlerted,
    reset,
  } = useRecordingStore();

  const [uploadVisible, setUploadVisible] = useState(false);
  const [waypointVisible, setWaypointVisible] = useState(false);
  const [spotPickerVisible, setSpotPickerVisible] = useState(false);
  const mapRef = useRef<MapView>(null);
  const lastRecenterAtRef = useRef<number>(0);

  /** 把视野扩到能同时看到当前位置 + 所有目标取景地。 */
  const fitToTargets = useCallback(
    (spots: Spot[]) => {
      const coords = spots
        .filter((s) => Number.isFinite(s.latitude) && Number.isFinite(s.longitude))
        .map((s) => ({ latitude: s.latitude, longitude: s.longitude }));
      if (location) {
        coords.push({ latitude: location.latitude, longitude: location.longitude });
      }
      if (coords.length === 0 || !mapRef.current) return;
      mapRef.current.fitToCoordinates(coords, {
        edgePadding: { top: 80, right: 60, bottom: 260, left: 60 },
        animated: true,
      });
    },
    [location]
  );

  const handleSpotConfirm = useCallback(
    (spots: Spot[]) => {
      setTargetSpots(spots);
      // 等弹窗关闭那一帧再 fit，否则可能正在动画里被吃掉
      setTimeout(() => fitToTargets(spots), 200);
    },
    [setTargetSpots, fitToTargets]
  );

  // 录制时持续记录 GPS，同时对每个新点位检查是否靠近目标取景地
  const onLocationPoint = useCallback(
    (point: GeoPoint) => {
      addTrackPoint(point);
      // 间歇性把定位拉回地图中央；只动 center 不传 zoom，保留用户手动调的缩放
      const now = Date.now();
      if (now - lastRecenterAtRef.current >= RECENTER_INTERVAL_MS) {
        lastRecenterAtRef.current = now;
        mapRef.current?.animateCamera(
          { center: { latitude: point.latitude, longitude: point.longitude } },
          { duration: 500 }
        );
      }
      if (targetSpots.length === 0) return;
      for (const spot of targetSpots) {
        if (alertedSpotIds.includes(spot.id)) continue;
        const d = getDistance(point, {
          latitude: spot.latitude,
          longitude: spot.longitude,
          timestamp: 0,
        });
        if (d <= SPOT_PROXIMITY_METERS) {
          markSpotAlerted(spot.id);
          Alert.alert(
            `📍 已接近：${spot.name}`,
            `距离约 ${Math.round(d)} 米，要不要直接对比拍照打卡？`,
            [
              { text: '稍后', style: 'cancel' },
              {
                text: '对比拍照打卡',
                onPress: () =>
                  router.push({
                    pathname: '/ar/compare',
                    params: {
                      spotId: String(spot.id),
                      animeImageUrl: getDisplayImageUrl(spot.animeImageUrl),
                      spotName: spot.name,
                    },
                  }),
              },
            ]
          );
          break; // 一次更新最多提醒一个，避免连环弹窗
        }
      }
    },
    [addTrackPoint, targetSpots, alertedSpotIds, markSpotAlerted, router]
  );

  useLocationTracking(isRecording, onLocationPoint);

  // 路由参数透传 animeId（从作品详情页跳进来时预选）
  useEffect(() => {
    if (params.animeId) {
      const id = Number(params.animeId);
      if (!Number.isNaN(id)) setAnimeId(id);
    }
  }, [params.animeId]);

  const hasFinishedRecording = !isRecording && trackPoints.length > 0;

  const handleStart = useCallback(() => {
    if (!user) {
      Alert.alert('请先登录', '需要登录后才能录制并上传路径', [
        { text: '取消', style: 'cancel' },
        { text: '去登录', onPress: () => router.push('/auth/login') },
      ]);
      return;
    }
    // 注意：不要在这里调 reset()，它会把已选的 targetSpots 一并清掉。
    // startRecording 内部已经清掉 trackPoints / waypoints / alertedSpotIds。
    if (params.animeId) {
      const id = Number(params.animeId);
      if (!Number.isNaN(id)) setAnimeId(id);
    }
    startRecording();
    lastRecenterAtRef.current = Date.now();
    // 仅在开录这一刻调整一次缩放：有目标取景地就 fit 全部，否则定到当前位置；
    // 之后不再动用户手动调的缩放
    setTimeout(() => {
      if (targetSpots.length > 0) {
        fitToTargets(targetSpots);
      } else if (location) {
        mapRef.current?.animateToRegion(
          {
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          },
          350
        );
      }
    }, 200);
  }, [user, params.animeId, targetSpots, location, fitToTargets, setAnimeId, startRecording]);

  const handleStop = useCallback(() => {
    Alert.alert('结束录制', '确定要结束路径录制吗？', [
      { text: '继续录制', style: 'cancel' },
      { text: '结束', onPress: stopRecording },
    ]);
  }, []);

  const handleDiscard = useCallback(() => {
    Alert.alert('丢弃录制', '本次录制将不会保存，确认丢弃？', [
      { text: '取消', style: 'cancel' },
      { text: '丢弃', style: 'destructive', onPress: reset },
    ]);
  }, []);

  const handleOpenWaypoint = useCallback(() => {
    if (trackPoints.length === 0) {
      Alert.alert('暂无 GPS 轨迹', '请等待获取到当前位置后再添加标注');
      return;
    }
    setWaypointVisible(true);
  }, [trackPoints]);

  const handleSaveWaypoint = useCallback(
    (waypoint: { location: typeof trackPoints[number]; localUri: string; description: string }) => {
      // imageUrl 暂存为本地 file:// URI，整条路径上传时再统一替换为公开 URL
      addWaypoint({
        location: waypoint.location,
        imageUrl: waypoint.localUri,
        description: waypoint.description,
        orderIndex: waypoints.length,
      });
      setWaypointVisible(false);
    },
    [addWaypoint, waypoints.length]
  );

  const handleUploaded = useCallback(
    (routeId: number) => {
      setUploadVisible(false);
      reset();
      Alert.alert('上传成功', '路径已发布', [
        { text: '查看详情', onPress: () => router.push(`/route/${routeId}`) },
      ]);
    },
    [router]
  );

  const distance = getTotalDistance(trackPoints);
  const duration = startTime ? (Date.now() - startTime) / 1000 : 0;

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={
          location
            ? {
                latitude: location.latitude,
                longitude: location.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }
            : {
                latitude: 35.6762,
                longitude: 139.6503,
                latitudeDelta: 0.1,
                longitudeDelta: 0.1,
              }
        }
        showsUserLocation
      >
        {trackPoints.length > 1 && (
          <Polyline
            coordinates={trackPoints.map((p) => ({
              latitude: p.latitude,
              longitude: p.longitude,
            }))}
            strokeColor={Colors.primary}
            strokeWidth={4}
          />
        )}
        {/* 目标取景地：自定义圆形 marker，绿色，与红色转折点 pin 区分 */}
        {targetSpots.map((spot, index) => {
          const alerted = alertedSpotIds.includes(spot.id);
          return (
            <Marker
              key={`spot-${spot.id}`}
              coordinate={{ latitude: spot.latitude, longitude: spot.longitude }}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View
                style={[
                  styles.spotMarker,
                  alerted && styles.spotMarkerAlerted,
                ]}
              >
                <Text style={styles.spotMarkerText}>{index + 1}</Text>
              </View>
              <Callout tooltip={false}>
                <View style={styles.calloutBox}>
                  <Text style={styles.calloutTitle} numberOfLines={2}>
                    取景地：{spot.name}
                  </Text>
                  {spot.episodeNumber ? (
                    <Text style={styles.calloutMeta}>第 {spot.episodeNumber} 集</Text>
                  ) : null}
                </View>
              </Callout>
            </Marker>
          );
        })}

        {/* 录制中的转折点：默认 pin，副色 */}
        {waypoints.map((wp, index) => (
          <Marker
            key={`wp-${index}`}
            coordinate={{
              latitude: wp.location.latitude,
              longitude: wp.location.longitude,
            }}
            title={`转折点 ${index + 1}`}
            description={wp.description || '转折点标注'}
            pinColor={Colors.secondary}
          />
        ))}
      </MapView>

      <View style={styles.panel}>
        {(isRecording || hasFinishedRecording) && (
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{formatDistance(distance)}</Text>
              <Text style={styles.statLabel}>距离</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{formatDuration(duration)}</Text>
              <Text style={styles.statLabel}>时长</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{waypoints.length}</Text>
              <Text style={styles.statLabel}>标注</Text>
            </View>
          </View>
        )}

        {animeId != null && (
          <Text style={styles.hint}>已绑定作品 ID：{animeId}</Text>
        )}

        {/* 录制前 / 录制中都展示已选取景地概览 + 重新选择入口 */}
        {(!hasFinishedRecording || targetSpots.length > 0) && animeId != null && (
          <View style={styles.spotsRow}>
            <View style={styles.spotsLegend}>
              <View style={styles.legendDotSpot} />
              <Text style={styles.legendText}>
                目标取景地 {targetSpots.length > 0 ? targetSpots.length : '未选择'}
                {targetSpots.length > 0
                  ? `  ·  已途经 ${alertedSpotIds.length}`
                  : ''}
              </Text>
              <View style={styles.legendDotWaypoint} />
              <Text style={styles.legendText}>转折点 {waypoints.length}</Text>
            </View>
            {!isRecording && (
              <TouchableOpacity
                onPress={() => setSpotPickerVisible(true)}
                hitSlop={8}
              >
                <Text style={styles.linkText}>
                  {targetSpots.length > 0 ? '修改' : '选择取景地'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {waypoints.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.waypointStrip}
            contentContainerStyle={styles.waypointStripContent}
          >
            {waypoints.map((wp, index) => (
              <View key={index} style={styles.waypointCard}>
                {wp.imageUrl ? (
                  <Image source={{ uri: wp.imageUrl }} style={styles.waypointThumb} />
                ) : (
                  <View style={[styles.waypointThumb, styles.waypointThumbEmpty]}>
                    <Text style={styles.waypointThumbEmptyText}>无图</Text>
                  </View>
                )}
                <Text style={styles.waypointIndex}>#{index + 1}</Text>
                {wp.description ? (
                  <Text style={styles.waypointDesc} numberOfLines={2}>
                    {wp.description}
                  </Text>
                ) : null}
              </View>
            ))}
          </ScrollView>
        )}

        <View style={styles.actions}>
          {isRecording && (
            <>
              <Button
                title="添加标注"
                variant="outline"
                onPress={handleOpenWaypoint}
                style={{ flex: 1, marginRight: Spacing.md }}
              />
              <Button
                title="结束录制"
                variant="secondary"
                size="lg"
                onPress={handleStop}
                style={{ flex: 1 }}
              />
            </>
          )}

          {!isRecording && !hasFinishedRecording && (
            <Button
              title="开始录制"
              size="lg"
              onPress={handleStart}
              style={{ flex: 1 }}
            />
          )}

          {hasFinishedRecording && (
            <>
              <Button
                title="丢弃"
                variant="outline"
                onPress={handleDiscard}
                style={{ flex: 1, marginRight: Spacing.md }}
              />
              <Button
                title="上传路径"
                size="lg"
                onPress={() => setUploadVisible(true)}
                style={{ flex: 1 }}
              />
            </>
          )}
        </View>
      </View>

      <UploadRouteModal
        visible={uploadVisible}
        onClose={() => setUploadVisible(false)}
        onUploaded={handleUploaded}
      />

      <WaypointAnnotateModal
        visible={waypointVisible}
        location={trackPoints.length > 0 ? trackPoints[trackPoints.length - 1] : null}
        onClose={() => setWaypointVisible(false)}
        onSaved={handleSaveWaypoint}
      />

      <SpotPickerModal
        visible={spotPickerVisible}
        animeId={animeId}
        selected={targetSpots}
        onClose={() => setSpotPickerVisible(false)}
        onConfirm={handleSpotConfirm}
      />
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
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    color: Colors.text,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  hint: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  waypointStrip: {
    marginBottom: Spacing.md,
  },
  waypointStripContent: {
    gap: Spacing.sm,
  },
  waypointCard: {
    width: 96,
  },
  waypointThumb: {
    width: 96,
    height: 72,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surface,
  },
  waypointThumbEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  waypointThumbEmptyText: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
  },
  waypointIndex: {
    marginTop: 4,
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.primary,
  },
  waypointDesc: {
    marginTop: 2,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
  },
  spotMarker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.success,
    borderWidth: 2,
    borderColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 3,
  },
  spotMarkerAlerted: {
    opacity: 0.55,
  },
  spotMarkerText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '800',
  },
  calloutBox: {
    maxWidth: 220,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
  },
  calloutTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
  },
  calloutMeta: {
    marginTop: 2,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  spotsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  spotsLegend: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  legendDotSpot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.success,
    marginRight: 4,
  },
  legendDotWaypoint: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.secondary,
    marginLeft: Spacing.sm,
    marginRight: 4,
  },
  legendText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  linkText: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: '600',
  },
});
