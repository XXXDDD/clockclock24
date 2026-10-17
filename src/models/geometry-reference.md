# 经典款投影对齐与尺寸校准

更新日期：2026-10-17。当前有效值来自 10 个大型号的参考平面校正和模型回投影。外框比例采用官方实物尺寸；内部比例属于图像测量估计。

## 对齐方法

1. **矩形款**：独立拟合板面正面四条边，排除侧面厚度和墙面阴影；四条边相交得到四角，以官方宽高比建立单应变换，生成正视图。变换只由外板决定，表盘是独立的检验对象。
2. **Zephyr 圆形款**：用重复的正交阵列确定度量平面，再独立拟合圆板外轮廓，恢复轴距相对板径的比例。阵列位置按交错子集拟合与验证；验证子集轴心误差约 0.31 px。校正后的板面长短轴比为 0.9985。
3. **CC9 裸针款**：直线针臂遮挡轴心，使用八组可见针臂的中心线与外圆轮廓联合求解平面和阵列尺度。针臂中心线只约束轴心的垂直距离；不将线段中点当成已知轴心。校正后的板面长短轴比为 0.9994。产品图中的外围方向用于几何叠图，不用于验证动画。
4. **测量与回投影**：在校正平面测量表盘边缘、轴距与留白；更新模型后，用同一变换投回原图。叠图中的粉色为板面轮廓、青色为模型表盘／轴心、金色为针臂轮廓。72v 首帧已在运动，因此针臂叠图另取 31.99 秒的稳定 09:35 帧，并独立拟合该帧板面；其余矩形款与 Zephyr 使用首帧 09:34。

矩形款逐表盘圆边缘的测量采用径向梯度和稳健圆拟合，减少针臂、高光与阴影的影响。横纵节距分别测量后取平均，模型保留正圆与相同横纵节距。原有款采用居中阵列；新校准的 ClockClock L、AMT96 保留独立测得的首轴位置。参考图的凹槽立体边缘、照明及有限分辨率仍带来约 1–2 px 的位置不确定性。

## 当前有效比例

| 经典款与官方来源 | 官方尺寸（cm） | 轴距／板宽 | 表盘直径／轴距 | 轴心回投影 RMS（原图 px） |
| --- | --- | --- | --- | --- |
| [CC24 Black](https://www.humanssince1982.com/en-int/products/clockclock-24-black) | 90 × 40 | 11.101% | 93.301% | 1.12 |
| [ClockClock L Tidal](https://www.humanssince1982.com/en-int/products/clockclock-l-tidal) | 157 × 72 | 10.846% | 95.721% | 0.71 |
| [AMT72 Black](https://www.humanssince1982.com/en-int/products/a-million-times-72-black) | 173 × 95 | 7.503% | 94.997% | 0.80 |
| [AMT96 Bjarke Ingels](https://www.humanssince1982.com/en-int/products/a-million-times-96-bjarke-ingels) | 177 × 125 | 7.420% | 95.502% | 1.20 |
| [AMT120 Black](https://www.humanssince1982.com/en-int/products/a-million-times-120-black) | 212 × 121 | 6.127% | 95.199% | 0.72 |
| [AMT144 Black](https://www.humanssince1982.com/en-int/products/a-million-times-144-black) | 262.4 × 130.4 | 5.031% | 94.223% | 0.42 |
| [AMT288 White](https://www.humanssince1982.com/en-int/products/a-million-times-288-white) | 345.6 × 187.2 | 3.816% | 95.151% | 0.59 |
| [AMT72v Black Sterling](https://www.humanssince1982.com/en-int/products/a-million-times-72v-black-sterling) | 95 × 173 | 13.652% | 96.036% | 0.46 |
| [AMT61c Zephyr](https://www.humanssince1982.com/en-int/products/a-million-times-61c-zephyr) | 直径 146 | 8.967%（相对板径） | 93.059% | 1.52 |

[CC9 White](https://www.humanssince1982.com/en-int/products/clockclock-9-white) 官方板径为 46 cm。外围轴心距圆板中心约为板径的 **31.156%**，外围单臂平均长度约为板径的 **9.577%**；双针在菱形接缝处保留约 13% 的相邻轴距。回投影轴心到可见针臂中心线的 RMS 为 0.07 px；这个中心线指标与上表的完整轴心位置指标含义不同。

这些数据取代此前直接在原图上取宽度、圆边缘的估算。AMT72、AMT120 和 AMT288 的间隙据此回调，其他版本按校正结果微调。圆板外缘只补偿描边宽度，取消此前额外的内缩量。

## 证据与复核

- 处理脚本：[projective-calibration.py](../../artifacts/geometry-reference/projective-calibration.py)。输入为六个矩形版本的 `artifacts/*-reference-frames/000.00.png`、Zephyr 的 `artifacts/zephyr-reference-frames/frame-000.png`，以及 CC9 的[官方产品图](https://www.humanssince1982.com/cdn/shop/files/CC9_White_9962bd20-4dd1-44e9-bf1e-469636830106.png?v=1760521102&width=500)截图。视频来源见各型号的 `motionReference`。
- [完整测量记录](../../artifacts/geometry-reference/projective/measurements.json)：包含参考图四角、单应矩阵、每个表盘的测量、独立验证误差与模型回投影误差。
- 正视图为 `artifacts/geometry-reference/projective/<型号>-rectified.png`，叠图为同目录的 `<型号>-reprojection.png`。上一轮参数的测量记录保存在 `before/`。
- [自动验收数据](../../tests/fixtures/classic-geometry.json)：由参考图测量导出，记录独立的轴心／中心线、平面到原图的矩阵、表盘半径与节距。测试在横屏、竖屏、小画布下核对比例并投回原图验证，不通过修改投影矩阵来补偿模型误差。
- ClockClock L 与 AMT96 的[独立校准脚本](../../artifacts/analyze-new-family-geometry.py)、[测量记录](../../artifacts/new-family-references/geometry.json)及[验收数据](../../tests/fixtures/new-family-geometry.json)另外保留。前者使用本款正面产品图，后者使用主要换时视频 0 秒帧（11:34）；不借用其他大型号的板边或轴距。24／96 个轴心回投影最大误差分别为 1.35／2.20 px；[ClockClock L 叠图](../../artifacts/new-family-references/clockclockl-reprojection.png)和[AMT96 叠图](../../artifacts/new-family-references/amt96-reprojection.png)同时显示板边、表盘和读时针臂。

运行脚本会重新生成测量、对照图和验收数据。网页运行只使用固定的设计参数，不依赖这些图片或图像处理工具。

## 后续同型号版本的参考基准

本轮校准作为后续同型号配色、材质与动画版本的几何起点。接入时先查对应大型号的板面比例、阵列、轴距、表盘与针臂尺度，并注明沿用的基准版本；配色、材质表现和编排使用该经典版本自身的官方来源。参考中出现的几何差异另行记录和校准。

原图、平面变换、正视图、回投影叠图和误差记录一起保留，后续可复核并复用已有测量。
