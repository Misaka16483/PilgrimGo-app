import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import MapView, { Polyline, Marker } from 'react-native-maps';
import { useRecordingStore } from '@/stores/recordingStore';
import { useLocationTracking, useCurrentLocation } from '@/hooks/useLocation';
import { Button } from '@/components/Button';
import { getTotalDistance, formatDistance, formatDuration } from '@/utils/geo';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';

export default function RecordScreen() {
  const { location } = useCurrentLocation();
  const {
    isRecording,
    trackPoints,
    waypoints,
    startTime,
    startRecording,
    stopRecording,
    addTrackPoint,
    addWaypoint,
    reset,
  } = useRecordingStore();

  // 录制时持续记录 GPS
  useLocationTracking(isRecording, addTrackPoint);

  const handleToggleRecording = useCallback(() => {
    if (isRecording) {
      Alert.alert('结束录制', '确定要结束路径录制吗？', [
        { text: '继续录制', style: 'cancel' },
        { text: '结束', onPress: stopRecording },
      ]);
    } else {
      reset();
      startRecording();
    }
  }, [isRecording]);

  const handleAddWaypoint = useCallback(() => {
    if (trackPoints.length === 0) return;
    const lastPoint = trackPoints[trackPoints.length - 1];
    addWaypoint({
      location: lastPoint,
      imageUrl: '',   // TODO: 调用相机拍照
      description: '', // TODO: 弹出输入框
      orderIndex: waypoints.length,
    });
    Alert.alert('标注已添加', '已在当前位置添加转折点标注');
  }, [trackPoints, waypoints]);

  const distance = getTotalDistance(trackPoints);
  const duration = startTime ? (Date.now() - startTime) / 1000 : 0;

  return (
    <View style={styles.container}>
      {/* 地图 */}
      <MapView
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
        followsUserLocation={isRecording}
      >
        {/* 录制轨迹 */}
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
        {/* 转折点标注 */}
        {waypoints.map((wp, index) => (
          <Marker
            key={index}
            coordinate={{
              latitude: wp.location.latitude,
              longitude: wp.location.longitude,
            }}
            title={`标注 ${index + 1}`}
            description={wp.description || '转折点'}
            pinColor={Colors.secondary}
          />
        ))}
      </MapView>

      {/* 录制信息面板 */}
      <View style={styles.panel}>
        {isRecording && (
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

        <View style={styles.actions}>
          {isRecording && (
            <Button
              title="添加标注"
              variant="outline"
              onPress={handleAddWaypoint}
              style={{ flex: 1, marginRight: Spacing.md }}
            />
          )}
          <Button
            title={isRecording ? '结束录制' : '开始录制'}
            variant={isRecording ? 'secondary' : 'primary'}
            size="lg"
            onPress={handleToggleRecording}
            style={{ flex: 1 }}
          />
        </View>
      </View>
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
    marginBottom: Spacing.lg,
    paddingBottom: Spacing.lg,
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
  actions: {
    flexDirection: 'row',
  },
});
