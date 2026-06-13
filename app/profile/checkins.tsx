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
import {
  getMyCheckIns,
  toggleLike,
  deleteCheckIn,
  setCheckInVisibility,
} from '@/api/checkin';
import { CheckInCard } from '@/components/CheckInCard';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import type { CheckIn } from '@/types';

export default function MyCheckInsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading, isFetching, refetch, isError } = useQuery({
    queryKey: ['myCheckIns'],
    queryFn: () => getMyCheckIns({ page: 1, size: 50 }),
    staleTime: 30_000,
  });

  const checkIns: CheckIn[] = data?.data ?? [];

  function invalidateLists() {
    queryClient.invalidateQueries({ queryKey: ['myCheckIns'] });
    queryClient.invalidateQueries({ queryKey: ['checkInFeed'] });
  }

  async function handleLike(id: number) {
    await toggleLike(id);
    invalidateLists();
  }

  function handleDelete(id: number) {
    Alert.alert('删除打卡', '删除后无法恢复，确定删除这条打卡吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCheckIn(id);
            invalidateLists();
          } catch (e: any) {
            Alert.alert('删除失败', e?.message ?? '请稍后重试');
          }
        },
      },
    ]);
  }

  async function handleToggleVisibility(item: CheckIn) {
    const next = item.isPublic === false;
    try {
      await setCheckInVisibility(item.id, next);
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
      data={checkIns}
      keyExtractor={(item) => item.id.toString()}
      renderItem={({ item }) => (
        <CheckInCard
          item={item}
          onLike={handleLike}
          onDelete={handleDelete}
          onToggleVisibility={handleToggleVisibility}
        />
      )}
      contentContainerStyle={checkIns.length === 0 ? styles.emptyContainer : styles.list}
      showsVerticalScrollIndicator={false}
      refreshing={isFetching && checkIns.length > 0}
      onRefresh={refetch}
      ListEmptyComponent={
        <View style={styles.center}>
          <View style={styles.emptyIcon}>
            <Ionicons name="camera-outline" size={40} color={Colors.primary} />
          </View>
          <Text style={styles.emptyText}>
            {isError ? '加载失败' : '还没有打卡记录'}
          </Text>
          <Text style={styles.emptyHint}>
            {isError ? '请检查网络或登录状态后重试' : '去取景地拍下第一张对比照吧！'}
          </Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => (isError ? refetch() : router.push('/checkin'))}
            activeOpacity={0.85}
          >
            <Text style={styles.emptyBtnText}>{isError ? '重试' : '去打卡'}</Text>
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
    padding: Spacing.md,
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
