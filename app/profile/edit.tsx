import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/Button';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import * as ImagePicker from 'expo-image-picker';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, updateUserInfo, uploadAvatar } = useAuthStore();

  const [nickname, setNickname] = useState(user?.nickname || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarUri, setAvatarUri] = useState(user?.avatarUrl || '');
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const isNicknameValid = nickname.trim().length >= 2 && nickname.trim().length <= 20;
  const isBioValid = bio.length <= 200;
  const hasChanges = nickname !== user?.nickname || bio !== user?.bio || avatarUri !== user?.avatarUrl;

  const handlePickImage = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const selectedUri = result.assets[0].uri;
        setAvatarUri(selectedUri);
        
        // 上传头像
        setUploadingAvatar(true);
        try {
          await uploadAvatar(selectedUri);
          Alert.alert('成功', '头像已更新');
        } catch (e: any) {
          Alert.alert('错误', e?.message || '头像上传失败');
          // 恢复原来的头像
          setAvatarUri(user?.avatarUrl || '');
        } finally {
          setUploadingAvatar(false);
        }
      }
    } catch (e) {
      Alert.alert('错误', '选择图片失败');
    }
  }, [uploadAvatar, user?.avatarUrl]);

  const handleSave = async () => {
    if (!isNicknameValid) {
      Alert.alert('提示', '昵称需在2-20个字符之间');
      return;
    }
    if (!isBioValid) {
      Alert.alert('提示', '简介不能超过200个字符');
      return;
    }

    setLoading(true);
    try {
      await updateUserInfo({
        nickname: nickname.trim(),
        bio: bio.trim() || undefined,
      });
      Alert.alert('成功', '个人信息已更新');
      router.back();
    } catch (e: any) {
      Alert.alert('错误', e?.message || '更新失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>编辑资料</Text>

        {/* 头像 */}
        <View style={styles.avatarSection}>
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={handlePickImage}
            disabled={uploadingAvatar}
          >
            <Image
              source={
                avatarUri
                  ? { uri: avatarUri }
                  : require('../../assets/icon.png')
              }
              style={styles.avatar}
            />
            {uploadingAvatar && (
              <View style={styles.avatarOverlay}>
                <Text style={styles.avatarOverlayText}>上传中...</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={handlePickImage} disabled={uploadingAvatar}>
            <Text style={styles.changeAvatarText}>更换头像</Text>
          </TouchableOpacity>
        </View>

        {/* 表单 */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>昵称</Text>
            <TextInput
              style={styles.input}
              placeholder="请输入昵称（2-20个字符）"
              placeholderTextColor={Colors.textLight}
              value={nickname}
              onChangeText={setNickname}
              maxLength={20}
              autoFocus
            />
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>个人简介</Text>
              <Text style={styles.charCount}>{bio.length}/200</Text>
            </View>
            <TextInput
              style={[styles.input, styles.bioInput]}
              placeholder="介绍一下你自己（选填）"
              placeholderTextColor={Colors.textLight}
              value={bio}
              onChangeText={setBio}
              maxLength={200}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>

        <Button
          title="保存"
          size="lg"
          onPress={handleSave}
          loading={loading}
          disabled={!isNicknameValid || !hasChanges}
          style={{ marginTop: Spacing.xxl }}
        />

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>取消</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.xxl,
    paddingTop: Spacing.xxxl * 2,
  },
  title: {
    fontSize: FontSize.xxxl,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.xxl,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  avatarContainer: {
    position: 'relative',
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarOverlayText: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  changeAvatarText: {
    color: Colors.primary,
    fontSize: FontSize.md,
    fontWeight: '500',
    marginTop: Spacing.md,
  },
  form: {
    gap: Spacing.lg,
  },
  inputGroup: {
    gap: Spacing.sm,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: FontSize.md,
    fontWeight: '500',
    color: Colors.text,
  },
  charCount: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    fontSize: FontSize.md,
    color: Colors.text,
    backgroundColor: Colors.surface,
  },
  bioInput: {
    height: 100,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  backButton: {
    marginTop: Spacing.lg,
    alignSelf: 'center',
  },
  backButtonText: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
  },
});
