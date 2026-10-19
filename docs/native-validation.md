# 桌面壁纸原生自定义验收

2026-10-19，为 v3.4.1 发布验证。宿主为 Lively 2.2.1.0 与 Wallpaper Engine 2.8.42。

两端各 33 个公开配置项均从宿主原生界面实际调整，并确认画面变化；未发现新增设置失效。使用 AMT144、ClockClock 9、AMT72v Black 分别覆盖横屏、圆形、竖排。这不是 30 款 × 33 项的原生全组合验收；全部 30 款另由自动测试覆盖。

| 组别 | 已调整的配置项 |
| --- | --- |
| 款式与屏幕 | edition、borderless、scale、padding、offsetX、offsetY |
| 配色 | customColors、background、board、long、short |
| 动作与播放 | action、customDuration、duration、visibility、playbackSpeed、paused |
| 时间 | format24、timezone、source、manualTime、autoDemo、demoInterval |
| 尺寸与指针 | customGeometry、radius、gap、longLength、shortLength、longWidth、shortWidth、centerHourLength、safeTop、safeBottom |

Lively 从原生 Customize 面板调节，截图记录实际运行壁纸；重播和立即归位按钮也已点击验证。Wallpaper Engine 从原生属性面板调节，每批修改后重新打开原生全高清弹出预览载入设置。弹出预览保留打开时的配置。

铺满模式下板面遮住画布背景，因此背景色在留边模式验证；中央时针比例在 ClockClock 9 验证，上下留白在竖排款验证。

暂停与运动对照使用截图左侧时钟区域（x=0–950，y=40–1080），排除右侧鼠标提示与窗口标题。

| 画面对照 | 间隔 | 变化像素 |
| --- | ---: | ---: |
| Wallpaper Engine 自动演示两帧 | 12.46 秒 | 53,056 |
| Wallpaper Engine 暂停两帧 | 29.03 秒 | 0 |
| Wallpaper Engine 暂停至恢复播放 | 117.76 秒 | 57,669 |
| Lively 暂停两帧 | 9.43 秒 | 0 |

测试后原有宿主配置已恢复并核对文件摘要一致。原始截图和本地验收报告保留于开发工作区，不随安装包发布。
