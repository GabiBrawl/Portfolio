// postApp.js - Dynamic content renderer for single-page app
// Handles both projects list view and individual project views based on URL

(function () {
  'use strict';

  // Store loaded project data
  const loadedProjects = {};

  // Project metadata for the list view
  const projectsMetadata = [
    {
      id: 0,
      title: "Kibodo One",
      image: "assets/images/kibodo.webp",
      logo: "assets/images/psychoduck64x64.png",
      logoStyle: "border: 2px solid var(--white); background-color: var(--black);",
      description: "Possibly the coolest Keyboard built from scratch, with magnetically attachable modules, and a sick side-display.",
      tags: [
        { text: "Embedded Development", link: null },
        { text: "Electronics", link: null },
        { text: "OpenSource", link: "https://github.com/PsychoDuckTech" }
      ]
    },
    {
      id: 1,
      title: "LePlayer Music",
      image: "assets/images/leplayer.png",
      logo: "assets/images/leplayer52x52.png",
      logoStyle: "",
      description: "A music streaming service, attempting to dethrone the giants in the industry",
      tags: [
        { text: "Svelte", link: null },
        { text: "Python", link: null },
        { text: "UI/UX Design", link: null },
        { text: "In Progress", link: null },
        { text: "OpenSource", link: "https://github.com/LePlayer-Music" }
      ]
    },
    {
      id: 2,
      title: "PC Building",
      image: "assets/images/pc.jpeg",
      logo: null,
      logoStyle: "",
      description: "I build custom PCs tailored to individual needs and preferences.",
      tags: [
        { text: "Intel", link: null },
        { text: "AMD", link: null }
      ]
    }
  ];

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
      container.innerHTML = '<p style="padding: 40px; text-align: center;">Loading project...</p>';
      
      fetch(`projects/post${view.id}.js`)
        .then(response => {
          if (!response.ok) {
            throw new Error(`Project not found (HTTP ${response.status})`);
          }
          return response.text();
        })
        .then(scriptContent => {
          const scope = {};
          const code = `
            ${scriptContent}
            scope.data = projectData;
          `;
          const fn = new Function('scope', code);
          fn(scope);
          const data = scope.data;
          
          if (data && data.meta) {
            loadedProjects[view.id] = data;
            renderContent();
            wireInteractions();
          } else {
            container.innerHTML = '<p style="padding: 40px; color: red;">Error: Invalid project data format.</p>';
          }
        })
        .catch(error => {
          console.error('Error loading project:', error);
          const errorMessage = error.message.includes('Project not found') 
            ? 'Project not found. Please check the URL and try again.'
            : 'Error loading project: ' + error.message;
          container.innerHTML = `<p style="padding: 40px; color: red; text-align: center;">${errorMessage}</p>`;
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

  function renderProjectsListView(container) {
    // Update page title
    document.title = "Gabriel Yassin's Portfolio";
    document.querySelector('meta[property="og:title"]').content = "Gabi's Portfolio";
    document.querySelector('meta[property="og:description"]').content = "Full-stack developer, programmer and electronics enthusiast building clean web pages and custom hardware.";

    let html = `
      <section class="projects">
        <div class="title-container">
          <hr class="line left">
          <h2>My Projects</h2>
          <hr class="line right">
        </div>
        <div class="project-grid">
    `;

    projectsMetadata.forEach(project => {
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

    html += `
        </div>
      </section>
      <footer><span class="line"></span><span class="gb">𝕲 // 𝕭</span><span class="line"></span></footer>
    `;

    container.innerHTML = html;
  }

  function renderProjectView(container, projectId) {
    // Check if container exists
    if (!container) {
      console.error('main-content element not found for rendering');
      return;
    }

    // Check if data is loaded
    if (!loadedProjects[projectId]) {
      // Try to load it
      if (typeof projectData !== 'undefined') {
        loadedProjects[projectId] = projectData;
      } else {
        container.innerHTML = '<p style="padding: 40px; text-align: center;">Loading project...</p>';
        return;
      }
    }

    const data = loadedProjects[projectId];
    updateMetaTags(data.meta);

    let html = `
      <section class="projects">
        <div class="title-container">
          <hr class="line left">
          <h2>My Projects</h2>
          <hr class="line right">
        </div>
      </section>
      <div class="project-detail">
        <div class="project-header">
          <a href="#" class="back-link" onclick="history.back(); return false;">Back to Portfolio</a>
          <h1>${data.header.title}</h1>
          <p class="project-subtitle">${data.header.subtitle}</p>
    `;

    if (data.header.logo) {
      html += `<img class="project-logo-main" src="${data.header.logo}" alt="Project Logo" style="${data.header.logoStyle}">`;
    }

    html += `
      <div class="project-meta">
        ${data.tags.slice(0, 3).map(tag => `<span>${tag}</span>`).join('')}
      </div>
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
    html += '</div></div>';
    html += '<footer><span class="line"></span><span class="gb">𝕲 // 𝕭</span><span class="line"></span></footer>';

    container.innerHTML = html;

    // Initialize carousel after rendering
    setTimeout(() => {
      initializeCarousel();
    }, 0);
  }

  function updateMetaTags(meta) {
    document.title = meta.title;
    
    const setMetaContent = (selector, content) => {
      const element = document.querySelector(selector);
      if (element) {
        element.content = content;
      }
    };
    
    setMetaContent('meta[property="og:title"]', meta.title);
    setMetaContent('meta[property="og:description"]', meta.description);
    setMetaContent('meta[property="og:image"]', meta.ogImage);
    setMetaContent('meta[property="og:url"]', meta.url);
    setMetaContent('meta[property="twitter:title"]', meta.title);
    setMetaContent('meta[property="twitter:description"]', meta.description);
    setMetaContent('meta[property="twitter:image"]', meta.ogImage);
    setMetaContent('meta[name="description"]', meta.description);
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
      const container = document.getElementById('main-content');
      if (!container) {
        console.error('main-content element not found');
        return;
      }
      
      container.innerHTML = '<p style="padding: 40px; text-align: center;">Loading project...</p>';
      
      fetch(`projects/post${projectId}.js`)
        .then(response => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.text();
        })
        .then(scriptContent => {
          const scope = {};
          const code = `
            ${scriptContent}
            scope.data = projectData;
          `;
          const fn = new Function('scope', code);
          fn(scope);
          const data = scope.data;
          
          if (data && data.meta) {
            loadedProjects[projectId] = data;
            history.pushState({ projectId }, '', `?post=${projectId}`);
            renderContent();
            wireInteractions();
          } else {
            container.innerHTML = '<p style="padding: 40px; color: red;">Error: Invalid project data format.</p>';
          }
        })
        .catch(error => {
          console.error('Error loading project:', error);
          container.innerHTML = '<p style="padding: 40px; color: red;">Error loading project: ' + error.message + '</p>';
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
  // window.addEventListener('load', () => {

})();
