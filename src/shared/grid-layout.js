(function (root, factory) {
  const api=factory();
  if (typeof module==='object' && module.exports) module.exports=api;
  else (root.Timeform ||= {}).GridLayout=api;
})(globalThis, function () {
  'use strict';
  // Board-plane measurements belong to each model; this only fits a viewport.
  function create(Settings, measured) {
    return function geometry(width,height,input) {
      const config=Settings.normalize(input),radius=config.radius,step=2*radius+config.gap;
      const boardWidth=step/measured.pitchPerWidth,boardHeight=boardWidth*measured.size[1]/measured.size[0];
      const padding=Math.min(config.padding,(width-1)/2,(height-1)/2);
      const availableWidth=Math.max(1,width-2*padding),availableHeight=Math.max(1,height-2*padding);
      const factor=Math.min(availableWidth/boardWidth,availableHeight/boardHeight)*config.scale/100;
      const displayWidth=boardWidth*factor,displayHeight=boardHeight*factor;
      const points=Array.from({length:measured.columns*measured.rows},(_,i)=>({
        x:(measured.origin[0]+i%measured.columns)*step,
        y:(measured.origin[1]+Math.floor(i/measured.columns))*step,radius,i:i*2 }));
      return { x:(width-displayWidth)/2+(availableWidth-displayWidth)/2*config.offsetX/100,
        y:(height-displayHeight)/2+(availableHeight-displayHeight)/2*config.offsetY/100,
        width:displayWidth,height:displayHeight,boardWidth,boardHeight,points,padding,layout:'landscape' };
    };
  }
  return { create };
});
