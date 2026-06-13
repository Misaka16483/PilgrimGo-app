import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getAnimeDetail, getAnimeSpots, getExternalAnimeDetail, getExternalAnimeSpots, syncExternalAnime } from '@/api/anime';
import { getRoutesByAnime } from '@/api/route';
import { Button } from '@/components/Button';
import { RemoteImage } from '@/components/RemoteImage';
import { RouteCard } from '@/components/RouteCard';
import { BorderRadius, Colors, FontSize, Spacing } from '@/constants/theme';
import { getDisplayImageUrl } from '@/utils/image';

type RouteSort = 'rating' | 'newest';

/** 顶部取景地横条一次性拉这么多，再多就让用户去单独的列表页（暂未实现）。 */
const SPOT_STRIP_SIZE = 12;

export default function AnimeDetailScreen() {
  const { id, externalOnly } = useLocalSearchParams<{ id: string; externalOnly?: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const animeId = Number(id);
  const isExternalOnly = externalOnly === '1';
  const [sort, setSort] = useState<RouteSort>('rating');
  const [spotPage, setSpotPage] = useState(0);

  useEffect(() => {
    setSpotPage(0);
  }, [animeId]);

  const animeQuery = useQuery({
    queryKey: [isExternalOnly ? 'externalAnime' : 'anime', animeId],
    queryFn: () => (isExternalOnly ? getExternalAnimeDetail(animeId) : getAnimeDetail(animeId)),
    enabled: Number.isFinite(animeId) && animeId > 0,
  });

  const spotsQuery = useQuery({
    queryKey: [isExternalOnly ? 'externalAnimeSpots' : 'animeSpots', animeId, 'strip', spotPage],
    queryFn: () => isExternalOnly
      ? getExternalAnimeSpots(animeId, { page: spotPage, size: SPOT_STRIP_SIZE })
      : getAnimeSpots(animeId, { page: spotPage, size: SPOT_STRIP_SIZE, sync: false }),
    enabled: Number.isFinite(animeId) && animeId > 0,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  });

  const routesQuery = useQuery({
    queryKey: ['animeRoutes', animeId, sort],
    queryFn: () => getRoutesByAnime(animeId, { sort }),
    enabled: !isExternalOnly && Number.isFinite(animeId) && animeId > 0,
  });

  const anime = animeQuery.data?.data;
  const spotsPage = spotsQuery.data?.data;
  const spots = spotsPage?.content ?? [];
  const isSpotPageReady = Boolean(spotsPage);
  const totalSpots = spotsPage?.totalElements;
  const totalSpotPages = spotsPage?.totalPages ?? 0;
  const hasPrevSpotPage = spotPage > 0;
  const hasNextSpotPage = spotsPage ? !spotsPage.last : false;
  const routes = routesQuery.data?.data?.content ?? [];
  const totalRoutes = routesQuery.data?.data?.totalElements ?? routes.length;
  const coverUrl = getDisplayImageUrl(anime?.coverUrl);

  const isInitialLoading = animeQuery.isLoading && !anime;

  useEffect(() => {
    if (!Number.isFinite(animeId) || animeId <= 0 || !spotsPage || spotsPage.last) {
      return;
    }
    queryClient.prefetchQuery({
      queryKey: [isExternalOnly ? 'externalAnimeSpots' : 'animeSpots', animeId, 'strip', spotPage + 1],
      queryFn: () => isExternalOnly
        ? getExternalAnimeSpots(animeId, { page: spotPage + 1, size: SPOT_STRIP_SIZE })
        : getAnimeSpots(animeId, { page: spotPage + 1, size: SPOT_STRIP_SIZE, sync: false }),
      staleTime: 5 * 60_000,
      gcTime: 10 * 60_000,
    });
  }, [animeId, isExternalOnly, queryClient, spotPage, spotsPage]);

  const metaText = useMemo(() => {
    const pieces: string[] = [];
    if (anime?.region) pieces.push(`城市：${anime.region}`);
    if (typeof totalSpots === 'number') pieces.push(`取景地：${totalSpots}`);
    return pieces.join('  ·  ');
  }, [anime?.region, totalSpots]);

  const goRecord = useCallback(
    () => router.push({ pathname: '/record', params: { animeId: String(animeId) } }),
    [animeId, router]
  );

  const syncMutation = useMutation({
    mutationFn: () => syncExternalAnime(animeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cachedAnimeOptions'] });
      queryClient.invalidateQueries({ queryKey: ['anime', animeId] });
      queryClient.invalidateQueries({ queryKey: ['animeSpots', animeId] });
      queryClient.invalidateQueries({ queryKey: ['animeRoutes', animeId] });
      // 收录完成，按本地作品重新打开本页
      router.replace(`/anime/${animeId}?cachedOnly=1`);
    },
    onError: (error: Error) => {
      const message = error.message || '收录失败，请稍后重试';
      if (message.includes('未登录')) {
        Alert.alert('需要登录', '登录后才能收录作品到巡礼+', [
          { text: '取消', style: 'cancel' },
          { text: '去登录', onPress: () => router.push('/auth/login') },
        ]);
        return;
      }
      Alert.alert('收录失败', message);
    },
  });

  const handleRefresh = useCallback(() => {
    animeQuery.refetch();
    spotsQuery.refetch();
    routesQuery.refetch();
  }, [animeQuery, spotsQuery, routesQuery]);

  const goPrevSpotPage = useCallback(() => {
    setSpotPage((page) => Math.max(0, page - 1));
  }, []);

  const goNextSpotPage = useCallback(() => {
    setSpotPage((page) => page + 1);
  }, []);

  if (!Number.isFinite(animeId) || animeId <= 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.stateText}>作品编号无效</Text>
      </View>
    );
  }

  if (isInitialLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.stateText}>正在加载作品详情...</Text>
      </View>
    );
  }

  if (!anime) {
    return (
      <View style={styles.center}>
        <Text style={styles.stateText}>作品详情加载失败，请稍后重试</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={routes}
      keyExtractor={(item) => item.id.toString()}
      renderItem={({ item }) => (
        <View style={styles.routeItem}>
          <RouteCard route={item} onPress={() => router.push(`/route/${item.id}`)} />
        </View>
      )}
      contentContainerStyle={styles.listContent}
      refreshing={
        animeQuery.isFetching || spotsQuery.isFetching || routesQuery.isFetching
      }
      onRefresh={handleRefresh}
      ListHeaderComponent={
        <>
          <RemoteImage uri={coverUrl} style={styles.cover} />

          <View style={styles.headerSection}>
            <Text style={styles.title}>{anime.title}</Text>
            {anime.titleJp ? <Text style={styles.titleJp}>{anime.titleJp}</Text> : null}
            {metaText ? <Text style={styles.metaText}>{metaText}</Text> : null}
          </View>

          {/* 取景地横向小条 */}
          <View style={styles.spotsSection}>
            <View style={styles.spotsHeader}>
              <Text style={styles.sectionTitle}>
                {typeof totalSpots === 'number' ? `取景地（${totalSpots}）` : '取景地'}
              </Text>
              <View style={styles.spotHeaderActions}>
                {!isExternalOnly && isSpotPageReady && typeof totalSpots === 'number' && totalSpots > 0 ? (
                  <TouchableOpacity
                    style={styles.mapLinkBtn}
                    activeOpacity={0.8}
                    onPress={() =>
                      router.push({
                        pathname: '/map',
                        params: { animeId: String(animeId), animeTitle: anime.title },
                      })
                    }
                  >
                    <Text style={styles.mapLinkBtnText}>在地图查看全部</Text>
                  </TouchableOpacity>
                ) : null}
                {isSpotPageReady && typeof totalSpots === 'number' && totalSpots > SPOT_STRIP_SIZE ? (
                  <View style={styles.spotPager}>
                  <TouchableOpacity
                    onPress={goPrevSpotPage}
                    disabled={!hasPrevSpotPage || spotsQuery.isFetching}
                    style={[
                      styles.spotPagerBtn,
                      (!hasPrevSpotPage || spotsQuery.isFetching) && styles.spotPagerBtnDisabled,
                    ]}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="chevron-back" size={18} color={hasPrevSpotPage && !spotsQuery.isFetching ? Colors.text : Colors.textLight} />
                  </TouchableOpacity>
                  <Text style={styles.spotPagerText}>
                    {spotPage + 1}/{Math.max(totalSpotPages, 1)}
                  </Text>
                  <TouchableOpacity
                    onPress={goNextSpotPage}
                    disabled={!hasNextSpotPage || spotsQuery.isFetching}
                    style={[
                      styles.spotPagerBtn,
                      (!hasNextSpotPage || spotsQuery.isFetching) && styles.spotPagerBtnDisabled,
                    ]}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="chevron-forward" size={18} color={hasNextSpotPage && !spotsQuery.isFetching ? Colors.text : Colors.textLight} />
                  </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            </View>

            {spotsQuery.isLoading ? (
              <ActivityIndicator color={Colors.primary} style={styles.spotsLoading} />
            ) : spots.length === 0 ? (
              <Text style={styles.spotsEmpty}>
                {spotsQuery.isError ? '取景地加载失败，请下拉重试' : '暂时还没有取景地数据'}
              </Text>
            ) : (
              <FlatList
                horizontal
                data={spots}
                keyExtractor={(item) => item.id.toString()}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.spotsStripContent}
                renderItem={({ item }) => {
                  const imageUrl = getDisplayImageUrl(item.animeImageUrl);
                  return (
                    <TouchableOpacity
                      style={styles.spotCard}
                      onPress={() => {
                        if (!isExternalOnly) {
                          router.push(`/spot/${item.id}`);
                        }
                      }}
                      activeOpacity={0.85}
                    >
                      <RemoteImage uri={imageUrl} style={styles.spotImage} />
                      <Text style={styles.spotName} numberOfLines={2}>
                        {item.name}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>

          {/* 巡礼路径标题 + 排序 */}
          {!isExternalOnly ? (
          <View style={styles.routesHeaderBlock}>
            <View style={styles.routesHeader}>
              <Text style={styles.sectionTitle}>巡礼路径（{totalRoutes}）</Text>
              <View style={styles.sortTabs}>
                <SortTab
                  label="评分高"
                  active={sort === 'rating'}
                  onPress={() => setSort('rating')}
                />
                <SortTab
                  label="最新"
                  active={sort === 'newest'}
                  onPress={() => setSort('newest')}
                />
              </View>
            </View>
          </View>
          ) : (
          <View style={styles.externalNoticeBlock}>
            <Text style={styles.externalNoticeText}>
              该作品尚未收录，收录后即可在地图查看取景地、录制和浏览巡礼路线
            </Text>
            <Button
              title="一键收录到巡礼+"
              loading={syncMutation.isPending}
              onPress={() => syncMutation.mutate()}
              style={styles.externalSyncBtn}
            />
          </View>
          )}
        </>
      }
      ListEmptyComponent={
        isExternalOnly ? null : routesQuery.isLoading ? (
          <ActivityIndicator color={Colors.primary} style={styles.routesLoading} />
        ) : (
          <View style={styles.routesEmpty}>
            <Text style={styles.routesEmptyText}>
              还没有玩家上传过这部作品的巡礼路径
            </Text>
            <Text style={styles.routesEmptySub}>来录制第一条，让其他人跟随你的脚步</Text>
            <Button
              title="录制此作品路径"
              onPress={goRecord}
              style={styles.routesEmptyBtn}
            />
          </View>
        )
      }
      ListFooterComponent={
        !isExternalOnly && routes.length > 0 ? (
          <View style={styles.routesFooterCta}>
            <Button title="录制我的版本" variant="outline" onPress={goRecord} />
          </View>
        ) : null
      }
    />
  );
}

function SortTab({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.sortTab, active && styles.sortTabActive]}
      activeOpacity={0.7}
    >
      <Text style={[styles.sortTabText, active && styles.sortTabTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  stateText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: Spacing.xxxl,
  },
  cover: {
    width: '100%',
    height: 240,
    backgroundColor: Colors.surface,
  },
  headerSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.xs,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.text,
  },
  titleJp: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  metaText: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: '600',
    marginTop: Spacing.xs,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  spotsSection: {
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  spotsHeader: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.md,
  },
  spotHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  mapLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  mapLinkBtnText: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: '700',
  },
  spotPager: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  spotPagerBtn: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  spotPagerBtnDisabled: {
    opacity: 0.45,
  },
  spotPagerText: {
    minWidth: 42,
    textAlign: 'center',
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  spotsLoading: {
    marginVertical: Spacing.lg,
  },
  spotsEmpty: {
    paddingHorizontal: Spacing.lg,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  spotsStripContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  spotCard: {
    width: 132,
  },
  spotImage: {
    width: 132,
    height: 88,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.border,
  },
  spotName: {
    marginTop: Spacing.xs,
    fontSize: FontSize.sm,
    color: Colors.text,
    fontWeight: '600',
  },
  routesHeaderBlock: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  externalNoticeBlock: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  externalNoticeText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    textAlign: 'center',
  },
  externalSyncBtn: {
    marginTop: Spacing.md,
  },
  routesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sortTabs: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.full,
    padding: 2,
  },
  sortTab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  sortTabActive: {
    backgroundColor: Colors.primary,
  },
  sortTabText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  sortTabTextActive: {
    color: Colors.white,
  },
  routeItem: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.md,
  },
  routesLoading: {
    marginVertical: Spacing.xl,
  },
  routesEmpty: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
  },
  routesEmptyText: {
    textAlign: 'center',
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  routesEmptySub: {
    textAlign: 'center',
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    marginTop: Spacing.sm,
  },
  routesEmptyBtn: {
    marginTop: Spacing.lg,
    minWidth: 200,
  },
  routesFooterCta: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
});
