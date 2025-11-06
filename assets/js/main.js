/* main.js - Application initialization */

(function () {
  'use strict';

  /**
   * Randomly positions the WiFi sticker on the page
   */
  function positionWifiSticker() {
    // Sticker is now positioned in sidebar via CSS, no random positioning needed
    return;
  }

  // Initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    wireProjectHoverInteractions();
    updateAge('age', '2007-02-07');
    wireTechScroller();
    wirePfpEffects();
    wireEmailCopy();
    wireCommandPalette();
    wireCursorGrab();
    positionWifiSticker();
  });

  // Remove preload class on window load
  window.addEventListener('load', () => {
    document.documentElement.classList.remove('preload');
  });

})();