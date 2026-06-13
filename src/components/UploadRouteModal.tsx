import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { Button } from './Button';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { uploadRoute } from '@/api/route';
import { uploadWaypointPhoto } from '@/api/oss';
import { useRecordingStore } from '@/stores/recordingStore';
import { formatDistance, formatDuration, getTotalDistance } from '@/utils/geo';
import { simplifyTrack } from '@/utils/simplifyTrack';

interface Props {
  visible: boolean;
  onClose: () => void;
  onUploaded: (routeId: number) => void;
}

export function UploadRouteModal({ visible, onClose, onUploaded }: Props) {
  const { animeId, trackPoints, waypoints, startTime, targetSpots, checkInIds, setAnimeId } =
    useRecordingStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [animeIdInput, setAnimeIdInput] = useState(animeId ? String(animeId) : '');
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setAnimeIdInput(animeId ? String(animeId) : '');
      setTitle('');
      setDescription('');
      setProgress(null);
    }
  }, [visible, animeId]);

  const distance = getTotalDistance(trackPoints);
  const duration = startTime ? (Date.now() - startTime) / 1000 : 0;

  const handleSubmit = async () => {
    const parsedAnimeId = Number(animeIdInput);
    if (!parsedAnimeId || Number.isNaN(parsedAnimeId)) {
      Alert.alert('请填写动画 ID', '需要选择路径所属的动画作品');
      return;
    }
    if (!title.trim()) {
      Alert.alert('请填写标题', '路径标题不能为空');
      return;
    }
    if (trackPoints.length < 2) {
      Alert.alert('轨迹点不足', '请先录制一段有效路径');
      return;
    }

    try {
      setSubmitting(true);

      // 1. 把转折点中本地的图片（file://...）依次上传，替换成公开 URL
      const localOnes = waypoints
        .map((wp, idx) => ({ wp, idx }))
        .filter(({ wp }) => wp.imageUrl && wp.imageUrl.startsWith('file://'));
      const total = localOnes.length;
      const resolvedWaypoints = waypoints.map((wp) => ({ ...wp }));
      for (let i = 0; i < localOnes.length; i++) {
        const { wp, idx } = localOnes[i];
        setProgress(`正在上传图片 (${i + 1}/${total})…`);
        try {
          const publicUrl = await uploadWaypointPhoto(wp.imageUrl);
          resolvedWaypoints[idx].imageUrl = publicUrl;
        } catch (e: any) {
          throw new Error(`第 ${idx + 1} 个标注的图片上传失败：${e?.message ?? '未知错误'}`);
        }
      }

      // 2. 上传前对轨迹做 Douglas-Peucker 压缩（epsilon=5m）
      const simplified = simplifyTrack(trackPoints, 5);
      setProgress(
        `正在发布路径…（轨迹 ${trackPoints.length} → ${simplified.length}）`
      );
      const res = await uploadRoute({
        animeId: parsedAnimeId,
        title: title.trim(),
        description: description.trim() || undefined,
        trackPoints: simplified,
        waypoints: resolvedWaypoints,
        // 录制时勾选的取景地（按勾选顺序作为 visit_order）+ 期间打卡 id
        spotIds: targetSpots.map((s) => s.id),
        checkInIds,
      });
      setAnimeId(parsedAnimeId);
      onUploaded(res.data.id);
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ?? e?.message ?? '上传失败，请稍后重试';
      Alert.alert('发布失败', msg);
    } finally {
      setSubmitting(false);
      setProgress(null);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>上传巡礼路径</Text>

            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{formatDistance(distance)}</Text>
                <Text style={styles.statLabel}>距离</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{formatDuration(duration)}</Text>
                <Text style={styles.statLabel}>时长</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{waypoints.length}</Text>
                <Text style={styles.statLabel}>转折标注</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{targetSpots.length}</Text>
                <Text style={styles.statLabel}>观景点</Text>
              </View>
            </View>

            {targetSpots.length > 0 && (
              <Text style={styles.spotsHint}>
                关联观景点：{targetSpots.map((s) => s.name).join(' · ')}
                {checkInIds.length > 0 ? `（含 ${checkInIds.length} 张实拍）` : ''}
              </Text>
            )}

            <Text style={styles.label}>动画作品 ID</Text>
            <TextInput
              style={styles.input}
              value={animeIdInput}
              onChangeText={setAnimeIdInput}
              keyboardType="number-pad"
              placeholder="如 12345（来自作品详情页）"
              placeholderTextColor={Colors.textSecondary}
              editable={!submitting}
            />

            <Text style={styles.label}>路径标题</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="给这条路径起个名字"
              placeholderTextColor={Colors.textSecondary}
              maxLength={50}
              editable={!submitting}
            />

            <Text style={styles.label}>路径介绍（可选）</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={description}
              onChangeText={setDescription}
              placeholder="分享这条路径的看点、注意事项等"
              placeholderTextColor={Colors.textSecondary}
              multiline
              numberOfLines={4}
              maxLength={500}
              editable={!submitting}
            />

            {progress && (
              <Text style={styles.progress}>{progress}</Text>
            )}

            <View style={styles.actions}>
              <Button
                title="取消"
                variant="outline"
                onPress={onClose}
                disabled={submitting}
                style={{ flex: 1, marginRight: Spacing.md }}
              />
              <Button
                title="发布"
                onPress={handleSubmit}
                loading={submitting}
                style={{ flex: 1 }}
              />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
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
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
    maxHeight: '90%',
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.primary,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  label: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
    color: Colors.text,
    backgroundColor: Colors.white,
  },
  inputMultiline: {
    minHeight: 88,
    textAlignVertical: 'top',
    paddingTop: Spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    marginTop: Spacing.xl,
  },
  progress: {
    marginTop: Spacing.lg,
    textAlign: 'center',
    fontSize: FontSize.sm,
    color: Colors.primary,
  },
  spotsHint: {
    marginTop: -Spacing.sm,
    marginBottom: Spacing.sm,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
});