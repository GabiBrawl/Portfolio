/* interactions.js - User interaction handlers */

/**
 * Wires up project hover interactions
 */
function wireProjectHoverInteractions() {
  const cards = document.querySelectorAll('.project');
  let hoverCount = 0;
  let lastHoverTime = 0;

  cards.forEach(card => {
    card.addEventListener('mouseenter', () => {
      const randomAngle = (Math.random() - 0.5) * 9; // small tilt
      card.style.transform = `scale(1.05) rotate(${randomAngle}deg)`;

      // small burst from the first 'a' tag inside .tags (if present)
      const tag = card.querySelector('.tags a');
      if (tag) {
        const rect = tag.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        smallBurst(centerX, centerY, 20);
      }

      // track rapid hovering for 'crazy party'
      const now = Date.now();
      if (now - lastHoverTime < 2000) {
        hoverCount++;
        if (hoverCount > 45) {
          crazyParty();
          hoverCount = 0;
        }
      } else {
        hoverCount = 1;
      }
      lastHoverTime = now;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
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

  function runEffect(type, ev) {
    // visual active state
    pfp.classList.add('effect-active');

    // All remaining effects are CSS animation classes applied to the image
    pfp.classList.add(type);
    // remove the class when animation ends
    pfp.addEventListener('animationend', function handler() {
      pfp.classList.remove(type);
      pfp.removeEventListener('animationend', handler);
    });

    // Cleanup active state shortly after last animation
    setTimeout(() => pfp.classList.remove('effect-active'), 900);
  }

  function onActivate(ev) {
    ev.preventDefault();
    const chosen = pickRandom(effects);
    runEffect(chosen, ev);
  }

  wrap.addEventListener('click', onActivate);
  // keyboard activation (Enter / Space)
  pfp.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') onActivate(e);
  });
  // small hover hint: occasionally nudge
  wrap.addEventListener('mouseenter', () => {
    // tiny, non-intrusive cue
    pfp.animate([
      { transform: 'translateY(0)' },
      { transform: 'translateY(-4px)' },
      { transform: 'translateY(0)' }
    ], { duration: 350, easing: 'ease-out' });
  });
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