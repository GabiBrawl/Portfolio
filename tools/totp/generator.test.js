const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto').webcrypto;
const { decodeBase32, generateTOTP, parseOtpauth } = require('./generator.js');

test('decodes Base32 values with whitespace and padding', () => {
  assert.deepEqual([...decodeBase32('MZXW6=== ')], [...Buffer.from('foo')]);
});

test('generates the RFC 6238 SHA-1 test code', async () => {
  const code = await generateTOTP('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', { algorithm: 'SHA-1', digits: 8, period: 30 }, 59000, crypto);
  assert.equal(code, '94287082');
});

test('parses standard otpauth TOTP URIs', () => {
  const data = parseOtpauth('otpauth://totp/Example:alice?secret=JBSWY3DPEHPK3PXP&issuer=Example&algorithm=SHA256&digits=8&period=60');
  assert.equal(data.secret, 'JBSWY3DPEHPK3PXP');
  assert.equal(data.algorithm, 'SHA-256');
  assert.equal(data.digits, 8);
  assert.equal(data.period, 60);
});
