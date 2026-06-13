import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { captureRef } from 'react-native-view-shot';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';

import { uploadWaypointPhoto } from '@/api/oss';
import { createCheckIn } from '@/api/checkin';
import { generateFusion } from '@/api/fusion';
import { useCurrentLocation } from '@/hooks/useLocation';
import { useRecordingStore } from '@/stores/recordingStore';
import { Colors, Spacing, FontSize } from '@/constants/theme';

const STITCH_WIDTH = 800;
const STITCH_HEIGHT = 400;

export default function ARCompareScreen() {
  const router = useRouter();
  const { animeImageUrl, spotName, spotId } = useLocalSearchParams<{
    animeImageUrl: string;
    spotName: string;
    spotId: string;
  }>();

  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const [permission, requestPermission] = useCameraPermissions();
  const [opacity, setOpacity] = useState(0.5);
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [stitchedUri, setStitchedUri] = useState<string | null>(null);
  const [stitching, setStitching] = useState(false);
  const [photoType, setPhotoType] = useState<'real' | 'stitched' | 'fusion'>('stitched');
  const [fusionUri, setFusionUri] = useState<string | null>(null);
  const [fusing, setFusing] = useState(false);
  const [content, setContent] = useState('');
  const [publishing, setPublishing] = useState(false);

  const cameraRef = useRef<CameraView>(null);
  const stitchRef = useRef<View>(null);

  // 定位（反作弊核对）与录制态打卡回填
  const { location } = useCurrentLocation();
  const recordingActive = useRecordingStore((s) => s.isRecording);
  const addCheckInId = useRecordingStore((s) => s.addCheckInId);

  // When entering preview, lock to portrait and generate stitch
  useEffect(() => {
    if (capturedUri) {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      generateStitch();
    } else {
      ScreenOrientation.unlockAsync();
    }
    return () => {
      // cleanup on unmount
    };
  }, [capturedUri]);

  async function generateStitch() {
    setStitching(true);
    setStitchedUri(null);
    try {
      // Give the hidden view time to render
      await new Promise(res => setTimeout(res, 500));
      if (stitchRef.current) {
        const uri = await captureRef(stitchRef, { format: 'jpg', quality: 0.85 });
        setStitchedUri(uri);
      }
    } catch (e) {
      console.warn('Stitch failed:', e);
    } finally {
      setStitching(false);
    }
  }

  async function handleCapture() {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (photo?.uri) setCapturedUri(photo.uri);
    } catch (e) {
      Alert.alert('拍摄失败', '请稍后重试');
    }
  }

  async function handlePickFromLibrary() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('未授权', '请允许访问相册');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      setCapturedUri(result.assets[0].uri);
    }
  }

  function handleRetake() {
    setCapturedUri(null);
    setStitchedUri(null);
    setFusionUri(null);
    setFusing(false);
    setContent('');
    setPhotoType('stitched');
  }

  async function handleFusion() {
    if (!capturedUri) return;
    setFusing(true);
    setFusionUri(null);
    try {
      const realUrl = await uploadWaypointPhoto(capturedUri);
      const res = await generateFusion(animeImageUrl, realUrl);
      setFusionUri(res.data.fusionImage);
    } catch (e: any) {
      Alert.alert('生成失败', e?.message ?? '请稍后重试');
    } finally {
      setFusing(false);
    }
  }

  async function handlePublish() {
    if (!spotId) {
      Alert.alert('提示', '缺少景点信息');
      return;
    }
    let uploadUri: string | null =
      photoType === 'fusion' && fusionUri ? fusionUri :
      photoType === 'stitched' && stitchedUri ? stitchedUri :
      capturedUri;
    if (!uploadUri) {
      Alert.alert('提示', '照片尚未准备好');
      return;
    }
    // base64 data URI 不能直接传给 uploadAsync，先写成本地临时文件
    if (uploadUri.startsWith('data:')) {
      const base64 = uploadUri.replace(/^data:image\/\w+;base64,/, '');
      const tmpPath = FileSystem.cacheDirectory + 'fusion_' + Date.now() + '.jpg';
      await FileSystem.writeAsStringAsync(tmpPath, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      uploadUri = tmpPath;
    }
    setPublishing(true);
    try {
      const photoUrl = await uploadWaypointPhoto(uploadUri);
      const res = await createCheckIn({
        spotId: Number(spotId),
        photoUrl,
        comparisonUrl: animeImageUrl,
        content: content.trim() || undefined,
        latitude: location?.latitude,
        longitude: location?.longitude,
      });
      // 录制状态下缓存打卡 id，UploadRouteModal 提交时回填 route_id
      if (recordingActive && res?.data?.id != null) {
        addCheckInId(res.data.id);
      }
      await ScreenOrientation.unlockAsync();
      Alert.alert('发布成功', '打卡已发布！', [{ text: '好的', onPress: () => router.back() }]);
    } catch (e: any) {
      Alert.alert('发布失败', e?.message ?? '请稍后重试');
    } finally {
      setPublishing(false);
    }
  }

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.permText}>需要相机权限以使用 AR 对比功能</Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>授予权限</Text>
        </TouchableOpacity>
      </View>
    );
  }

  /* ── 阶段二：拍摄后预览（竖屏） ── */
  if (capturedUri) {
    const publishDisabled =
      (photoType === 'stitched' && stitching) ||
      (photoType === 'fusion' && (fusing || !fusionUri));

    return (
      <View style={styles.container}>
        {/* 隐藏拼接 View，用于 captureRef */}
        <View
          ref={stitchRef}
          style={styles.hiddenStitch}
          collapsable={false}
        >
          <Image
            source={{ uri: animeImageUrl }}
            style={{ width: STITCH_WIDTH / 2, height: STITCH_HEIGHT }}
            resizeMode="cover"
          />
          <Image
            source={{ uri: capturedUri }}
            style={{ width: STITCH_WIDTH / 2, height: STITCH_HEIGHT }}
            resizeMode="cover"
          />
        </View>

        <ScrollView
          style={styles.previewContainer}
          contentContainerStyle={styles.previewContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* 对比图并排 */}
          <View style={styles.compareRow}>
            <View style={styles.compareHalf}>
              <Image source={{ uri: animeImageUrl }} style={styles.compareImage} resizeMode="cover" />
              <Text style={styles.compareLabel}>动画截图</Text>
            </View>
            <View style={styles.compareHalf}>
              <Image source={{ uri: capturedUri }} style={styles.compareImage} resizeMode="cover" />
              <Text style={styles.compareLabel}>实景拍摄</Text>
            </View>
          </View>

          <Text style={styles.spotTag}>📍 {spotName}</Text>

          {/* 选择发布图片类型 */}
          <View style={styles.photoTypeSection}>
            <Text style={styles.photoTypeLabel}>选择发布图片：</Text>
            <View style={styles.photoTypeRow}>
              <TouchableOpacity
                style={styles.radioOption}
                onPress={() => setPhotoType('real')}
                activeOpacity={0.7}
              >
                <View style={[styles.radioCircle, photoType === 'real' && styles.radioCircleActive]}>
                  {photoType === 'real' && <View style={styles.radioDot} />}
                </View>
                <Text style={[styles.radioLabel, photoType === 'real' && styles.radioLabelActive]}>
                  仅实景图
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.radioOption}
                onPress={() => setPhotoType('stitched')}
                activeOpacity={0.7}
              >
                <View style={[styles.radioCircle, photoType === 'stitched' && styles.radioCircleActive]}>
                  {photoType === 'stitched' && <View style={styles.radioDot} />}
                </View>
                <Text style={[styles.radioLabel, photoType === 'stitched' && styles.radioLabelActive]}>
                  拼接对比图
                  {stitching && <Text style={styles.generatingText}> (生成中...)</Text>}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.radioOption}
                onPress={() => setPhotoType('fusion')}
                activeOpacity={0.7}
              >
                <View style={[styles.radioCircle, photoType === 'fusion' && styles.radioCircleActive]}>
                  {photoType === 'fusion' && <View style={styles.radioDot} />}
                </View>
                <Text style={[styles.radioLabel, photoType === 'fusion' && styles.radioLabelActive]}>
                  融合图
                  {fusing && <Text style={styles.generatingText}> (生成中...)</Text>}
                </Text>
              </TouchableOpacity>
            </View>

            {photoType === 'fusion' && (
              <View style={styles.fusionSection}>
                {fusing ? (
                  <View style={styles.fusionLoadingRow}>
                    <ActivityIndicator size='small' color={Colors.primary} />
                    <Text style={styles.fusionLoadingText}>AI 正在生成融合图，约需 15-30 秒...</Text>
                  </View>
                ) : fusionUri ? (
                  <View style={styles.fusionPreviewRow}>
                    <Image source={{ uri: fusionUri }} style={styles.fusionThumb} resizeMode='cover' />
                    <TouchableOpacity onPress={handleFusion} style={styles.refusionBtn}>
                      <Text style={styles.refusionBtnText}>重新生成</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity onPress={handleFusion} style={styles.fusionBtn} activeOpacity={0.8}>
                    <Text style={styles.fusionBtnText}>生成融合图</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {photoType === 'stitched' && stitching && (
              <View style={styles.stitchLoadingRow}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.stitchLoadingText}>正在生成拼接对比图...</Text>
              </View>
            )}
          </View>

          <TextInput
            style={styles.textInput}
            placeholder="记录你的打卡感受..."
            placeholderTextColor={Colors.textLight}
            value={content}
            onChangeText={setContent}
            multiline
            maxLength={300}
            textAlignVertical="top"
          />

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.retakeBtn} onPress={handleRetake} activeOpacity={0.8}>
              <Text style={styles.retakeBtnText}>重新拍摄</Text>
            </TouchableOpacity>
            {publishing ? (
              <View style={styles.publishingBtn}>
                <ActivityIndicator color={Colors.white} size="small" />
                <Text style={styles.publishBtnText}>发布中...</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.publishBtn, publishDisabled && styles.publishBtnDisabled]}
                onPress={handlePublish}
                activeOpacity={0.8}
                disabled={publishDisabled}
              >
                <Text style={styles.publishBtnText}>发布打卡</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </View>
    );
  }

  /* ── 阶段一：取景器（横/竖屏自适应） ── */
  return (
    <View style={styles.container}>
      {/* 退出按钮（始终左上角） */}
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
        <Text style={styles.backBtnText}>← 退出</Text>
      </TouchableOpacity>

      <CameraView ref={cameraRef} style={styles.camera} facing="back">
        {/* 动画截图叠加层 */}
        <Image
          source={{ uri: animeImageUrl }}
          style={[styles.overlay, { opacity }]}
          resizeMode="contain"
        />

        {/* 透明度控制面板 */}
        <View style={isLandscape ? styles.controlsLandscape : styles.controlsPortrait}>
          <Text style={styles.spotName}>{spotName}</Text>

          <View style={isLandscape ? styles.opacityColLandscape : styles.opacityRowPortrait}>
            <Text style={styles.sliderLabel}>透明度</Text>
            <TouchableOpacity
              style={styles.opacityBtn}
              onPress={() => setOpacity(v => Math.max(0, parseFloat((v - 0.1).toFixed(1))))}>
              <Text style={styles.opacityBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.opacityValue}>{Math.round(opacity * 100)}%</Text>
            <TouchableOpacity
              style={styles.opacityBtn}
              onPress={() => setOpacity(v => Math.min(1, parseFloat((v + 0.1).toFixed(1))))}>
              <Text style={styles.opacityBtnText}>＋</Text>
            </TouchableOpacity>
          </View>

          {/* 竖屏时拍摄按钮在控制面板内底部 */}
          {!isLandscape && (
            <View style={styles.captureBtnRow}>
              <TouchableOpacity style={styles.captureBtn} onPress={handleCapture} activeOpacity={0.8}>
                <View style={styles.captureBtnInner} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.libraryBtn} onPress={handlePickFromLibrary} activeOpacity={0.8}>
                <Text style={styles.libraryBtnText}>📷</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* 横屏时拍摄按钮在右侧中央 */}
        {isLandscape && (
          <View style={styles.captureBtnCol}>
            <TouchableOpacity style={styles.captureBtnLandscape} onPress={handleCapture} activeOpacity={0.8}>
              <View style={styles.captureBtnInner} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.libraryBtnLandscape} onPress={handlePickFromLibrary} activeOpacity={0.8}>
              <Text style={styles.libraryBtnText}>📷</Text>
            </TouchableOpacity>
          </View>
        )}
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.black },
  center: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: Colors.black, padding: Spacing.xxl,
  },
  permText: { color: Colors.white, fontSize: FontSize.md, textAlign: 'center', marginBottom: Spacing.lg },
  permBtn: {
    backgroundColor: Colors.primary, paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md, borderRadius: 24,
  },
  permBtnText: { color: Colors.white, fontSize: FontSize.md, fontWeight: '600' },

  /* viewfinder */
  backBtn: {
    position: 'absolute', top: 52, left: Spacing.lg, zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm, borderRadius: 20,
  },
  backBtnText: { color: Colors.white, fontSize: FontSize.sm, fontWeight: '600' },
  camera: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },

  /* Portrait controls: bottom horizontal */
  controlsPortrait: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.65)', padding: Spacing.lg, paddingBottom: 40,
    alignItems: 'center',
  },
  /* Landscape controls: left side vertical */
  controlsLandscape: {
    position: 'absolute', top: 0, bottom: 0, left: 0,
    width: 120,
    backgroundColor: 'rgba(0,0,0,0.65)', padding: Spacing.md,
    alignItems: 'center', justifyContent: 'center',
  },
  spotName: {
    color: Colors.white, fontSize: FontSize.sm, fontWeight: '700',
    textAlign: 'center', marginBottom: Spacing.md,
  },
  opacityRowPortrait: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.lg,
  },
  opacityColLandscape: {
    flexDirection: 'column', alignItems: 'center', gap: Spacing.sm,
  },
  sliderLabel: { color: Colors.white, fontSize: FontSize.xs },
  opacityBtn: {
    width: 32, height: 32, borderRadius: 16, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)', justifyContent: 'center', alignItems: 'center',
  },
  opacityBtnText: { color: Colors.white, fontSize: FontSize.md, lineHeight: 18 },
  opacityValue: {
    color: Colors.white, fontSize: FontSize.sm, fontWeight: '600',
    minWidth: 40, textAlign: 'center',
  },

  /* Portrait capture button: inside controls panel */
  captureBtn: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.25)', borderWidth: 3,
    borderColor: Colors.white, justifyContent: 'center', alignItems: 'center',
    marginTop: Spacing.sm,
  },
  /* Landscape capture button: flows inside captureBtnCol */
  captureBtnLandscape: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.25)', borderWidth: 3,
    borderColor: Colors.white, justifyContent: 'center', alignItems: 'center',
  },
  captureBtnInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.white },
  captureBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  captureBtnCol: {
    position: 'absolute',
    right: 24,
    top: '50%',
    // 内容高度 = 72 (拍摄) + 12 (gap) + 56 (图库)，上移一半以垂直居中
    marginTop: -70,
    gap: Spacing.md,
    alignItems: 'center',
  },
  libraryBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  libraryBtnLandscape: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  libraryBtnText: {
    fontSize: 24,
  },

  /* preview */
  previewContainer: { flex: 1, backgroundColor: Colors.white },
  previewContent: { padding: Spacing.lg, gap: Spacing.md },
  compareRow: { flexDirection: 'row', gap: Spacing.sm },
  compareHalf: { flex: 1 },
  compareImage: { width: '100%', height: 200, borderRadius: 8, backgroundColor: Colors.surface },
  compareLabel: {
    fontSize: FontSize.xs, color: Colors.textSecondary,
    textAlign: 'center', marginTop: 4,
  },
  spotTag: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '600' },

  /* photo type selector */
  photoTypeSection: {
    backgroundColor: Colors.surface, borderRadius: 8, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  photoTypeLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.sm },
  photoTypeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  radioOption: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  radioCircle: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2,
    borderColor: Colors.border, justifyContent: 'center', alignItems: 'center',
  },
  radioCircleActive: { borderColor: Colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
  radioLabel: { fontSize: FontSize.md, color: Colors.textSecondary },
  radioLabelActive: { color: Colors.primary, fontWeight: '600' },
  generatingText: { fontSize: FontSize.xs, color: Colors.textLight },
  stitchLoadingRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.sm,
  },
  stitchLoadingText: { fontSize: FontSize.xs, color: Colors.textSecondary },

  textInput: {
    backgroundColor: Colors.surface, borderRadius: 8, padding: Spacing.md,
    fontSize: FontSize.md, color: Colors.text, minHeight: 100,
    borderWidth: 1, borderColor: Colors.border,
  },
  actionRow: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
  retakeBtn: {
    flex: 1, paddingVertical: Spacing.md, borderRadius: 24,
    borderWidth: 1, borderColor: Colors.border, alignItems: 'center',
  },
  retakeBtnText: { fontSize: FontSize.md, color: Colors.textSecondary, fontWeight: '600' },
  publishBtn: {
    flex: 2, backgroundColor: Colors.primary, paddingVertical: Spacing.md,
    borderRadius: 24, alignItems: 'center',
  },
  publishBtnDisabled: { opacity: 0.5 },
  publishingBtn: {
    flex: 2, backgroundColor: Colors.primary, paddingVertical: Spacing.md,
    borderRadius: 24, alignItems: 'center', flexDirection: 'row',
    justifyContent: 'center', gap: Spacing.sm,
  },
  publishBtnText: { fontSize: FontSize.md, color: Colors.white, fontWeight: '600' },

  /* fusion */
  fusionSection: { marginTop: Spacing.sm },
  fusionBtn: {
    backgroundColor: Colors.primary, borderRadius: 20,
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg, alignSelf: 'flex-start',
  },
  fusionBtnText: { color: Colors.white, fontSize: FontSize.sm, fontWeight: '600' },
  fusionLoadingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  fusionLoadingText: { fontSize: FontSize.xs, color: Colors.textSecondary, flex: 1 },
  fusionPreviewRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  fusionThumb: { width: 80, height: 80, borderRadius: 8, backgroundColor: Colors.border },
  refusionBtn: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderWidth: 1, borderColor: Colors.primary, borderRadius: 16,
  },
  refusionBtnText: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: '600' },

  /* hidden stitch view */
  hiddenStitch: {
    flexDirection: 'row',
    width: STITCH_WIDTH,
    height: STITCH_HEIGHT,
    position: 'absolute',
    left: -9999,
  },
});
