(function () {
  'use strict';

  const state = { secret: '', algorithm: 'SHA-1', digits: '6', period: '30', label: '', pins: [], nextPinId: 1, sharedHash: null };
  const escapeHTML = value => String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));

  window.portfolioTools.set('totp', {
    title: 'TOTP Code Generator',
    description: 'Generate time-based one-time passcodes locally from a Base32 secret or otpauth URI.',
    getShareState: () => ({ algorithm: state.algorithm, digits: state.digits, period: state.period }),
    render: () => `
      <section class="tool-workspace totp-tool">
        <div class="totp-intro"><p>Generate authentication codes entirely in your browser.</p><p class="tool-note">Secrets are never uploaded or included in shared links. Pinned authenticators stay in this tab only.</p></div>
        <div class="totp-layout">
          <section class="totp-editor" aria-labelledby="totp-setup-title">
            <div class="totp-section-heading"><span class="tool-eyebrow">Setup</span><h2 id="totp-setup-title">Add an authenticator</h2></div>
            <form class="tool-form totp-form" novalidate>
              <label>Account label<input name="label" type="text" maxlength="64" autocomplete="off" placeholder="e.g. GitHub — gabi"></label>
              <label class="totp-secret-label">Base32 secret
                <span class="totp-secret-input"><span class="totp-secret-field"><input name="secret" type="password" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="e.g. JBSWY3DPEHPK3PXP" aria-describedby="totp-secret-help totp-error"><span class="totp-secret-mask" data-secret-mask aria-hidden="true"></span></span><button class="tool-button" type="button" data-toggle-secret aria-label="Show secret">Show</button></span>
              </label>
              <div class="totp-options">
                <label>Algorithm<select name="algorithm"><option>SHA-1</option><option>SHA-256</option><option>SHA-512</option></select></label>
                <label>Digits<select name="digits"><option value="6">6 digits</option><option value="8">8 digits</option></select></label>
                <label>Period<select name="period"><option value="30">30 seconds</option><option value="60">60 seconds</option></select></label>
              </div>
              <div class="totp-form-actions"><button class="tool-button tool-button-primary" type="submit">Generate code</button><button class="tool-button" type="button" data-pin-current disabled>Pin to dashboard</button></div>
            </form>
            <p id="totp-secret-help" class="tool-note">Spaces and hyphens are accepted. Use a label to keep pinned codes recognizable.</p>
            <p id="totp-error" class="tool-error" role="alert" hidden></p>
            <details class="tool-details totp-import"><summary>Import an otpauth URI</summary>
              <p class="tool-note">Paste the <code>otpauth://totp/…</code> value from an authenticator QR code or setup page.</p>
              <div class="tool-form"><label>Setup URI<input data-uri type="text" autocomplete="off" spellcheck="false" placeholder="otpauth://totp/Example:me?secret=..."></label><button class="tool-button" type="button" data-import>Import</button></div>
              <p class="tool-status" data-import-status role="status"></p>
            </details>
          </section>
          <section class="totp-code-card" aria-live="polite" aria-atomic="true" hidden>
            <div class="totp-code-heading"><span><span class="tool-eyebrow">Live preview</span>Current code</span><span data-countdown></span></div>
            <div class="totp-code" data-code-display aria-hidden="true"></div>
            <input class="sr-only" data-code type="text" readonly aria-label="Current one-time code">
            <div class="totp-progress" aria-hidden="true"><span data-progress></span></div>
            <div class="totp-code-actions"><button class="tool-button" type="button" data-copy-code>Copy code</button><span class="tool-status" data-status role="status"></span></div>
          </section>
        </div>
        <section class="totp-dashboard" aria-labelledby="totp-dashboard-title">
          <div class="totp-dashboard-heading"><div><span class="tool-eyebrow">Quick check</span><h2 id="totp-dashboard-title">Pinned authenticators</h2></div><button class="tool-button" type="button" data-clear-pins hidden>Clear all</button></div>
          <p class="tool-note">Codes are masked by default. Hover, focus, or tap Reveal to check one; they are cleared when this tab closes.</p>
          <div class="totp-pin-list" data-pins></div>
          <p class="totp-empty" data-empty>No pinned authenticators yet. Generate a code, then pin it for quick checking.</p>
        </section>
      </section>`,
    mount(container) {
      const params = window.readToolState();
      if (window.location.hash !== state.sharedHash) {
        ['algorithm', 'digits', 'period'].forEach(key => { if (params.has(key)) state[key] = params.get(key); });
        state.sharedHash = window.location.hash;
      }
      const root = container.querySelector('.totp-tool');
      const form = root.querySelector('.totp-form');
      const { label, secret, algorithm, digits, period } = form.elements;
      const error = root.querySelector('#totp-error'), card = root.querySelector('.totp-code-card');
      const code = root.querySelector('[data-code]'), codeDisplay = root.querySelector('[data-code-display]');
      const secretMask = root.querySelector('[data-secret-mask]'), countdown = root.querySelector('[data-countdown]'), progress = root.querySelector('[data-progress]'), status = root.querySelector('[data-status]');
      const pinButton = root.querySelector('[data-pin-current]'), pins = root.querySelector('[data-pins]'), empty = root.querySelector('[data-empty]'), clearPins = root.querySelector('[data-clear-pins]');
      let timer = 0, lastCounter = null, request = 0;
      label.value = state.label; secret.value = state.secret; algorithm.value = state.algorithm; digits.value = state.digits; period.value = state.period;
      const settings = () => ({ algorithm: algorithm.value, digits: digits.value, period: period.value });
      const secondsRemaining = seconds => seconds - (Math.floor(Date.now() / 1000) % seconds);
      const updateSecretMask = () => { secretMask.textContent = secret.type === 'password' ? '•'.repeat(secret.value.length) : ''; };
      function renderCode(value) {
        code.value = value;
        codeDisplay.replaceChildren(...Array.from(value, (digit, index) => { const character = document.createElement('span'); character.className = 'totp-code-digit'; character.style.setProperty('--digit-index', index); character.textContent = digit; return character; }));
      }
      function renderPins() {
        pins.innerHTML = state.pins.map(pin => `<article class="totp-pin" data-pin-id="${pin.id}" data-revealed="false"><div class="totp-pin-heading"><strong>${escapeHTML(pin.label)}</strong><button class="totp-icon-button" type="button" data-remove-pin aria-label="Remove ${escapeHTML(pin.label)}">×</button></div><output class="totp-pin-code" data-pin-code aria-label="${escapeHTML(pin.label)} code is hidden">${'•'.repeat(Number(pin.digits))}</output><div class="totp-pin-meta"><span data-pin-countdown>Refreshes in ${secondsRemaining(Number(pin.period))}s</span><span class="totp-pin-progress" aria-hidden="true"><span data-pin-progress style="width:${(secondsRemaining(Number(pin.period)) / Number(pin.period)) * 100}%"></span></span></div><div class="totp-pin-actions"><button class="tool-button" type="button" data-reveal-pin>Reveal</button><button class="tool-button" type="button" data-copy-pin>Copy</button></div></article>`).join('');
        empty.hidden = state.pins.length > 0; clearPins.hidden = state.pins.length === 0;
      }
      function setPinRevealed(cardElement, revealed) {
        const pin = state.pins.find(item => String(item.id) === cardElement.dataset.pinId); if (!pin) return;
        cardElement.dataset.revealed = String(revealed); cardElement.querySelector('[data-pin-code]').textContent = revealed ? pin.code : '•'.repeat(Number(pin.digits)); cardElement.querySelector('[data-reveal-pin]').textContent = revealed ? 'Hide' : 'Reveal';
        cardElement.querySelector('[data-pin-code]').setAttribute('aria-label', revealed ? `${pin.label} code ${pin.code}` : `${pin.label} code is hidden`);
      }
      async function updatePins() {
        const changed = [];
        await Promise.all(state.pins.map(async pin => { const counter = Math.floor(Date.now() / 1000 / Number(pin.period)); if (counter !== pin.lastCounter) { pin.code = await window.generateTOTP(pin.secret, pin, Date.now()); pin.lastCounter = counter; changed.push(pin); } }));
        if (changed.length) renderPins();
        root.querySelectorAll('.totp-pin').forEach(pinElement => { const pin = state.pins.find(item => String(item.id) === pinElement.dataset.pinId); const remaining = secondsRemaining(Number(pin.period)); pinElement.querySelector('[data-pin-countdown]').textContent = `Refreshes in ${remaining}s`; pinElement.querySelector('[data-pin-progress]').style.width = `${(remaining / Number(pin.period)) * 100}%`; });
      }
      async function updateCodes() {
        const now = Date.now();
        if (state.secret) {
          const seconds = Number(period.value), currentCounter = Math.floor(now / 1000 / seconds), remaining = secondsRemaining(seconds);
          countdown.textContent = `Refreshes in ${remaining}s`; progress.style.width = `${(remaining / seconds) * 100}%`;
          if (currentCounter !== lastCounter) { const activeRequest = ++request; try { const value = await window.generateTOTP(state.secret, settings(), now); if (activeRequest === request) { renderCode(value); card.hidden = false; lastCounter = currentCounter; error.hidden = true; } } catch (exception) { if (activeRequest === request) showError(exception.message); } }
        }
        try { await updatePins(); } catch (exception) { console.warn('Could not refresh a pinned TOTP code.', exception); }
      }
      function stop() { clearInterval(timer); timer = 0; lastCounter = null; }
      function showError(message) { card.hidden = true; pinButton.disabled = true; error.textContent = message; error.hidden = false; secret.setAttribute('aria-invalid', 'true'); }
      function generate(focusError = true) {
        stop(); state.secret = secret.value; state.label = label.value.trim(); state.algorithm = algorithm.value; state.digits = digits.value; state.period = period.value; secret.removeAttribute('aria-invalid'); status.textContent = '';
        try { window.normalizeSecret(state.secret); window.validateSettings(settings()); } catch (exception) { if (focusError) secret.focus(); return showError(exception.message); }
        pinButton.disabled = false; updateCodes(); timer = window.setInterval(updateCodes, 250);
      }
      function pinCurrent() {
        if (!state.secret) return;
        const existing = state.pins.find(pin => pin.secret === state.secret && pin.algorithm === state.algorithm && pin.digits === state.digits && pin.period === state.period);
        if (existing) { existing.label = state.label || existing.label; renderPins(); status.textContent = 'That authenticator is already pinned.'; return; }
        state.pins.push({ id: state.nextPinId++, label: state.label || `Authenticator ${state.nextPinId - 1}`, secret: state.secret, algorithm: state.algorithm, digits: state.digits, period: state.period, code: '', lastCounter: null }); renderPins(); updateCodes(); status.textContent = 'Pinned for this tab.';
      }
      updateSecretMask(); renderPins(); if (state.pins.length) { timer = window.setInterval(updateCodes, 250); updateCodes(); }
      form.addEventListener('submit', event => { event.preventDefault(); generate(); });
      secret.addEventListener('input', updateSecretMask);
      root.querySelector('[data-toggle-secret]').addEventListener('click', event => { const hidden = secret.type === 'password'; secret.type = hidden ? 'text' : 'password'; event.currentTarget.textContent = hidden ? 'Hide' : 'Show'; event.currentTarget.setAttribute('aria-label', `${hidden ? 'Hide' : 'Show'} secret`); updateSecretMask(); });
      pinButton.addEventListener('click', pinCurrent); root.querySelector('[data-copy-code]').addEventListener('click', () => window.copyToolText(code.value, status, code));
      clearPins.addEventListener('click', () => { state.pins = []; renderPins(); });
      pins.addEventListener('pointerover', event => { const pin = event.target.closest('.totp-pin'); if (pin && !pin.contains(event.relatedTarget)) setPinRevealed(pin, true); });
      pins.addEventListener('pointerout', event => { const pin = event.target.closest('.totp-pin'); if (pin && !pin.contains(event.relatedTarget)) setPinRevealed(pin, false); });
      pins.addEventListener('focusin', event => { const pin = event.target.closest('.totp-pin'); if (pin) setPinRevealed(pin, true); });
      pins.addEventListener('focusout', event => { const pin = event.target.closest('.totp-pin'); if (pin && !pin.contains(event.relatedTarget)) setPinRevealed(pin, false); });
      pins.addEventListener('click', event => { const pin = event.target.closest('.totp-pin'); if (!pin) return; if (event.target.closest('[data-remove-pin]')) { state.pins = state.pins.filter(item => String(item.id) !== pin.dataset.pinId); renderPins(); return; } if (event.target.closest('[data-reveal-pin]')) setPinRevealed(pin, pin.dataset.revealed !== 'true'); if (event.target.closest('[data-copy-pin]')) { const entry = state.pins.find(item => String(item.id) === pin.dataset.pinId); window.copyToolText(entry.code, status, code); } });
      root.querySelector('[data-import]').addEventListener('click', () => { const importStatus = root.querySelector('[data-import-status]'); try { const imported = window.parseOtpauth(root.querySelector('[data-uri]').value); secret.value = imported.secret; label.value = imported.issuer || imported.label; algorithm.value = imported.algorithm; digits.value = String(imported.digits); period.value = String(imported.period); updateSecretMask(); importStatus.textContent = 'Imported. Generate it or pin it to your dashboard.'; generate(false); } catch (exception) { importStatus.textContent = exception.message; } });
      window.activeToolCleanup = () => { stop(); window.activeToolCleanup = null; };
    }
  });
})();
