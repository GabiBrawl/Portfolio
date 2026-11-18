const { test } = require('node:test');
const assert = require('node:assert/strict');
const { calculateSubnet, parseSubnetInput, prefixForHosts } = require('./calculator.js');

test('calculates a typical private /24 subnet', () => {
  assert.deepEqual(calculateSubnet('192.168.1.42', 24), {
    cidr: '192.168.1.0/24', mask: '255.255.255.0', wildcard: '0.0.0.255',
    network: '192.168.1.0', broadcast: '192.168.1.255',
    firstHost: '192.168.1.1', lastHost: '192.168.1.254', total: 256, usable: 254
  });
});

test('handles subnets that cross octet boundaries', () => {
  const result = calculateSubnet('172.16.19.250', 20);
  assert.equal(result.cidr, '172.16.16.0/20');
  assert.equal(result.mask, '255.255.240.0');
  assert.equal(result.broadcast, '172.16.31.255');
  assert.equal(result.usable, 4094);
});

test('handles the full IPv4 space without signed integer overflow', () => {
  const result = calculateSubnet('255.255.255.255', 0);
  assert.equal(result.cidr, '0.0.0.0/0');
  assert.equal(result.mask, '0.0.0.0');
  assert.equal(result.broadcast, '255.255.255.255');
  assert.equal(result.usable, 4294967294);
});

test('/31 uses both endpoints and /32 uses the single host', () => {
  const pair = calculateSubnet('203.0.113.11', 31);
  assert.equal(pair.firstHost, '203.0.113.10');
  assert.equal(pair.lastHost, '203.0.113.11');
  assert.equal(pair.usable, 2);
  assert.equal(pair.broadcast, 'None');
  const host = calculateSubnet('255.255.255.255', 32);
  assert.equal(host.firstHost, '255.255.255.255');
  assert.equal(host.lastHost, host.firstHost);
  assert.equal(host.usable, 1);
  assert.equal(host.broadcast, 'None');
});

test('rejects malformed addresses and invalid prefixes', () => {
  for (const address of ['256.0.0.1', '1.2.3', '1.2.3.4.5', 'a.2.3.4', '-1.2.3.4', '1..3.4']) {
    assert.throws(() => calculateSubnet(address, 24), /valid IPv4/);
  }
  for (const prefix of ['', ' ', -1, 33, 2.5, '24x']) {
    assert.throws(() => calculateSubnet('192.168.1.1', prefix), /between 0 and 32/);
  }
});

test('accepts prefixes, dotted masks, and pasted CIDR notation', () => {
  const expected = calculateSubnet('192.168.1.42', 24);
  for (const mask of ['24', '/24', '255.255.255.0']) {
    assert.deepEqual(parseSubnetInput('192.168.1.42', mask).result, expected);
  }
  assert.equal(parseSubnetInput('10.0.0.1/16', '24').prefix, 16);
  assert.equal(parseSubnetInput('1.2.3.4', '0.0.0.0').prefix, 0);
  assert.equal(parseSubnetInput('1.2.3.4', '255.255.255.255').prefix, 32);
  assert.throws(() => parseSubnetInput('1.2.3.4', '255.0.255.0'), /contiguous/);
  assert.throws(() => parseSubnetInput('1.2.3.4/24/16'), /one prefix/);
});

test('finds the smallest conventional subnet that fits the requested hosts', () => {
  for (const [hosts, prefix] of [[1, 30], [2, 30], [3, 29], [100, 25], [254, 24], [255, 23], [4294967294, 0]]) {
    assert.equal(prefixForHosts(hosts), prefix);
  }
  for (const hosts of ['', '0', '-1', '2.5', 'abc', '4294967295']) assert.throws(() => prefixForHosts(hosts));
});
