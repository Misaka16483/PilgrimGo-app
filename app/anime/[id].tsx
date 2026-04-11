import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getAnimeDetail, getAnimeSpots } from '@/api/anime';
import { getRoutesByAnime } from '@/api/route';
import { RouteCard } from '@/components/RouteCard';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';

export default function AnimeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const animeId = Number(id);

  const { data: animeData } = useQuery({
    queryKey: ['anime', animeId],
    queryFn: () => getAnimeDetail(animeId),
  });

  const { data: spotsData } = useQuery({
    queryKey: ['animeSpots', animeId],
    queryFn: () => getAnimeSpots(animeId),
  });

  const { data: routesData, isLoading: routesLoading } = useQuery({
    queryKey: ['animeRoutes', animeId],
    queryFn: () => getRoutesByAnime(animeId, { sort: 'rating' }),
  });

  const anime = animeData?.data;
  const spots = spotsData?.data ?? [];
  const routes = routesData?.data?.content ?? [];

  return (
    <FlatList
      style={styles.container}
      data={routes}
      keyExtractor={(item) => item.id.toString()}
      renderItem={({ item }) => (
        <RouteCard
          route={item}
          onPress={() => router.push(`/route/${item.id}`)}
        />
      )}
      ListHeaderComponent={
        <>
          {/* 作品封面 */}
          {anime && (
            <Image source={{ uri: anime.coverUrl }} style={styles.cover} />
          )}

          {/* 作品信息 */}
          <View style={styles.section}>
            <Text style={styles.title}>{anime?.title}</Text>
            {anime?.titleJp && (
              <Text style={styles.titleJp}>{anime.titleJp}</Text>
            )}
          </View>

          {/* 取景地列表 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              取景地 ({spots.length})
            </Text>
            <FlatList
              horizontal
              data={spots}
              keyExtractor={(item) => item.id.toString()}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.spotCard}
                  onPress={() => router.push(`/spot/${item.id}`)}
                >
                  <Image
                    source={{ uri: item.animeImageUrl }}
                    style={styles.spotImage}
                  />
                  <Text style={styles.spotName} numberOfLines={1}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>

          {/* 巡礼路径标题 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              巡礼路径 ({routes.length})
            </Text>
          </View>
        </>
      }
      ListEmptyComponent={
        routesLoading ? (
          <ActivityIndicator
            size="large"
            color={Colors.primary}
            style={{ marginTop: 40 }}
          />
        ) : (
          <Text style={styles.emptyText}>
            暂无巡礼路径，去录制第一条吧！
          </Text>
        )
      }
      contentContainerStyle={styles.listContent}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  listContent: {
    paddingBottom: Spacing.xxxl,
  },
  cover: {
    width: '100%',
    height: 220,
    backgroundColor: Colors.surface,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.text,
  },
  titleJp: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  spotCard: {
    width: 120,
    marginRight: Spacing.md,
  },
  spotImage: {
    width: 120,
    height: 80,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
  },
  spotName: {
    fontSize: FontSize.sm,
    color: Colors.text,
    marginTop: Spacing.xs,
  },
  emptyText: {
    textAlign: 'center',
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    marginTop: 40,
  },
});
