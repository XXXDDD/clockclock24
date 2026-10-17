(function (root, factory) {
  const commonJS=typeof module==='object' && module.exports;
  const api=factory(commonJS ? require('../amt/typography.js') : root.Timeform.AMTTypography,
    commonJS ? require('../../shared/grid-layout.js') : root.Timeform.GridLayout,
    commonJS ? require('./settings.js') : root.Timeform.AMT96Settings,
    commonJS ? require('./animation.js') : root.Timeform.AMT96Animation,
    commonJS ? require('./drawing.js') : root.Timeform.AMT96Drawing);
  if (commonJS) module.exports=api; else (root.Timeform ||= {}).AMT96=api;
})(globalThis, function (Typography, Grid, Settings, Animation, Drawing) {
  'use strict';
  const {displayDigits,IDLE}=Typography;
  const DIR={E:0,S:Math.PI/2,W:Math.PI,N:-Math.PI/2,P:IDLE};
  // The original 11:34 / 11:35 has a top-left cap on each one.
  const one=['SE','EW','SW','NE','SW','NS','PP','NS','NS','PP','NS','NS','PP','NS','NS','PP','NE','NW'].flatMap(([a,b])=>[
    {angle:DIR[a],used:a!=='P'},{angle:DIR[b],used:b!=='P' && b!==a}]);
  function digitPose(digits) {
    const pose=Array.from({length:192},()=>({angle:IDLE,used:false}));
    for (let digit=0;digit<4;digit++) {
      const glyph=digits[digit]==='1' ? one : Typography.glyphPose(digits[digit],3);
      for (let cell=0;cell<18;cell++) for (let lane=0;lane<2;lane++) {
        pose[((Math.floor(cell/3)+1)*12+digit*3+cell%3)*2+lane]={...glyph[cell*2+lane]};
      }
    }
    return pose;
  }
  const geometry=Grid.create(Settings,{columns:12,rows:8,size:[177,125],pitchPerWidth:.07419957256215128,
    origin:[1.2663718975403395,1.3108251705404308]});
  const model={id:'amt96',type:'landscape',name:'A million Times 96',badge:'AMT96',columns:12,rows:8,count:96,
    description:'12 × 8 洞石阵列；四表盘组成旋转开合图案，最后收束成带顶部笔画的数字。',
    reference:'https://www.humanssince1982.com/en-int/products/a-million-times-96-bjarke-ingels',
    motionReference:'https://cdn.shopify.com/videos/c/vp/92842d6272864a9f9437d9bd1c884cbf/92842d6272864a9f9437d9bd1c884cbf.HD-720p-4.5Mbps-55167783.mp4',
    referenceTime:'11:34',referenceDuration:52.2,choreographed:true,
    Settings,Drawing,geometry,digitPose,displayDigits,
    create(initial,options) { return Animation.create(model,initial,options); } };
  return model;
});
