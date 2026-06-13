import React, { useMemo, useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, Modal, Image, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import MapView, { Polyline, Marker, Callout } from 'react-native-maps';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getRouteDetail, rateRoute, getRouteReviews } from '@/api/route';
import { Button } from '@/components/Button';
import {
  formatDistance,
  formatDuration,
  getBearing,
  getClosestPointOnPolyline,
  getDistance,
} from '@/utils/geo';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { getDisplayImageUrl } from '@/utils/image';
import { useLocationTracking } from '@/hooks/useLocation';
import type { GeoPoint, Waypoint, RouteSpot, RouteSpotAuthorPhoto } from '@/types';

/** 跟走时把当前位置拉回地图中央的最小间隔（毫秒） */
const RECENTER_INTERVAL_MS = 30000;

/** 跟走时距观景点多近提示拍照打卡（米） */
const SPOT_CHECKIN_METERS = 100;

export default function RouteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const routeId = Number(id);
  const router = useRouter();
  const queryClient = useQueryClient();
  const mapRef = useRef<MapView | null>(null);
  const lastDeviationAlertAtRef = useRef<number>(0);
  const currentWaypointIndexRef = useRef<number>(0);
  const navZoomAppliedRef = useRef(false);
  const lastRecenterAtRef = useRef<number>(0);

  const { data, isLoading } = useQuery({
    queryKey: ['route', routeId],
    queryFn: () => getRouteDetail(routeId),
  });

  const route = data?.data;

  const { data: reviewsData } = useQuery({
    queryKey: ['routeReviews', routeId],
    queryFn: () => getRouteReviews(routeId),
    enabled: !Number.isNaN(routeId),
  });
  const reviews = reviewsData?.data ?? [];

  const [navActive, setNavActive] = useState(false);
  const [navPoint, setNavPoint] = useState<GeoPoint | null>(null);
  const [currentWaypointIndex, setCurrentWaypointIndex] = useState(0);
  const [approachWaypointId, setApproachWaypointId] = useState<number | null>(null);
  const [selectedWaypoint, setSelectedWaypoint] = useState<Waypoint | null>(null);
  const [selectedSpot, setSelectedSpot] = useState<RouteSpot | null>(null);
  const [photoViewer, setPhotoViewer] = useState<{
    uri: string;
    caption?: string;
  } | null>(null);
  const [selectedScore, setSelectedScore] = useState<number>(0);
  const [commentText, setCommentText] = useState<string>('');

  const sortedWaypoints = useMemo(() => {
    return (route?.waypoints ?? []).slice().sort((a, b) => a.orderIndex - b.orderIndex);
  }, [route?.waypoints]);

  const sortedSpots = useMemo<RouteSpot[]>(() => {
    return (route?.spots ?? []).slice().sort((a, b) => a.visitOrder - b.visitOrder);
  }, [route?.spots]);

  useLocationTracking(
    navActive,
    (point) => {
      setNavPoint(point);
    },
    3
  );

  useEffect(() => {
    if (!navActive || !navPoint) return;
    const center = { latitude: navPoint.latitude, longitude: navPoint.longitude };
    // 仅在跟走开始后的第一个定位点调整一次缩放并居中
    if (!navZoomAppliedRef.current) {
      navZoomAppliedRef.current = true;
      lastRecenterAtRef.current = Date.now();
      mapRef.current?.animateToRegion(
        { ...center, latitudeDelta: 0.01, longitudeDelta: 0.01 },
        350
      );
      return;
    }
    // 之后只间歇性把定位拉回地图中央，不改用户手动调的缩放（animateCamera 不传 zoom）
    const now = Date.now();
    if (now - lastRecenterAtRef.current < RECENTER_INTERVAL_MS) return;
    lastRecenterAtRef.current = now;
    mapRef.current?.animateCamera({ center }, { duration: 350 });
  }, [navActive, navPoint]);

  const nextWaypoint = sortedWaypoints[currentWaypointIndex] ?? null;
  const trackPoints = route?.trackPoints ?? [];
  const startPoint = trackPoints[0];
  const closestOnTrack =
    navPoint && trackPoints.length > 0 ? getClosestPointOnPolyline(navPoint, trackPoints) : null;
  const deviationMeters = closestOnTrack ? closestOnTrack.distanceMeters : null;
  const deviationBearing =
    navPoint && closestOnTrack ? getBearing(navPoint, closestOnTrack.closestPoint) : null;
  const nextWaypointDistanceMeters =
    navPoint && nextWaypoint ? getDistance(navPoint, nextWaypoint.location) : null;

  // 跟走中离当前位置最近、且进入打卡范围的观景点
  const nearbySpot = useMemo(() => {
    if (!navActive || !navPoint) return null;
    let best: { spot: RouteSpot; index: number; distanceMeters: number } | null = null;
    for (let index = 0; index < sortedSpots.length; index++) {
      const spot = sortedSpots[index];
      if (spot.latitude == null || spot.longitude == null) continue;
      const d = getDistance(navPoint, {
        latitude: spot.latitude,
        longitude: spot.longitude,
        timestamp: 0,
      });
      if (d <= SPOT_CHECKIN_METERS && (best == null || d < best.distanceMeters)) {
        best = { spot, index, distanceMeters: d };
      }
    }
    return best;
  }, [navActive, navPoint, sortedSpots]);

  const goSpotCheckIn = (spot: RouteSpot) => {
    router.push({
      pathname: '/checkin/create',
      params: {
        spotId: String(spot.spotId),
        spotName: spot.name,
        animeTitle: route?.animeTitle ?? '',
        routeId: String(routeId),
      },
    });
  };

  const deviationDirectionText =
    deviationBearing == null ? null : bearingToDirectionText(deviationBearing);

  const nextWaypointOnTrack = useMemo(() => {
    if (!nextWaypoint) return null;
    if (trackPoints.length === 0) return null;
    return getClosestPointOnPolyline(nextWaypoint.location, trackPoints);
  }, [nextWaypoint?.id, trackPoints]);

  const rejoinThenFollowCoords = useMemo(() => {
    if (!closestOnTrack) return null;
    if (!nextWaypoint) return null;
    if (!nextWaypointOnTrack) return null;
    if (trackPoints.length === 0) return null;

    const startSeg = closestOnTrack.segmentIndex;
    const endSeg = nextWaypointOnTrack.segmentIndex;

    const coords: Array<{ latitude: number; longitude: number }> = [];
    coords.push({
      latitude: closestOnTrack.closestPoint.latitude,
      longitude: closestOnTrack.closestPoint.longitude,
    });

    if (endSeg >= startSeg) {
      const slice = trackPoints
        .slice(startSeg + 1, endSeg + 1)
        .map((p) => ({ latitude: p.latitude, longitude: p.longitude }));
      coords.push(...slice);
    }

    coords.push({
      latitude: nextWaypointOnTrack.closestPoint.latitude,
      longitude: nextWaypointOnTrack.closestPoint.longitude,
    });

    const tailDistance = getDistance(nextWaypointOnTrack.closestPoint, nextWaypoint.location);
    if (tailDistance > 10) {
      coords.push({
        latitude: nextWaypoint.location.latitude,
        longitude: nextWaypoint.location.longitude,
      });
    }

    const deduped: Array<{ latitude: number; longitude: number }> = [];
    for (const c of coords) {
      const last = deduped[deduped.length - 1];
      if (!last || last.latitude !== c.latitude || last.longitude !== c.longitude) {
        deduped.push(c);
      }
    }

    return deduped.length >= 2 ? deduped : null;
  }, [closestOnTrack, nextWaypoint, nextWaypointOnTrack, trackPoints]);

  useEffect(() => {
    currentWaypointIndexRef.current = currentWaypointIndex;
  }, [currentWaypointIndex]);

  useEffect(() => {
    if (!navActive || !navPoint) return;

    const DEVIATE_METERS = 50;
    const DEVIATE_ALERT_COOLDOWN_MS = 20000;
    const now = Date.now();
    if (
      deviationMeters != null &&
      deviationMeters > DEVIATE_METERS &&
      now - lastDeviationAlertAtRef.current > DEVIATE_ALERT_COOLDOWN_MS
    ) {
      lastDeviationAlertAtRef.current = now;
      const dir = deviationDirectionText ? `，向${deviationDirectionText}方向回到轨迹` : '';
      Alert.alert('偏离路线', `你已偏离路线约 ${Math.round(deviationMeters)} 米${dir}`);
    }
  }, [navActive, navPoint, deviationMeters, deviationDirectionText]);

  useEffect(() => {
    if (!navActive || !navPoint || !nextWaypoint) return;

    const APPROACH_METERS = 80;
    const ARRIVE_METERS = 25;

    if (nextWaypointDistanceMeters != null && nextWaypointDistanceMeters <= APPROACH_METERS) {
      setApproachWaypointId(nextWaypoint.id);
    } else {
      if (approachWaypointId === nextWaypoint.id) setApproachWaypointId(null);
    }

    if (nextWaypointDistanceMeters != null && nextWaypointDistanceMeters <= ARRIVE_METERS) {
      const nextIndex = Math.min(sortedWaypoints.length, currentWaypointIndexRef.current + 1);
      currentWaypointIndexRef.current = nextIndex;
      setCurrentWaypointIndex(nextIndex);
      setApproachWaypointId(null);
    }
  }, [
    navActive,
    navPoint,
    nextWaypoint,
    nextWaypointDistanceMeters,
    sortedWaypoints.length,
    approachWaypointId,
  ]);
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

  const rateMutation = useMutation({
    mutationFn: ({ score, comment }: { score: number; comment?: string }) =>
      rateRoute(routeId, score, comment),
    onSuccess: (res) => {
      if (res?.code && res.code !== 200) {
        Alert.alert('评分失败', res.message || '请稍后重试');
        return;
      }
      setCommentText('');
      queryClient.invalidateQueries({ queryKey: ['route', routeId] });
      queryClient.invalidateQueries({ queryKey: ['routeReviews', routeId] });
      queryClient.invalidateQueries({ queryKey: ['animeRoutes'] });
    },
    onError: () => {
      Alert.alert('评分失败', '请检查网络或登录状态后重试');
    },
  });

  const submitRating = () => {
    if (selectedScore < 1) {
      Alert.alert('请先选择星级', '至少点 1 颗星才能提交评价');
      return;
    }
    rateMutation.mutate({ score: selectedScore, comment: commentText.trim() || undefined });
  };

  const startNav = () => {
    currentWaypointIndexRef.current = 0;
    setCurrentWaypointIndex(0);
    setApproachWaypointId(null);
    navZoomAppliedRef.current = false;
    lastRecenterAtRef.current = 0;
    setNavActive(true);
  };

  const stopNav = () => {
    setNavActive(false);
    setApproachWaypointId(null);
    setNavPoint(null);
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!route) {
    return (
      <View style={styles.center}>
        <Text style={{ color: Colors.textSecondary, marginBottom: Spacing.md }}>路径不存在或已被删除</Text>
        <Button title="返回" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 地图：路径轨迹 + 转折点 */}
      <MapView
        ref={(r) => {
          mapRef.current = r;
        }}
        style={styles.map}
        initialRegion={region}
        showsUserLocation
        showsMyLocationButton
      >
        {/* 路径轨迹线 */}
        <Polyline
          coordinates={route.trackPoints.map((p) => ({
            latitude: p.latitude,
            longitude: p.longitude,
          }))}
          strokeColor={Colors.primary}
          strokeWidth={4}
        />
        {navActive && navPoint && closestOnTrack && deviationMeters != null && deviationMeters > 50 && (
          <>
            <Polyline
              coordinates={[
                { latitude: navPoint.latitude, longitude: navPoint.longitude },
                {
                  latitude: closestOnTrack.closestPoint.latitude,
                  longitude: closestOnTrack.closestPoint.longitude,
                },
              ]}
              strokeColor={Colors.error}
              strokeWidth={3}
              lineDashPattern={[10, 8]}
            />
            {rejoinThenFollowCoords && (
              <Polyline
                coordinates={rejoinThenFollowCoords}
                strokeColor={Colors.primary}
                strokeWidth={4}
              />
            )}
            <Marker
              coordinate={{
                latitude: closestOnTrack.closestPoint.latitude,
                longitude: closestOnTrack.closestPoint.longitude,
              }}
              title="回到轨迹点"
              description="从这里回到原路线"
              pinColor={Colors.error}
            />
          </>
        )}
        {/* 观景点：与 record 屏一致的绿色圆形 marker，按访问顺序编号；
            点击 marker 滚动到底部对应卡片或展示作者实拍。 */}
        {sortedSpots.map((spot, index) => {
          if (spot.latitude == null || spot.longitude == null) return null;
          return (
            <Marker
              key={`spot-${spot.spotId}`}
              coordinate={{ latitude: spot.latitude, longitude: spot.longitude }}
              anchor={{ x: 0.5, y: 0.5 }}
              onPress={() => setSelectedSpot(spot)}
            >
              <View style={styles.spotMarker}>
                <Text style={styles.spotMarkerText}>{index + 1}</Text>
              </View>
              <Callout tooltip={false}>
                <View style={styles.calloutBox}>
                  <Text style={styles.calloutTitle} numberOfLines={2}>
                    观景点 {index + 1}：{spot.name}
                  </Text>
                  {spot.episodeNumber != null ? (
                    <Text style={styles.calloutMeta}>第 {spot.episodeNumber} 集</Text>
                  ) : null}
                  {spot.authorPhotos.length > 0 ? (
                    <Text style={styles.calloutMeta}>作者实拍 {spot.authorPhotos.length} 张</Text>
                  ) : null}
                </View>
              </Callout>
            </Marker>
          );
        })}

        {/* 转折点：菱形标记，与圆形观景点视觉上明显区分，避免跟走时混淆 */}
        {route.waypoints.map((wp) => {
          const isNext = nextWaypoint?.id === wp.id;
          return (
            <Marker
              key={`wp-${wp.id}`}
              coordinate={{
                latitude: wp.location.latitude,
                longitude: wp.location.longitude,
              }}
              anchor={{ x: 0.5, y: 0.5 }}
              onPress={() => setSelectedWaypoint(wp)}
            >
              <View
                style={[
                  styles.waypointMarker,
                  isNext && styles.waypointMarkerActive,
                ]}
              >
                <Text style={styles.waypointMarkerText}>{wp.orderIndex + 1}</Text>
              </View>
            </Marker>
          );
        })}
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

      {/* 路径信息面板：内容可能很长（观景点/转折点/评价），整体可竖向滚动 */}
      <ScrollView
        style={styles.panel}
        contentContainerStyle={styles.panelContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {!navActive ? (
          <>
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

            {(sortedSpots.length > 0 || sortedWaypoints.length > 0) && (
              <View style={styles.legendRow}>
                {sortedSpots.length > 0 && (
                  <View style={styles.legendItem}>
                    <View style={styles.legendDotSpot} />
                    <Text style={styles.legendLabel}>观景点 {sortedSpots.length}</Text>
                  </View>
                )}
                {sortedWaypoints.length > 0 && (
                  <View style={styles.legendItem}>
                    <View style={styles.legendDotWaypoint} />
                    <Text style={styles.legendLabel}>转折点 {sortedWaypoints.length}</Text>
                  </View>
                )}
              </View>
            )}

            {sortedSpots.length > 0 && (
              <View style={styles.spotsBlock}>
                <Text style={styles.blockTitle}>
                  观景点 ({sortedSpots.length})
                  <Text style={styles.blockSub}>　按到访顺序，含作者实拍</Text>
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {sortedSpots.map((spot, index) => (
                    <TouchableOpacity
                      key={`spot-card-${spot.spotId}`}
                      style={styles.spotCard}
                      activeOpacity={0.85}
                      onPress={() => setSelectedSpot(spot)}
                    >
                      <View style={styles.spotCardHeader}>
                        <View style={styles.spotBadge}>
                          <Text style={styles.spotBadgeText}>{index + 1}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.spotName} numberOfLines={2}>
                            {spot.name}
                          </Text>
                          {(spot.episodeNumber != null || spot.sceneTime) && (
                            <Text style={styles.spotMeta} numberOfLines={1}>
                              {spot.episodeNumber != null ? `第 ${spot.episodeNumber} 集` : ''}
                              {spot.episodeNumber != null && spot.sceneTime ? ' · ' : ''}
                              {spot.sceneTime ?? ''}
                            </Text>
                          )}
                        </View>
                      </View>
                      {spot.animeImageUrl ? (
                        <Image
                          source={{ uri: getDisplayImageUrl(spot.animeImageUrl) }}
                          style={styles.spotAnimeImage}
                        />
                      ) : (
                        <View style={[styles.spotAnimeImage, styles.spotImagePlaceholder]}>
                          <Text style={styles.placeholderText}>无原画</Text>
                        </View>
                      )}
                      {spot.authorPhotos.length > 0 ? (
                        <View style={styles.authorPhotoRow}>
                          {spot.authorPhotos.slice(0, 3).map((p) => (
                            <Image
                              key={p.id}
                              source={{ uri: p.photoUrl }}
                              style={styles.authorPhotoThumb}
                            />
                          ))}
                          {spot.authorPhotos.length > 3 ? (
                            <View style={[styles.authorPhotoThumb, styles.morePhotos]}>
                              <Text style={styles.morePhotosText}>
                                +{spot.authorPhotos.length - 3}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                      ) : (
                        <Text style={styles.noPhotosText}>作者未在此点拍照</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {sortedWaypoints.length > 0 && (
              <View style={styles.waypointsBlock}>
                <Text style={styles.blockTitle}>
                  转折点 ({sortedWaypoints.length})
                  <Text style={styles.blockSub}>　路线方向变化的提示</Text>
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {sortedWaypoints.map((wp) => (
                    <TouchableOpacity
                      key={wp.id}
                      style={styles.waypointCard}
                      activeOpacity={0.8}
                      onPress={() => setSelectedWaypoint(wp)}
                    >
                      <View style={styles.waypointHeader}>
                        <Text style={styles.waypointIndex}>{wp.orderIndex + 1}</Text>
                        <Text style={styles.waypointDesc} numberOfLines={2}>
                          {wp.description}
                        </Text>
                      </View>
                      {!!wp.imageUrl && (
                        <Image source={{ uri: wp.imageUrl }} style={styles.waypointImage} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.rateRow}>
              <Text style={styles.blockTitle}>给这条路径评分</Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => setSelectedScore(s)}
                    disabled={rateMutation.isPending}
                    style={styles.starBtn}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.star, s <= (selectedScore || 0) ? styles.starOn : styles.starOff]}>
                      ★
                    </Text>
                  </TouchableOpacity>
                ))}
                {selectedScore > 0 && <Text style={styles.scoreHint}>{selectedScore} 分</Text>}
              </View>
              <TextInput
                style={styles.commentInput}
                placeholder="说说这条路径的跟走体验吧（选填）"
                placeholderTextColor={Colors.textLight}
                value={commentText}
                onChangeText={setCommentText}
                multiline
                maxLength={1000}
              />
              <Button
                title={rateMutation.isPending ? '提交中…' : '提交评价'}
                onPress={submitRating}
                disabled={rateMutation.isPending}
                style={{ marginTop: Spacing.sm }}
              />
            </View>

            <View style={styles.reviewsBlock}>
              <Text style={styles.blockTitle}>
                路径评价 ({route.ratingCount})
                {route.ratingCount > 0 ? (
                  <Text style={styles.blockSub}>　平均 {route.rating.toFixed(1)} 分</Text>
                ) : null}
              </Text>
              {reviews.length === 0 ? (
                <Text style={styles.noReviews}>还没有人评价，来当第一个吧～</Text>
              ) : (
                reviews.map((rv) => (
                  <View key={rv.id} style={styles.reviewItem}>
                    <View style={styles.reviewHeader}>
                      <Text style={styles.reviewAuthor} numberOfLines={1}>
                        {rv.authorName}
                      </Text>
                      <Text style={styles.reviewStars}>
                        {'★'.repeat(rv.score)}
                        <Text style={styles.reviewStarsOff}>{'★'.repeat(5 - rv.score)}</Text>
                      </Text>
                    </View>
                    {rv.comment ? (
                      <Text style={styles.reviewComment}>{rv.comment}</Text>
                    ) : null}
                    <Text style={styles.reviewDate}>{rv.createdAt?.slice(0, 10)}</Text>
                  </View>
                ))
              )}
            </View>

            <Button
              title="开始跟走"
              size="lg"
              onPress={startNav}
              style={{ marginTop: Spacing.md }}
            />
          </>
        ) : (
          <>
            <View style={styles.navHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.navTitle}>跟走导航</Text>
                <Text style={styles.navSub} numberOfLines={1}>
                  {nextWaypoint
                    ? `下一转折点：${nextWaypoint.orderIndex + 1}`
                    : '已完成全部转折点'}
                </Text>
              </View>
              <Button title="结束" variant="outline" onPress={stopNav} />
            </View>

            <View style={styles.navMetrics}>
              <View style={styles.metric}>
                <Text style={styles.metricValue}>
                  {nextWaypointDistanceMeters == null ? '--' : formatDistance(nextWaypointDistanceMeters)}
                </Text>
                <Text style={styles.metricLabel}>到下个点</Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricValue}>
                  {deviationMeters == null ? '--' : `${Math.round(deviationMeters)}m`}
                </Text>
                <Text style={styles.metricLabel}>偏离</Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricValue}>
                  {Math.min(currentWaypointIndex, sortedWaypoints.length)}/{sortedWaypoints.length}
                </Text>
                <Text style={styles.metricLabel}>进度</Text>
              </View>
            </View>

            {deviationMeters != null && deviationMeters > 50 && closestOnTrack && (
              <View style={styles.returnHint}>
                <Text style={styles.returnHintTitle}>回到轨迹</Text>
                <Text style={styles.returnHintText}>
                  {deviationDirectionText ? `向${deviationDirectionText}方向 ` : ''}
                  {formatDistance(deviationMeters)}
                </Text>
              </View>
            )}

            {approachWaypointId && nextWaypoint && (
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.approachCard}
                onPress={() => setSelectedWaypoint(nextWaypoint)}
              >
                <Text style={styles.approachTitle}>即将到达转折点 {nextWaypoint.orderIndex + 1}</Text>
                <Text style={styles.approachDesc} numberOfLines={2}>
                  {nextWaypoint.description}
                </Text>
                <Text style={styles.approachHint}>点我查看标注照片</Text>
              </TouchableOpacity>
            )}

            {nearbySpot && (
              <View style={styles.spotCheckInCard}>
                <Text style={styles.approachTitle}>
                  已到达观景点 {nearbySpot.index + 1}：{nearbySpot.spot.name}
                </Text>
                <Text style={styles.approachDesc} numberOfLines={1}>
                  距离约 {Math.round(nearbySpot.distanceMeters)} 米，拍下你的巡礼瞬间吧
                </Text>
                <View style={styles.spotCheckInActions}>
                  <Button
                    title="拍照打卡"
                    size="sm"
                    onPress={() => goSpotCheckIn(nearbySpot.spot)}
                    style={{ flex: 1 }}
                  />
                  <Button
                    title="看原画"
                    size="sm"
                    variant="outline"
                    onPress={() => setSelectedSpot(nearbySpot.spot)}
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
            )}

            <Button title="返回" variant="secondary" onPress={() => router.back()} style={{ marginTop: Spacing.md }} />
          </>
        )}
      </ScrollView>

      <Modal
        visible={!!selectedWaypoint}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedWaypoint(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              转折点 {selectedWaypoint ? selectedWaypoint.orderIndex + 1 : ''}
            </Text>
            <Text style={styles.modalDesc}>{selectedWaypoint?.description}</Text>
            {!!selectedWaypoint?.imageUrl && (
              <Image source={{ uri: selectedWaypoint.imageUrl }} style={styles.modalImage} />
            )}
            <Button title="关闭" onPress={() => setSelectedWaypoint(null)} style={{ marginTop: Spacing.md }} />
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!selectedSpot}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedSpot(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              观景点：{selectedSpot?.name}
            </Text>
            {(selectedSpot?.episodeNumber != null || selectedSpot?.sceneTime) && (
              <Text style={styles.modalDesc}>
                {selectedSpot?.episodeNumber != null
                  ? `第 ${selectedSpot.episodeNumber} 集`
                  : ''}
                {selectedSpot?.episodeNumber != null && selectedSpot?.sceneTime ? ' · ' : ''}
                {selectedSpot?.sceneTime ?? ''}
              </Text>
            )}

            <ScrollView style={styles.spotModalScroll}>
              {selectedSpot?.animeImageUrl ? (
                <View>
                  <Text style={styles.modalSectionTitle}>动画原画</Text>
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() =>
                      selectedSpot.animeImageUrl &&
                      setPhotoViewer({
                        uri: getDisplayImageUrl(selectedSpot.animeImageUrl)!,
                        caption: `${selectedSpot.name} · 动画原画`,
                      })
                    }
                  >
                    <Image
                      source={{ uri: getDisplayImageUrl(selectedSpot.animeImageUrl) }}
                      style={styles.modalImage}
                    />
                  </TouchableOpacity>
                </View>
              ) : null}

              {selectedSpot && selectedSpot.authorPhotos.length > 0 ? (
                <View style={{ marginTop: Spacing.md }}>
                  <Text style={styles.modalSectionTitle}>
                    作者实拍（{selectedSpot.authorPhotos.length}）
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {selectedSpot.authorPhotos.map((p) => (
                      <TouchableOpacity
                        key={p.id}
                        activeOpacity={0.9}
                        onPress={() =>
                          setPhotoViewer({ uri: p.photoUrl, caption: p.content })
                        }
                        style={styles.authorPhotoCard}
                      >
                        <Image source={{ uri: p.photoUrl }} style={styles.authorPhotoLarge} />
                        {p.content ? (
                          <Text numberOfLines={2} style={styles.authorPhotoCaption}>
                            {p.content}
                          </Text>
                        ) : null}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              ) : selectedSpot ? (
                <Text style={styles.noPhotosTextLarge}>
                  作者还没在这个观景点拍照
                </Text>
              ) : null}
            </ScrollView>

            {navActive && selectedSpot && (
              <Button
                title="在此拍照打卡"
                onPress={() => {
                  const spot = selectedSpot;
                  setSelectedSpot(null);
                  goSpotCheckIn(spot);
                }}
                style={{ marginTop: Spacing.md }}
              />
            )}
            <Button
              title="关闭"
              variant={navActive ? 'outline' : 'primary'}
              onPress={() => setSelectedSpot(null)}
              style={{ marginTop: navActive ? Spacing.sm : Spacing.md }}
            />
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!photoViewer}
        transparent
        animationType="fade"
        onRequestClose={() => setPhotoViewer(null)}
      >
        <TouchableOpacity
          style={styles.photoViewerBackdrop}
          activeOpacity={1}
          onPress={() => setPhotoViewer(null)}
        >
          {photoViewer ? (
            <>
              <Image
                source={{ uri: photoViewer.uri }}
                style={styles.photoViewerImage}
                resizeMode="contain"
              />
              {photoViewer.caption ? (
                <Text style={styles.photoViewerCaption}>{photoViewer.caption}</Text>
              ) : null}
            </>
          ) : null}
        </TouchableOpacity>
      </Modal>
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
    // 让地图始终占据上半部分，面板最多占 62% 屏高，内容超出时面板内部滚动
    maxHeight: '62%',
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  panelContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
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
  waypointsBlock: {
    marginTop: Spacing.lg,
  },
  blockTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  waypointCard: {
    width: 220,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    marginRight: Spacing.md,
  },
  waypointHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  waypointIndex: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.primary,
    color: Colors.white,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 26,
  },
  waypointDesc: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.text,
    lineHeight: 18,
    marginLeft: Spacing.sm,
  },
  waypointImage: {
    width: '100%',
    height: 110,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
    backgroundColor: Colors.card,
  },
  rateRow: {
    marginTop: Spacing.lg,
  },
  starsRow: {
    flexDirection: 'row',
    marginTop: Spacing.xs,
  },
  starBtn: {
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  star: {
    fontSize: 28,
  },
  starOn: {
    color: Colors.accent,
  },
  starOff: {
    color: Colors.border,
  },
  scoreHint: {
    marginLeft: Spacing.sm,
    alignSelf: 'center',
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.accent,
  },
  commentInput: {
    marginTop: Spacing.sm,
    minHeight: 64,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSize.sm,
    color: Colors.text,
    textAlignVertical: 'top',
    backgroundColor: Colors.surface,
  },
  reviewsBlock: {
    marginTop: Spacing.lg,
  },
  noReviews: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
    fontStyle: 'italic',
  },
  reviewItem: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reviewAuthor: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
    marginRight: Spacing.sm,
  },
  reviewStars: {
    fontSize: FontSize.sm,
    color: Colors.accent,
  },
  reviewStarsOff: {
    color: Colors.border,
  },
  reviewComment: {
    marginTop: 4,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  reviewDate: {
    marginTop: 4,
    fontSize: FontSize.xs,
    color: Colors.textLight,
  },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navTitle: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.text,
  },
  navSub: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  navMetrics: {
    flexDirection: 'row',
    marginTop: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
  },
  metric: {
    flex: 1,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.primary,
  },
  metricLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  approachCard: {
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  spotCheckInCard: {
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.success,
  },
  spotCheckInActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  approachTitle: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.text,
  },
  approachDesc: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 6,
    lineHeight: 18,
  },
  approachHint: {
    fontSize: FontSize.xs,
    color: Colors.primary,
    marginTop: 8,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.text,
  },
  modalDesc: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    lineHeight: 18,
  },
  modalImage: {
    width: '100%',
    height: 260,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.md,
    backgroundColor: Colors.surface,
  },
  returnHint: {
    marginTop: Spacing.md,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  returnHintTitle: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.text,
  },
  returnHintText: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.primary,
    marginTop: 6,
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
  spotMarkerText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '800',
  },
  waypointMarker: {
    width: 22,
    height: 22,
    backgroundColor: Colors.secondary,
    borderWidth: 2,
    borderColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '45deg' }],
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 3,
  },
  waypointMarkerActive: {
    backgroundColor: Colors.primary,
  },
  waypointMarkerText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: '800',
    transform: [{ rotate: '-45deg' }],
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
  legendRow: {
    flexDirection: 'row',
    marginTop: Spacing.md,
    gap: Spacing.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDotSpot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.success,
    marginRight: 6,
  },
  legendDotWaypoint: {
    width: 10,
    height: 10,
    backgroundColor: Colors.secondary,
    transform: [{ rotate: '45deg' }],
    marginRight: 6,
  },
  legendLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  blockSub: {
    fontSize: FontSize.xs,
    fontWeight: '400',
    color: Colors.textLight,
  },
  spotsBlock: {
    marginTop: Spacing.lg,
  },
  spotCard: {
    width: 240,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    marginRight: Spacing.md,
  },
  spotCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  spotBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  spotBadgeText: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: 13,
  },
  spotName: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
    lineHeight: 18,
  },
  spotMeta: {
    marginTop: 2,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  spotAnimeImage: {
    width: '100%',
    height: 120,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.card,
  },
  spotImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
  },
  authorPhotoRow: {
    flexDirection: 'row',
    marginTop: Spacing.sm,
    gap: 4,
  },
  authorPhotoThumb: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.card,
  },
  morePhotos: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  morePhotosText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.text,
  },
  noPhotosText: {
    marginTop: Spacing.sm,
    fontSize: FontSize.xs,
    color: Colors.textLight,
    fontStyle: 'italic',
  },
  noPhotosTextLarge: {
    marginTop: Spacing.md,
    fontSize: FontSize.sm,
    color: Colors.textLight,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  spotModalScroll: {
    marginTop: Spacing.md,
    maxHeight: 380,
  },
  modalSectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  authorPhotoCard: {
    width: 200,
    marginRight: Spacing.md,
  },
  authorPhotoLarge: {
    width: 200,
    height: 200,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
  },
  authorPhotoCaption: {
    marginTop: Spacing.xs,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  photoViewerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  photoViewerImage: {
    width: '100%',
    height: '80%',
  },
  photoViewerCaption: {
    marginTop: Spacing.md,
    color: Colors.white,
    fontSize: FontSize.sm,
    textAlign: 'center',
  },
});

function bearingToDirectionText(bearing: number) {
  const dirs = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'];
  const index = Math.round(bearing / 45) % 8;
  return dirs[index];
}
