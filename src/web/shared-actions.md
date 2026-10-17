# 同型号参考动作整理

网页按型号共享已有参考动作；动作形态相同而配色、片长、速度或归位时序不同的预设，合并为同一个动作入口。每个预设仍默认使用自己已校准的实现，不用另一段视频的参数覆盖它。以下均复用已实现并留有来源的动作，不新增动画模式。

| 型号分组 | 动作入口 | 原有实现依据 |
| --- | --- | --- |
| ClockClock 9 | 1：斜线扫动与菱形成型 | [White](../models/clockclock9/design.md) |
| ClockClock 24（含 CCL） | 3：交错旋转、斜线波浪、潮汐波浪 | [CC24](../models/clockclock24/design.md)、[CCL](../models/clockclockl/design.md)，保留既有选择规则 |
| AMT61c | 2：风势流动 · Zephyr、环弧波浪 · Tidal | [Zephyr](../models/amt61c/design.md)先朝右归队再横向风势；[Tidal](../models/amt61c/tidal/design.md)按圆心形成环弧并反向开合 |
| AMT72 | 3：向心涟漪、横向风势、斜线波浪 | [Black](../models/amt72/design.md)、[White Sterling](../models/amt72/white-sterling/design.md)、[White](../models/amt72/white/design.md)／[Black Sterling](../models/amt72/black-sterling/design.md) |
| AMT96 | 1：四表盘旋转开合 | [Bjarke Ingels](../models/amt96/design.md) |
| AMT120 | 1：环弧波浪 | [Black](../models/amt120/design.md)、[Tidal](../models/amt120/tidal/design.md)、[White](../models/amt120/white/design.md)均为环弧归队、反向开合和逐针成型，保留各自节奏 |
| AMT144 | 1：斜线波浪 | [Black](../models/amt144/design.md)、[White](../models/amt144/white/design.md)均为斜线归队与列波，速度和成型时序不另立动作 |
| AMT288 | 1：环弧波浪 | [White](../models/amt288/design.md)；[Black](../models/amt288/black/design.md)本来就沿用 White 动作 |
| AMT72v | 2：错相旋转 · 双速归位、斜线波浪 | [Black Sterling](../models/amt72v/design.md)逐列保留不同起始相位并双速成型；[White](../models/amt72v/white/design.md)／[Black](../models/amt72v/black/design.md)先整理为共线斜针再列波。[Tidal](../models/amt72v/tidal/design.md)继续沿用 Black Sterling |

`shared-actions.js` 只登记 AMT61c、AMT72、AMT72v 的新增共享关系，其余单项型号继续使用当前预设的原有实现；24 系列保留已有三选一。共享动作通过 `reference-motion.js` 切换实例并衔接当前针位，使用当前预设的绘制、布局、配色与几何参数。

选择共享动作时载入其来源预设的默认时长。手动调整时长后仍可按比例播放；JSON、URL 和本地保存同时保留动作与时长。参考视频、示例时间和原片对照跟随所选动作，AMT72v 的原片片段仍区分约 32 秒对照与 38 秒完整换时。配色切换只更改四项颜色，不改变动作。
