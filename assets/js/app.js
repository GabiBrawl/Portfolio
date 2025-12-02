// app.js - Dynamic content renderer for single-page app
// Handles both projects list view and individual project views based on URL

(function () {
  'use strict';

  // Store loaded project data
  const loadedProjects = {};

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
    // Wait for the DOM to be fully ready
    const container = document.getElementById('main-content');
    if (!container) {
      console.error('main-content element not found');
      return;
    }

    const view = getViewMode();
    
    // If it's a project view and data isn't loaded yet, load it first
    if (view.mode === 'project' && !loadedProjects[view.id]) {
      const dynamicContent = document.getElementById('dynamic-content');
      dynamicContent.innerHTML = LOADING_HTML;
      
      fetch(`projects/post${view.id}.json`)
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
          const errorMessage = error.message.includes('Project not found') 
            ? 'Project not found. Please check the URL and try again.'
            : 'Error loading project: ' + error.message;
          const dynamicContent = document.getElementById('dynamic-content');
          dynamicContent.innerHTML = ERROR_HTML(errorMessage);
        });
    } else {
      // Normal project list view
      renderContent();
      wireInteractions();
    }
  });

  window.addEventListener('popstate', () => {
    renderContent();
    wireInteractions();
  });

  function getViewMode() {
    const params = new URLSearchParams(window.location.search);
    const postId = params.get('post');
    return postId ? { mode: 'project', id: postId } : { mode: 'projects' };
  }

  function renderContent() {
    const view = getViewMode();
    const container = document.getElementById('main-content');
    
    if (!container) {
      console.error('main-content element not found');
      return;
    }

    if (view.mode === 'project') {
      renderProjectView(container, view.id);
    } else {
      renderProjectsListView(container);
    }
  }

  function loadProjects() {
    return new Promise(async (resolve) => {
      const projects = [];
      let id = 0;
      while (true) {
        try {
          const response = await fetch(`projects/post${id}.json`);
          if (!response.ok) break;
          const data = await response.json();
          if (data && data.title) {
            projects.push({
              id,
              title: data.title,
              description: data.description,
              image: data.cardImage,
              logo: data.cardLogo,
              logoStyle: data.cardLogoStyle,
              tags: data.cardTags
            });
          }
          id++;
        } catch (error) {
          break;
        }
      }
      resolve(projects);
    });
  }

  function renderProjectsListView(container) {
    // Update page title
    document.title = "Gabriel Yassin's Portfolio";
    document.querySelector('meta[property="og:title"]').content = "Gabi's Portfolio";
    document.querySelector('meta[property="og:description"]').content = "Full-stack developer, programmer and electronics enthusiast building clean web pages and custom hardware.";

    // Load all project card data dynamically
    loadProjects().then(projects => {
      const validProjects = projects.filter(p => p !== null);
      
      let html = `<div class="project-grid">`;

      validProjects.forEach(project => {
        html += `
          <div class="project" data-project-id="${project.id}">
            <img src="${project.image}" alt="Project Image" width="400" height="200" loading="lazy" decoding="async">
            ${project.logo ? `<img class="project-logo" src="${project.logo}" alt="Project Logo" style="${project.logoStyle}">` : ''}
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
      });

      html += `</div>`;

      const dynamicContent = document.getElementById('dynamic-content');
      dynamicContent.innerHTML = html;
      
      // Wire interactions after rendering
      wireInteractions();
    }).catch(error => {
      console.error('Error loading project cards:', error);
      const dynamicContent = document.getElementById('dynamic-content');
      dynamicContent.innerHTML = '<p style="padding: 40px; text-align: center;">Error loading projects</p>';
    });
  }

  function renderProjectView(container, projectId) {
    // Check if container exists
    if (!container) {
      console.error('main-content element not found for rendering');
      return;
    }

    // Check if data is loaded
    if (!loadedProjects[projectId]) {
      const dynamicContent = document.getElementById('dynamic-content');
      dynamicContent.innerHTML = LOADING_HTML;
      return;
    }

    const data = loadedProjects[projectId];
    updateMetaTags(data);

    let html = `
<div class="project-detail">
        <div class="project-header">
          <h1>${data.title}</h1>
          <p class="project-subtitle">${data.subtitle}</p>
    `;

    html += `
    `;

    if (data.links && data.links.length > 0) {
      html += `
        <div class="project-links">
          ${data.links.map(link => `<a href="${link.href}" target="_blank">${link.text}</a>`).join('')}
        </div>
      `;
    }

    html += `</div>`;

    // Carousel
    html += `
      <div class="project-hero">
        <div class="project-carousel">
          <div class="carousel-track">
            ${data.gallery.map(slide => `
              <div class="carousel-slide">
                <img src="${slide.src}" alt="${slide.alt}" loading="lazy" decoding="async">
                <div class="carousel-caption">${slide.caption}</div>
              </div>
            `).join('')}
          </div>
          <div class="carousel-controls"></div>
          <div class="carousel-indicators">
            ${data.gallery.map((_, i) => `<span class="carousel-dot ${i === 0 ? 'active' : ''}" data-slide="${i}"></span>`).join('')}
          </div>
        </div>
      </div>
    `;

    // Content sections
    html += '<div class="project-content">';
    data.content.forEach(section => {
      html += `<section class="project-section"><h2>${section.heading}</h2>`;

      if (section.text) {
        html += `<p>${section.text.replace(/\n\n/g, '</p><p>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</p>`;
      }

      if (section.list) {
        html += `
          <ul class="feature-list">
            ${section.list.map(item => `<li>${item}</li>`).join('')}
          </ul>
        `;
      }

      html += `</section>`;
    });

    html += '</div>';
    html += BACK_LINK_HTML;
    html += '</div>';

    const dynamicContent = document.getElementById('dynamic-content');
    dynamicContent.innerHTML = html;

    // Initialize carousel after rendering
    setTimeout(() => {
      initializeCarousel();
    }, 0);
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
      // Wire up project card clicks
      document.querySelectorAll('.project').forEach(card => {
        card.addEventListener('click', (e) => {
          if (e.target.tagName === 'A' || e.target.closest('a')) {
            return;
          }
          const projectId = card.dataset.projectId;
          navigateToProject(projectId);
        });
      });
      
      // Wire up hover effects for project cards
      if (typeof wireProjectHoverInteractions === 'function') {
        wireProjectHoverInteractions();
      }
    } else {
      // Wire up interactions for project page
      wireProjectPageInteractions();
    }
  }

  function navigateToProject(projectId) {
    // Load project data if not already loaded
    if (!loadedProjects[projectId]) {
      const dynamicContent = document.getElementById('dynamic-content');
      dynamicContent.innerHTML = LOADING_HTML;
      
      fetch(`projects/post${projectId}.json`)
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
          } else {
            const dynamicContent = document.getElementById('dynamic-content');
            dynamicContent.innerHTML = ERROR_HTML('Invalid project data format');
          }
        })
        .catch(error => {
          console.error('Error loading project:', error);
          const dynamicContent = document.getElementById('dynamic-content');
          dynamicContent.innerHTML = ERROR_HTML(`Error loading project: ${error.message}`);
        });
    } else {
      history.pushState({ projectId }, '', `?post=${projectId}`);
      renderContent();
      wireInteractions();
    }
  }

  function initializeCarousel() {
    const carousel = document.querySelector('.project-carousel');
    if (!carousel) return;

    const track = carousel.querySelector('.carousel-track');
    const slides = Array.from(track.querySelectorAll('.carousel-slide'));
    const controls = carousel.querySelector('.carousel-controls');
    const dots = Array.from(carousel.querySelectorAll('.carousel-dot'));

    let currentSlide = 0;
    const slideCount = slides.length;

    const updateCarousel = (index) => {
      currentSlide = index;
      const offset = -currentSlide * 100;
      track.style.transform = `translateX(${offset}%)`;
      dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === currentSlide);
      });
    };

    const nextSlide = () => {
      const next = (currentSlide + 1) % slideCount;
      updateCarousel(next);
    };

    const prevSlide = () => {
      const prev = (currentSlide - 1 + slideCount) % slideCount;
      updateCarousel(prev);
    };

    if (controls) {
      controls.addEventListener('click', (e) => {
        const target = e.target;
        if (target.closest('.carousel-indicators') || target.closest('.carousel-btn') || target.classList.contains('carousel-dot')) {
          return;
        }

        const rect = controls.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const centerX = rect.width / 2;

        if (clickX < centerX) {
          prevSlide();
        } else {
          nextSlide();
        }
      });
    }

    dots.forEach((dot, index) => {
      dot.addEventListener('click', () => {
        updateCarousel(index);
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') prevSlide();
      if (e.key === 'ArrowRight') nextSlide();
    });

    let touchStartX = 0;
    let touchEndX = 0;

    carousel.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    });

    carousel.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      const handleSwipe = () => {
        if (touchStartX - touchEndX > 50) {
          nextSlide();
        }
        if (touchEndX - touchStartX > 50) {
          prevSlide();
        }
      };
      handleSwipe();
    });

    // Auto-play functionality
    let autoplayInterval = setInterval(nextSlide, 5000);

    // Pause autoplay on hover
    carousel.addEventListener('mouseenter', () => {
      clearInterval(autoplayInterval);
    });

    // Resume autoplay on mouse leave
    carousel.addEventListener('mouseleave', () => {
      autoplayInterval = setInterval(nextSlide, 5000);
    });
  }

  function wireProjectPageInteractions() {
    // Wire back button to return to portfolio list
    document.querySelectorAll('.back-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        history.pushState(null, '', 'index.html');
        renderContent();
        wireInteractions();
      });
    });
  }

  // No longer needed - handled at DOMContentLoaded
  // Expose functions globally for back button navigation
  window.renderContent = renderContent;
  window.wireInteractions = wireInteractions;

  // window.addEventListener('load', () => {

})();
