(function (root) {
  'use strict';
  // Unicode mathematical alphabets have legacy exceptions in Letterlike Symbols.
  const styles = [
    { id: 'gothic-bold', name: 'Bold gothic', group: 'Gothic', upper: 0x1D56C, lower: 0x1D586 },
    { id: 'gothic', name: 'Gothic', group: 'Gothic', upper: 0x1D504, lower: 0x1D51E, exceptions: { C: 'ℭ', H: 'ℌ', I: 'ℑ', R: 'ℜ', Z: 'ℨ' } },
    { id: 'serif-bold', name: 'Bold', group: 'Classic', upper: 0x1D400, lower: 0x1D41A, digits: 0x1D7CE },
    { id: 'serif-italic', name: 'Italic', group: 'Classic', upper: 0x1D434, lower: 0x1D44E, exceptions: { h: 'ℎ' } },
    { id: 'serif-bold-italic', name: 'Bold italic', group: 'Classic', upper: 0x1D468, lower: 0x1D482 },
    { id: 'script', name: 'Script', group: 'Script', upper: 0x1D49C, lower: 0x1D4B6, exceptions: { B: 'ℬ', E: 'ℰ', F: 'ℱ', H: 'ℋ', I: 'ℐ', L: 'ℒ', M: 'ℳ', R: 'ℛ', e: 'ℯ', g: 'ℊ', o: 'ℴ' } },
    { id: 'script-bold', name: 'Bold script', group: 'Script', upper: 0x1D4D0, lower: 0x1D4EA },
    { id: 'double', name: 'Double-struck', group: 'Classic', upper: 0x1D538, lower: 0x1D552, digits: 0x1D7D8, exceptions: { C: 'ℂ', H: 'ℍ', N: 'ℕ', P: 'ℙ', Q: 'ℚ', R: 'ℝ', Z: 'ℤ' } },
    { id: 'sans', name: 'Sans serif', group: 'Clean', upper: 0x1D5A0, lower: 0x1D5BA, digits: 0x1D7E2 },
    { id: 'sans-bold', name: 'Sans bold', group: 'Clean', upper: 0x1D5D4, lower: 0x1D5EE, digits: 0x1D7EC },
    { id: 'sans-italic', name: 'Sans italic', group: 'Clean', upper: 0x1D608, lower: 0x1D622 },
    { id: 'sans-bold-italic', name: 'Sans bold italic', group: 'Clean', upper: 0x1D63C, lower: 0x1D656 },
    { id: 'mono', name: 'Monospace', group: 'Clean', upper: 0x1D670, lower: 0x1D68A, digits: 0x1D7F6 },
    { id: 'circled', name: 'Circled', group: 'Playful', upper: 0x24B6, lower: 0x24D0, digitMap: Array.from('⓪①②③④⑤⑥⑦⑧⑨') },
    { id: 'fullwidth', name: 'Wide', group: 'Playful', upper: 0xFF21, lower: 0xFF41, digits: 0xFF10 },
    { id: 'spaced', name: 'Spaced', group: 'Playful', transform: text => Array.from(text).join(' ') },
    { id: 'underline', name: 'Underlined', group: 'Playful', mark: '\u0332' },
    { id: 'strike', name: 'Strikethrough', group: 'Playful', mark: '\u0336' }
  ];
  function generateStyledText(text, id) {
    const style = styles.find(item => item.id === id);
    if (!style) throw new Error('Choose a supported text style.');
    if (style.transform) return style.transform(text);
    return Array.from(text, letter => {
      if (style.mark) return /[A-Za-z0-9]/.test(letter) ? letter + style.mark : letter;
      if (style.exceptions?.[letter]) return style.exceptions[letter];
      const code = letter.codePointAt(0);
      if (code >= 65 && code <= 90) return String.fromCodePoint(style.upper + code - 65);
      if (code >= 97 && code <= 122) return String.fromCodePoint(style.lower + code - 97);
      if (code >= 48 && code <= 57) {
        if (style.digitMap) return style.digitMap[code - 48];
        if (style.digits) return String.fromCodePoint(style.digits + code - 48);
      }
      return letter;
    }).join('');
  }
  function generateGothic(text, style = 'bold') {
    if (!['bold', 'regular'].includes(style)) throw new Error('Choose a supported gothic style.');
    return generateStyledText(text, style === 'bold' ? 'gothic-bold' : 'gothic');
  }
  const api = { textStyles: styles, generateStyledText, generateGothic };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else Object.assign(root, api);
})(typeof window !== 'undefined' ? window : globalThis);
