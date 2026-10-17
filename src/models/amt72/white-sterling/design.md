# A million Times 72 · White Sterling 设计说明

更新：2026-10-17。先检查本款原链接，再决定动作来源；本文件只登记这个经典版本。

## 原作与证据

- [官方产品页](https://www.humanssince1982.com/en-int/products/a-million-times-72-white-sterling)。
- [产品图库与媒体登记](../../../../artifacts/edition-references/a-million-times-72-white-sterling.json)、[检查清单](../../../../artifacts/edition-references/inventory.json)。
- [官方产品图](../../../../artifacts/edition-references/a-million-times-72-white-sterling-product.jpg)。
- [本款官方视频](https://cdn.shopify.com/videos/c/vp/855b357a392b4fceaec9a184014d7182/855b357a392b4fceaec9a184014d7182.HD-1080p-7.2Mbps-37771679.mp4)：43.480 秒、约 25.000 fps、1087 帧。
- [分段截图](../../../../artifacts/edition-references/a-million-times-72-white-sterling-sequence.jpg)、[视频元数据](../../../../artifacts/edition-references/media.json)。截图仅用于观察，运行时不播放图片或逐帧针角。

## 布局与外观

大型号为 `amt72`，基准见[大型号设计](../design.md)与[几何校准](../../geometry-reference.md)。白色板面 · 银色金属双针。配色值为网页对官方照片的近似，不是厂商色号。

固定配色：`background: #e9e6de`、`board: #f6f4ef`、`long: #cbd0d2`、`short: #cbd0d2`。

内部阵列、字形与针臂比例保持大型号校准基准；外观由本款固定。只有画布、位置、播放速度和时间设置可以修改。

## 原片拆解与实现

| 原片范围 | 观察 / 实现依据 |
| --- | --- |
| 0–约 5 s | 09:34 拆开，双针按位置向横向姿态整理。 |
| 约 5–30 s | 两路反向转动，向左/向右的夹角反复开合，从左到右有相位差。 |
| 约 30–43.48 s | 逐针离开流动、减速成字，最后为 09:35。 |

网页完整换时：**43.5 秒**。动画：**White Sterling · 横向风势开合**。

本款视频是横向风势，不能复用普通 Black 的中心放射动作。固定 12×6 几何与原有 3×6 字形；反光银针无法在交叠处唯一识别物理针序，连续曲线和归位细节为重建。

本款阶段、传播与连续速度参数：

```json
{
  "duration": 43.5,
  "alignStart": 0.5,
  "alignEnd": 4.8,
  "waveStart": 5.3,
  "formStart": 29.2,
  "formEnd": 41.6,
  "heading": 0,
  "counter": true,
  "columnDelay": 0.27,
  "period": 11.4,
  "ramp": 0.65,
  "modulation": 0.28,
  "stage": "横向风势开合"
}
```

逐针轨迹承接进入成字时的角度与速度，以连续插值制动到读时姿态。播放中修改时间时保持当前动作，更新最终目标；已进入归位的针从当前位置继续。

## 证据范围与验收

视频中的墙面、摄影机移动和剪辑不作为指针动作。遮挡和双针交叠无法唯一识别电机身份；网页通道分配、完整连续曲线及原片未覆盖的读时都是重建。

验收覆盖：本款可独立选择与直达；切换后原作和视频入口正确；设置独立保存；旧配置不能改写固定颜色与动作；暂停、重播、单步、分钟跨界与最终字形稳定。

[产品目录](../../../../product.md)逐款维护状态，默认动作复用只发生在明确记录来源的版本中。
