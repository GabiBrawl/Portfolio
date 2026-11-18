(function (root) {
  'use strict';

  function formatIP(value) {
    return [24, 16, 8, 0].map(shift => (value >>> shift) & 255).join('.');
  }

  function calculateSubnet(address, prefix) {
    const octets = address.trim().split('.');
    if (octets.length !== 4 || octets.some(part => !/^\d{1,3}$/.test(part) || Number(part) > 255)) {
      throw new Error('Enter a valid IPv4 address, such as 192.168.1.42.');
    }
    const prefixText = String(prefix).trim();
    if (!/^\d{1,2}$/.test(prefixText) || Number(prefixText) > 32) {
      throw new Error('Enter a prefix length between 0 and 32.');
    }
    const bits = Number(prefixText);
    const ip = octets.reduce((value, part) => value * 256 + Number(part), 0);
    const size = 2 ** (32 - bits);
    const network = Math.floor(ip / size) * size;
    const broadcast = network + size - 1;
    const mask = 2 ** 32 - size;
    const usable = bits >= 31 ? size : size - 2;
    return {
      cidr: `${formatIP(network)}/${bits}`,
      mask: formatIP(mask),
      wildcard: formatIP(size - 1),
      network: formatIP(network),
      broadcast: bits >= 31 ? 'None' : formatIP(broadcast),
      firstHost: formatIP(bits >= 31 ? network : network + 1),
      lastHost: formatIP(bits >= 31 ? broadcast : broadcast - 1),
      total: size,
      usable
    };
  }

  function parseSubnetInput(address, mask = '24') {
    const parts = address.trim().split('/');
    if (parts.length > 2) throw new Error('Use one prefix, for example 192.168.1.42/24.');
    const maskText = (parts.length === 2 ? parts[1] : String(mask)).trim().replace(/^\//, '');
    let prefix = maskText;
    if (maskText.includes('.')) {
      prefix = Array.from({ length: 33 }, (_, bits) => bits).find(bits => calculateSubnet('0.0.0.0', bits).mask === maskText);
      if (prefix === undefined) throw new Error('Use a contiguous subnet mask, such as 255.255.255.0.');
    }
    const result = calculateSubnet(parts[0], prefix);
    return { address: parts[0].trim(), prefix: Number(prefix), result };
  }

  // Conventional multi-access networks reserve network and broadcast addresses.
  function prefixForHosts(hosts) {
    const text = String(hosts).trim();
    if (!/^\d+$/.test(text) || Number(text) < 1 || Number(text) > 4294967294) throw new Error('Enter between 1 and 4,294,967,294 hosts.');
    for (let bits = 30; bits >= 0; bits--) {
      if (2 ** (32 - bits) - 2 >= Number(text)) return bits;
    }
  }

  const api = { calculateSubnet, parseSubnetInput, prefixForHosts };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else Object.assign(root, api);
})(typeof window !== 'undefined' ? window : globalThis);
