import React from 'react';
import { View, Text, Image, TouchableOpacity, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { CheckIn } from '@/types';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';

interface Props {
  item: CheckIn;
  onLike: (id: number) => void;
  /** 仅在"我的打卡"等本人列表传入：显示删除按钮 */
  onDelete?: (id: number) => void;
  /** 仅在本人列表传入：显示公开/私密切换按钮 */
  onToggleVisibility?: (item: CheckIn) => void;
}

export function CheckInCard({ item, onLike, onDelete, onToggleVisibility }: Props) {
  const router = useRouter();
  const spotLabel = item.spotNameCn || item.spotName;
  const initial = (item.username || '?').trim().charAt(0).toUpperCase();
  const isPrivate = item.isPublic === false;

  return (
    <Pressable
      style={styles.card}
      onPress={() => router.push(`/checkin/${item.id}`)}
      android_ripple={{ color: Colors.border }}
    >
      <View style={styles.header}>
        {item.avatarUrl ? (
          <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
        )}

        <View style={styles.headerText}>
          <Text style={styles.nickname} numberOfLines={1}>
            {item.username}
          </Text>
          <View style={styles.spotRow}>
            <Ionicons name="location-sharp" size={12} color={Colors.primary} />
            <Text style={styles.spotName} numberOfLines={1}>
              {spotLabel}
            </Text>
          </View>
        </View>

        {isPrivate ? (
          <View style={styles.privateBadge}>
            <Ionicons name="lock-closed" size={10} color={Colors.textSecondary} />
            <Text style={styles.privateBadgeText}>私密</Text>
          </View>
        ) : null}
        <Text style={styles.date}>{item.createdAt.slice(0, 10)}</Text>
      </View>

      {item.photoUrl ? (
        <View style={styles.photoWrap}>
          <Image
            source={{ uri: item.photoUrl }}
            style={styles.photo}
            resizeMode="cover"
            onError={() => console.warn('Image load failed:', item.photoUrl)}
          />
          {item.comparisonUrl ? (
            <View style={styles.arBadge}>
              <Ionicons name="image" size={12} color={Colors.white} />
              <Text style={styles.arBadgeText}>AR 对比</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {item.content ? <Text style={styles.content}>{item.content}</Text> : null}

      <View style={styles.divider} />

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.likeBtn}
          onPress={() => onLike(item.id)}
          activeOpacity={0.6}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={item.liked ? 'heart' : 'heart-outline'}
            size={20}
            color={item.liked ? Colors.primary : Colors.textSecondary}
          />
          <Text style={[styles.likeCount, item.liked && styles.likeCountActive]}>
            {item.likeCount}
          </Text>
        </TouchableOpacity>

        <View style={styles.footerSpacer} />

        {onToggleVisibility ? (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => onToggleVisibility(item)}
            activeOpacity={0.6}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={isPrivate ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={Colors.textSecondary}
            />
            <Text style={styles.actionText}>{isPrivate ? '私密' : '公开'}</Text>
          </TouchableOpacity>
        ) : null}

        {onDelete ? (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => onDelete(item.id)}
            activeOpacity={0.6}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="trash-outline" size={18} color={Colors.primary} />
            <Text style={[styles.actionText, { color: Colors.primary }]}>删除</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
  headerText: {
    flex: 1,
  },
  nickname: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text,
  },
  spotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 3,
  },
  spotName: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: '500',
  },
  date: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
    alignSelf: 'flex-start',
  },
  photoWrap: {
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: 220,
    backgroundColor: Colors.surface,
  },
  arBadge: {
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
  arBadgeText: {
    color: Colors.white,
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  content: {
    fontSize: FontSize.md,
    color: Colors.text,
    lineHeight: 22,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginTop: Spacing.md,
    marginHorizontal: Spacing.md,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  likeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  likeCount: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  likeCountActive: {
    color: Colors.primary,
  },
  privateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    marginRight: Spacing.xs,
  },
  privateBadgeText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  footerSpacer: {
    flex: 1,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: Spacing.lg,
  },
  actionText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
});
