# TIMEFORM 时钟调试台

按**圆形、横屏、竖排**三类整理网页时钟，完整经典目录 **30 款均已实现**。逐款进度、官方来源与设计文件见 [product.md](product.md)。

在线使用：[横屏调试台](https://xxxddd.github.io/clockclock24/)、[圆形调试台](https://xxxddd.github.io/clockclock24/circular.html)、[竖排调试台](https://xxxddd.github.io/clockclock24/portrait.html)。

| 分类 | 型号与经典版本 | 网页入口 |
| --- | --- | --- |
| 圆形 | ClockClock 9 White、AMT61c Zephyr / Tidal（3 款） | [circular.html](circular.html) |
| 横屏 | ClockClock 24 分组 11 款（含 ClockClock L Tidal）、AMT96 Bjarke Ingels、AMT72 全部 4 款、AMT120 全部 3 款、AMT144 / AMT288 各 2 款（23 款） | [index.html](index.html) |
| 竖排 | AMT72v Tidal / White / Black / Black Sterling（4 款） | [portrait.html](portrait.html) |

页面采用「版式 → 型号 → 预设」三级结构：圆形、横屏、竖排三个导航 Tab；每个版式通过紧凑选择器切换型号及其预设，也可用前后箭头逐个比较。ClockClock L 作为「CCL · Tidal」归入 ClockClock 24 的 11 个预设，工作台共 9 个型号分组、30 个原作预设。CCL 保留独立尺寸和配置，支持 `?model=amt72`、`?model=clockclockl` 等直达链接。`clockclock24.html` 保留为横屏入口别名。

桌面布局锁定于窗口高度，左侧显示固定预览，右侧控制区独立滚动，滚动到底或聚焦控制项均不移动整页。右侧依次为「型号与预设」「时间调试」「播放调试」「自定义」「配置管理」。自定义按动作、配色、完整自定义排列，尺寸、位置、边距、表盘半径、间隙、指针长短与粗细归入完整自定义。窄屏下改为上下排列。

经典款是可恢复的默认预设，开放参考动作、时长、闲置针显示、快捷配色、自由颜色及全部几何参数。动作按型号共享：24 系列三项、AMT61c 两项、AMT72 三项、AMT72v 两项；其余型号各一项。相同形态的动作只因片长、速度不同不再增加选项，各预设仍默认保留自身校准节奏。切换到同型号其他动作时载入来源动作的默认时长，配色与几何保持不变。整理依据见[同型号参考动作](src/web/shared-actions.md)。网页不再开放自加旋转、平滑或立即换时模式，旧配置会迁移到参考动作并保留其他参数。修改后标明「已自定义」，可分别恢复动作、配色、尺寸与指针。时间支持设备／手动输入、时区和自动演示；播放支持暂停、单步、重播、立即归位及快捷速度。配置管理统一置底，原设计、视频及证据说明在预览下方折叠展示。

配色区按当前型号列出全部预设配色，顺序与预设选择器一致；24 系列包含 CCL 配色。点击只应用画布、板面、长针和短针四项颜色，不切换型号、动作或几何参数。相近的自加黑白、纸色、苔原和午夜方案不再显示；区别明显的暮色、深海、赤陶放在配色区末尾折叠的「补充配色」中。手动取色和 HEX 输入保留。

各型号的重制过程、原片观察与证据边界保存在型号目录的 `design.md`。既有二维重建规则继续用于原片未覆盖的衔接和其他读时，不能将其理解为官方完整舞蹈程序。AMT61c Zephyr 采用 53.1 秒参考节奏和全显指针；CC9 完整换时为 18 秒，AMT72v Black Sterling 为 38 秒，其中原片对照直接播放约 32 秒的片段。

新增的 20 个版本均有独立设计文件：18 款先拆解本款产品视频；无本款视频的 AMT72v Tidal、AMT288 Black 只改配色并沿用大型号默认动作。剪辑片段和未完片的补足范围单独登记；界面区分本款原片与默认动作参考。AMT61c Tidal、各白色 AMT 与合作版本使用各自的动作参数。

ClockClock L Tidal 与 AMT96 Bjarke Ingels 均先查看本款视频后独立实现，并按自己的参考校准几何。前者为 8×3 银针阵列，按用户要求提供散相旋转、斜线列波、Tidal 波浪三项选择，默认斜线且保持所选动作，不轮播；每项 42 秒，剪辑未展示的完整衔接及斜线复用来源已注明。后者为 12×8 洞石阵列，按约 52.2 秒完整原片实现四表盘旋转开合及 11:34→11:35，单独处理「1」的顶部笔画。

## 运行与验证

可直接打开根目录网页，生成页面内嵌样式和脚本，可离线运行。使用 Node.js 18 或更高版本时：

```sh
npm run build
npm run dev
```

本地地址为 [http://127.0.0.1:8765](http://127.0.0.1:8765)。配置保存在当前浏览器。

```sh
npm test
npm run check
```

## 源码职责

| 位置 | 职责 |
| --- | --- |
| `src/models/` | 十个大型号的独立设计、布局、字形、绘制与参考动画。 |
| `src/models/classic-landscape.js` | 网页新增 ClockClock L 与 AMT96 的注册，不改变 Lively 的既有型号契约。 |
| `src/shared/` | 绘制、时间、参数校验、播放进度与数学基础。 |
| `src/web/classic.js` | 为每个原作预设建立可编辑默认参数，统一校验完整配置。 |
| `src/web/reference-motion.js` | 24 系列三项参考动作的切换与当前姿态衔接，保留各预设原有默认动作。 |
| `src/web/shared-actions.js` | 同型号动作归类、来源、默认时长和共享实例，保留各预设原始实现。 |
| `src/web/palette-options.js` | 当前型号全部预设配色及末尾补充配色，颜色选择独立于完整预设切换。 |
| `src/web/classic-catalog.js` | 完整 30 款清单、实现状态与原设计链接；构建型号与预设选择器。 |
| `src/web/classic-editions.js` | 20 个新增版本的固定配色、动作参数、视频证据范围与独立配置标识。 |
| `src/shared/edition-animation.js` | 逐款参数驱动的连续列波、横向开合与环弧开合。 |
| `src/shared/edition-drawing.js` | 新增版本的普通针、金属针、双色针与洞石近似外观。 |
| `src/web/classic-panel.html` | 三类页面共用的版本、配色、动画及原作链接。 |
| `src/web/workspace.html` | 三种版式共用的预览与调试面板，`pages/` 提供画布尺寸选项。 |
| `src/web/` | 版式导航、型号与预设切换、完整自定义、播放控制与配置管理。 |
| `scripts/build.cjs` | 从源码同步生成根目录和 `dist/` 网页。 |
| `tests/classic.test.cjs` | 原作默认值、完整自定义恢复、旧配置迁移与类别校验。 |

架构与平台边界见 [architect.md](architect.md)。修改源码后运行构建，不手工修改生成页面。

## Lively 平台

本轮整理网页版。Lively 原有适配、原生自定义设置和既有 ZIP 包继续独立维护，未自动替换为网页经典款设置。平台说明见 [src/lively/README.md](src/lively/README.md)；构建与校验使用 `npm run build:lively`、`npm run check:lively`。

线上保留[壁纸配置页](https://xxxddd.github.io/clockclock24/wallpaper/configure.html)、[Lively 导入包](https://xxxddd.github.io/clockclock24/downloads/TIMEFORM-Lively.zip)和[离线 HTML](https://xxxddd.github.io/clockclock24/downloads/TIMEFORM-wallpaper.html)。壁纸仍使用原有五型号和独立设置。

本地 `github-publish/` 是已有的独立 GitHub 发布副本，开发以工作区根目录的 `src/` 为准。本次只发布网页调试台：发布副本的 `npm run build`、`npm run check` 仅生成和校验网页，现有壁纸下载保持原版本，之后单独维护。GitHub Pages 从 `main` 分支根目录自动部署。
