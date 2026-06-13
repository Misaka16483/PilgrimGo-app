#!/usr/bin/env bash
#
# build.sh — 编译 Xunli 前端(Expo)，产物输出到 output/ 目录
#
# 默认产出 Android APK（expo prebuild + Gradle，release 用 debug key 自动签名，可直接安装）。
#
# 用法:
#   ./build.sh                 # 打 release APK
#   ./build.sh --debug         # 打 debug APK
#   ./build.sh --bundle        # 仅导出 JS bundle（不打 APK）
#   ./build.sh --bundle --platform web   # JS bundle 指定平台 (web|ios|android|all)
#   ./build.sh --no-install    # 跳过依赖安装，复用现有 node_modules
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

OUTPUT_DIR="$SCRIPT_DIR/output"
MODE="apk"          # apk | bundle
VARIANT="release"   # release | debug
PLATFORM="all"      # bundle 模式平台
INSTALL=true
while [ $# -gt 0 ]; do
  case "$1" in
    --debug)      VARIANT="debug"; shift ;;
    --bundle)     MODE="bundle"; shift ;;
    --platform)   PLATFORM="$2"; shift 2 ;;
    --no-install) INSTALL=false; shift ;;
    *) echo "未知参数: $1" >&2; exit 2 ;;
  esac
done

# 编译前安装依赖(本仓库 peer deps 冲突，须 --legacy-peer-deps)
if [ "$INSTALL" = true ]; then
  if [ -f package-lock.json ]; then
    echo "==> 安装依赖 (npm ci --legacy-peer-deps)"
    npm ci --legacy-peer-deps
  else
    echo "==> 安装依赖 (npm install --legacy-peer-deps)"
    npm install --legacy-peer-deps
  fi
else
  echo "==> 跳过依赖安装 (--no-install)"
fi

echo "==> 清理 output/"
rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

# ---- JS bundle 模式 ----
if [ "$MODE" = "bundle" ]; then
  echo "==> Expo 导出 bundle (platform=$PLATFORM)"
  npx expo export --platform "$PLATFORM" --output-dir "$OUTPUT_DIR" --clear
  echo ""
  echo "==> 构建完成，产物位于 $OUTPUT_DIR :"
  ls -lh "$OUTPUT_DIR"
  exit 0
fi

# ---- Android APK 模式 ----
# 定位 Android SDK
SDK=""
for cand in "${ANDROID_HOME:-}" "${ANDROID_SDK_ROOT:-}" "$HOME/Library/Android/sdk"; do
  if [ -n "$cand" ] && [ -d "$cand" ]; then SDK="$cand"; break; fi
done
if [ -z "$SDK" ]; then
  echo "未找到 Android SDK。请安装 Android Studio，或设置 ANDROID_HOME 指向 SDK 目录。" >&2
  exit 1
fi
export ANDROID_HOME="$SDK"
export ANDROID_SDK_ROOT="$SDK"
echo "==> 使用 Android SDK: $SDK"

command -v java >/dev/null 2>&1 || { echo "未找到 java，请安装 JDK 17+。" >&2; exit 1; }

echo "==> 生成原生 Android 工程 (expo prebuild --clean)"
npx expo prebuild --platform android --clean

# 写入 sdk.dir，保证 Gradle 找得到 SDK
printf 'sdk.dir=%s\n' "$SDK" > android/local.properties
chmod +x android/gradlew

# Gradle 任务：assembleRelease / assembleDebug
TASK="assembleRelease"
[ "$VARIANT" = "debug" ] && TASK="assembleDebug"
echo "==> Gradle 打包 ($TASK) — 首次较慢"
( cd android && ./gradlew "$TASK" )

# 收集 APK
APK_SRC="$(find android/app/build/outputs/apk/"$VARIANT" -name '*.apk' 2>/dev/null | head -n1)"
if [ -z "$APK_SRC" ]; then
  echo "未找到生成的 APK，构建失败" >&2
  exit 1
fi
VERSION="$(node -p "require('./app.json').expo.version" 2>/dev/null || echo "0.0.0")"
APK_OUT="$OUTPUT_DIR/PilgrimGo-${VERSION}-${VARIANT}.apk"
cp "$APK_SRC" "$APK_OUT"

echo ""
echo "==> 构建完成，产物位于 $OUTPUT_DIR :"
ls -lh "$OUTPUT_DIR"
echo ""
echo "安装到已连接设备: adb install -r \"$APK_OUT\""
[ "$VARIANT" = "release" ] && echo "（release 用 debug key 签名，可直接安装；正式发布需配置自有 keystore）"
