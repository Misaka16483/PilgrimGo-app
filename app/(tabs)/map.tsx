import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, type Region } from 'react-native-maps';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getAnimeSpots } from '@/api/anime';
import { getMapAnimeBounds, getMapSpotItems, getSpotDetail } from '@/api/spot';
import { RemoteImage } from '@/components/RemoteImage';
import { Colors, FontSize, Spacing } from '@/constants/theme';
import { getDisplayImageUrl } from '@/utils/image';
import type { GeoPoint, MapSpotItem, Spot } from '@/types';

const DEFAULT_REGION: Region = {
  latitude: 36.2,
  longitude: 138.2,
  latitudeDelta: 12,
  longitudeDelta: 18,
};

const MAP_QUERY_LIMIT = 180;
const MAP_CACHE_TIME_MS = 5 * 60_000;
const MAP_NOTICE_DURATION_MS = 3500;
const CLUSTER_DETAIL_ZOOM = 12;
const CLUSTER_DETAIL_FALLBACK_DELTA = 0.12;
const CLUSTER_FIT_EDGE_PADDING = { top: 180, right: 60, bottom: 140, left: 60 };

export default function MapScreen() {
  const { spotId } = useLocalSearchParams<{ spotId?: string }>();
  const parsedSpotId = spotId ? Number(spotId) : undefined;

  if (parsedSpotId && Number.isFinite(parsedSpotId)) {
    return <SpotMapScreen spotId={parsedSpotId} />;
  }

  return <LayeredMapScreen />;
}

