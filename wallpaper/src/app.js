(function (root) {
  'use strict';
  const Spec = root.TimeformSettings;
  const embedded = JSON.parse(document.getElementById('timeform-config').textContent);
  const storageKey = 'timeform-wallpaper-v1';
  let config = Spec.normalize(embedded);
  if (document.body.dataset.editor === '1') {
    try { const saved = localStorage.getItem(storageKey); if (saved) config = Spec.importConfig(saved); } catch (_) { /* Exports work even if storage is unavailable. */ }
  }
  config = Spec.normalize(Spec.fromSearch(location.search), config);
  const viewport = document.getElementById('viewport'), area = document.getElementById('previewArea');
  const canvas = document.getElementById('clock');
  let editing = false, previewResolution = [1920, 1080];
  const openedAsEditor = document.body.dataset.editor === '1' || new URLSearchParams(location.search).get('settings') === '1';
  function dimensions() {
    const width = viewport.clientWidth || 1, height = viewport.clientHeight || 1;
    return editing && previewResolution ? { width: previewResolution[0], height: previewResolution[1], displayWidth: width, displayHeight: height } : { width, height };
  }
  function arrange() {
    if (!editing) { viewport.style.width = '100%'; viewport.style.height = '100%'; return; }
    const availableWidth = Math.max(1, area.clientWidth - 40), availableHeight = Math.max(1, area.clientHeight - 100);
    const ratio = previewResolution ? previewResolution[0] / previewResolution[1] : availableWidth / availableHeight;
    const width = Math.min(availableWidth, availableHeight * ratio);
    viewport.style.width = width + 'px'; viewport.style.height = width / ratio + 'px';
  }
  function paintBackground() {
    document.documentElement.style.setProperty('--wallpaper-bg', config.background);
    document.querySelector('meta[name="theme-color"]').content = config.background;
  }
  paintBackground();
  const renderer = root.TimeformRenderer.create(canvas, config, dimensions);
  function refresh() {
    arrange(); renderer.resize();
    const stats = renderer.getStats(), d = dimensions();
    document.getElementById('layoutReadout').textContent = Math.round(d.width) + ' × ' + Math.round(d.height) + ' · ' + (stats.geometry.layout === 'portrait' ? '上下两排' : '横排') + ' · 完整显示';
  }
  function updateConfig(patch) {
    config = Spec.normalize(patch, config); paintBackground(); renderer.update(config);
    if (editing) try { localStorage.setItem(storageKey, Spec.exportConfig(config)); } catch (_) { /* Optional convenience only. */ }
    document.dispatchEvent(new CustomEvent('timeform-config-change', { detail: { ...config } }));
    refresh(); return { ...config };
  }
  function setEditing(open) {
    editing = Boolean(open); document.body.dataset.editing = String(editing);
    for (const id of ['editor', 'editorHeader', 'previewCaption']) document.getElementById(id).hidden = !editing;
    document.getElementById('returnSettings').hidden = editing || !openedAsEditor;
    refresh();
  }
  const metadata = Spec.metadata;
  function exportHtml() {
    const clone = document.documentElement.cloneNode(true);
    const body = clone.querySelector('body'); body.dataset.editor = '0'; body.dataset.editing = 'false';
    for (const id of ['editor', 'editorHeader', 'previewCaption', 'returnSettings']) clone.querySelector('#' + id).hidden = true;
    for (const id of ['presets', 'fields-colors', 'fields-screen', 'fields-motion', 'fields-time']) clone.querySelector('#' + id).replaceChildren();
    clone.querySelector('#urlFallback').hidden = true;
    clone.querySelector('#timeform-config').textContent = JSON.stringify(config).replace(/</g, '\\u003c');
    clone.querySelector('#viewport').removeAttribute('style'); clone.querySelector('#clock').removeAttribute('style');
    return '<!doctype html>\n' + clone.outerHTML;
  }
  function url() {
    const target = new URL(location.href);
    if (target.pathname.endsWith('/configure.html')) target.pathname = target.pathname.replace(/configure\.html$/, 'index.html');
    target.search = Spec.toSearch(config, embedded); target.hash = ''; return target.href;
  }
  function livelyPackage() {
    const data = atob(renderer.thumbnail().split(',')[1]);
    return root.TimeformZip.create({ 'index.html': exportHtml(), 'LivelyInfo.json': JSON.stringify(metadata, null, 2), 'LivelyProperties.json': JSON.stringify(Spec.livelyProperties(config), null, 2), 'thumbnail.jpg': Uint8Array.from(data, c => c.charCodeAt(0)) });
  }
  root.TimeformWallpaper = { getConfig: () => ({ ...config }), updateConfig, setEditing, setPreviewResolution(value) { previewResolution = value; refresh(); }, exportHtml, url, livelyPackage, metadata, renderer };
  root.livelyPropertyListener = (name, value) => { const decoded = Spec.decode(name, value); if (decoded !== undefined) updateConfig({ [name]: decoded }); };
  window.addEventListener('resize', refresh);
  window.addEventListener('keydown', event => {
    if (event.target.closest('input,select,button,a')) return;
    if (event.key.toLowerCase() === 's') setEditing(!editing);
    else if (event.key === 'Escape' && editing) setEditing(false);
  });
  setEditing(openedAsEditor);
})(globalThis);
