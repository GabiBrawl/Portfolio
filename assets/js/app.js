// app.js - Dynamic content render for the single-page app
// Handles both the projects list view and the individual project views based on URL

(function () {
  'use strict';

// Store loaded project data - exposed globally for gallery.js
const loadedProjects = {};
window.loadedProjects = loadedProjects;
let cachedProjects = null;
let currentGalleryPreviewCount = null;

  // Constants
  const BACK_LINK_HTML = '<a href="#" class="back-link" onclick="history.pushState(null, \'\', window.location.pathname); window.renderContent(); window.wireInteractions(); return false;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M19 12H5M12 19l-7-7 7-7"></svg>Back to Portfolio</a>';
  const LOADING_HTML = '<p style="padding: 40px; text-align: center;">Loading project...</p>';
  const ERROR_HTML = (message) => `
<div class="project-detail">
              <div class="project-header">
                <h1>ERROR</h1>
                <p class="project-subtitle">${message}</p>
              </div>
              ${BACK_LINK_HTML}
            </div>
          `;

  document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('main-content');
    if (!container) {
      console.error('main-content element not found');
      return;
    }

    const view = getViewMode();

    if (view.mode === 'project' && !loadedProjects[view.id]) {
      const dynamicContent = document.getElementById('dynamic-content');
      dynamicContent.innerHTML = LOADING_HTML;

      fetch(`posts/post${view.id}.json`)
        .then(response => {
          if (!response.ok) {
            throw new Error(`Project not found (HTTP ${response.status})`);
          }
          return response.json();
        })
        .then(data => {
          if (data && data.title) {
            loadedProjects[view.id] = data;
            renderContent();
            wireInteractions();
          } else {
            const dynamicContent = document.getElementById('dynamic-content');
            dynamicContent.innerHTML = ERROR_HTML('Invalid project data format');
          }
        })
        .catch(error => {
          console.error('Error loading project:', error);
          const isOffline = !navigator.onLine || error.message.includes('fetch') || error.message.includes('network');
          const errorMessage = isOffline
            ? 'You appear to be offline. Please check your internet connection to view this project.'
            : error.message.includes('Project not found')
              ? 'Project not found. Please check the URL and try again.'
              : 'Error loading project: ' + error.message;
          const dynamicContent = document.getElementById('dynamic-content');
          dynamicContent.innerHTML = ERROR_HTML(errorMessage);
        });
    } else {
      renderContent();
      wireInteractions();
    }
  });

  window.addEventListener('popstate', () => {
    renderContent();
    wireInteractions();
  });

  // Re-render the gallery strip if a resize changes how many tiles fit
  // (e.g. rotating a phone, or crossing the mobile breakpoint on desktop).
  let resizeDebounce;
  window.addEventListener('resize', () => {
    clearTimeout(resizeDebounce);
    resizeDebounce = setTimeout(() => {
      const view = getViewMode();
      if (view.mode !== 'project' || !loadedProjects[view.id]) return;
      const data = loadedProjects[view.id];
      if (!data.gallery || data.gallery.length === 0) return;
      if (computeGalleryPreviewCount() !== currentGalleryPreviewCount) {
        renderProjectView(document.getElementById('main-content'), view.id);
      }
    }, 200);
  });

  // One row of gallery tiles on desktop, two rows on mobile — column count
  // is derived from the same tile-width/gap math as the CSS grid so it
  // lines up with however many tiles actually fit per row.
  function computeGalleryPreviewCount() {
    const isMobile = window.innerWidth <= CONFIG.MOBILE_BREAKPOINT;
    const sidebarWidth = isMobile ? 0 : 310; // matches .sidebar width in layout.css
    const mainPadding = 40; // .main's 20px padding on each side
    const rawWidth = window.innerWidth - sidebarWidth - mainPadding;
    const availableWidth = Math.min(Math.max(rawWidth, 0), 1200);
    const tileMinWidth = isMobile ? 100 : 160; // matches .gallery-strip minmax()
    const gap = 12;
    const columns = Math.max(1, Math.floor((availableWidth + gap) / (tileMinWidth + gap)));
    const rows = isMobile ? 2 : 1;
    return Math.max(1, (columns * rows) - 1);
  }

  function getViewMode() {
    const params = new URLSearchParams(window.location.search);
    const postId = params.get('post');
    const img = params.get('img');
    if (postId && params.has('gallery')) {
      return { mode: 'gallery', id: postId, imgIndex: img ? parseInt(img) : 0 };
    }
    return postId ? { mode: 'project', id: postId } : { mode: 'projects' };
  }

  function renderContent() {
    const view = getViewMode();
    const container = document.getElementById('main-content');

    if (!container) {
      console.error('main-content element not found');
      return;
    }

    if (window._galleryKeyHandler && view.mode !== 'gallery') {
      document.removeEventListener('keydown', window._galleryKeyHandler);
      window._galleryKeyHandler = null;
    }

    if (window._sideTocMoveHandler && view.mode !== 'project') {
      document.removeEventListener('mousemove', window._sideTocMoveHandler);
      window._sideTocMoveHandler = null;
    }

    if (view.mode === 'gallery') {
      window.renderGalleryView(container, view.id, view.imgIndex);
    } else if (view.mode === 'project') {
      renderProjectView(container, view.id);
    } else {
      renderProjectsListView(container);
    }
  }

  window.renderContent = renderContent;

  // Loads the lightweight card manifest instead of every full post JSON.
  function loadProjects() {
    if (cachedProjects) {
      return Promise.resolve(cachedProjects);
    }

    return fetch('posts/index.json')
      .then(response => {
        if (!response.ok) {
          throw new Error(`Project index not found (HTTP ${response.status})`);
        }
        return response.json();
      })
      .then(manifest => {
        const projects = manifest.map(entry => ({
          id: entry.id,
          title: entry.title,
          description: entry.description,
          image: entry.cardImage,
          logo: entry.cardLogo,
          logoStyle: entry.cardLogoStyle,
          tags: entry.cardTags || [],
          flags: entry.flags || [],
          lastUpdated: entry.lastUpdated || null
        }));
        cachedProjects = projects;
        return projects;
      })
      .catch(error => ({ offline: true, error: error.message }));
  }

  function renderProjectsListView(container) {
    document.title = "Gabi's Portfolio";
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.content = "Gabi's Portfolio";
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.content = "Full-stack developer, programmer and electronics enthusiast building clean web pages and custom hardware.";

    const dynamicContent = document.getElementById('dynamic-content');
    dynamicContent.innerHTML = '<p style="padding: 40px; text-align: center;">Loading projects...</p>';

    loadProjects().then(projects => {
      if (projects.offline) {
        const dynamicContent = document.getElementById('dynamic-content');
        dynamicContent.innerHTML = `
          <div class="error-box">
            <h2>Unable to load projects</h2>
            <p>You appear to be offline. Please check your internet connection.</p>
            <p><small>Error: ${projects.error}</small></p>
          </div>
        `;
        return;
      }
      const validProjects = projects.filter(p => p !== null);

      let html = `<div class="project-grid">`;

      validProjects.forEach(project => {
        if (!project.flags.includes('disabled')) {
          html += `
            <div class="project" data-project-id="${project.id}" tabindex="0" role="button" aria-label="Open ${project.title}">
              <img src="${project.image}" alt="Project Image" width="400" height="200" loading="lazy" decoding="async">
              ${project.logo ? `<img class="project-logo" src="${project.logo}" alt="Project Logo" style="${project.logoStyle}">` : ''}
              ${project.flags.includes('in-progress') ? '<span class="in-progress-badge">In Progress</span>' : ''}
              <h3>${project.title}</h3>
              <p>${project.description}</p>
              <div class="tags">
                ${project.tags.map(tag =>
                  tag.link
                    ? `<a href="${tag.link}" target="_blank">${tag.text}</a>`
                    : `<span>${tag.text}</span>`
                ).join('')}
              </div>
            </div>
          `;
        };
      });

      html += `</div>`;

      const dynamicContent = document.getElementById('dynamic-content');
      dynamicContent.innerHTML = html;

      setTimeout(() => {
        wireInteractions();
      }, 0);
    }).catch(error => {
      console.error('Error loading project cards:', error);
      const dynamicContent = document.getElementById('dynamic-content');
      const isOffline = !navigator.onLine || error.message.includes('fetch');
      dynamicContent.innerHTML = `
        <div class="error-box">
          <h2>Unable to load projects</h2>
          <p>${isOffline ? 'You appear to be offline. Please check your internet connection.' : 'An error occurred while loading the projects.'}</p>
          <p><small>Error: ${error.message}</small></p>
        </div>
      `;
    });
  }

  function renderProjectView(container, projectId) {
    if (!container) {
      console.error('main-content element not found for rendering');
      return;
    }

    if (!loadedProjects[projectId]) {
      const dynamicContent = document.getElementById('dynamic-content');
      dynamicContent.innerHTML = LOADING_HTML;
      return;
    }

    const data = loadedProjects[projectId];
    updateMetaTags(data);

    const sections = (data.content || []).map((section, i) => Object.assign({}, section, { id: `sec-${i}` }));

    let html = `
<div class="project-detail">
        <div class="project-header">
          ${data.flags && data.flags.includes('hack-club') ? '<img src="assets/flag-orpheus-top.svg" alt="Hack Club Flag" class="hack-club-flag">' : ''}
          <div class="title-block">
            <h1>${data.title}</h1>
            <p class="project-subtitle">${data.subtitle}</p>
            ${data.links && data.links.length > 0 ? `
            <div class="project-links">
              ${data.links.map(link => `<a href="${link.href}" target="_blank">${link.text}</a>`).join('')}
            </div>
            ` : ''}
          </div>
        </div>
    `;

    // Gallery strip (click through to the full gallery viewer) — replaces the old autoplay carousel
    if (data.gallery && data.gallery.length > 0) {
      const previewCount = computeGalleryPreviewCount();
      currentGalleryPreviewCount = previewCount;
      const preview = data.gallery.slice(0, previewCount);
      html += `<div class="gallery-strip">`;
      html += preview.map((img, i) => `
        <a href="?post=${projectId}&gallery&img=${i}" class="gallery-strip-item" data-gallery-index="${i}">
          <img src="${img.src}" alt="${img.alt || ''}" loading="lazy" decoding="async">
        </a>
      `).join('');
      if (data.gallery.length > previewCount) {
        html += `<a href="?post=${projectId}&gallery&img=0" class="gallery-strip-more" data-gallery-index="0">+${data.gallery.length - previewCount}</a>`;
      }
      html += `</div>`;
    }

    html += '<div class="project-content">';
    sections.forEach(section => {
      html += `<section class="project-section" id="${section.id}"><h2>${section.heading}</h2>`;

      if (section.text) {
        html += `<p>${processMarkdownText(section.text)}</p>`;
      }

      if (section.list) {
        html += `
          <ul class="feature-list">
            ${section.list.map(item => `<li>${processMarkdownText(item)}</li>`).join('')}
          </ul>
        `;
      }

      if (section.textAfter) {
        html += `<p>${processMarkdownText(section.textAfter)}</p>`;
      }

      html += `</section>`;
    });

    html += '</div>';
    if (data.lastUpdated) {
      html += `<p class="project-last-updated">Last updated ${data.lastUpdated}</p>`;
    }
    html += BACK_LINK_HTML;
    html += '</div>';

    // Slim right-edge "tick marks" section nav — hover reveals the name, current section highlights on scroll
    if (sections.length > 0) {
      html += `
        <nav class="side-toc" aria-label="Section navigation">
          ${sections.map(s => `<a href="#${s.id}" class="side-toc-tick"><span class="side-toc-label">${s.heading}</span></a>`).join('')}
        </nav>
      `;
    }

    const dynamicContent = document.getElementById('dynamic-content');
    dynamicContent.innerHTML = html;

    setTimeout(() => {
      initializeSideToc();
      wireInteractions();
    }, 0);
  }

  // Highlights the tick for whichever section is currently in view
  function initializeSideToc() {
    const nav = document.querySelector('.side-toc');

    if (window._sideTocMoveHandler) {
      document.removeEventListener('mousemove', window._sideTocMoveHandler);
      window._sideTocMoveHandler = null;
    }

    if (!nav) return;

    const edgeZoneWidth = 90;
    window._sideTocMoveHandler = (e) => {
      const isNearEdge = e.clientX >= window.innerWidth - edgeZoneWidth;
      nav.classList.toggle('edge-hover', isNearEdge);
    };
    document.addEventListener('mousemove', window._sideTocMoveHandler);

    if (!('IntersectionObserver' in window)) return;

    const ticks = Array.from(nav.querySelectorAll('.side-toc-tick'));
    const sections = ticks.map(tick => document.querySelector(tick.getAttribute('href')));

    if (ticks.length > 0) {
      ticks[0].classList.add('is-active');
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const index = sections.indexOf(entry.target);
        if (index === -1) return;
        ticks.forEach(t => t.classList.remove('is-active'));
        ticks[index].classList.add('is-active');
      });
    }, { rootMargin: '-40% 0px -50% 0px' });

    sections.forEach(section => {
      if (section) observer.observe(section);
    });
  }

  function updateMetaTags(data) {
    document.title = data.metaTitle;

    const setMetaContent = (selector, content) => {
      const element = document.querySelector(selector);
      if (element) {
        element.content = content;
      }
    };

    setMetaContent('meta[property="og:title"]', data.metaTitle);
    setMetaContent('meta[property="og:description"]', data.description);
    setMetaContent('meta[property="og:image"]', data.metaImage);
    setMetaContent('meta[property="og:url"]', data.metaUrl || `${window.location.origin}${window.location.pathname}`);
    setMetaContent('meta[property="twitter:title"]', data.metaTitle);
    setMetaContent('meta[property="twitter:description"]', data.description);
    setMetaContent('meta[property="twitter:image"]', data.metaImage);
    setMetaContent('meta[name="description"]', data.description);
  }

