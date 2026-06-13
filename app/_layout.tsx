import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { Colors } from '@/constants/theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 分钟
    },
  },
});

export default function RootLayout() {
  const loadToken = useAuthStore((s) => s.loadToken);

  useEffect(() => {
    loadToken();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: Colors.white },
          headerTintColor: Colors.text,
          headerTitleStyle: { fontWeight: '600' },
          contentStyle: { backgroundColor: Colors.background },
          orientation: 'portrait',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="checkin/create"
          options={{ title: '发布打卡' }}
        />
        <Stack.Screen
          name="checkin/[id]"
          options={{ title: '打卡详情' }}
        />
        <Stack.Screen
          name="anime/[id]"
          options={{ title: '作品详情' }}
        />
        <Stack.Screen
          name="spot/[id]"
          options={{ title: '取景地' }}
        />
        <Stack.Screen
          name="spot-map"
          options={{ title: '取景地地图' }}
        />
        <Stack.Screen
          name="route/[id]"
          options={{ title: '巡礼路径' }}
        />
        <Stack.Screen
          name="profile/routes"
          options={{ title: '我的路径' }}
        />
        <Stack.Screen
          name="profile/checkins"
          options={{ title: '我的打卡' }}
        />
        <Stack.Screen
          name="ar/compare"
          options={{ title: 'AR 对比', headerShown: false, orientation: 'default' }}
        />
        <Stack.Screen
          name="auth/login"
          options={{ title: '登录', presentation: 'modal' }}
        />
        <Stack.Screen
          name="auth/index"
          options={{ headerShown: false, presentation: 'modal' }}
        />
        <Stack.Screen
          name="auth/login-phone"
          options={{ headerShown: false, presentation: 'modal' }}
        />
        <Stack.Screen
          name="auth/register"
          options={{ headerShown: false, presentation: 'modal' }}
        />
        <Stack.Screen
          name="auth/forgot-password"
          options={{ headerShown: false, presentation: 'modal' }}
        />
      </Stack>
    </QueryClientProvider>
  );
}
