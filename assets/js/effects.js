/* effects.js - Particle effects and animations */

/**
 * Creates a particle effect
 * @param {Object} options - Particle options
 * @param {string} options.left - Left position
 * @param {string} options.top - Top position
 * @param {string} options.color - Particle color
 * @param {string} options.tx - X translation
 * @param {string} options.ty - Y translation
 * @param {number} options.lifetime - Particle lifetime in ms
 */
function createParticle({ left, top, color = 'var(--primary)', tx = '0px', ty = '0px', lifetime = 1000 }) {
  const particle = document.createElement('div');
  particle.className = 'particle';
  particle.style.left = left;
  particle.style.top = top;
  particle.style.background = color;
  particle.style.setProperty('--tx', tx);
  particle.style.setProperty('--ty', ty);
  particle.style.zIndex = '1000';
  document.body.appendChild(particle);
  setTimeout(() => particle.remove(), lifetime);
}

/**
 * Creates a small burst of particles
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} count - Number of particles
 */
function smallBurst(x, y, count = 20) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * 360;
    const distance = Math.random() * 100 + 50;
    const [px, py] = convertPolarToCartesian(angle, distance);
    createParticle({
      left: x + 'px',
      top: y + 'px',
      color: 'var(--primary)',
      tx: px + 'px',
      ty: py + 'px',
      lifetime: 1000
    });
  }
}

/**
 * Creates a crazy party effect with random bursts
 */
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
      createParticle({
        left: left + 'px',
        top: top + 'px',
        color,
        tx: px + 'px',
        ty: py + 'px',
        lifetime: 1500
      });
    }, Math.random() * 2000);
  }
}