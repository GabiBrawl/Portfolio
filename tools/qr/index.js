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
        <p>Scan a QR code with your camera or choose an image. Everything is decoded on this device.</p>
        <div class="qr-mode-switch" role="group" aria-label="Choose a scan method">
          <button type="button" class="tool-button" data-mode="camera" aria-pressed="true">Use camera</button>
          <button type="button" class="tool-button" data-mode="image" aria-pressed="false">Choose image</button>
        </div>
        <section class="qr-scan-panel" data-panel="camera" aria-label="Camera scanner">
          <div class="qr-camera-stage">
            <video data-video autoplay muted playsinline aria-label="Live camera preview" hidden></video>
            <p data-camera-placeholder>Start the camera to scan a QR code.</p>
            <span class="qr-scan-frame" aria-hidden="true"></span>
          </div>
          <div class="qr-panel-actions">
            <button type="button" class="tool-button tool-button-primary" data-start-camera>Start camera</button>
            <button type="button" class="tool-button" data-stop-camera hidden>Stop camera</button>
          </div>
          <p class="tool-note">Camera access requires permission and a secure connection (HTTPS).</p>
        </section>
        <section class="qr-scan-panel" data-panel="image" aria-label="Scan an image" hidden>
          <label class="qr-upload-zone">
            <input type="file" data-image accept="image/*">
            <span class="qr-upload-title">Choose an image</span>
            <span class="tool-note">Select a PNG, JPEG, WebP, or other supported image, up to 10 MB.</span>
          </label>
          <img class="qr-image-preview" data-image-preview alt="Selected image" hidden>
        </section>
        <p class="tool-status qr-status" data-status role="status" aria-live="polite">Ready to scan.</p>
        <section class="qr-result" data-result hidden aria-labelledby="qr-result-title">
          <div class="qr-result-heading">
            <div><span class="tool-eyebrow">Scan result</span><h3 id="qr-result-title">QR code found</h3></div>
            <button type="button" class="tool-button" data-clear-result>Scan another</button>
          </div>
          <textarea class="tool-control qr-output" data-output readonly rows="4" aria-label="Decoded QR code content"></textarea>
          <div class="qr-result-actions">
            <button type="button" class="tool-button" data-copy-result>Copy result</button>
            <a class="tool-button qr-open-link" data-open-link target="_blank" rel="noopener noreferrer" hidden>Open link</a>
          </div>
        </section>
        <canvas class="qr-canvas" data-canvas hidden></canvas>
      </section>`,
    mount(container) {
      const root = container.querySelector('.qr-tool');
      const video = root.querySelector('[data-video]');
      const canvas = root.querySelector('[data-canvas]');
      const context = canvas.getContext('2d', { willReadFrequently: true });
      const status = root.querySelector('[data-status]');
      const result = root.querySelector('[data-result]');
      const output = root.querySelector('[data-output]');
      const openLink = root.querySelector('[data-open-link]');
      const imagePreview = root.querySelector('[data-image-preview]');
      const cameraStage = root.querySelector('.qr-camera-stage');
      let imageURL = null;
      let cameraRequestId = 0;
      let imageRequestId = 0;

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
        root.querySelector('[data-camera-placeholder]').hidden = false;
        root.querySelector('[data-start-camera]').hidden = false;
        root.querySelector('[data-start-camera]').disabled = false;
        root.querySelector('[data-stop-camera]').hidden = true;
        if (updateStatus && status.isConnected) status.textContent = 'Camera stopped.';
      }

      function clearResult() {
        result.hidden = true;
        output.value = '';
        openLink.hidden = true;
        openLink.removeAttribute('href');
      }

      function showResult(value) {
        stopCamera(false);
        output.value = value;
        result.hidden = false;
        status.textContent = 'QR code scanned successfully.';
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
          state.active = true;
          video.hidden = false;
          root.querySelector('[data-camera-placeholder]').hidden = true;
          cameraStage.classList.add('is-active');
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

      async function scanImage(file) {
        const requestId = ++imageRequestId;
        clearResult();
        if (!file) return;
        if (!file.type.startsWith('image/')) { status.textContent = 'Choose an image file to scan.'; return; }
        if (file.size > MAX_IMAGE_SIZE) { status.textContent = 'That image is over 10 MB. Choose a smaller image.'; return; }
        if (!window.jsQR) { status.textContent = 'The QR decoder did not load. Reload the page and try again.'; return; }
        status.textContent = 'Scanning image…';
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

      root.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => {
        const mode = button.dataset.mode;
        imageRequestId++;
        root.querySelectorAll('[data-mode]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
        root.querySelectorAll('[data-panel]').forEach(panel => { panel.hidden = panel.dataset.panel !== mode; });
        if (mode !== 'camera') stopCamera(false);
        clearResult();
        status.textContent = mode === 'camera' ? 'Ready to scan with your camera.' : 'Choose an image that contains a QR code.';
      }));
      root.querySelector('[data-start-camera]').addEventListener('click', startCamera);
      root.querySelector('[data-stop-camera]').addEventListener('click', () => stopCamera());
      root.querySelector('[data-image]').addEventListener('change', event => scanImage(event.target.files[0]));
      root.querySelector('[data-copy-result]').addEventListener('click', () => window.copyToolText(output.value, status, output));
      root.querySelector('[data-clear-result]').addEventListener('click', () => {
        imageRequestId++;
        clearResult();
        status.textContent = 'Ready to scan another code.';
        if (imageURL) { URL.revokeObjectURL(imageURL); imageURL = null; }
        imagePreview.removeAttribute('src');
        imagePreview.hidden = true;
        root.querySelector('[data-image]').value = '';
      });

      window.activeToolCleanup?.();
      window.activeToolCleanup = () => {
        stopCamera(false);
        if (imageURL) URL.revokeObjectURL(imageURL);
        if (window.activeToolCleanup) window.activeToolCleanup = null;
      };
      if (!window.jsQR) status.textContent = 'The QR decoder did not load. Reload the page and try again.';
    }
  });
})();
