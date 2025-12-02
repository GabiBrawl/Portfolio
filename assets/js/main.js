/* main.js - Application initialization */

(function () {
  'use strict';

  // Initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    wireProjectHoverInteractions();
    updateAge('age', CONFIG.BIRTH_DATE);
    wireTechScroller();
    wirePfpEffects();
    wireEmailCopy();
    wireCommandPalette();
    wireCursorGrab();
    wireShowMoreSocials();
  });

  // Remove preload class on window load
  window.addEventListener('load', () => {
    document.documentElement.classList.remove('preload');
  });

})();