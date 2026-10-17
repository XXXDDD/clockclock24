(function (root, factory) {
  const commonJS=typeof module==='object' && module.exports;
  const api=factory(commonJS ? require('../../shared/edition-animation.js') : root.Timeform.EditionAnimation);
  if (commonJS) module.exports=api; else (root.Timeform ||= {}).AMT96Animation=api;
})(globalThis, function (Engine) {
  'use strict';
  const profile={duration:52.2,alignStart:.8,alignEnd:7,alignColumnDelay:.3,
    waveStart:13,formStart:41.8,formEnd:51.5,counter:true,opposed:true,
    tileAngles:[[45,315],[135,225]],stage:'四表盘旋转开合',
    // Sparse measured common phase in degrees; smooth angular interpolation
    // replaces frame playback. Crossed/merged silhouettes are ambiguous.
    knots:[[0,0],[1,1.970],[2,20.332],[3,45.717],[5,82.581],[7,146.287],
      [9,200.275],[13,310.765],[15,367.803],[17,423.957],[19,485.380],
      [21,546.745],[23,606.525],[25,669.270],[27,728.954]]};
  return {profile,create:(model,initial,options)=>Engine.create(model,model.Settings,profile,initial,options)};
});
