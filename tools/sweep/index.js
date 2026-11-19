(function () {
  'use strict';

  const PRESETS = {
    'Full Spectrum (20 Hz–20 kHz)': { startFreq: 20, endFreq: 20000, duration: 8.0, waveform: 'sine', sweepMode: 'exponential' },
    'Sub & Bass (20 Hz–250 Hz)': { startFreq: 20, endFreq: 250, duration: 5.0, waveform: 'sine', sweepMode: 'exponential' },
    'Midrange (250 Hz–4 kHz)': { startFreq: 250, endFreq: 4000, duration: 5.0, waveform: 'sine', sweepMode: 'exponential' },
    'Highs / Treble (4 kHz–20 kHz)': { startFreq: 4000, endFreq: 20000, duration: 5.0, waveform: 'sine', sweepMode: 'exponential' },
    'Hearing Check (1 kHz–16 kHz)': { startFreq: 1000, endFreq: 16000, duration: 6.0, waveform: 'sine', sweepMode: 'linear' }
  };

  const FREQ_MARKERS = [
    { freq: 20, label: '20 Hz' },
    { freq: 100, label: '100 Hz' },
    { freq: 500, label: '500 Hz' },
    { freq: 1000, label: '1 kHz' },
    { freq: 5000, label: '5 kHz' },
    { freq: 10000, label: '10 kHz' },
    { freq: 20000, label: '20 kHz' }
  ];

  const state = {
    startFreq: 20,
    endFreq: 20000,
    duration: 8.0,
    waveform: 'sine',
    sweepMode: 'exponential',
    volume: 40,
    isSweeping: false,
    audioCtx: null,
    oscillator: null,
    envelopeGain: null,
    masterGain: null,
    analyser: null,
    sweepStartTime: 0,
    freqDataArray: null,
    timeDataArray: null,
    sharedHash: null
  };

  window.portfolioTools.set('sweep', {
    title: 'Acoustic Sweep Generator',
    description: 'Generate precision audio frequency sweeps from 20 Hz to 20 kHz with customizable waveforms, curves, and WAV export.',
    getShareState: () => ({
      start: state.startFreq,
      end: state.endFreq,
      dur: state.duration,
      wave: state.waveform,
      mode: state.sweepMode,
      vol: state.volume
    }),
    render: () => `
      <section class="tool-workspace sweep-tool" tabindex="-1" aria-keyshortcuts="Space">
        <div class="sweep-header-meta">
          <p class="tool-note" style="margin:0;">Precision calibration sweep from 20 Hz to 20 kHz for studio monitors, headphones, subwoofers, and room acoustics.</p>
          <div class="sweep-status-badge" data-status-badge>
            <span class="sweep-status-led" data-status-led></span>
            <span data-status-label>Ready</span>
          </div>
        </div>

        <!-- Telemetry Dashboard -->
        <div class="sweep-dashboard">
          <div class="sweep-telemetry-card">
            <div class="sweep-card-header">
              <span class="tool-eyebrow" style="margin:0;">Instantaneous Frequency</span>
              <span class="sweep-badge-tag" data-band-badge>SUB-BASS (20–60 Hz)</span>
            </div>
            <div class="sweep-freq-primary">
              <span class="sweep-freq-number" data-freq-num>20.0</span>
              <span class="sweep-freq-unit" data-freq-unit>Hz</span>
            </div>
            <div class="sweep-card-meta">
              <span data-freq-exact>20.00 Hz</span>
              <span data-note-pitch>~E0 (+41¢)</span>
            </div>
          </div>

          <div class="sweep-telemetry-card">
            <div class="sweep-card-header">
              <span class="tool-eyebrow" style="margin:0;">Elapsed Time</span>
              <span class="sweep-badge-tag" data-progress-percent>0.0%</span>
            </div>
            <div class="sweep-freq-primary">
              <span class="sweep-freq-number" data-time-elapsed>0.00</span>
              <span class="sweep-freq-unit">/ <span data-time-total>8.00</span>s</span>
            </div>
            <div class="sweep-progress-container">
              <div class="sweep-progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" data-progressbar>
                <div class="sweep-progress-fill" data-progress-fill></div>
              </div>
              <div class="sweep-card-meta">
                <span>0.0s</span>
                <span>30ms anti-click fade</span>
                <span data-time-end-label>8.0s</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Spectrum Visualizer -->
        <div class="sweep-visualizer-wrap">
          <div class="sweep-visualizer-header">
            <span>Spectrum &amp; Waveform Monitor</span>
            <span>20 Hz – 20 kHz (Log Scale)</span>
          </div>
          <div class="sweep-canvas-stage" data-canvas-stage>
            <canvas class="sweep-canvas" data-canvas aria-label="Frequency spectrum and oscilloscope visualizer"></canvas>
          </div>
        </div>

        <!-- Primary Action Transport -->
        <div class="sweep-actions">
          <button type="button" class="tool-button tool-button-primary" data-start-sweep>Start Sweep</button>
          <button type="button" class="tool-button" data-stop-sweep disabled>Stop</button>
          <button type="button" class="tool-button" data-export-wav>Download WAV</button>
          <span class="tool-status" data-action-status role="status" aria-live="polite"></span>
        </div>

        <p class="tool-error" data-error role="alert" hidden></p>

        <!-- Configuration Form -->
        <form class="tool-form" novalidate data-sweep-form>
          <label>
            Start frequency (Hz)
            <input name="startFreq" type="number" min="10" max="24000" step="1" value="20" inputmode="numeric">
          </label>
          <label>
            End frequency (Hz)
            <input name="endFreq" type="number" min="10" max="24000" step="1" value="20000" inputmode="numeric">
          </label>
          <label>
            Duration (seconds)
            <input name="duration" type="number" min="0.5" max="60" step="0.5" value="8.0" inputmode="decimal">
          </label>
        </form>

        <!-- Quick Presets -->
        <div style="margin: -8px 0 20px;">
          <span class="tool-eyebrow">Quick calibration ranges</span>
          <div class="sweep-preset-buttons">
            ${Object.keys(PRESETS).map(name => `<button type="button" class="sweep-preset-btn" data-preset="${name}">${name}</button>`).join('')}
          </div>
        </div>

        <!-- Waveform & Curve Deck -->
        <div class="tool-result-grid" style="border-top: 1px solid var(--primary); padding-top: 8px;">
          <div>
            <dt class="tool-eyebrow">Oscillator Waveform</dt>
            <dd style="margin-top: 10px;">
              <div class="sweep-button-group" role="group" aria-label="Oscillator Waveform">
                <button type="button" class="tool-button" data-waveform="sine" aria-pressed="true">Sine</button>
                <button type="button" class="tool-button" data-waveform="triangle" aria-pressed="false">Triangle</button>
                <button type="button" class="tool-button" data-waveform="square" aria-pressed="false">Square</button>
                <button type="button" class="tool-button" data-waveform="sawtooth" aria-pressed="false">Sawtooth</button>
              </div>
            </dd>
          </div>
          <div>
            <dt class="tool-eyebrow">Progression Curve</dt>
            <dd style="margin-top: 10px;">
              <div class="sweep-button-group" role="group" aria-label="Sweep Curve">
                <button type="button" class="tool-button" data-mode="exponential" aria-pressed="true">Logarithmic (Equal Octaves)</button>
                <button type="button" class="tool-button" data-mode="linear" aria-pressed="false">Linear (Constant Hz/s)</button>
              </div>
            </dd>
          </div>
        </div>

        <!-- Output Gain Control -->
        <div style="margin: 20px 0;">
          <label class="tool-label" for="sweepVolumeSlider">
            Output level &amp; gain
            <div class="sweep-gain-deck">
              <input id="sweepVolumeSlider" class="tool-control sweep-slider" type="range" min="0" max="100" value="40" aria-label="Output volume percentage">
              <span class="sweep-gain-readout" data-volume-readout>40% (-13.1 dBFS)</span>
            </div>
          </label>
        </div>

        <!-- Hearing & Speaker Safety Notice -->
        <div class="sweep-safety-notice">
          <svg class="sweep-safety-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          <p>
            <strong>Acoustic &amp; Hearing Safety:</strong> Full-spectrum audio sweeps contain sustained sub-bass and high-frequency energy. Keep volume at a moderate level to protect hearing, monitor tweeters, and headphone drivers. Spacebar toggles start/stop, Escape stops immediately.
          </p>
        </div>

        <!-- Plain Text Specifications & Calibration Notes -->
        <details class="tool-details">
          <summary>Plain text specifications</summary>
          <textarea class="tool-control" data-specs-output readonly rows="8" aria-label="Acoustic sweep specifications"></textarea>
          <div class="tool-actions">
            <button type="button" class="tool-button" data-copy-specs>Copy specifications</button>
            <span class="tool-status" data-copy-status role="status"></span>
          </div>
        </details>

        <details class="tool-details">
          <summary>Acoustic calibration notes</summary>
          <p class="tool-note"><strong>Logarithmic (Exponential) vs Linear Sweeps:</strong> Human hearing perceives pitch logarithmically in musical octaves. A logarithmic sweep spends equal time per octave (e.g. 20–40 Hz takes the same time as 10–20 kHz), which is standard for measuring room modes, acoustic resonances, and speaker response curves. A linear sweep increases by constant Hertz per second and emphasizes high frequencies.</p>
          <p class="tool-note"><strong>Exported Audio:</strong> Generated WAV files are rendered uncompressed as 44.1 kHz, 16-bit PCM Mono audio with smooth 30ms anti-click fade ramps suitable for import into DAWs, acoustic measurement software (such as REW), or hardware testing equipment.</p>
        </details>
      </section>
    `,
    mount(container) {
      const root = container.querySelector('.sweep-tool');
      if (!root) return;

      // Restore URL share state if present
      const params = window.readToolState();
      if (window.location.hash !== state.sharedHash) {
        if (params.has('start')) state.startFreq = Number(params.get('start'));
        if (params.has('end')) state.endFreq = Number(params.get('end'));
        if (params.has('dur')) state.duration = Number(params.get('dur'));
        if (params.has('wave')) state.waveform = params.get('wave');
        if (params.has('mode')) state.sweepMode = params.get('mode');
        if (params.has('vol')) state.volume = Number(params.get('vol'));
        // Shared links are user-controlled input. Restore only a complete,
        // valid configuration so a malformed fragment cannot break mounting.
        try {
          Object.assign(state, window.validateSweepConfig(state));
        } catch {
          Object.assign(state, window.validateSweepConfig({}));
        }
        state.sharedHash = window.location.hash;
      }

      // DOM references
      const form = root.querySelector('[data-sweep-form]');
      const { startFreq: startInput, endFreq: endInput, duration: durInput } = form.elements;
      const volumeSlider = root.querySelector('#sweepVolumeSlider');
      const volumeReadout = root.querySelector('[data-volume-readout]');
      const statusBadge = root.querySelector('[data-status-badge]');
      const statusLabel = root.querySelector('[data-status-label]');
      const startBtn = root.querySelector('[data-start-sweep]');
      const stopBtn = root.querySelector('[data-stop-sweep]');
      const exportBtn = root.querySelector('[data-export-wav]');
      const actionStatus = root.querySelector('[data-action-status]');
      const errorEl = root.querySelector('[data-error]');

      const freqNum = root.querySelector('[data-freq-num]');
      const freqUnit = root.querySelector('[data-freq-unit]');
      const freqExact = root.querySelector('[data-freq-exact]');
      const notePitch = root.querySelector('[data-note-pitch]');
      const bandBadge = root.querySelector('[data-band-badge]');

      const timeElapsed = root.querySelector('[data-time-elapsed]');
      const timeTotal = root.querySelector('[data-time-total]');
      const timeEndLabel = root.querySelector('[data-time-end-label]');
      const progressPercent = root.querySelector('[data-progress-percent]');
      const progressFill = root.querySelector('[data-progress-fill]');
      const progressBar = root.querySelector('[data-progressbar]');

      const canvasStage = root.querySelector('[data-canvas-stage]');
      const canvas = root.querySelector('[data-canvas]');
      const ctx2d = canvas.getContext('2d');

      const specsOutput = root.querySelector('[data-specs-output]');
      const copySpecsBtn = root.querySelector('[data-copy-specs]');
      const copyStatus = root.querySelector('[data-copy-status]');

      const waveButtons = root.querySelectorAll('[data-waveform]');
      const modeButtons = root.querySelectorAll('[data-mode]');

      let animationFrameId = null;
      let isDisposed = false;
      let idlePhase = 0;
      let activeBlobUrl = null;
      let resizeObserver = null;

      // Populate initial inputs from state
      function syncInputs() {
        startInput.value = state.startFreq;
        endInput.value = state.endFreq;
        durInput.value = state.duration;
        volumeSlider.value = state.volume;
        timeTotal.textContent = Number(state.duration).toFixed(2);
        timeEndLabel.textContent = `${Number(state.duration).toFixed(1)}s`;

        const gain = window.percentToGain(state.volume);
        volumeReadout.textContent = `${state.volume}% (${window.gainToDbString(gain)})`;

        waveButtons.forEach(btn => {
          btn.setAttribute('aria-pressed', String(btn.dataset.waveform === state.waveform));
        });
        modeButtons.forEach(btn => {
          btn.setAttribute('aria-pressed', String(btn.dataset.mode === state.sweepMode));
        });

        updateTelemetry(state.startFreq, 0);
        specsOutput.value = window.formatSummaryText(getCurrentConfig());
      }

      function getCurrentConfig() {
        return {
          startFreq: Number(startInput.value),
          endFreq: Number(endInput.value),
          duration: Number(durInput.value),
          waveform: state.waveform,
          sweepMode: state.sweepMode,
          volume: Number(volumeSlider.value)
        };
      }

      function validateCurrentInputs(showError = false) {
        errorEl.hidden = true;
        [startInput, endInput, durInput].forEach(inp => inp.removeAttribute('aria-invalid'));
        try {
          const config = window.validateSweepConfig(getCurrentConfig());
          state.startFreq = config.startFreq;
          state.endFreq = config.endFreq;
          state.duration = config.duration;
          state.waveform = config.waveform;
          state.sweepMode = config.sweepMode;
          state.volume = config.volume;
          timeTotal.textContent = config.duration.toFixed(2);
          timeEndLabel.textContent = `${config.duration.toFixed(1)}s`;
          specsOutput.value = window.formatSummaryText(config);
          return config;
        } catch (err) {
          if (showError) {
            errorEl.textContent = err.message;
            errorEl.hidden = false;
            if (/start/i.test(err.message)) {
              startInput.setAttribute('aria-invalid', 'true');
              // start >= end is a two-sided error — flag the end input too
              if (/lower than end/i.test(err.message)) endInput.setAttribute('aria-invalid', 'true');
            } else if (/end/i.test(err.message)) endInput.setAttribute('aria-invalid', 'true');
            else if (/duration/i.test(err.message)) durInput.setAttribute('aria-invalid', 'true');
          }
          return null;
        }
      }

      function updateTelemetry(freq, elapsed) {
        if (freq >= 1000) {
          freqNum.textContent = (freq / 1000).toFixed(2);
          freqUnit.textContent = 'kHz';
          freqExact.textContent = `${Math.round(freq).toLocaleString('en-US')} Hz`;
        } else {
          freqNum.textContent = freq.toFixed(1);
          freqUnit.textContent = 'Hz';
          freqExact.textContent = `${freq.toFixed(2)} Hz`;
        }

        notePitch.textContent = window.getMusicalPitch(freq);
        bandBadge.textContent = window.getFrequencyBand(freq);

        const clampedElapsed = Math.max(0, Math.min(state.duration, elapsed));
        const pct = state.duration > 0 ? (clampedElapsed / state.duration) * 100 : 0;
        timeElapsed.textContent = clampedElapsed.toFixed(2);
        progressPercent.textContent = `${pct.toFixed(1)}%`;
        progressFill.style.width = `${pct}%`;
        progressBar.setAttribute('aria-valuenow', String(Math.round(pct)));
      }

      function ensureAudioContext() {
        if (!state.audioCtx) {
          const AudioContextClass = window.AudioContext || window.webkitAudioContext;
          if (!AudioContextClass) {
            throw new Error('Web Audio API is not supported in this browser.');
          }
          state.audioCtx = new AudioContextClass();

          state.masterGain = state.audioCtx.createGain();
          state.masterGain.gain.value = window.percentToGain(state.volume);

          state.analyser = state.audioCtx.createAnalyser();
          state.analyser.fftSize = 2048;
          state.analyser.smoothingTimeConstant = 0.7;

          state.freqDataArray = new Uint8Array(state.analyser.frequencyBinCount);
          state.timeDataArray = new Uint8Array(state.analyser.fftSize);

          state.masterGain.connect(state.analyser);
          state.analyser.connect(state.audioCtx.destination);
        }

        if (state.audioCtx.state === 'suspended') {
          state.audioCtx.resume();
        }
      }

      async function startSweep() {
        const config = validateCurrentInputs(true);
        if (!config) return;

        if (state.isSweeping) {
          stopSweep(false);
        }

        try {
          ensureAudioContext();
          if (state.audioCtx.state === 'suspended') {
            await state.audioCtx.resume();
          }

          const now = state.audioCtx.currentTime;
          state.sweepStartTime = now;
          state.isSweeping = true;

          const osc = state.audioCtx.createOscillator();
          osc.type = config.waveform;
          osc.frequency.setValueAtTime(config.startFreq, now);

          if (config.sweepMode === 'exponential') {
            osc.frequency.exponentialRampToValueAtTime(config.endFreq, now + config.duration);
          } else {
            osc.frequency.linearRampToValueAtTime(config.endFreq, now + config.duration);
          }

          const envGain = state.audioCtx.createGain();
          const fadeTime = Math.min(0.030, config.duration / 4);
          envGain.gain.setValueAtTime(0.0001, now);
          envGain.gain.exponentialRampToValueAtTime(1.0, now + fadeTime);
          envGain.gain.setValueAtTime(1.0, now + Math.max(fadeTime, config.duration - fadeTime));
          envGain.gain.exponentialRampToValueAtTime(0.0001, now + config.duration);

          osc.connect(envGain);
          envGain.connect(state.masterGain);

          state.oscillator = osc;
          state.envelopeGain = envGain;

          osc.start(now);
          osc.stop(now + config.duration + 0.015);

          osc.onended = () => {
            if (state.oscillator === osc) {
              cleanupAudioNodes();
              resetUI();
              actionStatus.textContent = 'Sweep completed.';
            }
          };

          // Update UI to sweeping
          startBtn.disabled = true;
          stopBtn.disabled = false;
          statusBadge.classList.add('is-sweeping');
          statusLabel.textContent = 'Sweeping';
          actionStatus.textContent = `Sweeping ${config.startFreq} Hz → ${config.endFreq} Hz...`;
        } catch (err) {
          cleanupAudioNodes();
          resetUI();
          errorEl.textContent = `Could not play audio: ${err.message}`;
          errorEl.hidden = false;
        }
      }

      function stopSweep(updateStatus = true) {
        if (!state.isSweeping) return;

        try {
          if (state.audioCtx && state.envelopeGain && state.oscillator) {
            const now = state.audioCtx.currentTime;
            state.envelopeGain.gain.cancelScheduledValues(now);
            const curVal = Math.max(0.0001, state.envelopeGain.gain.value);
            state.envelopeGain.gain.setValueAtTime(curVal, now);
            state.envelopeGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.025);
            state.oscillator.stop(now + 0.03);
          }
        } catch {
          // Ignore if already stopped
        }

        cleanupAudioNodes();
        resetUI();
        if (updateStatus) actionStatus.textContent = 'Sweep stopped.';
      }

      function cleanupAudioNodes() {
        state.isSweeping = false;
        state.oscillator = null;
        state.envelopeGain = null;
      }

      function resetUI() {
        startBtn.disabled = false;
        stopBtn.disabled = true;
        statusBadge.classList.remove('is-sweeping');
        statusLabel.textContent = 'Ready';
        updateTelemetry(state.startFreq, 0);
      }

      function exportWav() {
        const config = validateCurrentInputs(true);
        if (!config) return;

        actionStatus.textContent = 'Synthesizing WAV file…';
        exportBtn.disabled = true;

        setTimeout(() => {
          try {
            const samples = window.synthesizeSweepSamples(config, 44100, 0.03);
            const wavBytes = window.encodeWav(samples, 44100, 1);
            const blob = new Blob([wavBytes], { type: 'audio/wav' });

            if (activeBlobUrl) {
              URL.revokeObjectURL(activeBlobUrl);
            }
            activeBlobUrl = URL.createObjectURL(blob);

            const filename = `acoustic-sweep-${config.startFreq}Hz-${config.endFreq}Hz-${config.duration}s-${config.waveform}-${config.sweepMode}.wav`;
            const link = document.createElement('a');
            link.href = activeBlobUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            actionStatus.textContent = `WAV exported (${(wavBytes.length / 1024).toFixed(0)} KB).`;
          } catch (err) {
            actionStatus.textContent = 'Failed to export WAV audio.';
            errorEl.textContent = `Export error: ${err.message}`;
            errorEl.hidden = false;
          } finally {
            exportBtn.disabled = false;
          }
        }, 30);
      }

      // Responsive Canvas Visualizer Setup
      function resizeCanvas() {
        if (!canvasStage || !canvas) return;
        const rect = canvasStage.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.max(1, Math.floor(rect.width * dpr));
        canvas.height = Math.max(1, Math.floor(rect.height * dpr));
        ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      if ('ResizeObserver' in window) {
        resizeObserver = new ResizeObserver(() => resizeCanvas());
        resizeObserver.observe(canvasStage);
      }

      // Canvas Rendering Loop
      function renderLoop() {
        if (isDisposed) return;
        const width = canvasStage.clientWidth;
        const height = canvasStage.clientHeight;

        if (width === 0 || height === 0) {
          animationFrameId = requestAnimationFrame(renderLoop);
          return;
        }

        let liveFreq = state.startFreq;
        let elapsed = 0;

        if (state.isSweeping && state.audioCtx) {
          elapsed = state.audioCtx.currentTime - state.sweepStartTime;
          if (elapsed >= state.duration) {
            updateTelemetry(state.endFreq, state.duration);
            cleanupAudioNodes();
            resetUI();
            actionStatus.textContent = 'Sweep completed.';
          } else {
            liveFreq = window.getInstantaneousFrequency(state.startFreq, state.endFreq, state.duration, elapsed, state.sweepMode);
            updateTelemetry(liveFreq, elapsed);
          }
        }

        ctx2d.clearRect(0, 0, width, height);

        const padLeft = 14;
        const padRight = 14;
        const padTop = 14;
        const padBottom = 24;
        const plotW = Math.max(10, width - padLeft - padRight);
        const plotH = Math.max(10, height - padTop - padBottom);

        // Horizontal dB Guidelines
        ctx2d.lineWidth = 1;
        ctx2d.font = '10px "Special Gothic Condensed One", monospace';
        ctx2d.textAlign = 'left';

        const dbRatios = [0.25, 0.5, 0.75];
        dbRatios.forEach((ratio, idx) => {
          const y = padTop + plotH * ratio;
          ctx2d.strokeStyle = 'rgba(222, 216, 203, 0.08)';
          ctx2d.beginPath();
          ctx2d.moveTo(padLeft, y);
          ctx2d.lineTo(padLeft + plotW, y);
          ctx2d.stroke();

          ctx2d.fillStyle = 'rgba(222, 216, 203, 0.4)';
          ctx2d.fillText(`-${(idx + 1) * 12} dB`, padLeft + 4, y - 4);
        });

        // Floor line
        ctx2d.strokeStyle = 'rgba(222, 216, 203, 0.18)';
        ctx2d.beginPath();
        ctx2d.moveTo(padLeft, padTop + plotH);
        ctx2d.lineTo(padLeft + plotW, padTop + plotH);
        ctx2d.stroke();

        // Frequency Gridlines & Tick Labels
        FREQ_MARKERS.forEach((marker, i) => {
          const normX = window.freqToNormX(marker.freq, 20, 20000);
          const x = padLeft + normX * plotW;

          ctx2d.strokeStyle = 'rgba(255, 171, 7, 0.15)';
          ctx2d.setLineDash([2, 3]);
          ctx2d.beginPath();
          ctx2d.moveTo(x, padTop);
          ctx2d.lineTo(x, padTop + plotH);
          ctx2d.stroke();
          ctx2d.setLineDash([]);

          if (i === 0) ctx2d.textAlign = 'left';
          else if (i === FREQ_MARKERS.length - 1) ctx2d.textAlign = 'right';
          else ctx2d.textAlign = 'center';

          ctx2d.fillStyle = 'rgba(222, 216, 203, 0.7)';
          ctx2d.fillText(marker.label, x, padTop + plotH + 16);
        });

        // Live FFT Spectrum Curve & Tracking Cursor
        if (state.isSweeping && state.analyser && state.freqDataArray && state.timeDataArray) {
          state.analyser.getByteFrequencyData(state.freqDataArray);
          state.analyser.getByteTimeDomainData(state.timeDataArray);

          const sampleRate = state.audioCtx.sampleRate;
          const nyquist = sampleRate / 2;
          const binCount = state.freqDataArray.length;

          // Spectrum Fill
          const spectrumGrad = ctx2d.createLinearGradient(0, padTop, 0, padTop + plotH);
          spectrumGrad.addColorStop(0, 'rgba(255, 171, 7, 0.45)');
          spectrumGrad.addColorStop(0.6, 'rgba(255, 171, 7, 0.12)');
          spectrumGrad.addColorStop(1, 'rgba(255, 171, 7, 0.01)');

          ctx2d.beginPath();
          ctx2d.moveTo(padLeft, padTop + plotH);

          const stepPx = 2;
          for (let px = 0; px <= plotW; px += stepPx) {
            const normX = px / plotW;
            const freq = window.normXToFreq(normX, 20, 20000);
            const exactBin = (freq / nyquist) * (binCount - 1);
            const binLow = Math.floor(exactBin);
            const binHigh = Math.min(binCount - 1, binLow + 1);
            const frac = exactBin - binLow;

            const valLow = state.freqDataArray[binLow] || 0;
            const valHigh = state.freqDataArray[binHigh] || 0;
            const interpolated = valLow + (valHigh - valLow) * frac;
            const normAmp = interpolated / 255;
            const y = padTop + plotH - normAmp * plotH * 0.92;
            ctx2d.lineTo(padLeft + px, y);
          }
          ctx2d.lineTo(padLeft + plotW, padTop + plotH);
          ctx2d.closePath();
          ctx2d.fillStyle = spectrumGrad;
          ctx2d.fill();

          // Spectrum Edge Line
          ctx2d.beginPath();
          for (let px = 0; px <= plotW; px += stepPx) {
            const normX = px / plotW;
            const freq = window.normXToFreq(normX, 20, 20000);
            const exactBin = (freq / nyquist) * (binCount - 1);
            const binLow = Math.floor(exactBin);
            const binHigh = Math.min(binCount - 1, binLow + 1);
            const frac = exactBin - binLow;

            const valLow = state.freqDataArray[binLow] || 0;
            const valHigh = state.freqDataArray[binHigh] || 0;
            const interpolated = valLow + (valHigh - valLow) * frac;
            const normAmp = interpolated / 255;
            const y = padTop + plotH - normAmp * plotH * 0.92;
            if (px === 0) ctx2d.moveTo(padLeft + px, y);
            else ctx2d.lineTo(padLeft + px, y);
          }
          ctx2d.strokeStyle = '#FFAB07';
          ctx2d.lineWidth = 1.75;
          ctx2d.stroke();

          // Instantaneous Frequency Tracking Cursor
          const activeNormX = window.freqToNormX(liveFreq, 20, 20000);
          const cursorX = padLeft + activeNormX * plotW;

          ctx2d.strokeStyle = 'rgba(222, 216, 203, 0.7)';
          ctx2d.lineWidth = 1.5;
          ctx2d.beginPath();
          ctx2d.moveTo(cursorX, padTop);
          ctx2d.lineTo(cursorX, padTop + plotH);
          ctx2d.stroke();

          ctx2d.fillStyle = '#FFAB07';
          ctx2d.beginPath();
          ctx2d.arc(cursorX, padTop + 4, 3.5, 0, Math.PI * 2);
          ctx2d.fill();

          // Time-Domain Oscilloscope Trace
          ctx2d.beginPath();
          const waveSlice = Math.min(512, state.timeDataArray.length);
          const waveCenterY = padTop + plotH * 0.28;
          const waveAmp = plotH * 0.18;

          for (let i = 0; i < waveSlice; i++) {
            const normSample = (state.timeDataArray[i] - 128) / 128;
            const x = padLeft + (i / (waveSlice - 1)) * plotW;
            const y = waveCenterY + normSample * waveAmp;
            if (i === 0) ctx2d.moveTo(x, y);
            else ctx2d.lineTo(x, y);
          }
          ctx2d.strokeStyle = 'rgba(222, 216, 203, 0.5)';
          ctx2d.lineWidth = 1.2;
          ctx2d.stroke();
        } else {
          // Standby Waveform Shimmer
          idlePhase += 0.03;
          ctx2d.beginPath();
          for (let px = 0; px <= plotW; px += 4) {
            const normX = px / plotW;
            const wave = Math.sin(normX * 12 + idlePhase) * 1.5 + Math.cos(normX * 24 - idlePhase) * 1.0;
            const y = padTop + plotH - 4 + wave;
            if (px === 0) ctx2d.moveTo(padLeft + px, y);
            else ctx2d.lineTo(padLeft + px, y);
          }
          ctx2d.strokeStyle = 'rgba(255, 171, 7, 0.25)';
          ctx2d.lineWidth = 1.25;
          ctx2d.stroke();

          ctx2d.font = '11px "Special Gothic Condensed One", sans-serif';
          ctx2d.textAlign = 'center';
          ctx2d.fillStyle = 'rgba(222, 216, 203, 0.45)';
          ctx2d.fillText('STANDBY — PRESS START SWEEP TO COMMENCE TEST', padLeft + plotW / 2, padTop + plotH * 0.48);
        }

        animationFrameId = requestAnimationFrame(renderLoop);
      }

      // Event Listeners
      startBtn.addEventListener('click', startSweep);
      stopBtn.addEventListener('click', () => stopSweep(true));
      exportBtn.addEventListener('click', exportWav);

      [startInput, endInput, durInput].forEach(inp => {
        inp.addEventListener('input', () => validateCurrentInputs(false));
        inp.addEventListener('change', () => validateCurrentInputs(true));
      });

      // Presets
      root.querySelectorAll('[data-preset]').forEach(btn => {
        btn.addEventListener('click', () => {
          if (state.isSweeping) return;
          const preset = PRESETS[btn.dataset.preset];
          if (!preset) return;
          state.startFreq = preset.startFreq;
          state.endFreq = preset.endFreq;
          state.duration = preset.duration;
          state.waveform = preset.waveform;
          state.sweepMode = preset.sweepMode;
          syncInputs();
          validateCurrentInputs(false);
          actionStatus.textContent = `${btn.dataset.preset} preset loaded.`;
        });
      });

      // Waveform buttons
      waveButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          state.waveform = btn.dataset.waveform;
          if (state.isSweeping && state.oscillator) {
            state.oscillator.type = state.waveform;
          }
          waveButtons.forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
          validateCurrentInputs(false);
        });
      });

      // Mode buttons
      modeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          if (state.isSweeping) return;
          state.sweepMode = btn.dataset.mode;
          modeButtons.forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
          validateCurrentInputs(false);
        });
      });

      // Volume slider
      volumeSlider.addEventListener('input', e => {
        const val = Number(e.target.value);
        state.volume = val;
        const gain = window.percentToGain(val);
        volumeReadout.textContent = `${val}% (${window.gainToDbString(gain)})`;
        validateCurrentInputs(false);

        if (state.audioCtx && state.masterGain) {
          state.masterGain.gain.setTargetAtTime(gain, state.audioCtx.currentTime, 0.015);
        }
      });

      // Copy specifications
      copySpecsBtn.addEventListener('click', () => {
        window.copyToolText(specsOutput.value, copyStatus, specsOutput);
      });

      // Keyboard navigation
      const keyHandler = e => {
        if (e.code === 'Space' && !e.repeat && !e.target.closest('input, textarea, select, button, a, summary, [contenteditable]')) {
          e.preventDefault();
          if (state.isSweeping) stopSweep(true);
          else startSweep();
        } else if (e.code === 'Escape' && state.isSweeping) {
          e.preventDefault();
          stopSweep(true);
        }
      };
      window.addEventListener('keydown', keyHandler);

      // Lifecycle Cleanup on tool exit or navigation
      window.activeToolCleanup?.();
      window.activeToolCleanup = () => {
        isDisposed = true;
        stopSweep(false);
        if (state.audioCtx) {
          try {
            state.audioCtx.close();
          } catch {}
          state.audioCtx = null;
          state.masterGain = null;
          state.analyser = null;
        }
        if (animationFrameId !== null) {
          const id = animationFrameId;
          animationFrameId = null;
          cancelAnimationFrame(id);
        }
        if (resizeObserver) {
          resizeObserver.disconnect();
          resizeObserver = null;
        }
        if (activeBlobUrl) {
          URL.revokeObjectURL(activeBlobUrl);
          activeBlobUrl = null;
        }
        window.removeEventListener('keydown', keyHandler);
        if (window.activeToolCleanup) window.activeToolCleanup = null;
      };

      // Initial layout and start render loop
      syncInputs();
      resizeCanvas();
      renderLoop();
    }
  });
})();
