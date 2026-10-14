(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.Timeform ||= {}).Time = api;
})(globalThis, function () {
  'use strict';
  const normalizeMinutes = value => ((value % 1440) + 1440) % 1440;
  const minutesFromText = text => Number(text.slice(0, 2)) * 60 + Number(text.slice(3, 5));
  const textFromMinutes = value => {
    const minute = normalizeMinutes(value);
    return String(Math.floor(minute / 60)).padStart(2, '0') + ':' + String(minute % 60).padStart(2, '0');
  };
  function createSource(readDate = () => new Date()) {
    let cachedZone, formatter;
    function read(config) {
      if (config.source === 'manual') return minutesFromText(config.manualTime);
      const date = readDate();
      if (!config.timezone) return date.getHours() * 60 + date.getMinutes();
      if (cachedZone !== config.timezone) {
        formatter = new Intl.DateTimeFormat('en-GB', { timeZone: config.timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
        cachedZone = config.timezone;
      }
      const parts = formatter.formatToParts(date);
      return Number(parts.find(part => part.type === 'hour').value) % 24 * 60 + Number(parts.find(part => part.type === 'minute').value);
    }
    return { read };
  }
  // One monotonic timeline drives the whole array, including paused single steps.
  function createPlayback(readNow = () => performance.now()) {
    let position = 0, anchor = readNow(), paused = false, speed = 1;
    function now() {
      const current = readNow();
      if (!paused) position += Math.max(0, current - anchor) * speed;
      anchor = current; return position;
    }
    function setPaused(value) { now(); paused = Boolean(value); }
    function setSpeed(value) {
      if (!Number.isFinite(value) || value <= 0) throw new Error('播放速度必须大于零。');
      now(); speed = value;
    }
    function step(milliseconds = 100) { if (paused) position += Math.max(0, milliseconds); return now(); }
    return { now, setPaused, setSpeed, step, get paused() { return paused; }, get speed() { return speed; } };
  }
  return { createSource, createPlayback, normalizeMinutes, minutesFromText, textFromMinutes };
});
