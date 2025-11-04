/* script.js
   Cleaned and modular client-side behavior extracted from index.html.
   - Handles project hover interactions and particle effects.
   - Calculates/display age.
*/

(function () {
  'use strict';

  const convertDegreesToRadians = angle => (angle * Math.PI) / 180;

  const convertPolarToCartesian = (angle, distance) => {
    const angleInRadians = convertDegreesToRadians(angle);
    const x = Math.cos(angleInRadians) * distance;
    const y = Math.sin(angleInRadians) * distance;
    return [x, y];
  };

  function createParticle({ left, top, color = 'var(--white)', tx = '0px', ty = '0px', lifetime = 1000 }) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.left = left;
    particle.style.top = top;
    particle.style.background = color;
    particle.style.setProperty('--tx', tx);
    particle.style.setProperty('--ty', ty);
    document.body.appendChild(particle);
    setTimeout(() => particle.remove(), lifetime);
  }

  function smallBurst(x, y, count = 20) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * 360;
      const distance = Math.random() * 100 + 50;
      const [px, py] = convertPolarToCartesian(angle, distance);
      createParticle({ left: x + 'px', top: y + 'px', color: 'var(--white)', tx: px + 'px', ty: py + 'px', lifetime: 1000 });
    }
  }

  function crazyParty() {
    // staggered bursts across the viewport
    for (let i = 0; i < 100; i++) {
      setTimeout(() => {
        const left = Math.random() * window.innerWidth;
        const top = Math.random() * window.innerHeight;
        const hue = 165 + Math.random() * (342 - 165);
        const color = `hsl(${hue}, 100%, 77%)`;
        const angle = Math.random() * 360;
        const distance = Math.random() * 200 + 100;
        const [px, py] = convertPolarToCartesian(angle, distance);
        createParticle({ left: left + 'px', top: top + 'px', color, tx: px + 'px', ty: py + 'px', lifetime: 1500 });
      }, Math.random() * 2000);
    }
  }

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

  function updateAge(elementId, birthDateString) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const birthDate = new Date(birthDateString);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    el.textContent = age + 'y';
  }

  /* --- Tech scroller dynamic population ---
     Builds a randomized sequence of words (including new entries) and
     injects them into the existing `.scroller-content` element. The
     sequence is duplicated to create a seamless infinite loop.
  */
  function shuffleArray(arr) {
    // Fisher-Yates shuffle
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function buildScroller() {
    const scroller = document.querySelector('.scroller-content');
    if (!scroller) return;

    // Existing words (kept from original markup)
    const words = [
      'LINUX BTW', 'WINDOWS', 'C++', 'C', 'AI', 'PCB', '$BTC', 'MEMES', 'VS CODE', 'GIT',
      'COOL SHIT', 'OMARCHY', 'EMBEDDED DEV', 'ML', '.AF', 'THINKPAD', 'PROTON', 'ZEN',
      'NBHD', 'SOFTCORE', 'xD', 'NOTHING', 'ART', 'CYBERSIGILISM', 'VALORANT', 'BRAVE BROWSER',
      'UBUNTU', 'HTML', 'AFFINITY', 'FIGMA', 'YAPPER', 'X [DOT] COM', 'TESLA', 'ESPRESSIF',
      'MIATAAA', 'CHOC CHIP COOKIES', 'OPEN SOURCE', 'RETRO FTW', 'CASH IS KING'
    ];

    // Merge and shuffle
    const randomizedWords = shuffleArray(words);

    // Build HTML with star separators; duplicate sequence for seamless loop
    const buildSequence = seq => seq.map(w => `<span class="star"></span> ${w} `).join('');
    // Duplicate sequence for seamless looping
    const html = buildSequence(randomizedWords) + buildSequence(randomizedWords);
    scroller.innerHTML = html;
  }

  /* --- Smooth pixel-based scroller animation (requestAnimationFrame) ---
     Replaces the CSS keyframe animation to avoid the visible jump when the
     animation resets. We move the `.scroller-content` left in pixels and
     wrap when we've scrolled one sequence width.
  */
  let _rafId = null;
  function startScrollerAnimation() {
    const scroller = document.querySelector('.scroller-content');
    if (!scroller) return;

    // disable any CSS animation on the element
    scroller.style.animation = 'none';
    scroller.style.willChange = 'transform';

    let last = performance.now();
    let offset = 0; // negative px (we'll subtract)
    let sequenceWidth = scroller.scrollWidth / 2 || 0; // half since we duplicated sequence
  const durationSeconds = 30; // original approximate duration for one loop

    function update(now) {
      const dt = (now - last) / 1000; // seconds
      last = now;
      // recalc if sequenceWidth is 0 or on resize (lazy: check each frame occasionally)
      if (!sequenceWidth || scroller._lastWidth !== scroller.scrollWidth) {
        sequenceWidth = scroller.scrollWidth / 2 || 0;
        scroller._lastWidth = scroller.scrollWidth;
      }

  // compute speed based on current sequence width so resizing keeps a consistent period
  const speed = sequenceWidth > 0 ? sequenceWidth / durationSeconds : 0;
  offset -= speed * dt;

      // wrap smoothly
      if (sequenceWidth > 0 && -offset >= sequenceWidth) {
        offset += sequenceWidth;
      }

      scroller.style.transform = `translateX(${offset}px)`;
      _rafId = requestAnimationFrame(update);
    }

    if (_rafId) cancelAnimationFrame(_rafId);
    _rafId = requestAnimationFrame(update);
  }

  function stopScrollerAnimation() {
    if (_rafId) cancelAnimationFrame(_rafId);
    _rafId = null;
  }

  // Initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    wireProjectHoverInteractions();
    updateAge('age', '2007-02-07');
    buildScroller();
    // start smooth scroller animation after building content
    startScrollerAnimation();
  });

  /* --- Profile picture click effects --- */
  function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }


  // NOTE: burst effect removed. `smallBurst` is still used by project hover interactions.

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

  // wire pfp effects after DOM loaded
  document.addEventListener('DOMContentLoaded', wirePfpEffects);

  /* --- Email copy functionality --- */
  function wireEmailCopy() {
    const emailLink = document.getElementById('email-link');
    if (!emailLink) return;

    emailLink.addEventListener('click', async (e) => {
      e.preventDefault();
      const email = 'gabiya219@gmail.com';
      try {
        await navigator.clipboard.writeText(email);
        const originalText = emailLink.textContent;
        emailLink.textContent = 'Copied!';
        emailLink.classList.add('copied');
        setTimeout(() => {
          emailLink.textContent = originalText;
          emailLink.classList.remove('copied');
        }, 2000);
      } catch (err) {
        console.error('Failed to copy email: ', err);
        // Fallback: open mailto
        window.location.href = `mailto:${email}`;
      }
    });
  }

  // wire email copy after DOM loaded
  document.addEventListener('DOMContentLoaded', wireEmailCopy);

  // Remove the preload class only after all resources (images, css, etc.) have loaded
  window.addEventListener('load', () => {
    document.documentElement.classList.remove('preload');
  });

})();
