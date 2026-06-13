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
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/Button';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';

const COUNTDOWN_SECONDS = 60;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { forgotPassword, sendSmsCode } = useAuthStore();

  const [phone, setPhone] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [sending, setSending] = useState(false);

  const isPhoneValid = /^1[3-9]\d{9}$/.test(phone);
  const isSmsCodeValid = /^\d{4}$/.test(smsCode);
  const isPasswordValid = newPassword.length >= 6 && newPassword.length <= 20;
  const isConfirmValid = confirmPassword === newPassword && confirmPassword.length > 0;

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
      // 使用 LOGIN 类型发送验证码，因为找回密码需要验证手机号
      await sendSmsCode(phone, 'LOGIN');
      Alert.alert('成功', '验证码已发送');
      startCountdown();
    } catch (e: any) {
      Alert.alert('错误', e?.message || '发送失败，请稍后重试');
    } finally {
      setSending(false);
    }
  };

  const handleResetPassword = async () => {
    if (!isPhoneValid) {
      Alert.alert('提示', '请输入正确的手机号');
      return;
    }
    if (!isSmsCodeValid) {
      Alert.alert('提示', '请输入4位验证码');
      return;
    }
    if (!isPasswordValid) {
      Alert.alert('提示', '密码需在6-20个字符之间');
      return;
    }
    if (!isConfirmValid) {
      Alert.alert('提示', '两次输入的密码不一致');
      return;
    }

    setLoading(true);
    try {
      await forgotPassword(phone, smsCode, newPassword);
      Alert.alert('成功', '密码重置成功，请重新登录', [
        { text: '确定', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('错误', e?.message || '重置失败，请稍后重试');
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
        <Text style={styles.title}>找回密码</Text>
        <Text style={styles.subtitle}>验证手机号后重置密码</Text>

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

          <View style={styles.inputGroup}>
            <Text style={styles.label}>新密码</Text>
            <TextInput
              style={styles.input}
              placeholder="请输入新密码（6-20个字符）"
              placeholderTextColor={Colors.textLight}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              maxLength={20}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>确认密码</Text>
            <TextInput
              style={styles.input}
              placeholder="请再次输入新密码"
              placeholderTextColor={Colors.textLight}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              maxLength={20}
            />
          </View>

          <Button
            title="重置密码"
            size="lg"
            onPress={handleResetPassword}
            loading={loading}
            disabled={!isPhoneValid || !isSmsCodeValid || !isPasswordValid || !isConfirmValid}
            style={{ marginTop: Spacing.xxl }}
          />
        </View>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>返回登录</Text>
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
