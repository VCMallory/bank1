# 丰收互联（演示）交付说明

本项目是依据用户截图制作的本地金融界面演示。安装名称为“丰收互联（演示）”，页面固定显示演示标识。登录、转账、借款、还款均为本地演示交互，不连接银行系统。

## 使用

- 预览：运行中的 http://localhost:4173/ （带设备预览外壳）。
- 原生应用入口：app/native.html；Android/iOS 包使用该全屏入口。
- 长按金额、账户卡片、贷款记录、交易记录或图片约 600 毫秒进入编辑器；电脑也可使用右键。
- 在“我的 → 演示数据管理”可以新增账户、贷款、交易，导入导出 JSON，恢复默认数据。页面常驻的长按提示已移除，长按功能保留。
- 图片可以选择本机 PNG/JPEG/WebP/GIF/AVIF，替换后压缩保存在本机；HEIC 尚未验证。
- 本机存储正常时，修改在重启后保留。卸载应用会清除本机数据，请先导出备份。
- 原生端导出提供 JSON 文本及复制操作；请将内容另存为 JSON。导入使用系统文件选择器。
- 本地登录可填写演示账号及演示密码，勾选演示使用说明后进入；密码不持久化。未登录只能浏览首页，打开其他页面、执行操作或编辑图片/数据均先进入登录。登录成功会继续原来的目标页面或编辑任务；退出清除页面历史和金额显隐状态并返回首页。登录状态是本地演示门禁，不是银行身份验证。

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

## 图标与身份

参考截图中“丰收互联”的蓝绿配色，使用原创河流图标并在底部保留大号“演示”，不使用与官方银行不可区分的图标。源图：app/public/assets/app-icon-demo.png。图标使用内置 Image Gen 生成，提示词为：原创蓝绿圆形景观与白色弯曲河流，底部 32% 深蓝横条、大号白色“演示”，无官方银行名称或同形标志。各平台仅做尺寸缩放。应用名称和页面演示标记保留。
