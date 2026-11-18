const { test } = require('node:test');
const assert = require('node:assert/strict');
const { generatePalette, mergePaletteLocks, createPalette, readableTextColor } = require('./generator.js');

test('analogous colors rotate red by thirty-degree steps', () => {
  assert.deepEqual(generatePalette('#ff0000', 'analogous'), [
    '#FF00FF', '#FF0080', '#FF0000', '#FF8000', '#FFFF00'
  ]);
});

test('all styles preserve the base color and produce five valid hex colors', () => {
  for (const seed of ['#FFAB07', '#000000', '#FFFFFF', '#808080', '#0000FF']) {
    for (const mode of ['analogous', 'complementary', 'triadic', 'monochromatic']) {
      const colors = generatePalette(seed, mode);
      assert.equal(colors.length, 5);
      assert.equal(colors[2], seed);
      for (const color of colors) assert.match(color, /^#[0-9A-F]{6}$/);
    }
  }
});

test('monochromatic grayscale has predictable dark and light shades', () => {
  assert.deepEqual(generatePalette('#808080', 'monochromatic'), [
    '#262626', '#525252', '#808080', '#ADADAD', '#D9D9D9'
  ]);
});

test('rejects invalid colors and unknown styles', () => {
  for (const seed of ['red', '#FFF', '#GG0000', 'FF0000', '#1234567']) {
    assert.throws(() => generatePalette(seed, 'analogous'), /six-digit hex/);
  }
  assert.throws(() => generatePalette('#FF0000', 'unknown'), /supported palette/);
});

test('locked slots survive a new seed and harmony, while other slots change', () => {
  const previous = generatePalette('#FF0000', 'analogous');
  const next = generatePalette('#0000FF', 'triadic');
  const result = mergePaletteLocks(next, previous, [true, false, true, false, true]);
  assert.deepEqual(result, [previous[0], next[1], previous[2], next[3], previous[4]]);
  assert.deepEqual(mergePaletteLocks(next, previous, [true, true, true, true, true]), previous);
  assert.deepEqual(mergePaletteLocks(next, previous, [false, false, false, false, false]), next);
});

test('a locked base still allows new shades to be generated', () => {
  const previous = generatePalette('#FFAB07', 'analogous');
  const next = generatePalette('#FFAB07', 'analogous', -0.15);
  assert.equal(previous[2], next[2]);
  assert.notEqual(previous[0], next[0]);
});

test('any locked slot anchors generation and keeps its exact color', () => {
  const previous = ['#123456', '#ABCDEF', '#FFAB07', '#667788', '#EEEEEE'];
  const locks = [true, false, false, true, false];
  const next = createPalette(previous, locks, 'complementary', () => 0.25);
  assert.equal(next[0], previous[0]);
  assert.equal(next[3], previous[3]);
  assert.notEqual(next[1], previous[1]);
  assert.notEqual(next[2], previous[2]);
  assert.deepEqual(createPalette(previous, Array(5).fill(true), 'triadic'), previous);
});

test('preview foreground chooses readable black or white text', () => {
  assert.equal(readableTextColor('#FFFFFF'), '#000000');
  assert.equal(readableTextColor('#000000'), '#FFFFFF');
  assert.equal(readableTextColor('#FFAB07'), '#000000');
});
