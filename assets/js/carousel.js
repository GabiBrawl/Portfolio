// Carousel functionality for project detail pages
document.addEventListener('DOMContentLoaded', () => {
  const carousel = document.querySelector('.project-carousel');
  if (!carousel) return;

  const track = carousel.querySelector('.carousel-track');
  const slides = Array.from(track.querySelectorAll('.carousel-slide'));
  const controls = carousel.querySelector('.carousel-controls');
  const dots = Array.from(carousel.querySelectorAll('.carousel-dot'));

  let currentSlide = 0;
  const slideCount = slides.length;

  // Function to update carousel position
  const updateCarousel = (index) => {
    currentSlide = index;
    const offset = -currentSlide * 100;
    track.style.transform = `translateX(${offset}%)`;

    // Update dots
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === currentSlide);
    });
  };

  // Next slide
  const nextSlide = () => {
    const next = (currentSlide + 1) % slideCount;
    updateCarousel(next);
  };

  // Previous slide
  const prevSlide = () => {
    const prev = (currentSlide - 1 + slideCount) % slideCount;
    updateCarousel(prev);
  };

  // Handle clicks on carousel controls (left/right zones)
  if (controls) {
    controls.addEventListener('click', (e) => {
      // Ignore clicks on indicators or existing control buttons
      const target = e.target;
      if (target.closest('.carousel-indicators') || target.closest('.carousel-btn') || target.classList.contains('carousel-dot')) {
        return;
      }

      const rect = controls.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const centerX = rect.width / 2;

      if (clickX < centerX) {
        // Clicked on left side
        prevSlide();
      } else {
        // Clicked on right side
        nextSlide();
      }
    });
  }

  // Dot navigation
  dots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
      updateCarousel(index);
    });
  });

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') prevSlide();
    if (e.key === 'ArrowRight') nextSlide();
  });

  // Touch/swipe support
  let touchStartX = 0;
  let touchEndX = 0;

  carousel.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  });

  carousel.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
  });

  const handleSwipe = () => {
    if (touchStartX - touchEndX > 50) {
      nextSlide(); // Swipe left
    }
    if (touchEndX - touchStartX > 50) {
      prevSlide(); // Swipe right
    }
  };

  // Auto-play (optional - uncomment to enable)
  // let autoplayInterval = setInterval(nextSlide, 5000);
  
  // Pause autoplay on hover
  // carousel.addEventListener('mouseenter', () => {
  //   clearInterval(autoplayInterval);
  // });
  
  // Resume autoplay on mouse leave
  // carousel.addEventListener('mouseleave', () => {
  //   autoplayInterval = setInterval(nextSlide, 5000);
  // });
});
