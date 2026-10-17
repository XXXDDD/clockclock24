(function (root, factory) {
  const commonJS=typeof module==='object' && module.exports;
  const api=factory(commonJS ? require('../../shared/edition-animation.js') : root.Timeform.EditionAnimation,
    commonJS ? require('../clockclock24/animation.js') : root.Timeform.ClockClock24Animation);
  if (commonJS) module.exports=api; else (root.Timeform ||= {}).ClockClockLAnimation=api;
})(globalThis, function (Engine, ClockClock24) {
  'use strict';
  // Three user-selected motions. The oblique Tidal shot is independent of
  // the first scattered opening; the final settling shot is not a fourth dance.
  const profile={id:'scatter',name:'散相旋转',duration:42,alignStart:0,alignEnd:6,waveStart:6,formStart:32,formEnd:41.5,
    stage:'散相旋转',tracks:[
      [98.269,358.658,21.3634,-24.3558],[268.848,359.546,24.3432,-24.4509],
      [99.582,355.670,21.9029,-22.7122],[178.894,102.748,22.4681,-27.9236],
      [83.904,272.459,25.3870,-24.9838],[179.948,88.280,23.7350,-22.5498],
      [183.126,348.730,23.5205,-31.7227],[117.402,321.629,11.4592,-45.8366],
      [357.986,5.462,23.0640,-23.7322],[353.589,9.701,23.2527,-24.1374],
      [89.520,188.210,21.2926,-22.2948],[355.214,7.343,22.3234,-23.1063],
      [74.072,280.607,24.6276,-24.9238],[352.122,96.632,23.2219,-22.6066],
      [357.501,268.479,31.3500,-31.1044],[339.720,12.334,16.1153,-23.5219],
      [340.893,280.625,24.5629,-22.3607],[345.861,110.893,23.3105,-23.0678],
      [82.609,278.047,20.2496,-21.4403],[343.341,109.229,23.0156,-23.3792],
      [65.930,295.397,24.2053,-25.8142],[343.223,105.539,22.8977,-22.3356],
      [231.898,86.604,38.5212,-11.4592],[341.429,185.059,23.0189,-29.5351]
    ]};
  // Shot two (7.65–10.8 s), measured after undoing the oblique camera view:
  // the arms open symmetrically about the direction towards the grid centre.
  const radial={id:'tidal',name:'Tidal 波浪',duration:42,alignStart:0,alignEnd:4,waveStart:6,formStart:30,formEnd:41.5,
    layout:'radial',counter:true,splay:14.5287707647,radialDelay:.3949335617,
    period:360/32.8902340373,ramp:.1587864211,modulation:0,stage:'Tidal 波浪'};
  // Retain the familiar diagonal choreography requested by the user. Its
  // measured phase comes from CC24; it is not an unseen CCL clip measurement.
  const diagonal={id:'diagonal',name:'斜线列波',duration:40.08,alignStart:.45,alignEnd:5.25,
    waveStart:8.5,formStart:25.2,formEnd:39.45,heading:315,opposed:true,
    columnDelay:.4,order:-1,phaseAt:ClockClock24.waveAt,stage:'斜线列波'};
  const profiles=[profile,diagonal,radial];
  function create(model,initial,options={}) {
    const selected=state=>profiles.find(p=>p.id===state.choreography) || diagonal;
    const clock=Engine.create(model,model.Settings,diagonal,initial,{...options,
      profileFor:(_,state)=>selected(state)});
    clock.getChoreography=()=>({id:selected(clock.state).id,name:selected(clock.state).name});
    return clock;
  }
  return {profile,profiles,create};
});
