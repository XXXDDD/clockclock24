(function (root, factory) {
  const commonJS = typeof module==='object' && module.exports;
  const api = factory(commonJS ? require('../amt/model.js') : root.Timeform.AMTModels,
    commonJS ? require('./settings.js') : root.Timeform.AMT72Settings,
    commonJS ? require('./animation.js') : root.Timeform.AMT72Animation,
    commonJS ? require('./drawing.js') : root.Timeform.AMT72Drawing);
  if (commonJS) module.exports=api;
  else (root.Timeform ||= {}).AMT72=api;
})(globalThis, function (LegacyModels,Settings,Animation,Drawing) {
  'use strict';
  // Only the already-verified 3×6 typography is retained from the legacy model.
  const base = LegacyModels.find(model=>model.id==='amt72');
  const { digitPose,displayDigits } = base;
  function geometry(width,height,input) {
    const config=Settings.normalize(input),radius=config.radius,step=radius*2+config.gap;
    const gridWidth=radius*2+11*step,gridHeight=radius*2+5*step;
    // Rectified front-board plane; physical aspect is 173 × 95 cm.
    const boardWidth=step*1248.28/93.65,boardHeight=boardWidth*95/173;
    const originX=(boardWidth-gridWidth)/2+radius,originY=(boardHeight-gridHeight)/2+radius;
    const padding=Math.min(config.padding,(width-1)/2,(height-1)/2);
    const availableWidth=Math.max(1,width-padding*2),availableHeight=Math.max(1,height-padding*2);
    const factor=Math.min(availableWidth/boardWidth,availableHeight/boardHeight)*config.scale/100;
    const displayWidth=boardWidth*factor,displayHeight=boardHeight*factor;
    const x=(width-displayWidth)/2+(availableWidth-displayWidth)/2*config.offsetX/100;
    const y=(height-displayHeight)/2+(availableHeight-displayHeight)/2*config.offsetY/100;
    const points=Array.from({ length:72 },(_,i)=>({ x:originX+i%12*step,y:originY+Math.floor(i/12)*step,radius,i:i*2 }));
    return { x,y,width:displayWidth,height:displayHeight,boardWidth,boardHeight,points,padding,layout:'landscape' };
  }
  function create(initial,options) { return Animation.create({ Settings,digitPose,displayDigits },initial,options); }
  return { ...base,Settings,Drawing,create,geometry,
    description:'12 × 6 阵列；双针重合指向中心，反向开合形成向外传播的涟漪，最后逐针成型。',
    reference:'https://www.humanssince1982.com/en-int/products/a-million-times-72-black',referenceLabel:'AMT72 Black · 原作参考',
    motionReference:'https://cdn.shopify.com/videos/c/vp/323e6a7bd18c49a1a9a91e63652ae536/323e6a7bd18c49a1a9a91e63652ae536.HD-1080p-7.2Mbps-32752435.mp4',
    referenceTime:'09:34',referenceDuration:43.4,choreographed:true,
    previewNote:'AMT72 第一套：中心放射与涟漪开合。普通黑色款原片约 43.36 秒，09:34 → 09:35；其他时间的路径为网页重建。' };
});
