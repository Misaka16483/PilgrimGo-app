import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import type { PilgrimRoute } from '@/types';
import { formatDistance, formatDuration } from '@/utils/geo';

interface RouteCardProps {
  route: PilgrimRoute;
  onPress: () => void;
  /** 仅在"我的路径"等本人列表传入：显示删除按钮 */
  onDelete?: (route: PilgrimRoute) => void;
  /** 仅在本人列表传入：显示公开/私密切换按钮 */
  onToggleVisibility?: (route: PilgrimRoute) => void;
}

export function RouteCard({ route, onPress, onDelete, onToggleVisibility }: RouteCardProps) {
  const waypointChips = route.waypoints
    .slice()
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .slice(0, 3);
  const isPrivate = route.isPublic === false;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>
          {route.title}
        </Text>
        {isPrivate ? (
          <View style={styles.privateBadge}>
            <Ionicons name="lock-closed" size={10} color={Colors.textSecondary} />
            <Text style={styles.privateBadgeText}>私密</Text>
          </View>
        ) : null}
        <View style={styles.ratingBadge}>
          <Text style={styles.ratingText}>{route.rating.toFixed(1)}</Text>
        </View>
      </View>

      <Text style={styles.author}>by {route.authorName}</Text>

      {route.description && (
        <Text style={styles.description} numberOfLines={2}>
          {route.description}
        </Text>
      )}

      {waypointChips.length > 0 && (
        <View style={styles.chipsRow}>
          {waypointChips.map((wp) => (
            <View key={wp.id} style={styles.chip}>
              <Text style={styles.chipText} numberOfLines={1}>
                {wp.orderIndex + 1}. {wp.description}
              </Text>
            </View>
          ))}
          {route.waypoints.length > waypointChips.length && (
            <View style={styles.chip}>
              <Text style={styles.chipText}>+{route.waypoints.length - waypointChips.length}</Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{formatDistance(route.distance)}</Text>
          <Text style={styles.statLabel}>距离</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>{formatDuration(route.duration)}</Text>
          <Text style={styles.statLabel}>时长</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>{route.spotCount}</Text>
          <Text style={styles.statLabel}>取景地</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>{route.waypoints.length}</Text>
          <Text style={styles.statLabel}>标注点</Text>
        </View>
      </View>

      {(onDelete || onToggleVisibility) && (
        <View style={styles.actionsRow}>
          {onToggleVisibility && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => onToggleVisibility(route)}
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
          )}
          {onDelete && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => onDelete(route)}
              activeOpacity={0.6}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="trash-outline" size={18} color={Colors.primary} />
              <Text style={[styles.actionText, { color: Colors.primary }]}>删除</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    elevation: 2,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
    marginRight: Spacing.sm,
  },
  ratingBadge: {
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  ratingText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
  },
  author: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  description: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    lineHeight: 20,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: Spacing.sm,
  },
  chip: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    marginRight: Spacing.xs,
    marginBottom: Spacing.xs,
    maxWidth: '100%',
  },
  chipText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 28,
    backgroundColor: Colors.border,
  },
  privateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    marginRight: Spacing.sm,
  },
  privateBadgeText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
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
