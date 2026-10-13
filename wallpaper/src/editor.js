(function (root) {
  'use strict';
  const Spec = root.TimeformSettings, app = root.TimeformWallpaper;
  const controls = new Map(), presetButtons = [];
  const notice = text => { document.getElementById('notice').textContent = text; };
  function accept(key, value, input) {
    const decoded = Spec.decode(key, value);
    if (decoded === undefined) { input.setAttribute('aria-invalid', 'true'); notice('请检查「' + Spec.fields[key].text + '」：' + (key === 'timezone' ? '使用有效时区，例如 Asia/Hong_Kong。' : '颜色需为六位 HEX，例如 #111213。')); return; }
    input.removeAttribute('aria-invalid'); app.updateConfig({ [key]: decoded }); notice('预览已更新。导出后即可带到其他电脑。');
  }
  for (const [key, field] of Object.entries(Spec.fields)) {
    const wrapper = document.createElement('div'); wrapper.className = field.type === 'color' ? 'color-field' : 'field';
    const label = document.createElement('label'); label.htmlFor = 'setting-' + key; label.textContent = field.text;
    const input = document.createElement(field.type === 'dropdown' ? 'select' : 'input'); input.id = 'setting-' + key;
    const entry = { input, hex: null, output: null };
    if (field.type === 'color') {
      input.type = 'color'; const hex = document.createElement('input'); hex.type = 'text'; hex.maxLength = 7; hex.setAttribute('aria-label', field.text + ' HEX'); hex.spellcheck = false;
      const group = document.createElement('div'); group.className = 'color-inputs'; group.append(input, hex); wrapper.append(label, group); entry.hex = hex;
      input.addEventListener('input', () => accept(key, input.value, input)); hex.addEventListener('change', () => accept(key, hex.value.trim(), hex));
    } else if (field.type === 'checkbox') {
      input.type = 'checkbox'; label.className = 'field-check'; label.prepend(input); wrapper.append(label); input.addEventListener('change', () => accept(key, input.checked, input));
    } else {
      const heading = document.createElement('div'); heading.className = 'field-heading'; heading.append(label); wrapper.append(heading, input);
      if (field.type === 'dropdown') {
        field.values.forEach((value, index) => { const option = document.createElement('option'); option.value = value; option.textContent = field.items[index]; input.append(option); });
        input.addEventListener('change', () => accept(key, input.value, input));
      } else if (field.type === 'slider') {
        input.type = 'range'; input.min = field.min; input.max = field.max; input.step = field.step;
        const output = document.createElement('output'); output.htmlFor = input.id; heading.append(output); entry.output = output; input.addEventListener('input', () => accept(key, input.value, input));
      } else { input.type = 'text'; input.placeholder = '跟随电脑时区'; input.addEventListener('change', () => accept(key, input.value, input)); }
      if (field.help) { const help = document.createElement('p'); help.className = 'help'; help.textContent = field.help; wrapper.append(help); }
    }
    controls.set(key, entry); document.getElementById('fields-' + field.group).append(wrapper);
  }
  for (const preset of Spec.presets) {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'preset'; button.setAttribute('aria-label', '应用' + preset.name);
    const swatch = document.createElement('span'); swatch.className = 'preset-swatch'; swatch.style.background = preset.board; swatch.style.setProperty('--hand', preset.long);
    const name = document.createElement('span'); name.textContent = preset.name; button.append(swatch, name);
    button.addEventListener('click', () => { app.updateConfig(preset); notice('已应用「' + preset.name + '」，各部分颜色仍可独立调节。'); });
    document.getElementById('presets').append(button); presetButtons.push({ button, preset });
  }
  function showValues() {
    const config = app.getConfig();
    for (const [key, entry] of controls) {
      entry.input.type === 'checkbox' ? entry.input.checked = config[key] : entry.input.value = config[key];
      if (entry.hex && document.activeElement !== entry.hex) { entry.hex.value = config[key].toUpperCase(); entry.hex.removeAttribute('aria-invalid'); }
      if (entry.output) entry.output.textContent = config[key] + Spec.fields[key].unit;
    }
    for (const { button, preset } of presetButtons) button.setAttribute('aria-pressed', String(['background', 'board', 'long', 'short'].every(key => config[key] === preset[key])));
  }
  function download(filename, content, type) {
    const objectUrl = URL.createObjectURL(new Blob([content], { type }));
    const anchor = document.createElement('a'); anchor.href = objectUrl; anchor.download = filename; anchor.click(); setTimeout(() => URL.revokeObjectURL(objectUrl), 30000);
  }
  document.addEventListener('timeform-config-change', showValues); showValues();
  document.getElementById('previewSize').addEventListener('change', event => app.setPreviewResolution(event.target.value === 'auto' ? null : event.target.value.split('x').map(Number)));
  document.getElementById('hideSettings').addEventListener('click', () => app.setEditing(false));
  document.getElementById('returnSettings').addEventListener('click', () => app.setEditing(true));
  document.getElementById('downloadHtml').addEventListener('click', () => { download('TIMEFORM-wallpaper.html', app.exportHtml(), 'text/html;charset=utf-8'); notice('通用 HTML 已导出。打开即是你刚才设置的配色；按 S 可继续设置。'); });
  document.getElementById('downloadLively').addEventListener('click', () => { download('TIMEFORM-Lively.zip', app.livelyPackage(), 'application/zip'); notice('Lively 包已导出。把 ZIP 拖进 Lively，即可使用这份配色。'); });
  document.getElementById('exportConfig').addEventListener('click', () => { download('TIMEFORM-colors.json', Spec.exportConfig(app.getConfig()), 'application/json'); notice('配色配置已导出，导入到其他电脑的壁纸工作台即可恢复。'); });
  document.getElementById('importConfig').addEventListener('change', async event => {
    const file = event.target.files[0]; if (!file) return;
    try { if (file.size > 65536) throw new Error('配置文件过大，请选择 TIMEFORM 导出的 JSON 文件。'); app.updateConfig(Spec.importConfig(await file.text())); notice('配色配置已导入。'); }
    catch (error) { notice(error.message); } finally { event.target.value = ''; }
  });
  document.getElementById('resetConfig').addEventListener('click', () => { app.updateConfig(Spec.defaults); notice('已恢复经典黑与自动适配。'); });
  document.getElementById('copyUrl').addEventListener('click', async () => {
    const url = app.url();
    try { await navigator.clipboard.writeText(url); notice(location.protocol === 'file:' ? '本地网址已复制；换电脑请导出 HTML。在线工作台可生成跨电脑网址。' : '壁纸网址已复制，粘贴到 Plash 等网页壁纸工具即可。'); }
    catch (_) { const fallback = document.getElementById('urlFallback'); fallback.hidden = false; fallback.value = url; fallback.focus(); fallback.select(); notice('请复制下方的壁纸网址。'); }
  });
})(globalThis);
