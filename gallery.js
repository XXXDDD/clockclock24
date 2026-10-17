'use strict';
(() => {
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const systemTheme = matchMedia('(prefers-color-scheme: dark)');
  let themePreference = null;
  try {
    const saved = localStorage.getItem('timeform.gallery.theme');
    if (saved === 'light' || saved === 'dark') themePreference = saved;
  } catch {}
  function applyTheme() {
    const dark = themePreference ? themePreference === 'dark' : systemTheme.matches;
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    $('#theme-toggle').setAttribute('aria-label', dark ? '切换为浅色背景' : '切换为深色背景');
    $('#theme-toggle').setAttribute('aria-pressed', String(dark));
    $('#theme-toggle use').setAttribute('href', dark ? '#i-sun' : '#i-moon');
    $('meta[name="theme-color"]').content = dark ? '#4b4b4b' : '#eeece6';
  }
  $('#theme-toggle').onclick = () => {
    themePreference = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('timeform.gallery.theme', themePreference); } catch {}
    applyTheme();
  };
  systemTheme.addEventListener('change', () => { if (!themePreference) applyTheme(); });
  applyTheme();
  const downloadPopover = $('#downloads-popover');
  downloadPopover.addEventListener('toggle', event => {
    $('#open-downloads').setAttribute('aria-expanded', String(event.newState === 'open'));
  });
  for (const link of $$('.download-option')) link.addEventListener('click', () => downloadPopover.hidePopover());
  const spec = window.Timeform?.PresentationConfig;
  const presentation = window.TimeformGallery;
  if (!spec || !presentation) {
    $('#error-state').hidden = false;
    $('.gallery').setAttribute('aria-busy', 'false');
    $('#retry').onclick = () => location.reload();
    return;
  }

  const categories = ['circular', 'landscape', 'portrait'];
  const allGroups = [...new Set(spec.models.map(model => model.group))].map(id => ({
    id,
    category: spec.models.find(model => model.group === id).type,
    editions: spec.models.filter(model => model.group === id)
  })).sort((a, b) => {
    const [aw, ah] = presentation.physicalSize(a.editions[0]);
    const [bw, bh] = presentation.physicalSize(b.editions[0]);
    return aw * ah - bw * bh;
  });
  // Prefer the light edition when first entering a group, while keeping each original preset intact.
  const preferred = group => group.editions.find(model => model.edition === 'White') || group.editions[0];
  const memory = new Map(allGroups.map(group => [group.id, preferred(group).id]));
  const categoryMemory = new Map(categories.map(category => [category, allGroups.find(group => group.category === category).id]));
  let group = allGroups.find(item => item.id === 'amt72');
  let category = group.category;
  let edition = preferred(group);
  let preview;
  let transition;
  let paused = false;
  let thumbnails = [];
  categoryMemory.set(category, group.id);
  const artboard = $('#artboard');
  const stage = $('#stage');
  const dialog = $('#collection');

  function viewport(element) {
    const displayWidth = element.clientWidth, displayHeight = element.clientHeight;
    // Keep the models' pixel-based safe areas proportional inside small previews.
    const height = 1920, width = displayWidth / Math.max(1, displayHeight) * height;
    return { width, height, displayWidth, displayHeight };
  }
  function sizeArtwork(model = edition) {
    const { width, height } = presentation.displaySize(model, stage.clientWidth, stage.clientHeight, matchMedia('(max-width: 700px)').matches);
    artboard.style.width = width + 'px';
    artboard.style.height = height + 'px';
    stage.style.setProperty('--artwork-height', height + 'px');
  }
  function controls() {
    for (const button of $$('.shape-button')) button.setAttribute('aria-pressed', String(button.dataset.category === category));
    const swatches = $('#swatches');
    swatches.replaceChildren();
    swatches.hidden = group.editions.length < 2;
    for (const model of group.editions) {
      const button = document.createElement('button');
      const { board, long } = model.Settings.defaults;
      button.type = 'button';
      button.className = 'swatch';
      button.setAttribute('aria-label', model.name + ' · ' + model.edition);
      button.setAttribute('aria-pressed', String(model.id === edition.id));
      button.style.setProperty('--swatch', `linear-gradient(135deg, ${board} 0 63%, ${long} 64% 100%)`);
      button.innerHTML = '<span aria-hidden="true"></span>';
      button.onclick = () => selectEdition(model);
      swatches.append(button);
    }
    const peers = allGroups.filter(item => item.category === category);
    for (const [id, direction, label] of [['previous', -1, '上一个型号'], ['next', 1, '下一个型号']]) {
      const button = $('#' + id);
      button.hidden = peers.length < 2;
      const item = peers[(peers.indexOf(group) + direction + peers.length) % peers.length];
      const model = spec.get(memory.get(item.id));
      button.setAttribute('aria-label', label + '：' + model.name);
      button.innerHTML = presentation.icon(model);
    }
    for (const button of $$('.collection-item')) button.setAttribute('aria-pressed', String(button.dataset.group === group.id));
    syncPlayback();
  }
  function syncPlayback() {
    $('#playback').setAttribute('aria-label', paused ? '播放动画' : '暂停动画');
    $('#playback').setAttribute('aria-pressed', String(paused));
    $('#playback use').setAttribute('href', paused ? '#i-play' : '#i-pause');
  }
  function show(model, initial = false) {
    clearTimeout(transition);
    document.body.dataset.category = category;
    controls();
    const mount = () => {
      sizeArtwork(model);
      const config = presentation.config(model, { source: 'manual', manualTime: presentation.previousMinute(), paused });
      if (preview) preview.updateConfig(config);
      else preview = Timeform.Preview.mount({ canvas: $('#clock'), config, readViewport: () => viewport(artboard) });
      presentation.beginLive(preview);
      preview.resize();
      artboard.classList.remove('switching');
      $('.gallery').setAttribute('aria-busy', 'false');
    };
    if (initial || matchMedia('(prefers-reduced-motion: reduce)').matches) mount();
    else {
      artboard.classList.add('switching');
      transition = setTimeout(mount, 180);
    }
  }
  function selectEdition(model) {
    edition = model;
    memory.set(group.id, model.id);
    show(model);
  }
  function selectGroup(next) {
    group = next;
    category = group.category;
    categoryMemory.set(category, group.id);
    selectEdition(spec.get(memory.get(group.id)));
  }
  function navigate(direction) {
    const peers = allGroups.filter(item => item.category === category);
    selectGroup(peers[(peers.indexOf(group) + direction + peers.length) % peers.length]);
  }
  for (const button of $$('.shape-button')) button.onclick = () => {
    const next = allGroups.find(item => item.id === categoryMemory.get(button.dataset.category));
    if (next.id !== group.id) selectGroup(next);
  };
  $('#previous').onclick = () => navigate(-1);
  $('#next').onclick = () => navigate(1);
  $('#playback').onclick = () => { paused = !paused; preview?.updateConfig({ paused }); syncPlayback(); };
  $('#replay').onclick = () => { paused = false; preview?.updateConfig({ paused }); if (preview) presentation.beginLive(preview); syncPlayback(); };
  $('#retry').onclick = () => location.reload();

  function makeCollection() {
    const grid = $('#collection-grid');
    grid.replaceChildren();
    for (const item of allGroups) {
      const model = spec.get(memory.get(item.id));
      const button = document.createElement('button');
      button.className = 'collection-item';
      button.dataset.group = item.id;
      button.setAttribute('aria-label', model.name);
      button.setAttribute('aria-pressed', String(item.id === group.id));
      button.innerHTML = '<canvas aria-hidden="true"></canvas><svg class="selected-mark" aria-hidden="true"><use href="#i-check"/></svg>';
      button.onclick = () => { selectGroup(item); dialog.close(); };
      grid.append(button);
      thumbnails.push(Timeform.Preview.mount({
        canvas: button.querySelector('canvas'),
        config: presentation.config(model, { paused: true, scale: 75 }),
        readViewport: () => viewport(button)
      }));
    }
  }
  $('#open-collection').onclick = () => {
    dialog.showModal();
    preview?.setSuspended('collection', true);
    makeCollection();
  };
  $('#close-collection').onclick = () => dialog.close();
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    preview?.setSuspended('collection', false);
    thumbnails.forEach(item => item.dispose());
    thumbnails = [];
  });
  document.addEventListener('keydown', event => {
    if (dialog.open || downloadPopover.matches(':popover-open') || event.altKey || event.ctrlKey || event.metaKey) return;
    if (['BUTTON', 'A'].includes(event.target.tagName) && event.key === ' ') return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); navigate(event.key === 'ArrowLeft' ? -1 : 1); }
    if (event.key === ' ') { event.preventDefault(); $('#playback').click(); }
  });
  const observer = new ResizeObserver(() => {
    sizeArtwork();
    preview?.resize();
    thumbnails.forEach(item => item.resize());
  });
  observer.observe(stage);
  window.addEventListener('pagehide', () => { clearTimeout(transition); observer.disconnect(); preview?.dispose(); thumbnails.forEach(item => item.dispose()); });
  show(edition, true);
})();
