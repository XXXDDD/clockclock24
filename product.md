# TIMEFORM 网页时钟产品定义

## 产品定位

以 Humans since 1982 的 ClockClock 和 A million Times 原作为依据，提供工具性的网页时钟调试台。每个型号以原作布局、配色、指针造型和参考动画作为默认预设，支持在二维预览中调整完整参数。

产品固定保留**圆形、横屏、竖排**三种类别。类别用于导航，型号用于组织设计、参考资料、预览和配置；动画名称与配色不再作为额外款式。

## 经典款收录规则

- 每个收录版本必须有对应的官方产品页，实现前逐款检查该原链接及产品媒体。有本款视频时先拆解，再实现其可见动作；剪辑或缺失的首尾衔接在设计文件中标明。
- 同型号的每个原作版本独立登记进度。White、Black、Black Sterling、Zephyr、Tidal 及合作版本均使用原作名称。无本款视频时，按 2026-10-17 的新规则沿用已实现大型号的默认动作，只调整配色，并明确标注默认动作来源；其他型号的公共宣传片不算本款视频。
- 原作预设保持自己的默认动作与配色；同型号共享已有原作依据的动作，形态相同而节奏不同的版本合为一项，不跨型号拼接或新增动画。自定义不提供自行添加的通用旋转、平滑或立即换时模式。快捷配色和自由颜色继续开放，修改后标为「已自定义」，不登记为官方设计。
- ClockClock 24 全部预设（含 CCL）共用「交错旋转、斜线波浪、潮汐波浪」三项参考动作，选择后保持、不轮播。交错与潮汐沿用 CCL 原片重建，斜线保留已有 CC24 编排；各预设自身的默认参考节奏不变，每项来源与重建边界保留于设计文件。
- 型号的阵列和字形保持自身设计；可调整表盘半径、间隙、针臂长短与粗细、闲置针显示，以及画布尺寸、位置与安全留白。原作默认值始终可一键恢复。
- 默认长短针按各型号的官方参考图量测：多数 AMT 为约 85%，61c 为 86%，CC24 为 87%，CCL 为 89%；CC9 外围为 85%，中央时针约 83%。各款同时使用自己的针尖基准，不以统一等长双针替代。量测误差与复核见[长短针比例校准](src/models/hand-proportions.md)。
- 闲置显隐仅处理整只表盘都不参与读时的情况，包括外围装饰与数字内部空闲表盘；双针一起随动作渐显、渐隐或降至微光，最后一根归位时共同完成。参与数字或冒号的表盘保留完整双针，折叠的重复笔画仍显示。显隐随逐列／径向编排传播，并跟随暂停、单步和播放速度。
- 原片未覆盖的换时衔接和其他读时沿用现有重建规则，并在型号设计文件中标明证据范围，不将其包装成新的设计款式。

## 完整经典型号目录

<!-- BEGIN:CLASSIC-CATALOG -->
当前完整清单共 **30 款**，其中 **30 款已实现、0 款待实现**。状态按具体型号与版本计算：同型号的其他颜色、针臂材质或编排不因已有一个版本完成就视为已实现。

### 圆形（3 款：3 已实现／0 待实现）

