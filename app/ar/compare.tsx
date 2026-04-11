import React, { useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams } from 'expo-router';

import { Button } from '@/components/Button';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';

/**
 * AR 场景对比页面
 * MVP 版本：摄像头画面上叠加动画截图，通过滑块调整透明度（洋葱皮效果）
 */
export default function ARCompareScreen() {
  const { animeImageUrl, spotName } = useLocalSearchParams<{
    animeImageUrl: string;
    spotName: string;
  }>();

  const [permission, requestPermission] = useCameraPermissions();
  const [opacity, setOpacity] = useState(0.5);

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.permText}>需要相机权限以使用 AR 对比功能</Text>
        <Button title="授予权限" onPress={requestPermission} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 摄像头实时画面 */}
      <CameraView style={styles.camera} facing="back">
        {/* 动画截图叠加层 */}
        <Image
          source={{ uri: animeImageUrl }}
          style={[styles.overlay, { opacity }]}
          resizeMode="contain"
        />

        {/* 控制面板 */}
        <View style={styles.controls}>
          <Text style={styles.spotName}>{spotName}</Text>

          <View style={styles.sliderRow}>
            <Text style={styles.sliderLabel}>透明度</Text>
            <View style={styles.sliderWrapper}>
              {/* Slider 需要额外安装 @react-native-community/slider */}
              {/* MVP 阶段可先用简单的 +/- 按钮替代 */}
              <View style={styles.opacityButtons}>
                <Button
                  title="-"
                  size="sm"
                  variant="outline"
                  onPress={() => setOpacity(Math.max(0, opacity - 0.1))}
                />
                <Text style={styles.opacityValue}>{Math.round(opacity * 100)}%</Text>
                <Button
                  title="+"
                  size="sm"
                  variant="outline"
                  onPress={() => setOpacity(Math.min(1, opacity + 0.1))}
                />
              </View>
            </View>
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.black,
    padding: Spacing.xxl,
  },
  permText: {
    color: Colors.white,
    fontSize: FontSize.md,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  spotName: {
    color: Colors.white,
    fontSize: FontSize.lg,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sliderLabel: {
    color: Colors.white,
    fontSize: FontSize.sm,
    marginRight: Spacing.md,
  },
  sliderWrapper: {
    flex: 1,
  },
  opacityButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
  },
  opacityValue: {
    color: Colors.white,
    fontSize: FontSize.lg,
    fontWeight: '600',
    minWidth: 50,
    textAlign: 'center',
  },
});
