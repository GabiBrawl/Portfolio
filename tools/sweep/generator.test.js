const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
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
} = require('./generator.js');

test('validateSweepConfig applies safe defaults and accepts valid custom inputs', () => {
  const defaults = validateSweepConfig();
  assert.equal(defaults.startFreq, 20);
  assert.equal(defaults.endFreq, 20000);
  assert.equal(defaults.duration, 8.0);
  assert.equal(defaults.waveform, 'sine');
  assert.equal(defaults.sweepMode, 'exponential');
  assert.equal(defaults.volume, 40);

  const custom = validateSweepConfig({
    startFreq: '100',
    endFreq: 5000,
    duration: '4.5',
    waveform: 'TRIANGLE',
    sweepMode: 'linear',
    volume: '25'
  });
  assert.equal(custom.startFreq, 100);
  assert.equal(custom.endFreq, 5000);
  assert.equal(custom.duration, 4.5);
  assert.equal(custom.waveform, 'triangle');
  assert.equal(custom.sweepMode, 'linear');
  assert.equal(custom.volume, 25);
});

test('validateSweepConfig rejects invalid frequencies, durations, and modes', () => {
  assert.throws(() => validateSweepConfig({ startFreq: 5 }), /between 10 Hz and 24,000 Hz/);
  assert.throws(() => validateSweepConfig({ endFreq: 30000 }), /between 10 Hz and 24,000 Hz/);
  assert.throws(() => validateSweepConfig({ startFreq: 1000, endFreq: 500 }), /lower than end frequency/);
  assert.throws(() => validateSweepConfig({ duration: 0.1 }), /between 0.5 and 60 seconds/);
  assert.throws(() => validateSweepConfig({ waveform: 'pulse' }), /waveform must be/i);
  assert.throws(() => validateSweepConfig({ sweepMode: 'log-quad' }), /mode must be/i);
  assert.throws(() => validateSweepConfig({ volume: 150 }), /volume must be between/i);
});

test('getInstantaneousFrequency accurately calculates exponential and linear progression', () => {
  const start = 20;
  const end = 20000;
  const duration = 8.0;

  // Exponential sweep boundary values
  assert.equal(getInstantaneousFrequency(start, end, duration, 0, 'exponential'), 20);
  assert.equal(Math.round(getInstantaneousFrequency(start, end, duration, 8.0, 'exponential')), 20000);

  // Geometric mean at t = 4s (midpoint of exponential sweep) should be sqrt(20 * 20000) ~ 632.455 Hz
  const expMid = getInstantaneousFrequency(start, end, duration, 4.0, 'exponential');
  assert.ok(Math.abs(expMid - Math.sqrt(start * end)) < 0.001);

  // Linear sweep boundary values
  assert.equal(getInstantaneousFrequency(start, end, duration, 0, 'linear'), 20);
  assert.equal(getInstantaneousFrequency(start, end, duration, 8.0, 'linear'), 20000);

  // Arithmetic mean at t = 4s (midpoint of linear sweep) should be (20 + 20000) / 2 = 10010 Hz
  const linMid = getInstantaneousFrequency(start, end, duration, 4.0, 'linear');
  assert.equal(linMid, 10010);

  // Out of bounds clamping
  assert.equal(getInstantaneousFrequency(start, end, duration, -2, 'exponential'), 20);
  assert.equal(Math.round(getInstantaneousFrequency(start, end, duration, 10, 'exponential')), 20000);
});

test('getFrequencyBand categorizes acoustic bands correctly across spectrum', () => {
  assert.equal(getFrequencyBand(12), 'INFRASOUND (< 20 Hz)');
  assert.equal(getFrequencyBand(40), 'SUB-BASS (20–60 Hz)');
  assert.equal(getFrequencyBand(120), 'BASS (60–250 Hz)');
  assert.equal(getFrequencyBand(350), 'LOW MIDS (250–500 Hz)');
  assert.equal(getFrequencyBand(1000), 'MIDRANGE (500 Hz–2 kHz)');
  assert.equal(getFrequencyBand(3000), 'UPPER MIDS (2–4 kHz)');
  assert.equal(getFrequencyBand(6000), 'PRESENCE (4–8 kHz)');
  assert.equal(getFrequencyBand(14000), 'BRILLIANCE / AIR (8–20 kHz)');
  assert.equal(getFrequencyBand(22000), 'ULTRASOUND (> 20 kHz)');
});

test('getMusicalPitch accurately identifies notes and deviations', () => {
  assert.equal(getMusicalPitch(440), '~A4 (+0¢)');
  assert.equal(getMusicalPitch(880), '~A5 (+0¢)');
  assert.equal(getMusicalPitch(261.63), '~C4 (+0¢)');
  assert.equal(getMusicalPitch(0), '—');
  assert.equal(getMusicalPitch(-10), '—');
});

test('percentToGain and gainToDbString map perceptual volume correctly', () => {
  assert.equal(percentToGain(0), 0);
  assert.equal(gainToDbString(0), '-∞ dBFS');

  const fullGain = percentToGain(100);
  assert.equal(fullGain, 1);
  assert.equal(gainToDbString(fullGain), '0.0 dBFS');

  const safeGain = percentToGain(40);
  assert.ok(safeGain > 0.2 && safeGain < 0.25);
  assert.ok(gainToDbString(safeGain).includes('-13.'));
});

test('freqToNormX and normXToFreq convert logarithmically both ways', () => {
  const normMin = freqToNormX(20, 20, 20000);
  const normMax = freqToNormX(20000, 20, 20000);
  assert.equal(normMin, 0);
  assert.equal(normMax, 1);

  const testFreqs = [20, 100, 500, 1000, 5000, 10000, 20000];
  for (const f of testFreqs) {
    const norm = freqToNormX(f, 20, 20000);
    const roundtrip = normXToFreq(norm, 20, 20000);
    assert.ok(Math.abs(roundtrip - f) < 0.01, `Failed roundtrip for ${f}`);
  }
});

