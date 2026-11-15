# 丰收互联交付说明

本项目是依据用户截图制作的本地金融界面演示。安装名称为“丰收互联”，页面、登录和管理文案中的“演示”字样已清理。登录、转账、借款、还款均为本地演示交互，不连接银行系统。

## 使用

- 预览：运行中的 http://localhost:4173/ （带设备预览外壳）。
- 原生应用入口：app/native.html；Android/iOS 包使用该全屏入口。
- 长按金额、账户卡片、贷款记录、交易记录或图片约 600 毫秒进入编辑器；电脑也可使用右键。
- 在“我的 → 数据管理”可以新增账户、贷款、交易，导入导出 JSON，恢复默认数据。页面常驻的长按提示已移除，长按功能保留。
- 图片可以选择本机 PNG/JPEG/WebP/GIF/AVIF，替换后压缩保存在本机；HEIC 尚未验证。
- 本机存储正常时，修改在重启后保留。卸载应用会清除本机数据，请先导出备份。
- 原生端导出提供 JSON 文本及复制操作；请将内容另存为 JSON。导入使用系统文件选择器。
- 本地登录可填写本地账号及密码，勾选本地使用说明后进入；密码不持久化。未登录只能浏览首页，打开其他页面、执行操作或编辑图片/数据均先进入登录。登录成功会继续原来的目标页面或编辑任务；退出清除页面历史和金额显隐状态并返回首页。登录状态是本地演示门禁，不是银行身份验证。

## 页面范围

首页、金服、贷款、生活入口、我的、登录、我的贷款、借款记录、我的账户、账户明细、交易详情、转账、借款/还款演示，以及数据管理。

主导航保持截图的“首页 / 金服 / 贷款 / 生活 / 我的”。本项目没有模板制作或短剧模块，因此不应用 Make/Reel 导航偏好。

截图中广告、卡面、头像和可提取图标作为参考资产使用。遮挡的图标使用图标库；私人姓名和电话使用演示值。保留原始仓库 README。截图里的红色批注没有绘入应用，也未作为独立的外部操作授权。

复刻覆盖主要结构、图片、配色、导航及核心交互；系统字体、部分装饰图标和间距仍有细微差异，不宣称逐像素完全一致。

## 构建与产物

- APK：artifacts/finance-demo-android.apk，Android 调试签名，可安装，包名 com.local.financedemo。
- IPA：artifacts/finance-demo-unsigned.ipa，真机 iphoneos / arm64，未签名，需要签名后才能安装到 iPhone。
- 来源提交：以 artifacts/android-verification.json 和 artifacts/ipa-verification.json 的构建提交为准。
- GitHub 分支：codex/finance-demo；草稿 PR：https://github.com/VCMallory/bank1/pull/1。
- 最新构建：见上述 PR 或仓库 Actions 页面。
- Workflow：.github/workflows/build-mobile.yml，iOS 使用 macos-15 / Xcode 26.3 构建。
- iOS 构建脚本：app/scripts/build-unsigned-ipa.sh。
- 验证记录：artifacts/android-verification.json 和 artifacts/ipa-verification.json。

APK 已验证签名及打包内容；IPA 已验证 ZIP CRC、Info.plist、iphoneos 平台、arm64 Mach-O，并确认没有签名与描述文件。浏览器已验证主要页面及编辑交互，未在 Android/iPhone 真机安装运行。

## 本地开发

在 app 目录执行 npm ci，然后 npm run dev -- --host 0.0.0.0 --port 4173 --strictPort。npm run build 构建设备预览，npm run build:native 构建原生全屏入口。提交到 main/master/codex/** 分支可触发移动构建；也可以手动运行 workflow_dispatch。

提交不包含 node_modules、构建缓存、签名密钥、原始手机截图或机器凭证。安装包保存在本机 artifacts 和 Actions Artifacts 中。

## 图标与名称（v1.2）

安装名称为“丰收互联”。启动图标以用户上传的手机桌面截图中第二排第四个图标为参考，使用内置 Image Gen 提取并规范白色方形背景；源图为 app/public/assets/app-icon.png。截图分辨率有限，图案按参考重建，非逐像素原始图标文件。Android 常规、圆形、自适应与 iOS 1024px 图标均由脚本生成，原生版本为 1.2 (3)。

图标提取提示词：Use the supplied iPhone home screen screenshot as the edit target. Extract only the app icon at row 2, column 4 labelled 丰收互联, located approximately x=988..1191, y=573..775 in the 1290x2796 screenshot. Return one clean square app icon, no phone screen, no app name label and no other apps. Faithfully preserve the icon's white background, centered circular low-poly blue-and-green globe and the exact winding white river across it. Do not substitute the previous smooth landscape design. Keep the polygon colors, river silhouette, orientation, proportions and placement faithful to the uploaded icon. Extend the white corner background into a full opaque white square suitable for an iOS/Android app icon, with the globe occupying approximately 78% of the square width. No text, letters, labels, shadows, borders or extra marks.

背景修正提示词：Fix this app icon asset only: replace ALL black corner pixels outside the rounded white square with pure white (#FFFFFF), so the final image is a full flat opaque white square with no rounded outer boundary, no black corners and no transparency. Preserve the centered blue/green low-poly circle and its white winding river exactly as they are, unchanged in position, proportions, polygon colors, river silhouette and detail. No text. This is an icon export normalization, not a redesign.

## 2026-11-15 文案与打包更新

已移除页面角标、可见文案中的“演示”字样和资产、账单标题旁的“数据仅供参考”文字，保留账单详情入口和无障碍名称。Web 与原生资源已构建并同步；当前安装包版本与构建来源以 artifacts 下的验证记录为准。APK 为调试签名版本；IPA 为 iphoneos / arm64 未签名版本，需要签名后安装。

## v1.2.1 登录页文案

登录页协议名称改为《使用说明》，删除协议下方的登录信息使用说明。对应原生版本为 1.2.1 (4)，包内核验以 artifacts 下的 v1.2.1 验证记录为准。

## v1.3 原生 iOS 交互修复

原生入口使用 CSS 单一安全区处理（ios.contentInset=never）、明确的滚动视口和完整底栏高度，保留首页/金服/贷款/生活/我的五个文字标签。“我的”资料区按用户第四张裁剪图使用暖金文字、姓名 *晟、188****4990、福利中心按钮；只有未修改的旧默认字段自动迁移，自定义数据保留。

长按约 600ms 进入编辑，12px 内小幅抖动容忍；TouchEvent 与鼠标 PointerEvent 分开处理，滚动/取消/多指取消待触发长按，嵌套编辑与释放点击去重。原生编辑区域禁用系统文本选择及图片 callout，输入框仍可选字；打开编辑器时背景滚动冻结。

新增 app/tests/native-interactions.spec.ts 专测 native.html。本机 Edge/Chromium 已通过 9 项（含 CDP 真实触摸注入），macOS 打包流程增加 WebKit 检查（8 项及一项仅 Chromium 支持的触摸注入跳过）。WebKit 检查结果及原生包来源以本次 Actions 运行和 artifacts/package-manifest-v1.3.json 为准；这些检查不等同于 iPhone 真机安装复测。
