import React from 'react';
import { View, Text, Image, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getSpotDetail } from '@/api/spot';
import { Button } from '@/components/Button';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';

export default function SpotDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data } = useQuery({
    queryKey: ['spot', Number(id)],
    queryFn: () => getSpotDetail(Number(id)),
  });

  const spot = data?.data;

  if (!spot) {
    return (
      <View style={styles.center}>
        <Text>加载中...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* 动画截图 vs 实景对比 */}
      <View style={styles.comparison}>
        <View style={styles.imageWrapper}>
          <Image source={{ uri: spot.animeImageUrl }} style={styles.image} />
          <Text style={styles.imageLabel}>动画</Text>
        </View>
        {spot.realImageUrl && (
          <View style={styles.imageWrapper}>
            <Image source={{ uri: spot.realImageUrl }} style={styles.image} />
            <Text style={styles.imageLabel}>实景</Text>
          </View>
        )}
      </View>

      {/* 详细信息 */}
      <View style={styles.info}>
        <Text style={styles.name}>{spot.name}</Text>
        <Text style={styles.anime}>{spot.animeTitle}</Text>
        {spot.episode && (
          <Text style={styles.episode}>出自：{spot.episode}</Text>
        )}
        {spot.description && (
          <Text style={styles.description}>{spot.description}</Text>
        )}

        {/* AR 对比按钮 */}
        <Button
          title="AR 场景对比"
          size="lg"
          onPress={() =>
            router.push({
              pathname: '/ar/compare',
              params: {
                animeImageUrl: spot.animeImageUrl,
                spotName: spot.name,
              },
            })
          }
          style={{ marginTop: Spacing.xxl }}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  comparison: {
    flexDirection: 'row',
  },
  imageWrapper: {
    flex: 1,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 200,
    backgroundColor: Colors.surface,
  },
  imageLabel: {
    position: 'absolute',
    bottom: Spacing.sm,
    left: Spacing.sm,
    backgroundColor: Colors.overlay,
    color: Colors.white,
    fontSize: FontSize.xs,
    fontWeight: '600',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },
  info: {
    padding: Spacing.lg,
  },
  name: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.text,
  },
  anime: {
    fontSize: FontSize.md,
    color: Colors.primary,
    fontWeight: '600',
    marginTop: Spacing.xs,
  },
  episode: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  description: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginTop: Spacing.md,
  },
});
