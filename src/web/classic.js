(function (root, factory) {
  const commonJS = typeof module === 'object' && module.exports;
  const api = factory(commonJS ? require('../shared/config.js') : root.Timeform.Config,
    commonJS ? require('./classic-editions.js') : root.Timeform.ClassicEditions,
    commonJS ? require('../shared/edition-animation.js') : root.Timeform.EditionAnimation,
    commonJS ? require('../shared/edition-drawing.js') : root.Timeform.EditionDrawing,
    commonJS ? require('../models/classic-landscape.js') : root.Timeform.ClassicLandscape || [],
    commonJS ? require('./reference-motion.js') : root.Timeform.ReferenceMotion,
    commonJS ? require('../models/clockclockl/animation.js') : root.Timeform.ClockClockLAnimation,
    commonJS ? require('./shared-actions.js') : root.Timeform.SharedActions);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.Timeform ||= {}).Classic = api;
})(globalThis, function (Config, Variants, EditionAnimation, EditionDrawing, AdditionalLandscape, ReferenceMotion, ClockClockLAnimation, SharedActions) {
  'use strict';
  // Official editions are editable starting points for the web workbench.
  const editions = {
    clockclock9: { name: 'ClockClock 9', edition: 'White', colors: '白色圆板 · 深灰双针', motion: '斜线扫动与菱形成型',
      note: '依据官方短片重建共同扫动与菱形成型；18 秒完整换时含原片未覆盖的衔接。' },
    amt61c: { name: 'A million Times 61c', edition: 'Zephyr', colors: '森林绿圆板 · 金色双针', motion: 'Zephyr 风势流动', duration: 53.1,
      note: '依据 Zephyr 原片重建整理、停留、风势流动与逐针成型；数字排布与其他读时为网页重建。' },
    clockclock24: { name: 'ClockClock 24', edition: 'Black', colors: '黑色板面 · 浅色双针', motion: '斜线列波',
      note: '依据 Black 原片重建斜线列波与逐针成型，参考读时为 09:34 → 09:35。' },
    clockclockl: {name:'ClockClock L',edition:'Tidal',colors:'深蓝铝板 · 银色双针',motion:'交错旋转 / 斜线波浪 / 潮汐波浪',
      note:'选择一种动作，换时与重播沿用当前选择，默认斜线波浪。交错旋转与潮汐波浪根据 CCL 片段重建，斜线沿用 CC24 参考编排；完整衔接为网页重建。'},
    amt96: {name:'A million Times 96',edition:'Bjarke Ingels',colors:'Sunset Dune 洞石 · 银色双针',motion:'四表盘旋转开合',
      note:'依据本款约 52.2 秒完整原片重建四表盘旋转开合与逐针成型，参考读时为 11:34 → 11:35；洞石纹理为二维近似。'},
    amt72: { name: 'A million Times 72', edition: 'Black', colors: '黑色板面 · 浅色双针', motion: '中心放射与涟漪开合',
      note: '依据普通 Black 款原片重建向心归队、涟漪开合与逐针成型。' },
    amt120: { name: 'A million Times 120', edition: 'Black', colors: '黑色板面 · 浅色双针', motion: '环弧归队与环波开合',
      note: '依据 Black 原片重建环弧归队、反向开合与逐针减速成型。' },
    amt144: { name: 'A million Times 144', edition: 'Black', colors: '黑色板面 · 浅色双针', motion: '斜线列波与双速归位',
      note: '依据 Black 原片重建逐列斜线、顺时针列波与双速归位。' },
    amt288: { name: 'A million Times 288', edition: 'White', colors: '白色板面 · 深色双针', motion: '环弧归队与环波开合',
      note: '依据 White 专属原片重建环弧与环波，保留宽幅字形和双方形冒号。' },
    amt72v: { name: 'A million Times 72v', edition: 'Black Sterling', colors: '黑色板面 · 银色双针', motion: '列间相位与双速成型',
      note: '原片从运动中段开始；完整换时保留既有 6 秒衔接，原片对照直接播放约 32 秒的参考片段。' }
  };
  function wrap(model, variant) {
    const edition = variant ? { ...editions[model.id], ...variant } : editions[model.id];
    if (!edition || !model.reference || !model.motionReference) throw new Error('此型号缺少经典款原设计依据。');
    const original = model.Settings;
    const is24 = ['clockclock24', 'clockclockl'].includes(model.id);
    const referenceChoice = variant?.id === 'clockclock24-pinakin-hara' ? 'tidal'
      : variant?.id === 'clockclock24-bjarke-ingels' ? 'scatter' : 'diagonal';
    const preset = { ...original.defaults, motion: 'wave', ...variant?.palette };
    if (is24) preset.choreography = referenceChoice;
    if (Object.hasOwn(preset, 'visibility')) preset.visibility = 'show';
    if (edition.duration) preset.duration = edition.duration;
    const fields = Object.fromEntries(Object.entries(original.fields).map(([key, field]) => [key, { ...field, value: preset[key] }]));
    fields.motion = { ...fields.motion, label: '参考动作', options: [['wave', edition.motion.replace(/ · 本款原片节奏| · 预设动作/g, '')]], hidden: is24 };
    if (is24) fields.choreography = { type: 'select', label: '动作类型', value: referenceChoice, group: 'motion',
      options: ReferenceMotion.choices, help: '交错旋转与潮汐波浪来自 CCL 参考；各预设保留自己的默认动作节奏。' };
    fields.duration.help = '此预设默认 ' + preset.duration + ' 秒，调整后整段动作按比例缩放。';
    fields.autoDemo.label = '自动逐分钟演示';
    const normalize = (input = {}, base = {}) => {
      const config = Config.normalize(fields, input, base);
      return { ...original.normalize(config), motion: 'wave', ...(is24 ? { choreography: config.choreography } : {}) };
    };
    const Settings = { fields, normalize, defaults: normalize() };
    function geometry(width, height, input) {
      const config = normalize(input), measured = model.geometry(width, height, config);
      if (!variant?.sizeCm) return measured;
      // Sunset Dune is 92 × 42 cm rather than the standard 90 × 40 cm.
      // The measured dial pitch is retained and the stone border grows by 1 cm.
      const boardWidth=measured.boardWidth*variant.sizeCm[0]/90;
      const boardHeight=measured.boardHeight*variant.sizeCm[1]/40;
      const availableWidth=Math.max(1,width-measured.padding*2),availableHeight=Math.max(1,height-measured.padding*2);
      const factor=Math.min(availableWidth/boardWidth,availableHeight/boardHeight)*config.scale/100;
      const displayWidth=boardWidth*factor,displayHeight=boardHeight*factor;
      return { ...measured,boardWidth,boardHeight,width:displayWidth,height:displayHeight,
        x:(width-displayWidth)/2+(availableWidth-displayWidth)/2*config.offsetX/100,
        y:(height-displayHeight)/2+(availableHeight-displayHeight)/2*config.offsetY/100,
        points:measured.points.map(point=>({ ...point,x:point.x+(boardWidth-measured.boardWidth)/2,y:point.y+(boardHeight-measured.boardHeight)/2 })) };
    }
    function create(input, options) {
      let clock = variant?.profile ? EditionAnimation.create(model, Settings, variant.profile, normalize(input), options)
        : model.create(normalize(input), variant?.baseProfile ? { ...options, motionProfile: variant.baseProfile } : options);
      if (model.id === 'clockclock24') {
        const config = normalize(input);
        clock.state.choreography = config.choreography;
        const alternate = ClockClockLAnimation.create({ ...model, Settings }, config, options);
        clock = ReferenceMotion.create(clock, alternate, referenceChoice, Settings);
      }
      const update = clock.update.bind(clock);
      clock.update = (input, now) => update(normalize(input, clock.state), now);
      if (!variant && model.referenceClip && clock.playReference) {
        const playReference = clock.playReference.bind(clock);
        clock.playReference = (minutes, now) => {
          // The source clip omits the full transition's entry segment.
          const settings = normalize(clock.state);
          update({ ...settings, duration: model.referenceDuration }, now);
          const changed = playReference(minutes, now);
          update(settings, now);
          return changed;
        };
      }
      return clock;
    }
    const reference = variant ? 'https://www.humanssince1982.com/en-int/products/' + variant.slug : model.reference;
    return { ...model, ...edition, id: variant?.id || model.id, family: model.id, group: is24 ? 'clockclock24' : model.id, reference,
      presetLabel: model.id === 'clockclockl' ? 'CCL · Tidal' : edition.edition,
      panelSize: model.id === 'clockclockl' ? '157 × 72 cm' : null,
      description: model.id === 'clockclockl' ? '24 系列的 CCL 预设，8 × 3 深蓝铝板与银色双针。' : edition.description || model.description,
      motionReference: variant ? variant.video || model.motionReference : model.motionReference,
      motionReferenceLabel: variant?.video ? '本款原片视频 ↗' : variant ? '默认动作参考视频 ↗' : '原片视频 ↗',
      motionProvenance: variant ? variant.video ? 'official-video' : 'family-default' : 'official-video',
      referenceClip: variant ? false : model.referenceClip,
      Drawing: variant?.video ? EditionDrawing.wrap(model, variant) : model.Drawing,
      classic: true, Settings,
      pickerName: model.id.startsWith('clockclock') ? edition.name : 'AMT ' + model.id.slice(3),
      pickerDetail: edition.edition + ' · ' + (model.countLabel || model.count + ' 个表盘'),
      referenceLabel: '原设计 · ' + edition.name + ' ' + edition.edition + ' ↗',
      previewNote: edition.note,
      referenceDuration: variant ? variant.completeVideo ? variant.duration : null
        : model.id === 'amt61c' ? edition.duration : model.referenceDuration,
      create,
      geometry };
  }
  function catalog(source) {
    const originals=[...source.models,...(source.models[0]?.type === 'landscape' ? AdditionalLandscape : [])];
    const models = originals.flatMap(model => [wrap(model), ...Variants.filter(v => v.family === model.id).map(v => wrap(model, v))]);
    SharedActions.install(models);
    const get = id => models.find(model => model.id === id);
    function parse(text) {
      const data = JSON.parse(text);
      const model = data?.version === 2 ? get(data.model) : get('clockclock24');
      if (!model) throw new Error('请选择当前类别内的型号配置。');
      const input = data?.settings || data;
      if (input && typeof input === 'object' && (['spin', 'quiet', 'none', 'orbit'].includes(input.motion)
        || data?.version !== 2 && input.motion === 'wave')) delete input.motion;
      return { model, settings: Config.parse(model, JSON.stringify(data)) };
    }
    return { models, get, parse };
  }
  return { catalog };
});
