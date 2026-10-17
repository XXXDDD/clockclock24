# ClockClock 24 · Bjarke Ingels · Sunset Dune 设计说明

更新：2026-10-17。先检查本款原链接，再决定动作来源；本文件只登记这个经典版本。

## 原作与证据

- [官方产品页](https://www.humanssince1982.com/en-int/products/clockclock-24-bjarke-ingels)。
- [产品图库与媒体登记](../../../../artifacts/edition-references/clockclock-24-bjarke-ingels.json)、[检查清单](../../../../artifacts/edition-references/inventory.json)。
- [官方产品图](../../../../artifacts/edition-references/clockclock-24-bjarke-ingels-product.jpg)。
- [本款官方视频](https://cdn.shopify.com/videos/c/vp/7c10b595ed8d42e98741848298bb846c/7c10b595ed8d42e98741848298bb846c.HD-1080p-7.2Mbps-55178830.mp4)：6.160 秒、约 25.000 fps、154 帧。
- [分段截图](../../../../artifacts/edition-references/clockclock-24-bjarke-ingels-sequence.jpg)、[视频元数据](../../../../artifacts/edition-references/media.json)。截图仅用于观察，运行时不播放图片或逐帧针角。

## 布局与外观

大型号为 `clockclock24`，基准见[大型号设计](../design.md)与[几何校准](../../geometry-reference.md)。Sunset Dune 洞石板面 · 深色针 · 银色金属边。配色值为网页对官方照片的近似，不是厂商色号。

固定配色：`background: #000000`、`board: #b56a43`、`long: #31312d`、`short: #31312d`。

内部阵列、字形与针臂比例保持大型号校准基准；外观由本款固定。只有画布、位置、播放速度和时间设置可以修改。

官网尺寸为 92×42 cm，不能直接套用普通 CC24 的 90×40 外框。保持既有轴距与针臂基准，在四边各增加 1 cm 板面留白。洞石纹理由固定分层曲线近似，天然板材逐件不同。

## 原片拆解与实现

| 原片范围 | 观察 / 实现依据 |
| --- | --- |
| 0–约 2 s | 全景的同列双针近似反向共线，列间角度不同，并持续转动。 |
| 约 2–4.2 s | 石材板面与金属边针臂特写；同样是斜线旋转。 |
| 约 4.2–6.16 s | 换角度全景，仍在列波阶段；没有完整读时起止。 |

网页完整换时：**40.1 秒**。动画：**Sunset Dune · 列间错相旋转**。

官网尺寸为 92×42 cm，不能直接套用普通 CC24 的 90×40 外框。保持既有轴距与针臂基准，在四边各增加 1 cm 板面留白。洞石纹理由固定分层曲线近似，天然板材逐件不同。完整换时入口与成字为网页重建。

本款阶段、传播与连续速度参数：

```json
{
  "duration": 40.1,
  "alignStart": 0.45,
  "alignEnd": 5.5,
  "waveStart": 8.8,
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
