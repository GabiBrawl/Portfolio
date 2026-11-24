(function () {
  'use strict';

  const state = { secret: '', algorithm: 'SHA-1', digits: '6', period: '30', label: '', sharedHash: null };

  window.portfolioTools.set('totp', {
    title: 'TOTP Code Generator',
    description: 'Generate time-based one-time passcodes locally from a Base32 secret or otpauth URI.',
    // Secrets never appear in shared URLs.
    getShareState: () => ({ algorithm: state.algorithm, digits: state.digits, period: state.period }),
    render: () => `
      <section class="tool-workspace totp-tool">
        <p>Generate authentication codes entirely in your browser. Your secret is never uploaded, saved, or included in a share link.</p>
        <form class="tool-form totp-form" novalidate>
          <label class="totp-secret-label">Base32 secret
            <div class="totp-secret-input"><input name="secret" type="password" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="e.g. JBSWY3DPEHPK3PXP" aria-describedby="totp-secret-help totp-error"><button class="tool-button" type="button" data-toggle-secret aria-label="Show secret">Show</button></div>
          </label>
          <div class="totp-options">
            <label>Algorithm<select name="algorithm"><option>SHA-1</option><option>SHA-256</option><option>SHA-512</option></select></label>
            <label>Digits<select name="digits"><option value="6">6 digits</option><option value="8">8 digits</option></select></label>
            <label>Period<select name="period"><option value="30">30 seconds</option><option value="60">60 seconds</option></select></label>
          </div>
          <button class="tool-button tool-button-primary" type="submit">Generate code</button>
        </form>
        <p id="totp-secret-help" class="tool-note">Spaces and hyphens are accepted. You can also import a standard setup URI below.</p>
        <p id="totp-error" class="tool-error" role="alert" hidden></p>
        <section class="totp-code-card" aria-live="polite" aria-atomic="true" hidden>
          <div class="totp-code-heading"><span class="tool-eyebrow">Current code</span><span data-countdown></span></div>
          <input class="totp-code" data-code type="text" readonly aria-label="Current one-time code">
          <div class="totp-progress" aria-hidden="true"><span data-progress></span></div>
          <div class="tool-actions"><button class="tool-button" type="button" data-copy-code>Copy code</button><span class="tool-status" data-status role="status"></span></div>
        </section>
        <details class="tool-details totp-import"><summary>Import an otpauth URI</summary>
          <p class="tool-note">Paste the <code>otpauth://totp/…</code> value from an authenticator QR code or setup page.</p>
          <div class="tool-form"><label>Setup URI<input data-uri type="text" autocomplete="off" spellcheck="false" placeholder="otpauth://totp/Example:me?secret=..."></label><button class="tool-button" type="button" data-import>Import</button></div>
          <p class="tool-status" data-import-status role="status"></p>
        </details>
      </section>`,
    mount(container) {
      const params = window.readToolState();
      if (window.location.hash !== state.sharedHash) {
        ['algorithm', 'digits', 'period'].forEach(key => { if (params.has(key)) state[key] = params.get(key); });
        state.sharedHash = window.location.hash;
      }
      const root = container.querySelector('.totp-tool');
      const form = root.querySelector('.totp-form');
      const { secret, algorithm, digits, period } = form.elements;
      const error = root.querySelector('#totp-error');
      const card = root.querySelector('.totp-code-card');
      const code = root.querySelector('[data-code]');
      const countdown = root.querySelector('[data-countdown]');
      const progress = root.querySelector('[data-progress]');
      const status = root.querySelector('[data-status]');
      let timer = 0;
      let lastCounter = null;
      let request = 0;

      secret.value = state.secret; algorithm.value = state.algorithm; digits.value = state.digits; period.value = state.period;
      function settings() { return { algorithm: algorithm.value, digits: digits.value, period: period.value }; }
      function stop() { clearInterval(timer); timer = 0; lastCounter = null; }
      async function updateCode() {
        if (!state.secret) return;
        const activeRequest = ++request;
        const now = Date.now();
        const seconds = Number(period.value);
        const currentCounter = Math.floor(now / 1000 / seconds);
        const remaining = seconds - (Math.floor(now / 1000) % seconds);
        countdown.textContent = `Refreshes in ${remaining}s`;
        progress.style.width = `${(remaining / seconds) * 100}%`;
        if (currentCounter === lastCounter) return;
        try {
          const value = await window.generateTOTP(state.secret, settings(), now);
          if (activeRequest !== request) return;
          code.value = value; card.hidden = false; lastCounter = currentCounter; error.hidden = true;
        } catch (exception) { if (activeRequest === request) showError(exception.message); }
      }
      function showError(message) { stop(); card.hidden = true; error.textContent = message; error.hidden = false; secret.setAttribute('aria-invalid', 'true'); }
      function generate(focusError = true) {
        stop(); state.secret = secret.value;
        state.algorithm = algorithm.value; state.digits = digits.value; state.period = period.value;
        secret.removeAttribute('aria-invalid'); status.textContent = '';
        try { window.normalizeSecret(state.secret); window.validateSettings(settings()); }
        catch (exception) { if (focusError) secret.focus(); return showError(exception.message); }
        updateCode(); timer = window.setInterval(updateCode, 250);
      }
      form.addEventListener('submit', event => { event.preventDefault(); generate(); });
      root.querySelector('[data-toggle-secret]').addEventListener('click', event => {
        const hidden = secret.type === 'password'; secret.type = hidden ? 'text' : 'password';
        event.currentTarget.textContent = hidden ? 'Hide' : 'Show'; event.currentTarget.setAttribute('aria-label', `${hidden ? 'Hide' : 'Show'} secret`);
      });
      root.querySelector('[data-copy-code]').addEventListener('click', () => window.copyToolText(code.value, status, code));
      root.querySelector('[data-import]').addEventListener('click', () => {
        const importStatus = root.querySelector('[data-import-status]');
        try {
          const imported = window.parseOtpauth(root.querySelector('[data-uri]').value);
          secret.value = imported.secret; algorithm.value = imported.algorithm; digits.value = String(imported.digits); period.value = String(imported.period);
          importStatus.textContent = `Imported${imported.label ? ` ${imported.label}` : ''}. Generate the current code.`;
          generate(false);
        } catch (exception) { importStatus.textContent = exception.message; }
      });
      window.activeToolCleanup = () => { stop(); window.activeToolCleanup = null; };
    }
  });
})();