function wireInteractions() {
  const view = getViewMode();

  if (view.mode === 'projects') {
    const container = document.getElementById('dynamic-content');

    container.removeEventListener('click', handleProjectClick);
    container.removeEventListener('keydown', handleProjectKeydown);

    container.addEventListener('click', handleProjectClick);
    container.addEventListener('keydown', handleProjectKeydown);

    if (typeof wireProjectHoverInteractions === 'function') {
      wireProjectHoverInteractions();
    }
  } else {
    wireProjectPageInteractions();
  }
}

function handleProjectClick(e) {
  const card = e.target.closest('.project');
  if (card && !e.target.closest('a')) {
    const projectId = card.dataset.projectId;
    navigateToProject(projectId);
  }
}

function handleProjectKeydown(e) {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const card = e.target.closest('.project');
  if (!card || e.target.closest('a')) return;
  e.preventDefault();
  navigateToProject(card.dataset.projectId);
}

  function navigateToProject(projectId) {
    if (!loadedProjects[projectId]) {
      const dynamicContent = document.getElementById('dynamic-content');
      dynamicContent.innerHTML = LOADING_HTML;

      fetch(`posts/post${projectId}.json`)
        .then(response => {
          if (!response.ok) throw new Error(`Project not found (HTTP ${response.status})`);
          return response.json();
        })
        .then(data => {
          if (data && data.title) {
            loadedProjects[projectId] = data;
            history.pushState({ projectId }, '', `?post=${projectId}`);
            renderContent();
            wireInteractions();
            if (window.innerWidth <= CONFIG.MOBILE_BREAKPOINT) {
              const mainContent = document.getElementById('main-content');
              if (mainContent) {
                mainContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }
          } else {
            const dynamicContent = document.getElementById('dynamic-content');
            dynamicContent.innerHTML = ERROR_HTML('Invalid project data format');
          }
        })
        .catch(error => {
          console.error('Error loading project:', error);
          const dynamicContent = document.getElementById('dynamic-content');
          const isOffline = !navigator.onLine || error.message.includes('fetch') || error.message.includes('network');
          dynamicContent.innerHTML = ERROR_HTML(
            isOffline
              ? 'You appear to be offline. Please check your internet connection to view this project.'
              : `Error loading project: ${error.message}`
          );
        });
    } else {
      history.pushState({ projectId }, '', `?post=${projectId}`);
      renderContent();
      wireInteractions();
      if (window.innerWidth <= CONFIG.MOBILE_BREAKPOINT) {
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
          mainContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    }
  }

function wireProjectPageInteractions() {
  const container = document.getElementById('dynamic-content');

  container.removeEventListener('click', handleProjectPageClick);
  container.addEventListener('click', handleProjectPageClick);
}

function handleProjectPageClick(e) {
  const backLink = e.target.closest('.back-link');
  if (backLink) {
    e.preventDefault();
    history.pushState(null, '', '');
    renderContent();
    wireInteractions();
    return;
  }

  const galleryItem = e.target.closest('.gallery-strip-item, .gallery-strip-more');
  if (galleryItem) {
    e.preventDefault();
    const params = new URLSearchParams(window.location.search);
    const projectId = params.get('post');
    const imgIndex = galleryItem.dataset.galleryIndex || 0;
    history.pushState(null, '', `?post=${projectId}&gallery&img=${imgIndex}`);
    renderContent();
    wireInteractions();
  }
}

function processMarkdownText(text) {
  let processed = text.replace(/\n\n/g, '</p><p>');

  processed = processed.replace(/__(.*?)__/g, '<u>$1</u>');
  processed = processed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  processed = processed.replace(/(?<!\*)\*(?!\*)([^*]+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
  processed = processed.replace(/(?<!_)_([^_]+?)_(?!_)/g, '<em>$1</em>');
  processed = processed.replace(/~~(.*?)~~/g, '<del>$1</del>');
  processed = processed.replace(/`([^`]+?)`/g, '<code>$1</code>');
  processed = processed.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
  processed = processed.replace(/\n/g, '<br>');

  return processed;
}

  window.renderContent = renderContent;
  window.wireInteractions = wireInteractions;

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', event => {
      if (event.data?.source === 'service-worker' && event.data?.type === 'debug') {
        console.log('[SW debug]', event.data.message, event.data.data || '');
      }
    });

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[SW debug] controller changed', navigator.serviceWorker.controller?.scriptURL || 'no controller');
    });

    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('Service Worker registered with scope:', registration.scope);
        console.log('[SW debug] page controlled:', !!navigator.serviceWorker.controller);
      })
      .catch(error => {
        console.log('Service Worker registration failed:', error);
      });
  }

})();
