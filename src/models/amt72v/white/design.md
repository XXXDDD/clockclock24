# A million Times 72v · White 设计说明

更新：2026-10-17。先检查本款原链接，再决定动作来源；本文件只登记这个经典版本。

## 原作与证据

- [官方产品页](https://www.humanssince1982.com/en-int/products/a-million-times-72v-white)。
- [产品图库与媒体登记](../../../../artifacts/edition-references/a-million-times-72v-white.json)、[检查清单](../../../../artifacts/edition-references/inventory.json)。
- [官方产品图](../../../../artifacts/edition-references/a-million-times-72v-white-product.jpg)。
- [本款官方视频](https://cdn.shopify.com/videos/c/vp/f7f2a011cc9e4c8eb0d9598a87a4851b/f7f2a011cc9e4c8eb0d9598a87a4851b.HD-1080p-7.2Mbps-32750138.mp4)：47.040 秒、约 25.000 fps、1176 帧。
- [分段截图](../../../../artifacts/edition-references/a-million-times-72v-white-sequence.jpg)、[视频元数据](../../../../artifacts/edition-references/media.json)。截图仅用于观察，运行时不播放图片或逐帧针角。

## 布局与外观

大型号为 `amt72v`，基准见[大型号设计](../design.md)与[几何校准](../../geometry-reference.md)。白色板面 · 深色双针。配色值为网页对官方照片的近似，不是厂商色号。

固定配色：`background: #e9e6de`、`board: #f6f4ef`、`long: #373a37`、`short: #424541`。

内部阵列、字形与针臂比例保持大型号校准基准；外观由本款固定。只有画布、位置、播放速度和时间设置可以修改。

## 原片拆解与实现

| 原片范围 | 观察 / 实现依据 |
| --- | --- |
| 0–约 8–11 s | 从读时逐列拆开，整理为 135°/315° 的共线斜针。 |
| 约 10.1 s 起，列间延后 | 同列近似同步、双针同向转动；竖排为右侧先行，两个横屏为左侧先行。 |
| 约 31.7–47.0 s | 各列陆续分离，双针减速归位；最后保持 09:35。 |

网页完整换时：**47.0 秒**。动画：**斜线列波与逐针成型**。

轴线轮廓每 0.2 秒观测一次，在列波段拟合连续相位曲线。周期 12.1382 秒、列延迟 0.3956 秒；三个代表列的拟合 RMS 约 2.378°，仅是运动轴线的检查，不代表全片逐针误差。归队/成字曲线及交叠后的针序为重建。

本款阶段、传播与连续速度参数：

```json
{
  "duration": 47.0,
  "alignStart": 0.45,
  "alignEnd": 5.4,
  "waveStart": 10.1341,
  "formStart": 31.7,
  "formEnd": 46.0,
  "heading": 135,
  "opposed": true,
  "period": 12.1382,
  "columnDelay": 0.3956,
  "stage": "斜线列波",
  "order": -1,
  "ramp": 1.1848,
  "modulation": 0.0149
}
```

逐针轨迹承接进入成字时的角度与速度，以连续插值制动到读时姿态。播放中修改时间时保持当前动作，更新最终目标；已进入归位的针从当前位置继续。

[列波轮廓与拟合结果](../../../../artifacts/edition-references/amt-column-observations.json)。

## 证据范围与验收

视频中的墙面、摄影机移动和剪辑不作为指针动作。遮挡和双针交叠无法唯一识别电机身份；网页通道分配、完整连续曲线及原片未覆盖的读时都是重建。

验收覆盖：本款可独立选择与直达；切换后原作和视频入口正确；设置独立保存；旧配置不能改写固定颜色与动作；暂停、重播、单步、分钟跨界与最终字形稳定。

[产品目录](../../../../product.md)逐款维护状态，默认动作复用只发生在明确记录来源的版本中。
