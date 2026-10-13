(function(root){
'use strict';
root.TimeformRenderer={create};
function create(canvas,initial,readViewport){
const Spec=root.TimeformSettings,ctx=canvas.getContext('2d');
const PRESETS=[{board:'#111213',long:'#f9faf7',short:'#eef0ec',material:'black'},{board:'#f6f4ef',long:'#50534f',short:'#757873',material:'white'}];
const state={...Spec.normalize(initial),source:'live',minuteKey:null,material:null};
const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let W=1000,H=445,points=[],paintedVersion=-1,paletteVersion=0,renderDirty=true,animationFrame=0,wasMoving=false,disposed=false,geometry=null,timeFormatter=null,frameCount=0;
const TAU=Math.PI*2;
  const DIR={E:0,S:Math.PI/2,W:Math.PI,N:-Math.PI/2,P:Math.PI*.75};
  const GLYPHS={
    '0':['SE','SW','NS','NS','NE','NW'], '1':['PP','SS','PP','NS','PP','NN'],
    '2':['EE','SW','SE','NW','NE','WW'], '3':['EE','SW','EE','NW','EE','NW'],
    '4':['SS','SS','NE','NS','PP','NN'], '5':['SE','WW','NE','SW','EE','NW'],
    '6':['SE','WW','NS','SW','NE','NW'], '7':['EE','SW','PP','NS','PP','NN'],
    '8':['SE','SW','NE','NW','NE','NW'], '9':['SE','SW','EN','NS','EE','NW']
  };

  const pad=n=>String(n).padStart(2,'0');
  const normalizeMinutes=n=>((n%1440)+1440)%1440;
  const wrap=x=>((x%TAU)+TAU)%TAU;
  const smooth=t=>t*t*(3-2*t);
  const fadeEase=t=>t*t*t*(t*(t*6-15)+10);
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));

  const surface=document.createElement('canvas');
  const surfaceCtx=surface.getContext('2d');
  const hands=Array.from({length:48},(_,i)=>{const a=DIR.P+(i%2?.18:-.18);return {angle:a,from:a,to:a,start:0,duration:1,used:false,opacity:0,revealFrom:0,revealStart:0,revealEnd:0,travelOpacity:0,motionEnd:0,fadeStart:0,fadeEnd:0,fadeFrom:0,fadeTo:0};});



  function displayDigits(minutes){const h=Math.floor(minutes/60);return pad(state.format24?h:h%12||12)+pad(minutes%60);}
  function digitPose(digits){
    const result=new Array(48);
    for(let d=0;d<4;d++)for(let cell=0;cell<6;cell++){
      const col=d*2+cell%2,row=Math.floor(cell/2),i=(row*8+col)*2;
      const [a,b]=GLYPHS[digits[d]][cell];
      result[i]={angle:DIR[a],used:a!=='P'};
      result[i+1]={angle:DIR[b],used:b!=='P'&&b!==a};
    }
    return result;
  }
  function settleOpacity(h){return h.used||state.visibility==='show'?1:state.visibility==='ghost'?.12:0;}
  function tween(now,start,end,from,to){const t=end<=start?Number(now>=end):clamp((now-start)/(end-start),0,1);return from+(to-from)*fadeEase(t);}
  function interpolate(now){
    for(const h of hands){
      const u=clamp((now-h.start)/h.duration,0,1);
      h.angle=u===1?wrap(h.to):h.from+(h.to-h.from)*smooth(u);
      if(now<h.revealEnd)h.opacity=tween(now,h.revealStart,h.revealEnd,h.revealFrom,h.travelOpacity);
      else if(now<h.fadeStart)h.opacity=h.travelOpacity;
      else h.opacity=tween(now,h.fadeStart,h.fadeEnd,h.fadeFrom,h.fadeTo);
    }
  }


  function animate(minutes,force=false){
    const digits=displayDigits(minutes);if(!force&&state.minuteKey===digits)return;
    if(state.motion==='none'){initializeTime(minutes);return;}
    renderDirty=true;
    const now=performance.now();interpolate(now);
    const target=digitPose(digits),dur=reducedMotion?300:state.duration*1000;
    const rotating=state.motion==='spin'&&!reducedMotion;
    const reveal=reducedMotion?60:Math.min(rotating?350:160,dur*.15),hide=reducedMotion?80:Math.min(350,dur*.18);
    const travel=dur-reveal-hide,idleAlpha=state.visibility==='show'?1:state.visibility==='ghost'?.12:0;
    for(let i=0;i<48;i++){
      const h=hands[i],current=h.angle;
      let turn=((target[i].angle-current+Math.PI)%TAU+TAU)%TAU-Math.PI;
      if(rotating)turn=i%2?-wrap(wrap(current)-target[i].angle)-TAU:wrap(target[i].angle-wrap(current))+TAU;
      const participating=rotating||h.used||target[i].used||h.opacity>idleAlpha+.001;
      h.revealFrom=h.opacity;h.travelOpacity=participating?1:idleAlpha;h.used=target[i].used;
      h.from=current;h.to=current+turn;h.start=now+reveal;h.duration=travel;h.motionEnd=h.start+travel;
      h.revealStart=now;h.revealEnd=now+reveal;
      h.fadeStart=h.motionEnd;h.fadeEnd=now+dur;h.fadeFrom=h.travelOpacity;h.fadeTo=settleOpacity(h);
    }
    state.minuteKey=digits;
    canvas.setAttribute('aria-label',`由24个钟表组成的数字时钟，现在显示 ${digits.slice(0,2)}:${digits.slice(2)}`);
    requestRender();
  }
  function initializeTime(minutes){
    const digits=displayDigits(minutes),pose=digitPose(digits),now=performance.now();
    for(let i=0;i<48;i++){
      const h=hands[i];h.angle=pose[i].angle;h.from=h.angle;h.to=h.angle;h.used=pose[i].used;
      h.opacity=settleOpacity(h);h.revealFrom=h.opacity;h.travelOpacity=h.opacity;h.fadeFrom=h.opacity;h.fadeTo=h.opacity;
      h.start=now;h.duration=1;h.motionEnd=now;h.revealStart=now;h.revealEnd=now;h.fadeStart=now;h.fadeEnd=now;
    }
    state.minuteKey=digits;canvas.setAttribute('aria-label',`由24个钟表组成的数字时钟，现在显示 ${digits.slice(0,2)}:${digits.slice(2)}`);renderDirty=true;requestRender();
  }
  function sync(force=false){animate(currentMinutes(),force);}


  function tint(hex,amount){const n=parseInt(hex.slice(1),16),channels=[n>>16,(n>>8)&255,n&255];return '#'+channels.map(v=>Math.round(v+(amount>0?255-v:v)*amount).toString(16).padStart(2,'0')).join('');}
  function roundRect(c,x,y,w,h,r){
    c.beginPath();if(typeof c.roundRect==='function'){c.roundRect(x,y,w,h,r);return;}
    c.moveTo(x+r,y);c.lineTo(x+w-r,y);c.quadraticCurveTo(x+w,y,x+w,y+r);c.lineTo(x+w,y+h-r);c.quadraticCurveTo(x+w,y+h,x+w-r,y+h);c.lineTo(x+r,y+h);c.quadraticCurveTo(x,y+h,x,y+h-r);c.lineTo(x,y+r);c.quadraticCurveTo(x,y,x+r,y);c.closePath();
  }
  function drawSurface(){
    const c=surfaceCtx,b=state.board,white=state.material==='white',black=state.material==='black';
    c.clearRect(0,0,W,H);c.save();roundRect(c,1,1,W-2,H-2,6);c.clip();
    const bg=c.createLinearGradient(0,0,W,H);
    if(white){bg.addColorStop(0,'#e9e7e1');bg.addColorStop(.45,'#f6f4ef');bg.addColorStop(1,'#d8d6d0');}
    else if(black){bg.addColorStop(0,'#242627');bg.addColorStop(.43,'#111213');bg.addColorStop(1,'#0d0e0f');}
    else{bg.addColorStop(0,tint(b,.09));bg.addColorStop(.5,b);bg.addColorStop(1,tint(b,-.11));}
    c.fillStyle=bg;c.fillRect(0,0,W,H);
    c.fillStyle='#ffffff17';c.fillRect(0,0,W,2);c.fillStyle='#00000020';c.fillRect(0,H-4,W,4);
    for(const {x,y} of points){c.save();c.translate(x,y);
      const rim=c.createRadialGradient(-11,-17,3,0,0,55);
      if(white){rim.addColorStop(0,'#f4f2ed');rim.addColorStop(.82,'#e5e2dc');rim.addColorStop(.97,'#c6c4bd');rim.addColorStop(1,'#dedbd5');}
      else if(black){rim.addColorStop(0,'#121415');rim.addColorStop(.70,'#0d0f10');rim.addColorStop(.94,'#08090a');rim.addColorStop(1,'#242628');}
      else{rim.addColorStop(0,tint(b,-.06));rim.addColorStop(.82,tint(b,-.12));rim.addColorStop(.96,tint(b,-.24));rim.addColorStop(1,tint(b,.06));}
      c.shadowColor=black?'#000000b8':'#0000003b';c.shadowBlur=7;c.shadowOffsetY=2;c.fillStyle=rim;c.beginPath();c.arc(0,0,53.2,0,TAU);c.fill();c.shadowBlur=0;c.shadowOffsetY=0;
      c.strokeStyle=white?'#0000001a':'#ffffff13';c.lineWidth=1;c.beginPath();c.arc(0,0,52.2,0,TAU);c.stroke();c.strokeStyle=white?'#ffffff7a':'#00000018';c.beginPath();c.arc(0,0,49.5,0,TAU);c.stroke();c.restore();
    }
    c.restore();c.strokeStyle=tint(b,-.17);c.lineWidth=2;roundRect(c,1,1,W-2,H-2,6);c.stroke();paintedVersion=paletteVersion;
  }
  function drawHand(cx,cy,angle,short,opacity){
    if(opacity<=.001)return;ctx.save();ctx.globalAlpha=opacity;ctx.translate(cx,cy);ctx.rotate(angle);
    const color=short?state.short:state.long,len=49.3*(short?Math.min(state.shortLength,state.longLength):state.longLength)/100,wid=short?7.1:7.9;
    const shade=ctx.createLinearGradient(0,-wid/2,0,wid/2);
    const original=PRESETS.find(p=>p.material===state.material&&p.material);
    if(original&&color===(short?original.short:original.long)){
      const white=state.material==='white';shade.addColorStop(0,white?(short?'#555853':'#303330'):(short?'#c6c8c6':'#e8e9e7'));shade.addColorStop(.55,color);shade.addColorStop(1,white?'#383b38':(short?'#abaeab':'#c2c5c1'));
    }else{shade.addColorStop(0,tint(color,.10));shade.addColorStop(.5,color);shade.addColorStop(1,tint(color,-.12));}
    ctx.shadowColor='#00000038';ctx.shadowBlur=2;ctx.shadowOffsetY=1.3;ctx.fillStyle=shade;roundRect(ctx,-1.6,-wid/2,len+1.6,wid,1.5);ctx.fill();ctx.restore();
  }


  function setVisibility(mode,refresh=true){
    if(mode===state.visibility)return;
    const now=performance.now();interpolate(now);state.visibility=mode;
    for(const h of hands){
      const target=settleOpacity(h);
      if(now<h.fadeStart){
        // Finish the current movement before hiding a participating hand.
        h.fadeTo=target;
        if(target>h.travelOpacity){h.revealFrom=h.opacity;h.revealStart=now;h.revealEnd=Math.min(now+250,h.fadeStart);h.travelOpacity=target;h.fadeFrom=target;}
      }else{
        // Retarget from the sampled alpha, including a toggle during a fade.
        h.revealStart=now;h.revealEnd=now;h.travelOpacity=h.opacity;h.fadeFrom=h.opacity;h.fadeTo=target;h.fadeStart=now;h.fadeEnd=now+(reducedMotion?150:350);
      }
    }
    renderDirty=true;requestRender();
  }

function updateFormatter(){timeFormatter=state.timezone?new Intl.DateTimeFormat('en-GB',{timeZone:state.timezone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}):null;}
function nowMinutes(){
 const date=new Date();if(!timeFormatter)return date.getHours()*60+date.getMinutes();
 const parts=timeFormatter.formatToParts(date),hour=Number(parts.find(p=>p.type==='hour').value),minute=Number(parts.find(p=>p.type==='minute').value);
 return (hour%24)*60+minute;
}
function currentMinutes(){return nowMinutes();}
function requestRender(){if(!disposed&&!animationFrame&&!document.hidden)animationFrame=requestAnimationFrame(draw);}
function draw(now){
 animationFrame=0;if(disposed)return;
 const moving=hands.some(h=>now<h.fadeEnd);
 if(!renderDirty&&!moving&&!wasMoving)return;
 interpolate(now);if(paintedVersion!==paletteVersion)drawSurface();
 ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);ctx.clearRect(0,0,W,H);ctx.drawImage(surface,0,0,W,H);
 for(const {x,y,i} of points){
  drawHand(x,y,hands[i+1].angle,true,hands[i+1].opacity);drawHand(x,y,hands[i].angle,false,hands[i].opacity);
  const opacity=Math.max(hands[i].opacity,hands[i+1].opacity);
  if(opacity>.001){ctx.save();ctx.globalAlpha=opacity;ctx.beginPath();ctx.arc(x,y,3.1,0,TAU);ctx.fillStyle=state.long;ctx.fill();ctx.beginPath();ctx.arc(x-.6,y-.6,1,0,TAU);ctx.fillStyle=tint(state.long,.22);ctx.fill();ctx.restore();}
 }
 frameCount++;renderDirty=false;wasMoving=moving;if(moving)requestRender();
}
function resize(){
 const viewport=readViewport();geometry=Spec.geometry(viewport.width,viewport.height,state);
 W=geometry.boardWidth;H=geometry.boardHeight;points=geometry.points;
 const displayScale=Math.min((viewport.displayWidth||viewport.width)/viewport.width,(viewport.displayHeight||viewport.height)/viewport.height);
 const width=geometry.width*displayScale,height=geometry.height*displayScale;
 canvas.style.width=width+'px';canvas.style.height=height+'px';canvas.style.left=geometry.x*displayScale+'px';canvas.style.top=geometry.y*displayScale+'px';
 const dpr=Math.min(2,window.devicePixelRatio||1,Math.sqrt(8000000/Math.max(1,width*height))),w=Math.max(1,Math.floor(width*dpr)),h=Math.max(1,Math.floor(height*dpr));
 if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;surface.width=w;surface.height=h;}
 surfaceCtx.setTransform(w/W,0,0,h/H,0,0);paletteVersion++;renderDirty=true;requestRender();
}
function update(config){
 const next=Spec.normalize(config,state),previous={...state},visibility=next.visibility;
 Object.assign(state,next,{visibility:previous.visibility});
 state.material=state.board==='#111213'?'black':state.board==='#f6f4ef'?'white':null;
 if(previous.board!==state.board||previous.long!==state.long||previous.short!==state.short)paletteVersion++;
 if(previous.timezone!==state.timezone){updateFormatter();initializeTime(nowMinutes());}
 else if(previous.format24!==state.format24)initializeTime(nowMinutes());
 if(visibility!==previous.visibility)setVisibility(visibility);
 if(['layout','scale','padding','offsetX','offsetY'].some(k=>previous[k]!==state[k]))resize();
 renderDirty=true;requestRender();
}
function resume(){if(document.hidden){cancelAnimationFrame(animationFrame);animationFrame=0;}else{resize();initializeTime(nowMinutes());}}
function thumbnail(){
 const image=document.createElement('canvas');image.width=960;image.height=540;const c=image.getContext('2d');c.fillStyle=state.background;c.fillRect(0,0,960,540);
 const factor=Math.min(900/canvas.width,480/canvas.height),w=canvas.width*factor,h=canvas.height*factor;c.drawImage(canvas,(960-w)/2,(540-h)/2,w,h);return image.toDataURL('image/jpeg',.88);
}
updateFormatter();state.material=state.board==='#111213'?'black':state.board==='#f6f4ef'?'white':null;
resize();initializeTime(nowMinutes());
const timer=setInterval(()=>{if(!document.hidden)sync();},1000);
document.addEventListener('visibilitychange',resume);
return {update,resize,thumbnail,getStats:()=>({frameCount,geometry,pixelWidth:canvas.width,pixelHeight:canvas.height,display:state.minuteKey,animating:hands.some(h=>performance.now()<h.fadeEnd)}),dispose(){disposed=true;cancelAnimationFrame(animationFrame);clearInterval(timer);document.removeEventListener('visibilitychange',resume);}};
}
})(globalThis);
