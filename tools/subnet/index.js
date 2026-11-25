(function () {
  'use strict';
  const state = { address: '192.168.1.42', mask: '24', sharedHash: null };
  window.portfolioTools.set('subnet', {
    title: 'Subnet Calculator',
    description: 'Calculate IPv4 ranges, convert masks, or find the subnet size you need.',
    getShareState: () => ({ ip: state.address, mask: state.mask }),
    render: () => `
      <section class="tool-workspace subnet-tool">
        <form class="tool-form subnet-form" novalidate>
          <label class="subnet-field">IPv4 address<input name="address" type="text" inputmode="decimal" placeholder="192.168.1.42" spellcheck="false" autocomplete="off" aria-describedby="subnet-address-help subnet-error"><span class="tool-note subnet-field-hint" id="subnet-address-help">Enter an address or paste CIDR, such as 192.168.1.42/24.</span></label>
          <label class="subnet-field">Prefix length or subnet mask<input name="mask" type="text" inputmode="decimal" placeholder="24 or 255.255.255.0" spellcheck="false" autocomplete="off" aria-describedby="subnet-mask-help subnet-error"><span class="subnet-prefix-options" id="subnet-mask-help"><span class="tool-note">Common prefixes</span><button type="button" class="subnet-preset" data-prefix="24">/24</button><button type="button" class="subnet-preset" data-prefix="16">/16</button><button type="button" class="subnet-preset" data-prefix="8">/8</button></span></label>
          <button class="tool-button tool-button-primary" type="submit">Calculate</button>
        </form>
        <p id="subnet-error" class="tool-error" role="alert" hidden></p>
        <p class="subnet-pending tool-note" hidden>Enter a valid address and prefix to see results.</p>
        <div class="subnet-results-heading"><h2>Subnet results</h2><div class="subnet-copy-actions"><button class="tool-button" data-copy-subnet disabled>Copy results</button><span class="tool-status" role="status" aria-live="polite"></span></div></div>
        <div class="tool-results" aria-live="polite" aria-atomic="true"></div>
        <details class="tool-details subnet-technical-details"><summary>Network details</summary><dl class="tool-result-grid subnet-extra-details"></dl></details>
        <details class="tool-details subnet-size-helper"><summary>Plan a subnet by host count</summary>
          <p class="tool-note">Find the smallest subnet that can hold the number of usable hosts you need.</p>
          <div class="tool-form"><label>Usable hosts needed<input data-hosts type="number" min="1" max="4294967294" inputmode="numeric" placeholder="e.g. 100"></label><button class="tool-button" type="button" data-size>Find prefix</button></div>
          <p class="tool-note" data-size-result role="status">Network and broadcast addresses are reserved. /31 and /32 are available in the main calculator.</p>
        </details>
        <details class="tool-details subnet-summary"><summary>Plain-text summary</summary><pre class="subnet-summary-text" aria-label="Subnet results"></pre></details>
        <p class="tool-note subnet-footnote">Tip: /31 is used for point-to-point links; /32 represents one address.</p>
      </section>`,
    mount(container) {
      const params = window.readToolState();
      if (window.location.hash !== state.sharedHash) {
        if (params.has('ip')) state.address = params.get('ip').slice(0, 64);
        if (params.has('mask')) state.mask = params.get('mask').slice(0, 32);
        state.sharedHash = window.location.hash;
      }
      const form = container.querySelector('form'), { address, mask } = form.elements;
      const results = container.querySelector('.tool-results'), error = container.querySelector('.tool-error');
      const pending = container.querySelector('.subnet-pending'), output = container.querySelector('.subnet-summary-text');
      const status = container.querySelector('.tool-status'), copy = container.querySelector('[data-copy-subnet]');
      address.value = state.address; mask.value = state.mask;
      function update(showError = false) {
        state.address = address.value; state.mask = mask.value;
        status.textContent = ''; error.hidden = true;
        address.removeAttribute('aria-invalid'); mask.removeAttribute('aria-invalid');
        try {
          const parsed = window.parseSubnetInput(address.value, mask.value), data = parsed.result;
          const special = parsed.prefix < 31 && parsed.address === data.network ? 'This address is the network address, not a usable host.' : parsed.prefix < 31 && parsed.address === data.broadcast ? 'This address is the broadcast address, not a usable host.' : 'This address is within the usable host range.';
          const maskOctets = data.mask.split('.').map(Number);
          const partialOctet = maskOctets.findIndex(octet => octet > 0 && octet < 255);
          const blockOctet = partialOctet >= 0 ? partialOctet : Math.min(3, Math.floor(parsed.prefix / 8));
          const blockSize = parsed.prefix === 32 ? '1 address' : parsed.prefix === 31 ? '2 addresses' : `${256 - maskOctets[blockOctet]} addresses`;
          const rows = [['Subnet mask', data.mask], ['Wildcard mask', data.wildcard], ['Network address', data.network], ['Broadcast address', data.broadcast]];
          results.innerHTML = `<div class="subnet-result-cards"><section class="subnet-result-card subnet-result-network"><span class="tool-eyebrow">NETWORK</span><strong>${data.cidr}</strong></section><section class="subnet-result-card"><span class="tool-eyebrow">BLOCK SIZE</span><strong>${blockSize}</strong><small>256 − ${maskOctets[blockOctet]} = ${256 - maskOctets[blockOctet]} in octet ${blockOctet + 1}</small></section><section class="subnet-result-card subnet-result-range"><span class="tool-eyebrow">USABLE HOST RANGE</span><strong>${data.firstHost} <span aria-hidden="true">–</span> ${data.lastHost}</strong><small>${special}</small></section><section class="subnet-result-card subnet-result-hosts"><span class="tool-eyebrow">USABLE HOSTS</span><strong>${data.usable.toLocaleString()}</strong><small>${data.total.toLocaleString()} total addresses</small></section></div>`;
          container.querySelector('.subnet-extra-details').innerHTML = rows.map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join('');
          output.textContent = [`Network: ${data.cidr}`, `Block size: ${blockSize} in octet ${blockOctet + 1}`, `Host range: ${data.firstHost} - ${data.lastHost}`, ...rows.map(([label, value]) => `${label}: ${value}`), `Usable hosts: ${data.usable}`, `Total addresses: ${data.total}`].join('\n');
          copy.disabled = false; pending.hidden = true;
          return parsed;
        } catch (exception) {
          results.innerHTML = ''; output.textContent = ''; copy.disabled = true; pending.hidden = showError;
          if (showError) {
            error.textContent = exception.message; error.hidden = false;
            const maskError = /prefix length|subnet mask|contiguous/i.test(exception.message);
            (maskError ? mask : address).setAttribute('aria-invalid', 'true');
            (maskError ? mask : address).focus();
          }
        }
      }
      function normalizeCIDR(parsed) {
        if (parsed && address.value.includes('/')) {
          address.value = parsed.address; mask.value = String(parsed.prefix); update();
        }
      }
      form.addEventListener('submit', event => { event.preventDefault(); normalizeCIDR(update(true)); });
      [address, mask].forEach(input => {
        input.addEventListener('input', () => update());
        input.addEventListener('change', () => {
          normalizeCIDR(update(true));
        });
      });
      container.querySelectorAll('[data-prefix]').forEach(button => button.addEventListener('click', () => {
        mask.value = button.dataset.prefix;
        update();
        mask.focus();
      }));
      const hostsInput = container.querySelector('[data-hosts]');
      container.querySelector('[data-size]').addEventListener('click', () => {
        const result = container.querySelector('[data-size-result]');
        try {
          const prefix = window.prefixForHosts(hostsInput.value);
          const data = window.calculateSubnet('0.0.0.0', prefix);
          result.textContent = `A /${prefix} (${data.mask}) provides ${data.usable.toLocaleString()} usable hosts.`;
          const apply = document.createElement('button');
          apply.type = 'button'; apply.className = 'subnet-apply-prefix'; apply.textContent = `Use /${prefix} above`;
          apply.addEventListener('click', () => {
            address.value = address.value.split('/')[0];
            mask.value = String(prefix);
            update(true);
            address.focus();
          });
          result.replaceChildren(document.createTextNode(`A /${prefix} (${data.mask}) provides ${data.usable.toLocaleString()} usable hosts. `), apply);
        } catch (exception) { result.textContent = exception.message; hostsInput.focus(); }
      });
      hostsInput.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); container.querySelector('[data-size]').click(); } });
      copy.addEventListener('click', () => window.copyToolText(output.textContent, status));
      update();
    }
  });
})();
