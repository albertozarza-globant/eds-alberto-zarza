import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

const AUTOPLAY_DELAY = 5500;
const STYLE_CLASSES = ['style-clean', 'style-cinematic', 'style-minimal'];
const STYLE_MAP = {
  clean: 'style-clean',
  cinematic: 'style-cinematic',
  minimal: 'style-minimal',
};
const FIT_MAP = {
  contain: 'fit-contain',
  cover: 'fit-cover',
};

function normalizeToken(value = '') {
  return value.trim().toLowerCase();
}

function optimizeSlideImage(picture, img) {
  const optimizedPicture = createOptimizedPicture(img.src, img.alt || '', false, [
    { media: '(min-width: 1400px)', width: '2600' },
    { media: '(min-width: 900px)', width: '2000' },
    { width: '1200' },
  ]);

  const optimizedImg = optimizedPicture.querySelector('img');
  if (optimizedImg) {
    moveInstrumentation(img, optimizedImg);
  }

  picture.replaceWith(optimizedPicture);
}

function readBlockOptions(rows) {
  const options = {};
  const slideRows = [];

  rows.forEach((row) => {
    const cells = [...row.children];
    if (cells.length === 2 && !row.querySelector('picture, img')) {
      const optionKey = normalizeToken(cells[0].textContent);
      const optionValue = normalizeToken(cells[1].textContent);
      if (['style', 'fit', 'autoplay'].includes(optionKey) && optionValue) {
        options[optionKey] = optionValue;
        return;
      }
    }
    slideRows.push(row);
  });

  return { options, slideRows };
}

function applyBlockOptions(block, options) {
  if (options.style && STYLE_MAP[options.style]) {
    block.classList.add(STYLE_MAP[options.style]);
  }

  if (!STYLE_CLASSES.some((styleClass) => block.classList.contains(styleClass))) {
    block.classList.add('style-clean');
  }

  if (options.fit && FIT_MAP[options.fit]) {
    block.classList.add(FIT_MAP[options.fit]);
  }

  if (!block.classList.contains('fit-cover') && !block.classList.contains('fit-contain')) {
    block.classList.add('fit-cover');
  }

  const autoplayDisabled = ['false', 'no', '0', 'off'].includes(options.autoplay)
    || block.classList.contains('no-autoplay');
  if (!autoplayDisabled) {
    block.classList.add('autoplay');
  }
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

  const { options, slideRows } = readBlockOptions(rows);
  if (!slideRows.length) return;

  block.textContent = '';
  applyBlockOptions(block, options);

  block.setAttribute('role', 'region');
  block.setAttribute('aria-roledescription', 'carousel');
  block.setAttribute('aria-label', 'Featured content carousel');

  const viewport = document.createElement('div');
  viewport.className = 'showcase-carousel-viewport';

  const track = document.createElement('ul');
  track.className = 'showcase-carousel-track';
  track.setAttribute('aria-live', 'polite');
  track.style.willChange = 'transform';

  slideRows.forEach((row, index) => {
    const slide = buildSlide(row, index, slideRows.length);
    track.append(slide);
  });

  viewport.append(track);
  block.append(viewport);

  const slides = [...track.children];
  if (slides.length < 2) {
    block.classList.add('is-single-slide');
    slides[0].classList.add('is-active');
    slides[0].setAttribute('aria-hidden', 'false');
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
    const slideOffset = viewport.clientWidth * currentSlide;
    track.style.transform = `translate3d(-${slideOffset}px, 0, 0)`;

    slides.forEach((slide, index) => {
      const isActive = index === currentSlide;
      slide.classList.toggle('is-active', isActive);
      slide.setAttribute('aria-hidden', isActive ? 'false' : 'true');
      dotButtons[index].setAttribute('aria-selected', isActive ? 'true' : 'false');
      dotButtons[index].classList.toggle('is-active', isActive);
      dotButtons[index].setAttribute('tabindex', isActive ? '0' : '-1');
    });
  };

  const stopAutoplay = () => {
    if (!autoplayId) return;
    window.clearInterval(autoplayId);
    autoplayId = null;
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
    } else if (event.key === 'ArrowRight') {
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
    updateSlide(swipeDelta > 0 ? currentSlide - 1 : currentSlide + 1);
    startAutoplay();
  });

  window.addEventListener('resize', () => {
    updateSlide(currentSlide);
  });

  block.addEventListener('mouseenter', stopAutoplay);
  block.addEventListener('mouseleave', startAutoplay);
  block.addEventListener('focusin', stopAutoplay);
  block.addEventListener('focusout', startAutoplay);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopAutoplay();
    else startAutoplay();
  });

  updateSlide(0);
  startAutoplay();
}
