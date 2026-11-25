(function () {
  'use strict';

  const ECC_LEVELS = {
    L: qrcodegen.QrCode.Ecc.LOW,
    M: qrcodegen.QrCode.Ecc.MEDIUM,
    Q: qrcodegen.QrCode.Ecc.QUARTILE,
    H: qrcodegen.QrCode.Ecc.HIGH
  };
  const QUIET_ZONE = 4;
  const PIXELS_PER_MODULE = 8;

  window.portfolioTools.set('qr-generator', {
    title: 'QR Generator',
    description: 'Make QR codes for links, Wi-Fi, contacts, email, phone, messages, and locations.',
    render: () => `
      <section class="tool-workspace qrg-tool">
        <p class="qrg-intro">Create a QR code for a link, Wi-Fi network, contact, and more. Everything stays on this device.</p>
        <div class="qrg-layout">
          <section class="qrg-input-panel" aria-label="QR code settings">
            <label class="tool-label qrg-type-label">Content type
              <select class="tool-control" data-type>
                <option value="text">Text or link</option>
                <option value="wifi">Wi-Fi network</option>
                <option value="email">Email</option>
                <option value="phone">Phone call</option>
                <option value="sms">Text message</option>
                <option value="contact">Contact card</option>
                <option value="location">Map location</option>
              </select>
            </label>
            <div class="qrg-fields" data-fields="text">
              <label class="tool-label" for="qrg-content">Text or link
                <textarea class="tool-control qrg-content" id="qrg-content" data-field="text" rows="5" placeholder="https://example.com" spellcheck="false" autocomplete="off" aria-describedby="qrg-help"></textarea>
              </label>
            </div>
            <div class="qrg-fields" data-fields="wifi" hidden>
              <label class="tool-label">Network name (SSID)<input class="tool-control" data-field="ssid" type="text" autocomplete="off" spellcheck="false" placeholder="Your Wi-Fi name"></label>
              <label class="tool-label">Security
                <select class="tool-control" data-field="security"><option value="WPA">WPA / WPA2 / WPA3</option><option value="WEP">WEP</option><option value="nopass">Open network</option></select>
              </label>
              <label class="tool-label qrg-password-field" data-password-field>Password
                <span class="qrg-password-control"><input class="tool-control" data-field="password" type="password" autocomplete="new-password"><button class="tool-button" type="button" data-reveal-password aria-pressed="false">Show</button></span>
              </label>
              <label class="qrg-checkbox-label"><input type="checkbox" data-field="hidden-network"> This network is hidden</label>
            </div>
            <div class="qrg-fields" data-fields="email" hidden>
              <label class="tool-label">To<input class="tool-control" data-field="email-to" type="email" autocomplete="email" placeholder="name@example.com"></label>
              <label class="tool-label">Subject<input class="tool-control" data-field="email-subject" type="text" placeholder="Optional"></label>
              <label class="tool-label">Message<textarea class="tool-control" data-field="email-body" rows="3" placeholder="Optional"></textarea></label>
            </div>
            <div class="qrg-fields" data-fields="phone" hidden>
              <label class="tool-label">Phone number<input class="tool-control" data-field="phone" type="tel" autocomplete="tel" inputmode="tel" placeholder="+1 555 123 4567"></label>
            </div>
            <div class="qrg-fields" data-fields="sms" hidden>
              <label class="tool-label">Phone number<input class="tool-control" data-field="sms-phone" type="tel" autocomplete="tel" inputmode="tel" placeholder="+1 555 123 4567"></label>
              <label class="tool-label">Message<textarea class="tool-control" data-field="sms-body" rows="3" placeholder="Optional message"></textarea></label>
            </div>
            <div class="qrg-fields qrg-contact-fields" data-fields="contact" hidden>
              <label class="tool-label">First name<input class="tool-control" data-field="first-name" autocomplete="given-name"></label>
              <label class="tool-label">Last name<input class="tool-control" data-field="last-name" autocomplete="family-name"></label>
              <label class="tool-label">Organization<input class="tool-control" data-field="organization" autocomplete="organization" placeholder="Optional"></label>
              <label class="tool-label">Phone<input class="tool-control" data-field="contact-phone" type="tel" autocomplete="tel" placeholder="Optional"></label>
              <label class="tool-label">Email<input class="tool-control" data-field="contact-email" type="email" autocomplete="email" placeholder="Optional"></label>
              <label class="tool-label">Website<input class="tool-control" data-field="website" type="url" inputmode="url" placeholder="Optional"></label>
            </div>
            <div class="qrg-fields qrg-location-fields" data-fields="location" hidden>
              <label class="tool-label">Latitude<input class="tool-control" data-field="latitude" type="number" min="-90" max="90" step="any" inputmode="decimal" placeholder="37.7749"></label>
              <label class="tool-label">Longitude<input class="tool-control" data-field="longitude" type="number" min="-180" max="180" step="any" inputmode="decimal" placeholder="-122.4194"></label>
              <p class="tool-note">Enter coordinates from −90 to 90 latitude and −180 to 180 longitude.</p>
            </div>
            <div class="qrg-input-meta"><span class="tool-note" id="qrg-count" data-count>0 characters</span><span class="tool-note" id="qrg-help">Shorter content makes a simpler code that scans more easily.</span></div>
            <details class="tool-details qrg-advanced">
              <summary>Advanced settings</summary>
              <label class="tool-label qrg-correction-label">Error correction
                <select class="tool-control" data-correction>
                  <option value="M" selected>Medium · recommended</option>
                  <option value="L">Low · smallest code</option>
                  <option value="Q">Quartile · extra recovery</option>
                  <option value="H">High · most recovery</option>
                </select>
              </label>
              <p class="tool-note qrg-correction-note">Higher correction can recover from more damage, but can make the code denser.</p>
            </details>
            <p class="tool-error qrg-error" data-error role="alert" hidden></p>
          </section>
          <section class="qrg-preview-panel" aria-label="QR code preview">
            <div class="qrg-preview-heading"><div><span class="tool-eyebrow">Live preview</span><p data-version>Waiting for content</p></div><span class="qrg-local-tag">Generated on this device</span></div>
            <div class="qrg-preview-surface">
              <canvas data-canvas width="0" height="0" aria-label="Generated QR code" hidden></canvas>
              <div class="qrg-empty" data-empty><span class="qrg-empty-icon" aria-hidden="true">⌗</span><strong>Your QR code will appear here</strong><span data-empty-hint>Enter a link or text to get started.</span><button type="button" class="tool-text-button" data-example>Try a sample link</button></div>
            </div>
            <p class="tool-status qrg-status" data-status role="status" aria-live="polite" hidden></p>
            <div class="qrg-download-actions">
              <button type="button" class="tool-button tool-button-primary" data-download-png disabled>Download PNG</button>
              <button type="button" class="tool-button" data-download-svg disabled>Download SVG</button>
            </div>
          </section>
        </div>
      </section>`,
    mount(container) {
      const root = container.querySelector('.qrg-tool');
      const type = root.querySelector('[data-type]');
      const correction = root.querySelector('[data-correction]');
      const count = root.querySelector('[data-count]');
      const error = root.querySelector('[data-error]');
      const status = root.querySelector('[data-status]');
      const canvas = root.querySelector('[data-canvas]');
      const context = canvas.getContext('2d', { alpha: false });
      const empty = root.querySelector('[data-empty]');
      const emptyHint = root.querySelector('[data-empty-hint]');
      const exampleButton = root.querySelector('[data-example]');
      const version = root.querySelector('[data-version]');
      const pngButton = root.querySelector('[data-download-png]');
      const svgButton = root.querySelector('[data-download-svg]');
      let latestCode = null;
      let renderTimer = 0;

      const field = name => root.querySelector(`[data-field="${name}"]`);
      const fieldValue = name => field(name)?.value || '';
      function escapeWifi(value) {
        return value.replace(/[\\;,:\"]/g, character => `\\${character}`);
      }
      function escapeVCard(value) {
        return value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
      }
      function cleanPhone(value) {
        const trimmed = value.trim();
        if (!/^[+\d][\d\s().-]*$/.test(trimmed)) return '';
        const number = trimmed.replace(/[\s().-]/g, '');
        return number.replace(/(?!^)[+]/g, '');
      }
      function hasEnteredData() {
        const panel = root.querySelector(`[data-fields="${type.value}"]`);
        return [...panel.querySelectorAll('input, textarea')].some(input => input.type === 'checkbox' ? input.checked : input.value.trim() !== '');
      }
      function makePayload() {
        switch (type.value) {
          case 'text':
            return { value: fieldValue('text') };
          case 'wifi': {
            const ssid = fieldValue('ssid');
            const security = fieldValue('security');
            const password = fieldValue('password');
            if (!ssid.trim()) return { error: 'Enter the Wi-Fi network name.' };
            if (new TextEncoder().encode(ssid).length > 32) return { error: 'Wi-Fi names can be up to 32 bytes long.' };
            if (security !== 'nopass' && !password) return { error: 'Enter the Wi-Fi password, or choose Open network.' };
            if (security === 'WPA' && !((new TextEncoder().encode(password).length >= 8 && new TextEncoder().encode(password).length <= 63) || /^[0-9a-f]{64}$/i.test(password))) {
              return { error: 'WPA passwords need 8–63 bytes, or a 64-character hexadecimal key.' };
            }
            if (security === 'WEP' && !(/^[\x00-\x7f]{5}$|^[\x00-\x7f]{13}$|^[0-9a-f]{10}$|^[0-9a-f]{26}$/i.test(password))) {
              return { error: 'WEP passwords need 5 or 13 characters, or a 10- or 26-digit hexadecimal key.' };
            }
            const passwordPart = security === 'nopass' ? '' : `P:${escapeWifi(password)};`;
            const hidden = field('hidden-network').checked;
            return { value: `WIFI:T:${security};S:${escapeWifi(ssid)};${passwordPart}H:${hidden ? 'true' : 'false'};;` };
          }
          case 'email': {
            const recipient = field('email-to');
            if (!recipient.value.trim()) return { error: 'Enter the recipient email address.' };
            if (!recipient.checkValidity()) return { error: 'Enter a valid email address.' };
            const params = [];
            if (fieldValue('email-subject')) params.push(`subject=${encodeURIComponent(fieldValue('email-subject'))}`);
            if (fieldValue('email-body')) params.push(`body=${encodeURIComponent(fieldValue('email-body'))}`);
            const query = params.join('&');
            return { value: `mailto:${recipient.value.trim()}${query ? `?${query}` : ''}` };
          }
          case 'phone': {
            const phone = cleanPhone(fieldValue('phone'));
            return phone ? { value: `tel:${phone}` } : { error: 'Enter a phone number using digits and common separators.' };
          }
          case 'sms': {
            const phone = cleanPhone(fieldValue('sms-phone'));
            if (!phone) return { error: 'Enter a phone number using digits and common separators.' };
            const message = fieldValue('sms-body');
            return { value: `sms:${phone}${message ? `?body=${encodeURIComponent(message)}` : ''}` };
          }
          case 'contact': {
            const first = fieldValue('first-name').trim();
            const last = fieldValue('last-name').trim();
            const organization = fieldValue('organization').trim();
            const email = field('contact-email');
            const website = field('website');
            if (!first && !last && !organization) return { error: 'Add a name or organization for this contact.' };
            if (email.value.trim() && !email.checkValidity()) return { error: 'Enter a valid contact email address.' };
            if (website.value.trim() && !website.checkValidity()) return { error: 'Enter a complete website address, such as https://example.com.' };
            const fullName = [first, last].filter(Boolean).join(' ');
            const lines = ['BEGIN:VCARD', 'VERSION:3.0', `N:${escapeVCard(last)};${escapeVCard(first)};;;`, `FN:${escapeVCard(fullName || organization)}`];
            if (organization) lines.push(`ORG:${escapeVCard(organization)}`);
            const rawPhone = fieldValue('contact-phone');
            const phone = cleanPhone(rawPhone);
            if (rawPhone.trim() && !phone) return { error: 'Enter the contact phone using digits and common separators.' };
            if (phone) lines.push(`TEL;TYPE=CELL:${phone}`);
            if (email.value.trim()) lines.push(`EMAIL:${email.value.trim()}`);
            if (website.value.trim()) lines.push(`URL:${website.value.trim()}`);
            lines.push('END:VCARD');
            return { value: lines.join('\r\n') };
          }
          case 'location': {
            const latitude = fieldValue('latitude');
            const longitude = fieldValue('longitude');
            if (!latitude || !longitude) return { error: 'Enter both latitude and longitude.' };
            const lat = Number(latitude), lon = Number(longitude);
            if (!Number.isFinite(lat) || lat < -90 || lat > 90) return { error: 'Latitude must be between −90 and 90.' };
            if (!Number.isFinite(lon) || lon < -180 || lon > 180) return { error: 'Longitude must be between −180 and 180.' };
            return { value: `geo:${lat},${lon}` };
          }
          default:
            return { value: '' };
        }
      }

      function updateFields() {
        root.querySelectorAll('[data-fields]').forEach(panel => { panel.hidden = panel.dataset.fields !== type.value; });
        const openNetwork = field('security').value === 'nopass';
        root.querySelector('[data-password-field]').hidden = openNetwork;
        const hints = {
          text: 'Enter a link or text to get started.',
          wifi: 'Add a network name and its security details.',
          email: 'Add a recipient to create an email QR code.',
          phone: 'Add a phone number to create a call QR code.',
          sms: 'Add a phone number to create a message QR code.',
          contact: 'Add a name or organization to create a contact card.',
          location: 'Add coordinates to create a map location.'
        };
        emptyHint.textContent = hints[type.value];
        exampleButton.hidden = type.value !== 'text';
      }

      function setUnavailable(message) {
        latestCode = null;
        canvas.hidden = true;
        empty.hidden = false;
        pngButton.disabled = true;
        svgButton.disabled = true;
        version.textContent = 'No preview';
        error.textContent = message;
        error.hidden = false;
        status.textContent = '';
        status.hidden = true;
        canvas.width = 0;
        canvas.height = 0;
      }

      function update() {
        const { value = '', error: payloadError } = makePayload();
        const characters = Array.from(value).length;
        count.textContent = `${characters.toLocaleString()} ${characters === 1 ? 'character' : 'characters'}`;
        error.hidden = true;
        error.textContent = '';

        if (!value.trim()) {
          latestCode = null;
          canvas.hidden = true;
          empty.hidden = false;
          pngButton.disabled = true;
          svgButton.disabled = true;
          version.textContent = hasEnteredData() && payloadError ? 'Complete the required details' : 'Waiting for content';
          if (hasEnteredData() && payloadError) {
            error.textContent = payloadError;
            error.hidden = false;
          }
          status.hidden = true;
          status.textContent = '';
          canvas.width = 0;
          canvas.height = 0;
          return;
        }

        try {
          const code = qrcodegen.QrCode.encodeText(value, ECC_LEVELS[correction.value]);
          latestCode = code;
          const fullSize = code.size + QUIET_ZONE * 2;
          const scale = Math.max(4, Math.min(PIXELS_PER_MODULE, Math.floor(1200 / fullSize)));
          canvas.width = fullSize * scale;
          canvas.height = fullSize * scale;
          context.fillStyle = '#ffffff';
          context.fillRect(0, 0, canvas.width, canvas.height);
          context.fillStyle = '#000000';
          for (let y = 0; y < code.size; y++) {
            for (let x = 0; x < code.size; x++) {
              if (code.getModule(x, y)) {
                context.fillRect((x + QUIET_ZONE) * scale, (y + QUIET_ZONE) * scale, scale, scale);
              }
            }
          }
          canvas.hidden = false;
          empty.hidden = true;
          pngButton.disabled = false;
          svgButton.disabled = false;
          version.textContent = `Version ${code.version} · ${code.size} × ${code.size} modules`;
          status.textContent = 'Ready to save as PNG or SVG.';
          status.hidden = false;
        } catch {
          setUnavailable('That content is too long for one QR code. Shorten it or choose a lower correction level.');
        }
      }

      function queueUpdate() {
        clearTimeout(renderTimer);
        latestCode = null;
        pngButton.disabled = true;
        svgButton.disabled = true;
        status.textContent = 'Updating preview…';
        status.hidden = false;
        renderTimer = setTimeout(update, 100);
      }

      function handleTypeChange() {
        updateFields();
        update();
      }

      function buildSvg(code) {
        const size = code.size + QUIET_ZONE * 2;
        const paths = [];
        for (let y = 0; y < code.size; y++) {
          let x = 0;
          while (x < code.size) {
            if (!code.getModule(x, y)) { x++; continue; }
            const start = x;
            while (x < code.size && code.getModule(x, y)) x++;
            paths.push(`M${start + QUIET_ZONE} ${y + QUIET_ZONE}h${x - start}v1h-${x - start}z`);
          }
        }
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="${paths.join('')}" fill="#000"/></svg>`;
      }

      function download(blob, extension) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `qr-code.${extension}`;
        document.body.append(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }

      root.querySelectorAll('[data-field]').forEach(input => {
        input.addEventListener('input', queueUpdate);
        input.addEventListener('change', queueUpdate);
      });
      type.addEventListener('change', handleTypeChange);
      correction.addEventListener('change', update);
      pngButton.addEventListener('click', () => {
        if (!latestCode) return;
        canvas.toBlob(blob => {
          if (blob) download(blob, 'png');
          else status.textContent = 'Could not create the PNG. Try downloading the SVG instead.';
        }, 'image/png');
      });
      svgButton.addEventListener('click', () => {
        if (latestCode) download(new Blob([buildSvg(latestCode)], { type: 'image/svg+xml;charset=utf-8' }), 'svg');
      });
      exampleButton.addEventListener('click', () => {
        field('text').value = 'https://example.com';
        field('text').focus();
        update();
      });
      field('security').addEventListener('change', updateFields);
      root.querySelector('[data-reveal-password]').addEventListener('click', event => {
        const button = event.currentTarget;
        const password = field('password');
        const visible = password.type === 'password';
        password.type = visible ? 'text' : 'password';
        button.textContent = visible ? 'Hide' : 'Show';
        button.setAttribute('aria-pressed', String(visible));
      });
      window.activeToolCleanup?.();
      window.activeToolCleanup = () => {
        clearTimeout(renderTimer);
        window.activeToolCleanup = null;
      };
      updateFields();
      update();
    }
  });
})();
