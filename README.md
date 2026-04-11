# PilgrimGo 前端环境配置指南

## 一、项目简介

PilgrimGo（巡礼+）是一款动画巡礼移动端应用，基于以下技术栈开发：

- **框架**：React Native + Expo SDK 54
- **语言**：TypeScript
- **路由**：expo-router（文件系统路由）
- **状态管理**：Zustand
- **网络请求**：Axios + TanStack Query
- **地图**：react-native-maps
- **后端对接**：Spring Boot + PostgreSQL（后端仓库另见）

---

## 二、环境准备

### 1. 安装 Node.js

需要 Node.js **18 或以上版本**（当前开发使用 v25.8.2）。

- macOS 推荐用 Homebrew：
  ```bash
  brew install node
  ```
- Windows 推荐从官网下载 LTS 版本：https://nodejs.org/
- 验证安装：
  ```bash
  node -v   # 应输出 v18.x 或更高
  npm -v    # 应输出 9.x 或更高
  ```

### 2. 安装 Android Studio（Android 开发）

1. 下载安装 Android Studio：https://developer.android.com/studio
2. 安装过程中勾选 **Android SDK**、**Android SDK Platform-Tools**、**Android Emulator**
3. 安装完成后，打开 Android Studio → More Actions → **SDK Manager**：
   - SDK Platforms 选项卡：勾选 **Android 15 (VanillaIceCream)** 或最新版本
   - SDK Tools 选项卡：确保勾选 **Android SDK Build-Tools**、**Android Emulator**、**Android SDK Platform-Tools**
4. 配置环境变量（**重要**）：

   **macOS**（在 `~/.zshrc` 或 `~/.bash_profile` 中添加）：
   ```bash
   export ANDROID_HOME=$HOME/Library/Android/sdk
   export PATH=$PATH:$ANDROID_HOME/emulator
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   ```
   添加后执行 `source ~/.zshrc` 生效。

   **Windows**（系统环境变量）：
   ```
   ANDROID_HOME = C:\Users\你的用户名\AppData\Local\Android\Sdk
   PATH 中添加：%ANDROID_HOME%\emulator 和 %ANDROID_HOME%\platform-tools
   ```

5. 创建模拟器：Android Studio → More Actions → **Virtual Device Manager** → Create Device → 选一个机型（推荐 Pixel 8）→ 下载系统镜像 → 完成

### 3. 安装 Xcode（仅 macOS，iOS 开发）

> 如果你只做 Android 端，可以跳过这步。

1. 从 Mac App Store 安装 Xcode
2. 打开 Xcode → Settings → Platforms → 确保安装了 iOS Simulator
3. 安装命令行工具：
   ```bash
   xcode-select --install
   ```

### 4. 安装 Expo Go（真机调试）

在手机应用商店搜索 **Expo Go** 并安装：
- iOS：App Store 搜索 "Expo Go"
- Android：Google Play 搜索 "Expo Go"

> 真机调试需要手机和电脑在**同一个 WiFi 网络**下。

---

## 三、拉取代码并安装依赖

```bash
# 1. 克隆仓库
git clone https://github.com/Misaka16483/PilgrimGo-app.git
cd PilgrimGo-app

# 2. 安装依赖
npm install --legacy-peer-deps
```

> 必须加 `--legacy-peer-deps`，否则会因为 peer dependency 冲突报错。

---

## 四、配置后端地址

编辑 `src/constants/api.ts`，将开发环境的 IP 改为你本机的局域网 IP：

```typescript
export const API_BASE_URL = __DEV__
  ? 'http://你的电脑IP:8080/api'   // 改成运行后端的机器的局域网 IP
  : 'https://api.pilgrimgo.com/api';
```

查看本机 IP：
- macOS：`ifconfig | grep "inet " | grep -v 127.0.0.1`
- Windows：`ipconfig`，找 "IPv4 地址"

> 不能用 `localhost` 或 `127.0.0.1`，因为模拟器/手机访问不到电脑的 localhost。Android 模拟器可以用 `10.0.2.2` 代替电脑的 localhost。

---

## 五、启动项目

```bash
# 启动 Expo 开发服务器
npm start
```

启动后终端会显示二维码和操作菜单：

| 按键 | 功能 |
|------|------|
| `a`  | 打开 Android 模拟器 |
| `i`  | 打开 iOS 模拟器（仅 macOS） |
| `r`  | 重新加载 App |
| `m`  | 打开开发者菜单 |

**真机调试**：用 Expo Go 扫描终端中的二维码即可。

---

## 六、项目结构速览

```
PilgrimGo-app/
├── app/                        # 页面（文件系统路由，文件名即路由路径）
│   ├── _layout.tsx             # 根布局
│   ├── (tabs)/                 # 底部 Tab 页
│   │   ├── index.tsx           # 发现 - 动画作品列表
│   │   ├── map.tsx             # 地图 - 附近取景地
│   │   ├── record.tsx          # 录制 - GPS 路径录制
│   │   └── profile.tsx         # 我的 - 个人中心
│   ├── anime/[id].tsx          # 作品详情页
│   ├── spot/[id].tsx           # 取景地详情页
│   ├── route/[id].tsx          # 巡礼路径详情页
│   ├── ar/compare.tsx          # AR 场景对比页
│   └── auth/login.tsx          # 登录注册页
│
├── src/                        # 业务逻辑
│   ├── api/                    # 后端接口调用（对应 Spring Boot 的 Controller）
│   ├── stores/                 # Zustand 全局状态
│   ├── components/             # 通用 UI 组件
│   ├── hooks/                  # 自定义 Hooks
│   ├── types/                  # TypeScript 类型定义
│   ├── utils/                  # 工具函数
│   └── constants/              # 常量配置（主题、API 地址）
│
├── assets/                     # 静态资源（图标、启动图）
├── app.json                    # Expo 配置
├── package.json                # 依赖和脚本
└── tsconfig.json               # TypeScript 配置
```

---

## 七、常见问题

### Q: `npm install` 报 ERESOLVE 错误
加 `--legacy-peer-deps` 参数：
```bash
npm install --legacy-peer-deps
```

### Q: 启动时报 "Cannot find module 'react-native-worklets/plugin'"
```bash
npx expo install react-native-worklets
```

### Q: 启动时报端口被占用
停掉之前的 Expo 进程（Ctrl+C），或者换端口启动：
```bash
npx expo start --port 8082
```

### Q: Android 模拟器连不上 / 报 "Failed to resolve Android SDK path"
检查 `ANDROID_HOME` 环境变量是否正确配置，参考上面第二步。

### Q: 修改代码后页面没变化
在终端按 `r` 重新加载。如果还是不行，清缓存重启：
```bash
npx expo start --clear
```
