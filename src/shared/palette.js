(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.Timeform ||= {}).Palette = api;
})(globalThis, function () {
  'use strict';
  const presets = [
    { id: 'classic-black', name: '经典黑', background: '#000000', board: '#111213', long: '#f9faf7', short: '#eef0ec' },
    { id: 'classic-white', name: '经典白', background: '#e9e6de', board: '#f6f4ef', long: '#50534f', short: '#757873' },
    { id: 'moss', name: '苔原', background: '#171e19', board: '#3d493f', long: '#f3f1e7', short: '#bfcdb0' },
    { id: 'paper', name: '纸与墨', background: '#d3d0c7', board: '#e9e6de', long: '#2a312b', short: '#858775' },
    { id: 'dusk', name: '暮色', background: '#17151e', board: '#393746', long: '#cecce6', short: '#e8a991' },
    { id: 'ocean', name: '深海', background: '#0a1b20', board: '#21444c', long: '#e7e9dd', short: '#91c1c6' },
    { id: 'clay', name: '赤陶', background: '#301c19', board: '#a95441', long: '#f6ecdc', short: '#e8bd90' },
    { id: 'midnight', name: '午夜', background: '#080b09', board: '#232624', long: '#dfc797', short: '#f1efe2' }
  ];
  const fields = {
    background: { type: 'color', label: '画布背景', value: '#000000', group: 'colors' },
    board: { type: 'color', label: '背景板', value: '#111213', group: 'colors' },
    long: { type: 'color', label: '长针', value: '#f9faf7', group: 'colors' },
    short: { type: 'color', label: '短针', value: '#eef0ec', group: 'colors' }
  };
  const colors = config => Object.fromEntries(['background', 'board', 'long', 'short'].map(key => [key, config[key]]));
  const material = config => config.board === '#111213' ? 'black' : config.board === '#f6f4ef' ? 'white' : null;
  function tint(hex, amount) {
    const value = parseInt(hex.slice(1), 16);
    return '#' + [value >> 16, (value >> 8) & 255, value & 255].map(channel =>
      Math.round(channel + (amount > 0 ? 255 - channel : channel) * amount).toString(16).padStart(2, '0')).join('');
  }
  function roundRect(context, x, y, width, height, radius) {
    context.beginPath();
    if (typeof context.roundRect === 'function') { context.roundRect(x, y, width, height, radius); return; }
    context.moveTo(x + radius, y); context.lineTo(x + width - radius, y);
    context.quadraticCurveTo(x + width, y, x + width, y + radius);
    context.lineTo(x + width, y + height - radius);
    context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    context.lineTo(x + radius, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - radius);
    context.lineTo(x, y + radius); context.quadraticCurveTo(x, y, x + radius, y); context.closePath();
  }
  function drawBoard(context, width, height, config) {
    const kind = material(config), board = config.board;
    context.save(); roundRect(context, 1, 1, width - 2, height - 2, 6); context.clip();
    const gradient = context.createLinearGradient(0, 0, width, height);
    const stops = kind === 'white' ? ['#e9e7e1', '#f6f4ef', '#d8d6d0'] : kind === 'black' ? ['#242627', '#111213', '#0d0e0f'] : [tint(board, .09), board, tint(board, -.11)];
    stops.forEach((color, index) => gradient.addColorStop([0, kind === 'white' ? .45 : kind === 'black' ? .43 : .5, 1][index], color));
    context.fillStyle = gradient; context.fillRect(0, 0, width, height);
    context.fillStyle = '#ffffff17'; context.fillRect(0, 0, width, 2);
    context.fillStyle = '#00000020'; context.fillRect(0, height - 4, width, 4); context.restore();
    context.strokeStyle = tint(board, -.17); context.lineWidth = 2;
    roundRect(context, 1, 1, width - 2, height - 2, 6); context.stroke();
  }
  return { fields, presets, colors, material, tint, roundRect, drawBoard };
});
