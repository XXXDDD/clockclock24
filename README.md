# TIMEFORM 网页时钟

网页版工作台支持 ClockClock 24、AMT72、AMT120、AMT144、AMT288，提供型号切换、八组配色、尺寸与位置配置、时间调试和动画播放控制。使用原生 HTML、Canvas 和 JavaScript，无第三方运行依赖。

## 在线使用

打开 [GitHub Pages](https://xxxddd.github.io/clockclock24/)，或直接打开仓库的 `index.html`。页面上方切换型号，各型号分别保存配置；带型号的 JSON 配置导入后会自动切换。

| 型号 | 表盘阵列 | 数字布局 | 在线预览 |
| --- | --- | --- | --- |
| ClockClock 24 | 8 × 3 | 原有 2 × 3 字形 | [打开](https://xxxddd.github.io/clockclock24/?model=clockclock24) |
| AMT72 | 12 × 6 | 3 × 6 轮廓字形铺满阵列，无冒号 | [打开](https://xxxddd.github.io/clockclock24/?model=amt72) |
| AMT120 | 15 × 8 | 3 × 6 轮廓字形，外围与时分之间留白 | [打开](https://xxxddd.github.io/clockclock24/?model=amt120) |
| AMT144 | 18 × 8 | 3 × 6 轮廓字形与双方形冒号 | [打开](https://xxxddd.github.io/clockclock24/?model=amt144) |
| AMT288 | 24 × 12 | 5 × 6 宽幅轮廓字形与双方形冒号，上下各留三排 | [打开](https://xxxddd.github.io/clockclock24/?model=amt288) |

布局、面板比例和数字轮廓对照官方 [AMT72](https://www.humanssince1982.com/en-int/products/a-million-times-72-black-sterling)、[AMT120](https://www.humanssince1982.com/en-int/products/a-million-times-120-black)、[AMT144](https://www.humanssince1982.com/en-int/products/a-million-times-144-black)、[AMT288](https://www.humanssince1982.com/en-int/products/a-million-times-288-black) 的读时照片重建。大阵列提供逐列波浪、同步旋转、平滑过渡和立即换时；默认保留闲置指针的斜线，也可调节显隐。

圆形和竖排目前提供独立分类页面，专属型号待接入。

## 五型号 Lively 桌面壁纸

[壁纸工作台](wallpaper/configure.html) 和 [纯壁纸页面](wallpaper/index.html) 已接入 ClockClock 24、AMT72、AMT120、AMT144、AMT288，默认 AMT144，使用与网页工作台相同的字形、阵列和动画基础。安装包完全离线运行。

- Windows：下载 [五型号 Lively 导入包](downloads/TIMEFORM-Lively.zip)，拖入 Lively 新建壁纸；右键新卡片选择「自定义」即可切换五种型号。
- 可调整八组配色与独立颜色、缩放与位置、表盘半径和间隙、两根指针的长度和粗细、动画与闲置指针显隐、时区与指定时间，并支持宿主暂停恢复。
- 其他网页壁纸工具：下载 [通用 HTML](downloads/TIMEFORM-wallpaper.html)，或使用壁纸工作台导出当前方案。
- 壁纸工作台可导出 Lively ZIP、离线 HTML 和 JSON 配置；导出文件离线可用。

详细说明见 [wallpaper/README.md](wallpaper/README.md)。

旧版 Lively 卡片保存了自己的设置副本；请导入新 ZIP，才能看到新增型号和自定义项。仓库也提供 [与本地测试版相同的 ZIP](TIMEFORM-五型号-Lively.zip)。

## 本地开发和验证

使用 Node.js 18 或更新版本：

```sh
npm run build
npm run dev
```

本地工作台地址为 `http://127.0.0.1:8765`。修改 `src/` 后重新构建，根目录和 `dist/` 的页面由相同源码生成。

```sh
npm test
npm run check
```

测试覆盖所有型号的全天时间、动画归位、显隐连续性、画布边界、配置导入，以及官方照片时间的逐表盘指针方向。检查命令同时验证网页和壁纸生成文件与源码一致。GitHub Pages 从 `main` 分支根目录发布，推送更新后自动部署。

## 源码结构

- `src/shared/`：单表盘、配色、配置、时间与指针动画基础。
- `src/models/`：ClockClock 24 和各 AMT 型号的字形、几何和编排。
- `src/web/`：分类页面、预览和专业配置面板。
- `src/lively/`：五型号壁纸配置、宿主回调、浏览器配置页和导出；复用共享型号与绘制。
- `wallpaper/`、`lively-wallpaper/`：生成的壁纸页面和 Lively 配置；`wallpaper/src/` 保留旧版适配代码供兼容回归检查。
- `scripts/build.cjs`：网页工作台构建；`scripts/build-lively.cjs`：新版壁纸和下载文件构建；`scripts/build-wallpaper.cjs` 保留原有构建命令并调用新版构建。

产品范围见 [product.md](product.md)，架构见 [architect.md](architect.md)。这是独立二维网页实验。
