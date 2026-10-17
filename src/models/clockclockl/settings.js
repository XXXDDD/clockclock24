(function (root, factory) {
  const commonJS=typeof module==='object' && module.exports;
  const api=factory(commonJS ? require('../../shared/config.js') : root.Timeform.Config,
    commonJS ? require('../clockclock24/settings.js') : root.Timeform.ClockClock24Settings);
  if (commonJS) module.exports=api; else (root.Timeform ||= {}).ClockClockLSettings=api;
})(globalThis, function (Config, Base) {
  'use strict';
  const fields={ ...Base.fields,
    board:{...Base.fields.board,value:'#172039'}, background:{...Base.fields.background,value:'#e9e6de'},
    long:{...Base.fields.long,value:'#d6d8d5'},short:{...Base.fields.short,value:'#d6d8d5'},
    shortLength:{...Base.fields.shortLength,value:89,help:'相对原作长针基准；CCL 正视产品图量测约为 89%。'},
    gap:{...Base.fields.gap,value:4.8},longWidth:{...Base.fields.longWidth,value:7.8},shortWidth:{...Base.fields.shortWidth,value:7.8},
    choreography:{type:'select',label:'动作',value:'diagonal',group:'motion',
      options:[['scatter','散相旋转'],['diagonal','斜线列波'],['tidal','Tidal 波浪']],help:'选择后立即预览；换时和重播沿用当前动作。'},
    duration:{...Base.fields.duration,value:42,help:'每套动作 42 秒，包含补足的完整衔接与读时停留。'} };
  const normalize=(input={},base={})=>Config.normalize(fields,input,base);
  return {fields,normalize,defaults:normalize()};
});
