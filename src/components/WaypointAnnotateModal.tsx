import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Button } from './Button';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import type { GeoPoint } from '@/types';

interface Props {
  visible: boolean;
  /** 当前 GPS 位置；为 null 时禁用保存。 */
  location: GeoPoint | null;
  onClose: () => void;
  /** 仅记录本地图片 URI 与描述；正式上传等到整条路径录制完再统一进行。 */
  onSaved: (waypoint: { location: GeoPoint; localUri: string; description: string }) => void;
}

export function WaypointAnnotateModal({ visible, location, onClose, onSaved }: Props) {
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (visible) {
      setLocalUri(null);
      setDescription('');
    }
  }, [visible]);

  const pickFrom = async (source: 'camera' | 'library') => {
    const perm =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('未授权', source === 'camera' ? '请允许使用相机' : '请允许访问相册');
      return;
    }
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 0.8,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.8,
          });
    if (!result.canceled && result.assets.length > 0) {
      setLocalUri(result.assets[0].uri);
    }
  };

  const handleSave = () => {
    if (!location) {
      Alert.alert('无法保存', '当前未获取到 GPS 位置');
      return;
    }
    if (!localUri) {
      Alert.alert('请先选择图片', '转折点至少需要一张照片');
      return;
    }
    if (!description.trim()) {
      Alert.alert('请填写描述', '帮助其他巡礼者理解这个转折点');
      return;
    }
    onSaved({ location, localUri, description: description.trim() });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>添加转折点标注</Text>
            <Text style={styles.subtitle}>
              图片与描述会随整条路径一并发布
            </Text>

            {localUri ? (
              <TouchableOpacity
                style={styles.preview}
                onPress={() => setLocalUri(null)}
              >
                <Image source={{ uri: localUri }} style={styles.previewImage} />
                <View style={styles.previewOverlay}>
                  <Text style={styles.previewHint}>点击重新选择</Text>
                </View>
              </TouchableOpacity>
            ) : (
              <View style={styles.pickerRow}>
                <TouchableOpacity
                  style={styles.pickerCard}
                  onPress={() => pickFrom('camera')}
                >
                  <Text style={styles.pickerEmoji}>📷</Text>
                  <Text style={styles.pickerLabel}>拍照</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.pickerCard}
                  onPress={() => pickFrom('library')}
                >
                  <Text style={styles.pickerEmoji}>🖼️</Text>
                  <Text style={styles.pickerLabel}>从相册选择</Text>
                </TouchableOpacity>
              </View>
            )}

            <Text style={styles.label}>转折点描述</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={description}
              onChangeText={setDescription}
              placeholder="例如：在第二个红绿灯左转，可以看到取景里的便利店"
              placeholderTextColor={Colors.textSecondary}
              multiline
              numberOfLines={4}
              maxLength={300}
            />

            {location ? (
              <Text style={styles.coord}>
                位置：{location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
              </Text>
            ) : (
              <Text style={[styles.coord, { color: Colors.error }]}>未获取到 GPS 位置</Text>
            )}

            <View style={styles.actions}>
              <Button
                title="取消"
                variant="outline"
                onPress={onClose}
                style={{ flex: 1, marginRight: Spacing.md }}
              />
              <Button title="保存" onPress={handleSave} style={{ flex: 1 }} />
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
  },
  subtitle: {
    marginTop: 4,
    marginBottom: Spacing.lg,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  pickerRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  pickerCard: {
    flex: 1,
    aspectRatio: 1.4,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerEmoji: {
    fontSize: 32,
  },
  pickerLabel: {
    marginTop: Spacing.sm,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  preview: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  previewImage: {
    width: '100%',
    aspectRatio: 1.4,
    backgroundColor: Colors.surface,
  },
  previewOverlay: {
    position: 'absolute',
    right: Spacing.sm,
    bottom: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  previewHint: {
    color: Colors.white,
    fontSize: FontSize.xs,
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
  coord: {
    marginTop: Spacing.sm,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    marginTop: Spacing.xl,
  },
});
