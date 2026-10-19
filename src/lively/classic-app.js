(function (root) {
  'use strict';
  const { ClassicLivelyConfig: Spec, ClassicLivelyController: Controller, Config, Renderer, BrowserEnvironment, Time, Localization: I18n } = root.Timeform;
  const byId = id => document.getElementById(id), storageKey = 'timeform-lively-complete-v4';
  const openedAsEditor = document.body.dataset.editor === '1' || new URLSearchParams(location.search).get('settings') === '1';
  let config = Spec.normalize(JSON.parse(byId('timeform-config').textContent)), editing = false, resolution = [1920, 1080], controller;
  if (openedAsEditor) try { const saved = localStorage.getItem(storageKey); if (saved) config = Spec.parse(saved); } catch (_) {}
  config = Spec.normalize(Object.fromEntries(new URLSearchParams(location.search)), config);
  const viewport = byId('viewport'), area = byId('previewArea'), controls = new Map();
  const languageKey = 'timeform-interface-language';
  let locale = I18n.language(root.navigator?.language);
  try { const saved = localStorage.getItem(languageKey); if (saved) locale = I18n.language(saved); } catch (_) {}
  const t = (key, values) => I18n.t(key, locale, values);
  function setLanguage(value, save = false) {
    locale = I18n.language(value); document.documentElement.lang = locale; document.title = t('title');
    byId('interfaceLanguage').value = locale;
    byId('interfaceLanguage').setAttribute('aria-label', t('language'));
    byId('previewSize').setAttribute('aria-label', t('resolution'));
    byId('editor').setAttribute('aria-label', t('settings'));
    for (const element of document.querySelectorAll('[data-i18n]')) element.textContent = t(element.dataset.i18n);
    for (const element of document.querySelectorAll('[data-size-label]')) element.textContent = t(element.dataset.sizeLabel) + ' · ' + element.value.replace('x', ' × ');
    if (save) try { localStorage.setItem(languageKey, locale); } catch (_) {}
    if (editing) {
      controls.clear(); document.querySelectorAll('.fields').forEach(element => element.replaceChildren());
      buildControls(); showValues(); refreshStats();
    }
    notice(t('saved'));
  }
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
    byId('editionName').textContent = I18n.text(Spec.categories[model.type], locale) + ' / ' + model.edition;
    byId('clockCount').textContent = t(model.id === 'clockclock9' ? 'pairs' : 'count', { count: model.count });
    byId('resolutionLabel').textContent = Math.round(d.width) + ' × ' + Math.round(d.height);
    byId('displayTime').textContent = stats.display.slice(0, 2) + ':' + stats.display.slice(2);
    byId('clock').setAttribute('aria-label', t('clockDescription', { name: model.name, time: byId('displayTime').textContent }));
    byId('playbackStatus').textContent = (stats.paused ? t('paused') : locale === 'zh-CN' && stats.stage || (stats.animating ? t('inMotion') : t('ready'))) + ' · ' + settings.playbackSpeed + '×';
    byId('pause').textContent = config.paused ? t('resume') : t('pause');
    byId('step').disabled = !stats.paused;
  }
  function showValues() {
    const { model, settings } = Spec.resolve(config);
    function options(id, values, selected) {
      const select = byId(id);
      select.replaceChildren(...values.map(([value, name]) => { const option = document.createElement('option'); option.value = value; option.textContent = name; return option; }));
      select.value = selected;
    }
    const actionOptions = I18n.field('action', Spec.fields.action, locale).options.filter(([value]) => value === 'default' || value.startsWith(model.group + ':'));
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
        || config.borderless && key === 'background'
        || ['autoDemo', 'demoInterval'].includes(key) && config.source !== 'manual'
        || key === 'demoInterval' && !config.autoDemo || Spec.geometryKeys.includes(key) && !model.Settings.fields[key];
      entry.input.disabled = Boolean(disabled);
      if (entry.range) entry.range.disabled = Boolean(disabled);
      if (entry.hex) entry.hex.disabled = Boolean(disabled);
    }
    const actionName = model.Settings.fields.choreography?.options.find(option => option[0] === settings.choreography)?.[1];
    byId('actionHint').textContent = t('action', { name: actionName ? I18n.text(actionName, locale) : t('originalMotion'), duration: settings.duration });
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
    if (decoded === undefined) { input.setAttribute('aria-invalid', 'true'); notice(t('invalid', { field: I18n.field(key, field, locale).label }), true); return; }
    input.removeAttribute('aria-invalid');
    const patch = { [key]: decoded }, effective = Spec.resolve(config).settings;
    // Copy the visible inherited values before enabling an override in the editor.
    if (decoded === true) {
      const keys = key === 'customColors' ? ['background', 'board', 'long', 'short'] : key === 'customGeometry' ? Spec.geometryKeys : key === 'customDuration' ? ['duration'] : [];
      for (const name of keys) if (effective[name] !== undefined) patch[name] = effective[name];
    }
    controller.updateConfig(patch); notice(t('saved'));
  }
  function buildControls() {
    for (const [key, original] of Object.entries(Spec.fields)) {
      const field = I18n.field(key, original, locale);
      const wrapper = document.createElement('div'); wrapper.className = 'field';
      const label = document.createElement('label'); label.htmlFor = 'setting-' + key; label.textContent = field.label + (field.unit ? ' (' + field.unit + ')' : '');
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
        const range = document.createElement('input'); range.type = 'range'; range.min = field.min; range.max = field.max; range.step = field.step; range.setAttribute('aria-label', t('slider', { field: field.label }));
        const group = document.createElement('div'); group.className = 'numeric-controls'; group.append(range, input); wrapper.append(group); entry.range = range;
        input.addEventListener('input', () => accept(key, input.value, input)); range.addEventListener('input', () => accept(key, range.value, range));
      } else if (field.type === 'color') {
        input.type = 'color'; const hex = document.createElement('input'); hex.type = 'text'; hex.maxLength = 7; hex.setAttribute('aria-label', field.label + ' HEX');
        const group = document.createElement('div'); group.className = 'color-controls'; group.append(input, hex); wrapper.append(group); entry.hex = hex;
        input.addEventListener('input', () => accept(key, input.value, input)); hex.addEventListener('change', () => accept(key, hex.value.trim(), hex));
      } else {
        input.type = field.type === 'time' ? 'time' : 'text'; if (key === 'timezone') input.placeholder = t('timezonePlaceholder');
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
      'LivelyInfo.loc.json': JSON.stringify(Spec.metadataLocalization(), null, 2), 'LivelyProperties.loc.json': JSON.stringify(Spec.livelyLocalization(config), null, 2),
      'default-config.json': Spec.serialize(config), 'thumbnail.jpg': Uint8Array.from(bytes, char => char.charCodeAt(0)),
      'README.txt': I18n.t('instructions', 'en') + '\n' + I18n.t('saved', 'en'),
      'README.en.txt': I18n.t('instructions', 'en') + '\n' + I18n.t('saved', 'en'),
      'README.zh-CN.txt': I18n.t('instructions', 'zh-CN') + '\n' + I18n.t('saved', 'zh-CN') });
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
  byId('downloadLively').addEventListener('click', () => { download('TIMEFORM-Lively.zip', livelyPackage(), 'application/zip'); notice(t('exported')); });
  byId('exportConfig').addEventListener('click', () => download('TIMEFORM-settings.json', Spec.serialize(config), 'application/json'));
  byId('importConfig').addEventListener('change', async event => {
    const file = event.target.files[0]; if (!file) return;
    try { if (file.size > 65536) throw new Error(t('tooLarge')); controller.updateConfig(Spec.parse(await file.text())); notice(t('imported')); }
    catch (error) { notice(locale === 'zh-CN' ? error.message : /[\u3400-\u9fff]/.test(error.message) ? I18n.error(error.message, locale, Spec.fields) : error.message, true); } finally { event.target.value = ''; }
  });
  byId('resetConfig').addEventListener('click', () => { controller.updateConfig({ ...Spec.defaults, edition: config.edition }); notice(t('resetDone')); });
  byId('interfaceLanguage').addEventListener('change', event => setLanguage(event.target.value, true));
  const observer = new ResizeObserver(resize); observer.observe(area); window.addEventListener('resize', resize);
  window.addEventListener('keydown', event => { if (event.target.closest('input,select,button,a')) return; if (event.key.toLowerCase() === 's') setEditing(!editing); else if (event.key === 'Escape' && editing) setEditing(false); });
  const timer = setInterval(() => { if (editing) refreshStats(); }, 250);
  window.addEventListener('pagehide', event => { if (!event.persisted) { controller.dispose(); observer.disconnect(); clearInterval(timer); } });
  window.addEventListener('pageshow', event => { if (event.persisted) resize(); });
  setLanguage(locale); setEditing(openedAsEditor);
})(globalThis);
