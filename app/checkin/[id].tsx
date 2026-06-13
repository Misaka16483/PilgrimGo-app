import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { toggleLike } from '@/api/checkin';
import { ImageViewerModal } from '@/components/ImageViewerModal';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import type { ApiResponse, CheckIn } from '@/types';

/** 打卡无单条详情接口，从已缓存的列表（打卡广场 / 我的打卡）里按 id 取该打卡 */
function findInCache(
  qc: ReturnType<typeof useQueryClient>,
  id: number
): CheckIn | undefined {
  for (const key of ['checkInFeed', 'myCheckIns']) {
    const entries = qc.getQueriesData<ApiResponse<CheckIn[]>>({ queryKey: [key] });
    for (const [, data] of entries) {
      const found = data?.data?.find((c) => c.id === id);
      if (found) {
        return found;
      }
    }
  }
  return undefined;
}

export default function CheckInDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const checkInId = Number(id);

  const [item] = useState<CheckIn | undefined>(() => findInCache(qc, checkInId));
  const [liked, setLiked] = useState<boolean>(item?.liked ?? false);
  const [likeCount, setLikeCount] = useState<number>(item?.likeCount ?? 0);
  const [viewerUri, setViewerUri] = useState<string | null>(null);

  if (!item) {
    return (
      <View style={styles.center}>
        <Ionicons name="image-outline" size={48} color={Colors.textLight} />
        <Text style={styles.missing}>打卡内容已不可用</Text>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.backLink}>返回</Text>
        </TouchableOpacity>
      </View>
    );
  }

  async function handleLike() {
    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikeCount((c) => c + (nextLiked ? 1 : -1));
    try {
      const res = await toggleLike(item!.id);
      if (res?.data) {
        setLiked(res.data.liked);
        setLikeCount(res.data.likeCount);
      }
      qc.invalidateQueries({ queryKey: ['checkInFeed'] });
    } catch {
      // 回滚
      setLiked(liked);
      setLikeCount((c) => c + (nextLiked ? -1 : 1));
    }
  }

  const spotLabel = item.spotNameCn || item.spotName;
  const initial = (item.username || '?').trim().charAt(0).toUpperCase();
  const timeText = item.createdAt.slice(0, 16).replace('T', ' ');

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* 作者 */}
        <View style={styles.author}>
          {item.avatarUrl ? (
            <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
          )}
          <View style={styles.authorText}>
            <Text style={styles.nickname}>{item.username}</Text>
            <Text style={styles.date}>{timeText}</Text>
          </View>
        </View>

        {/* 取景地 */}
        <TouchableOpacity
          style={styles.spotChip}
          activeOpacity={0.7}
          onPress={() => router.push(`/spot/${item.spotId}`)}
        >
          <Ionicons name="location-sharp" size={16} color={Colors.primary} />
          <Text style={styles.spotText} numberOfLines={1}>
            {spotLabel}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={Colors.textLight} />
        </TouchableOpacity>

        {/* 打卡照片 */}
        {item.photoUrl ? (
          <TouchableOpacity
            style={styles.photoWrap}
            activeOpacity={0.95}
            onPress={() => setViewerUri(item.photoUrl ?? null)}
          >
            <Image source={{ uri: item.photoUrl }} style={styles.photo} resizeMode="cover" />
            <View style={styles.tapHint}>
              <Ionicons name="expand-outline" size={13} color={Colors.white} />
              <Text style={styles.tapHintText}>点击查看大图</Text>
            </View>
          </TouchableOpacity>
        ) : null}

        {/* AR 对比图 */}
        {item.comparisonUrl ? (
          <TouchableOpacity
            style={styles.photoWrap}
            activeOpacity={0.95}
            onPress={() => setViewerUri(item.comparisonUrl ?? null)}
          >
            <Image source={{ uri: item.comparisonUrl }} style={styles.photo} resizeMode="cover" />
            <View style={styles.arTag}>
              <Ionicons name="image" size={12} color={Colors.white} />
              <Text style={styles.arTagText}>AR 对比图</Text>
            </View>
          </TouchableOpacity>
        ) : null}

        {item.content ? <Text style={styles.body}>{item.content}</Text> : null}

        {/* 点赞 */}
        <TouchableOpacity style={styles.likeBtn} onPress={handleLike} activeOpacity={0.7}>
          <Ionicons
            name={liked ? 'heart' : 'heart-outline'}
            size={22}
            color={liked ? Colors.primary : Colors.textSecondary}
          />
          <Text style={[styles.likeText, liked && styles.likeTextActive]}>{likeCount} 赞</Text>
        </TouchableOpacity>
      </ScrollView>

      <ImageViewerModal
        visible={viewerUri != null}
        uri={viewerUri}
        onClose={() => setViewerUri(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
    paddingBottom: Spacing.xxxl,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
  },
  missing: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  backLink: {
    marginTop: Spacing.sm,
    fontSize: FontSize.md,
    color: Colors.primary,
    fontWeight: '600',
  },
  author: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
  },
  avatarText: {
    color: Colors.white,
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  authorText: {
    flex: 1,
  },
  nickname: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  date: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
    marginTop: 2,
  },
  spotChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  spotText: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: '600',
    maxWidth: 240,
  },
  photoWrap: {
    position: 'relative',
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.white,
  },
  photo: {
    width: '100%',
    height: 320,
    backgroundColor: Colors.surface,
  },
  tapHint: {
    position: 'absolute',
    bottom: Spacing.sm,
    right: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  tapHintText: {
    color: Colors.white,
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  arTag: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  arTagText: {
    color: Colors.white,
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  body: {
    fontSize: FontSize.md,
    color: Colors.text,
    lineHeight: 24,
  },
  likeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  likeText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  likeTextActive: {
    color: Colors.primary,
  },
});