test('synthesizeSweepSamples generates envelope-shaped audio samples for all waveforms', () => {
  const waveforms = ['sine', 'triangle', 'square', 'sawtooth'];
  for (const wave of waveforms) {
    const samples = synthesizeSweepSamples({
      startFreq: 100,
      endFreq: 1000,
      duration: 0.5,
      waveform: wave,
      sweepMode: 'exponential',
      volume: 100
    }, 8000, 0.05);

    assert.equal(samples.length, 4000); // 0.5s * 8000 Hz
    // First sample should be attenuated near 0 due to fade-in
    assert.ok(Math.abs(samples[0]) < 0.01);
    // Last sample should be attenuated near 0 due to fade-out
    assert.ok(Math.abs(samples[samples.length - 1]) < 0.01);
    // Midpoint should have audible amplitude
    const midSlice = samples.subarray(1500, 2500);
    const maxMidAmp = Math.max(...midSlice.map(Math.abs));
    assert.ok(maxMidAmp > 0.5);
  }
});

test('encodeWav outputs valid RIFF/WAVE header and sample payload', () => {
  const sampleRate = 22050;
  const numSamples = 2205; // 0.1s
  const testSamples = new Float32Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    testSamples[i] = Math.sin((2 * Math.PI * 440 * i) / sampleRate);
  }

  const wavBytes = encodeWav(testSamples, sampleRate, 1);
  assert.ok(wavBytes instanceof Uint8Array);

  // Total size: 44 header bytes + numSamples * 2 bytes
  const expectedSize = 44 + numSamples * 2;
  assert.equal(wavBytes.length, expectedSize);

  const view = new DataView(wavBytes.buffer, wavBytes.byteOffset, wavBytes.byteLength);
  const textAt = (start, len) => String.fromCharCode(...wavBytes.subarray(start, start + len));

  assert.equal(textAt(0, 4), 'RIFF');
  assert.equal(view.getUint32(4, true), 36 + numSamples * 2);
  assert.equal(textAt(8, 4), 'WAVE');
  assert.equal(textAt(12, 4), 'fmt ');
  assert.equal(view.getUint32(16, true), 16); // PCM header size
  assert.equal(view.getUint16(20, true), 1);  // Audio format 1 = PCM
  assert.equal(view.getUint16(22, true), 1);  // Mono
  assert.equal(view.getUint32(24, true), sampleRate);
  assert.equal(view.getUint32(28, true), sampleRate * 2); // Byte rate
  assert.equal(view.getUint16(32, true), 2);  // Block align
  assert.equal(view.getUint16(34, true), 16); // Bits per sample
  assert.equal(textAt(36, 4), 'data');
  assert.equal(view.getUint32(40, true), numSamples * 2);
});

test('formatSummaryText formats copyable text specifications', () => {
  const text = formatSummaryText({
    startFreq: 20,
    endFreq: 20000,
    duration: 8.0,
    waveform: 'sine',
    sweepMode: 'exponential',
    volume: 40
  });

  assert.ok(text.includes('Acoustic Sweep Generator'));
  assert.ok(text.includes('20 Hz — 20,000 Hz'));
  assert.ok(text.includes('8.00 seconds'));
  assert.ok(text.includes('Sine'));
  assert.ok(text.includes('Logarithmic (Exponential)'));
  assert.ok(text.includes('40%'));
  assert.ok(text.includes('WAV'));
});

test('sweep tool registers with window.portfolioTools and adheres to the tools contract', () => {
  const fs = require('node:fs');
  const vm = require('node:vm');
  const window = {
    portfolioTools: new Map(),
    readToolState: () => new URLSearchParams('start=50&end=5000&dur=4&wave=triangle&mode=linear&vol=60'),
    location: { hash: '#start=50&end=5000&dur=4&wave=triangle&mode=linear&vol=60' }
  };

  // Load generator first
  vm.runInNewContext(fs.readFileSync(__dirname + '/generator.js', 'utf8'), {
    window,
    globalThis: window,
    Math,
    Number,
    String,
    Float32Array,
    Uint8Array,
    ArrayBuffer,
    DataView
  });

  // Load index.js
  vm.runInNewContext(fs.readFileSync(__dirname + '/index.js', 'utf8'), {
    window,
    globalThis: window,
    Math,
    Number,
    String,
    Float32Array,
    Uint8Array,
    ArrayBuffer,
    DataView
  });

  assert.ok(window.portfolioTools.has('sweep'));
  const tool = window.portfolioTools.get('sweep');
  assert.equal(tool.title, 'Acoustic Sweep Generator');
  assert.ok(tool.description.length > 10);
  assert.equal(typeof tool.render, 'function');
  assert.equal(typeof tool.mount, 'function');
  assert.equal(typeof tool.getShareState, 'function');

  const markup = tool.render();
  assert.ok(markup.includes('tool-workspace sweep-tool'));
  assert.ok(markup.includes('data-start-sweep'));
  assert.ok(markup.includes('data-stop-sweep'));
  assert.ok(markup.includes('data-export-wav'));

  const shareState = tool.getShareState();
  assert.equal(shareState.start, 20);
  assert.equal(shareState.end, 20000);
  assert.equal(shareState.dur, 8.0);
  assert.equal(shareState.wave, 'sine');
  assert.equal(shareState.mode, 'exponential');
  assert.equal(shareState.vol, 40);
});
