import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

const AUTOPLAY_DELAY = 5500;

function optimizeSlideImage(picture, img) {
  const optimizedPicture = createOptimizedPicture(img.src, img.alt || '', false, [
    { width: '1200' },
    { width: '800' },
  ]);

  const optimizedImg = optimizedPicture.querySelector('img');
  if (optimizedImg) {
    moveInstrumentation(img, optimizedImg);
  }

  picture.replaceWith(optimizedPicture);
}

function buildSlide(row, index, totalSlides) {
  const slide = document.createElement('li');
  slide.className = 'showcase-carousel-slide';
  slide.setAttribute('role', 'group');
  slide.setAttribute('aria-label', `Slide ${index + 1} of ${totalSlides}`);
  moveInstrumentation(row, slide);

  const panel = document.createElement('article');
  panel.className = 'showcase-carousel-panel';

  const cells = [...row.children];
  const mediaCell = cells.find((cell) => cell.querySelector('picture, img'));
  const contentCell = cells.find((cell) => cell !== mediaCell);

  if (mediaCell) {
    const picture = mediaCell.querySelector('picture');
    const img = mediaCell.querySelector('img');
    if (picture && img) {
      optimizeSlideImage(picture, img);
    }

    const media = document.createElement('div');
    media.className = 'showcase-carousel-media';
    while (mediaCell.firstChild) {
      media.append(mediaCell.firstChild);
    }
    panel.append(media);
    slide.classList.add('has-media');
  }

  const content = document.createElement('div');
  content.className = 'showcase-carousel-content';

  if (contentCell) {
    while (contentCell.firstChild) {
      content.append(contentCell.firstChild);
    }
  }

  cells
    .filter((cell) => cell !== mediaCell && cell !== contentCell)
    .forEach((extraCell) => {
      while (extraCell.firstChild) {
        content.append(extraCell.firstChild);
      }
    });

  if (!content.children.length) {
    const fallbackLabel = document.createElement('p');
    fallbackLabel.textContent = `Slide ${index + 1}`;
    content.append(fallbackLabel);
  }

  panel.append(content);
  slide.append(panel);

  return slide;
}

function createControls(totalSlides) {
  const controls = document.createElement('div');
  controls.className = 'showcase-carousel-controls';

  const previousButton = document.createElement('button');
  previousButton.className = 'showcase-carousel-prev';
  previousButton.type = 'button';
  previousButton.setAttribute('aria-label', 'Previous slide');
  previousButton.innerHTML = '<span aria-hidden="true">&#8592;</span>';

  const nextButton = document.createElement('button');
  nextButton.className = 'showcase-carousel-next';
  nextButton.type = 'button';
  nextButton.setAttribute('aria-label', 'Next slide');
  nextButton.innerHTML = '<span aria-hidden="true">&#8594;</span>';

  const dots = document.createElement('div');
  dots.className = 'showcase-carousel-dots';
  dots.setAttribute('role', 'tablist');
  dots.setAttribute('aria-label', 'Slide navigation');

  [...Array(totalSlides).keys()].forEach((slideIndex) => {
    const dot = document.createElement('button');
    dot.className = 'showcase-carousel-dot';
    dot.type = 'button';
    dot.setAttribute('role', 'tab');
    dot.setAttribute('aria-label', `Go to slide ${slideIndex + 1}`);
    dots.append(dot);
  });

  controls.append(previousButton, dots, nextButton);

  return {
    controls,
    dots,
    nextButton,
    previousButton,
  };
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const rows = [...block.children];
  if (!rows.length) return;

  block.textContent = '';
  block.setAttribute('role', 'region');
  block.setAttribute('aria-roledescription', 'carousel');
  block.setAttribute('aria-label', 'Featured content carousel');

  const viewport = document.createElement('div');
  viewport.className = 'showcase-carousel-viewport';

  const track = document.createElement('ul');
  track.className = 'showcase-carousel-track';
  track.setAttribute('aria-live', 'polite');

  rows.forEach((row, index) => {
    const slide = buildSlide(row, index, rows.length);
    track.append(slide);
  });

  viewport.append(track);
  block.append(viewport);

  const slides = [...track.children];
  if (slides.length < 2) {
    block.classList.add('is-single-slide');
    return;
  }

  const {
    controls,
    dots,
    nextButton,
    previousButton,
  } = createControls(slides.length);
  block.append(controls);

  const dotButtons = [...dots.children];
  let currentSlide = 0;
  let autoplayId;
  let touchStartX = 0;

  const updateSlide = (nextIndex) => {
    currentSlide = (nextIndex + slides.length) % slides.length;
    track.style.transform = `translateX(-${currentSlide * 100}%)`;

    slides.forEach((slide, index) => {
      const isActive = index === currentSlide;
      slide.setAttribute('aria-hidden', isActive ? 'false' : 'true');
      dotButtons[index].setAttribute('aria-selected', isActive ? 'true' : 'false');
      dotButtons[index].classList.toggle('is-active', isActive);
      dotButtons[index].setAttribute('tabindex', isActive ? '0' : '-1');
    });
  };

  const stopAutoplay = () => {
    if (autoplayId) {
      window.clearInterval(autoplayId);
    }
  };

  const startAutoplay = () => {
    if (!block.classList.contains('autoplay')) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    stopAutoplay();
    autoplayId = window.setInterval(() => updateSlide(currentSlide + 1), AUTOPLAY_DELAY);
  };

  previousButton.addEventListener('click', () => {
    updateSlide(currentSlide - 1);
    startAutoplay();
  });

  nextButton.addEventListener('click', () => {
    updateSlide(currentSlide + 1);
    startAutoplay();
  });

  dotButtons.forEach((dot, index) => {
    dot.addEventListener('click', () => {
      updateSlide(index);
      startAutoplay();
    });
  });

  block.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') {
      updateSlide(currentSlide - 1);
      startAutoplay();
    }
    if (event.key === 'ArrowRight') {
      updateSlide(currentSlide + 1);
      startAutoplay();
    }
  });

  viewport.addEventListener('pointerdown', (event) => {
    touchStartX = event.clientX;
  });

  viewport.addEventListener('pointerup', (event) => {
    const swipeDelta = event.clientX - touchStartX;
    if (Math.abs(swipeDelta) < 40) return;
    if (swipeDelta > 0) {
      updateSlide(currentSlide - 1);
    } else {
      updateSlide(currentSlide + 1);
    }
    startAutoplay();
  });

  block.addEventListener('mouseenter', stopAutoplay);
  block.addEventListener('mouseleave', startAutoplay);
  block.addEventListener('focusin', stopAutoplay);
  block.addEventListener('focusout', startAutoplay);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopAutoplay();
    } else {
      startAutoplay();
    }
  });

  updateSlide(0);
  startAutoplay();
}
