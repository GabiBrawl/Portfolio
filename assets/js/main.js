/* main.js - Application initialization */

(function () {
  'use strict';

  // Initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    wireProjectHoverInteractions();
    updateAge('age', '2007-02-07');
    wireTechScroller();
    wirePfpEffects();
    wireEmailCopy();
    wireCommandPalette();
    wireCursorGrab();
  });

  // Remove preload class on window load
  window.addEventListener('load', () => {
    document.documentElement.classList.remove('preload');
  });

})();