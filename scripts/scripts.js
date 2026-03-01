import {
  buildBlock,
  loadHeader,
  loadFooter,
  decorateButtons,
  decorateIcons,
  decorateSections,
  decorateBlocks,
  decorateTemplateAndTheme,
  waitForFirstImage,
  loadSection,
  loadSections,
  loadCSS,
} from './aem.js';

/**
 * Moves all the attributes from a given elmenet to another given element.
 * @param {Element} from the element to copy attributes from
 * @param {Element} to the element to copy attributes to
 */
export function moveAttributes(from, to, attributes) {
  if (!attributes) {
    // eslint-disable-next-line no-param-reassign
    attributes = [...from.attributes].map(({ nodeName }) => nodeName);
  }
  attributes.forEach((attr) => {
    const value = from.getAttribute(attr);
    if (value) {
      to?.setAttribute(attr, value);
      from.removeAttribute(attr);
    }
  });
}

/**
 * Move instrumentation attributes from a given element to another given element.
 * @param {Element} from the element to copy attributes from
 * @param {Element} to the element to copy attributes to
 */
export function moveInstrumentation(from, to) {
  moveAttributes(
    from,
    to,
    [...from.attributes]
      .map(({ nodeName }) => nodeName)
      .filter((attr) => attr.startsWith('data-aue-') || attr.startsWith('data-richtext-')),
  );
}

/**
 * load fonts.css and set a session storage flag
 */
async function loadFonts() {
  await loadCSS(`${window.hlx.codeBasePath}/styles/fonts.css`);
  try {
    if (!window.location.hostname.includes('localhost')) sessionStorage.setItem('fonts-loaded', 'true');
  } catch (e) {
    // do nothing
  }
}

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
function buildAutoBlocks(main) {
  const buildHeroBlock = () => {
    const firstSection = main.querySelector(':scope > div');
    if (!firstSection || firstSection.querySelector(':scope > .hero')) return;

    const directChildren = [...firstSection.children];
    const heading = directChildren.find((element) => element.tagName === 'H1');
    if (!heading) return;

    const heroMedia = directChildren.find((element) => {
      const hasPicture = !!element.querySelector('picture');
      if (!hasPicture) return false;
      return element.childElementCount === 1 || element.textContent.trim() === '';
    });

    const heroContent = directChildren
      .filter((element) => element !== heroMedia && ['H1', 'H2', 'P'].includes(element.tagName))
      .slice(0, 5);

    if (!heroContent.length) return;

    const row = heroMedia
      ? [heroMedia, { elems: heroContent }]
      : [{ elems: heroContent }];
    const heroBlock = buildBlock('hero', [row]);
    firstSection.prepend(heroBlock);
    firstSection.classList.add('auto-hero-section');
  };

  try {
    buildHeroBlock();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
export function decorateMain(main) {
  // hopefully forward compatible button decoration
  decorateButtons(main);
  decorateIcons(main);
  buildAutoBlocks(main);
  decorateSections(main);
  decorateBlocks(main);
}

function getDocumentLanguage() {
  const [firstPathSegment] = window.location.pathname.split('/').filter(Boolean);
  const localeMap = {
    de: 'de',
    es: 'es',
    fr: 'fr',
    jp: 'ja',
  };

  return localeMap[firstPathSegment] || 'en';
}

function trackScrollState() {
  const onScroll = () => {
    document.body.classList.toggle('is-scrolled', window.scrollY > 10);
  };

  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}

function setupHeroHeaderMode(main) {
  const firstSection = main.querySelector(':scope > .section:first-of-type');
  const heroInFirstSection = firstSection?.querySelector('.hero');
  const hasHeroHeader = !!heroInFirstSection;

  document.body.classList.toggle('has-hero-header', hasHeroHeader);
  if (heroInFirstSection) {
    heroInFirstSection.classList.add('hero-integrated');
  }
}

function setInitialHeroHeaderMode(main) {
  const firstSection = main.querySelector(':scope > div:first-of-type');
  const heroInFirstSection = firstSection?.querySelector('.hero');
  document.body.classList.toggle('has-hero-header', !!heroInFirstSection);
}

/**
 * Loads everything needed to get to LCP.
 * @param {Element} doc The container element
 */
async function loadEager(doc) {
  document.documentElement.lang = getDocumentLanguage();
  decorateTemplateAndTheme();
  const main = doc.querySelector('main');
  if (main) {
    decorateMain(main);
    setInitialHeroHeaderMode(main);
    document.body.classList.add('appear');
    await loadSection(main.querySelector('.section'), waitForFirstImage);
  }

  try {
    /* if desktop (proxy for fast connection) or fonts already loaded, load fonts.css */
    if (window.innerWidth >= 900 || sessionStorage.getItem('fonts-loaded')) {
      loadFonts();
    }
  } catch (e) {
    // do nothing
  }
}

/**
 * Loads everything that doesn't need to be delayed.
 * @param {Element} doc The container element
 */
async function loadLazy(doc) {
  loadHeader(doc.querySelector('header'));

  const main = doc.querySelector('main');
  await loadSections(main);
  setupHeroHeaderMode(main);
  trackScrollState();

  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();

  loadFooter(doc.querySelector('footer'));

  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  loadFonts();
}

/**
 * Loads everything that happens a lot later,
 * without impacting the user experience.
 */
function loadDelayed() {
  // eslint-disable-next-line import/no-cycle
  window.setTimeout(() => import('./delayed.js'), 3000);
  // load anything that can be postponed to the latest here
}

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

loadPage();
