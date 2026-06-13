import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { getCachedAnimeOptions, getExternalAnimeList, syncExternalAnime } from '@/api/anime';
import { AnimeCard } from '@/components/AnimeCard';
import { BorderRadius, Colors, FontSize, Spacing } from '@/constants/theme';
import { useDebounce } from '@/hooks/useDebounce';
import type { Anime } from '@/types';

export default function DiscoverScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pickerKeyword, setPickerKeyword] = useState('');
  const [externalKeyword, setExternalKeyword] = useState('');
  const [showCachedAnime, setShowCachedAnime] = useState(false);
  const [showExternalAnime, setShowExternalAnime] = useState(false);
  const [selectedCachedAnime, setSelectedCachedAnime] = useState<Anime | null>(null);
  const [selectedExternalAnime, setSelectedExternalAnime] = useState<Anime | null>(null);
  const debouncedExternalKeyword = useDebounce(externalKeyword.trim(), 500);

  const cachedAnimeQuery = useQuery({
    queryKey: ['cachedAnimeOptions'],
    queryFn: () => getCachedAnimeOptions({ limit: 100 }),
    staleTime: 5 * 60_000,
    retry: false,
  });

  const externalAnimeQuery = useQuery({
    queryKey: ['externalAnimeSearch', debouncedExternalKeyword],
    queryFn: () => getExternalAnimeList({ keyword: debouncedExternalKeyword, page: 0, size: 12 }),
    enabled: showExternalAnime && debouncedExternalKeyword.length > 0,
    staleTime: 60_000,
    retry: false,
  });

  const cachedAnimeList = cachedAnimeQuery.data?.data ?? [];
  const normalizedPickerKeyword = pickerKeyword.trim().toLowerCase();
  const filteredCachedAnimeList = useMemo(() => {
    if (!normalizedPickerKeyword) {
      return cachedAnimeList;
    }
    return cachedAnimeList.filter((anime) => {
      const fields = [
        anime.title,
        anime.titleJp,
        anime.region,
        String(anime.id),
      ];
      return fields.some((field) => field?.toLowerCase().includes(normalizedPickerKeyword));
    });
  }, [cachedAnimeList, normalizedPickerKeyword]);
  const externalAnimeList = externalAnimeQuery.data?.data?.content ?? [];
  const animeList = selectedExternalAnime
    ? [selectedExternalAnime]
    : selectedCachedAnime
      ? [selectedCachedAnime]
      : [];

  const handleToggleCachedAnime = useCallback(() => {
    setShowCachedAnime((value) => !value);
    setShowExternalAnime(false);
  }, []);

  const handleToggleExternalAnime = useCallback(() => {
    setShowExternalAnime((value) => !value);
    setShowCachedAnime(false);
  }, []);

  const handleSelectCachedAnime = useCallback((anime: Anime) => {
    setSelectedCachedAnime(anime);
    setSelectedExternalAnime(null);
    setShowCachedAnime(false);
    setPickerKeyword('');
  }, []);

  const handleSelectExternalAnime = useCallback((anime: Anime) => {
    setSelectedExternalAnime(anime);
    setSelectedCachedAnime(null);
    setShowExternalAnime(false);
  }, []);

  const syncMutation = useMutation({
    mutationFn: (anime: Anime) => syncExternalAnime(anime.id),
    onSuccess: (res, anime) => {
      const synced = res.data ?? anime;
      queryClient.invalidateQueries({ queryKey: ['cachedAnimeOptions'] });
      queryClient.invalidateQueries({ queryKey: ['anime', synced.id] });
      queryClient.invalidateQueries({ queryKey: ['animeSpots', synced.id] });
      // 收录成功后按已收录作品展示，打开详情走本地数据
      setSelectedCachedAnime(synced);
      setSelectedExternalAnime(null);
      setShowExternalAnime(false);
    },
    onError: (error: Error) => {
      const message = error.message || '收录失败，请稍后重试';
      if (message.includes('未登录')) {
        Alert.alert('需要登录', '登录后才能收录作品到巡礼+', [
          { text: '取消', style: 'cancel' },
          { text: '去登录', onPress: () => router.push('/auth/login') },
        ]);
        return;
      }
      Alert.alert('收录失败', message);
    },
  });

  const handleSyncExternalAnime = useCallback(
    (anime: Anime) => {
      if (syncMutation.isPending) return;
      syncMutation.mutate(anime);
    },
    [syncMutation]
  );

  const handleOpenAnime = useCallback((anime: Anime) => {
    const externalOnly = selectedExternalAnime?.id === anime.id ? '&externalOnly=1' : '';
    router.push(`/anime/${anime.id}?cachedOnly=1${externalOnly}`);
  }, [router, selectedExternalAnime?.id]);

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <TouchableOpacity
          onPress={handleToggleCachedAnime}
          style={[styles.selectBtn, showCachedAnime && styles.selectBtnActive]}
          activeOpacity={0.75}
        >
          <Text style={[styles.selectTxt, showCachedAnime && styles.selectTxtActive]}>
            选择作品
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleToggleExternalAnime}
          style={[styles.selectBtn, showExternalAnime && styles.selectBtnActive]}
          activeOpacity={0.75}
        >
          <Text style={[styles.selectTxt, showExternalAnime && styles.selectTxtActive]}>
            搜索官网作品
          </Text>
        </TouchableOpacity>
      </View>

      {showCachedAnime ? (
        <View style={styles.cachedPanel}>
          <View style={styles.cachedSearchRow}>
            <TextInput
              style={styles.cachedSearchInput}
              placeholder="在已收录作品中搜索..."
              placeholderTextColor={Colors.textLight}
              value={pickerKeyword}
              onChangeText={setPickerKeyword}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
            />
            {pickerKeyword.length > 0 ? (
              <TouchableOpacity onPress={() => setPickerKeyword('')} style={styles.clearBtn}>
                <Text style={styles.clearTxt}>清除</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          {cachedAnimeQuery.isLoading ? (
            <View style={styles.cachedLoading}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.hint}>正在加载已有取景地作品</Text>
            </View>
          ) : cachedAnimeQuery.isError ? (
            <Text style={styles.cachedEmpty}>
              已有作品加载失败，请重试
            </Text>
          ) : filteredCachedAnimeList.length === 0 ? (
            <Text style={styles.cachedEmpty}>
              {pickerKeyword.trim()
                ? '暂未收录该作品，请等待管理员同步后再查看'
                : '暂无已收录取景地作品'}
            </Text>
          ) : (
            <FlatList
              data={filteredCachedAnimeList}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.cachedItem}
                  activeOpacity={0.75}
                  onPress={() => handleSelectCachedAnime(item)}
                >
                  <Text style={styles.cachedTitle} numberOfLines={1}>
                    {item.title || item.titleJp || `作品 ${item.id}`}
                  </Text>
                  {item.region ? (
                    <Text style={styles.cachedMeta} numberOfLines={1}>
                      {item.region}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              )}
              style={styles.cachedList}
              nestedScrollEnabled
              showsVerticalScrollIndicator
            />
          )}
        </View>
      ) : null}

      {showExternalAnime ? (
        <View style={styles.cachedPanel}>
          <View style={styles.cachedSearchRow}>
            <TextInput
              style={styles.cachedSearchInput}
              placeholder="搜索官网作品，速度较慢..."
              placeholderTextColor={Colors.textLight}
              value={externalKeyword}
              onChangeText={setExternalKeyword}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
            />
            {externalKeyword.length > 0 ? (
              <TouchableOpacity onPress={() => setExternalKeyword('')} style={styles.clearBtn}>
                <Text style={styles.clearTxt}>清除</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          {externalAnimeQuery.isLoading ? (
            <View style={styles.cachedLoading}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.hint}>正在搜索官网作品，可能需要稍等</Text>
            </View>
          ) : externalAnimeQuery.isError ? (
            <Text style={styles.cachedEmpty}>官网搜索失败，请稍后再试</Text>
          ) : debouncedExternalKeyword.length === 0 ? (
            <Text style={styles.cachedEmpty}>输入作品名后搜索官网作品，加载可能较慢</Text>
          ) : externalAnimeList.length === 0 ? (
            <Text style={styles.cachedEmpty}>暂未找到该作品</Text>
          ) : (
            <FlatList
              data={externalAnimeList}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => {
                const isSyncingItem =
                  syncMutation.isPending && syncMutation.variables?.id === item.id;
                return (
                  <View style={[styles.cachedItem, styles.externalItem]}>
                    <TouchableOpacity
                      style={styles.externalItemInfo}
                      activeOpacity={0.75}
                      onPress={() => handleSelectExternalAnime(item)}
                    >
                      <Text style={styles.cachedTitle} numberOfLines={1}>
                        {item.title || item.titleJp || `作品 ${item.id}`}
                      </Text>
                      {item.region ? (
                        <Text style={styles.cachedMeta} numberOfLines={1}>
                          {item.region}
                        </Text>
                      ) : null}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.syncBtn, isSyncingItem && styles.syncBtnDisabled]}
                      activeOpacity={0.75}
                      disabled={syncMutation.isPending}
                      onPress={() => handleSyncExternalAnime(item)}
                    >
                      {isSyncingItem ? (
                        <ActivityIndicator size="small" color={Colors.white} />
                      ) : (
                        <Text style={styles.syncBtnText}>一键收录</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                );
              }}
              style={styles.cachedList}
              nestedScrollEnabled
              showsVerticalScrollIndicator
            />
          )}
        </View>
      ) : null}

      <FlatList
        data={animeList}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <AnimeCard
            anime={item}
            onPress={() => handleOpenAnime(item)}
          />
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>
              点击“选择作品”，从已收录取景地作品中选择
            </Text>
          </View>
        }
      />
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
    justifyContent: 'center',
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
  selectBtn: {
    flex: 1,
    maxWidth: 220,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    alignItems: 'center',
  },
  selectBtnActive: {
    backgroundColor: Colors.primary,
  },
  selectTxt: {
    color: Colors.text,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  selectTxtActive: {
    color: Colors.white,
  },
  cachedPanel: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    maxHeight: 360,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  cachedSearchRow: {
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  cachedSearchInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  cachedList: {
    flexGrow: 0,
  },
  cachedLoading: {
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  cachedEmpty: {
    padding: Spacing.lg,
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    textAlign: 'center',
  },
  cachedItem: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  cachedTitle: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  cachedMeta: {
    marginTop: 2,
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
  },
  externalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  externalItemInfo: {
    flex: 1,
  },
  syncBtn: {
    minWidth: 76,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
  },
  syncBtnDisabled: {
    opacity: 0.7,
  },
  syncBtnText: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: '700',
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
