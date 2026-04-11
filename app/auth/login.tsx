import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/Button';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { login, register } = useAuthStore();

  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('提示', '请输入用户名和密码');
      return;
    }
    if (isRegister && !nickname.trim()) {
      Alert.alert('提示', '请输入昵称');
      return;
    }

    setLoading(true);
    try {
      if (isRegister) {
        await register(username.trim(), password, nickname.trim());
      } else {
        await login(username.trim(), password);
      }
      router.back();
    } catch (e: any) {
      Alert.alert('错误', e?.response?.data?.message || '操作失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.form}>
        <Text style={styles.logo}>巡礼+</Text>
        <Text style={styles.subtitle}>
          {isRegister ? '创建账号' : '登录'}
        </Text>

        <TextInput
          style={styles.input}
          placeholder="用户名"
          placeholderTextColor={Colors.textLight}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="密码"
          placeholderTextColor={Colors.textLight}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {isRegister && (
          <TextInput
            style={styles.input}
            placeholder="昵称"
            placeholderTextColor={Colors.textLight}
            value={nickname}
            onChangeText={setNickname}
          />
        )}

        <Button
          title={isRegister ? '注册' : '登录'}
          size="lg"
          onPress={handleSubmit}
          loading={loading}
          style={{ marginTop: Spacing.lg }}
        />

        <Button
          title={isRegister ? '已有账号？去登录' : '没有账号？去注册'}
          variant="outline"
          onPress={() => setIsRegister(!isRegister)}
          style={{ marginTop: Spacing.md }}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
    justifyContent: 'center',
  },
  form: {
    padding: Spacing.xxl,
  },
  logo: {
    fontSize: FontSize.title,
    fontWeight: '800',
    color: Colors.primary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSize.lg,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xxl,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
});
