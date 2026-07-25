/* interactions.js - User interaction handlers */

/**
 * Wires up project hover interactions with a single-card spam blocker
 * AND restores the rapid-hover 'crazyParty' easter egg!
 */
function wireProjectHoverInteractions() {
  const container = document.getElementById('dynamic-content');
  if (!container || container._hoverWired) return; // Prevent double-wiring completely!
  container._hoverWired = true;

  // ✦ EASTER EGG TRACKING STATE ✦
  let hoverCount = 0;
  let lastHoverTime = 0;

  container.addEventListener('mouseover', (e) => {
    const card = e.target.closest('.project');
    if (!card || card.classList.contains('is-hovered')) return;
    
    card.classList.add('is-hovered');
    const isMobile = window.innerWidth <= CONFIG.MOBILE_BREAKPOINT;
    
    if (!isMobile) {
      const now = Date.now();

      // 1. Calculate a slight visual tilt
      const randomAngle = (Math.random() - 0.5) * 6;
      card.style.transform = `scale(1.03) rotate(${randomAngle}deg)`;
      
      // 2. ✦ TRACK GLOBAL RAPID HOVER FOR CRAZY PARTY EASTER EGG ✦
      if (now - lastHoverTime < 2000) {
        hoverCount++;
        if (hoverCount > 45) {
          crazyParty(); // Set off the big colorful burst!
          hoverCount = 0; // Reset counter
        }
      } else {
        hoverCount = 1; // Reset counter if they took too long
      }
      lastHoverTime = now;

      // 3. SINGLE-CARD SPAM BLOCKER: Check if previous local particles are still alive
      const particleLifetime = 700;
      
      if (!card._lastBurstTime || (now - card._lastBurstTime >= particleLifetime)) {
        const tag = card.querySelector('.tags a');
        if (tag) {
          const rect = tag.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          
          smallBurst(centerX, centerY, 17); 
          card._lastBurstTime = now; // Lock this specific card's local burst
        }
      }
    }
  });

  container.addEventListener('mouseout', (e) => {
    const card = e.target.closest('.project');
    if (!card) return;
    
    // Ensure the mouse is genuinely leaving the card boundary
    const related = e.relatedTarget;
    if (related && card.contains(related)) return;

    card.classList.remove('is-hovered');
    card.style.transform = '';
  });
}

/**
 * Wires up profile picture click effects
 */
function wirePfpEffects() {
  const pfp = document.querySelector('.pfp');
  const wrap = document.querySelector('.pfp-wrap');
  if (!pfp || !wrap) return;

  const effects = ['effect-wobble', 'effect-spin', 'effect-bounce'];
  let isAnimating = false;

  function runEffect(type, ev) {
    if (isAnimating) return;
    isAnimating = true;
    
    // visual active state
    pfp.classList.add('effect-active');

    // All remaining effects are CSS animation classes applied to the image
    pfp.classList.add(type);
    // remove the class when animation ends
    pfp.addEventListener('animationend', function handler() {
      pfp.classList.remove(type);
      pfp.removeEventListener('animationend', handler);
      isAnimating = false;
    });

    // Cleanup active state shortly after last animation
    setTimeout(() => pfp.classList.remove('effect-active'), 900);
  }

  function onActivate(ev) {
    if (ev.target.closest('.sidebar-ko-fi')) return;
    ev.preventDefault();
    const chosen = pickRandom(effects);
    runEffect(chosen, ev);
  }

  wrap.addEventListener('click', onActivate);
  // keyboard activation (Enter / Space)
  pfp.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') onActivate(e);
  });
}

/**
 * Wires up show more button for socials on mobile
 */
function wireShowMoreSocials() {
  const showMoreBtn = document.getElementById('show-more-socials');
  const socialsContainer = document.querySelector('.socials');
  
  if (!showMoreBtn || !socialsContainer) return;
  
  const mainSocialLinks = Array.from(socialsContainer.children).filter(child => 
    child.tagName === 'A' && 
    child.classList.contains('large') && 
    !child.classList.contains('show-more-btn')
  );
  const extraSocials = socialsContainer.querySelector('.extra-socials');
  
  let isExpanded = false;
  
  function updateVisibility() {
    if (window.innerWidth <= CONFIG.MOBILE_BREAKPOINT) {
      // On mobile, show main links always, toggle extra socials
      mainSocialLinks.forEach(link => link.style.display = 'block');
      extraSocials.style.display = isExpanded ? 'block' : 'none';
      showMoreBtn.textContent = isExpanded ? 'Show Less' : 'Show More';
      showMoreBtn.style.display = 'block';
    } else {
      // On desktop, show all and hide button
      mainSocialLinks.forEach(link => link.style.display = 'block');
      extraSocials.style.display = 'block';
      showMoreBtn.style.display = 'none';
      isExpanded = true; // Consider it expanded on desktop
    }
  }
  
  // Initial state
  updateVisibility();
  
  showMoreBtn.addEventListener('click', (e) => {
    e.preventDefault();
    isExpanded = !isExpanded;
    updateVisibility();
  });
  
  // Handle window resize
  window.addEventListener('resize', updateVisibility);
}

