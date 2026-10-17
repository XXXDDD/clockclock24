# ClockClock 24 · White Sterling 设计说明

更新：2026-10-17。先检查本款原链接，再决定动作来源；本文件只登记这个经典版本。

## 原作与证据

- [官方产品页](https://www.humanssince1982.com/en-int/products/clockclock-24-white-sterling)。
- [产品图库与媒体登记](../../../../artifacts/edition-references/clockclock-24-white-sterling.json)、[检查清单](../../../../artifacts/edition-references/inventory.json)。
- [官方产品图](../../../../artifacts/edition-references/clockclock-24-white-sterling-product.jpg)。
- [本款官方视频](https://cdn.shopify.com/videos/c/vp/007a5e35df7f43319b26485203d04f98/007a5e35df7f43319b26485203d04f98.HD-1080p-7.2Mbps-30409424.mp4)：41.480 秒、约 25.000 fps、1037 帧。
- [分段截图](../../../../artifacts/edition-references/clockclock-24-white-sterling-sequence.jpg)、[视频元数据](../../../../artifacts/edition-references/media.json)。截图仅用于观察，运行时不播放图片或逐帧针角。

## 布局与外观

大型号为 `clockclock24`，基准见[大型号设计](../design.md)与[几何校准](../../geometry-reference.md)。白色板面 · 银色金属双针。配色值为网页对官方照片的近似，不是厂商色号。

固定配色：`background: #e9e6de`、`board: #f6f4ef`、`long: #cbd0d2`、`short: #cbd0d2`。

白色小表盘使用共享的浅凹面绘制：盘底平缓，上侧内沿暗、右下内沿亮；同心完整圆环连续过渡，消除中央鼓起的视觉错觉。

内部阵列、字形与针臂比例保持大型号校准基准；外观由本款固定。只有画布、位置、播放速度和时间设置可以修改。

## 原片拆解与实现

| 原片范围 | 观察 / 实现依据 |
| --- | --- |
| 0–约 2.4 s | 09:34 读时与片头停留。 |
| 约 1.9–9.4 s | 从右侧依次拆字、整理为反向共线的斜直线。 |
| 约 9.9–29.4 s | 同向列波由右向左错相传播，同列近似同步。 |
| 约 26.6–41.48 s | 两针分离、逐针减速，进入 09:35。 |

网页完整换时：**41.5 秒**。动画：**斜线列波 · 本款原片节奏**。

先检查本款视频并比较逐列轴线，确认与 CC24 Black 的主体动作一致后共用已验证曲线。本款片头增加约 1.40 秒；不是把整段主体任意拉慢。逐列轮廓检查见 cc24-wave-observations.json；反光导致的数度误差不用于识别实体电机。

本款对 CC24 基准动作的时间修正：

```json
{
  "entryHold": 1.4,
  "referenceDuration": 41.47994791666667
}
```

[CC24 逐列轮廓检查](../../../../artifacts/edition-references/cc24-wave-observations.json)。

## 证据范围与验收

视频中的墙面、摄影机移动和剪辑不作为指针动作。遮挡和双针交叠无法唯一识别电机身份；网页通道分配、完整连续曲线及原片未覆盖的读时都是重建。

验收覆盖：本款可独立选择与直达；切换后原作和视频入口正确；设置独立保存；旧配置不能改写固定颜色与动作；暂停、重播、单步、分钟跨界与最终字形稳定。

[产品目录](../../../../product.md)逐款维护状态，默认动作复用只发生在明确记录来源的版本中。
