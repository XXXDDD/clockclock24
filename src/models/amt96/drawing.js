(function (root, factory) {
  const commonJS=typeof module==='object' && module.exports;
  const api=factory(commonJS ? require('../../shared/edition-drawing.js') : root.Timeform.EditionDrawing);
  if (commonJS) module.exports=api; else (root.Timeform ||= {}).AMT96Drawing=api;
})(globalThis, function (Drawing) {
  'use strict';
  const hands=Drawing.wrap({id:'amt96'},{finish:'metal',referenceReach:.962,
    longLanes:'000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000'});
  function drawSurface(context,geometry,config) {
    const {boardWidth:w,boardHeight:h}=geometry;
    let seed=961982;
    const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    const strata=(x,i)=>h*(Math.sin(x*5.7+i*.29)*.007+Math.sin(x*17+i*.8)*.002
      +Math.sin(x*43+i)*.0009-x*.012);
    context.save();context.fillStyle=config.board;context.fillRect(0,0,w,h);
    // Broken mineral beds, varying independently in thickness and hue. The
    // native stone is never a repeated image or a set of evenly spaced rules.
    const colors=['#7d3c28','#994c2e','#bc754d','#ce9061','#e1ad75','#804529','#ad613c'];
    for (let i=0;i<100;i++) {
      const y=h*(i/100-.01),thickness=h*(.003+random()*.016);
      context.fillStyle=colors[i%colors.length];context.globalAlpha=.2+random()*.45;
      context.beginPath();
      for (let j=0;j<=80;j++) {const x=j/80;const yy=y+strata(x,i);if (!j) context.moveTo(0,yy);else context.lineTo(x*w,yy);}
      for (let j=80;j>=0;j--) {const x=j/80;context.lineTo(x*w,y+strata(x,i)+thickness*(.65+.35*Math.sin(x*21+i)));}
      context.closePath();context.fill();
    }
    for (let i=0;i<22;i++) {
      const y=random()*h,start=random()*.4,end=.6+random()*.4;
      context.strokeStyle=i%3 ? '#d9a266' : '#efd2a0';context.globalAlpha=.25+random()*.35;
      context.lineWidth=h*(.0006+random()*.0025);context.beginPath();
      for (let j=0;j<=70;j++) {const x=start+(end-start)*j/70,yy=y+strata(x,i*3);if (!j) context.moveTo(x*w,yy);else context.lineTo(x*w,yy);}
      context.stroke();
    }
    for (let i=0;i<65000;i++) {
      const x=random()*w,y=random()*h;
      context.globalAlpha=.08+random()*.3;
      context.fillStyle=['#4d281c','#efc38e','#783c26','#cd8d58'][i%4];
      context.fillRect(x,y,w*(.00015+random()*.0017),h*(.00015+random()*.0008));
    }
    context.globalAlpha=1;
    geometry.points.forEach(point=>{
      const {x,y,radius:r}=point;
      const face=context.createRadialGradient(x-r*.15,y-r*.15,r*.1,x,y,r);
      face.addColorStop(0,'#47231416');face.addColorStop(.8,'#341b0e18');face.addColorStop(1,'#23120a88');
      context.fillStyle=face;context.beginPath();context.arc(x,y,r,0,Math.PI*2);context.fill();
      context.strokeStyle='#4a271d8c';context.lineWidth=1.1;context.stroke();
      context.strokeStyle='#f8d2a25c';context.lineWidth=.9;context.beginPath();context.arc(x,y,r+.7,.05,Math.PI*.94);context.stroke();
    });
    context.restore();
  }
  return {drawSurface,drawHands:hands.drawHands,handLength:hands.handLength,referenceReach:hands.referenceReach,longLane:hands.longLane};
});