/**
 * Wires up cursor change on mouse down
 */
function wireCursorGrab() {
  const body = document.body;

  document.addEventListener('mousedown', (e) => {
    if (e.button === 0) { // Left mouse button
      body.classList.add('grabbing');
    }
  });

  document.addEventListener('mouseup', () => {
    body.classList.remove('grabbing');
  });
}

/**
 * Wires up webring toggle button
 */
function wireWebringToggle() {
  const toggleBtn = document.querySelector('.webring-toggle');
  const content = document.querySelector('.webring-content');
  
  if (!toggleBtn || !content) return;
  
  let isExpanded = false;
  
  toggleBtn.addEventListener('click', (e) => {
    e.preventDefault();
    isExpanded = !isExpanded;
    if (isExpanded) {
      content.style.display = 'block';
      toggleBtn.textContent = 'Hide Webring';
    } else {
      content.style.display = 'none';
      toggleBtn.textContent = 'Part of the Hack Club Webring';
    }
  });
}

/**
 * Wires up Ko-fi widget toggle
 */
function wireKoFiWidget() {
  const trigger = document.getElementById('kofi-trigger');
  const panel = document.getElementById('kofi-widget-panel');
  const koFiWidgetUrl = 'https://ko-fi.com/gabibrawl/?hidefeed=true&widget=true&embed=true&preview=true';

  if (!trigger || !panel) return;

  if (panel.parentElement !== document.body) {
    document.body.appendChild(panel);
  }

  let isIframeLoaded = false;

  const ensureIframe = () => {
    let iframe = panel.querySelector('#kofiframe');
    if (iframe) return iframe;

    iframe = document.createElement('iframe');
    iframe.id = 'kofiframe';
    iframe.title = 'gabibrawl';
    iframe.className = 'kofi-widget-frame';
    iframe.loading = 'lazy';
    iframe.addEventListener('load', () => {
      isIframeLoaded = true;
      panel.classList.remove('is-loading');
    });
    panel.appendChild(iframe);
    return iframe;
  };

  const setOpen = (isOpen) => {
    if (isOpen && !isIframeLoaded) {
      const iframe = ensureIframe();
      panel.classList.add('is-loading');
      if (!iframe.getAttribute('src')) {
        iframe.setAttribute('src', koFiWidgetUrl);
      }
    }

    if (!isOpen) {
      panel.classList.remove('is-loading');
    }

    panel.hidden = !isOpen;
    panel.setAttribute('aria-busy', isOpen && !isIframeLoaded ? 'true' : 'false');
    trigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  };

  trigger.addEventListener('click', (e) => {
    e.preventDefault();
    const isOpen = !panel.hidden;
    setOpen(!isOpen);
  });

  document.addEventListener('click', (e) => {
    if (panel.hidden) return;
    if (trigger.contains(e.target) || panel.contains(e.target)) return;
    setOpen(false);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !panel.hidden) {
      setOpen(false);
    }
  });
}

/**
 * Wires up the secret 7-click footer easter egg to open the telemetry dashboard.
 * Features a clean, unadorned console readout with a 1-second dynamic data loop.
 */
