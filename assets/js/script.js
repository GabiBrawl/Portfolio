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

  // Initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    wireProjectHoverInteractions();
    updateAge('age', '2007-02-07');
  });

  // Remove the preload class only after all resources (images, css, etc.) have loaded
  window.addEventListener('load', () => {
    document.documentElement.classList.remove('preload');
  });

})();
