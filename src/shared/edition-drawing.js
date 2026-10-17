(function (root, factory) {
  const commonJS = typeof module === 'object' && module.exports;
  const api = factory(commonJS ? require('./palette.js') : root.Timeform.Palette,
    commonJS ? require('./single-clock.js') : root.Timeform.SingleClock);
  if (commonJS) module.exports = api;
  else (root.Timeform ||= {}).EditionDrawing = api;
})(globalThis, function (Palette, SingleClock) {
  'use strict';
  const TAU = Math.PI*2;
  function stone(context, geometry, config) {
    const { boardWidth:w,boardHeight:h } = geometry;
    context.save(); context.fillStyle=config.board; context.fillRect(0,0,w,h);
    // A deterministic illustration of Sunset Dune's horizontal strata. The
    // natural stone varies between pieces; this is not a photograph of a slab.
    for (let i=0;i<115;i++) {
      const y=h*i/115, thickness=h*(.002+.008*(.5+.5*Math.sin(i*17.13)));
      context.strokeStyle=['#e6b783','#a85336','#d78c60','#f0d5a9','#8b4230'][i%5];
      context.lineWidth=thickness; context.globalAlpha=.35+.3*Math.sin(i*2.4)**2;
      context.beginPath(); context.moveTo(0,y);
      context.bezierCurveTo(w*.32,y+Math.sin(i*.7)*h*.023,w*.61,y+Math.cos(i*.4)*h*.02,w,y-h*.035);
      context.stroke();
    }
    // Fine pits and broken mineral flecks break up the smooth bands.
    let seed=1982;
    const random=()=>{ seed=(Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296; };
    for (let i=0;i<12000;i++) {
      const x=random()*w,y=random()*h;
      context.globalAlpha=.07+random()*.22;
      context.fillStyle=i%3===0 ? '#f4d2a6' : i%3===1 ? '#743d2a' : '#d78955';
      context.fillRect(x,y,w*(.0005+random()*.0028),h*(.0007+random()*.0018));
    }
    context.globalAlpha=1;
    geometry.points.forEach(point => {
      const gradient=context.createRadialGradient(point.x-point.radius*.25,point.y-point.radius*.3,0,point.x,point.y,point.radius);
      gradient.addColorStop(0,'#29180e50'); gradient.addColorStop(.8,'#42201436'); gradient.addColorStop(1,'#1c0e0b92');
      context.beginPath(); context.arc(point.x,point.y,point.radius,0,TAU); context.fillStyle=gradient; context.fill();
      context.strokeStyle='#f8dab654'; context.lineWidth=1; context.stroke();
    });
    context.restore();
  }
  function arm(context, pose, secondary, config, variant, family) {
    if (pose.opacity<=.001) return;
    const width=secondary ? config.shortWidth : config.longWidth;
    const length=49.3*(secondary ? Math.min(config.shortLength,config.longLength) : config.longLength)/100;
    const color=secondary ? config.short : config.long;
    const finish=Array.isArray(variant.finish) ? variant.finish[secondary ? 1 : 0] : variant.finish;
    context.save(); context.globalAlpha=pose.opacity; context.rotate(pose.angle);
    context.shadowColor='#00000055'; context.shadowBlur=1.1; context.shadowOffsetY=1.1;
    if (finish==='metal' || finish==='outlined') {
      const gradient=context.createLinearGradient(0,-width/2,0,width/2);
      [[0,-.4],[.16,.17],[.38,.45],[.55,-.12],[.8,.06],[1,-.45]].forEach(([stop,tint]) => gradient.addColorStop(stop,Palette.tint(color,tint)));
      context.fillStyle=gradient;
    } else context.fillStyle=color;
    const rounded=family.startsWith('amt') || variant.rounded;
    if (rounded) Palette.roundRect(context,-width*.12,-width/2,length+width*.12,width,width*.35);
    else { context.beginPath(); context.rect(-width*.3,-width/2,length+width*.3,width); }
    context.fill();
    if (finish==='outlined') {
      context.shadowColor='transparent'; context.strokeStyle='#d1d2cd'; context.lineWidth=Math.max(.7,width*.12); context.stroke();
    } else if (finish==='metal') {
      context.shadowColor='transparent'; context.globalAlpha=pose.opacity*(.22+.23*Math.cos(pose.angle+.7)**2);
      context.fillStyle=Palette.tint(color,.65); context.fillRect(0,-width/2,length,Math.min(1,width*.15));
    }
    context.restore();
  }
  function wrap(model,variant) {
    return {
      drawSurface(context,geometry,config) {
        if (variant.texture==='travertine') return stone(context,geometry,config);
        if (model.Drawing?.drawSurface) return model.Drawing.drawSurface(context,geometry,config);
        Palette.drawBoard(context,geometry.boardWidth,geometry.boardHeight,config);
        geometry.points.forEach(point=>SingleClock.drawFace(context,point,config));
      },
      drawHands(context,geometry,instance,config) {
        geometry.points.forEach(point=>{
          context.save(); context.translate(point.x,point.y); context.scale(point.radius/53.2,point.radius/53.2);
          arm(context,instance.hands[point.i+1],true,config,variant,model.id);
          arm(context,instance.hands[point.i],false,config,variant,model.id);
          context.restore();
        });
      }
    };
  }
  return { wrap };
});
