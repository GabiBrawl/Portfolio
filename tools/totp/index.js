(function () {
  'use strict';

  const STORAGE_KEY = 'portfolio-totp-pins';
  const state = { label: '', secret: '', algorithm: 'SHA-1', digits: '6', period: '30', sharedHash: null };
  const esc = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));

  window.portfolioTools.set('totp', {
    title: 'TOTP Code Generator',
    description: 'Generate time-based one-time passcodes locally from a Base32 secret or otpauth URI.',
    getShareState: () => ({ algorithm: state.algorithm, digits: state.digits, period: state.period }),
    render: () => `
      <section class="tool-workspace totp-tool">
        <p class="totp-intro">Your authenticators stay in this tab. Codes are generated on your device.</p>
        <form class="tool-form totp-form" novalidate>
          <label>Account<input name="label" type="text" maxlength="64" autocomplete="off" placeholder="e.g. GitHub"></label>
          <label class="totp-secret-label">Base32 secret<span class="totp-secret-input"><span class="totp-secret-field"><input name="secret" type="password" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="Paste setup key" aria-describedby="totp-error"><span class="totp-secret-mask" data-secret-mask aria-hidden="true"></span></span><button class="tool-button" type="button" data-toggle-secret aria-label="Show secret">Show</button></span></label>
          <details class="tool-details totp-options-details"><summary>Advanced settings</summary><div class="totp-options"><label>Algorithm<select name="algorithm"><option>SHA-1</option><option>SHA-256</option><option>SHA-512</option></select></label><label>Digits<select name="digits"><option value="6">6 digits</option><option value="8">8 digits</option></select></label><label>Period<select name="period"><option value="30">30 seconds</option><option value="60">60 seconds</option></select></label></div></details>
          <div class="totp-form-actions"><button class="tool-button tool-button-primary" type="submit">Add authenticator</button><button class="tool-button" type="button" data-import-toggle>Import setup URI</button></div>
          <div class="totp-import" data-import-panel hidden><label>Setup URI<input data-uri type="text" autocomplete="off" spellcheck="false" placeholder="otpauth://totp/…"></label><button class="tool-button" type="button" data-import>Import</button></div>
          <p class="tool-error" data-error role="alert" hidden></p>
          <p class="tool-status" data-status role="status" aria-live="polite"></p>
        </form>
        <section class="totp-dashboard" aria-labelledby="totp-dashboard-title"><div class="totp-dashboard-heading"><div><span class="tool-eyebrow">Quick access</span><h2 id="totp-dashboard-title">Authenticators <span data-count></span></h2></div><div class="totp-vault-actions"><button class="tool-button" type="button" data-export>Export</button><button class="tool-button" type="button" data-import-file>Import</button><input data-file type="file" accept="application/json,.json" hidden><button class="tool-button" type="button" data-clear hidden>Clear all</button></div></div><p class="totp-empty" data-empty>Add an authenticator above to see its live code here.</p><div class="totp-pin-list" data-pins></div></section>
        <dialog class="totp-export-dialog" data-export-dialog aria-labelledby="totp-export-title"><form method="dialog"><h2 id="totp-export-title">Export authenticators?</h2><p>This export is unencrypted and contains your secret keys in plain text. Anyone with the file can generate your codes. Store it securely and delete it when you no longer need it.</p><div class="totp-dialog-actions"><button class="tool-button" value="cancel">Cancel</button><button class="tool-button totp-export-confirm" type="button" data-confirm-export>Export</button></div></form></dialog>
        <input class="sr-only" data-copy-fallback type="text" readonly aria-label="Code to copy">
      </section>`,
    mount(container) {
      const params = window.readToolState();
      if (window.location.hash !== state.sharedHash) { ['algorithm', 'digits', 'period'].forEach(key => { if (params.has(key)) state[key] = params.get(key); }); state.sharedHash = window.location.hash; }
      let pins = [];
      try { const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]'); if (Array.isArray(stored)) pins = stored.filter(pin => pin && typeof pin.secret === 'string' && typeof pin.label === 'string'); } catch { pins = []; }
      const root = container.querySelector('.totp-tool'), form = root.querySelector('.totp-form');
      const { label, secret, algorithm, digits, period } = form.elements;
      const secretMask = root.querySelector('[data-secret-mask]'), list = root.querySelector('[data-pins]'), empty = root.querySelector('[data-empty]');
      const status = root.querySelector('[data-status]'), error = root.querySelector('[data-error]'), fallback = root.querySelector('[data-copy-fallback]');
      const addButton = root.querySelector('[type="submit"]');
      let timer = 0;
      algorithm.value = state.algorithm; digits.value = state.digits; period.value = state.period;
      const save = () => { try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(pins.map(({ label, secret, algorithm, digits, period }) => ({ label, secret, algorithm, digits, period })))); } catch { status.textContent = 'Could not save to this tab. Check browser storage settings.'; } };
      const updateMask = () => { secretMask.textContent = secret.type === 'password' ? '•'.repeat(secret.value.length) : ''; };
      const remain = seconds => seconds - Math.floor(Date.now() / 1000) % seconds;
      function render() {
        list.innerHTML = pins.map((pin, index) => `<article class="totp-row" data-index="${index}" data-revealed="false"><div class="totp-row-name"><strong>${esc(pin.label)}</strong><span>${pin.algorithm} · ${pin.digits} digits</span></div><div class="totp-row-code" data-code aria-label="${esc(pin.label)} code is hidden">${'•'.repeat(Number(pin.digits))}</div><div class="totp-row-timer"><span data-remaining></span><span class="totp-row-progress"><span data-progress></span></span></div><div class="totp-row-actions"><button type="button" class="tool-button" data-reveal>Reveal</button><button type="button" class="tool-button" data-copy>Copy</button><button type="button" class="tool-button" data-remove>Remove</button></div></article>`).join('');
        empty.hidden = pins.length > 0; root.querySelector('[data-clear]').hidden = pins.length === 0; root.querySelector('[data-count]').textContent = pins.length ? `(${pins.length})` : '';
      }
      async function refresh() {
        const now = Date.now();
        await Promise.all(pins.map(async (pin, index) => {
          const periodValue = Number(pin.period), counter = Math.floor(now / 1000 / periodValue);
          if (pin.counter !== counter) { pin.counter = counter; pin.code = await window.generateTOTP(pin.secret, pin, now); }
          const row = list.querySelector(`[data-index="${index}"]`); if (!row) return;
          const seconds = remain(periodValue); row.querySelector('[data-remaining]').textContent = `New code in ${seconds}s`; row.querySelector('[data-progress]').style.width = `${seconds / periodValue * 100}%`;
          const code = row.querySelector('[data-code]');
          if (row.dataset.revealed === 'true' && code.dataset.counter !== String(counter)) {
            code.dataset.counter = String(counter);
            code.replaceChildren(...Array.from(pin.code, (digit, digitIndex) => { const span = document.createElement('span'); span.className = 'totp-digit'; span.style.setProperty('--digit-index', digitIndex); span.textContent = digit; return span; }));
            code.setAttribute('aria-label', `${pin.label} code ${pin.code}`);
          }
        }));
      }
      function reveal(row, show) {
        const pin = pins[Number(row.dataset.index)]; row.dataset.revealed = String(show);
        const code = row.querySelector('[data-code]'), button = row.querySelector('[data-reveal]');
        if (show) { code.textContent = pin.code || '••••••'; code.dataset.counter = String(pin.counter); code.setAttribute('aria-label', `${pin.label} code ${pin.code || ''}`); }
        else { code.textContent = '•'.repeat(Number(pin.digits)); code.dataset.counter = ''; code.setAttribute('aria-label', `${pin.label} code is hidden`); }
        button.textContent = show ? 'Hide' : 'Reveal';
      }
      form.addEventListener('submit', async event => {
        event.preventDefault(); error.hidden = true; status.textContent = '';
        try {
          const cleanSecret = window.normalizeSecret(secret.value); window.validateSettings({ algorithm: algorithm.value, digits: digits.value, period: period.value });
          const cleanLabel = label.value.trim() || `Authenticator ${pins.length + 1}`;
          if (pins.some(pin => pin.secret === cleanSecret && pin.algorithm === algorithm.value && pin.digits === digits.value && pin.period === period.value)) throw new Error('That authenticator is already in your list.');
          pins.push({ label: cleanLabel, secret: cleanSecret, algorithm: algorithm.value, digits: digits.value, period: period.value, counter: null, code: '' });
          save(); render(); await refresh(); status.textContent = ''; addButton.textContent = 'Added!'; addButton.classList.add('copied'); setTimeout(() => { if (addButton.isConnected) { addButton.textContent = 'Add authenticator'; addButton.classList.remove('copied'); } }, 2000); label.value = ''; secret.value = ''; updateMask();
          if (!timer) timer = window.setInterval(refresh, 1000);
        } catch (exception) { error.textContent = exception.message; error.hidden = false; }
      });
      secret.addEventListener('input', updateMask);
      root.querySelector('[data-toggle-secret]').addEventListener('click', event => { const show = secret.type === 'password'; secret.type = show ? 'text' : 'password'; event.currentTarget.textContent = show ? 'Hide' : 'Show'; event.currentTarget.setAttribute('aria-label', `${show ? 'Hide' : 'Show'} secret`); updateMask(); });
      root.querySelector('[data-import-toggle]').addEventListener('click', () => { const panel = root.querySelector('[data-import-panel]'); panel.hidden = !panel.hidden; });
      root.querySelector('[data-import]').addEventListener('click', () => { try { const imported = window.parseOtpauth(root.querySelector('[data-uri]').value); secret.value = imported.secret; label.value = imported.issuer || imported.label; algorithm.value = imported.algorithm; digits.value = String(imported.digits); period.value = String(imported.period); state.algorithm = algorithm.value; updateMask(); root.querySelector('[data-import-panel]').hidden = true; status.textContent = 'Setup imported. Add authenticator to save it for this tab.'; } catch (exception) { error.textContent = exception.message; error.hidden = false; } });
      list.addEventListener('click', event => { const row = event.target.closest('.totp-row'); if (!row) return; const pin = pins[Number(row.dataset.index)]; if (event.target.closest('[data-reveal]')) reveal(row, row.dataset.revealed !== 'true'); if (event.target.closest('[data-copy]')) window.copyToolText(pin.code || '', status, fallback); if (event.target.closest('[data-remove]')) { pins.splice(Number(row.dataset.index), 1); save(); render(); } });
      root.querySelector('[data-clear]').addEventListener('click', () => { pins = []; save(); render(); status.textContent = 'Authenticators cleared.'; });
      const exportDialog = root.querySelector('[data-export-dialog]');
      root.querySelector('[data-export]').addEventListener('click', () => { if (!pins.length) { status.textContent = 'Add an authenticator before exporting.'; return; } exportDialog.showModal(); });
      root.querySelector('[data-confirm-export]').addEventListener('click', () => {
        const payload = { format: 'portfolio-totp-export', version: 1, authenticators: pins.map(({ label, secret, algorithm, digits, period }) => ({ label, secret, algorithm, digits: Number(digits), period: Number(period) })) };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const link = document.createElement('a');
        link.href = url; link.download = `totp-authenticators-${new Date().toISOString().slice(0, 10)}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); exportDialog.close(); status.textContent = 'Export downloaded.';
      });
      root.querySelector('[data-import-file]').addEventListener('click', () => root.querySelector('[data-file]').click());
      root.querySelector('[data-file]').addEventListener('change', async event => {
        const file = event.target.files[0]; event.target.value = ''; if (!file) return;
        try {
          if (file.size > 1024 * 1024) throw new Error('Choose an export file smaller than 1 MB.');
          const data = JSON.parse(await file.text());
          if (data?.format !== 'portfolio-totp-export' || data.version !== 1 || !Array.isArray(data.authenticators)) throw new Error('This file is not a supported TOTP export.');
          if (!data.authenticators.length || data.authenticators.length > 100) throw new Error('The export must contain between 1 and 100 authenticators.');
          const imported = data.authenticators.map((entry, index) => {
            const cleanSecret = window.normalizeSecret(entry.secret); const config = window.validateSettings(entry);
            if (typeof entry.label !== 'string') throw new Error(`Authenticator ${index + 1} has no valid label.`);
            return { label: entry.label.slice(0, 64) || `Authenticator ${index + 1}`, secret: cleanSecret, algorithm: config.algorithm, digits: String(config.digits), period: String(config.period), counter: null, code: '' };
          });
          const unique = imported.filter(entry => !pins.some(pin => pin.secret === entry.secret && pin.algorithm === entry.algorithm && pin.digits === entry.digits && pin.period === entry.period));
          if (!unique.length) throw new Error('All authenticators in this file are already imported.');
          pins.push(...unique); save(); render(); await refresh(); if (!timer) timer = window.setInterval(refresh, 1000); status.textContent = `Imported ${unique.length} authenticator${unique.length === 1 ? '' : 's'}.`;
        } catch (exception) { error.textContent = exception.message || 'Could not read this export file.'; error.hidden = false; }
      });
      render(); if (pins.length) { refresh(); timer = window.setInterval(refresh, 1000); }
      window.activeToolCleanup = () => { clearInterval(timer); window.activeToolCleanup = null; };
    }
  });
})();
