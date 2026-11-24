(function (root) {
  'use strict';

  const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

  function normalizeSecret(secret) {
    const value = String(secret || '').toUpperCase().replace(/[\s-]/g, '').replace(/=+$/, '');
    if (!value) throw new Error('Enter a Base32 secret to generate a code.');
    if (!/^[A-Z2-7]+$/.test(value)) throw new Error('Use a Base32 secret (letters A–Z and numbers 2–7).');
    return value;
  }

  function decodeBase32(secret) {
    const value = normalizeSecret(secret);
    let buffer = 0;
    let bits = 0;
    const bytes = [];
    for (const character of value) {
      buffer = (buffer << 5) | BASE32_ALPHABET.indexOf(character);
      bits += 5;
      if (bits >= 8) {
        bytes.push((buffer >>> (bits - 8)) & 255);
        bits -= 8;
      }
    }
    return new Uint8Array(bytes);
  }

  function validateSettings(settings = {}) {
    const algorithmInput = String(settings.algorithm || 'SHA-1').toUpperCase().replace(/\s/g, '');
    const algorithm = algorithmInput === 'SHA1' ? 'SHA-1' : algorithmInput === 'SHA256' ? 'SHA-256' : algorithmInput === 'SHA512' ? 'SHA-512' : algorithmInput;
    const digits = Number(settings.digits || 6);
    const period = Number(settings.period || 30);
    if (!['SHA-1', 'SHA-256', 'SHA-512'].includes(algorithm)) throw new Error('Choose SHA-1, SHA-256, or SHA-512.');
    if (![6, 8].includes(digits)) throw new Error('Choose a 6- or 8-digit code.');
    if (!Number.isInteger(period) || period < 1 || period > 300) throw new Error('Use a period between 1 and 300 seconds.');
    return { algorithm, digits, period };
  }

  function counterBytes(counter) {
    const bytes = new Uint8Array(8);
    let value = BigInt(counter);
    for (let index = 7; index >= 0; index--) {
      bytes[index] = Number(value & 255n);
      value >>= 8n;
    }
    return bytes;
  }

  async function generateTOTP(secret, settings = {}, time = Date.now(), cryptoApi = root.crypto) {
    if (!cryptoApi?.subtle) throw new Error('This browser does not support secure code generation.');
    const { algorithm, digits, period } = validateSettings(settings);
    const counter = Math.floor(time / 1000 / period);
    const key = await cryptoApi.subtle.importKey('raw', decodeBase32(secret), { name: 'HMAC', hash: algorithm }, false, ['sign']);
    const signature = new Uint8Array(await cryptoApi.subtle.sign('HMAC', key, counterBytes(counter)));
    const offset = signature[signature.length - 1] & 15;
    const number = ((signature[offset] & 127) << 24) | (signature[offset + 1] << 16) | (signature[offset + 2] << 8) | signature[offset + 3];
    return String(number % (10 ** digits)).padStart(digits, '0');
  }

  function parseOtpauth(uri) {
    let url;
    try { url = new URL(String(uri)); } catch { throw new Error('Paste a valid otpauth:// URI.'); }
    if (url.protocol !== 'otpauth:' || url.hostname.toLowerCase() !== 'totp') throw new Error('Use a TOTP otpauth:// URI.');
    const secret = url.searchParams.get('secret');
    const settings = validateSettings({
      algorithm: url.searchParams.get('algorithm') || 'SHA-1',
      digits: url.searchParams.get('digits') || 6,
      period: url.searchParams.get('period') || 30
    });
    normalizeSecret(secret);
    return { secret: normalizeSecret(secret), label: decodeURIComponent(url.pathname.replace(/^\//, '')), issuer: url.searchParams.get('issuer') || '', ...settings };
  }

  const api = { normalizeSecret, decodeBase32, validateSettings, generateTOTP, parseOtpauth };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else Object.assign(root, api);
})(typeof window !== 'undefined' ? window : globalThis);
