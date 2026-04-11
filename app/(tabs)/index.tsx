import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getAnimeList } from '@/api/anime';
import { AnimeCard } from '@/components/AnimeCard';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';

export default function DiscoverScreen() {
  const router = useRouter();
  const [keyword, setKeyword] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['animeList', keyword],
    queryFn: () => getAnimeList({ keyword, page: 0, size: 20 }),
  });

  const animeList = data?.data?.content ?? [];

  return (
    <View style={styles.container}>
      {/* 搜索栏 */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="搜索动画作品..."
          placeholderTextColor={Colors.textLight}
          value={keyword}
          onChangeText={setKeyword}
        />
      </View>

      {/* 作品列表 */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={animeList}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <AnimeCard
              anime={item}
              onPress={() => router.push(`/anime/${item.id}`)}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>
                {keyword ? '没有找到相关作品' : '暂无作品数据'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  searchBar: {
    padding: Spacing.lg,
    backgroundColor: Colors.white,
  },
  searchInput: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  list: {
    padding: Spacing.lg,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
});
