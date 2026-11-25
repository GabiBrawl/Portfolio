(function () {
  'use strict';

  const DEFAULT_ZONES = [
    'Europe/Lisbon', 'America/New_York', 'Europe/London', 'Asia/Tokyo',
    'Australia/Sydney', 'Asia/Dubai', 'Asia/Singapore', 'America/Los_Angeles'
  ];
  const state = { zones: [...DEFAULT_ZONES], active: 'Europe/Lisbon' };
  const cityName = zone => zone.split('/').pop().replaceAll('_', ' ');
  const zoneLabel = zone => `${cityName(zone)} · ${zone.split('/').slice(0, -1).join('/')}`;
  const supportedZones = () => typeof Intl.supportedValuesOf === 'function'
    ? Intl.supportedValuesOf('timeZone')
    : [...new Set([...DEFAULT_ZONES, 'Pacific/Auckland', 'America/Sao_Paulo', 'Africa/Cairo', 'Asia/Kolkata'])];

  window.portfolioTools.set('world-clock', {
    title: 'World Clock',
    description: 'Check the current time across cities around the world.',
    getShareState: () => ({ city: state.active, zones: state.zones.join(',') }),
    render: () => `
      <section class="tool-workspace world-clock">
        <section class="world-clock-face" aria-labelledby="world-clock-city">
          <div class="world-clock-face-top"><span class="tool-eyebrow">Local time</span><span class="world-clock-sync" data-sync-status role="status" aria-live="polite">Checking online time…</span></div>
          <h2 id="world-clock-city" data-active-city></h2>
          <time class="world-clock-time" data-active-time aria-live="off">--:--:--</time>
          <p class="world-clock-date" data-active-date></p>
          <p class="world-clock-zone" data-active-zone></p>
        </section>
        <div class="world-clock-add">
          <label for="world-clock-zone-select">Add a city</label>
          <div class="world-clock-add-controls">
            <select class="tool-control" id="world-clock-zone-select" data-zone-select></select>
            <button type="button" class="tool-button tool-button-primary" data-add-zone>Add city</button>
          </div>
          <p class="tool-note">Times are shown in each city’s local timezone.</p>
        </div>
        <section class="world-clock-cities" aria-labelledby="world-clock-cities-title">
          <div class="world-clock-cities-heading"><div><span class="tool-eyebrow">Your cities</span><h2 id="world-clock-cities-title">World clocks</h2></div><span class="world-clock-city-count" data-city-count></span></div>
          <div class="world-clock-city-list" data-city-list></div>
        </section>
      </section>`,
    mount(container) {
      const params = window.readToolState();
      if (params.has('zones')) {
        const sharedZones = params.get('zones').split(',').filter(zone => supportedZones().includes(zone));
        if (sharedZones.length) state.zones = [...new Set(sharedZones)].slice(0, 16);
      }
      if (params.has('city') && supportedZones().includes(params.get('city'))) state.active = params.get('city');
      if (!state.zones.includes(state.active)) state.zones.unshift(state.active);

      const root = container.querySelector('.world-clock');
      const activeCity = root.querySelector('[data-active-city]');
      const activeTime = root.querySelector('[data-active-time]');
      const activeDate = root.querySelector('[data-active-date]');
      const activeZone = root.querySelector('[data-active-zone]');
      const syncStatus = root.querySelector('[data-sync-status]');
      const select = root.querySelector('[data-zone-select]');
      const list = root.querySelector('[data-city-list]');
      const cityCount = root.querySelector('[data-city-count]');
      let syncedClock = null;
      let syncRequest = 0;
      let syncInterval = 0;
      let tickInterval = 0;
      let syncController = null;

      const currentTime = () => syncedClock
        ? syncedClock.unixMs + performance.now() - syncedClock.performanceMs
        : Date.now();

      function buildCityOptions() {
        const zones = supportedZones();
        const featured = DEFAULT_ZONES.filter(zone => zones.includes(zone));
        const ordered = [...featured, ...zones.filter(zone => !featured.includes(zone))];
        select.innerHTML = ordered.map(zone => `<option value="${zone}">${zoneLabel(zone)}</option>`).join('');
      }

      function formatTime(zone, options) {
        return new Intl.DateTimeFormat(undefined, { timeZone: zone, ...options }).format(currentTime());
      }

      function render() {
        if (!state.zones.includes(state.active)) state.active = state.zones[0] || DEFAULT_ZONES[0];
        activeCity.textContent = cityName(state.active);
        activeZone.textContent = state.active.replaceAll('_', ' ');
        activeTime.textContent = formatTime(state.active, { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
        activeDate.textContent = formatTime(state.active, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        list.innerHTML = state.zones.map(zone => {
          const selected = zone === state.active;
          const offset = formatTime(zone, { timeZoneName: 'short' }).split(' ').pop();
          return `<article class="world-clock-city${selected ? ' is-active' : ''}" data-city="${zone}">
            <button type="button" class="world-clock-city-select" data-select-city="${zone}" aria-pressed="${selected}">
              <span class="world-clock-city-name">${cityName(zone)}</span><span class="world-clock-city-time" data-time-for="${zone}">${formatTime(zone, { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })}</span>
              <span class="world-clock-city-zone">${zone.replaceAll('_', ' ')} · ${offset}</span>
            </button>
            ${state.zones.length > 1 ? `<button type="button" class="world-clock-remove" data-remove-city="${zone}" aria-label="Remove ${cityName(zone)}">×</button>` : ''}
          </article>`;
        }).join('');
        cityCount.textContent = `${state.zones.length} ${state.zones.length === 1 ? 'city' : 'cities'}`;
      }

      function tick() {
        activeTime.dateTime = new Date(currentTime()).toISOString();
        activeTime.textContent = formatTime(state.active, { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
        activeDate.textContent = formatTime(state.active, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        list.querySelectorAll('[data-time-for]').forEach(node => {
          node.textContent = formatTime(node.dataset.timeFor, { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
        });
      }

      async function syncTime() {
        const request = ++syncRequest;
        let responseRecorded = false;
        const controller = new AbortController();
        syncController = controller;
        const timeout = window.setTimeout(() => controller.abort(), 5000);
        const startedAt = performance.now();
        try {
          const response = await fetch('https://utctime.app/api/now', { cache: 'no-store', signal: controller.signal });
          const payload = await response.json();
          window.recordUtcTimeApiResponse({ endpoint: 'https://utctime.app/api/now', receivedAt: new Date().toISOString(), status: response.status, payload });
          responseRecorded = true;
          if (!response.ok) throw new Error('Time service unavailable.');
          const unixMs = Number(payload.unix_ms ?? Number(payload.unix) * 1000);
          if (!Number.isFinite(unixMs) || unixMs < 1 || request !== syncRequest) throw new Error('Invalid time response.');
          const receivedAt = performance.now();
          syncedClock = { unixMs: unixMs + (receivedAt - startedAt) / 2, performanceMs: receivedAt };
          syncStatus.textContent = 'Time synced online';
        } catch {
          if (request === syncRequest) {
            syncedClock = null;
            if (!responseRecorded) window.recordUtcTimeApiResponse({ endpoint: 'https://utctime.app/api/now', receivedAt: new Date().toISOString(), status: 'FETCH_FAILED', error: 'Could not read the online time; using the device clock.' });
            syncStatus.textContent = 'Using device clock';
          }
        } finally {
          clearTimeout(timeout);
          if (request === syncRequest) tick();
        }
      }

      buildCityOptions();
      render();
      tickInterval = window.setInterval(tick, 1000);
      syncTime();
      syncInterval = window.setInterval(syncTime, 5 * 60 * 1000);

      root.querySelector('[data-add-zone]').addEventListener('click', () => {
        const zone = select.value;
        if (!zone || state.zones.includes(zone)) return;
        if (state.zones.length >= 16) {
          syncStatus.textContent = 'You can keep up to 16 cities in this view.';
          return;
        }
        state.zones.push(zone);
        state.active = zone;
        render();
        tick();
      });
      list.addEventListener('click', event => {
        const selectButton = event.target.closest('[data-select-city]');
        if (selectButton) {
          state.active = selectButton.dataset.selectCity;
          render();
          tick();
          return;
        }
        const removeButton = event.target.closest('[data-remove-city]');
        if (removeButton) {
          const removed = removeButton.dataset.removeCity;
          state.zones = state.zones.filter(zone => zone !== removed);
          if (state.active === removed) state.active = state.zones[0] || DEFAULT_ZONES[0];
          render();
          tick();
        }
      });
      window.activeToolCleanup = () => {
        clearInterval(tickInterval);
        clearInterval(syncInterval);
        syncRequest++;
        syncController?.abort();
        syncedClock = null;
        window.activeToolCleanup = null;
      };
    }
  });
})();
