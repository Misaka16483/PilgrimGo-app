import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getFeed, toggleLike } from '@/api/checkin';
import { CheckInCard } from '@/components/CheckInCard';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import type { CheckIn } from '@/types';
import { useCurrentLocation } from '@/hooks/useLocation';

type SortMode = 'time' | 'distance';

const SORT_TABS: { key: SortMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'time', label: '最新', icon: 'time-outline' },
  { key: 'distance', label: '附近', icon: 'navigate-outline' },
];

export default function CheckInFeedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [sort, setSort] = useState<SortMode>('time');
  const { location } = useCurrentLocation();

  const userLat = sort === 'distance' ? location?.latitude : undefined;
  const userLon = sort === 'distance' ? location?.longitude : undefined;

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['checkInFeed', sort, userLat, userLon],
    queryFn: () => getFeed({ page: 1, size: 20, sort, userLat, userLon }),
    staleTime: 30_000,
  });

  const feedList: CheckIn[] = data?.data ?? [];

  async function handleLike(id: number) {
    await toggleLike(id);
    queryClient.invalidateQueries({ queryKey: ['checkInFeed'] });
  }

  return (
    <View style={styles.container}>
      {/* 顶部栏 */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <View>
          <Text style={styles.headerTitle}>打卡广场</Text>
          <Text style={styles.headerSubtitle}>分享你的巡礼瞬间</Text>
        </View>

        {/* 排序分段控件 */}
        <View style={styles.segment}>
          {SORT_TABS.map((tab) => {
            const active = sort === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.segmentItem, active && styles.segmentItemActive]}
                onPress={() => setSort(tab.key)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={tab.icon}
                  size={14}
                  color={active ? Colors.primary : Colors.textSecondary}
                />
                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={feedList}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => <CheckInCard item={item} onLike={handleLike} />}
          contentContainerStyle={feedList.length === 0 ? styles.emptyContainer : styles.list}
          showsVerticalScrollIndicator={false}
          refreshing={isFetching && feedList.length > 0}
          onRefresh={refetch}
          ListEmptyComponent={
            <View style={styles.center}>
              <View style={styles.emptyIcon}>
                <Ionicons name="camera-outline" size={40} color={Colors.primary} />
              </View>
              <Text style={styles.emptyText}>还没有打卡记录</Text>
              <Text style={styles.emptyHint}>来发布第一条打卡吧！</Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => router.push('/checkin/create')}
                activeOpacity={0.85}
              >
                <Text style={styles.emptyBtnText}>立即打卡</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* 悬浮发布按钮 */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/checkin/create')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={30} color={Colors.white} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
    gap: Spacing.md,
    elevation: 2,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  headerTitle: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  segment: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.full,
    padding: 3,
    gap: 2,
  },
  segmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
  },
  segmentItemActive: {
    backgroundColor: Colors.white,
    elevation: 1,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  segmentText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: Colors.primary,
  },
  list: {
    padding: Spacing.md,
    paddingBottom: 96,
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
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: Spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
});
