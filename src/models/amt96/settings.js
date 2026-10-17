(function (root, factory) {
  const commonJS=typeof module==='object' && module.exports;
  const api=factory(commonJS ? require('../../shared/config.js') : root.Timeform.Config,
    commonJS ? require('../amt/settings.js') : root.Timeform.AMTSettings);
  if (commonJS) module.exports=api; else (root.Timeform ||= {}).AMT96Settings=api;
})(globalThis, function (Config, Base) {
  'use strict';
  const fields={...Base.fields,
    radius:{...Base.fields.radius,value:53.2},gap:{...Base.fields.gap,value:5},
    board:{...Base.fields.board,value:'#b56842'},background:{...Base.fields.background,value:'#e9e6de'},
    long:{...Base.fields.long,value:'#d6d8d5'},short:{...Base.fields.short,value:'#d6d8d5'},
    longWidth:{...Base.fields.longWidth,value:8.6},shortWidth:{...Base.fields.shortWidth,value:8.6},
    duration:{...Base.fields.duration,value:52.2,max:120,help:'依据本款 52.24 秒完整原片：11:34 → 11:35。'},
    manualTime:{...Base.fields.manualTime,value:'11:34'} };
  const normalize=(input={},base={})=>Config.normalize(fields,input,base);
  return {fields,normalize,defaults:normalize()};
});
