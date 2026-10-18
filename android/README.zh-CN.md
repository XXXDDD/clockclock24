# 时阵安卓动态壁纸

支持 Android 8.0 及以上，包含与电脑端共用的 30 款时钟。全部代码随安装包提供，无联网权限、无广告、无额外壁纸软件依赖。运行时使用系统 WebView。

产品约定见 [product.md](product.md)。打开即为全屏时钟，底部三个图标依次为款式、颜色、应用壁纸。款式用缩略图选择，颜色提供板面、长针、短针三项，支持色块和自由取色，并按款式自动保存。板面铺满屏幕，阵列按屏幕比例自动等比放大、居中，不提供尺寸、位置或帧率设置。默认使用 AMT72v Black 和设备时间；不可见时暂停，恢复时对准当前时间。

安装 `downloads/Shizhen-Android.apk` 后，用底部右侧的手机勾选图标进入系统预览并确认应用。手机系统决定是否提供锁屏应用选项。应用内部不显示文字，图标保留无障碍名称；系统授权与壁纸确认页面保留系统界面。

小米 / Redmi / POCO：系统可能默认拒绝「动态壁纸服务」权限。右上角盾牌图标可打开应用权限页，在「其他权限」中将「动态壁纸服务」设为「始终允许」。参见[小米官方说明](https://dev.mi.com/xiaomihyperos/documentation/detail?pId=1743)。

## 构建

需要 JDK 17+、Android SDK Platform 36 / Build Tools 和 Gradle 9.5（项目包含 wrapper）。

```sh
npm run build:android
npm run android:apk
```

`build:android` 将共享源码打包到 Android assets，不修改网页版或桌面壁纸。`android:apk` 构建签名 release APK，运行 Android lint，再复制到 `downloads/` 和 `dist/`。首次构建使用本机 `~/.codex/signing/timeform/` 的私有签名文件；务必备份该文件夹，后续更新必须使用同一签名。也可以通过 `TIMEFORM_KEYSTORE`、`TIMEFORM_STORE_PASSWORD`、`TIMEFORM_KEY_PASSWORD` 提供自有证书（别名 `timeform`）。证书和密码不会放入源码或安装包。

实现使用 Android `WallpaperService` 提供系统动态壁纸，通过私有 `VirtualDisplay` / `Presentation` 的硬件加速 WebView 渲染共享 Canvas 时钟。与桌面壁纸共用通用层的 borderless 板面和等比适配，保留各型号动作与指针实现。系统预览和实际壁纸分别持有渲染实例，按可见性暂停，销毁时释放显示与 WebView。缩略图的几何及针位也由共享型号生成。应用预览使用同一套离线资源。正式 APK 版本跟随根目录 `package.json`；统一发布见 `docs/rundown.md`。
