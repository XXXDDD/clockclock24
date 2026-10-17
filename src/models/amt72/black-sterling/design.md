# A million Times 72 · Black Sterling 设计说明

更新：2026-10-17。先检查本款原链接，再决定动作来源；本文件只登记这个经典版本。

## 原作与证据

- [官方产品页](https://www.humanssince1982.com/en-int/products/a-million-times-72-black-sterling)。
- [产品图库与媒体登记](../../../../artifacts/edition-references/a-million-times-72-black-sterling.json)、[检查清单](../../../../artifacts/edition-references/inventory.json)。
- [官方产品图](../../../../artifacts/edition-references/a-million-times-72-black-sterling-product.jpg)。
- [本款官方视频](https://cdn.shopify.com/videos/c/vp/bc5a96c9728845bbbafb646c740ce339/bc5a96c9728845bbbafb646c740ce339.HD-1080p-7.2Mbps-31210951.mp4)：28.760 秒、约 25.000 fps、719 帧。
- [分段截图](../../../../artifacts/edition-references/a-million-times-72-black-sterling-sequence.jpg)、[视频元数据](../../../../artifacts/edition-references/media.json)。截图仅用于观察，运行时不播放图片或逐帧针角。

## 布局与外观

大型号为 `amt72`，基准见[大型号设计](../design.md)与[几何校准](../../geometry-reference.md)。黑色板面 · 银色金属双针。配色值为网页对官方照片的近似，不是厂商色号。

固定配色：`background: #000000`、`board: #111213`、`long: #cbd0d2`、`short: #cbd0d2`。

内部阵列、字形与针臂比例保持大型号校准基准；外观由本款固定。只有画布、位置、播放速度和时间设置可以修改。

## 原片拆解与实现

| 原片范围 | 观察 / 实现依据 |
| --- | --- |
| 0–约 10 s | 室内远景从 09:34 开始，由左向右拆字、整理斜线。 |
| 约 10–13 s | 全阵列以共线斜针停留。 |
| 约 13–28.76 s | 列间错相的同向旋转，左侧先行；片尾仍在列波中。 |

网页完整换时：**50.0 秒**。动画：**Black Sterling · 斜线列波**。

官网视频只有 28.76 秒并在运动中结束，没有最终读时。本款的列波依据片段重建，网页补足至 50 秒后成字；补足的成字路径不是原片测得，故不显示整片对照按钮。

本款阶段、传播与连续速度参数：

```json
{
  "duration": 50,
  "alignStart": 0.45,
  "alignEnd": 5.5,
  "waveStart": 12.5,
  "formStart": 36.5,
  "formEnd": 47.8,
  "heading": 135,
  "opposed": true,
  "period": 11.8,
  "columnDelay": 0.48,
  "stage": "斜线列波",
  "ramp": 1.1
}
```

逐针轨迹承接进入成字时的角度与速度，以连续插值制动到读时姿态。播放中修改时间时保持当前动作，更新最终目标；已进入归位的针从当前位置继续。

## 证据范围与验收

视频中的墙面、摄影机移动和剪辑不作为指针动作。遮挡和双针交叠无法唯一识别电机身份；网页通道分配、完整连续曲线及原片未覆盖的读时都是重建。

验收覆盖：本款可独立选择与直达；切换后原作和视频入口正确；设置独立保存；旧配置不能改写固定颜色与动作；暂停、重播、单步、分钟跨界与最终字形稳定。

[产品目录](../../../../product.md)逐款维护状态，默认动作复用只发生在明确记录来源的版本中。
