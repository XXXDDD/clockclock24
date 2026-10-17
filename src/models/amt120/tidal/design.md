# A million Times 120 · Tidal 设计说明

更新：2026-10-17。先检查本款原链接，再决定动作来源；本文件只登记这个经典版本。

## 原作与证据

- [官方产品页](https://www.humanssince1982.com/en-int/products/a-million-times-120-tidal)。
- [产品图库与媒体登记](../../../../artifacts/edition-references/a-million-times-120-tidal.json)、[检查清单](../../../../artifacts/edition-references/inventory.json)。
- [官方产品图](../../../../artifacts/edition-references/a-million-times-120-tidal-product.jpg)。
- [本款官方视频](https://cdn.shopify.com/videos/c/vp/17b328db26974f07b5f6bcb7d563c991/17b328db26974f07b5f6bcb7d563c991.HD-1080p-7.2Mbps-30820649.mp4)：52.840 秒、约 25.000 fps、1321 帧。
- [分段截图](../../../../artifacts/edition-references/a-million-times-120-tidal-sequence.jpg)、[视频元数据](../../../../artifacts/edition-references/media.json)。截图仅用于观察，运行时不播放图片或逐帧针角。

## 布局与外观

大型号为 `amt120`，基准见[大型号设计](../design.md)与[几何校准](../../geometry-reference.md)。深蓝板面 · 银色金属双针。配色值为网页对官方照片的近似，不是厂商色号。

固定配色：`background: #e9e6de`、`board: #101c38`、`long: #cbd0d2`、`short: #cbd0d2`。

内部阵列、字形与针臂比例保持大型号校准基准；外观由本款固定。只有画布、位置、播放速度和时间设置可以修改。

## 原片拆解与实现

| 原片范围 | 观察 / 实现依据 |
| --- | --- |
| 0–约 12 s | 09:34 拆开，各组陆续形成围绕中央的环弧；同心环间有相位差。 |
| 约 12–47 s | 两路反向开合，环弧、向心/离心姿态不断往复。 |
| 约 47 s 起 | 从环波中逐针进入读时；Tidal 原片约 52.84 秒完整显示 09:35。 |

网页完整换时：**52.8 秒**。动画：**环弧流动与反向开合**。

本款的环弧、开合方向和节奏依据自己的原片重建；15×8 轴距和 3×6 字形沿用大型号已校准几何。连续速度、针序和其他读时路径是网页重建。

本款阶段、传播与连续速度参数：

```json
{
  "duration": 52.8,
  "layout": "arc",
  "curvature": 0.3,
  "counter": true,
  "alignStart": 0.6,
  "alignEnd": 9.2,
  "waveStart": 13.1,
  "formStart": 46.4,
  "formEnd": 51.8,
  "period": 11.4,
  "ramp": 1.0,
  "modulation": 0.15,
  "radialDelay": 0.23,
  "stage": "环弧反向开合"
}
```

逐针轨迹承接进入成字时的角度与速度，以连续插值制动到读时姿态。播放中修改时间时保持当前动作，更新最终目标；已进入归位的针从当前位置继续。

## 证据范围与验收

视频中的墙面、摄影机移动和剪辑不作为指针动作。遮挡和双针交叠无法唯一识别电机身份；网页通道分配、完整连续曲线及原片未覆盖的读时都是重建。

验收覆盖：本款可独立选择与直达；切换后原作和视频入口正确；设置独立保存；旧配置不能改写固定颜色与动作；暂停、重播、单步、分钟跨界与最终字形稳定。

[产品目录](../../../../product.md)逐款维护状态，默认动作复用只发生在明确记录来源的版本中。
