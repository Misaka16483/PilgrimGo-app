import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getMyRoutes, deleteRoute, setRouteVisibility } from '@/api/route';
import { RouteCard } from '@/components/RouteCard';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import type { PilgrimRoute } from '@/types';

export default function MyRoutesScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading, isFetching, refetch, isError } = useQuery({
    queryKey: ['myRoutes'],
    queryFn: () => getMyRoutes({ page: 0, size: 50 }),
    staleTime: 30_000,
  });

  const routes: PilgrimRoute[] = data?.data?.content ?? [];

  function invalidateLists() {
    queryClient.invalidateQueries({ queryKey: ['myRoutes'] });
    queryClient.invalidateQueries({ queryKey: ['animeRoutes'] });
  }

  function handleDelete(route: PilgrimRoute) {
    Alert.alert('删除路径', `删除后无法恢复，确定删除「${route.title}」吗？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteRoute(route.id);
            invalidateLists();
          } catch (e: any) {
            Alert.alert('删除失败', e?.message ?? '请稍后重试');
          }
        },
      },
    ]);
  }

  async function handleToggleVisibility(route: PilgrimRoute) {
    const next = route.isPublic === false;
    try {
      await setRouteVisibility(route.id, next);
      invalidateLists();
    } catch (e: any) {
      Alert.alert('设置失败', e?.message ?? '请稍后重试');
    }
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={routes}
      keyExtractor={(item) => item.id.toString()}
      renderItem={({ item }) => (
        <RouteCard
          route={item}
          onPress={() => router.push(`/route/${item.id}`)}
          onDelete={handleDelete}
          onToggleVisibility={handleToggleVisibility}
        />
      )}
      contentContainerStyle={routes.length === 0 ? styles.emptyContainer : styles.list}
      showsVerticalScrollIndicator={false}
      refreshing={isFetching && routes.length > 0}
      onRefresh={refetch}
      ListEmptyComponent={
        <View style={styles.center}>
          <View style={styles.emptyIcon}>
            <Ionicons name="map-outline" size={40} color={Colors.primary} />
          </View>
          <Text style={styles.emptyText}>
            {isError ? '加载失败' : '还没有发布路径'}
          </Text>
          <Text style={styles.emptyHint}>
            {isError ? '请检查网络或登录状态后重试' : '去录制一条专属巡礼路径吧！'}
          </Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => (isError ? refetch() : router.push('/record'))}
            activeOpacity={0.85}
          >
            <Text style={styles.emptyBtnText}>{isError ? '重试' : '去录制'}</Text>
          </TouchableOpacity>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  list: {
    padding: Spacing.lg,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingTop: 80,
  },
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#FFECEC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  emptyHint: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  emptyBtn: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xxxl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    elevation: 2,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  emptyBtnText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
});