| 型号 | 经典版本 | 网页状态 | 原设计 | 设计与实现 |
| --- | --- | --- | --- | --- |
| ClockClock 9 | White | **已实现** | [官方产品页](https://www.humanssince1982.com/en-int/products/clockclock-9-white) | [设计说明](src/models/clockclock9/design.md) |
| A million Times 61c | Zephyr | **已实现** | [官方产品页](https://www.humanssince1982.com/en-int/products/a-million-times-61c-zephyr) | [设计说明](src/models/amt61c/design.md) |
| A million Times 61c | Tidal | **已实现** | [官方产品页](https://www.humanssince1982.com/en-int/products/a-million-times-61c-tidal) | [设计说明](src/models/amt61c/tidal/design.md) |

### 横屏（23 款：23 已实现／0 待实现）

| 型号 | 经典版本 | 网页状态 | 原设计 | 设计与实现 |
| --- | --- | --- | --- | --- |
| ClockClock 24 | White | **已实现** | [官方产品页](https://www.humanssince1982.com/en-int/products/clockclock-24-white) | [设计说明](src/models/clockclock24/white/design.md) |
| ClockClock 24 | White Sterling | **已实现** | [官方产品页](https://www.humanssince1982.com/en-int/products/clockclock-24-white-sterling) | [设计说明](src/models/clockclock24/white-sterling/design.md) |
| ClockClock 24 | White Gold | **已实现** | [官方产品页](https://www.humanssince1982.com/en-int/products/clockclock-24-white-gold) | [设计说明](src/models/clockclock24/white-gold/design.md) |
| ClockClock 24 | Black | **已实现** | [官方产品页](https://www.humanssince1982.com/en-int/products/clockclock-24-black) | [设计说明](src/models/clockclock24/design.md) |
| ClockClock 24 | Black Sterling | **已实现** | [官方产品页](https://www.humanssince1982.com/en-int/products/clockclock-24-black-sterling) | [设计说明](src/models/clockclock24/black-sterling/design.md) |
| ClockClock 24 | Black Gold | **已实现** | [官方产品页](https://www.humanssince1982.com/en-int/products/clockclock-24-black-gold) | [设计说明](src/models/clockclock24/black-gold/design.md) |
| ClockClock 24 | Pinakin Neela | **已实现** | [官方产品页](https://www.humanssince1982.com/en-int/products/clockclock-24-pinakin-neela) | [设计说明](src/models/clockclock24/pinakin-neela/design.md) |
| ClockClock 24 | Pinakin Hara | **已实现** | [官方产品页](https://www.humanssince1982.com/en-int/products/clockclock-24-pinakin-hara) | [设计说明](src/models/clockclock24/pinakin-hara/design.md) |
| ClockClock 24 | Bjarke Ingels · Sunset Dune | **已实现** | [官方产品页](https://www.humanssince1982.com/en-int/products/clockclock-24-bjarke-ingels) | [设计说明](src/models/clockclock24/bjarke-ingels/design.md) |
| ClockClock 24 | Dada Blue | **已实现** | [官方产品页](https://www.humanssince1982.com/en-int/products/cc24-dada-blue) | [设计说明](src/models/clockclock24/dada-blue/design.md) |
| ClockClock 24 | Tidal · ClockClock L | **已实现** | [官方产品页](https://www.humanssince1982.com/en-int/products/clockclock-l-tidal) | [设计说明](src/models/clockclockl/design.md) |
| A million Times 72 | White Sterling | **已实现** | [官方产品页](https://www.humanssince1982.com/en-int/products/a-million-times-72-white-sterling) | [设计说明](src/models/amt72/white-sterling/design.md) |
| A million Times 72 | White | **已实现** | [官方产品页](https://www.humanssince1982.com/en-int/products/a-million-times-72-white-1) | [设计说明](src/models/amt72/white/design.md) |
| A million Times 72 | Black Sterling | **已实现** | [官方产品页](https://www.humanssince1982.com/en-int/products/a-million-times-72-black-sterling) | [设计说明](src/models/amt72/black-sterling/design.md) |
| A million Times 72 | Black | **已实现** | [官方产品页](https://www.humanssince1982.com/en-int/products/a-million-times-72-black) | [设计说明](src/models/amt72/design.md) |
| A million Times 96 | Bjarke Ingels | **已实现** | [官方产品页](https://www.humanssince1982.com/en-int/products/a-million-times-96-bjarke-ingels) | [设计说明](src/models/amt96/design.md) |
| A million Times 120 | Tidal | **已实现** | [官方产品页](https://www.humanssince1982.com/en-int/products/a-million-times-120-tidal) | [设计说明](src/models/amt120/tidal/design.md) |
| A million Times 120 | White | **已实现** | [官方产品页](https://www.humanssince1982.com/en-int/products/a-million-times-120-white) | [设计说明](src/models/amt120/white/design.md) |
| A million Times 120 | Black | **已实现** | [官方产品页](https://www.humanssince1982.com/en-int/products/a-million-times-120-black) | [设计说明](src/models/amt120/design.md) |
| A million Times 144 | White | **已实现** | [官方产品页](https://www.humanssince1982.com/en-int/products/a-million-times-144-white) | [设计说明](src/models/amt144/white/design.md) |
| A million Times 144 | Black | **已实现** | [官方产品页](https://www.humanssince1982.com/en-int/products/a-million-times-144-black) | [设计说明](src/models/amt144/design.md) |
| A million Times 288 | White | **已实现** | [官方产品页](https://www.humanssince1982.com/en-int/products/a-million-times-288-white) | [设计说明](src/models/amt288/design.md) |
| A million Times 288 | Black | **已实现** | [官方产品页](https://www.humanssince1982.com/en-int/products/a-million-times-288-black) | [设计说明](src/models/amt288/black/design.md) |

### 竖排（4 款：4 已实现／0 待实现）

| 型号 | 经典版本 | 网页状态 | 原设计 | 设计与实现 |
| --- | --- | --- | --- | --- |
| A million Times 72v | Tidal | **已实现** | [官方产品页](https://www.humanssince1982.com/en-int/products/a-million-times-72v-tidal) | [设计说明](src/models/amt72v/tidal/design.md) |
| A million Times 72v | White | **已实现** | [官方产品页](https://www.humanssince1982.com/en-int/products/a-million-times-72v-white) | [设计说明](src/models/amt72v/white/design.md) |
| A million Times 72v | Black | **已实现** | [官方产品页](https://www.humanssince1982.com/en-int/products/a-million-times-72v-black) | [设计说明](src/models/amt72v/black/design.md) |
| A million Times 72v | Black Sterling | **已实现** | [官方产品页](https://www.humanssince1982.com/en-int/products/a-million-times-72v-black-sterling) | [设计说明](src/models/amt72v/design.md) |
<!-- END:CLASSIC-CATALOG -->

具体布局、字形、原片动画观察与重建边界由每个版本的设计文件维护。已有大型号的 20 个版本补齐后，继续检查 ClockClock L Tidal 与 AMT96 Bjarke Ingels 的原链接及视频并独立实现；现有 9 个型号分组、30 款均可预览。ClockClock L 归入 ClockClock 24 分组，显示为「Tidal · ClockClock L」，该分组共 11 款；保留 CCL 自身的尺寸、动作选择、原链接和设计文件。

ClockClock L 为 8×3 深蓝铝板和银针，可选择散相旋转、斜线列波、Tidal 波浪，默认斜线且不轮播。原片约 16.6 秒且有剪辑，本次补充拆解中心向外传播的 Tidal，保留最早的散相旋转和用户要求的斜线动作；每项 42 秒完整流程中补足的部分与斜线复用来源已注明，不开放完整时长对照。AMT96 为 12×8 Sunset Dune 洞石阵列，按约 52.2 秒完整原片重建四表盘旋转开合及 11:34→11:35，单独实现「1」的顶部笔画，开放原片对照。两款均有自身几何测量、动作记录与设计文件。

其中 18 个新增版本各自检查并拆解产品视频；AMT72v Tidal、AMT288 Black 无对应产品视频，分别沿用 AMT72v Black Sterling、AMT288 White 的默认动作与几何，只改配色。网页将其视频入口标为「默认动作参考视频」。有视频但未覆盖完整换时的 Pinakin、Sunset Dune、AMT72 Black Sterling、AMT120 White，在各自设计文件中标明补足部分，不提供整片时长对照按钮。

## 网页组织

- **类别导航**：圆形、横屏、竖排三个版式 Tab 分别提供页面，保留现有网址与型号直达链接。
- **型号与预设**：预览旁的第一个组件先选型号，再选此型号下的预设，支持前后箭头切换。CCL 作为 ClockClock 24 的预设并保留自身尺寸，工作台共 9 个型号分组、30 个预设。
- **实现状态**：当前目录内 30 款均已实现；后续新增设计在完成前保留状态和官方产品页。
- **预设来源**：预览下方折叠显示原作配色、动作、默认时长、原设计和视频链接；自定义修改不覆盖原作信息。
- **预览与调试**：桌面页面固定于窗口，左侧预览固定，右侧控制区独立滚动，滚动与聚焦右侧深处均不移动整页。右侧按顺序为时间调试、播放调试、自定义。时间提供设备／指定时间、时区、12／24 小时制、逐分钟演示与快捷前后分钟；播放提供暂停、继续、单步、重播、立即归位、速度及适用的原片对照。
- **自定义**：依次为动作、配色、完整自定义。动作按型号共享，24 系列三项、AMT61c 两项、AMT72 三项、AMT72v 两项；其余型号各一项。相同形态的时长与速度差异不另立动作，各预设默认实现保留自身校准。选择其他动作时载入对应参考时长，配色、尺寸和指针参数不变；视频与原片对照随所选动作更新。完整时长与闲置针显示可调整，归类依据见[同型号参考动作](src/web/shared-actions.md)。配色先列出当前型号各预设已有的完整配色，24 系列包括 CCL；只修改四项颜色，保留当前动作、尺寸和指针参数。手动取色与 HEX 输入保留。相近的自加黑白、纸色、苔原、午夜方案移出列表，仅将暮色、深海、赤陶作为补充配色折叠置于配色区末尾。完整自定义收纳尺寸、位置、边距、竖排安全留白、表盘半径和间隙、指针长度和粗细。各组可独立恢复原作默认值。
- **配置管理**：置于全部控制项最后，统一保存、导入、导出和查看 JSON。每个预设独立自动保存完整配置，旧配置和 URL 参数经过校验后保留有效自定义。修改后标记「已自定义」，可恢复整个预设或全部重置。

## 质量要求

三类页面的选择器完整收录上述 30 个经典预设，默认配色与动作保持原作依据，原设计链接可查看。自定义状态与原始预设明确区分，保存、导入、刷新及型号切换后完整恢复有效修改；重置可回到原作默认值。每个预设有独立配置标识和设计文件。

时间正确、清晰可读；缩放保持板面和指针比例，正常画布下不拉伸或意外裁切。暂停、单步、重播与配置恢复稳定，各型号的动画按独立设计文件验收。

10 个大型号的默认板面宽高遵循官方实物尺寸；先确定参考图的板面投影并校正到正视平面，再测量表盘直径、轴心间距与外围留白，最后将模型投回原图逐一叠合验收。各大型号独立校准。尺寸依据、投影方法、测量误差及验收数据见[经典款投影对齐与尺寸校准](src/models/geometry-reference.md)。同型号版本沿用这一基准；CC24 Sunset Dune 官方尺寸为 92×42 cm，保留轴距并增加外围板面留白，独立记录于其设计文件。

后续同型号经典版本优先沿用本轮校准的几何基准，再依据该版本的官方参考接入配色、针臂材质表现与动画。若参考显示尺寸或布局差异，单独登记修正。保留现有原图、投影变换、正视图、叠图与测量记录，供后续版本直接查用；实现进度仍按具体经典版本维护。

## 当前范围

完整目录保持 30 款，现均已实现并有设计文件。新增版本先检查官方来源，再决定动作、配色与证据边界；不新增自定义款式。根目录与 `dist/` 的网页同步生成，`clockclock24.html` 保留为横屏入口别名。Lively 壁纸及既有 ZIP 发布包按单独的平台需求维护。
