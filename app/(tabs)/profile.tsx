import React from 'react';
import { View, Text, Image, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/Button';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={styles.logo}>巡礼+</Text>
        <Text style={styles.slogan}>跟着前人的脚步，精准巡礼</Text>
        <Button
          title="登录 / 注册"
          size="lg"
          onPress={() => router.push('/auth/login')}
          style={{ width: '80%', marginTop: Spacing.xxl }}
        />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 用户信息 */}
      <View style={styles.profileHeader}>
        <Image
          source={
            user.avatarUrl
              ? { uri: user.avatarUrl }
              : require('../../assets/icon.png')
          }
          style={styles.avatar}
        />
        <Text style={styles.nickname}>{user.nickname}</Text>
        {user.bio && <Text style={styles.bio}>{user.bio}</Text>}
      </View>

      {/* 统计 */}
      <View style={styles.statsCard}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{user.checkInCount}</Text>
          <Text style={styles.statLabel}>打卡</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>{user.routeCount}</Text>
          <Text style={styles.statLabel}>路径</Text>
        </View>
      </View>

      {/* 操作 */}
      <Button
        title="退出登录"
        variant="outline"
        onPress={logout}
        style={{ marginTop: Spacing.xxxl }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  content: {
    padding: Spacing.lg,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xxl,
    backgroundColor: Colors.white,
  },
  logo: {
    fontSize: FontSize.title,
    fontWeight: '800',
    color: Colors.primary,
  },
  slogan: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surface,
  },
  nickname: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    color: Colors.text,
    marginTop: Spacing.md,
  },
  bio: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    elevation: 2,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: FontSize.xxxl,
    fontWeight: '700',
    color: Colors.primary,
  },
  statLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  divider: {
    width: 1,
    backgroundColor: Colors.border,
  },
});
