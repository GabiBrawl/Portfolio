/* interactions.js - User interaction handlers */

/**
 * Wires up project hover interactions efficiently using event delegation
 */
function wireProjectHoverInteractions() {
  const container = document.getElementById('dynamic-content');
  if (!container || container._hoverWired) return; // Prevent double-wiring completely!
  container._hoverWired = true;

  // Track hovers using a single root delegate listener
  container.addEventListener('mouseover', (e) => {
    const card = e.target.closest('.project');
    if (!card || card.classList.contains('is-hovered')) return;
    
    card.classList.add('is-hovered');
    const isMobile = window.innerWidth <= CONFIG.MOBILE_BREAKPOINT;
    
    if (!isMobile) {
      // Calculate a slight tilt angle cleanly
      const randomAngle = (Math.random() - 0.5) * 6;
      card.style.transform = `scale(1.03) rotate(${randomAngle}deg)`;
      
      // OPTIMIZATION: Reduce particle count from 20 to 6 to stop DOM-bombing
      const tag = card.querySelector('.tags a');
      if (tag) {
        const rect = tag.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        smallBurst(centerX, centerY, 17); 
      }
    }
  });

  container.addEventListener('mouseout', (e) => {
    const card = e.target.closest('.project');
    if (!card) return;
    
    // Ensure the mouse is genuinely leaving the card boundary, not just moving inside child tags
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