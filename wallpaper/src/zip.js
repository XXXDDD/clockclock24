(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TimeformZip = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const encoder = new TextEncoder();
  const table = Array.from({ length: 256 }, (_, value) => {
    for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    return value >>> 0;
  });
  function crc32(data) {
    let crc = 0xffffffff;
    for (const byte of data) crc = table[(crc ^ byte) & 255] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  }
  function create(files) {
    const local = [], central = [];
    let offset = 0, centralLength = 0;
    for (const [filename, content] of Object.entries(files)) {
      if (/^[/\\]|(^|[/\\])\.\.([/\\]|$)/.test(filename)) throw new Error('Unsafe ZIP path');
      const name = encoder.encode(filename), data = typeof content === 'string' ? encoder.encode(content) : new Uint8Array(content);
      const checksum = crc32(data), header = new Uint8Array(30 + name.length), view = new DataView(header.buffer);
      view.setUint32(0, 0x04034b50, true); view.setUint16(4, 20, true); view.setUint16(6, 0x800, true);
      view.setUint16(12, 0x5021, true); // Fixed 2020-01-01 date for reproducible builds.
      view.setUint32(14, checksum, true); view.setUint32(18, data.length, true); view.setUint32(22, data.length, true); view.setUint16(26, name.length, true); header.set(name, 30);
      const entry = new Uint8Array(46 + name.length), info = new DataView(entry.buffer);
      info.setUint32(0, 0x02014b50, true); info.setUint16(4, 20, true); info.setUint16(6, 20, true); info.setUint16(8, 0x800, true); info.setUint16(14, 0x5021, true);
      info.setUint32(16, checksum, true); info.setUint32(20, data.length, true); info.setUint32(24, data.length, true); info.setUint16(28, name.length, true); info.setUint32(42, offset, true); entry.set(name, 46);
      local.push(header, data); central.push(entry); offset += header.length + data.length; centralLength += entry.length;
    }
    const end = new Uint8Array(22), footer = new DataView(end.buffer);
    footer.setUint32(0, 0x06054b50, true); footer.setUint16(8, central.length, true); footer.setUint16(10, central.length, true); footer.setUint32(12, centralLength, true); footer.setUint32(16, offset, true);
    const result = new Uint8Array(offset + centralLength + end.length);
    let cursor = 0;
    for (const chunk of [...local, ...central, end]) { result.set(chunk, cursor); cursor += chunk.length; }
    return result;
  }
  return { create, crc32 };
});
