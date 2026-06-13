import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { getAnimeSpots } from '@/api/anime';
import { Button } from './Button';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import type { Spot } from '@/types';
import { getDisplayImageUrl } from '@/utils/image';

interface Props {
  visible: boolean;
  animeId: number | null;
  selected: Spot[];
  onClose: () => void;
  onConfirm: (spots: Spot[]) => void;
}

const PICKER_PAGE_SIZE = 100;

export function SpotPickerModal({ visible, animeId, selected, onClose, onConfirm }: Props) {
  const [draftIds, setDraftIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (visible) {
      setDraftIds(new Set(selected.map((s) => s.id)));
    }
  }, [visible, selected]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['spotPicker', animeId],
    queryFn: () =>
      getAnimeSpots(animeId as number),
    enabled: visible && animeId != null,
  });

  // 没坐标的 spot 没法在地图上显示，也算不了距离，直接过滤掉
  const allSpots: Spot[] = (data?.data ?? []).filter(
    (s: Spot) => Number.isFinite(s.latitude) && Number.isFinite(s.longitude)
  );

  const draftSelected = useMemo(
    () => allSpots.filter((s) => draftIds.has(s.id)),
    [allSpots, draftIds]
  );

  const toggle = (spot: Spot) => {
    setDraftIds((prev) => {
      const next = new Set(prev);
      if (next.has(spot.id)) {
        next.delete(spot.id);
      } else {
        next.add(spot.id);
      }
      return next;
    });
  };

  const selectAll = () => setDraftIds(new Set(allSpots.map((s) => s.id)));
  const clearAll = () => setDraftIds(new Set());

  const handleConfirm = () => {
    onConfirm(draftSelected);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>选择巡礼取景地</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Text style={styles.close}>关闭</Text>
            </TouchableOpacity>
          </View>

          {animeId == null ? (
            <View style={styles.stateBox}>
              <Text style={styles.stateText}>
                还没绑定作品。请先从作品详情页"录制此作品路径"进入。
              </Text>
            </View>
          ) : isLoading ? (
            <View style={styles.stateBox}>
              <ActivityIndicator color={Colors.primary} />
            </View>
          ) : isError ? (
            <View style={styles.stateBox}>
              <Text style={styles.stateText}>取景地加载失败</Text>
              <Button title="重试" variant="outline" onPress={() => refetch()} />
            </View>
          ) : allSpots.length === 0 ? (
            <View style={styles.stateBox}>
              <Text style={styles.stateText}>这部作品暂时还没有取景地</Text>
            </View>
          ) : (
            <>
              <View style={styles.toolbar}>
                <Text style={styles.toolbarHint}>
                  已选 {draftIds.size} / {allSpots.length}
                </Text>
                <View style={styles.toolbarBtns}>
                  <TouchableOpacity onPress={selectAll} style={styles.linkBtn}>
                    <Text style={styles.linkText}>全选</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={clearAll} style={styles.linkBtn}>
                    <Text style={styles.linkText}>清空</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <FlatList
                data={allSpots}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => {
                  const active = draftIds.has(item.id);
                  return (
                    <TouchableOpacity
                      style={[styles.row, active && styles.rowActive]}
                      onPress={() => toggle(item)}
                      activeOpacity={0.7}
                    >
                      <Image
                        source={{
                          uri: getDisplayImageUrl(item.animeImageUrl),
                        }}
                        style={styles.thumb}
                      />
                      <View style={styles.rowMain}>
                        <Text style={styles.rowName} numberOfLines={2}>
                          {item.name}
                        </Text>
                        {item.episodeNumber || item.sceneTime ? (
                          <Text style={styles.rowMeta} numberOfLines={1}>
                            {item.episodeNumber ? `第 ${item.episodeNumber} 集` : ''}
                            {item.episodeNumber && item.sceneTime ? ' · ' : ''}
                            {item.sceneTime ?? ''}
                          </Text>
                        ) : null}
                      </View>
                      <View style={[styles.checkbox, active && styles.checkboxActive]}>
                        {active ? <Text style={styles.checkboxTick}>✓</Text> : null}
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />
            </>
          )}

          <View style={styles.footer}>
            <Button
              title="取消"
              variant="outline"
              onPress={onClose}
              style={{ flex: 1, marginRight: Spacing.md }}
            />
            <Button
              title={draftIds.size > 0 ? `确认 (${draftIds.size})` : '确认'}
              onPress={handleConfirm}
              disabled={animeId == null}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '85%',
    paddingTop: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  close: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  toolbarHint: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  toolbarBtns: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  linkBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  linkText: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    gap: Spacing.md,
  },
  rowActive: {
    backgroundColor: '#FFE9E5',
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.border,
  },
  rowMain: {
    flex: 1,
  },
  rowName: {
    fontSize: FontSize.md,
    color: Colors.text,
    fontWeight: '600',
  },
  rowMeta: {
    marginTop: 2,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
  },
  checkboxActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkboxTick: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 16,
  },
  stateBox: {
    paddingVertical: Spacing.xxxl,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.md,
  },
  stateText: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});
