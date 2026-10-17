(function (root, factory) {
  const commonJS=typeof module==='object' && module.exports;
  const api=factory(commonJS ? require('../../shared/edition-drawing.js') : root.Timeform.EditionDrawing,
    commonJS ? require('../clockclock24/drawing.js') : root.Timeform.ClockClock24Drawing);
  if (commonJS) module.exports=api; else (root.Timeform ||= {}).ClockClockLDrawing=api;
})(globalThis, function (Drawing, Surface) {
  return Drawing.wrap({id:'clockclockl',Drawing:Surface},{finish:'metal',rounded:true});
});
