(function (root, factory) {
  const api = factory(typeof module === 'object' && module.exports ? require('../shared/palette.js') : root.Timeform.Palette);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.Timeform ||= {}).PaletteOptions = api;
})(globalThis, function (Palette) {
  'use strict';
  // Black/white, paper, moss and midnight repeat existing neutral, green or gold
  // references. Keep only three visibly distinct additions, after model colors.
  const supplementalIds = ['dusk', 'ocean', 'clay'];
  const keys = Object.keys(Palette.fields);
  const sameColors = (a, b) => keys.every(key => a[key] === b[key]);
  function forModel(models, model, order = []) {
    const ranks = new Map(order.map((id, index) => [id, index]));
    const originals = models.filter(entry => entry.group === model.group)
      .sort((a, b) => (ranks.get(a.id) ?? models.indexOf(a)) - (ranks.get(b.id) ?? models.indexOf(b)))
      .map(entry => ({ id: entry.id, name: entry.presetLabel, origin: 'preset', ...Palette.colors(entry.Settings.defaults) }));
    const supplemental = supplementalIds.map(id => Palette.presets.find(palette => palette.id === id))
      .filter(palette => palette && !originals.some(original => sameColors(original, palette)))
      .map(palette => ({ ...palette, id: 'extra-' + palette.id, origin: 'supplemental' }));
    return { originals, supplemental };
  }
  return { forModel };
});
