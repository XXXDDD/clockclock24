'use strict';

// One record per official product URL. Sharing a model never implies a finished edition.
const variants = require('./classic-editions.js');
const define = (category, family, name, edition, slug, implementation = null, group = family) => {
  const variant = variants.find(item => item.slug === slug);
  implementation ||= variant?.id || null;
  return { category, family, group, name, edition, slug, implementation,
    designPath: variant?.designPath || (implementation ? 'src/models/' + implementation + '/design.md' : null),
    status: implementation ? 'implemented' : 'planned',
    reference: 'https://www.humanssince1982.com/en-int/products/' + slug };
};
const entries = [
  define('landscape', 'clockclock24', 'ClockClock 24', 'White', 'clockclock-24-white'),
  define('landscape', 'clockclock24', 'ClockClock 24', 'White Sterling', 'clockclock-24-white-sterling'),
  define('landscape', 'clockclock24', 'ClockClock 24', 'White Gold', 'clockclock-24-white-gold'),
  define('landscape', 'clockclock24', 'ClockClock 24', 'Black', 'clockclock-24-black', 'clockclock24'),
  define('landscape', 'clockclock24', 'ClockClock 24', 'Black Sterling', 'clockclock-24-black-sterling'),
  define('landscape', 'clockclock24', 'ClockClock 24', 'Black Gold', 'clockclock-24-black-gold'),
  define('landscape', 'clockclock24', 'ClockClock 24', 'Pinakin Neela', 'clockclock-24-pinakin-neela'),
  define('landscape', 'clockclock24', 'ClockClock 24', 'Pinakin Hara', 'clockclock-24-pinakin-hara'),
  define('landscape', 'clockclock24', 'ClockClock 24', 'Bjarke Ingels · Sunset Dune', 'clockclock-24-bjarke-ingels'),
  define('landscape', 'clockclock24', 'ClockClock 24', 'Dada Blue', 'cc24-dada-blue'),
  define('circular', 'clockclock9', 'ClockClock 9', 'White', 'clockclock-9-white', 'clockclock9'),
  define('landscape', 'clockclockl', 'ClockClock L', 'Tidal', 'clockclock-l-tidal', 'clockclockl', 'clockclock24'),
  define('landscape', 'amt96', 'A million Times 96', 'Bjarke Ingels', 'a-million-times-96-bjarke-ingels', 'amt96'),
  define('circular', 'amt61c', 'A million Times 61c', 'Zephyr', 'a-million-times-61c-zephyr', 'amt61c'),
  define('circular', 'amt61c', 'A million Times 61c', 'Tidal', 'a-million-times-61c-tidal'),
  define('portrait', 'amt72v', 'A million Times 72v', 'Tidal', 'a-million-times-72v-tidal'),
  define('portrait', 'amt72v', 'A million Times 72v', 'White', 'a-million-times-72v-white'),
  define('portrait', 'amt72v', 'A million Times 72v', 'Black', 'a-million-times-72v-black'),
  define('portrait', 'amt72v', 'A million Times 72v', 'Black Sterling', 'a-million-times-72v-black-sterling', 'amt72v'),
  define('landscape', 'amt72', 'A million Times 72', 'White Sterling', 'a-million-times-72-white-sterling'),
  define('landscape', 'amt72', 'A million Times 72', 'White', 'a-million-times-72-white-1'),
  define('landscape', 'amt72', 'A million Times 72', 'Black Sterling', 'a-million-times-72-black-sterling'),
  define('landscape', 'amt72', 'A million Times 72', 'Black', 'a-million-times-72-black', 'amt72'),
  define('landscape', 'amt120', 'A million Times 120', 'Tidal', 'a-million-times-120-tidal'),
  define('landscape', 'amt120', 'A million Times 120', 'White', 'a-million-times-120-white'),
  define('landscape', 'amt120', 'A million Times 120', 'Black', 'a-million-times-120-black', 'amt120'),
  define('landscape', 'amt144', 'A million Times 144', 'White', 'a-million-times-144-white'),
  define('landscape', 'amt144', 'A million Times 144', 'Black', 'a-million-times-144-black', 'amt144'),
  define('landscape', 'amt288', 'A million Times 288', 'White', 'a-million-times-288-white', 'amt288'),
  define('landscape', 'amt288', 'A million Times 288', 'Black', 'a-million-times-288-black')
];
const categories = { circular: '圆形', landscape: '横屏', portrait: '竖排' };
const inCategory = category => entries.filter(entry => entry.category === category);
function summary(category) {
  const list = category ? inCategory(category) : entries;
  const implemented = list.filter(entry => entry.status === 'implemented').length;
  return { total: list.length, implemented, planned: list.length - implemented };
}
function groups(category) {
  const families = [...new Set(inCategory(category).map(entry => entry.group))].sort((a, b) =>
    Number(a.startsWith('amt')) - Number(b.startsWith('amt')) || a.localeCompare(b, 'en', { numeric: true }));
  return families.map(family => ({
    family, name: entries.find(entry => entry.family === family).name,
    entries: inCategory(category).filter(entry => entry.group === family)
  }));
}
const editionLabel = entry => entry.group === entry.family ? entry.edition : entry.edition + ' · ' + entry.name;
function markdown() {
  const counts = summary();
  const tables = Object.entries(categories).map(([category, label]) => {
    const stats = summary(category);
    const rows = groups(category).flatMap(group => group.entries.map(entry => `| ${group.name} | ${editionLabel(entry)} | **${entry.implementation ? '已实现' : '待实现'}** | [官方产品页](${entry.reference}) | ${entry.implementation ? `[设计说明](${entry.designPath})` : '网页占位，未实现'} |`)).join('\n');
    return `### ${label}（${stats.total} 款：${stats.implemented} 已实现／${stats.planned} 待实现）\n\n| 型号 | 经典版本 | 网页状态 | 原设计 | 设计与实现 |\n| --- | --- | --- | --- | --- |\n${rows}`;
  }).join('\n\n');
  return `当前完整清单共 **${counts.total} 款**，其中 **${counts.implemented} 款已实现、${counts.planned} 款待实现**。状态按具体型号与版本计算：同型号的其他颜色、针臂材质或编排不因已有一个版本完成就视为已实现。\n\n${tables}`;
}
module.exports = { entries, categories, inCategory, groups, summary, markdown };
