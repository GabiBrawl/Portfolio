/* main.js - Application initialization */

(function () {
  'use strict';

  // Initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    wireProjectHoverInteractions();
    wireProjectCardClicks();
    updateAge('age', '2007-01-29');
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