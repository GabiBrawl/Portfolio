(function () {
  'use strict';
  const modes = { analogous: 'Analogous', complementary: 'Complementary', triadic: 'Triadic', monochromatic: 'Monochromatic' };
  const presets = {
    Warm: ['#432818', '#99582A', '#BB9457', '#FFE6A7', '#6F1D1B'],
    Cool: ['#14213D', '#4361EE', '#4CC9F0', '#EDF6F9', '#3A0CA3'],
    Earth: ['#283618', '#606C38', '#DDA15E', '#FEFAE0', '#BC6C25'],
    Neutral: ['#22223B', '#4A4E69', '#9A8C98', '#F2E9E4', '#C9ADA7']
  };
  const state = { colors: [...presets.Warm], locked: Array(5).fill(false), mode: 'analogous', format: 'hex', history: [], sharedHash: null };
  window.portfolioTools.set('palette', {
    title: 'Color Palettes',
    description: 'Explore, edit, and lock five colors. Preview a palette and export it for your design.',
    getShareState: () => ({ colors: state.colors.map(color => color.slice(1)).join('-'), locks: state.locked.map(value => value ? '1' : '0').join(''), mode: state.mode }),
    render: () => `
      <section class="tool-workspace palette-tool" tabindex="-1" aria-keyshortcuts="Space">
        <p>Keep the colors you like. Generate the rest, or edit any color yourself.</p>
        <div class="tool-form palette-toolbar">
          <label>Color harmony<select name="mode">${Object.entries(modes).map(([value, label]) => `<option value="${value}">${label}</option>`).join('')}</select></label>
          <button class="tool-button tool-button-primary" data-generate>Generate palette</button>
          <button class="tool-button" data-undo>Undo</button>
          <button class="tool-button" data-unlock>Unlock all</button>
        </div>
        <div class="palette-swatches" aria-label="Five palette colors">${Array.from({ length: 5 }, (_, index) => `
          <div class="palette-swatch">
            <label class="palette-color-label"><span class="sr-only">Edit color ${index + 1}</span><input class="palette-color" type="color" data-picker="${index}"></label>
            <div class="palette-caption"><input class="palette-hex" data-hex="${index}" maxlength="7" aria-label="Hex code for color ${index + 1}" spellcheck="false"><div class="palette-color-actions"><button class="palette-lock" type="button" data-lock="${index}" aria-pressed="false">Lock</button><button class="palette-copy" type="button" data-copy="${index}" aria-label="Copy color ${index + 1}">Copy</button></div></div>
          </div>`).join('')}</div>
        <p class="tool-error" role="alert" hidden></p>
        <p class="tool-status" role="status"></p>
        <div class="palette-bottom"><div><p class="tool-eyebrow">Try a starting palette</p><div class="tool-presets">${Object.keys(presets).map(name => `<button class="tool-button" data-preset="${name}">${name}</button>`).join('')}</div></div><button class="tool-button" data-copy-palette>Copy palette</button></div>
        <p class="tool-note">Click a color to edit it; edited colors lock automatically. Space generates when you’re not in a control.</p>
        <details class="tool-details"><summary>Preview this palette</summary><div class="palette-preview"><span class="tool-eyebrow">Your next project</span><strong>A little color goes a long way.</strong><p>A quick look at your colors together.</p><span class="palette-preview-button">Example button</span><div class="palette-preview-strip"></div></div></details>
        <details class="tool-details palette-export"><summary>Export hex codes, CSS, or JSON</summary><div class="tool-form"><label>Export format<select data-format><option value="hex">Hex codes</option><option value="css">CSS variables</option><option value="json">JSON array</option></select></label></div><textarea class="tool-control" readonly rows="5" aria-label="Exported palette"></textarea></details>
      </section>`,
    mount(container) {
      const params = window.readToolState();
      if (window.location.hash !== state.sharedHash) {
        const colors = (params.get('colors') || '').split('-');
        if (colors.length === 5 && colors.every(color => /^[0-9a-f]{6}$/i.test(color))) {
          state.colors = colors.map(color => '#' + color.toUpperCase());
          state.locked = /^[01]{5}$/.test(params.get('locks') || '') ? Array.from(params.get('locks'), char => char === '1') : Array(5).fill(false);
          if (Object.hasOwn(modes, params.get('mode'))) state.mode = params.get('mode');
          state.history = [];
        }
        state.sharedHash = window.location.hash;
      }
      const mode = container.querySelector('[name="mode"]'), format = container.querySelector('[data-format]');
      const swatches = container.querySelector('.palette-swatches'), status = container.querySelector('.tool-status');
      const error = container.querySelector('.tool-error'), output = container.querySelector('textarea');
      const generate = container.querySelector('[data-generate]'), undo = container.querySelector('[data-undo]'), unlock = container.querySelector('[data-unlock]');
      const pickers = [...container.querySelectorAll('[data-picker]')], hexes = [...container.querySelectorAll('[data-hex]')], locks = [...container.querySelectorAll('[data-lock]')];
      function remember() {
        state.history.push({ colors: [...state.colors], locked: [...state.locked], mode: state.mode });
        if (state.history.length > 30) state.history.shift();
      }
      function exportText() {
        if (state.format === 'css') return `:root {\n${state.colors.map((color, index) => `  --color-${index + 1}: ${color};`).join('\n')}\n}`;
        if (state.format === 'json') return JSON.stringify(state.colors, null, 2);
        return state.colors.join(', ');
      }
      function paint() {
        mode.value = state.mode; format.value = state.format;
        state.colors.forEach((color, index) => {
          pickers[index].value = color; hexes[index].value = color;
          locks[index].textContent = state.locked[index] ? 'Locked' : 'Lock';
          locks[index].setAttribute('aria-pressed', String(state.locked[index]));
          locks[index].setAttribute('aria-label', `${state.locked[index] ? 'Unlock' : 'Lock'} color ${index + 1}`);
          hexes[index].removeAttribute('aria-invalid');
        });
        generate.disabled = state.locked.every(Boolean); unlock.disabled = !state.locked.some(Boolean); undo.disabled = !state.history.length;
        output.value = exportText(); error.hidden = true;
        const preview = container.querySelector('.palette-preview');
        preview.style.backgroundColor = state.colors[0]; preview.style.color = window.readableTextColor(state.colors[0]);
        const button = container.querySelector('.palette-preview-button');
        button.style.backgroundColor = state.colors[2]; button.style.color = window.readableTextColor(state.colors[2]);
        container.querySelector('.palette-preview-strip').innerHTML = state.colors.map(color => `<span style="background-color:${color}"></span>`).join('');
      }
      function regenerate() {
        if (generate.disabled) return;
        remember();
        state.colors = window.createPalette(state.colors, state.locked, state.mode);
        paint(); status.textContent = state.locked.some(Boolean) ? 'New palette. Locked colors kept.' : 'New palette generated.';
      }
      function edit(index, value) {
        const color = value.trim().replace(/^#?/, '#').toUpperCase();
        if (!/^#[0-9A-F]{6}$/.test(color)) {
          hexes[index].setAttribute('aria-invalid', 'true'); error.textContent = 'Use a six-digit hex code, such as #FFAB07.'; error.hidden = false; return;
        }
        if (state.colors[index] === color) { paint(); return; }
        remember(); state.colors[index] = color; state.locked[index] = true;
        paint(); status.textContent = `Color ${index + 1} updated and locked.`;
      }
      generate.addEventListener('click', regenerate);
      container.querySelector('.palette-tool').addEventListener('keydown', event => {
        if (event.code !== 'Space' || event.repeat || event.ctrlKey || event.metaKey || event.altKey || event.target.closest('input, textarea, select, button, a, summary, [contenteditable]')) return;
        event.preventDefault(); regenerate();
      });
      mode.addEventListener('change', () => { remember(); state.mode = mode.value; state.colors = window.createPalette(state.colors, state.locked, state.mode); paint(); status.textContent = 'Harmony updated. Locked colors kept.'; });
      pickers.forEach((picker, index) => picker.addEventListener('change', () => edit(index, picker.value)));
      hexes.forEach((hex, index) => {
        hex.addEventListener('change', () => edit(index, hex.value));
        hex.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); edit(index, hex.value); } });
      });
      swatches.addEventListener('click', event => {
        const lock = event.target.closest('[data-lock]');
        if (lock) {
          const index = Number(lock.dataset.lock); remember(); state.locked[index] = !state.locked[index]; paint();
          status.textContent = generate.disabled ? 'All colors locked. Unlock one to generate again.' : `Color ${index + 1} ${state.locked[index] ? 'locked' : 'unlocked'}.`; return;
        }
        const copy = event.target.closest('[data-copy]');
        if (copy) {
          const index = Number(copy.dataset.copy);
          window.copyToolText(state.colors[index], status, hexes[index]);
        }
      });
      undo.addEventListener('click', () => { const previous = state.history.pop(); if (previous) { Object.assign(state, previous); paint(); status.textContent = 'Previous palette restored.'; } });
      unlock.addEventListener('click', () => { remember(); state.locked.fill(false); paint(); status.textContent = 'All colors unlocked.'; });
      container.querySelectorAll('[data-preset]').forEach(button => button.addEventListener('click', () => {
        remember(); state.colors = window.mergePaletteLocks(presets[button.dataset.preset], state.colors, state.locked); paint(); status.textContent = `${button.dataset.preset} palette applied. Locked colors kept.`;
      }));
      format.addEventListener('change', () => { state.format = format.value; output.value = exportText(); });
      container.querySelector('[data-copy-palette]').addEventListener('click', () => window.copyToolText(exportText(), status, output));
      paint();
    }
  });
})();
