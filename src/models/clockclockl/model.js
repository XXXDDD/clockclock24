(function (root, factory) {
  const commonJS=typeof module==='object' && module.exports;
  const api=factory(commonJS ? require('../clockclock24/model.js') : root.Timeform.ClockClock24,
    commonJS ? require('../../shared/grid-layout.js') : root.Timeform.GridLayout,
    commonJS ? require('./settings.js') : root.Timeform.ClockClockLSettings,
    commonJS ? require('./animation.js') : root.Timeform.ClockClockLAnimation,
    commonJS ? require('./drawing.js') : root.Timeform.ClockClockLDrawing);
  if (commonJS) module.exports=api; else (root.Timeform ||= {}).ClockClockL=api;
})(globalThis, function (Glyphs, Grid, Settings, Animation, Drawing) {
  'use strict';
  const {digitPose,displayDigits}=Glyphs;
  const geometry=Grid.create(Settings,{columns:8,rows:3,size:[157,72],pitchPerWidth:.10845848706598717,
    origin:[1.1067004387322372,1.1132192841203299]});
  const model={id:'clockclockl',type:'landscape',name:'ClockClock L',badge:'CCL',columns:8,rows:3,count:24,
    description:'8 × 3 深蓝铝板与银针；可选择散相旋转、斜线列波或 Tidal 波浪。',
    reference:'https://www.humanssince1982.com/en-int/products/clockclock-l-tidal',
    motionReference:'https://cdn.shopify.com/videos/c/vp/91ac411a0c094baf96ef32338ed2c6c7/91ac411a0c094baf96ef32338ed2c6c7.HD-720p-4.5Mbps-30583308.mp4',
    referenceTime:'09:34',referenceDuration:null,choreographed:true,
    Settings,Drawing,geometry,digitPose,displayDigits,
    create(initial,options) { return Animation.create(model,initial,options); } };
  return model;
});
