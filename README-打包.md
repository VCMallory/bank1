# 丰收互联：Android 与 iOS 构建

项目目录为 `app/`，使用 React + Capacitor。原生安装包采用独立全屏入口 `app/native.html`；浏览器预览仍保留模板提供的设备外框。

当前版本为 1.5（build 7）。所有原生页面的首部背景延伸覆盖系统状态栏；新增或修改交易后，明细自动切到对应账户和月份。旧版交易与 JSON 备份保持兼容，无需恢复默认数据。

本项目是本地界面演示，应用名为“丰收互联”。金额、流水及图片修改只保存在设备内，不连接银行系统。

## Android APK

前提：Node.js 22、JDK 21、Android SDK Platform 36 和 Build Tools 36.0.0。

```powershell
cd app
npm ci
npm run build:native
npx cap sync android
cd android
.\gradlew.bat assembleDebug
```

输出：`app/android/app/build/outputs/apk/debug/app-debug.apk`。这是 Gradle 自动调试签名的可安装 APK，不是应用商店发行签名。正式发布时请配置自己的 release keystore，勿将 keystore 或密码提交到 GitHub。

## iPhone 未签名 IPA

仓库中的 `.github/workflows/build-mobile.yml` 包含独立 `ios` 构建任务，明确使用 `macos-15`。工作流选择 Xcode 26，编译 `iphoneos` SDK 的 `arm64` 真机程序，关闭代码签名，并将 `Payload/App.app` 打包为 IPA。

在 GitHub 仓库的 Actions 页面，打开 **Build Android APK and unsigned iPhone IPA**，点击 **Run workflow**。推送到 `main`、`master` 或 `codex/**` 分支也会触发。

成功后在该次运行的 Artifacts 下载：

- `finance-demo-android-apk`：APK。
- `finance-demo-iphone-unsigned-ipa`：`finance-demo-unsigned.ipa` 与架构检查结果。

未签名 IPA 不能直接安装到普通 iPhone，需要使用自己的有效证书和描述文件重新签名。此流程不需要把 Apple ID、证书、私钥或描述文件交给 GitHub。

也可以在有 Xcode 26+ 的 Mac 上本地构建：

```bash
cd app
npm ci
bash scripts/build-unsigned-ipa.sh
```

原生 Xcode 项目：`app/ios/App/App.xcodeproj`；使用 Swift Package Manager 自动获取 Capacitor 原生依赖，无需 `pod install`。

## 构建依据

- [Capacitor 环境要求](https://capacitorjs.com/docs/getting-started/environment-setup)
- [GitHub macOS 15 构建镜像](https://github.com/actions/runner-images/blob/main/images/macos/macos-15-Readme.md)

最终构建状态以实际产物和 GitHub Actions 运行结果为准；仅提交工作流文件不代表 IPA 已编译完成。
