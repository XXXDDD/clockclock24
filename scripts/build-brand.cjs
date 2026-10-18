'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'), brand=require('../src/brand/identity.json');
const model=require('../src/models/clockclock24/model.js');
const poses=model.digitPose(brand.icon.digit.repeat(4));
const round=n=>Math.round(n*1000)/1000;
const dials=[0,1,8,9,16,17].map((motor,index)=>{
  const x=brand.icon.centersX[index%2],y=brand.icon.centersY[Math.floor(index/2)];
  return {x,y,radius:brand.icon.radius,ends:[0,1].map(lane=>{
    const angle=poses[motor*2+lane].angle;
    return [round(x+Math.cos(angle)*brand.icon.handLength),round(y+Math.sin(angle)*brand.icon.handLength)];
  })};
});
const circlePath=d=>`M${d.x-d.radius},${d.y}a${d.radius},${d.radius} 0,1 0,${d.radius*2} 0a${d.radius},${d.radius} 0,1 0,-${d.radius*2} 0`;
const handPath=d=>d.ends.map(([x,y])=>`M${d.x},${d.y}L${x},${y}`).join('');
const foreground=dials.map(d=>`    <path android:fillColor="@android:color/transparent" android:strokeColor="#FFFFFF" android:strokeAlpha="0.38" android:strokeWidth="0.85" android:pathData="${circlePath(d)}" />\n    <path android:fillColor="@android:color/transparent" android:strokeColor="#FFFFFF" android:strokeWidth="${brand.icon.handWidth}" android:strokeLineCap="round" android:strokeLineJoin="round" android:pathData="${handPath(d)}" />`).join('\n');
const vector=content=>`<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="108dp" android:height="108dp" android:viewportWidth="108" android:viewportHeight="108">\n${content}\n</vector>\n`;
const adaptive=monochrome=>`<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n    <background android:drawable="@android:color/black" />\n    <foreground android:drawable="@drawable/ic_shizhen_foreground" />\n${monochrome?'    <monochrome android:drawable="@drawable/ic_shizhen_foreground" />\n':''}</adaptive-icon>\n`;
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 108 108" role="img" aria-label="时阵：六枚表盘组成数字">\n<rect width="108" height="108" rx="24" fill="#000"/>\n${dials.map(d=>`<circle cx="${d.x}" cy="${d.y}" r="${d.radius}" fill="none" stroke="#fff" stroke-opacity=".38" stroke-width=".85"/><path d="${handPath(d)}" fill="none" stroke="#fff" stroke-width="${brand.icon.handWidth}" stroke-linecap="round" stroke-linejoin="round"/>`).join('\n')}\n</svg>\n`;
const outputs={
  'assets/brand/shizhen.svg':svg,
  'assets/brand/shizhen-icon.json':JSON.stringify({name:brand.name,size:108,handWidth:brand.icon.handWidth,dials},null,2)+'\n',
  'android/app/src/main/res/drawable/ic_shizhen_foreground.xml':vector(foreground),
  'android/app/src/main/res/drawable/ic_shizhen.xml':vector('    <path android:fillColor="#000000" android:pathData="M0,0h108v108h-108z" />\n'+foreground),
  'android/app/src/main/res/mipmap-anydpi-v26/ic_shizhen.xml':adaptive(false),
  'android/app/src/main/res/mipmap-anydpi-v33/ic_shizhen.xml':adaptive(true)
};
for(const [file,contents] of Object.entries(outputs)) {
  const target=path.join(root,file);
  if(process.argv.includes('--check')) {
    if(!fs.existsSync(target)||fs.readFileSync(target,'utf8')!==contents)throw new Error('Brand artifact is stale: '+file);
  } else {fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,contents);}
}
console.log('时阵 black-and-white vector identity '+(process.argv.includes('--check')?'matches sources.':'built.'));
