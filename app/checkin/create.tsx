import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';

import { createCheckIn } from '@/api/checkin';
import { uploadWaypointPhoto } from '@/api/oss';
import { getAnimeList, getAnimeSpots } from '@/api/anime';
import { useAuthStore } from '@/stores/authStore';
import { useCurrentLocation } from '@/hooks/useLocation';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { getDisplayImageUrl } from '@/utils/image';
import type { Anime, Spot } from '@/types';

export default function CreateCheckInScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const { location } = useCurrentLocation();

  // 跟走页跳转时带上 spotId/spotName/animeTitle/routeId，预填取景地并把打卡挂到路径上
  const params = useLocalSearchParams<{
    spotId?: string;
    spotName?: string;
    animeTitle?: string;
    routeId?: string;
  }>();
  const prefilledSpot = useMemo<Spot | null>(() => {
    const id = Number(params.spotId);
    if (!params.spotId || Number.isNaN(id)) return null;
    return {
      id,
      name: params.spotName ?? '取景地',
      animeTitle: params.animeTitle ?? '',
    } as Spot;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const routeId = params.routeId ? Number(params.routeId) : undefined;

  const [spot, setSpot] = useState<Spot | null>(prefilledSpot);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);

  /* ── 未登录拦截 ── */
  if (!user) {
    return (
      <View style={styles.center}>
        <Ionicons name="lock-closed-outline" size={48} color={Colors.textLight} />
        <Text style={styles.missing}>登录后才能发布打卡</Text>
        <TouchableOpacity
          style={styles.loginBtn}
          onPress={() => router.replace('/auth/login')}
          activeOpacity={0.85}
        >
          <Text style={styles.loginBtnText}>去登录</Text>
        </TouchableOpacity>
      </View>
    );
  }

  async function handleTakePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('未授权', '请允许访问相机');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled && result.assets.length > 0) {
      setPhotoUri(result.assets[0].uri);
    }
  }

  async function handlePickPhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('未授权', '请允许访问相册');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      setPhotoUri(result.assets[0].uri);
    }
  }

  async function handlePublish() {
    if (!spot) {
      Alert.alert('提示', '请先选择打卡的取景地');
      return;
    }
    if (!photoUri && !content.trim()) {
      Alert.alert('提示', '加一张照片或写点感受再发布吧');
      return;
    }
    setPublishing(true);
    try {
      const photoUrl = photoUri ? await uploadWaypointPhoto(photoUri) : undefined;
      await createCheckIn({
        spotId: spot.id,
        routeId: routeId && !Number.isNaN(routeId) ? routeId : undefined,
        photoUrl,
        content: content.trim() || undefined,
        latitude: location?.latitude,
        longitude: location?.longitude,
      });
      qc.invalidateQueries({ queryKey: ['checkInFeed'] });
      qc.invalidateQueries({ queryKey: ['myCheckIns'] });
      if (routeId && !Number.isNaN(routeId)) {
        qc.invalidateQueries({ queryKey: ['route', routeId] });
      }
      Alert.alert('发布成功', '打卡已发布！', [
        { text: '好的', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('发布失败', e?.message ?? '请稍后重试');
    } finally {
      setPublishing(false);
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* 取景地选择 */}
        <Text style={styles.sectionLabel}>取景地</Text>
        <TouchableOpacity
          style={styles.spotSelector}
          onPress={() => setPickerVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons
            name="location-sharp"
            size={18}
            color={spot ? Colors.primary : Colors.textLight}
          />
          {spot ? (
            <View style={styles.spotSelectorText}>
              <Text style={styles.spotName} numberOfLines={1}>
                {spot.name}
              </Text>
              <Text style={styles.spotAnime} numberOfLines={1}>
                {spot.animeTitle}
              </Text>
            </View>
          ) : (
            <Text style={styles.spotPlaceholder}>选择打卡的取景地</Text>
          )}
          <Ionicons name="chevron-forward" size={18} color={Colors.textLight} />
        </TouchableOpacity>

        {/* 照片 */}
        <Text style={styles.sectionLabel}>照片</Text>
        {photoUri ? (
          <View style={styles.photoWrap}>
            <Image source={{ uri: photoUri }} style={styles.photo} resizeMode="cover" />
            <TouchableOpacity
              style={styles.photoRemove}
              onPress={() => setPhotoUri(null)}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={18} color={Colors.white} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.photoActions}>
            <TouchableOpacity style={styles.photoBtn} onPress={handleTakePhoto} activeOpacity={0.8}>
              <Ionicons name="camera-outline" size={26} color={Colors.primary} />
              <Text style={styles.photoBtnText}>拍照</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoBtn} onPress={handlePickPhoto} activeOpacity={0.8}>
              <Ionicons name="images-outline" size={26} color={Colors.primary} />
              <Text style={styles.photoBtnText}>从相册选择</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 文案 */}
        <Text style={styles.sectionLabel}>感受</Text>
        <TextInput
          style={styles.textInput}
          placeholder="记录你的打卡瞬间..."
          placeholderTextColor={Colors.textLight}
          value={content}
          onChangeText={setContent}
          multiline
          maxLength={300}
          textAlignVertical="top"
        />
      </ScrollView>

      {/* 发布按钮 */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md }]}>
        {publishing ? (
          <View style={styles.publishBtn}>
            <ActivityIndicator color={Colors.white} size="small" />
            <Text style={styles.publishBtnText}>发布中...</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.publishBtn}
            onPress={handlePublish}
            activeOpacity={0.85}
          >
            <Ionicons name="send" size={18} color={Colors.white} />
            <Text style={styles.publishBtnText}>发布打卡</Text>
          </TouchableOpacity>
        )}
      </View>

      <SpotPickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={(s) => {
          setSpot(s);
          setPickerVisible(false);
        }}
      />
    </View>
  );
}

