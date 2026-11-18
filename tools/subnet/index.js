(function () {
  'use strict';
  const state = { address: '192.168.1.42', mask: '24', sharedHash: null };
  window.portfolioTools.set('subnet', {
    title: 'Subnet Calculator',
    description: 'Calculate IPv4 ranges, convert masks, or find the subnet size you need.',
    getShareState: () => ({ ip: state.address, mask: state.mask }),
    render: () => `
      <section class="tool-workspace subnet-tool">
        <p>Enter an IPv4 address and subnet size to see its network, address range, and host capacity.</p>
        <form class="tool-form subnet-form" novalidate>
          <label>IPv4 address<input name="address" type="text" inputmode="decimal" placeholder="192.168.1.42" spellcheck="false" autocomplete="off" aria-describedby="subnet-address-help subnet-error"></label>
          <label>Prefix length or subnet mask<input name="mask" type="text" inputmode="decimal" placeholder="24 or 255.255.255.0" spellcheck="false" autocomplete="off" aria-describedby="subnet-mask-help subnet-error"></label>
          <button class="tool-button tool-button-primary" type="submit">Calculate</button>
        </form>
        <div class="subnet-input-help">
          <p id="subnet-address-help" class="tool-note">Paste CIDR notation here too, for example 192.168.1.42/24.</p>
          <p id="subnet-mask-help" class="tool-note">Choose a common prefix: <span class="subnet-presets"><button type="button" class="subnet-preset" data-prefix="24">/24</button><button type="button" class="subnet-preset" data-prefix="16">/16</button><button type="button" class="subnet-preset" data-prefix="8">/8</button></span></p>
        </div>
        <p id="subnet-error" class="tool-error" role="alert" hidden></p>
        <p class="subnet-pending tool-note" hidden>Complete the address and mask to see results.</p>
        <div class="tool-results" aria-live="polite" aria-atomic="true"></div>
        <div class="tool-actions"><button class="tool-button" data-copy-subnet disabled>Copy results</button><span class="tool-status" role="status" aria-live="polite"></span></div>
        <details class="tool-details subnet-size-helper"><summary>Choose a subnet by host count</summary>
          <p class="tool-note">Find the smallest subnet that can hold the number of usable hosts you need.</p>
          <div class="tool-form"><label>Usable hosts needed<input data-hosts type="number" min="1" max="4294967294" inputmode="numeric" placeholder="e.g. 100"></label><button class="tool-button" type="button" data-size>Find prefix</button></div>
          <p class="tool-note" data-size-result role="status">Network and broadcast addresses are reserved. /31 and /32 are available in the main calculator.</p>
        </details>
        <details class="tool-details"><summary>Plain text results</summary><textarea class="tool-control" readonly rows="7" aria-label="Subnet results"></textarea></details>
        <p class="tool-note subnet-footnote">/31 is for point-to-point links with two endpoints. /32 identifies one host. Neither uses a broadcast address.</p>
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
      const pending = container.querySelector('.subnet-pending'), output = container.querySelector('textarea');
      const status = container.querySelector('.tool-status'), copy = container.querySelector('[data-copy-subnet]');
      address.value = state.address; mask.value = state.mask;
      function update(showError = false) {
        state.address = address.value; state.mask = mask.value;
        status.textContent = ''; error.hidden = true;
        address.removeAttribute('aria-invalid'); mask.removeAttribute('aria-invalid');
        try {
          const parsed = window.parseSubnetInput(address.value, mask.value), data = parsed.result;
          const special = parsed.prefix < 31 && parsed.address === data.network ? 'This address is the network address, not a usable host.' : parsed.prefix < 31 && parsed.address === data.broadcast ? 'This address is the broadcast address, not a usable host.' : 'This address is within the usable host range.';
          const rows = [['Subnet mask', data.mask], ['Wildcard mask', data.wildcard], ['Network address', data.network], ['Broadcast address', data.broadcast]];
          results.innerHTML = `<div class="subnet-overview"><div><span class="tool-eyebrow">Network</span><strong>${data.cidr}</strong></div><div><span class="tool-eyebrow">Usable hosts</span><strong>${data.usable.toLocaleString()}</strong><small>${data.total.toLocaleString()} total addresses</small></div></div><div class="subnet-range"><span class="tool-eyebrow">Usable host range</span><strong>${data.firstHost} — ${data.lastHost}</strong><p class="tool-note">${special}</p></div><dl class="tool-result-grid">${rows.map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join('')}</dl>`;
          output.value = [`Network: ${data.cidr}`, `Host range: ${data.firstHost} - ${data.lastHost}`, ...rows.map(([label, value]) => `${label}: ${value}`), `Usable hosts: ${data.usable}`, `Total addresses: ${data.total}`].join('\n');
          copy.disabled = false; pending.hidden = true;
          return parsed;
        } catch (exception) {
          results.innerHTML = ''; output.value = ''; copy.disabled = true; pending.hidden = showError;
          if (showError) {
            error.textContent = exception.message; error.hidden = false;
            const maskError = /prefix|subnet mask|mask/i.test(exception.message);
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
      copy.addEventListener('click', () => window.copyToolText(output.value, status, output));
      update();
    }
  });
})();
