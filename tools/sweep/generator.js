(function (root) {
  'use strict';

  const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  const DEFAULT_CONFIG = {
    startFreq: 20,
    endFreq: 20000,
    duration: 8.0,
    waveform: 'sine',
    sweepMode: 'exponential',
    volume: 40
  };

  /**
   * Validates and normalizes sweep configuration parameters.
   * Throws an informative Error if any parameter is outside valid acoustic bounds.
   */
  function validateSweepConfig(raw = {}) {
    const start = Number(raw.startFreq !== undefined ? raw.startFreq : DEFAULT_CONFIG.startFreq);
    const end = Number(raw.endFreq !== undefined ? raw.endFreq : DEFAULT_CONFIG.endFreq);
    const duration = Number(raw.duration !== undefined ? raw.duration : DEFAULT_CONFIG.duration);
    const volume = Number(raw.volume !== undefined ? raw.volume : DEFAULT_CONFIG.volume);
    const waveform = String(raw.waveform || DEFAULT_CONFIG.waveform).toLowerCase().trim();
    const sweepMode = String(raw.sweepMode || DEFAULT_CONFIG.sweepMode).toLowerCase().trim();

    if (!Number.isFinite(start) || start < 10 || start > 24000) {
      throw new Error('Start frequency must be between 10 Hz and 24,000 Hz.');
    }
    if (!Number.isFinite(end) || end < 10 || end > 24000) {
      throw new Error('End frequency must be between 10 Hz and 24,000 Hz.');
    }
    if (start >= end) {
      throw new Error('Start frequency must be lower than end frequency.');
    }
    if (!Number.isFinite(duration) || duration < 0.5 || duration > 60) {
      throw new Error('Duration must be between 0.5 and 60 seconds.');
    }
    if (!['sine', 'triangle', 'square', 'sawtooth'].includes(waveform)) {
      throw new Error('Waveform must be sine, triangle, square, or sawtooth.');
    }
    if (!['exponential', 'linear'].includes(sweepMode)) {
      throw new Error('Sweep mode must be exponential or linear.');
    }
    if (!Number.isFinite(volume) || volume < 0 || volume > 100) {
      throw new Error('Volume must be between 0% and 100%.');
    }

    return {
      startFreq: Math.round(start * 100) / 100,
      endFreq: Math.round(end * 100) / 100,
      duration: Math.round(duration * 100) / 100,
      waveform,
      sweepMode,
      volume: Math.round(volume)
    };
  }

  /**
   * Calculates instantaneous frequency at elapsed time t for exponential or linear sweeps.
   */
  function getInstantaneousFrequency(startFreq, endFreq, duration, elapsed, mode = 'exponential') {
    if (duration <= 0) return startFreq;
    const clampedT = Math.max(0, Math.min(duration, elapsed));
    const progress = clampedT / duration;

    if (mode === 'exponential') {
      const ratio = endFreq / startFreq;
      return startFreq * Math.pow(ratio, progress);
    }
    return startFreq + (endFreq - startFreq) * progress;
  }

  /**
   * Categorizes frequency into standard acoustic audio bands.
   */
  function getFrequencyBand(freq) {
    if (freq < 20) return 'INFRASOUND (< 20 Hz)';
    if (freq < 60) return 'SUB-BASS (20–60 Hz)';
    if (freq < 250) return 'BASS (60–250 Hz)';
    if (freq < 500) return 'LOW MIDS (250–500 Hz)';
    if (freq < 2000) return 'MIDRANGE (500 Hz–2 kHz)';
    if (freq < 4000) return 'UPPER MIDS (2–4 kHz)';
    if (freq < 8000) return 'PRESENCE (4–8 kHz)';
    if (freq <= 20000) return 'BRILLIANCE / AIR (8–20 kHz)';
    return 'ULTRASOUND (> 20 kHz)';
  }

  /**
   * Computes nearest musical note and deviation in cents (A4 = 440 Hz).
   */
  function getMusicalPitch(freq) {
    if (!Number.isFinite(freq) || freq <= 0) return '—';
    const midiFloat = 69 + 12 * Math.log2(freq / 440);
    const midiNote = Math.round(midiFloat);
    const cents = Math.round((midiFloat - midiNote) * 100);
    const noteName = NOTE_NAMES[((midiNote % 12) + 12) % 12];
    const octave = Math.floor(midiNote / 12) - 1;
    const sign = cents >= 0 ? '+' : '';
    return `~${noteName}${octave} (${sign}${cents}¢)`;
  }

  /**
   * Converts slider percentage (0..100) to perceptual linear gain (0..1).
   */
  function percentToGain(percent) {
    if (!Number.isFinite(percent) || percent <= 0) return 0;
    const normalized = Math.min(100, Math.max(0, percent)) / 100;
    return Math.pow(normalized, 1.65);
  }

  /**
   * Formats linear gain as dBFS string.
   */
  function gainToDbString(gain) {
    if (!Number.isFinite(gain) || gain <= 0.00001) return '-∞ dBFS';
    const db = 20 * Math.log10(gain);
    return `${db.toFixed(1)} dBFS`;
  }

  /**
   * Normalizes frequency in [minFreq, maxFreq] to logarithmic coordinate [0, 1].
   */
  function freqToNormX(freq, minFreq = 20, maxFreq = 20000) {
    const clamped = Math.max(minFreq, Math.min(maxFreq, freq));
    return Math.log(clamped / minFreq) / Math.log(maxFreq / minFreq);
  }

  /**
   * Reverses logarithmic coordinate [0, 1] back to frequency in [minFreq, maxFreq].
   */
  function normXToFreq(normX, minFreq = 20, maxFreq = 20000) {
    const clamped = Math.max(0, Math.min(1, normX));
    return minFreq * Math.pow(maxFreq / minFreq, clamped);
  }

  /**
   * Synthesizes audio samples (Float32Array) for the sweep using analytical phase integration
   * with anti-click fade-in and fade-out ramps.
   */
  function synthesizeSweepSamples(config = {}, sampleRate = 44100, fadeDuration = 0.03) {
    const { startFreq, endFreq, duration, waveform, sweepMode, volume } = validateSweepConfig(config);
    const totalSamples = Math.max(1, Math.floor(duration * sampleRate));
    const samples = new Float32Array(totalSamples);
    const fadeSamples = Math.min(Math.floor(fadeDuration * sampleRate), Math.floor(totalSamples / 2));
    const twoPi = 2 * Math.PI;
    // Keep downloaded files consistent with the selected playback level.
    const outputGain = percentToGain(volume);

    const logRatio = Math.log(endFreq / startFreq);
    const freqDelta = endFreq - startFreq;

    for (let i = 0; i < totalSamples; i++) {
      const t = i / sampleRate;

      // Analytical phase integration: phi(t) = integral(2*pi*f(tau), 0 to t)
      let phase = 0;
      if (sweepMode === 'exponential') {
        if (Math.abs(logRatio) < 1e-9) {
          phase = twoPi * startFreq * t;
        } else {
          phase = (twoPi * startFreq * duration / logRatio) * (Math.pow(endFreq / startFreq, t / duration) - 1);
        }
      } else {
        phase = twoPi * (startFreq * t + (freqDelta / (2 * duration)) * t * t);
      }

      // Wrap phase into [0, 2pi)
      const normPhase = ((phase % twoPi) + twoPi) % twoPi;

      let val = 0;
      switch (waveform) {
        case 'triangle':
          val = (2 / Math.PI) * Math.asin(Math.sin(normPhase));
          break;
        case 'square':
          val = Math.sin(normPhase) >= 0 ? 1 : -1;
          break;
        case 'sawtooth':
          val = 2 * (normPhase / twoPi) - 1;
          break;
        case 'sine':
        default:
          val = Math.sin(normPhase);
          break;
      }

      // Anti-click fade-in / fade-out envelope
      let envelope = 1;
      if (fadeSamples > 0) {
        if (i < fadeSamples) {
          // Smooth half-cosine fade in
          envelope = 0.5 * (1 - Math.cos((Math.PI * i) / fadeSamples));
        } else if (i >= totalSamples - fadeSamples) {
          const fadeOutIdx = totalSamples - 1 - i;
          envelope = 0.5 * (1 - Math.cos((Math.PI * fadeOutIdx) / fadeSamples));
        }
      }

      samples[i] = val * envelope * outputGain;
    }

    return samples;
  }

  /**
   * Encodes Float32Array audio samples into standard 16-bit PCM RIFF WAVE format.
   * Returns a Uint8Array containing the complete WAV file.
   */
  function encodeWav(samples, sampleRate = 44100, numChannels = 1) {
    const bytesPerSample = 2; // 16-bit
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = samples.length * blockAlign;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    // RIFF chunk descriptor
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true); // ChunkSize
    writeString(view, 8, 'WAVE');

    // "fmt " sub-chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);             // Subchunk1Size (16 for PCM)
    view.setUint16(20, 1, true);              // AudioFormat (1 = PCM)
    view.setUint16(22, numChannels, true);    // NumChannels
    view.setUint32(24, sampleRate, true);     // SampleRate
    view.setUint32(28, byteRate, true);       // ByteRate
    view.setUint16(32, blockAlign, true);     // BlockAlign
    view.setUint16(34, 16, true);             // BitsPerSample

    // "data" sub-chunk
    writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);       // Subchunk2Size

    // Write 16-bit PCM samples with clipping protection
    let offset = 44;
    for (let i = 0; i < samples.length; i++) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      const pcm = s < 0 ? s * 0x8000 : s * 0x7FFF;
      view.setInt16(offset, Math.round(pcm), true);
      offset += 2;
    }

    return new Uint8Array(buffer);
  }

  function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  /**
   * Formats plain text summary of the sweep specifications for easy copying.
   */
  function formatSummaryText(config = {}) {
    const valid = validateSweepConfig(config);
    const gain = percentToGain(valid.volume);
    const db = gainToDbString(gain);
    const waveName = valid.waveform.charAt(0).toUpperCase() + valid.waveform.slice(1);
    const curveName = valid.sweepMode === 'exponential' ? 'Logarithmic (Exponential)' : 'Linear (Constant Hz/s)';

    return [
      'Acoustic Sweep Generator',
      `Frequency range: ${valid.startFreq.toLocaleString()} Hz — ${valid.endFreq.toLocaleString()} Hz`,
      `Duration: ${valid.duration.toFixed(2)} seconds`,
      `Waveform: ${waveName}`,
      `Progression curve: ${curveName}`,
      `Output level: ${valid.volume}% (${db})`,
      'Fade ramps: 30ms anti-click envelope',
      'Export format: 44.1 kHz, 16-bit PCM Mono WAV'
    ].join('\n');
  }

  const api = {
    DEFAULT_CONFIG,
    validateSweepConfig,
    getInstantaneousFrequency,
    getFrequencyBand,
    getMusicalPitch,
    percentToGain,
    gainToDbString,
    freqToNormX,
    normXToFreq,
    synthesizeSweepSamples,
    encodeWav,
    formatSummaryText
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    Object.assign(root, api);
  }
})(typeof window !== 'undefined' ? window : globalThis);
