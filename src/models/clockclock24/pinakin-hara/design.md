# ClockClock 24 · Pinakin Hara 设计说明

更新：2026-10-17。先检查本款原链接，再决定动作来源；本文件只登记这个经典版本。

## 原作与证据

- [官方产品页](https://www.humanssince1982.com/en-int/products/clockclock-24-pinakin-hara)。
- [产品图库与媒体登记](../../../../artifacts/edition-references/clockclock-24-pinakin-hara.json)、[检查清单](../../../../artifacts/edition-references/inventory.json)。
- [官方产品图](../../../../artifacts/edition-references/clockclock-24-pinakin-hara-product.jpg)。
- [本款官方视频](https://cdn.shopify.com/videos/c/vp/2a7b147708ed461590a4e94cea73cdf2/2a7b147708ed461590a4e94cea73cdf2.HD-1080p-7.2Mbps-74979670.mp4)：10.244 秒、约 29.970 fps、307 帧。
- [分段截图](../../../../artifacts/edition-references/clockclock-24-pinakin-hara-sequence.jpg)、[视频元数据](../../../../artifacts/edition-references/media.json)。截图仅用于观察，运行时不播放图片或逐帧针角。

## 布局与外观

大型号为 `clockclock24`，基准见[大型号设计](../design.md)与[几何校准](../../geometry-reference.md)。白色板面 · 绿色针 · 金色金属针。配色值为网页对官方照片的近似，不是厂商色号。

固定配色：`background: #e9e6de`、`board: #f6f4ef`、`long: #276750`、`short: #d1b16c`。

内部阵列、字形与针臂比例保持大型号校准基准；外观由本款固定。只有画布、位置、播放速度和时间设置可以修改。

## 原片拆解与实现

| 原片范围 | 观察 / 实现依据 |
| --- | --- |
| 0–约 1.8 s | 绿针和金针斜拍特写，双针夹角持续改变。 |
| 约 1.8–3.6 s | 全阵列呈逐列错相的开合；各位置没有保持同一条直线。 |
| 约 3.6–5.5 s | 人物远景，不能精确量测针位。 |
| 约 5.5–10.24 s | 特写与全景继续展示开合，没有稳定的最终读时。 |

网页完整换时：**40.1 秒**。动画：**Hara · 双针反向开合**。

不把剪辑点视为针的瞬移。开合方向、绿/金双针及列间相位来自可见片段；归队与成字衔接是网页重建。40.1 秒为完整网页换时，不是 10.24 秒剪辑片长。

本款阶段、传播与连续速度参数：

```json
{
  "duration": 40.1,
  "alignStart": 0.4,
  "alignEnd": 5.8,
  "waveStart": 7.2,
  "formStart": 27,
  "formEnd": 38.7,
  "heading": 0,
  "counter": true,
  "columnDelay": 0.34,
  "period": 10.7,
  "ramp": 0.65,
  "modulation": 0.2,
  "stage": "双针反向开合"
}
```

逐针轨迹承接进入成字时的角度与速度，以连续插值制动到读时姿态。播放中修改时间时保持当前动作，更新最终目标；已进入归位的针从当前位置继续。

## 证据范围与验收

视频中的墙面、摄影机移动和剪辑不作为指针动作。遮挡和双针交叠无法唯一识别电机身份；网页通道分配、完整连续曲线及原片未覆盖的读时都是重建。

验收覆盖：本款可独立选择与直达；切换后原作和视频入口正确；设置独立保存；旧配置不能改写固定颜色与动作；暂停、重播、单步、分钟跨界与最终字形稳定。

[产品目录](../../../../product.md)逐款维护状态，默认动作复用只发生在明确记录来源的版本中。
