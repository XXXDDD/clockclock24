# ClockClock 24 · Dada Blue 设计说明

更新：2026-10-17。先检查本款原链接，再决定动作来源；本文件只登记这个经典版本。

## 原作与证据

- [官方产品页](https://www.humanssince1982.com/en-int/products/cc24-dada-blue)。
- [产品图库与媒体登记](../../../../artifacts/edition-references/cc24-dada-blue.json)、[检查清单](../../../../artifacts/edition-references/inventory.json)。
- [官方产品图](../../../../artifacts/edition-references/cc24-dada-blue-product.jpg)。
- [本款官方视频](https://cdn.shopify.com/videos/c/vp/7b84afa6bf7d458594d29c24cc273d3a/7b84afa6bf7d458594d29c24cc273d3a.HD-1080p-7.2Mbps-35307977.mp4)：47.360 秒、约 25.000 fps、1184 帧。
- [分段截图](../../../../artifacts/edition-references/cc24-dada-blue-sequence.jpg)、[视频元数据](../../../../artifacts/edition-references/media.json)。截图仅用于观察，运行时不播放图片或逐帧针角。

## 布局与外观

大型号为 `clockclock24`，基准见[大型号设计](../design.md)与[几何校准](../../geometry-reference.md)。蓝色板面 · 浅色双针。配色值为网页对官方照片的近似，不是厂商色号。

固定配色：`background: #000000`、`board: #24245b`、`long: #f9faf7`、`short: #eef0ec`。

内部阵列、字形与针臂比例保持大型号校准基准；外观由本款固定。只有画布、位置、播放速度和时间设置可以修改。

## 原片拆解与实现

| 原片范围 | 观察 / 实现依据 |
| --- | --- |
| 0–约 8 s | 09:34 从右向左依次拆开并转入平行斜线。 |
| 约 8–14 s | 平行斜线有比 Black 更长的停留。 |
| 约 14–35 s | 右侧先起动、向左错相，同向列波。 |
| 约 33–47.36 s | 逐针分离成型，最终为 09:35。 |

网页完整换时：**47.4 秒**。动画：**Dada Blue · 延后启动的斜线列波**。

逐列角度检查确认仍是右侧领先；与普通 CC24 的差别在更长停留、列波起动和成字时刻。保留已校验的相位曲线，单独设定本款阶段参数，不使用 Black 的 40.1 秒时间线。

本款对 CC24 基准动作的时间修正：

```json
{
  "referenceDuration": 47.36,
  "waveStart": 14.3,
  "formStart": 32.7,
  "finish": 46.7
}
```

[CC24 逐列轮廓检查](../../../../artifacts/edition-references/cc24-wave-observations.json)。

## 证据范围与验收

视频中的墙面、摄影机移动和剪辑不作为指针动作。遮挡和双针交叠无法唯一识别电机身份；网页通道分配、完整连续曲线及原片未覆盖的读时都是重建。

验收覆盖：本款可独立选择与直达；切换后原作和视频入口正确；设置独立保存；旧配置不能改写固定颜色与动作；暂停、重播、单步、分钟跨界与最终字形稳定。

[产品目录](../../../../product.md)逐款维护状态，默认动作复用只发生在明确记录来源的版本中。
