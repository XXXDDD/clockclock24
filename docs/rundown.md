# 发布速记

- 版本只改 `package.json.version`，并在本文件补一节同名版本记录。
- 本机需 Node 18+、JDK 21、Android SDK 36；Gradle 使用仓库内 wrapper。Android 发布必须沿用已有签名密钥（本机 `~/.codex/signing/timeform/` 或 `TIMEFORM_KEYSTORE` 等环境变量），禁止将密钥和密码提交到仓库。
- 执行 `npm run release:prepare`：统一生成品牌矢量图标、演示页、调试页、两种桌面壁纸 ZIP 和签名 Android APK，运行测试、Android lint 与一致性检查，输出含三个文件 SHA-256 的 `dist/release.json` 和 `dist/release-notes.md`。APK 版本与 `package.json.version` 同步。
- 提交并推送源码及生成产物，GitHub Pages 自动部署；在已推送的干净发布 checkout 执行 `npm run release:publish`。脚本核对远端提交与清单、先创建草稿、上传并校验两个 ZIP 和 `Shizhen-Android.apk`，完成后公开并设为 Latest，再校验公开下载。可用 `GITHUB_TOKEN` 或本机 Git 凭据认证；不输出凭据。
- 发布后确认 Pages 已部署本次提交，检查演示页三个下载入口、30 款加载及手机安装。离线文件必须与清单摘要一致；保留 Android 包名与签名，升级才能保留已有设置。
- 演示页的下载入口固定指向 Latest；资源缓存标识由内容自动生成，不手改页面版本号或生成文件。已经下载的离线壁纸需重新下载导入。

## v3.4.0 — 2026-10-18

- 产品更名「时阵」，采用六枚表盘组成数字「7」的黑白图标，左下两枚保留斜线姿态。
- 首次正式提供 Android 安装包：30 款离线运行、图标操作、三项配色、尺寸自动适配，通过 Android 原生动态壁纸服务应用。
- Android、Lively 和 Wallpaper Engine 共用 borderless 板面：板子铺满屏幕，表盘等比自动放大；桌面包默认开启，可在设置中关闭。
- 表盘盘沿的完整圆周修正在通用绘制层生效。
- 演示页保持现有展示方式，增加 Android 下载；发布流程统一构建、校验并发布三个平台文件。

## v3.3.0 — 2026-10-17

- 黑白默认原版盘面，彩色默认立体光影；普通针与金属针分别选择效果。
- 金属反光随位置、朝向变化，保持原有针宽、针长与轮廓。
- 白色表盘改为浅凹光影，修正 AMT72v 盘沿高光断口。
- 演示页与两种中英文壁纸包同步更新；发布时 199 项测试通过。
