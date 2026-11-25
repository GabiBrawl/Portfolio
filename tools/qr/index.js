(function () {
  'use strict';

  const state = { stream: null, timer: 0, active: false };
  const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
  const MAX_DIMENSION = 1600;

  window.portfolioTools.set('qr', {
    title: 'QR Scanner',
    description: 'Scan a QR code with your camera or from an image on your device.',
    render: () => `
      <section class="tool-workspace qr-tool">
        <p class="qr-intro">Scan a code with your camera, choose an image, or paste a copied image. Decoding stays on this device.</p>
        <div class="qr-mode-switch" role="group" aria-label="Choose a scan method">
          <button type="button" class="tool-button" data-mode="camera" aria-pressed="true">Use camera</button>
          <button type="button" class="tool-button" data-mode="image" aria-pressed="false">Choose image</button>
        </div>
        <section class="qr-scan-panel" data-panel="camera" aria-label="Camera scanner">
          <div class="qr-camera-stage is-idle">
            <video data-video autoplay muted playsinline aria-label="Live camera preview" hidden></video>
            <div class="qr-camera-placeholder" data-camera-placeholder><span aria-hidden="true" class="qr-camera-icon">⌗</span><p>Ready to scan?</p><span>Allow camera access to find a QR code.</span><button type="button" class="tool-button tool-button-primary" data-start-camera>Start camera</button></div>
            <button type="button" class="tool-button qr-stop-camera" data-stop-camera hidden>Stop camera</button>
            <span class="qr-scan-frame" aria-hidden="true"></span>
          </div>
          <p class="tool-note qr-camera-note">Camera access requires permission and a secure connection (HTTPS).</p>
        </section>
        <section class="qr-scan-panel" data-panel="image" aria-label="Scan an image" hidden>
          <label class="qr-upload-zone">
            <input type="file" data-image accept="image/*">
            <span class="qr-upload-icon" aria-hidden="true">＋</span>
            <span class="qr-upload-title">Choose an image to scan</span>
            <span class="tool-note">PNG, JPEG, WebP · up to 10 MB</span>
            <span class="qr-paste-hint">or paste an image with Ctrl+V / ⌘V</span>
          </label>
          <img class="qr-image-preview" data-image-preview alt="Selected image" hidden>
        </section>
        <p class="tool-status qr-status" data-status role="status" aria-live="polite">Ready to scan.</p>
        <section class="qr-result" data-result hidden aria-labelledby="qr-result-title" aria-live="polite">
          <div class="qr-result-heading">
            <div><span class="tool-eyebrow">Scan result</span><h3 id="qr-result-title">QR code found</h3></div>
            <button type="button" class="tool-button" data-clear-result>Scan another</button>
          </div>
          <div class="qr-wifi-details" data-wifi-details hidden>
            <div class="qr-wifi-row"><span>Network</span><strong data-wifi-ssid></strong></div>
            <div class="qr-wifi-row"><span>Security</span><strong data-wifi-security></strong></div>
            <div class="qr-wifi-row qr-wifi-password-row" data-wifi-password-row hidden><span>Password</span><div><code data-wifi-password></code><button type="button" class="qr-password-toggle" data-wifi-toggle aria-pressed="false">Show</button></div></div>
          </div>
          <pre class="qr-output" data-output aria-label="Decoded QR code content"></pre>
          <div class="qr-result-actions">
            <button type="button" class="tool-button" data-copy-result>Copy result</button>
            <a class="tool-button qr-open-link" data-open-link target="_blank" rel="noopener noreferrer" hidden>Open link</a>
          </div>
        </section>
        <textarea class="sr-only" data-copy-fallback readonly aria-label="Decoded QR code content to copy"></textarea>
        <canvas class="qr-canvas" data-canvas hidden></canvas>
      </section>`,
    mount(container) {
      // Run any previous tool's cleanup, then reset shared state to a clean baseline.
      window.activeToolCleanup?.();
      state.stream = null; state.timer = 0; state.active = false;
      window.activeToolCleanup = null;

      const root = container.querySelector('.qr-tool');
      const video = root.querySelector('[data-video]');
      const canvas = root.querySelector('[data-canvas]');
      const context = canvas.getContext('2d', { willReadFrequently: true });
      const status = root.querySelector('[data-status]');
      const result = root.querySelector('[data-result]');
      const output = root.querySelector('[data-output]');
      const copyFallback = root.querySelector('[data-copy-fallback]');
      const openLink = root.querySelector('[data-open-link]');
      const resultTitle = root.querySelector('#qr-result-title');
      const wifiDetails = root.querySelector('[data-wifi-details]');
      const wifiSsid = root.querySelector('[data-wifi-ssid]');
      const wifiSecurity = root.querySelector('[data-wifi-security]');
      const wifiPasswordRow = root.querySelector('[data-wifi-password-row]');
      const wifiPassword = root.querySelector('[data-wifi-password]');
      const wifiToggle = root.querySelector('[data-wifi-toggle]');
      const imagePreview = root.querySelector('[data-image-preview]');
      const cameraStage = root.querySelector('.qr-camera-stage');
      const cameraNote = root.querySelector('.qr-camera-note');
      cameraStage.append(result);
      let imageURL = null;
      let cameraRequestId = 0;
      let imageRequestId = 0;
      let activeMode = 'camera';
      let resultValue = '';

      function parseWifiPayload(value) {
        if (!value.startsWith('WIFI:')) return null;
        const fields = {};
        let key = '';
        let fieldValue = '';
        let readingValue = false;
        let escaped = false;
        const saveField = () => {
          if (key) fields[key] = fieldValue;
          key = '';
          fieldValue = '';
          readingValue = false;
        };
        for (const character of value.slice(5)) {
          if (escaped) {
            if (readingValue) fieldValue += character;
            else key += character;
            escaped = false;
          } else if (character === '\\') escaped = true;
          else if (character === ';') saveField();
          else if (character === ':' && !readingValue) readingValue = true;
          else if (readingValue) fieldValue += character;
          else key += character;
        }
        if (escaped) (readingValue ? fieldValue += '\\' : key += '\\');
        saveField();
        return Object.prototype.hasOwnProperty.call(fields, 'S') || Object.prototype.hasOwnProperty.call(fields, 'P')
          ? { ssid: fields.S || '', security: fields.T || '', password: fields.P || '' }
          : null;
      }

      function stopCamera(updateStatus = true) {
        cameraRequestId++;
        state.active = false;
        if (state.timer) clearTimeout(state.timer);
        state.timer = 0;
        if (state.stream) state.stream.getTracks().forEach(track => track.stop());
        state.stream = null;
        video.srcObject = null;
        video.hidden = true;
        cameraStage.classList.remove('is-active');
        cameraStage.classList.add('is-idle');
        root.querySelector('[data-camera-placeholder]').hidden = false;
        root.querySelector('[data-start-camera]').hidden = false;
        root.querySelector('[data-start-camera]').disabled = false;
        root.querySelector('[data-stop-camera]').hidden = true;
        if (updateStatus && status.isConnected) status.textContent = 'Camera stopped.';
      }

      function clearResult() {
        result.hidden = true;
        output.textContent = '';
        output.hidden = false;
        resultTitle.textContent = 'QR code found';
        wifiDetails.hidden = true;
        wifiPasswordRow.hidden = true;
        wifiPassword.textContent = '';
        delete wifiPassword.dataset.value;
        wifiToggle.textContent = 'Show';
        wifiToggle.setAttribute('aria-pressed', 'false');
        wifiToggle.hidden = false;
        resultValue = '';
        copyFallback.value = '';
        openLink.hidden = true;
        openLink.removeAttribute('href');
        cameraStage.hidden = false;
        cameraStage.classList.remove('has-result');
        cameraNote.hidden = false;
        root.querySelector('[data-camera-placeholder]').hidden = false;
        status.hidden = false;
      }

      function showResult(value) {
        stopCamera(false);
        cameraStage.hidden = activeMode !== 'camera';
        cameraNote.hidden = activeMode === 'camera';
        if (activeMode === 'camera') {
          cameraStage.classList.add('has-result');
          root.querySelector('[data-camera-placeholder]').hidden = true;
        }
        resultValue = value;
        const wifi = parseWifiPayload(value);
        if (wifi) {
          resultTitle.textContent = 'Wi-Fi network';
          wifiSsid.textContent = wifi.ssid || 'Hidden network';
          wifiSecurity.textContent = wifi.security ? wifi.security.toUpperCase() : 'Open network';
          wifiDetails.hidden = false;
          wifiPasswordRow.hidden = !wifi.password;
          wifiPassword.textContent = '••••••••';
          wifiPassword.dataset.value = wifi.password;
          output.hidden = true;
          openLink.hidden = true;
          wifiToggle.hidden = !wifi.password;
        } else {
          output.textContent = value;
          output.hidden = false;
          wifiDetails.hidden = true;
        }
        copyFallback.value = value;
        result.hidden = false;
        status.hidden = true;
        try {
          const url = new URL(value);
          if (url.protocol === 'https:' || url.protocol === 'http:') {
            openLink.href = url.href;
            openLink.textContent = `Open ${url.hostname}`;
            openLink.hidden = false;
          }
        } catch { /* Scanned content can be text or a non-web URL. */ }
        result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }

      function decodePixels(source) {
        const width = source.videoWidth || source.naturalWidth || source.width;
        const height = source.videoHeight || source.naturalHeight || source.height;
        if (!width || !height) return null;
        const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
        canvas.width = Math.max(1, Math.round(width * scale));
        canvas.height = Math.max(1, Math.round(height * scale));
        context.drawImage(source, 0, 0, canvas.width, canvas.height);
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
        return window.jsQR(pixels.data, pixels.width, pixels.height, { inversionAttempts: 'attemptBoth' });
      }

      function scanFrame() {
        if (!state.active || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return scheduleFrame();
        try {
          const code = decodePixels(video);
          if (code) return showResult(code.data);
        } catch (error) {
          status.textContent = `Could not read the camera frame: ${error.message}`;
          return stopCamera(false);
        }
        scheduleFrame();
      }

      function scheduleFrame() {
        if (!state.active) return;
        state.timer = setTimeout(scanFrame, 220);
      }

      async function startCamera() {
        clearResult();
        if (!window.jsQR) { status.textContent = 'The QR decoder did not load. Reload the page and try again.'; return; }
        if (!navigator.mediaDevices?.getUserMedia) {
          status.textContent = window.isSecureContext
            ? 'Camera access is not available in this browser. Choose an image instead.'
            : 'Camera scanning needs a secure HTTPS connection. Choose an image instead.';
          return;
        }
        stopCamera(false);
        const requestId = cameraRequestId;
        root.querySelector('[data-start-camera]').disabled = true;
        status.textContent = 'Waiting for camera permission…';
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
          if (requestId !== cameraRequestId) { stream.getTracks().forEach(track => track.stop()); return; }
          state.stream = stream;
          video.srcObject = state.stream;
          await video.play();
          if (requestId !== cameraRequestId) return;
          state.active = true;
          video.hidden = false;
          root.querySelector('[data-camera-placeholder]').hidden = true;
          cameraStage.classList.add('is-active');
          cameraStage.classList.remove('is-idle');
          root.querySelector('[data-start-camera]').hidden = true;
          root.querySelector('[data-stop-camera]').hidden = false;
          status.textContent = 'Camera is on. Point it at a QR code.';
          scheduleFrame();
        } catch (error) {
          if (requestId !== cameraRequestId) return;
          stopCamera(false);
          status.textContent = error.name === 'NotAllowedError'
            ? 'Camera permission was denied. Allow camera access in your browser settings or choose an image.'
            : error.name === 'NotFoundError'
              ? 'No camera was found on this device. Choose an image instead.'
              : 'Could not start the camera. Check its permission and try again.';
        }
      }

      async function scanImage(file, source = 'file') {
        const requestId = ++imageRequestId;
        clearResult();
        if (!file) return;
        if (!file.type.startsWith('image/')) { status.textContent = 'Choose an image file to scan.'; return; }
        if (file.size > MAX_IMAGE_SIZE) { status.textContent = 'That image is over 10 MB. Choose a smaller image.'; return; }
        if (!window.jsQR) { status.textContent = 'The QR decoder did not load. Reload the page and try again.'; return; }
        stopCamera(false);
        status.textContent = source === 'clipboard' ? 'Scanning pasted image…' : 'Scanning image…';
        if (imageURL) URL.revokeObjectURL(imageURL);
        imageURL = URL.createObjectURL(file);
        imagePreview.src = imageURL;
        imagePreview.hidden = false;
        try {
          let bitmap;
          if (window.createImageBitmap) {
            bitmap = await createImageBitmap(file);
            const code = decodePixels(bitmap);
            bitmap.close();
            if (requestId !== imageRequestId) return;
            if (code) return showResult(code.data);
          } else {
            const image = new Image();
            image.src = imageURL;
            await image.decode();
            if (requestId !== imageRequestId) return;
            const code = decodePixels(image);
            if (code) return showResult(code.data);
          }
          status.textContent = 'No QR code found. Try a clearer, well-lit image with the whole code visible.';
        } catch {
          if (requestId === imageRequestId) status.textContent = 'This image could not be read. Try another image format or file.';
        }
      }

      function selectMode(mode) {
        activeMode = mode;
        imageRequestId++;
        root.querySelectorAll('[data-mode]').forEach(item => item.setAttribute('aria-pressed', String(item.dataset.mode === mode)));
        root.querySelectorAll('[data-panel]').forEach(panel => { panel.hidden = panel.dataset.panel !== mode; });
        (mode === 'camera' ? cameraStage : root.querySelector(`[data-panel="${mode}"]`)).append(result);
        clearResult();
        if (mode === 'camera') {
          if (!state.active) startCamera();
          else status.textContent = 'Camera is on. Point it at a QR code.';
        } else {
          stopCamera(false);
          status.textContent = 'Choose an image that contains a QR code.';
        }
      }

      root.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => selectMode(button.dataset.mode)));
      root.querySelector('[data-start-camera]').addEventListener('click', startCamera);
      root.querySelector('[data-stop-camera]').addEventListener('click', () => stopCamera());
      root.querySelector('[data-image]').addEventListener('change', event => scanImage(event.target.files[0]));
      function handlePaste(event) {
        if (!root.isConnected || !event.clipboardData) return;
        const target = event.target;
        if (target instanceof HTMLElement && (target.isContentEditable || target.closest('input:not([type="file"]), textarea, [contenteditable="true"]'))) return;
        const imageItem = Array.from(event.clipboardData.items).find(item => item.type.startsWith('image/'));
        const file = imageItem?.getAsFile();
        if (!file) return;
        event.preventDefault();
        selectMode('image');
        scanImage(file, 'clipboard');
      }
      document.addEventListener('paste', handlePaste);
      root.querySelector('[data-copy-result]').addEventListener('click', () => { status.hidden = false; window.copyToolText(resultValue, status, copyFallback); });
      wifiToggle.addEventListener('click', () => {
        const revealed = wifiToggle.getAttribute('aria-pressed') !== 'true';
        wifiToggle.setAttribute('aria-pressed', String(revealed));
        wifiToggle.textContent = revealed ? 'Hide' : 'Show';
        wifiPassword.textContent = revealed ? wifiPassword.dataset.value : '••••••••';
      });
      root.querySelector('[data-clear-result]').addEventListener('click', () => {
        imageRequestId++;
        clearResult();
        status.textContent = activeMode === 'camera' ? 'Starting the camera again…' : 'Choose another image to scan.';
        if (activeMode === 'camera') startCamera();
        if (imageURL) { URL.revokeObjectURL(imageURL); imageURL = null; }
        imagePreview.removeAttribute('src');
        imagePreview.hidden = true;
        root.querySelector('[data-image]').value = '';
      });

      window.activeToolCleanup = () => {
        stopCamera(false);
        document.removeEventListener('paste', handlePaste);
        if (imageURL) URL.revokeObjectURL(imageURL);
        window.activeToolCleanup = null;
      };
      if (!window.jsQR) status.textContent = 'The QR decoder did not load. Reload the page and try again.';
    }
  });
})();
