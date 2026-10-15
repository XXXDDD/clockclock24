(function (root) {
  'use strict';
  const { LivelyConfig: Spec, Config, Landscape, Palette } = root.Timeform, app = root.TimeformLively;
  const byId = id => document.getElementById(id), controls = new Map(), modelButtons = [], presetButtons = [];
  function notice(message, error = false) { byId('notice').textContent = message; byId('notice').dataset.error = String(error); }
  function accept(key, value, input) {
    const decoded = Config.decode(Spec.fields[key], value, true);
    if (decoded === undefined) { input.setAttribute('aria-invalid', 'true'); notice('「' + Spec.fields[key].label + '」无效，请检查格式与范围。', true); return; }
    input.removeAttribute('aria-invalid'); app.updateConfig({ [key]: decoded }); notice('预览已更新，可导出到 Lively 验证。');
  }
  for (const [key, field] of Object.entries(Spec.fields)) {
    const wrapper = document.createElement('div'); wrapper.className = 'field';
    const label = document.createElement('label'); label.htmlFor = 'setting-' + key; label.textContent = field.label;
    const heading = document.createElement('div'); heading.className = 'field-label'; heading.append(label);
    const input = document.createElement(field.type === 'select' ? 'select' : 'input'); input.id = 'setting-' + key;
    const entry = { input, range: null, hex: null };
    if (field.type === 'select') {
      for (const [value, name] of field.options) { const option = document.createElement('option'); option.value = value; option.textContent = name; input.append(option); }
      wrapper.append(heading, input); input.addEventListener('change', () => accept(key, input.value, input));
    } else if (field.type === 'color') {
      input.type = 'color';
      const hex = document.createElement('input'); hex.type = 'text'; hex.maxLength = 7; hex.setAttribute('aria-label', field.label + ' HEX'); hex.spellcheck = false;
      const group = document.createElement('div'); group.className = 'color-inputs'; group.append(input, hex); wrapper.append(heading, group); entry.hex = hex;
      input.addEventListener('input', () => accept(key, input.value, input)); hex.addEventListener('change', () => accept(key, hex.value.trim(), hex));
      hex.addEventListener('input', () => { if (Config.decode(field, hex.value.trim(), true) !== undefined) accept(key, hex.value.trim(), hex); });
    } else if (field.type === 'number') {
      input.type = 'number'; input.min = field.min; input.max = field.max; input.step = field.step;
      const range = document.createElement('input'); range.type = 'range'; range.min = field.min; range.max = field.max; range.step = field.step; range.setAttribute('aria-label', field.label + '滑块'); entry.range = range;
      const bounds = document.createElement('span'); bounds.className = 'bounds'; bounds.textContent = field.min + '–' + field.max + ' ' + field.unit; heading.append(bounds);
      const group = document.createElement('div'); group.className = 'numeric-controls'; group.append(range, input); wrapper.append(heading, group);
      input.addEventListener('input', () => accept(key, input.value, input)); range.addEventListener('input', () => accept(key, range.value, range));
    } else if (field.type === 'checkbox') {
      input.type = 'checkbox'; label.className = 'check-label'; label.prepend(input); wrapper.append(label); input.addEventListener('change', () => accept(key, input.checked, input));
    } else {
      input.type = field.type === 'time' ? 'time' : 'text'; if (field.type === 'timezone') input.placeholder = '跟随设备';
      wrapper.append(heading, input); input.addEventListener('change', () => accept(key, input.value, input));
    }
    if (field.help) { const help = document.createElement('p'); help.className = 'field-help'; help.textContent = field.help; wrapper.append(help); }
    controls.set(key, entry); byId('fields-' + field.group).append(wrapper);
  }
  for (const model of Landscape.models) {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'model-option'; button.setAttribute('aria-label', '选择 ' + model.name);
    const name = document.createElement('strong'); name.textContent = model.badge;
    const detail = document.createElement('span'); detail.textContent = model.count + ' 个表盘 · ' + model.columns + ' × ' + model.rows;
    button.append(name, detail); button.addEventListener('click', () => app.updateConfig({ model: model.id })); byId('modelOptions').append(button); modelButtons.push({ button, model });
  }
  for (const preset of Palette.presets) {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'preset'; button.setAttribute('aria-label', '应用' + preset.name);
    const swatch = document.createElement('span'); swatch.className = 'preset-swatch'; swatch.style.background = preset.board; swatch.style.setProperty('--hand', preset.long);
    const name = document.createElement('span'); name.textContent = preset.name; button.append(swatch, name);
    button.addEventListener('click', () => app.updateConfig({ preset: 'custom', ...Palette.colors(preset) })); byId('presets').append(button); presetButtons.push({ button, preset });
  }
  function showValues() {
    const config = app.getConfig(), effective = Spec.rendererConfig(config);
    for (const [key, entry] of controls) {
      const value = Spec.fields[key].type === 'color' ? effective[key] : config[key];
      if (entry.input.type === 'checkbox') entry.input.checked = value; else entry.input.value = value;
      if (entry.range) entry.range.value = value;
      if (entry.hex) { entry.hex.value = value.toUpperCase(); entry.hex.disabled = config.preset !== 'custom'; entry.input.disabled = config.preset !== 'custom'; }
    }
    controls.get('manualTime').input.disabled = config.source !== 'manual';
    controls.get('autoDemo').input.disabled = config.source !== 'manual';
    const disabled = config.source !== 'manual' || !config.autoDemo;
    controls.get('demoInterval').input.disabled = controls.get('demoInterval').range.disabled = disabled;
    for (const { button, model } of modelButtons) button.setAttribute('aria-pressed', String(model.id === config.model));
    for (const { button, preset } of presetButtons) button.setAttribute('aria-pressed', String(Object.keys(Palette.colors(preset)).every(key => effective[key] === preset[key])));
  }
  function download(filename, content, type) {
    const url = URL.createObjectURL(new Blob([content], { type })), anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  byId('previewSize').addEventListener('change', event => app.setPreviewResolution(event.target.value === 'auto' ? null : event.target.value.split('x').map(Number)));
  byId('downloadLively').addEventListener('click', () => { download('TIMEFORM-五型号-Lively.zip', app.livelyPackage(), 'application/zip'); notice('已导出，把新 ZIP 拖入 Lively 后使用卡片的「自定义」。'); });
  byId('downloadHtml').addEventListener('click', () => { download('TIMEFORM-五型号-wallpaper.html', app.exportHtml(), 'text/html;charset=utf-8'); notice('已导出离线壁纸，打开即显示当前方案。'); });
  byId('exportConfig').addEventListener('click', () => { download('TIMEFORM-Lively-config.json', Spec.serialize(app.getConfig()), 'application/json'); notice('当前型号和全部参数已导出。'); });
  byId('importConfig').addEventListener('change', async event => {
    const file = event.target.files[0]; if (!file) return;
    try { if (file.size > 65536) throw new Error('请选择小于 64 KB 的配置。'); app.updateConfig(Spec.parse(await file.text())); notice('配置已导入。'); }
    catch (error) { notice(error.message, true); } finally { event.target.value = ''; }
  });
  byId('resetConfig').addEventListener('click', () => {
    const model = app.getConfig().model; app.updateConfig({ ...Spec.defaults, ...Landscape.get(model).Settings.defaults, model, preset: 'custom', paused: false }); notice('已恢复当前型号的推荐参数。');
  });
  document.addEventListener('timeform-lively-config', showValues); showValues();
})(globalThis);
