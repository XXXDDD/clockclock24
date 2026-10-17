(function (root, factory) {
  const commonJS=typeof module==='object' && module.exports;
  const api=factory(commonJS ? require('./clockclockl/model.js') : root.Timeform.ClockClockL,
    commonJS ? require('./amt96/model.js') : root.Timeform.AMT96);
  if (commonJS) module.exports=api; else (root.Timeform ||= {}).ClassicLandscape=api;
})(globalThis, function (ClockClockL, AMT96) {
  'use strict';
  return [ClockClockL,AMT96];
});
