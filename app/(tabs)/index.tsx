import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { getAnimeList } from '@/api/anime';
import { AnimeCard } from '@/components/AnimeCard';
import { useDebounce } from '@/hooks/useDebounce';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';

export default function DiscoverScreen() {
  const router = useRouter();
  const [keyword, setKeyword] = useState('');
  const debouncedKeyword = useDebounce(keyword.trim(), 350);

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ['animeList', debouncedKeyword],
    queryFn: () => getAnimeList({ keyword: debouncedKeyword, page: 0, size: 20 }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  const animeList = data?.data?.content ?? [];
  const showSpinner = isLoading || (isFetching && animeList.length === 0);

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="搜索动画作品..."
          placeholderTextColor={Colors.textLight}
          value={keyword}
          onChangeText={setKeyword}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
        />
        {keyword.length > 0 && (
          <TouchableOpacity onPress={() => setKeyword('')} style={styles.clearBtn}>
            <Text style={styles.clearTxt}>清除</Text>
          </TouchableOpacity>
        )}
      </View>

      {showSpinner ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
          {debouncedKeyword ? (
            <Text style={styles.hint}>正在搜索「{debouncedKeyword}」…</Text>
          ) : null}
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
          refreshing={isFetching && animeList.length > 0}
          onRefresh={refetch}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>
                {isError
                  ? '加载失败，请下拉重试'
                  : debouncedKeyword
                  ? '没有找到相关作品'
                  : '暂无作品数据'}
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  clearBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  clearTxt: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
  },
  list: {
    padding: Spacing.lg,
    flexGrow: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  hint: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
});
