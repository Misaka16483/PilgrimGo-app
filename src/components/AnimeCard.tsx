import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import type { Anime } from '@/types';

interface AnimeCardProps {
  anime: Anime;
  onPress: () => void;
}

export function AnimeCard({ anime, onPress }: AnimeCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <Image source={{ uri: anime.coverUrl }} style={styles.cover} />
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {anime.title}
        </Text>
        {anime.titleJp && (
          <Text style={styles.subtitle} numberOfLines={1}>
            {anime.titleJp}
          </Text>
        )}
        <View style={styles.meta}>
          <Text style={styles.spotCount}>{anime.spotCount} 个取景地</Text>
          {anime.region && <Text style={styles.region}>{anime.region}</Text>}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    elevation: 2,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cover: {
    width: '100%',
    height: 160,
    backgroundColor: Colors.surface,
  },
  info: {
    padding: Spacing.md,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    gap: Spacing.md,
  },
  spotCount: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: '600',
  },
  region: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
});
