import React from 'react';
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/Button';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, devLogin } = useAuthStore();

  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={styles.logo}>巡礼+</Text>
        <Text style={styles.slogan}>跟着前人的脚步，精准巡礼</Text>
        <Button
          title="登录 / 注册"
          size="lg"
          onPress={() => router.push('/auth')}
          style={{ width: '80%', marginTop: Spacing.xxl }}
        />
        {/* 调试登录按钮 */}
        <Button
          title="调试登录（免后端）"
          variant="outline"
          size="md"
          onPress={devLogin}
          style={{ marginTop: Spacing.lg }}
        />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 用户信息卡片 */}
      <View style={styles.profileCard}>
        <View style={styles.profileHeader}>
          <Image
            source={
              user.avatarUrl
                ? { uri: user.avatarUrl }
                : require('../../assets/icon.png')
            }
            style={styles.avatar}
          />
          <View style={styles.userInfo}>
            <Text style={styles.nickname}>{user.nickname}</Text>
            {user.bio ? (
              <Text style={styles.bio} numberOfLines={2}>{user.bio}</Text>
            ) : (
              <Text style={styles.bioEmpty}>暂无简介</Text>
            )}
          </View>
        </View>

        {/* 编辑按钮 */}
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => router.push('/profile/edit')}
        >
          <Ionicons name="pencil" size={16} color={Colors.primary} />
          <Text style={styles.editButtonText}>编辑资料</Text>
        </TouchableOpacity>
      </View>

      {/* 统计 */}
      <View style={styles.statsCard}>
        <TouchableOpacity
          style={styles.stat}
          activeOpacity={0.7}
          onPress={() => router.push('/profile/checkins')}
        >
          <Text style={styles.statValue}>{user.checkInCount || 0}</Text>
          <Text style={styles.statLabel}>打卡</Text>
        </TouchableOpacity>
        <View style={styles.statDivider} />
        <TouchableOpacity
          style={styles.stat}
          activeOpacity={0.7}
          onPress={() => router.push('/profile/routes')}
        >
          <Text style={styles.statValue}>{user.routeCount || 0}</Text>
          <Text style={styles.statLabel}>路径</Text>
        </TouchableOpacity>
      </View>

      {/* 功能菜单 */}
      <View style={styles.menuSection}>
        <Text style={styles.menuTitle}>我的内容</Text>
        <TouchableOpacity
          style={styles.menuItem}
          activeOpacity={0.7}
          onPress={() => router.push('/profile/routes')}
        >
          <View style={styles.menuItemLeft}>
            <Ionicons name="map-outline" size={22} color={Colors.primary} />
            <Text style={styles.menuItemText}>我的路径</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.textLight} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.menuItem}
          activeOpacity={0.7}
          onPress={() => router.push('/profile/checkins')}
        >
          <View style={styles.menuItemLeft}>
            <Ionicons name="camera-outline" size={22} color={Colors.primary} />
            <Text style={styles.menuItemText}>我的打卡</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.textLight} />
        </TouchableOpacity>
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
  profileCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: Colors.surface,
  },
  userInfo: {
    flex: 1,
    marginLeft: Spacing.lg,
  },
  nickname: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  bio: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    lineHeight: 18,
  },
  bioEmpty: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
    marginTop: Spacing.xs,
    fontStyle: 'italic',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.md,
  },
  editButtonText: {
    fontSize: FontSize.md,
    color: Colors.primary,
    fontWeight: '500',
    marginLeft: Spacing.xs,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
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
  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
  },
  menuSection: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  menuTitle: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: FontSize.md,
    color: Colors.text,
    marginLeft: Spacing.md,
  },
});
