/* utils.js - Utility functions */

/**
 * Converts degrees to radians
 * @param {number} angle - Angle in degrees
 * @returns {number} Angle in radians
 */
function convertDegreesToRadians(angle) {
  return (angle * Math.PI) / 180;
}

/**
 * Converts polar coordinates to cartesian coordinates
 * @param {number} angle - Angle in degrees
 * @param {number} distance - Distance from origin
 * @returns {Array<number>} [x, y] coordinates
 */
function convertPolarToCartesian(angle, distance) {
  const angleInRadians = convertDegreesToRadians(angle);
  const x = Math.cos(angleInRadians) * distance;
  const y = Math.sin(angleInRadians) * distance;
  return [x, y];
}

/**
 * Calculates age from birth date
 * @param {string} birthDateString - Birth date in YYYY-MM-DD format (defaults to CONFIG.BIRTH_DATE)
 * @returns {number} Age in years
 */
function getAge(birthDateString = CONFIG.BIRTH_DATE) {
  const birthDate = new Date(birthDateString);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}

/**
 * Updates an element with the calculated age
 * @param {string} elementId - ID of element to update
 * @param {string} birthDateString - Birth date in YYYY-MM-DD format
 */
function updateAge(elementId, birthDateString) {
  const el = document.getElementById(elementId);
  if (!el) return;

  el.textContent = getAge(birthDateString) + 'y';
}

/**
 * Picks a random element from an array
 * @param {Array} arr - Array to pick from
 * @returns {*} Random element from array
 */
function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}