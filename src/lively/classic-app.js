(function (root) {
  'use strict';
  const { ClassicLivelyConfig: Spec, ClassicLivelyController: Controller, Config, Renderer, BrowserEnvironment, Time } = root.Timeform;
  const byId = id => document.getElementById(id), storageKey = 'timeform-lively-complete-v4';
  const openedAsEditor = document.body.dataset.editor === '1' || new URLSearchParams(location.search).get('settings') === '1';
  let config = Spec.normalize(JSON.parse(byId('timeform-config').textContent)), editing = false, resolution = [1920, 1080], controller;
  if (openedAsEditor) try { const saved = localStorage.getItem(storageKey); if (saved) config = Spec.parse(saved); } catch (_) {}
  config = Spec.normalize(Object.fromEntries(new URLSearchParams(location.search)), config);
  const viewport = byId('viewport'), area = byId('previewArea'), controls = new Map();
  function dimensions() {
    const width = Math.max(1, viewport.clientWidth), height = Math.max(1, viewport.clientHeight);
    return { width: editing && resolution ? resolution[0] : width, height: editing && resolution ? resolution[1] : height, displayWidth: width, displayHeight: height };
  }
  function arrange() {
    if (!editing) { viewport.style.width = '100%'; viewport.style.height = '100%'; return; }
    const style = getComputedStyle(area);
    const width = Math.max(1, area.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight));
    const height = Math.max(1, area.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom));
    const ratio = resolution ? resolution[0] / resolution[1] : width / height;
    const fittedWidth = Math.min(width, height * ratio);
    viewport.style.width = fittedWidth + 'px'; viewport.style.height = fittedWidth / ratio + 'px';
  }
  function background() {
    const { settings } = Spec.resolve(config);
    document.documentElement.style.setProperty('--wallpaper-bg', settings.background);
    viewport.style.background = settings.background;
    document.querySelector('meta[name="theme-color"]').content = settings.background;
  }
  function notice(message, error = false) { byId('notice').textContent = message; byId('notice').dataset.error = String(error); }
  function refreshStats() {
    if (!editing) return;
    const stats = controller.renderer.getStats(), { model, settings } = Spec.resolve(config), d = dimensions();
    byId('modelName').textContent = model.name;
    byId('editionName').textContent = Spec.categories[model.type] + ' / ' + model.edition;
    byId('clockCount').textContent = model.countLabel || model.count + ' 个表盘';
    byId('resolutionLabel').textContent = Math.round(d.width) + ' × ' + Math.round(d.height);
    byId('displayTime').textContent = stats.display.slice(0, 2) + ':' + stats.display.slice(2);
    byId('playbackStatus').textContent = (stats.paused ? '已暂停' : stats.stage || (stats.animating ? '过渡中' : '已归位')) + ' · ' + settings.playbackSpeed + '×';
    byId('pause').textContent = config.paused ? '继续' : '暂停';
    byId('step').disabled = !stats.paused;
  }
  function showValues() {
    const { model, settings } = Spec.resolve(config);
    function options(id, values, selected) {
      const select = byId(id);
      select.replaceChildren(...values.map(([value, name]) => { const option = document.createElement('option'); option.value = value; option.textContent = name; return option; }));
      select.value = selected;
    }
    const actionOptions = Spec.fields.action.options.filter(([value]) => value === 'default' || value.startsWith(model.group + ':'));
    options('setting-action', actionOptions, actionOptions.some(([value]) => value === config.action) ? config.action : 'default');
    for (const [key, entry] of controls) {
      const field = Spec.fields[key];
      const inherited = field.group === 'colors' && key !== 'customColors' && !config.customColors
        || Spec.geometryKeys.includes(key) && !config.customGeometry || key === 'duration' && !config.customDuration;
      const value = key === 'action' && !actionOptions.some(([value]) => value === config.action) ? 'default'
        : inherited && settings[key] !== undefined ? settings[key] : config[key];
      if (entry.input.type === 'checkbox') entry.input.checked = value;
      else entry.input.value = value;
      if (entry.range) entry.range.value = value;
      if (entry.hex) entry.hex.value = value.toUpperCase();
      const disabled = inherited || key === 'manualTime' && config.source !== 'manual'
        || ['autoDemo', 'demoInterval'].includes(key) && config.source !== 'manual'
        || key === 'demoInterval' && !config.autoDemo || Spec.geometryKeys.includes(key) && !model.Settings.fields[key];
      entry.input.disabled = Boolean(disabled);
      if (entry.range) entry.range.disabled = Boolean(disabled);
      if (entry.hex) entry.hex.disabled = Boolean(disabled);
    }
    byId('actionHint').textContent = '当前动作：' + (model.Settings.fields.choreography?.options.find(option => option[0] === settings.choreography)?.[1] || model.motion) + ' · ' + settings.duration + ' 秒';
  }
  function changed(next) {
    config = next; background();
    if (openedAsEditor) try { localStorage.setItem(storageKey, Spec.serialize(config)); } catch (_) {}
    if (editing) { showValues(); refreshStats(); }
  }
  background(); arrange();
  controller = Controller.create({ canvas: byId('clock'), config, Renderer, readViewport: dimensions, environment: BrowserEnvironment.create({ onAutoTime: value => controller.updateConfig({ manualTime: value }) }), onChange: changed });
  function resize() { arrange(); controller.renderer.resize(); refreshStats(); }
  function setEditing(value) {
    editing = Boolean(value); document.body.dataset.editing = String(editing);
    byId('returnSettings').hidden = editing || !openedAsEditor;
    if (editing && !controls.size) buildControls();
    resize(); if (editing) showValues();
  }
  function accept(key, value, input) {
    const field = Spec.fields[key], decoded = Config.decode(field, value, true);
    if (decoded === undefined) { input.setAttribute('aria-invalid', 'true'); notice('「' + field.label + '」格式或范围无效。', true); return; }
    input.removeAttribute('aria-invalid');
    const patch = { [key]: decoded }, effective = Spec.resolve(config).settings;
    // Copy the visible inherited values before enabling an override in the editor.
    if (decoded === true) {
      const keys = key === 'customColors' ? ['background', 'board', 'long', 'short'] : key === 'customGeometry' ? Spec.geometryKeys : key === 'customDuration' ? ['duration'] : [];
      for (const name of keys) if (effective[name] !== undefined) patch[name] = effective[name];
    }
    controller.updateConfig(patch); notice('配置已保存到本地；导出新包后可在 Lively 使用。');
  }
  function buildControls() {
    for (const [key, field] of Object.entries(Spec.fields)) {
      const wrapper = document.createElement('div'); wrapper.className = 'field';
      const label = document.createElement('label'); label.htmlFor = 'setting-' + key; label.textContent = field.label + (field.unit ? '（' + field.unit + '）' : '');
      const input = document.createElement(field.type === 'select' ? 'select' : 'input'); input.id = 'setting-' + key;
      const entry = { input }; wrapper.append(label);
      if (field.type === 'select') {
        for (const [value, name] of field.options) { const option = document.createElement('option'); option.value = value; option.textContent = name; input.append(option); }
        wrapper.append(input); input.addEventListener('change', () => accept(key, input.value, input));
      } else if (field.type === 'checkbox') {
        input.type = 'checkbox'; label.className = 'check-label'; label.prepend(input);
        input.addEventListener('change', () => accept(key, input.checked, input));
      } else if (field.type === 'number') {
        input.type = 'number'; input.min = field.min; input.max = field.max; input.step = field.step;
        const range = document.createElement('input'); range.type = 'range'; range.min = field.min; range.max = field.max; range.step = field.step; range.setAttribute('aria-label', field.label + '滑块');
        const group = document.createElement('div'); group.className = 'numeric-controls'; group.append(range, input); wrapper.append(group); entry.range = range;
        input.addEventListener('input', () => accept(key, input.value, input)); range.addEventListener('input', () => accept(key, range.value, range));
      } else if (field.type === 'color') {
        input.type = 'color'; const hex = document.createElement('input'); hex.type = 'text'; hex.maxLength = 7; hex.setAttribute('aria-label', field.label + ' HEX');
        const group = document.createElement('div'); group.className = 'color-controls'; group.append(input, hex); wrapper.append(group); entry.hex = hex;
        input.addEventListener('input', () => accept(key, input.value, input)); hex.addEventListener('change', () => accept(key, hex.value.trim(), hex));
      } else {
        input.type = field.type === 'time' ? 'time' : 'text'; if (key === 'timezone') input.placeholder = '跟随设备，例如 Asia/Hong_Kong';
        wrapper.append(input); input.addEventListener('change', () => accept(key, input.value, input));
      }
      if (field.help) { const help = document.createElement('p'); help.className = 'field-help'; help.textContent = field.help; wrapper.append(help); }
      controls.set(key, entry); byId('fields-' + field.group).append(wrapper);
    }
  }
  function exportHtml(asEditor = false) {
    const clone = document.documentElement.cloneNode(true), body = clone.querySelector('body');
    body.dataset.editor = asEditor ? '1' : '0'; body.dataset.editing = 'false';
    clone.querySelector('#timeform-config').textContent = JSON.stringify(config).replace(/</g, '\\u003c');
    clone.querySelectorAll('.fields').forEach(element => element.replaceChildren());
    clone.querySelector('#viewport').removeAttribute('style'); clone.querySelector('#clock').removeAttribute('style');
    clone.querySelector('#returnSettings').hidden = true;
    return '<!doctype html>\n' + clone.outerHTML;
  }
  function thumbnail() {
    const image = document.createElement('canvas'), ctx = image.getContext('2d'); image.width = 480; image.height = 270;
    ctx.fillStyle = Spec.resolve(config).settings.background; ctx.fillRect(0, 0, 480, 270);
    const canvas = byId('clock'), d = dimensions(), factor = Math.min(480 / d.displayWidth, 270 / d.displayHeight);
    ctx.drawImage(canvas, (480 - d.displayWidth * factor) / 2 + parseFloat(canvas.style.left) * factor,
      (270 - d.displayHeight * factor) / 2 + parseFloat(canvas.style.top) * factor,
      parseFloat(canvas.style.width) * factor, parseFloat(canvas.style.height) * factor);
    return image.toDataURL('image/jpeg', .9);
  }
  function livelyPackage() {
    const bytes = atob(thumbnail().split(',')[1]);
    return root.TimeformZip.create({ 'index.html': exportHtml(), 'configure.html': exportHtml(true),
      'LivelyInfo.json': JSON.stringify(Spec.metadata, null, 2), 'LivelyProperties.json': JSON.stringify(Spec.livelyProperties(config), null, 2),
      'default-config.json': Spec.serialize(config), 'thumbnail.jpg': Uint8Array.from(bytes, char => char.charCodeAt(0)),
      'README.txt': 'TIMEFORM 30 款全集：把 ZIP 拖入 Lively，右键壁纸卡片选择自定义。configure.html 可离线预览及重新导出。' });
  }
  function download(name, content, type) {
    const url = URL.createObjectURL(new Blob([content], { type })), anchor = document.createElement('a');
    anchor.href = url; anchor.download = name; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
  root.TimeformComplete = { getConfig: controller.getConfig, updateConfig: controller.updateConfig, setEditing, exportHtml, thumbnail, livelyPackage,
    getModel: () => config.edition, get renderer() { return controller.renderer; } };
  root.livelyPropertyListener = controller.property;
  root.livelyWallpaperPlaybackChanged = controller.playback;
  byId('hideSettings').addEventListener('click', () => setEditing(false));
  byId('returnSettings').addEventListener('click', () => setEditing(true));
  byId('previewSize').addEventListener('change', event => { resolution = event.target.value === 'auto' ? null : event.target.value.split('x').map(Number); resize(); });
  byId('pause').addEventListener('click', () => controller.updateConfig({ paused: !config.paused }));
  byId('replay').addEventListener('click', () => { controller.renderer.replay(); refreshStats(); });
  byId('settle').addEventListener('click', () => { controller.renderer.showCurrentTime(); refreshStats(); });
  byId('step').addEventListener('click', () => { controller.renderer.step(100); refreshStats(); });
  byId('downloadLively').addEventListener('click', () => { download('TIMEFORM-30款全集-Lively.zip', livelyPackage(), 'application/zip'); notice('已导出，请将新 ZIP 拖入 Lively，导入为一张新壁纸。'); });
  byId('exportConfig').addEventListener('click', () => download('TIMEFORM-30款-Lively配置.json', Spec.serialize(config), 'application/json'));
  byId('importConfig').addEventListener('change', async event => {
    const file = event.target.files[0]; if (!file) return;
    try { if (file.size > 65536) throw new Error('请选择小于 64 KB 的配置。'); controller.updateConfig(Spec.parse(await file.text())); notice('配置已导入，可以导出壁纸包。'); }
    catch (error) { notice(error.message, true); } finally { event.target.value = ''; }
  });
  byId('resetConfig').addEventListener('click', () => { controller.updateConfig({ ...Spec.defaults, edition: config.edition }); notice('已恢复当前款式默认设置。'); });
  const observer = new ResizeObserver(resize); observer.observe(area); window.addEventListener('resize', resize);
  window.addEventListener('keydown', event => { if (event.target.closest('input,select,button,a')) return; if (event.key.toLowerCase() === 's') setEditing(!editing); else if (event.key === 'Escape' && editing) setEditing(false); });
  const timer = setInterval(() => { if (editing) refreshStats(); }, 250);
  window.addEventListener('pagehide', event => { if (!event.persisted) { controller.dispose(); observer.disconnect(); clearInterval(timer); } });
  window.addEventListener('pageshow', event => { if (event.persisted) resize(); });
  setEditing(openedAsEditor);
})(globalThis);
