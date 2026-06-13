import React, { useCallback } from 'react';
import { Image, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getSpotDetail } from '@/api/spot';
import { Button } from '@/components/Button';
import { RemoteImage } from '@/components/RemoteImage';
import { BorderRadius, Colors, FontSize, Spacing } from '@/constants/theme';
import type { Spot } from '@/types';
import { getDisplayImageUrl } from '@/utils/image';

export default function SpotDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data } = useQuery({
    queryKey: ['spot', Number(id)],
    queryFn: () => getSpotDetail(Number(id)),
  });

  const spot = data?.data;
  const animeImageUrl = getDisplayImageUrl(spot?.animeImageUrl);
  const handleOpenMap = useCallback(() => {
    if (!spot) {
      return;
    }

    router.push({
      pathname: '/spot-map',
      params: {
        spotId: String(spot.id),
      },
    });
  }, [router, spot]);

  if (!spot) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>正在加载取景地详情...</Text>
      </View>
    );
  }

  const episodeText = getEpisodeText(spot);
  const sceneTimeText = getSceneTimeText(spot);
  const originText = spot.origin || '暂未标注';

  return (
    <ScrollView style={styles.container}>
      <View style={styles.comparison}>
        <View style={styles.imageWrapper}>
          <RemoteImage uri={animeImageUrl} style={styles.image} />
          <Text style={styles.imageLabel}>动画截图</Text>
        </View>

        {spot.realImageUrl ? (
          <View style={styles.imageWrapper}>
            <Image source={{ uri: spot.realImageUrl }} style={styles.image} />
            <Text style={styles.imageLabel}>实景照片</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.info}>
        <Text style={styles.name}>{spot.name}</Text>
        <Text style={styles.anime}>{spot.animeTitle}</Text>

        <View style={styles.metaPanel}>
          {episodeText ? <DetailRow label="集数" value={episodeText} /> : null}
          {sceneTimeText ? <DetailRow label="截图时间" value={sceneTimeText} /> : null}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>来源</Text>
            {spot.originUrl ? (
              <Text
                style={[styles.detailValue, styles.sourceLink]}
                onPress={() => Linking.openURL(spot.originUrl!)}
              >
                {originText}
              </Text>
            ) : (
              <Text style={styles.detailValue}>{originText}</Text>
            )}
          </View>
        </View>

        {spot.description ? <Text style={styles.description}>{spot.description}</Text> : null}

        <View style={styles.actionButtons}>
          <Button
            title="地图查看"
            variant="outline"
            size="lg"
            onPress={handleOpenMap}
            style={styles.actionButton}
          />
          <Button
            title="AR 场景对比 / 打卡"
            size="lg"
            onPress={() =>
              router.push({
                pathname: '/ar/compare',
                params: {
                  spotId: String(spot.id),
                  animeImageUrl,
                  spotName: spot.name,
                },
              })
            }
            style={styles.actionButton}
          />
        </View>
      </View>
    </ScrollView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function getEpisodeText(spot: Spot) {
  if (spot.episodeNumber) {
    return `第 ${spot.episodeNumber} 集`;
  }

  return spot.episode;
}

function getSceneTimeText(spot: Spot) {
  if (spot.sceneTime) {
    return spot.sceneTime;
  }

  if (spot.sceneSeconds === undefined) {
    return undefined;
  }

  const minutes = Math.floor(spot.sceneSeconds / 60);
  const seconds = spot.sceneSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
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
  loadingText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
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
  metaPanel: {
    marginTop: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  detailLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  detailValue: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.text,
    fontWeight: '600',
    textAlign: 'right',
  },
  sourceLink: {
    color: Colors.primary,
  },
  description: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginTop: Spacing.md,
  },
  actionButtons: {
    marginTop: Spacing.xxl,
    gap: Spacing.md,
  },
  actionButton: {
    width: '100%',
  },
});
