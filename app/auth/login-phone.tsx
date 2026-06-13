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
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/Button';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';

const COUNTDOWN_SECONDS = 60;

export default function LoginPhoneScreen() {
  const router = useRouter();
  const { loginWithPhone, sendSmsCode } = useAuthStore();

  const [phone, setPhone] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [sending, setSending] = useState(false);

  const isPhoneValid = /^1[3-9]\d{9}$/.test(phone);
  const isSmsCodeValid = /^\d{4}$/.test(smsCode);

  const startCountdown = useCallback(() => {
    setCountdown(COUNTDOWN_SECONDS);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const handleSendSmsCode = async () => {
    if (!isPhoneValid) {
      Alert.alert('提示', '请输入正确的手机号');
      return;
    }

    setSending(true);
    try {
      await sendSmsCode(phone, 'LOGIN');
      Alert.alert('成功', '验证码已发送');
      startCountdown();
    } catch (e: any) {
      Alert.alert('错误', e?.message || '发送失败，请稍后重试');
    } finally {
      setSending(false);
    }
  };

  const handleLogin = async () => {
    if (!isPhoneValid) {
      Alert.alert('提示', '请输入正确的手机号');
      return;
    }
    if (!isSmsCodeValid) {
      Alert.alert('提示', '请输入4位验证码');
      return;
    }

    setLoading(true);
    try {
      await loginWithPhone(phone, smsCode);
      Alert.alert('成功', '登录成功');
      router.back();
    } catch (e: any) {
      Alert.alert('错误', e?.message || '登录失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Text style={styles.title}>手机号登录</Text>
        <Text style={styles.subtitle}>请输入手机号获取验证码</Text>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>手机号</Text>
            <TextInput
              style={styles.input}
              placeholder="请输入手机号"
              placeholderTextColor={Colors.textLight}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              maxLength={11}
              autoFocus
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>验证码</Text>
            <View style={styles.smsCodeRow}>
              <TextInput
                style={[styles.input, styles.smsCodeInput]}
                placeholder="请输入验证码"
                placeholderTextColor={Colors.textLight}
                value={smsCode}
                onChangeText={setSmsCode}
                keyboardType="number-pad"
                maxLength={6}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (countdown > 0 || sending || !isPhoneValid) && styles.sendButtonDisabled,
                ]}
                onPress={handleSendSmsCode}
                disabled={countdown > 0 || sending || !isPhoneValid}
              >
                <Text style={styles.sendButtonText}>
                  {countdown > 0 ? `${countdown}s` : sending ? '发送中...' : '获取验证码'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <Button
            title="登录"
            size="lg"
            onPress={handleLogin}
            loading={loading}
            disabled={!isPhoneValid || !isSmsCodeValid}
            style={{ marginTop: Spacing.xxl }}
          />
        </View>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>返回</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  content: {
    flex: 1,
    padding: Spacing.xxl,
    paddingTop: Spacing.xxxl * 3,
  },
  title: {
    fontSize: FontSize.xxxl,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginBottom: Spacing.xxl,
  },
  form: {
    gap: Spacing.lg,
  },
  inputGroup: {
    gap: Spacing.sm,
  },
  label: {
    fontSize: FontSize.md,
    fontWeight: '500',
    color: Colors.text,
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
  smsCodeRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  smsCodeInput: {
    flex: 1,
  },
  sendButton: {
    height: 48,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 120,
  },
  sendButtonDisabled: {
    backgroundColor: Colors.primaryLight,
  },
  sendButtonText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: '500',
  },
  backButton: {
    marginTop: Spacing.xxl,
    alignSelf: 'center',
  },
  backButtonText: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
  },
});
