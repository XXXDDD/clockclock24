# ClockClock 24 · Pinakin Neela 设计说明

更新：2026-10-17。先检查本款原链接，再决定动作来源；本文件只登记这个经典版本。

## 原作与证据

- [官方产品页](https://www.humanssince1982.com/en-int/products/clockclock-24-pinakin-neela)。
- [产品图库与媒体登记](../../../../artifacts/edition-references/clockclock-24-pinakin-neela.json)、[检查清单](../../../../artifacts/edition-references/inventory.json)。
- [官方产品图](../../../../artifacts/edition-references/clockclock-24-pinakin-neela-product.jpg)。
- [本款官方视频](https://cdn.shopify.com/videos/c/vp/2d4c49356f2640b482c466d136ba9eaf/2d4c49356f2640b482c466d136ba9eaf.HD-1080p-7.2Mbps-74958665.mp4)：11.044 秒、约 29.970 fps、331 帧。
- [分段截图](../../../../artifacts/edition-references/clockclock-24-pinakin-neela-sequence.jpg)、[视频元数据](../../../../artifacts/edition-references/media.json)。截图仅用于观察，运行时不播放图片或逐帧针角。

## 布局与外观

大型号为 `clockclock24`，基准见[大型号设计](../design.md)与[几何校准](../../geometry-reference.md)。白色板面 · 蓝色针 · 银色金属针。配色值为网页对官方照片的近似，不是厂商色号。

固定配色：`background: #e9e6de`、`board: #f6f4ef`、`long: #222d91`、`short: #c7c9c6`。

内部阵列、字形与针臂比例保持大型号校准基准；外观由本款固定。只有画布、位置、播放速度和时间设置可以修改。

## 原片拆解与实现

| 原片范围 | 观察 / 实现依据 |
| --- | --- |
| 0–约 2.8 s | 蓝色与银色针臂的斜拍特写；双针基本反向共线并共同旋转。 |
| 约 2.8–5.7 s | 全阵列可见同列近似同步、各列错开的连续斜线波。 |
| 约 5.7–8 s | 特写中的两针开始分离，进入成字。 |
| 约 8–11.04 s | 远景读时为 09:39；镜头切换不能拼作连续针轨迹。 |

网页完整换时：**40.1 秒**。动画：**Neela · 错相斜线列波**。

视频为剪辑片段，没有完整起止换时。网页重建 40.1 秒完整转换；仅列波、双材质和分离成型有直接片段依据，不提供整片时长对照按钮。

本款阶段、传播与连续速度参数：

```json
{
  "duration": 40.1,
  "alignStart": 0.45,
  "alignEnd": 5.5,
  "waveStart": 9.2,
  "formStart": 27,
  "formEnd": 38.7,
  "heading": 135,
  "opposed": true,
  "period": 12,
  "columnDelay": 0.4,
  "stage": "斜线列波",
  "order": -1
}
```

逐针轨迹承接进入成字时的角度与速度，以连续插值制动到读时姿态。播放中修改时间时保持当前动作，更新最终目标；已进入归位的针从当前位置继续。

## 证据范围与验收

视频中的墙面、摄影机移动和剪辑不作为指针动作。遮挡和双针交叠无法唯一识别电机身份；网页通道分配、完整连续曲线及原片未覆盖的读时都是重建。

验收覆盖：本款可独立选择与直达；切换后原作和视频入口正确；设置独立保存；旧配置不能改写固定颜色与动作；暂停、重播、单步、分钟跨界与最终字形稳定。

[产品目录](../../../../product.md)逐款维护状态，默认动作复用只发生在明确记录来源的版本中。
