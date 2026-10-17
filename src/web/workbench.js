(function (root) {
  'use strict';
  const category = document.body.dataset.category;
  document.querySelectorAll('.navigation a').forEach(link => { if (link.dataset.kind === category) link.setAttribute('aria-current', 'page'); });
  if (!['landscape', 'portrait', 'circular'].includes(category)) return;
  const { Config, Classic, Time, Renderer, Palette, PaletteOptions } = root.Timeform;
  const catalog = Classic.catalog(category === 'circular' ? root.Timeform.Circular : category === 'portrait' ? root.Timeform.Portrait : root.Timeform.Landscape);
  const byId = id => document.getElementById(id);
  const selectedKey = 'timeform-dev-' + category + '-model-v2';
  const parameters = Object.fromEntries(new URLSearchParams(location.search));
  let selected = catalog.models[0].id;
  try { selected = localStorage.getItem(selectedKey) || selected; } catch (_) {}
  let model = catalog.get(parameters.model) || catalog.get(selected) || catalog.models[0];
  let fields = model.Settings.fields;
  const storageKey = () => 'timeform-dev-' + category + '-' + model.id + '-v2';
  const controls = new Map(), configurations = new Map(), familySelections = new Map(), paletteButtons = [];
  const presetOptions = [...byId('presetSelect').options].map(option => option.cloneNode(true));
  const source = Time.createSource();
  let settings, renderer, storageAvailable = true, startupMessage = '预设已载入，所有修改即时预览并自动保存。';
  byId('categoryLabel').textContent = { landscape: '横屏', circular: '圆形', portrait: '竖排' }[category];
  function notice(message, error = false) { byId('notice').textContent = message; byId('notice').dataset.error = String(error); }
  function restore() {
    if (configurations.has(model.id)) return { ...configurations.get(model.id) };
    let restored = model.Settings.normalize();
    try {
      const saved = localStorage.getItem(storageKey());
      if (saved) {
        const parsed = catalog.parse(saved);
        if (parsed.model.id !== model.id) throw new Error('本地预设配置不匹配。');
        restored = parsed.settings;
      }
      else if (model.id === 'clockclock24') {
        const legacy = localStorage.getItem('timeform-wallpaper-v1') || localStorage.getItem('timeform-scheme-v1');
        if (legacy) { restored = catalog.parse(legacy).settings; startupMessage = '已恢复旧版配置，可继续调整。'; }
      }
      if (saved) startupMessage = '已恢复此预设上次保存的调试配置。';
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
    familySelections.set(model.group, model.id);
    try { localStorage.setItem(storageKey(), Config.serialize(model, settings)); localStorage.setItem(selectedKey, model.id); localStorage.setItem(selectedKey + '-' + model.group, model.id); storageAvailable = true; }
    catch (_) { storageAvailable = false; }
    byId('saveStatus').dataset.error = String(!storageAvailable);
    byId('saveStatus').lastChild.textContent = storageAvailable ? '本地自动保存' : '保存不可用 · 请导出';
  }
  function refreshValues() {
    const action = model.getMotion?.(settings);
    byId('modelName').textContent = model.name; byId('modelDescription').textContent = model.description;
    byId('modelEdition').textContent = model.presetLabel;
    byId('classicEdition').textContent = model.edition;
    byId('classicColors').textContent = model.colors;
    byId('classicMotion').textContent = model.motion;
    byId('classicDuration').textContent = model.Settings.defaults.duration + ' s';
    byId('classicSwatch').style.background = model.Settings.defaults.board;
    byId('classicSwatch').style.setProperty('--hand', model.Settings.defaults.long);
    byId('clockCount').textContent = model.countLabel || model.count + ' 个表盘'; byId('handCount').textContent = (model.handCount || model.count * 2) + ' 根指针';
    byId('arraySize').textContent = model.arrayLabel || model.columns + ' × ' + model.rows; byId('editorModel').textContent = model.badge;
    if (byId('modelReference')) {
      byId('modelReference').hidden = !model.reference;
      if (model.reference) { byId('modelReference').href = model.reference; byId('modelReference').textContent = model.referenceLabel || model.badge + ' · 原作参考'; }
    }
    if (byId('motionReference')) {
      const borrowed = model.group === 'clockclock24' && model.family !== 'clockclockl' && settings.choreography !== model.Settings.defaults.choreography;
      const reference = action ? action.motionReference : borrowed ? catalog.get('clockclockl').motionReference : model.motionReference;
      byId('motionReference').hidden = !reference;
      if (reference) {
        byId('motionReference').href = reference;
        byId('motionReference').textContent = action ? action.source === model.id ? action.motionReferenceLabel : '动作参考 · ' + action.sourceLabel + ' ↗'
          : borrowed ? '当前动作参考 · CCL ↗' : model.motionReferenceLabel;
      }
    }
    if (byId('referenceDemo')) {
      const referenceDuration = action ? action.referenceDuration : model.referenceDuration;
      byId('referenceDemo').hidden = !referenceDuration;
      if (referenceDuration) byId('referenceDemo').textContent = '按原片节奏播放 · ' + referenceDuration + ' s ↗';
    }
    if (byId('modelNote')) byId('modelNote').textContent = model.previewNote || '画布按比例缩放预览。竖向画布仍展示横屏型号；独立竖排型号见竖排页面。';
    if (byId('referenceTime') && model.referenceTime) byId('referenceTime').textContent = '示例读时 ' + (action?.referenceTime || model.referenceTime);
    byId('editor').setAttribute('aria-label', model.name + ' 调试控制');
    byId('geometryHelp').textContent = model.geometryHelp || '短针长度不超过长针；更改比例会同步更新预览。';
    byId('clock').setAttribute('aria-label', model.name + '，现在显示 ' + byId('displayTime').textContent);
    byId('modelSelect').value = model.group;
    const selectedOption = byId('modelSelect').selectedOptions[0];
    selectedOption.textContent = selectedOption.dataset.name + ' · ' + (model.panelSize || (model.sizeCm ? model.sizeCm.join(' × ') + ' cm' : selectedOption.dataset.size));
    byId('presetSelect').value = model.id;
    const modified = Object.keys(fields).filter(key => fields[key].group !== 'time' && key !== 'playbackSpeed' && settings[key] !== model.Settings.defaults[key]);
    byId('customStatus').hidden = !modified.length;
    byId('presetState').textContent = modified.length ? '已自定义 · ' + modified.length + ' 项修改' : '原始预设';
    byId('presetState').dataset.custom = String(Boolean(modified.length));
    byId('restorePreset').disabled = !modified.length;
    for (const { button, palette } of paletteButtons) button.setAttribute('aria-pressed', String(Object.keys(Palette.fields).every(key => settings[key] === palette[key])));
    for (const button of document.querySelectorAll('[data-speed]')) button.setAttribute('aria-pressed', String(Number(button.dataset.speed) === settings.playbackSpeed));
    for (const [key, entry] of controls) {
      if (entry.input.type === 'checkbox') entry.input.checked = settings[key];
      else entry.input.value = settings[key];
      entry.input.removeAttribute('aria-invalid');
      if (entry.hex) { entry.hex.value = settings[key].toUpperCase(); entry.hex.removeAttribute('aria-invalid'); }
      if (entry.range) entry.range.value = settings[key];
    }
    controls.get('manualTime').input.disabled = settings.source !== 'manual';
    controls.get('autoDemo').input.disabled = settings.source !== 'manual';
    controls.get('demoInterval').input.disabled = settings.source !== 'manual' || !settings.autoDemo;
    controls.get('demoInterval').range.disabled = controls.get('demoInterval').input.disabled;
    if (controls.has('choreography')) controls.get('choreography').input.disabled = settings.motion !== 'wave';
    if (action && controls.get('duration').help) controls.get('duration').help.textContent = '此动作默认 ' + action.duration + ' 秒，调整后整段动作按比例缩放。';
    byId('resolutionLabel').textContent = settings.canvasWidth + ' × ' + settings.canvasHeight;
    const size = settings.canvasWidth + 'x' + settings.canvasHeight;
    byId('previewPreset').value = [...byId('previewPreset').options].some(option => option.value === size) ? size : 'custom';
    byId('configSnapshot').value = Config.serialize(model, settings);
  }
  function update(patch, message = '预览已更新，修改已自动保存。') {
    settings = model.Settings.normalize(patch, settings); arrange(); renderer.update(settings); refreshValues(); persist();
    notice(storageAvailable ? message : message + ' 浏览器无法保存，请导出 JSON。'); refreshStats();
  }
  function accept(key, value, input) {
    const decoded = Config.decode(fields[key], value, true);
    if (decoded === undefined) {
      input.setAttribute('aria-invalid', 'true');
      notice('「' + fields[key].label + '」无效，请检查格式与有效范围。', true); return;
    }
    const patch = { [key]: decoded };
    if (key === 'choreography' && model.getMotion) patch.duration = model.getMotion({ ...settings, choreography: decoded }).duration;
    update(patch);
  }
  function buildControls() {
    controls.clear();
    for (const group of ['screen', 'motion', 'time', 'colors', 'geometry', 'playback']) byId('fields-' + group).replaceChildren();
    const timeOrder = ['source', 'manualTime', 'format24', 'autoDemo', 'timezone', 'demoInterval'];
    const motionOrder = ['motion', 'choreography', 'duration', 'visibility', 'playbackSpeed'];
    const groupOrder = ['colors', 'screen', 'geometry', 'motion', 'time'];
    const rank = key => groupOrder.indexOf(fields[key].group) * 100 + Math.max(0, (fields[key].group === 'time' ? timeOrder : motionOrder).indexOf(key));
    const ordered = Object.entries(fields).sort(([a], [b]) => rank(a) - rank(b));
    for (const [key, field] of ordered) {
      if (field.hidden) continue;
      const wrapper = document.createElement('div'); wrapper.className = 'field';
      if (field.group === 'motion') wrapper.classList.add('field-wide');
      const label = document.createElement('label'); label.htmlFor = 'setting-' + key; label.textContent = field.label;
      const heading = document.createElement('div'); heading.className = 'field-label'; heading.append(label);
      const input = document.createElement(field.type === 'select' ? 'select' : 'input'); input.id = 'setting-' + key;
      const entry = { input, hex: null, range: null, help: null };
      if (field.type === 'color') {
        input.type = 'color';
        const hex = document.createElement('input'); hex.type = 'text'; hex.maxLength = 7; hex.spellcheck = false; hex.setAttribute('aria-label', field.label + ' HEX');
        const group = document.createElement('div'); group.className = 'color-inputs'; group.append(input, hex); wrapper.append(heading, group); entry.hex = hex;
        input.addEventListener('input', () => accept(key, input.value, input));
        hex.addEventListener('input', () => { if (Config.decode(field, hex.value.trim(), true) !== undefined) accept(key, hex.value.trim(), hex); });
        hex.addEventListener('change', () => accept(key, hex.value.trim(), hex));
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
          if (field.options.length === 1) input.disabled = true;
        } else { input.type = field.type === 'time' ? 'time' : 'text'; if (field.type === 'timezone') input.placeholder = '跟随设备'; }
        wrapper.append(heading, input); input.addEventListener('change', () => accept(key, input.value, input));
        if (field.type === 'time') input.addEventListener('input', () => accept(key, input.value, input));
      }
      if (field.help) { const help = document.createElement('p'); help.className = 'field-help'; help.textContent = field.help; wrapper.append(help); entry.help = help; }
      controls.set(key, entry); byId('fields-' + (key === 'playbackSpeed' ? 'playback' : field.group)).append(wrapper);
    }
    byId('palettes').replaceChildren(); byId('supplementalPalettes').replaceChildren(); paletteButtons.length = 0;
    const { originals, supplemental } = PaletteOptions.forModel(catalog.models, model, presetOptions.map(option => option.value));
    byId('paletteCount').textContent = originals.length + ' 款';
    byId('extraPaletteCount').textContent = supplemental.length + ' 款';
    byId('extraPalettes').hidden = !supplemental.length;
    for (const palette of [...originals, ...supplemental]) {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'palette-chip'; button.setAttribute('aria-label', '应用配色：' + palette.name);
      button.dataset.palette = palette.id; button.dataset.origin = palette.origin; button.title = palette.name;
      const swatch = document.createElement('span'); swatch.className = 'palette-swatch'; swatch.setAttribute('aria-hidden', 'true');
      for (const color of [palette.background, palette.board, palette.long, palette.short]) { const dot = document.createElement('i'); dot.style.background = color; swatch.append(dot); }
      const label = document.createElement('span'); label.className = 'palette-name'; label.textContent = palette.name; button.append(swatch, label);
      button.addEventListener('click', () => update(Palette.colors(palette), '已应用「' + palette.name + '」配色。'));
      paletteButtons.push({ button, palette }); byId(palette.origin === 'preset' ? 'palettes' : 'supplementalPalettes').append(button);
    }
  }
  buildControls();
  function selectModel(next, imported) {
    if (next.id === model.id && !imported) return;
    persist();
    const previousFields = Object.keys(settings);
    const paused = renderer.getStats().paused;
    renderer.dispose(); model = next; fields = model.Settings.fields;
    startupMessage = '已切换到 ' + model.name + ' · ' + model.edition + '。';
    settings = imported || restore(); buildControls(); refreshPresetOptions(); arrange(); renderer = createRenderer(); renderer.setPaused(paused);
    const url = new URL(location.href);
    for (const key of new Set([...previousFields, ...Object.keys(settings)])) url.searchParams.delete(key);
    url.searchParams.set('model', model.id);
    try { history.replaceState(null, '', url); } catch (_) {}
    refreshValues(); refreshStats(); persist();
    notice(storageAvailable ? startupMessage : startupMessage + ' 浏览器无法保存，请导出 JSON。');
  }
  function refreshPresetOptions() {
    const list = presetOptions.filter(option => option.dataset.family === model.group);
    byId('presetSelect').replaceChildren(...list.map(option => option.cloneNode(true)));
    byId('presetSelect').value = model.id;
    byId('presetCount').textContent = list.length + ' PRESETS';
    byId('previousPreset').disabled = byId('nextPreset').disabled = list.length < 2;
  }
  refreshPresetOptions();
  byId('modelSelect').addEventListener('change', event => {
    const family = event.target.value;
    let remembered = familySelections.get(family);
    try { remembered ||= localStorage.getItem(selectedKey + '-' + family); } catch (_) {}
    const next = catalog.get(remembered);
    selectModel(next?.group === family ? next : catalog.get(family) || catalog.models.find(entry => entry.group === family));
  });
  byId('presetSelect').addEventListener('change', event => selectModel(catalog.get(event.target.value)));
  function cyclePreset(delta) {
    const options = [...byId('presetSelect').options].filter(option => !option.disabled);
    const index = options.findIndex(option => option.value === model.id);
    selectModel(catalog.get(options[(index + delta + options.length) % options.length].value));
  }
  byId('previousPreset').addEventListener('click', () => cyclePreset(-1));
  byId('nextPreset').addEventListener('click', () => cyclePreset(1));
  function refreshStats() {
    const stats = renderer.getStats(), digits = stats.display;
    byId('displayTime').textContent = digits.slice(0, 2) + ':' + digits.slice(2);
    const stageName = stats.stage.replace('散相旋转', '交错旋转').replace('斜线列波', '斜线波浪').replace('Tidal 波浪', '潮汐波浪');
    byId('playbackStatus').textContent = (stats.paused ? '已暂停' + (stageName ? ' / ' + stageName : '') : stageName || (stats.animating ? '过渡中' : '已归位')) + ' · ' + settings.playbackSpeed + '×';
    byId('boardSize').textContent = Math.round(stats.geometry.boardWidth * 10) / 10 + ' × ' + Math.round(stats.geometry.boardHeight * 10) / 10;
    byId('renderSize').textContent = stats.pixelWidth + ' × ' + stats.pixelHeight + ' px';
    byId('pause').textContent = stats.paused ? '继续' : '暂停'; byId('pause').setAttribute('aria-pressed', String(stats.paused)); byId('step').disabled = !stats.paused;
  }
  byId('pause').addEventListener('click', () => { renderer.setPaused(!renderer.getStats().paused); refreshStats(); });
  byId('step').addEventListener('click', () => { renderer.step(100); refreshStats(); });
  byId('replay').addEventListener('click', () => {
    const changed = renderer.replay();
    notice(changed ? '正在重播当前动作；暂停后可单步检查。' : '当前动作需改变时间后观察，可点击 +1 分钟。'); refreshStats();
  });
  byId('settle').addEventListener('click', () => { renderer.showCurrentTime(); refreshStats(); notice('指针已归位到当前目标时间。'); });
  for (const button of document.querySelectorAll('[data-speed]')) button.addEventListener('click', () => update({ playbackSpeed: Number(button.dataset.speed) }));
  function advance(delta) { update({ source: 'manual', manualTime: Time.textFromMinutes(source.read(settings) + delta), autoDemo: false }, '已切换到指定时间。'); }
  byId('previousMinute').addEventListener('click', () => advance(-1)); byId('nextMinute').addEventListener('click', () => advance(1));
  byId('liveTime').addEventListener('click', () => update({ source: 'live', autoDemo: false }, '已恢复跟随设备时间。'));
  byId('referenceTime')?.addEventListener('click', () => {
    const time = model.getMotion?.(settings).referenceTime || model.referenceTime || '12:36';
    update({ source: 'manual', manualTime: time, autoDemo: false }, '已切换到示例时间 ' + time + '。');
  });
  byId('referenceDemo')?.addEventListener('click', () => {
    const action = model.getMotion?.(settings), reference = action || model;
    if (!reference.referenceDuration) return;
    const motion = Object.fromEntries(Object.entries(fields).filter(([key, field]) => field.group === 'motion' && key !== 'playbackSpeed').map(([key]) => [key, model.Settings.defaults[key]]));
    update({ ...(action ? { duration: action.duration } : motion), source: 'manual', manualTime: reference.referenceTime, autoDemo: false });
    renderer.showCurrentTime();
    const targetTime = Time.textFromMinutes(Time.minutesFromText(reference.referenceTime) + 1);
    update({ manualTime: targetTime, playbackSpeed: 1 }, '按原片节奏播放 ' + reference.referenceTime + ' → ' + targetTime + '；可暂停、单步对照。');
    if (reference.referenceClip) {
      renderer.playReference();
      notice('从原片首帧的旋转姿态开始，约 ' + reference.referenceDuration + ' 秒形成 ' + targetTime + '；可暂停、单步对照。');
    }
    refreshStats();
  });
  byId('previewPreset').addEventListener('change', event => {
    if (event.target.value === 'custom') { byId('fullCustomization').open = true; controls.get('canvasWidth').input.focus(); return; }
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
      const imported = catalog.parse(await file.text());
      selectModel(imported.model, imported.settings);
      notice('完整配置已导入：' + model.name + ' · ' + model.edition + '。');
    } catch (error) { notice(error.message, true); } finally { event.target.value = ''; }
  });
  function resetGroups(groups, message) {
    const patch = Object.fromEntries(Object.entries(fields).filter(([key, field]) => groups.includes(field.group) && key !== 'playbackSpeed').map(([key]) => [key, model.Settings.defaults[key]]));
    update(patch, message);
  }
  byId('restorePreset').addEventListener('click', () => resetGroups(['screen', 'motion', 'colors', 'geometry'], '已恢复此预设的动作、配色和尺寸参数。'));
  byId('resetMotion').addEventListener('click', () => resetGroups(['motion'], '已恢复此预设的动作。'));
  byId('resetColors').addEventListener('click', () => resetGroups(['colors'], '已恢复此预设的配色。'));
  byId('resetGeometry').addEventListener('click', () => resetGroups(['screen', 'geometry'], '已恢复此预设的尺寸、位置与指针参数。'));
  byId('reset').addEventListener('click', () => { renderer.setPaused(false); update(model.Settings.defaults, '当前预设的全部参数已重置。'); renderer.showCurrentTime(); refreshStats(); });
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
