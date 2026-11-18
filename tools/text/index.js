(function () {
  'use strict';
  const groups = ['All styles', 'Gothic', 'Classic', 'Script', 'Clean', 'Playful'];
  const state = { text: 'GabiBrawl', group: 'All styles', sharedHash: null };
  window.portfolioTools.set('text', {
    title: 'Text Styles',
    description: 'Compare 18 copyable styles, from gothic and script to bold and monospace.',
    getShareState: () => ({ text: state.text, group: state.group }),
    render: () => `
      <section class="tool-workspace text-tool">
        <p>Type once. Compare styles below, then copy your favorite.</p>
        <label class="tool-label text-source">Your text<textarea class="tool-control" data-input maxlength="2000" rows="2" placeholder="Write a name, bio, or short message…" spellcheck="false" aria-describedby="text-input-help text-count"></textarea></label>
        <div class="text-input-meta"><span id="text-count" data-count></span><button type="button" class="tool-text-button" data-clear disabled>Clear</button></div>
        <p id="text-input-help" class="tool-note">Up to 2,000 characters. Previews update as you type.</p>
        <div class="text-style-toolbar">
          <div class="tool-filters" role="group" aria-label="Filter text styles">${groups.map((group, index) => {
            const count = index === 0 ? window.textStyles.length : window.textStyles.filter(style => style.group === group).length;
            return `<button class="tool-button" type="button" data-group="${index}" aria-pressed="false">${group}<span class="text-filter-count">${count}</span></button>`;
          }).join('')}</div>
          <button class="tool-button text-copy-visible" type="button" data-copy-visible disabled>Copy visible styles</button>
        </div>
        <p class="text-visible-count" data-visible-count aria-live="polite"></p>
        <p class="tool-status" role="status"></p>
        <div class="text-previews">${window.textStyles.map(style => `
          <article class="text-preview" data-style="${style.id}" data-category="${style.group}">
            <div class="text-preview-heading"><h3>${style.name}</h3><button class="tool-button" type="button" data-copy="${style.id}">Copy</button></div>
            <textarea class="text-preview-output" data-output="${style.id}" readonly rows="2" aria-label="${style.name} output"></textarea>
          </article>`).join('')}</div>
        <details class="tool-details text-copy-fallback"><summary>Plain text for visible styles</summary><textarea class="tool-control" data-copy-all-fallback readonly rows="8" aria-label="Visible styles as plain text"></textarea></details>
        <p class="tool-note">Decorative Unicode text works in many apps. Some styles leave digits unchanged; accented letters and emoji are preserved. Use plain text when readability or screen-reader support matters.</p>
      </section>`,
    mount(container) {
      const params = window.readToolState();
      if (window.location.hash !== state.sharedHash) {
        if (params.has('text')) state.text = params.get('text').slice(0, 2000);
        if (groups.includes(params.get('group'))) state.group = params.get('group');
        state.sharedHash = window.location.hash;
      }
      const input = container.querySelector('[data-input]'), count = container.querySelector('[data-count]');
      const status = container.querySelector('.tool-status'), clear = container.querySelector('[data-clear]');
      const visibleCount = container.querySelector('[data-visible-count]');
      const copyVisible = container.querySelector('[data-copy-visible]');
      const copyFallback = container.querySelector('[data-copy-all-fallback]');
      input.value = state.text;
      function update() {
        state.text = input.value;
        count.textContent = `${Array.from(input.value).length.toLocaleString()} characters`;
        clear.disabled = !input.value;
        status.textContent = '';
        let shown = 0;
        container.querySelectorAll('[data-style]').forEach(row => {
          const output = row.querySelector('textarea');
          output.value = window.generateStyledText(input.value, row.dataset.style);
          output.placeholder = 'Your text appears here';
          row.querySelector('button').disabled = !input.value;
          row.hidden = state.group !== 'All styles' && row.dataset.category !== state.group;
          if (!row.hidden) shown++;
        });
        container.querySelectorAll('[data-group]').forEach(button => button.setAttribute('aria-pressed', String(groups[Number(button.dataset.group)] === state.group)));
        visibleCount.textContent = `Showing ${shown} ${shown === 1 ? 'style' : 'styles'}`;
        copyVisible.disabled = !input.value || shown === 0;
      }
      input.addEventListener('input', update);
      clear.addEventListener('click', () => { input.value = ''; update(); input.focus(); });
      container.querySelector('.tool-filters').addEventListener('click', event => {
        const button = event.target.closest('[data-group]');
        if (button) { state.group = groups[Number(button.dataset.group)]; update(); }
      });
      container.querySelector('.text-previews').addEventListener('click', event => {
        const button = event.target.closest('[data-copy]');
        if (!button) return;
        const output = button.closest('.text-preview').querySelector('textarea');
        window.copyToolText(output.value, status, output);
      });
      copyVisible.addEventListener('click', () => {
        const rows = [...container.querySelectorAll('.text-preview:not([hidden])')];
        copyFallback.value = rows.map(row => `${row.querySelector('h3').textContent}: ${row.querySelector('textarea').value}`).join('\n');
        window.copyToolText(copyFallback.value, status, copyFallback);
      });
      update();
    }
  });
})();
