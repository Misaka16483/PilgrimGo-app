import React, { useState } from 'react';
import {
  Modal,
  View,
  Image,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Dimensions,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
// expo-file-system 19 把 downloadAsync 等放到了 /legacy 子模块（与 oss.ts 保持一致）
import * as FileSystem from 'expo-file-system/legacy';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';

const { width, height } = Dimensions.get('window');

interface Props {
  visible: boolean;
  uri?: string | null;
  onClose: () => void;
}

export function ImageViewerModal({ visible, uri, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [saving, setSaving] = useState(false);

  // 先把远程图片下载到本地缓存，返回本地 file:// 路径
  async function downloadToCache(remote: string): Promise<string> {
    const ext = guessExt(remote);
    const localUri = `${FileSystem.cacheDirectory}checkin_${Date.now()}.${ext}`;
    const { uri: downloaded } = await FileSystem.downloadAsync(remote, localUri);
    return downloaded;
  }

  // 兜底：唤起系统分享面板，用户可在其中选择「存储图像 / 保存到相册」
  // —— 在 Expo Go 等无法直接写相册的环境下仍可用。
  async function shareFallback(localUri: string) {
    if (!(await Sharing.isAvailableAsync())) {
      Alert.alert('无法保存', '当前环境不支持保存图片');
      return;
    }
    await Sharing.shareAsync(localUri, {
      mimeType: 'image/jpeg',
      dialogTitle: '保存图片',
      UTI: 'public.image',
    });
  }

  async function handleSave() {
    if (!uri || saving) {
      return;
    }
    try {
      setSaving(true);
      const localUri = await downloadToCache(uri);

      // 只申请「写入相册」权限：范围最小、兼容性最好
      let perm = await MediaLibrary.getPermissionsAsync(true);
      if (perm.status !== 'granted' && perm.canAskAgain) {
        perm = await MediaLibrary.requestPermissionsAsync(true);
      }

      if (perm.status === 'granted') {
        await MediaLibrary.saveToLibraryAsync(localUri);
        Alert.alert('已保存', '图片已保存到相册');
        return;
      }

      if (!perm.canAskAgain) {
        // 用户此前永久拒绝，引导去系统设置
        Alert.alert('无法保存', '请在系统设置中允许「巡礼+」访问相册', [
          { text: '取消', style: 'cancel' },
          { text: '去设置', onPress: () => Linking.openSettings() },
        ]);
        return;
      }

      // 权限被拒：退回系统分享面板手动保存
      await shareFallback(localUri);
    } catch (e: any) {
      // 直接写相册失败（如 Expo Go 不支持），尝试分享面板兜底
      try {
        const localUri = await downloadToCache(uri);
        await shareFallback(localUri);
      } catch (e2: any) {
        Alert.alert('保存失败', e2?.message ?? e?.message ?? '请稍后重试');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        {/* 点击空白处关闭 */}
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />

        {uri ? <Image source={{ uri }} style={styles.image} resizeMode="contain" /> : null}

        {/* 顶部关闭按钮 */}
        <View style={[styles.topBar, { top: insets.top + Spacing.sm }]}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={26} color={Colors.white} />
          </TouchableOpacity>
        </View>

        {/* 底部保存按钮 */}
        <TouchableOpacity
          style={[styles.saveBtn, { bottom: insets.bottom + Spacing.xl }]}
          onPress={handleSave}
          activeOpacity={0.85}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <Ionicons name="download-outline" size={20} color={Colors.white} />
          )}
          <Text style={styles.saveText}>{saving ? '保存中...' : '保存到相册'}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

function guessExt(url: string) {
  const match = url.split('?')[0].match(/\.(jpe?g|png|webp|gif)$/i);
  return match ? match[1].toLowerCase() : 'jpg';
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.96)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width,
    height,
  },
  topBar: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minWidth: 160,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    elevation: 6,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  saveText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
});
