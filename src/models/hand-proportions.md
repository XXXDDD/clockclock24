# 原作长短针比例校准

更新：2026-10-17。本次修正此前将双针统一画成等长的默认值，同时修正轴心到针尖的基准长度。板面、轴心、表盘和动作轨迹保持各型号已有校准。

## 来源与量测

使用各型号已留存的官方产品图或视频帧，并复用[投影校准](geometry-reference.md)的正视变换。只量取方向分离、能辨认两根针尖的表盘；沿针臂中心线取样，用两侧背景抑制圆盘边缘与阴影，统计每组短／长比例的中位数。AMT72v 使用 31.99 秒已归位帧；AMT96 使用蓝色通道降低洞石纹理干扰，并剔除没有连续针臂信号的方向。

CC9 的长直线中点不能当作轴心。其量测使用板面外圆与菱形阵列共同约束的轴心位置，再分别量两端长度；此前把整条线的一半作为两根等长针，掩盖了实际差异。中央双针在同一校正平面单独核对，短／长约 82.9%。

| 型号与官方来源 | 分离针组数 | 量测短／长中位数 | 默认短针比例 | 长针尖／表盘半径 |
| --- | ---: | ---: | ---: | ---: |
| [CC24 Black](https://www.humanssince1982.com/en-int/products/clockclock-24-black) | 16 | 87.0% | 87% | 97.6% |
| [AMT61c Zephyr](https://www.humanssince1982.com/en-int/products/a-million-times-61c-zephyr) | 12 | 85.5% | 86% | 101.6% |
| [AMT72 Black](https://www.humanssince1982.com/en-int/products/a-million-times-72-black) | 66 | 85.0% | 85% | 99.1% |
| [AMT120 Black](https://www.humanssince1982.com/en-int/products/a-million-times-120-black) | 66 | 85.1% | 85% | 99.3% |
| [AMT144 Black](https://www.humanssince1982.com/en-int/products/a-million-times-144-black) | 74 | 84.9% | 85% | 99.2% |
| [AMT288 White](https://www.humanssince1982.com/en-int/products/a-million-times-288-white) | 118 | 84.5% | 85% | 98.3% |
| [AMT72v Black Sterling](https://www.humanssince1982.com/en-int/products/a-million-times-72v-black-sterling) | 63 | 85.0% | 85% | 97.5% |
| [CCL Tidal](https://www.humanssince1982.com/en-int/products/clockclock-l-tidal) | 12 | 88.8% | 89% | 91.0% |
| [AMT96 Bjarke Ingels](https://www.humanssince1982.com/en-int/products/a-million-times-96-bjarke-ingels) | 17 | 85.3% | 85% | 96.2% |
| [CC9 White](https://www.humanssince1982.com/en-int/products/clockclock-9-white) | 8 | 84.8% | 85% | 裸针，无独立小表盘 |

CC9 长针约占板径 10.69%；外围短针默认 85%，中央时针在此基础上再乘 98%，合计约为长针的 83.3%。所有型号的「长针长度」100% 代表各自原作长针基准；「短针长度」相对同一基准，不能将两项都设为 100% 再声称已还原原作。

这些数值是图像量测估计，不是厂家提供的机械尺寸。小图、金属反射和轴心定位存在约 1–2 像素误差；AMT96 洞石参考的不确定性更大，不把其小数位视为精确规格。同型号其他材质预设沿用该型号基准，仍可自定义和恢复默认。

## 绘制与复核

- 每个型号的绘制器保存自己的长针基准和固定通道分配。方向分离、长短明确的参考表盘按针尖长度登记长针通道；重叠或反射遮挡的位置保留既有通道编号，不把模糊轮廓宣称为已识别的实体电机身份。通道固定，不随每帧角度交换长短。
- 斜线列波归队按绘制器的长短针身份分配两端，同一列的长针同向、短针反向，避免只有直线轴向一致而长短颠倒。CC9 共同扫动、AMT72v 错相旋转同样保持物理两端一致；列间相位、速度曲线、双速归位通道与最终字形通道保留，归位从新的连续针位计算。反向开合、四表盘旋转及实测散相轨道继续各自编排。
- 金属、石材与配色版本的绘制包装继续使用本型号长短比例及通道；CCL 和 AMT96 保留自身独立基准。闲置双针仍按整只表盘一起显隐。
- [复核脚本](../../artifacts/measure-hand-proportions.py)、[逐针组量测记录](../../artifacts/hand-proportions/measurements.json)、同目录各型号的 `*-measurements.png` 保存了取样位置、针尖和比例。图片中粉色标长针，青色标短针；运行时不读取图片。
- [验收数据](../../tests/fixtures/hand-proportions.json)与[绘制测试](../../tests/hand-proportions.test.cjs)核对全部 30 款实际送入 Canvas 的长度、方向与两条独立通道，避免只改设置而漏改绘制包装。
- 旧配置没有 `handGeometryVersion` 且长度恰为旧默认 `100 / 100` 时迁移至本型号默认比例；其他自定义长度保留。新导出配置带修订标记，主动设置的等长双针可以正常保存、恢复。CC9 旧默认中央时针参数随旧等长配置一起迁移。
