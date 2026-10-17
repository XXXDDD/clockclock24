# A million Times 61c · Tidal 设计说明

更新：2026-10-17。先检查本款原链接，再决定动作来源；本文件只登记这个经典版本。

## 原作与证据

- [官方产品页](https://www.humanssince1982.com/en-int/products/a-million-times-61c-tidal)。
- [产品图库与媒体登记](../../../../artifacts/edition-references/a-million-times-61c-tidal.json)、[检查清单](../../../../artifacts/edition-references/inventory.json)。
- [官方产品图](../../../../artifacts/edition-references/a-million-times-61c-tidal-product.jpg)。
- [本款官方视频](https://cdn.shopify.com/videos/c/vp/e8d2c29905364cd1b7f7ace8d301246e/e8d2c29905364cd1b7f7ace8d301246e.HD-1080p-7.2Mbps-30306417.mp4)：55.960 秒、约 25.000 fps、1399 帧。
- [分段截图](../../../../artifacts/edition-references/a-million-times-61c-tidal-sequence.jpg)、[视频元数据](../../../../artifacts/edition-references/media.json)。截图仅用于观察，运行时不播放图片或逐帧针角。

## 布局与外观

大型号为 `amt61c`，基准见[大型号设计](../design.md)与[几何校准](../../geometry-reference.md)。深蓝板面 · 银色金属双针。配色值为网页对官方照片的近似，不是厂商色号。

固定配色：`background: #e9e6de`、`board: #101c38`、`long: #cbd0d2`、`short: #cbd0d2`。

内部阵列、字形与针臂比例以大型号校准值作为默认；网页可调整颜色、几何、画布与时间。Tidal 默认保留本文 56 秒环弧动作，也可选择同型号 Zephyr 风势；共享只切换动作与参考时长，配色和几何保持当前设置。规则见[同型号参考动作](../../../web/shared-actions.md)。

## 原片拆解与实现

| 原片范围 | 观察 / 实现依据 |
| --- | --- |
| 0–约 10 s | 09:34 拆开，按位置转入弯折切线，形成同心环弧。 |
| 约 10–16 s | 环弧明显停留；中心组与外围不能当成同一个针角。 |
| 约 16–47 s | 两路反向转动，环弧、内收与外展反复出现，环间有相位差。 |
| 约 47–56 s | 从当前开合姿态分批进入 09:35；外围双针收拢回左下。 |

网页完整换时：**56.0 秒**。动画：**Tidal · 环弧与反向开合**。

同心环弧与反向开合来自本款视频；连续速度、同一表盘的电机编号和其他读时路径为重建。圆心双针朝上作为环弧的中心姿态。

本款阶段、传播与连续速度参数：

```json
{
  "duration": 56,
  "layout": "arc",
  "curvature": 0.3,
  "counter": true,
  "alignStart": 0.6,
  "alignEnd": 9.2,
  "waveStart": 14.8,
  "formStart": 47.5,
  "formEnd": 54.7,
  "period": 11.7,
  "ramp": 1.0,
  "modulation": 0.15,
  "radialDelay": 0.28,
  "stage": "环弧反向开合"
}
```

逐针轨迹承接进入成字时的角度与速度，以连续插值制动到读时姿态。播放中修改时间时保持当前动作，更新最终目标；已进入归位的针从当前位置继续。

## 证据范围与验收

视频中的墙面、摄影机移动和剪辑不作为指针动作。遮挡和双针交叠无法唯一识别电机身份；网页通道分配、完整连续曲线及原片未覆盖的读时都是重建。

验收覆盖：本款可独立选择与直达；切换后原作和视频入口正确；设置独立保存；旧配置不能改写固定颜色与动作；暂停、重播、单步、分钟跨界与最终字形稳定。

[产品目录](../../../../product.md)逐款维护状态，默认动作复用只发生在明确记录来源的版本中。
