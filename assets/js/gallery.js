// gallery.js - Gallery viewer and zoom functionality

(function() {
  'use strict';

  // Expose functions globally for app.js to use
  window.openZoomViewer = openZoomViewer;
  window.renderGalleryView = renderGalleryView;

  // Utility functions
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  function preloadImage(src) {
    const img = new Image();
    img.src = src;
    return img;
  }

  // Zoom viewer with pan and pinch-to-zoom
  function openZoomViewer(src, alt) {
    // State
    let scale = 1;
    let panX = 0;
    let panY = 0;
    let isDragging = false;
    let startX, startY;
    let lastTouchDist = 0;

    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'zoom-overlay';
    overlay.innerHTML = `
      <div class="zoom-container">
        <img src="${src}" alt="${alt}" class="zoom-image" draggable="false">
      </div>
      <div class="zoom-footer">
        <button class="zoom-close" aria-label="Close zoom viewer">✕ Close</button>
        <div class="zoom-controls">
          <button class="zoom-out" aria-label="Zoom out">−</button>
          <span class="zoom-level">100%</span>
          <button class="zoom-in" aria-label="Zoom in">+</button>
          <button class="zoom-reset" aria-label="Reset zoom">Reset</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const img = overlay.querySelector('.zoom-image');
    const container = overlay.querySelector('.zoom-container');
    const zoomLevel = overlay.querySelector('.zoom-level');
    const closeBtn = overlay.querySelector('.zoom-close');
    const zoomInBtn = overlay.querySelector('.zoom-in');
    const zoomOutBtn = overlay.querySelector('.zoom-out');
    const resetBtn = overlay.querySelector('.zoom-reset');

    function updateTransform() {
      img.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
      zoomLevel.textContent = `${Math.round(scale * 100)}%`;
    }

    function zoom(delta, centerX, centerY) {
      const oldScale = scale;
      scale = Math.max(0.5, Math.min(5, scale + delta));

      // Zoom toward cursor/touch point
      if (centerX !== undefined && centerY !== undefined) {
        const rect = container.getBoundingClientRect();
        const x = centerX - rect.left - rect.width / 2;
        const y = centerY - rect.top - rect.height / 2;
        panX -= x * (scale - oldScale) / oldScale;
        panY -= y * (scale - oldScale) / oldScale;
      }

      updateTransform();
    }

    function reset() {
      scale = 1;
      panX = 0;
      panY = 0;
      updateTransform();
    }

    // Debounced wheel zoom
    const debouncedZoom = debounce((delta, clientX, clientY) => {
      zoom(delta, clientX, clientY);
    }, 16); // ~60fps

    // Mouse wheel zoom
    container.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.2 : 0.2;
      debouncedZoom(delta, e.clientX, e.clientY);
    });

    // Mouse drag pan
    container.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      isDragging = true;
      startX = e.clientX - panX;
      startY = e.clientY - panY;
      container.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      panX = e.clientX - startX;
      panY = e.clientY - startY;
      updateTransform();
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
      container.style.cursor = 'grab';
    });

    // Touch pan and pinch-to-zoom with passive listeners where appropriate
    container.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        isDragging = true;
        startX = e.touches[0].clientX - panX;
        startY = e.touches[0].clientY - panY;
      } else if (e.touches.length === 2) {
        isDragging = false;
        lastTouchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      }
    }, { passive: true });

    container.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (e.touches.length === 1 && isDragging) {
        panX = e.touches[0].clientX - startX;
        panY = e.touches[0].clientY - startY;
        updateTransform();
      } else if (e.touches.length === 2) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        const delta = (dist - lastTouchDist) * 0.01;
        zoom(delta, centerX, centerY);
        lastTouchDist = dist;
      }
    });

    container.addEventListener('touchend', () => {
      isDragging = false;
    }, { passive: true });

    // Button controls
    zoomInBtn.addEventListener('click', () => zoom(0.25));
    zoomOutBtn.addEventListener('click', () => zoom(-0.25));
    resetBtn.addEventListener('click', reset);

    // Close function
    function close() {
      overlay.remove();
      document.removeEventListener('keydown', keyHandler);
    }

    closeBtn.addEventListener('click', close);

    // Click outside image to close
    container.addEventListener('click', (e) => {
      if (e.target === container) close();
    });

    const keyHandler = (e) => {
      if (e.key === 'Escape') close();
      if (e.key === '+' || e.key === '=') zoom(0.25);
      if (e.key === '-') zoom(-0.25);
      if (e.key === '0') reset();
    };
    document.addEventListener('keydown', keyHandler);
  }

  // Gallery view renderer with state-based updates
  let currentGalleryState = null;
  let galleryElements = null;

  function renderGalleryView(container, projectId, imgIndex = 0) {
    if (!container) {
      console.error('main-content element not found for gallery');
      return;
    }

    const loadedProjects = window.loadedProjects;
    const LOADING_HTML = '<p style="padding: 40px; text-align: center;">Loading project...</p>';
    const ERROR_HTML = (message) => `
      <div class="project-detail">
        <div class="project-header">
          <h1>ERROR</h1>
          <p class="project-subtitle">${message}</p>
        </div>
      </div>
    `;

    // Load project data if not already loaded
    if (!loadedProjects[projectId]) {
      const dynamicContent = document.getElementById('dynamic-content');
      dynamicContent.innerHTML = LOADING_HTML;

      fetch(`projects/post${projectId}.json?v=1`)
        .then(response => {
          if (!response.ok) throw new Error('Project not found');
          return response.json();
        })
        .then(data => {
          loadedProjects[projectId] = data;
          renderGalleryView(container, projectId, imgIndex);
        })
        .catch(error => {
          console.error('Error loading gallery:', error);
          const dynamicContent = document.getElementById('dynamic-content');
          const isOffline = !navigator.onLine || error.message.includes('fetch') || error.message.includes('network');
          dynamicContent.innerHTML = ERROR_HTML(
            isOffline 
              ? 'You appear to be offline. Please check your internet connection to view the gallery.' 
              : 'Could not load gallery'
          );
        });
      return;
    }

    const data = loadedProjects[projectId];
    const gallery = data.gallery || [];

    if (gallery.length === 0) {
      const dynamicContent = document.getElementById('dynamic-content');
      dynamicContent.innerHTML = ERROR_HTML('No images in gallery');
      return;
    }

    // Clamp index
    const currentIndex = Math.max(0, Math.min(imgIndex, gallery.length - 1));

    // If this is a new gallery, first render, or DOM elements don't exist, create the HTML structure
    if (!currentGalleryState || currentGalleryState.projectId !== projectId || !galleryElements || !document.querySelector('.gallery-viewer')) {
      currentGalleryState = { projectId, gallery, currentIndex };
      renderGalleryHTML(data, gallery, currentIndex);
      setupEventListeners(data, gallery);
    } else {
      // Update existing state
      currentGalleryState.currentIndex = currentIndex;
      updateGalleryState(gallery, currentIndex);
    }

    // Preload adjacent images
    preloadAdjacentImages(gallery, currentIndex);

    document.title = `${data.title} Gallery - Gabriel Yassin's Portfolio`;
  }

  function renderGalleryHTML(data, gallery, currentIndex) {
    const currentImage = gallery[currentIndex];
    const dynamicContent = document.getElementById('dynamic-content');
    dynamicContent.innerHTML = `
      <div class="gallery-viewer">
        <div class="gallery-top-bar">
          <a href="?post=${data.id || 0}" class="gallery-back" data-back aria-label="Back to ${data.title}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M19 12H5M12 19l-7-7 7-7"></svg>Back to ${data.title}</a>
          <span class="gallery-counter">${currentIndex + 1} / ${gallery.length}</span>
        </div>

        <div class="gallery-main">
          <button class="gallery-nav gallery-prev" ${currentIndex === 0 ? 'disabled' : ''} aria-label="Previous image">‹</button>

          <div class="gallery-image-container">
            <img src="${currentImage.src}" alt="${currentImage.alt}" class="gallery-image">
            ${currentImage.caption ? `<div class="gallery-image-caption">${currentImage.caption}</div>` : ''}
          </div>

          <button class="gallery-nav gallery-next" ${currentIndex === gallery.length - 1 ? 'disabled' : ''} aria-label="Next image">›</button>
        </div>

        <div class="gallery-bottom">
          <div class="gallery-mobile-nav">
            <button class="gallery-nav gallery-prev-mobile" ${currentIndex === 0 ? 'disabled' : ''} aria-label="Previous image">‹</button>
            <button class="gallery-nav gallery-next-mobile" ${currentIndex === gallery.length - 1 ? 'disabled' : ''} aria-label="Next image">›</button>
          </div>
          <div class="gallery-thumbnails">
            ${gallery.map((img, i) => `
              <div class="gallery-thumb ${i === currentIndex ? 'active' : ''}" data-index="${i}" role="button" tabindex="0" aria-label="View image ${i + 1}">
                <img src="${img.src}" alt="${img.alt}" loading="lazy">
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    // Cache element references
    galleryElements = {
      counter: dynamicContent.querySelector('.gallery-counter'),
      image: dynamicContent.querySelector('.gallery-image'),
      caption: dynamicContent.querySelector('.gallery-image-caption'),
      prevBtn: dynamicContent.querySelector('.gallery-prev'),
      nextBtn: dynamicContent.querySelector('.gallery-next'),
      prevBtnMobile: dynamicContent.querySelector('.gallery-prev-mobile'),
      nextBtnMobile: dynamicContent.querySelector('.gallery-next-mobile'),
      thumbs: dynamicContent.querySelectorAll('.gallery-thumb'),
      thumbnails: dynamicContent.querySelector('.gallery-thumbnails'),
      backBtn: dynamicContent.querySelector('.gallery-back[data-back]')
    };
  }

  function updateGalleryState(gallery, currentIndex) {
    if (!galleryElements) return;

    const currentImage = gallery[currentIndex];

    // Update counter
    galleryElements.counter.textContent = `${currentIndex + 1} / ${gallery.length}`;

    // Update image
    galleryElements.image.src = currentImage.src;
    galleryElements.image.alt = currentImage.alt;

    // Update caption
    if (currentImage.caption) {
      if (!galleryElements.caption) {
        // Create caption div if it doesn't exist
        const captionDiv = document.createElement('div');
        captionDiv.className = 'gallery-image-caption';
        galleryElements.image.parentNode.appendChild(captionDiv);
        galleryElements.caption = captionDiv;
      }
      galleryElements.caption.textContent = currentImage.caption;
    } else {
      if (galleryElements.caption) {
        // Remove caption div if it exists but there's no caption
        galleryElements.caption.remove();
        galleryElements.caption = null;
      }
    }

    // Update button states
    galleryElements.prevBtn.disabled = currentIndex === 0;
    galleryElements.nextBtn.disabled = currentIndex === gallery.length - 1;
    galleryElements.prevBtnMobile.disabled = currentIndex === 0;
    galleryElements.nextBtnMobile.disabled = currentIndex === gallery.length - 1;

    // Update thumbnail active state
    galleryElements.thumbs.forEach((thumb, i) => {
      thumb.classList.toggle('active', i === currentIndex);
    });
  }

  function preloadAdjacentImages(gallery, currentIndex) {
    // Preload next and previous images
    const indices = [currentIndex - 1, currentIndex + 1].filter(i => i >= 0 && i < gallery.length);
    indices.forEach(i => preloadImage(gallery[i].src));
  }

  function setupEventListeners(data, gallery) {
    if (!galleryElements) return;

    // Clean up previous listeners
    if (window._galleryKeyHandler) {
      document.removeEventListener('keydown', window._galleryKeyHandler);
    }

    function goToImage(index) {
      const clampedIndex = Math.max(0, Math.min(index, gallery.length - 1));
      if (clampedIndex !== currentGalleryState.currentIndex) {
        history.pushState(null, '', `?post=${currentGalleryState.projectId}&gallery&img=${clampedIndex}`);
        currentGalleryState.currentIndex = clampedIndex;
        updateGalleryState(gallery, clampedIndex);
        preloadAdjacentImages(gallery, clampedIndex);
      }
    }

    // Back button
    if (galleryElements.backBtn) {
      galleryElements.backBtn.addEventListener('click', (e) => {
        e.preventDefault();
        history.pushState(null, '', `?post=${currentGalleryState.projectId}`);
        window.renderContent();
        window.wireInteractions();
      });
    }

    // Navigation buttons
    if (galleryElements.prevBtn) galleryElements.prevBtn.addEventListener('click', () => goToImage(currentGalleryState.currentIndex - 1));
    if (galleryElements.nextBtn) galleryElements.nextBtn.addEventListener('click', () => goToImage(currentGalleryState.currentIndex + 1));
    if (galleryElements.prevBtnMobile) galleryElements.prevBtnMobile.addEventListener('click', () => goToImage(currentGalleryState.currentIndex - 1));
    if (galleryElements.nextBtnMobile) galleryElements.nextBtnMobile.addEventListener('click', () => goToImage(currentGalleryState.currentIndex + 1));

    // Zoom on image click
    if (galleryElements.image) {
      galleryElements.image.addEventListener('click', () => {
        const currentImage = gallery[currentGalleryState.currentIndex];
        openZoomViewer(currentImage.src, currentImage.alt);
      });
    }

    // Thumbnail clicks using event delegation
    if (galleryElements.thumbnails) {
      galleryElements.thumbnails.addEventListener('click', (e) => {
        const thumb = e.target.closest('.gallery-thumb');
        if (thumb) {
          const index = parseInt(thumb.dataset.index);
          goToImage(index);
        }
      });
    }

    // Keyboard navigation
    const keyHandler = (e) => {
      if (e.key === 'ArrowLeft' && currentGalleryState.currentIndex > 0) goToImage(currentGalleryState.currentIndex - 1);
      if (e.key === 'ArrowRight' && currentGalleryState.currentIndex < gallery.length - 1) goToImage(currentGalleryState.currentIndex + 1);
      if (e.key === 'Escape') {
        history.pushState(null, '', `?post=${currentGalleryState.projectId}`);
        window.renderContent();
        window.wireInteractions();
      }
    };
    document.addEventListener('keydown', keyHandler);
    window._galleryKeyHandler = keyHandler;
  }
})();
