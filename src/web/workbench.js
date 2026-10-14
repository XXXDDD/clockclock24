(function (root) {
  'use strict';
  const category = document.body.dataset.category;
  document.querySelectorAll('.navigation a').forEach(link => { if (link.dataset.kind === category) link.setAttribute('aria-current', 'page'); });
  if (category !== 'landscape') return;
  const { Landscape, Config, Palette, Time, Renderer } = root.Timeform;
  const byId = id => document.getElementById(id);
  const selectedKey = 'timeform-dev-landscape-model-v2';
  const parameters = Object.fromEntries(new URLSearchParams(location.search));
  let selected = 'clockclock24';
  try { selected = localStorage.getItem(selectedKey) || selected; } catch (_) {}
  let model = Landscape.get(parameters.model) || Landscape.get(selected) || Landscape.models[0];
  let fields = model.Settings.fields;
  const storageKey = () => 'timeform-dev-landscape-' + model.id + '-v2';
  const controls = new Map(), configurations = new Map(), presetButtons = [], modelButtons = [];
  const source = Time.createSource();
  let settings, renderer, storageAvailable = true, startupMessage = '配置已加载，修改即时预览。';
  function notice(message, error = false) { byId('notice').textContent = message; byId('notice').dataset.error = String(error); }
  function restore() {
    if (configurations.has(model.id)) return { ...configurations.get(model.id) };
    let restored = model.Settings.normalize();
    try {
      const saved = localStorage.getItem(storageKey());
      if (saved) restored = Config.parse(model, saved);
      else if (model.id === 'clockclock24') {
        const legacy = localStorage.getItem('timeform-wallpaper-v1') || localStorage.getItem('timeform-scheme-v1');
        if (legacy) { restored = Config.parse(model, legacy); startupMessage = '已恢复旧版配色与设置，当前使用 ClockClock 24。'; }
      }
    } catch (_) { startupMessage = '此型号的本地配置无法恢复，已使用默认参数；可继续调试并导出 JSON。'; }
    return restored;
  }
  settings = restore();
  settings = model.Settings.normalize(parameters, settings);
  const viewport = byId('viewport'), stage = byId('stage');
  function arrange() {
    const style = getComputedStyle(stage);
    const availableWidth = Math.max(1, stage.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight));
    const availableHeight = Math.max(1, stage.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom));
    const factor = Math.min(availableWidth / settings.canvasWidth, availableHeight / settings.canvasHeight);
    viewport.style.width = settings.canvasWidth * factor + 'px'; viewport.style.height = settings.canvasHeight * factor + 'px';
    viewport.style.background = settings.background;
  }
  arrange();
  function createRenderer() {
    return Renderer.create(byId('clock'), settings, model, () => ({
      width: settings.canvasWidth, height: settings.canvasHeight, displayWidth: viewport.clientWidth, displayHeight: viewport.clientHeight
    }));
  }
  renderer = createRenderer();
  function persist() {
    configurations.set(model.id, { ...settings });
    try { localStorage.setItem(storageKey(), Config.serialize(model, settings)); localStorage.setItem(selectedKey, model.id); storageAvailable = true; }
    catch (_) { storageAvailable = false; }
  }
  function refreshValues() {
    byId('modelName').textContent = model.name; byId('modelDescription').textContent = model.description;
    byId('clockCount').textContent = model.count + ' 个表盘'; byId('handCount').textContent = model.count * 2 + ' 根指针';
    byId('arraySize').textContent = model.columns + ' × ' + model.rows; byId('editorModel').textContent = model.badge;
    byId('editor').setAttribute('aria-label', model.name + ' 专业配置');
    byId('clock').setAttribute('aria-label', model.name + '，现在显示 ' + byId('displayTime').textContent);
    for (const { button, entry } of modelButtons) button.setAttribute('aria-pressed', String(entry.id === model.id));
    for (const [key, entry] of controls) {
      if (entry.input.type === 'checkbox') entry.input.checked = settings[key];
      else entry.input.value = settings[key];
      entry.input.removeAttribute('aria-invalid');
      if (entry.hex) { entry.hex.value = settings[key].toUpperCase(); entry.hex.removeAttribute('aria-invalid'); }
      if (entry.range) entry.range.value = settings[key];
    }
    for (const { button, preset } of presetButtons) button.setAttribute('aria-pressed', String(Object.keys(Palette.colors(settings)).every(key => settings[key] === preset[key])));
    controls.get('manualTime').input.disabled = settings.source !== 'manual';
    controls.get('autoDemo').input.disabled = settings.source !== 'manual';
    controls.get('demoInterval').input.disabled = settings.source !== 'manual' || !settings.autoDemo;
    controls.get('demoInterval').range.disabled = controls.get('demoInterval').input.disabled;
    byId('resolutionLabel').textContent = settings.canvasWidth + ' × ' + settings.canvasHeight;
    const size = settings.canvasWidth + 'x' + settings.canvasHeight;
    byId('previewPreset').value = [...byId('previewPreset').options].some(option => option.value === size) ? size : 'custom';
    byId('configSnapshot').value = Config.serialize(model, settings);
  }
  function update(patch, message = '预览已更新。') {
    settings = model.Settings.normalize(patch, settings); arrange(); renderer.update(settings); refreshValues(); persist();
    notice(storageAvailable ? message : message + ' 浏览器无法保存，请导出 JSON。'); refreshStats();
  }
  function accept(key, value, input) {
    const decoded = Config.decode(fields[key], value, true);
    if (decoded === undefined) {
      input.setAttribute('aria-invalid', 'true');
      notice('「' + fields[key].label + '」无效，请检查格式与有效范围。', true); return;
    }
    update({ [key]: decoded });
  }
  function buildControls() {
    controls.clear();
    for (const group of ['colors', 'screen', 'geometry', 'motion', 'time']) byId('fields-' + group).replaceChildren();
    for (const [key, field] of Object.entries(fields)) {
      const wrapper = document.createElement('div'); wrapper.className = 'field';
      const label = document.createElement('label'); label.htmlFor = 'setting-' + key; label.textContent = field.label;
      const heading = document.createElement('div'); heading.className = 'field-label'; heading.append(label);
      const input = document.createElement(field.type === 'select' ? 'select' : 'input'); input.id = 'setting-' + key;
      const entry = { input, hex: null, range: null };
      if (field.type === 'color') {
        input.type = 'color';
        const hex = document.createElement('input'); hex.type = 'text'; hex.maxLength = 7; hex.spellcheck = false; hex.setAttribute('aria-label', field.label + ' HEX');
        const group = document.createElement('div'); group.className = 'color-inputs'; group.append(input, hex); wrapper.append(heading, group); entry.hex = hex;
        input.addEventListener('input', () => accept(key, input.value, input)); hex.addEventListener('change', () => accept(key, hex.value.trim(), hex));
      } else if (field.type === 'checkbox') {
        input.type = 'checkbox'; label.className = 'check-label'; label.prepend(input); wrapper.append(label);
        input.addEventListener('change', () => accept(key, input.checked, input));
      } else if (field.type === 'number') {
        input.type = 'number'; input.min = field.min; input.max = field.max; input.step = field.step;
        const bounds = document.createElement('span'); bounds.className = 'bounds'; bounds.textContent = field.min + '–' + field.max + ' ' + field.unit; heading.append(bounds);
        const range = document.createElement('input'); range.type = 'range'; range.min = field.min; range.max = field.max; range.step = field.step; range.setAttribute('aria-label', field.label + '滑块');
        const group = document.createElement('div'); group.className = 'numeric-controls'; group.append(range, input); wrapper.append(heading, group); entry.range = range;
        input.addEventListener('input', () => accept(key, input.value, input));
        input.addEventListener('change', () => accept(key, input.value, input)); range.addEventListener('input', () => accept(key, range.value, range));
      } else {
        if (field.type === 'select') {
          field.options.forEach(([value, text]) => { const option = document.createElement('option'); option.value = value; option.textContent = text; input.append(option); });
        } else { input.type = field.type === 'time' ? 'time' : 'text'; if (field.type === 'timezone') input.placeholder = '跟随设备'; }
        wrapper.append(heading, input); input.addEventListener('change', () => accept(key, input.value, input));
        if (field.type === 'time') input.addEventListener('input', () => accept(key, input.value, input));
      }
      if (field.help) { const help = document.createElement('p'); help.className = 'field-help'; help.textContent = field.help; wrapper.append(help); }
      controls.set(key, entry); byId('fields-' + field.group).append(wrapper);
    }
  }
  buildControls();
  function selectModel(next, imported) {
    if (next.id === model.id && !imported) return;
    persist();
    const paused = renderer.getStats().paused;
    renderer.dispose(); model = next; fields = model.Settings.fields;
    startupMessage = '已切换到 ' + model.name + '，该型号的配置已恢复。';
    settings = imported || restore(); buildControls(); arrange(); renderer = createRenderer(); renderer.setPaused(paused);
    const url = new URL(location.href);
    for (const key of Object.keys(fields)) url.searchParams.delete(key);
    url.searchParams.set('model', model.id);
    try { history.replaceState(null, '', url); } catch (_) {}
    refreshValues(); refreshStats(); persist();
    notice(storageAvailable ? startupMessage : startupMessage + ' 浏览器无法保存，请导出 JSON。');
  }
  for (const entry of Landscape.models) {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'model-option';
    button.setAttribute('aria-label', '选择 ' + entry.name);
    const name = document.createElement('strong'); name.textContent = entry.badge === 'CC24' ? entry.name : 'AMT ' + entry.count;
    const detail = document.createElement('span'); detail.textContent = entry.count + ' 个表盘 · ' + entry.columns + ' × ' + entry.rows;
    button.append(name, detail); button.addEventListener('click', () => selectModel(entry));
    byId('modelOptions').append(button); modelButtons.push({ button, entry });
  }
  for (const preset of Palette.presets) {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'preset'; button.setAttribute('aria-label', '应用' + preset.name);
    const swatch = document.createElement('span'); swatch.className = 'preset-swatch'; swatch.style.background = preset.board; swatch.style.setProperty('--hand', preset.long);
    const name = document.createElement('span'); name.textContent = preset.name; button.append(swatch, name);
    button.addEventListener('click', () => update(Palette.colors(preset), '已应用「' + preset.name + '」，动画与布局设置保持。'));
    byId('presets').append(button); presetButtons.push({ button, preset });
  }
  function refreshStats() {
    const stats = renderer.getStats(), digits = stats.display;
    byId('displayTime').textContent = digits.slice(0, 2) + ':' + digits.slice(2);
    byId('playbackStatus').textContent = (stats.paused ? '已暂停' : stats.animating ? '过渡中' : '已归位') + ' · ' + settings.playbackSpeed + '×';
    byId('boardSize').textContent = Math.round(stats.geometry.boardWidth * 10) / 10 + ' × ' + Math.round(stats.geometry.boardHeight * 10) / 10;
    byId('renderSize').textContent = stats.pixelWidth + ' × ' + stats.pixelHeight + ' px';
    byId('pause').textContent = stats.paused ? '继续' : '暂停'; byId('pause').setAttribute('aria-pressed', String(stats.paused)); byId('step').disabled = !stats.paused;
  }
  byId('pause').addEventListener('click', () => { renderer.setPaused(!renderer.getStats().paused); refreshStats(); });
  byId('step').addEventListener('click', () => { renderer.step(100); refreshStats(); });
  byId('replay').addEventListener('click', () => {
    const changed = renderer.replay();
    notice(changed ? '动画已重播；暂停时可用单步检查。' : '当前为平滑过渡，请切换一分钟观察变化。'); refreshStats();
  });
  function advance(delta) { update({ source: 'manual', manualTime: Time.textFromMinutes(source.read(settings) + delta), autoDemo: false }, '已切换到指定时间。'); }
  byId('previousMinute').addEventListener('click', () => advance(-1)); byId('nextMinute').addEventListener('click', () => advance(1));
  byId('previewPreset').addEventListener('change', event => {
    if (event.target.value === 'custom') { controls.get('canvasWidth').input.focus(); return; }
    const [canvasWidth, canvasHeight] = event.target.value.split('x').map(Number); update({ canvasWidth, canvasHeight });
  });
  byId('save').addEventListener('click', () => { persist(); notice(storageAvailable ? '方案已保存到当前浏览器。' : '当前浏览器无法保存，请导出 JSON。', !storageAvailable); });
  byId('exportConfig').addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([Config.serialize(model, settings)], { type: 'application/json;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'TIMEFORM-' + model.badge + '.json'; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 30000); notice('配置已导出，包含种类、型号与参数。');
  });
  byId('importConfig').addEventListener('change', async event => {
    const file = event.target.files[0]; if (!file) return;
    try {
      if (file.size > 65536) throw new Error('请选择小于 64 KB 的配置文件。');
      const imported = Landscape.parse(await file.text());
      selectModel(imported.model, imported.settings);
      notice('方案已导入，当前为 ' + model.name + '。');
    } catch (error) { notice(error.message, true); } finally { event.target.value = ''; }
  });
  byId('reset').addEventListener('click', () => { renderer.setPaused(false); update(model.Settings.defaults, '已恢复经典黑和默认调试参数。'); });
  byId('fullscreen').addEventListener('click', async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await stage.requestFullscreen(); }
    catch (_) { notice('此浏览器暂不支持全屏预览。', true); }
  });
  function resize() { arrange(); renderer.resize(); refreshStats(); }
  const observer = new ResizeObserver(resize); observer.observe(stage);
  window.addEventListener('resize', resize); document.addEventListener('fullscreenchange', resize);
  document.addEventListener('timeform-auto-time', event => { settings.manualTime = event.detail; refreshValues(); persist(); refreshStats(); });
  const statsTimer = setInterval(refreshStats, 250);
  window.addEventListener('pagehide', event => {
    if (event.persisted) return;
    renderer.dispose(); observer.disconnect(); clearInterval(statsTimer);
  });
  window.addEventListener('pageshow', event => { if (event.persisted) resize(); });
  root.Timeform.Workbench = { getConfig: () => ({ ...settings }), getModel: () => model.id, update, get renderer() { return renderer; } };
  try { localStorage.setItem(selectedKey, model.id); } catch (_) { storageAvailable = false; }
  refreshValues(); notice(startupMessage); refreshStats();
})(globalThis);