/* ── 取景地选择弹窗：搜作品 → 选取景地 ── */
function SpotPickerModal({
  visible,
  onClose,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (spot: Spot) => void;
}) {
  const insets = useSafeAreaInsets();
  const [keyword, setKeyword] = useState('');
  const [animes, setAnimes] = useState<Anime[]>([]);
  const [spots, setSpots] = useState<Spot[]>([]);
  const [pickedAnime, setPickedAnime] = useState<Anime | null>(null);
  const [loading, setLoading] = useState(false);

  async function searchAnime() {
    const kw = keyword.trim();
    if (!kw) return;
    setLoading(true);
    setPickedAnime(null);
    setSpots([]);
    try {
      const res = await getAnimeList({ keyword: kw, page: 0, size: 20 });
      setAnimes(res.data?.content ?? []);
    } catch {
      setAnimes([]);
    } finally {
      setLoading(false);
    }
  }

  async function openAnime(anime: Anime) {
    setPickedAnime(anime);
    setLoading(true);
    try {
      const res = await getAnimeSpots(anime.id);
      setSpots(res.data ?? []);
    } catch {
      setSpots([]);
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
        <View style={styles.modalHeader}>
          {pickedAnime ? (
            <TouchableOpacity onPress={() => setPickedAnime(null)} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={24} color={Colors.text} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 24 }} />
          )}
          <Text style={styles.modalTitle} numberOfLines={1}>
            {pickedAnime ? pickedAnime.title : '选择取景地'}
          </Text>
          <TouchableOpacity onPress={handleClose} activeOpacity={0.7}>
            <Ionicons name="close" size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>

        {!pickedAnime && (
          <View style={styles.searchRow}>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={18} color={Colors.textLight} />
              <TextInput
                style={styles.searchInput}
                placeholder="搜索动画作品"
                placeholderTextColor={Colors.textLight}
                value={keyword}
                onChangeText={setKeyword}
                returnKeyType="search"
                onSubmitEditing={searchAnime}
              />
            </View>
            <TouchableOpacity style={styles.searchBtn} onPress={searchAnime} activeOpacity={0.85}>
              <Text style={styles.searchBtnText}>搜索</Text>
            </TouchableOpacity>
          </View>
        )}

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : pickedAnime ? (
          <FlatList
            data={spots}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.modalList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.spotRow}
                onPress={() => onSelect(item)}
                activeOpacity={0.7}
              >
                <Image source={{ uri: getDisplayImageUrl(item.animeImageUrl) }} style={styles.spotThumb} />
                <View style={styles.spotRowText}>
                  <Text style={styles.spotRowName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  {item.sceneTime ? (
                    <Text style={styles.spotRowSub} numberOfLines={1}>
                      场景时间 {item.sceneTime}
                    </Text>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.textLight} />
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyHint}>该作品暂无取景地</Text>
            }
          />
        ) : (
          <FlatList
            data={animes}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.modalList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.animeRow}
                onPress={() => openAnime(item)}
                activeOpacity={0.7}
              >
                <Image source={{ uri: getDisplayImageUrl(item.coverUrl) }} style={styles.animeCover} />
                <View style={styles.animeRowText}>
                  <Text style={styles.animeTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.animeSub} numberOfLines={1}>
                    {item.spotCount} 个取景地
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.textLight} />
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyHint}>
                {keyword.trim() ? '没有找到相关作品' : '搜索动画作品以选择取景地'}
              </Text>
            }
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.sm,
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
  loginBtn: {
    marginTop: Spacing.md,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xxxl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  loginBtnText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  sectionLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginTop: Spacing.md,
  },
  spotSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  spotSelectorText: {
    flex: 1,
  },
  spotName: {
    fontSize: FontSize.md,
    color: Colors.text,
    fontWeight: '600',
  },
  spotAnime: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  spotPlaceholder: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.textLight,
  },
  photoActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  photoBtn: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xl,
  },
  photoBtnText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  photoWrap: {
    position: 'relative',
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.white,
  },
  photo: {
    width: '100%',
    height: 280,
    backgroundColor: Colors.surface,
  },
  photoRemove: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    minHeight: 120,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  publishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  publishBtnText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: '700',
  },

  /* ── 弹窗 ── */
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
    marginHorizontal: Spacing.sm,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.lg,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.text,
    padding: 0,
  },
  searchBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.full,
  },
  searchBtnText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  modalList: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.sm,
  },
  animeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
  },
  animeCover: {
    width: 48,
    height: 64,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surface,
  },
  animeRowText: {
    flex: 1,
  },
  animeTitle: {
    fontSize: FontSize.md,
    color: Colors.text,
    fontWeight: '600',
  },
  animeSub: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  spotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
  },
  spotThumb: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surface,
  },
  spotRowText: {
    flex: 1,
  },
  spotRowName: {
    fontSize: FontSize.md,
    color: Colors.text,
    fontWeight: '600',
  },
  spotRowSub: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  emptyHint: {
    textAlign: 'center',
    color: Colors.textLight,
    fontSize: FontSize.md,
    marginTop: Spacing.xxxl,
  },
});
