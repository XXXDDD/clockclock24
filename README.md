# TIMEFORM · 时间配色实验室

由 24 个表盘和 48 根指针组成的网页时钟。使用原生 HTML、Canvas 和 JavaScript，无外部依赖。

- 保留经典黑底白针、白底黑针，并提供六组其他配色。
- 独立设置背景板、长针、短针颜色及针长。
- 经典旋转与平滑过渡；指针归位后，再淡出闲置指针。
- 支持实时时间、手动演示、12/24 小时制，以及浏览器内保存方案。

## 使用

直接打开 `index.html`，或访问仓库的 GitHub Pages 页面。

GitHub Pages 使用 `main` 分支的根目录发布。更新 `index.html` 并推送后，页面会自动重新部署。

## 验证

安装 Node.js 后运行：

```sh
node --test tests/animation.test.cjs
```

检查覆盖时间归位、动画时长、显隐连续性、快速切换、配色独立性和保存配置兼容性。

多表盘指针组合的概念参考 [Humans since 1982](https://www.humanssince1982.com/en-int/collections/collectibles)。这是独立网页交互实验。