function wireSecretDashboard() {
  const footer = document.querySelector('footer');
  const dashboard = document.getElementById('nerdy-dashboard');
  if (!footer || !dashboard) return;

  let clickCount = 0;
  let clickTimeout = null;
  let telemetryInterval = null; 

  footer.addEventListener('click', (e) => {
    const isFooterTarget = e.target.closest('.gb') || e.target.classList.contains('line') || e.target.tagName === 'FOOTER';
    if (!isFooterTarget) return;

    e.preventDefault();
    window.getSelection().removeAllRanges(); // Clears text selection highlights
    
    clickCount++;

    clearTimeout(clickTimeout);
    clickTimeout = setTimeout(() => { clickCount = 0; }, 2500);

    if (clickCount === 7) {
      clickCount = 0;
      clearTimeout(clickTimeout);
      
      if (!dashboard.hidden) return;

      // Render raw structural layout
      dashboard.innerHTML = `
        <h3>[ DEVELOPER DIAGNOSTICS ]</h3>
        <div class="nerdy-grid">
          <div class="nerdy-card">
            <h4>REPOSITORY TRANSMISSION</h4>
            <p id="diag-commit">Accessing network array...</p>
          </div>
          <div class="nerdy-card">
            <h4>RUNTIME PIPELINE</h4>
            <p id="diag-runtime">Loading layout footprints...</p>
          </div>
          <div class="nerdy-card">
            <h4>CONNECTIVITY PROFILE</h4>
            <p id="diag-network">Querying infrastructure...</p>
          </div>
        </div>
      `;

      dashboard.hidden = false;
      dashboard.removeAttribute('hidden');

      // Execute data pipelines
      fetchLatestCommit();
      populateStaticMetrics();

      // Spin up background telemetry loop
      clearInterval(telemetryInterval); 
      updateLiveTelemetry(); 
      telemetryInterval = setInterval(updateLiveTelemetry, 1000);
    }
  });

  async function fetchLatestCommit() {
    const commitEl = document.getElementById('diag-commit');
    if (!commitEl) return;
    try {
      const res = await fetch('https://api.github.com/repos/GabiBrawl/Portfolio/commits?per_page=2');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      
      // Bypasses automated workflow pushes, target-isolates your manual code commits
      const trueCommit = data[1] || data[0]; 
      
      commitEl.innerHTML = `
        SHA: ${trueCommit.sha.substring(0, 7)}<br>
        MSG: "${trueCommit.commit.message.split('\n')[0]}"<br>
        DATE: ${new Date(trueCommit.commit.committer.date).toLocaleDateString()}
      `;
    } catch (err) {
      commitEl.innerHTML = `ERROR: Tree payload unreachable.<br>STATUS: Offline / Rate-Limited`;
    }
  }

  function populateStaticMetrics() {
    const networkEl = document.getElementById('diag-network');
    if (!networkEl) return;

    const protocol = window.location.protocol.toUpperCase().replace(':', '');
    const swActive = navigator.serviceWorker && navigator.serviceWorker.controller ? 'ACTIVE' : 'BYPASS';
    const resolution = `${window.screen.width}x${window.screen.height}`;

    let platform = navigator.platform || 'UNKNOWN';
    if (navigator.userAgentData && navigator.userAgentData.platform) {
      platform = navigator.userAgentData.platform;
    }

    let bootLatency = 'N/A';
    if (window.performance) {
      const [navigation] = performance.getEntriesByType('navigation');
      if (navigation) {
        bootLatency = `${Math.round(navigation.duration)}ms`;
      }
    }

    networkEl.innerHTML = `
      PROTOCOL: ${protocol}<br>
      CACHE_CTRL: ${swActive}<br>
      DISPLAY: ${resolution}<br>
      OS_PLATFORM: ${platform.toUpperCase()}<br>
      BOOT_LATENCY: ${bootLatency}
    `;
  }

  function updateLiveTelemetry() {
    const runtimeEl = document.getElementById('diag-runtime');
    if (!runtimeEl) return;

    // Pull active JavaScript memory allocation live
    let memUsage = 'N/A';
    if (window.performance && window.performance.memory) {
      memUsage = `${Math.round(window.performance.memory.usedJSHeapSize / (1024 * 1024))}MB`;
    }

    const domNodes = document.getElementsByTagName('*').length;
    const netMode = navigator.onLine ? 'ONLINE' : 'OFFLINE';

    // Calculate system session uptime string
    const uptimeSeconds = Math.floor(performance.now() / 1000);
    const uptimeFormatted = uptimeSeconds >= 60 
      ? `${Math.floor(uptimeSeconds / 60)}m ${uptimeSeconds % 60}s` 
      : `${uptimeSeconds}s`;

    // ✦ REPLACEMENT: Swapped out the mobile network api for universal processor thread mapping ✦
    const cpuThreads = navigator.hardwareConcurrency || 'UNKNOWN';

    runtimeEl.innerHTML = `
      DOM_NODES: ${domNodes}<br>
      ALLOC_HEAP: ${memUsage}<br>
      NET_STATUS: ${netMode}<br>
      SYS_UPTIME: ${uptimeFormatted}<br>
      CPU_THREADS: ${cpuThreads}
    `;
  }
}
