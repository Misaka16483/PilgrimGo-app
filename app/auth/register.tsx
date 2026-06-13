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

export default function RegisterScreen() {
  const router = useRouter();
  const { registerWithPhone, sendSmsCode } = useAuthStore();

  const [phone, setPhone] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [sending, setSending] = useState(false);

  const isPhoneValid = /^1[3-9]\d{9}$/.test(phone);
  const isSmsCodeValid = /^\d{4}$/.test(smsCode);
  const isPasswordValid = password.length >= 6 && password.length <= 20;
  const isNicknameValid = nickname.trim().length >= 2 && nickname.trim().length <= 20;

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
      await sendSmsCode(phone, 'REGISTER');
      Alert.alert('成功', '验证码已发送');
      startCountdown();
    } catch (e: any) {
      Alert.alert('错误', e?.message || '发送失败，请稍后重试');
    } finally {
      setSending(false);
    }
  };

  const handleRegister = async () => {
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
    if (!isNicknameValid) {
      Alert.alert('提示', '昵称需在2-20个字符之间');
      return;
    }

    setLoading(true);
    try {
      await registerWithPhone(phone, smsCode, password, nickname.trim());
      Alert.alert('成功', '注册成功');
      router.back();
    } catch (e: any) {
      Alert.alert('错误', e?.message || '注册失败，请稍后重试');
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
        <Text style={styles.title}>注册账号</Text>
        <Text style={styles.subtitle}>创建你的巡礼+账号</Text>

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
            <Text style={styles.label}>密码</Text>
            <TextInput
              style={styles.input}
              placeholder="请输入密码（6-20个字符）"
              placeholderTextColor={Colors.textLight}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              maxLength={20}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>昵称</Text>
            <TextInput
              style={styles.input}
              placeholder="请输入昵称（2-20个字符）"
              placeholderTextColor={Colors.textLight}
              value={nickname}
              onChangeText={setNickname}
              maxLength={20}
            />
          </View>

          <Button
            title="注册"
            size="lg"
            onPress={handleRegister}
            loading={loading}
            disabled={!isPhoneValid || !isSmsCodeValid || !isPasswordValid || !isNicknameValid}
            style={{ marginTop: Spacing.xxl }}
          />
        </View>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>已有账号？去登录</Text>
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
