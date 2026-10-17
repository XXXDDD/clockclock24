'use strict';
const Collection = require('../catalog/collection.js');
const { inCategory } = Collection;
const escape = value => String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
// Reference panel dimensions from the individual model calibration documents.
const sizes = { clockclock9: 'Ø 46 cm', amt61c: 'Ø 146 cm', clockclock24: '90 × 40 cm', clockclockl: '157 × 72 cm',
  amt72: '173 × 95 cm', amt96: '177 × 125 cm', amt120: '212 × 121 cm', amt144: '262.4 × 130.4 cm',
  amt288: '345.6 × 187.2 cm', amt72v: '95 × 173 cm' };
function renderPicker(category) {
  const list = inCategory(category);
  const families = [...new Set(list.map(entry => entry.group))].sort((a, b) =>
    Number(a.startsWith('amt')) - Number(b.startsWith('amt')) || a.localeCompare(b, 'en', { numeric: true }));
  const models = families.map(family => {
    const entry = list.find(entry => entry.group === family);
    const name = entry.name.replace('A million Times ', 'AMT ');
    return `<option value="${escape(family)}" data-name="${escape(name)}" data-size="${sizes[family]}">${escape(name)} · ${sizes[family]}</option>`;
  }).join('');
  const presets = list.map(entry => `<option value="${escape(entry.implementation || '')}" data-family="${escape(entry.group)}" data-edition="${escape(entry.slug)}" ${entry.implementation ? `data-model="${escape(entry.implementation)}"` : 'disabled'}>${escape(entry.family === 'clockclockl' ? 'CCL · Tidal' : entry.edition)}${entry.implementation ? '' : ' · 待实现'}</option>`).join('');
  return `<div class="selection-field"><label for="modelSelect">型号<span>MODEL</span></label><select id="modelSelect">${models}</select></div><div class="selection-field"><label for="presetSelect">预设<span id="presetCount">PRESET</span></label><div class="preset-controls"><select id="presetSelect">${presets}</select><button id="previousPreset" class="preset-arrow" type="button" aria-label="上一个预设">‹</button><button id="nextPreset" class="preset-arrow" type="button" aria-label="下一个预设">›</button></div></div>`;
}
module.exports = { ...Collection, renderPicker };
