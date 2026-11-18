(function (root) {
  'use strict';

  function toHSL(hex) {
    const channels = hex.match(/\w{2}/g).map(channel => parseInt(channel, 16) / 255);
    const [r, g, b] = channels;
    const max = Math.max(...channels), min = Math.min(...channels);
    const delta = max - min, lightness = (max + min) / 2;
    let hue = 0;
    if (delta) {
      if (max === r) hue = ((g - b) / delta) % 6;
      else if (max === g) hue = (b - r) / delta + 2;
      else hue = (r - g) / delta + 4;
    }
    return [(hue * 60 + 360) % 360, delta ? delta / (1 - Math.abs(2 * lightness - 1)) : 0, lightness];
  }

  function toHex(hue, saturation, lightness) {
    const h = ((hue % 360) + 360) % 360;
    const a = saturation * Math.min(lightness, 1 - lightness);
    const channel = n => {
      const k = (n + h / 30) % 12;
      const value = lightness - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
      return Math.round(value * 255).toString(16).padStart(2, '0');
    };
    return `#${channel(0)}${channel(8)}${channel(4)}`.toUpperCase();
  }

  function generatePalette(seed, mode, variation = 0) {
    if (!/^#[0-9a-f]{6}$/i.test(seed)) throw new Error('Enter a six-digit hex color, such as #FFAB07.');
    const [h, s, l] = toHSL(seed.slice(1));
    const schemes = {
      analogous: [[-60, l], [-30, l], [0, l], [30, l], [60, l]],
      complementary: [[0, 0.22], [0, 0.38], [0, l], [180, 0.55], [180, 0.75]],
      triadic: [[120, 0.35], [120, 0.65], [0, l], [240, 0.35], [240, 0.65]],
      monochromatic: [[0, 0.15], [0, 0.32], [0, l], [0, 0.68], [0, 0.85]]
    };
    if (!Object.hasOwn(schemes, mode)) throw new Error('Choose a supported palette style.');
    return schemes[mode].map(([offset, lightness], index) => index === 2 ? seed.toUpperCase() : toHex(h + offset, s, Math.max(0.08, Math.min(0.92, lightness + variation))));
  }

  function mergePaletteLocks(next, previous, locked) {
    return next.map((color, index) => locked[index] && previous[index] ? previous[index] : color);
  }

  function createPalette(previous, locked, mode, random = Math.random) {
    const anchor = previous.find((color, index) => locked[index]);
    const seed = anchor || toHex(random() * 360, 0.35 + random() * 0.45, 0.35 + random() * 0.3);
    const colors = generatePalette(seed, mode, random() * 0.3 - 0.15);
    // Include dark, mid-tone, and light colors so a palette works in an actual layout.
    const levels = [0.18, 0.38, null, 0.88, 0.65];
    colors.forEach((color, index) => {
      if (index === 2) return;
      const [h, s] = toHSL(color.slice(1));
      const lightness = levels[index] + (random() - 0.5) * 0.1;
      const saturation = index === 3 ? s * 0.4 : s;
      colors[index] = toHex(h, saturation, lightness);
    });
    // A locked color can be anywhere; it anchors generation without moving slots.
    if (anchor && !locked[2]) {
      const [h, s, l] = toHSL(seed.slice(1));
      colors[2] = toHex(h, s, Math.max(0.12, Math.min(0.88, l + (random() > 0.5 ? 0.18 : -0.18))));
    }
    return mergePaletteLocks(colors, previous, locked);
  }

  function readableTextColor(hex) {
    const channels = hex.slice(1).match(/.{2}/g).map(value => {
      const channel = parseInt(value, 16) / 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
    return (luminance + 0.05) / 0.05 >= 1.05 / (luminance + 0.05) ? '#000000' : '#FFFFFF';
  }

  const api = { generatePalette, mergePaletteLocks, createPalette, readableTextColor };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else Object.assign(root, api);
})(typeof window !== 'undefined' ? window : globalThis);
