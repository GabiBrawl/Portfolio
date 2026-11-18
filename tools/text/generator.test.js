const { test } = require('node:test');
const assert = require('node:assert/strict');
const { generateGothic, generateStyledText, textStyles } = require('./generator.js');

test('matches the portfolio alias in bold gothic', () => {
  assert.equal(generateGothic('GabiBrawl'), '𝕲𝖆𝖇𝖎𝕭𝖗𝖆𝖜𝖑');
});

test('regular gothic uses the special Unicode capital letters', () => {
  assert.equal(generateGothic('CHIRZ', 'regular'), 'ℭℌℑℜℨ');
  assert.equal(generateGothic('abc', 'regular'), '𝔞𝔟𝔠');
});

test('preserves numbers, punctuation, accents, emoji, and newlines', () => {
  assert.equal(generateGothic('Hi! 123 é 🖤\n'), '𝕳𝖎! 123 é 🖤\n');
  assert.equal(generateGothic(''), '');
});

test('converts all ASCII letters without losing characters', () => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  for (const style of ['bold', 'regular']) {
    assert.equal(Array.from(generateGothic(alphabet, style)).length, 52);
  }
  assert.throws(() => generateGothic('text', 'unknown'), /supported gothic style/);
});

test('handles reserved Unicode positions in script and double-struck alphabets', () => {
  assert.equal(generateStyledText('BEFHILMR ego', 'script'), 'ℬℰℱℋℐℒℳℛ ℯℊℴ');
  assert.equal(generateStyledText('CHNPQRZ', 'double'), 'ℂℍℕℙℚℝℤ');
  assert.equal(generateStyledText('hi', 'serif-italic'), 'ℎ𝑖');
});

test('converts digits in alphabets that support them and keeps unsupported digits', () => {
  assert.equal(generateStyledText('012', 'serif-bold'), '𝟎𝟏𝟐');
  assert.equal(generateStyledText('012', 'double'), '𝟘𝟙𝟚');
  assert.equal(generateStyledText('012', 'circled'), '⓪①②');
  assert.equal(generateStyledText('012', 'fullwidth'), '０１２');
  assert.equal(generateStyledText('012', 'gothic'), '012');
});

test('all 18 styles preserve emoji and accents', () => {
  assert.equal(textStyles.length, 18);
  for (const style of textStyles) {
    const result = generateStyledText('A é🖤', style.id);
    assert(result.includes('é'));
    assert(result.includes('🖤'));
  }
  assert.equal(generateStyledText('a!', 'underline'), 'a\u0332!');
  assert.equal(generateStyledText('a!', 'strike'), 'a\u0336!');
  assert.throws(() => generateStyledText('text', 'unsupported'));
});

test('every alphabet style uses assigned characters that normalize to the source', () => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (const style of textStyles.filter(style => style.upper)) {
    const output = generateStyledText(alphabet, style.id);
    assert.equal(output.normalize('NFKC'), alphabet, style.id);
    assert(!/\p{Cn}/u.test(output), style.id);
  }
});
