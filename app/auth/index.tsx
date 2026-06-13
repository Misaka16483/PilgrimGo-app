import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { Button } from '@/components/Button';
import { useAuthStore } from '@/stores/authStore';

export default function AuthIndexScreen() {
  const router = useRouter();
  const { devLogin } = useAuthStore();

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Logo */}
        <Image
          source={require('../../assets/icon.png')}
          style={styles.logo}
        />
        <Text style={styles.title}>巡礼+</Text>
        <Text style={styles.slogan}>跟着前人的脚步，精准巡礼</Text>

        {/* 登录选项 */}
        <View style={styles.buttonGroup}>
          <Button
            title="手机号登录"
            size="lg"
            onPress={() => router.push('/auth/login-phone')}
            style={styles.button}
          />
          <Button
            title="账号密码登录"
            variant="outline"
            size="lg"
            onPress={() => router.push('/auth/login')}
            style={styles.button}
          />
          <Button
            title="注册账号"
            variant="outline"
            size="lg"
            onPress={() => router.push('/auth/register')}
            style={styles.button}
          />
        </View>

        {/* 其他选项 */}
        <TouchableOpacity
          style={styles.forgotPassword}
          onPress={() => router.push('/auth/forgot-password')}
        >
          <Text style={styles.forgotPasswordText}>忘记密码？</Text>
        </TouchableOpacity>

        {/* 调试登录 */}
        <TouchableOpacity
          style={styles.devLogin}
          onPress={devLogin}
        >
          <Text style={styles.devLoginText}>调试登录（免后端）</Text>
        </TouchableOpacity>
      </View>

      {/* 返回按钮 */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Text style={styles.backButtonText}>返回</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xxl,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 20,
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: FontSize.title,
    fontWeight: '800',
    color: Colors.primary,
    marginBottom: Spacing.sm,
  },
  slogan: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginBottom: Spacing.xxxl,
  },
  buttonGroup: {
    width: '100%',
    gap: Spacing.lg,
  },
  button: {
    width: '100%',
  },
  forgotPassword: {
    marginTop: Spacing.xl,
  },
  forgotPasswordText: {
    fontSize: FontSize.md,
    color: Colors.primary,
  },
  devLogin: {
    marginTop: Spacing.xxl,
  },
  devLoginText: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
  },
  backButton: {
    position: 'absolute',
    bottom: Spacing.xxl,
    alignSelf: 'center',
  },
  backButtonText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
});