export function SpotMapScreen({ spotId }: { spotId: number }) {
  const router = useRouter();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['spotMap', spotId],
    queryFn: () => getSpotDetail(spotId),
    enabled: Number.isFinite(spotId) && spotId > 0,
  });

  const spot = data?.data;

  if (isLoading) {
    return <LoadingState text="正在加载取景地地图..." />;
  }

  if (isError || !spot) {
    return <MessageState text="取景地地图加载失败，请稍后重试" error />;
  }

  if (!isValidCoordinate(spot)) {
    return <MessageState text="这个取景地没有经纬度，无法显示地图标注" />;
  }

  const region = buildRegion(spot.latitude, spot.longitude, 0.01);

  return (
    <View style={styles.container}>
      <MapView
        key={`spot-${spot.id}`}
        style={styles.map}
        initialRegion={region}
        showsUserLocation={false}
      >
        <Marker
          coordinate={{
            latitude: spot.latitude,
            longitude: spot.longitude,
          }}
          title={spot.name}
          description={buildMarkerDescription(spot)}
          pinColor={Colors.primary}
          onCalloutPress={() => router.push(`/spot/${spot.id}`)}
        />
      </MapView>

      <View style={styles.headerPanel}>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {spot.name}
        </Text>
        <Text style={styles.headerSubtitle} numberOfLines={1}>
          {spot.animeTitle ? `${spot.animeTitle} · 取景地地图` : '取景地地图'}
        </Text>
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.navigateButton}
          onPress={() => {
            void openNavigation(spot);
          }}
        >
          <Text style={styles.navigateButtonText}>导航到这里</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function LayeredMapScreen() {
  const router = useRouter();
  const { animeId: animeIdParam, animeTitle: animeTitleParam } = useLocalSearchParams<{
    animeId?: string;
    animeTitle?: string;
  }>();
  const paramAnimeId =
    animeIdParam && Number.isFinite(Number(animeIdParam)) && Number(animeIdParam) > 0
      ? Number(animeIdParam)
      : undefined;

  const mapRef = useRef<MapView | null>(null);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapErrorNoticeShownRef = useRef(false);
  const ignoreRegionChangeUntilRef = useRef(0);
  const [location, setLocation] = useState<GeoPoint | null>(null);
  const [mapNoticeText, setMapNoticeText] = useState<string | null>(null);
  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  // 当前点开的单个取景地（用于底部信息卡展示图片）
  const [selectedSpot, setSelectedSpot] = useState<MapSpotItem | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<MapSpotItem | null>(null);
  const [isClusterDetailLoading, setIsClusterDetailLoading] = useState(false);
  const [clusterDetailCacheKey, setClusterDetailCacheKey] = useState<string | null>(null);
  const [clusterDetailQuery, setClusterDetailQuery] = useState<ReturnType<typeof buildMapQuery> | null>(null);
  const [clusterQuery, setClusterQuery] = useState<ReturnType<typeof buildMapQuery> | null>(null);
  const [cachedClusterItems, setCachedClusterItems] = useState<MapSpotItem[]>([]);
  const [cachedClusterRegion, setCachedClusterRegion] = useState<Region | null>(null);
  const [displayedItems, setDisplayedItems] = useState<MapSpotItem[]>([]);

  // 作品筛选只来自路由参数（从作品详情「在地图查看全部」跳进来）
  const selectedAnimeId = paramAnimeId;
  const selectedAnimeTitle = selectedAnimeId
    ? animeTitleParam?.trim() || `作品 ${selectedAnimeId}`
    : null;

  const clearMapNotice = useCallback(() => {
    if (noticeTimerRef.current) {
      clearTimeout(noticeTimerRef.current);
      noticeTimerRef.current = null;
    }
    setMapNoticeText(null);
  }, []);

  const showMapNotice = useCallback((text: string) => {
    if (noticeTimerRef.current) {
      clearTimeout(noticeTimerRef.current);
    }
    setMapNoticeText(text);
    noticeTimerRef.current = setTimeout(() => {
      setMapNoticeText(null);
      noticeTimerRef.current = null;
    }, MAP_NOTICE_DURATION_MS);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const resolveLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          throw new Error('location denied');
        }

        const current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          mayShowUserSettingsDialog: true,
        });

        if (cancelled) {
          return;
        }

        setLocation({
          latitude: current.coords.latitude,
          longitude: current.coords.longitude,
          altitude: current.coords.altitude ?? undefined,
          timestamp: current.timestamp,
        });
        clearMapNotice();
      } catch {
        if (cancelled) {
          return;
        }

        setLocation(null);
        showMapNotice('位置不可用，已按作品取景地显示');
      }
    };

    void resolveLocation();

    return () => {
      cancelled = true;
    };
  }, [clearMapNotice, showMapNotice]);

  // 选中作品时，拉取它的全部取景地坐标，用于自动缩放到能看全所有点
  const animeSpotsQuery = useQuery({
    queryKey: ['mapAnimeFit', selectedAnimeId],
    queryFn: () => getAnimeSpots(selectedAnimeId as number),
    enabled: !!selectedAnimeId,
    staleTime: 5 * 60_000,
    retry: false,
  });

  // 该作品的取景地按 id 建索引，点开标注时用来取图片/名称（地图接口本身不带图）
  const spotInfoById = useMemo(() => {
    const map = new Map<number, Spot>();
    for (const spot of animeSpotsQuery.data?.data ?? []) {
      map.set(spot.id, spot);
    }
    return map;
  }, [animeSpotsQuery.data]);

  // 切换作品时关掉已打开的信息卡
  useEffect(() => {
    setSelectedSpot(null);
    setSelectedCluster(null);
    setIsClusterDetailLoading(false);
    setClusterDetailCacheKey(null);
    setClusterDetailQuery(null);
    setClusterQuery(null);
    setCachedClusterItems([]);
    setCachedClusterRegion(null);
    setDisplayedItems([]);
  }, [selectedAnimeId]);

  const animeBoundsQuery = useQuery({
    queryKey: ['mapAnimeBounds', selectedAnimeId],
    queryFn: () => getMapAnimeBounds(selectedAnimeId as number),
    enabled: !!selectedAnimeId,
    staleTime: 5 * 60_000,
    retry: false,
  });

  const activeMapQuery = clusterDetailQuery ?? clusterQuery;
  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: ['mapSpotItems', activeMapQuery?.cacheKey],
    queryFn: () => getMapSpotItems(activeMapQuery!.params),
    enabled: !!selectedAnimeId && !!activeMapQuery,
    staleTime: 60_000,
    gcTime: MAP_CACHE_TIME_MS,
    retry: false,
  });

  const items = displayedItems;
  const clusterCount = items.filter((item) => item.type === 'cluster').length;
  const spotCount = items.filter((item) => item.type === 'spot').length;
  const isInitialMapLoading = isLoading && items.length === 0;
  const shouldShowEmptyFilteredMap =
    !!selectedAnimeId && !isInitialMapLoading && !isFetching && !isError && items.length === 0;

  useEffect(() => {
    if (!selectedAnimeId) {
      setDisplayedItems((current) => (current.length === 0 ? current : []));
      return;
    }
    if (selectedCluster && !clusterDetailQuery) {
      return;
    }
    if (data) {
      const nextItems = data.data ?? [];
      setDisplayedItems(nextItems);
      if (!clusterDetailQuery && clusterQuery) {
        setCachedClusterItems(nextItems);
      }
    }
  }, [clusterDetailQuery, clusterQuery, data, selectedAnimeId, selectedCluster]);

  useEffect(() => {
    const bounds = animeBoundsQuery.data?.data;
    if (!selectedAnimeId || !bounds || clusterQuery) {
      return;
    }

    const nextBounds = normalizeBounds(bounds);
    const nextRegion = boundsToRegion(nextBounds);
    const nextQuery = buildMapQuery(nextRegion, selectedAnimeId);
    setClusterQuery(nextQuery);
    setCachedClusterRegion(nextRegion);
    setRegion(nextRegion);
    ignoreRegionChangeUntilRef.current = Date.now() + 1000;
    mapRef.current?.fitToCoordinates(boundsToCoordinates(nextBounds), {
      edgePadding: CLUSTER_FIT_EDGE_PADDING,
      animated: true,
    });
  }, [animeBoundsQuery.data, clusterQuery, selectedAnimeId]);

  useEffect(() => {
    if (!isClusterDetailLoading || !clusterDetailCacheKey) {
      return;
    }
    if (spotCount > 0) {
      setIsClusterDetailLoading(false);
      setClusterDetailCacheKey(null);
      return;
    }
    if (!activeMapQuery || activeMapQuery.cacheKey !== clusterDetailCacheKey || isFetching) {
      return;
    }
    if (data || isError) {
      setIsClusterDetailLoading(false);
      setClusterDetailCacheKey(null);
    }
  }, [activeMapQuery, clusterDetailCacheKey, data, isClusterDetailLoading, isError, isFetching, spotCount]);

  useEffect(() => {
    if (!isError) {
      mapErrorNoticeShownRef.current = false;
      return;
    }

    if (items.length === 0 && !mapErrorNoticeShownRef.current) {
      mapErrorNoticeShownRef.current = true;
      showMapNotice('地图数据加载失败，请稍后重试');
    }
  }, [isError, items.length, showMapNotice]);

  useEffect(() => clearMapNotice, [clearMapNotice]);

  const handleRegionChangeComplete = useCallback((nextRegion: Region) => {
    if (Date.now() < ignoreRegionChangeUntilRef.current) {
      return;
    }
    setRegion((currentRegion) =>
      areRegionsClose(currentRegion, nextRegion) ? currentRegion : nextRegion
    );
  }, []);

  const handleClusterPress = useCallback(
    (item: MapSpotItem) => {
      ignoreRegionChangeUntilRef.current = Date.now() + 800;
      clearMapNotice();
      setSelectedSpot(null);
      setSelectedCluster(item);
    },
    [clearMapNotice]
  );

  const handleViewClusterSpots = useCallback(() => {
    if (!selectedCluster) {
      return;
    }
    const detailBounds = buildClusterDetailBounds(selectedCluster);
    const nextQuery = buildClusterDetailQuery(detailBounds, selectedAnimeId);
    const nextRegion = boundsToRegion(detailBounds);
    setSelectedSpot(null);
    setSelectedCluster(null);
    setIsClusterDetailLoading(true);
    setClusterDetailQuery(nextQuery);
    setClusterDetailCacheKey(nextQuery.cacheKey);
    setRegion(nextRegion);
    ignoreRegionChangeUntilRef.current = Date.now() + 1000;

    mapRef.current?.fitToCoordinates(boundsToCoordinates(detailBounds), {
      edgePadding: CLUSTER_FIT_EDGE_PADDING,
      animated: true,
    });
  }, [selectedAnimeId, selectedCluster]);

  // 一键返回原作品详情页。不能用 router.back()：地图在 Tab 导航器里，GO_BACK 会被
  // Tab 按「回到第一个标签」消费掉，落在发现页。navigate 会弹回栈中已存在的详情页
  // （保留其滚动/分页状态），栈里没有时才新开一页。
  const handleBackToAnime = useCallback(() => {
    if (!selectedAnimeId) {
      return;
    }
    router.navigate({
      pathname: '/anime/[id]',
      params: { id: String(selectedAnimeId) },
    });
  }, [router, selectedAnimeId]);

  const handleRestoreCluster = useCallback(() => {
    setSelectedSpot(null);
    setSelectedCluster(null);
    setIsClusterDetailLoading(false);
    setClusterDetailCacheKey(null);
    setClusterDetailQuery(null);
    setDisplayedItems(cachedClusterItems);

    if (cachedClusterRegion) {
      setRegion(cachedClusterRegion);
      ignoreRegionChangeUntilRef.current = Date.now() + 1000;
      mapRef.current?.fitToCoordinates(boundsToCoordinates(regionToBounds(cachedClusterRegion)), {
        edgePadding: CLUSTER_FIT_EDGE_PADDING,
        animated: true,
      });
    }
  }, [cachedClusterItems, cachedClusterRegion]);

  // 未选择作品：提示去发现页选作品，不显示地图标注
  if (!selectedAnimeId) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>还没有选择作品</Text>
        <Text style={styles.emptyHint}>
          前往发现页选择作品后，即可在地图上查看它的全部取景地
        </Text>
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.emptyBtn}
          onPress={() => router.push('/')}
        >
          <Text style={styles.emptyBtnText}>前往选择作品</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={DEFAULT_REGION}
        onRegionChangeComplete={handleRegionChangeComplete}
        onPress={() => {
          setSelectedSpot(null);
          setSelectedCluster(null);
        }}
        showsUserLocation={!!location}
        showsMyLocationButton={!!location}
      >
        {items.map((item, index) =>
          item.type === 'cluster' ? (
            <Marker
              key={`cluster-${item.latitude}-${item.longitude}-${item.count}-${index}`}
              coordinate={{ latitude: item.latitude, longitude: item.longitude }}
              onPress={() => handleClusterPress(item)}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={styles.clusterMarker}>
                <Text style={styles.clusterText}>{formatCount(item.count)}</Text>
              </View>
            </Marker>
          ) : (
            <Marker
              key={`spot-${item.id ?? index}`}
              coordinate={{ latitude: item.latitude, longitude: item.longitude }}
              onPress={() => setSelectedSpot(item)}
            >
              <View style={styles.spotDot} />
            </Marker>
          )
        )}
      </MapView>

      <View style={styles.headerPanel}>
        <Text style={styles.headerTitle}>取景地地图</Text>
        <Text style={styles.headerSubtitle} numberOfLines={1}>
          {`${selectedAnimeTitle} · ${clusterCount > 0 ? `${clusterCount} 个区域标注` : `${spotCount} 个取景地`}`}
          {isFetching && items.length === 0 ? ' · 更新中' : ''}
        </Text>
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.backToAnimeButton}
          onPress={handleBackToAnime}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Ionicons name="chevron-back" size={14} color={Colors.primary} />
          <Text style={styles.backToAnimeText}>返回作品详情</Text>
        </TouchableOpacity>
      </View>

      {mapNoticeText ? (
        <View style={styles.noticePanel}>
          <Text style={styles.noticeText}>{mapNoticeText}</Text>
        </View>
      ) : selectedCluster ? (
        <View style={styles.clusterActionPanel}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.clusterActionButton}
            onPress={handleViewClusterSpots}
          >
            <Text style={styles.clusterActionButtonText}>查看具体取景地</Text>
          </TouchableOpacity>
        </View>
      ) : clusterDetailQuery && !isClusterDetailLoading ? (
        <View style={styles.clusterActionPanel}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.clusterActionButton}
            onPress={handleRestoreCluster}
          >
            <Text style={styles.clusterActionButtonText}>恢复聚合</Text>
          </TouchableOpacity>
        </View>
      ) : shouldShowEmptyFilteredMap ? (
        <View style={styles.noticePanel}>
          <Text style={styles.noticeText}>该作品暂时没有可显示的取景地</Text>
        </View>
      ) : null}

      {isInitialMapLoading ? (
        <View style={styles.loadingBadge}>
          <ActivityIndicator size="small" color={Colors.white} />
          <Text style={styles.loadingBadgeText}>加载地图标注</Text>
        </View>
      ) : isClusterDetailLoading ? (
        <View style={styles.loadingBadge}>
          <ActivityIndicator size="small" color={Colors.white} />
          <Text style={styles.loadingBadgeText}>正在加载具体取景地</Text>
        </View>
      ) : null}

      {selectedSpot ? (
        <View style={styles.spotCardWrap}>
          <TouchableOpacity
            style={styles.spotCard}
            activeOpacity={0.9}
            onPress={() => selectedSpot.id && router.push(`/spot/${selectedSpot.id}`)}
          >
            <RemoteImage
              uri={getDisplayImageUrl(
                selectedSpot.id != null
                  ? spotInfoById.get(selectedSpot.id)?.animeImageUrl
                  : undefined
              )}
              style={styles.spotCardImage}
            />
            <View style={styles.spotCardBody}>
              <Text style={styles.spotCardTitle} numberOfLines={1}>
                {selectedSpot.name ?? '取景地'}
              </Text>
              {buildMapItemDescription(selectedSpot) ? (
                <Text style={styles.spotCardSub} numberOfLines={2}>
                  {buildMapItemDescription(selectedSpot)}
                </Text>
              ) : null}
              <Text style={styles.spotCardLink}>查看详情 ›</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.spotCardClose}
            onPress={() => setSelectedSpot(null)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.spotCardCloseText}>✕</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

function LoadingState({ text }: { text: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={Colors.primary} />
      <Text style={styles.stateText}>{text}</Text>
    </View>
  );
}

function MessageState({ text, error = false }: { text: string; error?: boolean }) {
  return (
    <View style={styles.center}>
      <Text style={[styles.stateText, error && styles.errorText]}>{text}</Text>
    </View>
  );
}

function buildMarkerDescription(spot: Spot) {
  const pieces = [spot.animeTitle, getSceneText(spot), spot.origin].filter(Boolean);
  return pieces.join(' · ');
}

function buildMapItemDescription(item: MapSpotItem) {
  return [item.animeTitle, item.sceneTime, item.origin].filter(Boolean).join(' · ');
}

function buildMapQuery(region: Region, animeId?: number) {
  const bounds = regionToBounds(region);
  const zoom = estimateZoom(region);
  const queryZoom = roundZoomForQuery(zoom);
  const queryBounds = expandBoundsToGrid(bounds, getViewportGridSize(queryZoom));
  const params = {
    ...queryBounds,
    zoom: queryZoom,
    limit: MAP_QUERY_LIMIT,
    ...(animeId ? { animeId } : {}),
  };
  const cacheKey = [
    queryBounds.minLat,
    queryBounds.maxLat,
    queryBounds.minLng,
    queryBounds.maxLng,
    queryZoom,
    animeId ?? 'all',
  ].join(':');

  return { params, cacheKey };
}

function buildClusterDetailQuery(bounds: ReturnType<typeof regionToBounds>, animeId?: number) {
  const queryBounds = normalizeBounds(bounds);
  const params = {
    ...queryBounds,
    zoom: CLUSTER_DETAIL_ZOOM,
    limit: MAP_QUERY_LIMIT,
    ...(animeId ? { animeId } : {}),
  };
  const cacheKey = [
    'cluster-detail',
    queryBounds.minLat,
    queryBounds.maxLat,
    queryBounds.minLng,
    queryBounds.maxLng,
    CLUSTER_DETAIL_ZOOM,
    animeId ?? 'all',
  ].join(':');

  return { params, cacheKey };
}

function buildClusterDetailBounds(cluster: MapSpotItem) {
  if (
    isFiniteNumber(cluster.minLat) &&
    isFiniteNumber(cluster.maxLat) &&
    isFiniteNumber(cluster.minLng) &&
    isFiniteNumber(cluster.maxLng)
  ) {
    return normalizeBounds({
      minLat: cluster.minLat,
      maxLat: cluster.maxLat,
      minLng: cluster.minLng,
      maxLng: cluster.maxLng,
    });
  }

  return normalizeBounds(regionToBounds(buildRegion(
    cluster.latitude,
    cluster.longitude,
    CLUSTER_DETAIL_FALLBACK_DELTA
  )));
}

function normalizeBounds(bounds: ReturnType<typeof regionToBounds>) {
  let minLat = Math.min(bounds.minLat, bounds.maxLat);
  let maxLat = Math.max(bounds.minLat, bounds.maxLat);
  let minLng = Math.min(bounds.minLng, bounds.maxLng);
  let maxLng = Math.max(bounds.minLng, bounds.maxLng);
  const minSpan = 0.006;

  if (maxLat - minLat < minSpan) {
    const center = (minLat + maxLat) / 2;
    minLat = center - minSpan / 2;
    maxLat = center + minSpan / 2;
  }

  if (maxLng - minLng < minSpan) {
    const center = (minLng + maxLng) / 2;
    minLng = center - minSpan / 2;
    maxLng = center + minSpan / 2;
  }

  return {
    minLat: roundCoordinate(clamp(minLat, -90, 90)),
    maxLat: roundCoordinate(clamp(maxLat, -90, 90)),
    minLng: roundCoordinate(clamp(minLng, -180, 180)),
    maxLng: roundCoordinate(clamp(maxLng, -180, 180)),
  };
}

function boundsToRegion(bounds: ReturnType<typeof regionToBounds>): Region {
  const normalized = normalizeBounds(bounds);
  const latitudeDelta = Math.max(normalized.maxLat - normalized.minLat, 0.01);
  const longitudeDelta = Math.max(normalized.maxLng - normalized.minLng, 0.01);
  return {
    latitude: (normalized.minLat + normalized.maxLat) / 2,
    longitude: (normalized.minLng + normalized.maxLng) / 2,
    latitudeDelta,
    longitudeDelta,
  };
}

function boundsToCoordinates(bounds: ReturnType<typeof regionToBounds>) {
  const normalized = normalizeBounds(bounds);
  return [
    { latitude: normalized.minLat, longitude: normalized.minLng },
    { latitude: normalized.minLat, longitude: normalized.maxLng },
    { latitude: normalized.maxLat, longitude: normalized.minLng },
    { latitude: normalized.maxLat, longitude: normalized.maxLng },
  ];
}

function regionToBounds(region: Region) {
  const halfLat = region.latitudeDelta / 2;
  const halfLng = region.longitudeDelta / 2;
  return {
    minLat: clamp(region.latitude - halfLat, -90, 90),
    maxLat: clamp(region.latitude + halfLat, -90, 90),
    minLng: clamp(region.longitude - halfLng, -180, 180),
    maxLng: clamp(region.longitude + halfLng, -180, 180),
  };
}

function estimateZoom(region: Region) {
  return Math.log2(360 / Math.max(region.longitudeDelta, 0.0001));
}

function expandBoundsToGrid(bounds: ReturnType<typeof regionToBounds>, gridSize: number) {
  return {
    minLat: floorToGrid(bounds.minLat, gridSize),
    maxLat: ceilToGrid(bounds.maxLat, gridSize),
    minLng: floorToGrid(bounds.minLng, gridSize),
    maxLng: ceilToGrid(bounds.maxLng, gridSize),
  };
}

function getViewportGridSize(zoom: number) {
  if (zoom < 6) {
    return 1;
  }
  if (zoom < 9) {
    return 0.25;
  }
  if (zoom < 12) {
    return 0.05;
  }
  return 0.01;
}

function roundZoomForQuery(zoom: number) {
  return Math.round(zoom * 10) / 10;
}

function floorToGrid(value: number, gridSize: number) {
  return roundCoordinate(Math.floor(value / gridSize) * gridSize);
}

function ceilToGrid(value: number, gridSize: number) {
  return roundCoordinate(Math.ceil(value / gridSize) * gridSize);
}

function roundCoordinate(value: number) {
  return Math.round(value * 10000) / 10000;
}

function areRegionsClose(a: Region, b: Region) {
  return (
    Math.abs(a.latitude - b.latitude) < 0.0005 &&
    Math.abs(a.longitude - b.longitude) < 0.0005 &&
    Math.abs(a.latitudeDelta - b.latitudeDelta) < 0.0005 &&
    Math.abs(a.longitudeDelta - b.longitudeDelta) < 0.0005
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function formatCount(count: number) {
  if (count >= 1000) {
    return `${Math.round(count / 100) / 10}k`;
  }
  return String(count);
}

async function openNavigation(spot: Spot) {
  const label = encodeURIComponent(spot.name || 'Spot');
  const destination = `${spot.latitude},${spot.longitude}`;
  const nativeUrl = Platform.select({
    ios: `http://maps.apple.com/?daddr=${destination}&q=${label}`,
    android: `geo:0,0?q=${destination}(${label})`,
    default: `https://www.google.com/maps/dir/?api=1&destination=${destination}`,
  });
  const fallbackUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;

  if (nativeUrl && (await Linking.canOpenURL(nativeUrl))) {
    await Linking.openURL(nativeUrl);
    return;
  }

  await Linking.openURL(fallbackUrl);
}

function getSceneText(spot: Spot) {
  if (spot.episodeNumber && spot.sceneTime) {
    return `第${spot.episodeNumber}集 · ${spot.sceneTime}`;
  }

  if (spot.episodeNumber) {
    return `第${spot.episodeNumber}集`;
  }

  if (spot.sceneTime) {
    return spot.sceneTime;
  }

  return spot.episode;
}

function isValidCoordinate(spot: Spot) {
  return Number.isFinite(spot.latitude) && Number.isFinite(spot.longitude);
}

function buildRegion(latitude: number, longitude: number, delta: number): Region {
  return {
    latitude,
    longitude,
    latitudeDelta: delta,
    longitudeDelta: delta,
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  clusterMarker: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderWidth: 2,
    borderColor: Colors.white,
    paddingHorizontal: Spacing.xs,
  },
  clusterText: {
    color: Colors.white,
    fontSize: FontSize.xs,
    fontWeight: '800',
  },
  spotDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  spotCardWrap: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    bottom: Spacing.lg,
  },
  spotCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  spotCardImage: {
    width: 96,
    height: 96,
    backgroundColor: Colors.surface,
  },
  spotCardBody: {
    flex: 1,
    padding: Spacing.md,
    justifyContent: 'center',
    gap: 4,
  },
  spotCardTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text,
  },
  spotCardSub: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  spotCardLink: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  spotCardClose: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spotCardCloseText: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: '700',
    lineHeight: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xxl,
    gap: Spacing.md,
  },
  stateText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  errorText: {
    color: Colors.error,
  },
  headerPanel: {
    position: 'absolute',
    left: Spacing.lg,
    // 右侧留白，避开右上角的「定位到我」按钮
    right: 64,
    top: Spacing.lg,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    padding: Spacing.md,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    color: Colors.text,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  backToAnimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: Spacing.sm,
    paddingVertical: 4,
    paddingLeft: 4,
    paddingRight: Spacing.sm,
    borderRadius: 999,
    backgroundColor: Colors.surface,
  },
  backToAnimeText: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: '700',
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    color: Colors.text,
    fontWeight: '800',
  },
  emptyHint: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  emptyBtn: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    borderRadius: 999,
  },
  emptyBtnText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  navigateButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm,
  },
  navigateButtonText: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  noticePanel: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    top: 96,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    padding: Spacing.md,
  },
  noticeText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  clusterActionPanel: {
    position: 'absolute',
    left: 92,
    right: 92,
    bottom: 112,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    padding: 4,
  },
  clusterActionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
  },
  clusterActionButtonText: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  loadingBadge: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    top: 96,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderRadius: 999,
    backgroundColor: Colors.overlay,
    paddingVertical: Spacing.sm,
  },
  loadingBadgeText: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
});
