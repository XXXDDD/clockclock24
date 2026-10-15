(function (root) {
  'use strict';
  const { LivelyConfig: Spec, LivelyController, Renderer, Landscape, Time } = root.Timeform;
  const byId = id => document.getElementById(id), storageKey = 'timeform-lively-local-v3';
  const embedded = JSON.parse(byId('timeform-config').textContent);
  const openedAsEditor = document.body.dataset.editor === '1' || new URLSearchParams(location.search).get('settings') === '1';
  let config = Spec.normalize(embedded), editing = false, previewResolution = [1920, 1080], controller;
  if (openedAsEditor) try { const saved = localStorage.getItem(storageKey); if (saved) config = Spec.parse(saved); } catch (_) {}
  config = Spec.normalize(Object.fromEntries(new URLSearchParams(location.search)), config);
  const viewport = byId('viewport'), area = byId('previewArea');
  function dimensions() {
    const width = Math.max(1, viewport.clientWidth), height = Math.max(1, viewport.clientHeight);
    return { width: editing && previewResolution ? previewResolution[0] : width, height: editing && previewResolution ? previewResolution[1] : height, displayWidth: width, displayHeight: height };
  }
  function arrange() {
    if (!editing) { viewport.style.width = '100%'; viewport.style.height = '100%'; return; }
    const style = getComputedStyle(area), availableWidth = Math.max(1, area.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight));
    const availableHeight = Math.max(1, area.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom));
    const ratio = previewResolution ? previewResolution[0] / previewResolution[1] : availableWidth / availableHeight;
    const width = Math.min(availableWidth, availableHeight * ratio);
    viewport.style.width = width + 'px'; viewport.style.height = width / ratio + 'px';
  }
  function background() {
    const effective = Spec.rendererConfig(config);
    document.documentElement.style.setProperty('--wallpaper-bg', effective.background);
    viewport.style.background = effective.background; document.querySelector('meta[name="theme-color"]').content = effective.background;
  }
  function refreshStats() {
    const model = Landscape.get(config.model), stats = controller.renderer.getStats(), d = dimensions();
    byId('modelName').textContent = model.name; byId('modelDescription').textContent = model.description; byId('editorModel').textContent = model.badge;
    byId('clockCount').textContent = model.count + ' 个表盘 · ' + model.count * 2 + ' 根指针';
    byId('resolutionLabel').textContent = Math.round(d.width) + ' × ' + Math.round(d.height);
    byId('displayTime').textContent = stats.display.slice(0, 2) + ':' + stats.display.slice(2);
    byId('playbackStatus').textContent = (stats.paused ? '已暂停' : stats.animating ? '过渡中' : '已归位') + ' · ' + config.playbackSpeed + '×';
    byId('boardSize').textContent = Math.round(stats.geometry.boardWidth) + ' × ' + Math.round(stats.geometry.boardHeight);
    byId('renderSize').textContent = stats.pixelWidth + ' × ' + stats.pixelHeight + ' px';
    byId('pause').textContent = stats.paused ? '继续' : '暂停'; byId('step').disabled = !stats.paused;
    byId('configSnapshot').value = Spec.serialize(config);
  }
  function changed(next) {
    config = next; background();
    if (editing) try { localStorage.setItem(storageKey, Spec.serialize(config)); } catch (_) {}
    document.dispatchEvent(new CustomEvent('timeform-lively-config', { detail: { ...config } }));
    refreshStats();
  }
  background(); arrange();
  controller = LivelyController.create({ canvas: byId('clock'), config, Renderer, readViewport: dimensions, onChange: changed });
  function resize() { arrange(); controller.renderer.resize(); refreshStats(); }
  function setEditing(value) {
    editing = Boolean(value); document.body.dataset.editing = String(editing);
    byId('editorHeader').hidden = byId('editor').hidden = !editing; byId('returnSettings').hidden = editing || !openedAsEditor;
    resize();
  }
  function exportHtml() {
    const clone = document.documentElement.cloneNode(true), body = clone.querySelector('body');
    body.dataset.editor = '0'; body.dataset.editing = 'false';
    for (const id of ['editorHeader', 'editor', 'returnSettings']) clone.querySelector('#' + id).hidden = true;
    for (const id of ['modelOptions', 'presets', ...['model', 'palette', 'colors', 'screen', 'geometry', 'motion', 'time'].map(group => 'fields-' + group)]) clone.querySelector('#' + id).replaceChildren();
    clone.querySelector('#timeform-config').textContent = JSON.stringify(config).replace(/</g, '\\u003c');
    clone.querySelector('#viewport').removeAttribute('style'); clone.querySelector('#clock').removeAttribute('style');
    return '<!doctype html>\n' + clone.outerHTML;
  }
  function thumbnail() {
    const image = document.createElement('canvas'), ctx = image.getContext('2d'); image.width = 480; image.height = 270;
    ctx.fillStyle = Spec.rendererConfig(config).background; ctx.fillRect(0, 0, 480, 270);
    const canvas = byId('clock'), width = parseFloat(canvas.style.width), height = parseFloat(canvas.style.height);
    const d = dimensions(), factor = Math.min(480 / d.displayWidth, 270 / d.displayHeight);
    const x = (480 - d.displayWidth * factor) / 2 + parseFloat(canvas.style.left) * factor;
    const y = (270 - d.displayHeight * factor) / 2 + parseFloat(canvas.style.top) * factor;
    ctx.drawImage(canvas, x, y, width * factor, height * factor); return image.toDataURL('image/jpeg', .88);
  }
  function livelyPackage() {
    const bytes = atob(thumbnail().split(',')[1]);
    return root.TimeformZip.create({ 'index.html': exportHtml(), 'LivelyInfo.json': JSON.stringify(Spec.metadata, null, 2),
      'LivelyProperties.json': JSON.stringify(Spec.livelyProperties(config), null, 2), 'thumbnail.jpg': Uint8Array.from(bytes, char => char.charCodeAt(0)) });
  }
  root.TimeformLively = { getConfig: controller.getConfig, updateConfig: controller.updateConfig, setEditing, exportHtml, livelyPackage, thumbnail,
    setPreviewResolution(value) { previewResolution = value; resize(); }, get renderer() { return controller.renderer; } };
  root.livelyPropertyListener = controller.property;
  root.livelyWallpaperPlaybackChanged = controller.playback;
  byId('hideSettings').addEventListener('click', () => setEditing(false)); byId('returnSettings').addEventListener('click', () => setEditing(true));
  byId('pause').addEventListener('click', () => controller.updateConfig({ paused: !controller.renderer.getStats().paused }));
  byId('step').addEventListener('click', () => { controller.renderer.step(100); refreshStats(); });
  byId('replay').addEventListener('click', () => { controller.renderer.replay(); refreshStats(); });
  const source = Time.createSource();
  function advance(delta) { controller.updateConfig({ source: 'manual', manualTime: Time.textFromMinutes(source.read(config) + delta), autoDemo: false }); }
  byId('previousMinute').addEventListener('click', () => advance(-1)); byId('nextMinute').addEventListener('click', () => advance(1));
  document.addEventListener('timeform-auto-time', event => controller.updateConfig({ manualTime: event.detail }));
  const observer = new ResizeObserver(resize); observer.observe(area); window.addEventListener('resize', resize);
  window.addEventListener('keydown', event => { if (event.target.closest('input,select,button,a')) return; if (event.key.toLowerCase() === 's') setEditing(!editing); else if (event.key === 'Escape' && editing) setEditing(false); });
  const timer = setInterval(() => { if (editing) refreshStats(); }, 250);
  window.addEventListener('pagehide', event => { if (!event.persisted) { controller.dispose(); observer.disconnect(); clearInterval(timer); } });
  window.addEventListener('pageshow', event => { if (event.persisted) resize(); });
  setEditing(openedAsEditor);
})(globalThis);
