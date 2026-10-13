# TIMEFORM · 可定制时钟壁纸

同一个离线网页用于 Windows 的 Lively、Mac 的网页壁纸工具和普通浏览器。默认仍是经典黑底白针。无需安装开发依赖。

## Windows：直接导入 Lively

1. 安装 [Lively Wallpaper](https://www.rocksdanister.com/lively/)。
2. 下载仓库的 [`downloads/TIMEFORM-Lively.zip`](../downloads/TIMEFORM-Lively.zip)，把 ZIP 拖进 Lively，选择需要的显示器。
3. 在壁纸卡片的菜单中打开「自定义」。可以分别调整屏幕背景、背景板、长针、短针颜色，以及排列、大小、边距、位置、针长、动画、闲置指针、12/24 小时制和时区。

Lively 会替每个显示器保存设置。源文件使用官方 [LivelyProperties 接口](https://github.com/lively-community/lively/wiki/Web-Guide-IV-%3A-Interaction)，不包含本机屏幕编号或绝对路径。

## 先配色，再带去其他电脑

打开 [`configure.html`](configure.html)，可以离线预览并导出。选择预览屏幕后，页面会模拟横屏、2K、4K、超宽屏、竖屏或 5:4 屏幕。

- **下载 Lively 壁纸包**：包含当前配色的 ZIP；换 Windows 电脑直接导入，仍保留全部 Lively 自定义项。
- **下载通用 HTML**：包含全部样式、程序和当前配置的单个 HTML 文件；不依赖其他文件、字体、CDN 或浏览器缓存。
- **导出 / 导入配色配置**：用版本化 JSON 保存并迁移配置；不会迁移屏幕身份信息。
- **复制壁纸网址**：在线工作台生成携带配置的 URL；不同电脑、浏览器或网页壁纸工具可用同一个网址。本地 `file:` 网址只适用于当前电脑，换电脑应传输 HTML 文件。

网页工作台会在当前浏览器保存编辑结果。纯壁纸入口使用文件内嵌配置、URL 参数或宿主工具的设置，避免另一块屏幕意外读到相同浏览器缓存。在普通浏览器中按 `S` 打开 / 收起设置，`Esc` 收起；壁纸默认不显示控制面板。Lively 使用卡片菜单的「自定义」，无需开启键盘交互。

## Mac：Plash 或其他网页壁纸工具

[Plash 官方说明](https://sindresorhus.com/plash)支持远程和本地网页，并可选择显示器。可以在 Plash 中选择已导出的 HTML，或使用在线工作台生成的壁纸网址。不要把 ZIP 当作 Mac 壁纸导入。

如果所用版本或其他工具只接收 HTTP 地址，可以使用 GitHub Pages 的壁纸网址；也可以在下载文件所在文件夹启动本地服务：

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

然后将 `http://127.0.0.1:8765/TIMEFORM-wallpaper.html` 添加到该工具。使用本地服务时需要保持服务运行。Plash 的 `plash:add` 自定义协议不支持本地文件 URL；这与它在应用内加载本地网页的功能不同。

当前代码已在 Windows 的 Edge 与 Lively WebView2 中验证。没有 Mac 实机验证；Mac 端使用标准网页接口，不依赖 Lively。系统桌面的显示器选择、开机启动由壁纸工具管理。

## 屏幕适配规则

- 自动适配比较两种排列的可用尺寸：横排 `HHMM`，或上方 `HH`、下方 `MM`。选能让表盘更大的完整布局。
- 每种排列保持比例；不拉伸、不裁切，始终保留 24 个表盘。
- 大小同时受屏幕宽、高约束。安全边距以实际显示器 CSS 像素计，预览时按比例显示。
- 水平 / 垂直位置表示剩余空间中的偏移，范围为 −100% 到 +100%。到达极限仍不会把时钟推出屏幕。
- 默认跟随当前电脑时间。时区留空可自动切换到新电脑的本地时间；填 `Asia/Hong_Kong` 等 IANA 时区可保持固定时区。
- 静止时不持续重绘；换时才启动动画，页面隐藏后暂停，恢复时直接同步正确时间。高 DPI 渲染受像素预算限制。

## 仓库维护

`src/config.js` 是全部配置的唯一定义。网页控件、URL 编解码、JSON 导入导出、Lively 控件和默认值从同一份定义生成。`src/renderer.js` 保留原时钟的字形、材质和指针动画，并共享给所有导出格式。

```sh
npm run build
npm test
node scripts/build-wallpaper.cjs --check
```

构建只需要 Node.js 18 或更新版本，无第三方依赖；ZIP 可重复生成。编辑源文件后请一起提交生成的 `index.html`、`configure.html`、`LivelyProperties.json` 和 `downloads/` 文件。CI 会检查源码与下载文件一致。

GitHub Pages 继续从 `main` 根目录发布；本目录合并到 `main` 并部署后，入口分别是 `/clockclock24/wallpaper/index.html` 和 `/clockclock24/wallpaper/configure.html`。
