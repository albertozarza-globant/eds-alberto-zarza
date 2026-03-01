import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

// media query match that indicates mobile/tablet width
const isDesktop = window.matchMedia('(min-width: 900px)');

function normalizePath(path) {
  if (!path) return '/';
  return path.endsWith('/') && path.length > 1 ? path.slice(0, -1) : path;
}

function markActiveNavigation(navSections) {
  const currentPath = normalizePath(window.location.pathname);
  navSections.querySelectorAll('a[href]').forEach((link) => {
    const linkPath = normalizePath(new URL(link.href, window.location.href).pathname);
    if (linkPath === currentPath) {
      link.setAttribute('aria-current', 'page');
    }
  });
}

function decorateBrandIcon(navBrand) {
  if (!navBrand) return;

  const brandIconPath = getMetadata('brand-icon');
  const brandLink = navBrand.querySelector('a:any-link');
  const iconTarget = brandLink || navBrand;
  if (!brandIconPath || !iconTarget) return;

  const brandIconAlt = getMetadata('brand-icon-alt') || 'Brand icon';
  const iconSizeMeta = Number.parseInt(getMetadata('brand-icon-size'), 10);
  const iconSize = Number.isFinite(iconSizeMeta) && iconSizeMeta > 0 ? iconSizeMeta : 64;

  const currentIcon = iconTarget.querySelector(':scope > .nav-brand-icon');
  if (currentIcon) currentIcon.remove();

  const imageOnlyLogo = iconTarget.children.length === 1
    && iconTarget.firstElementChild?.tagName === 'IMG'
    && iconTarget.textContent.trim() === '';

  if (imageOnlyLogo) {
    const logo = iconTarget.firstElementChild;
    logo.classList.add('nav-brand-icon');
    logo.src = new URL(brandIconPath, window.location.href).href;
    logo.alt = brandIconAlt;
    logo.width = iconSize;
    logo.height = iconSize;
    navBrand.classList.add('has-brand-icon');
    return;
  }

  const icon = document.createElement('img');
  icon.className = 'nav-brand-icon';
  icon.src = new URL(brandIconPath, window.location.href).href;
  icon.alt = brandIconAlt;
  icon.width = iconSize;
  icon.height = iconSize;
  icon.loading = 'eager';
  icon.decoding = 'async';

  iconTarget.prepend(icon);
  navBrand.classList.add('has-brand-icon');
}

function closeOnEscape(e) {
  if (e.code === 'Escape') {
    const nav = document.getElementById('nav');
    const navSections = nav.querySelector('.nav-sections');
    const navSectionExpanded = navSections.querySelector('[aria-expanded="true"]');
    if (navSectionExpanded && isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleAllNavSections(navSections);
      navSectionExpanded.focus();
    } else if (!isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleMenu(nav, navSections);
      nav.querySelector('button').focus();
    }
  }
}

function closeOnFocusLost(e) {
  const nav = e.currentTarget;
  if (!nav.contains(e.relatedTarget)) {
    const navSections = nav.querySelector('.nav-sections');
    const navSectionExpanded = navSections.querySelector('[aria-expanded="true"]');
    if (navSectionExpanded && isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleAllNavSections(navSections, false);
    } else if (!isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleMenu(nav, navSections, false);
    }
  }
}

function openOnKeydown(e) {
  const focused = document.activeElement;
  const isNavDrop = focused.classList?.contains('nav-drop');
  if (isNavDrop && (e.code === 'Enter' || e.code === 'Space')) {
    const dropExpanded = focused.getAttribute('aria-expanded') === 'true';
    // eslint-disable-next-line no-use-before-define
    toggleAllNavSections(focused.closest('.nav-sections'));
    focused.setAttribute('aria-expanded', dropExpanded ? 'false' : 'true');
  }
}

function focusNavSection() {
  document.activeElement.addEventListener('keydown', openOnKeydown);
}

/**
 * Toggles all nav sections
 * @param {Element} sections The container element
 * @param {Boolean} expanded Whether the element should be expanded or collapsed
 */
function toggleAllNavSections(sections, expanded = false) {
  if (!sections) return;
  sections.querySelectorAll('.nav-sections .default-content-wrapper > ul > li').forEach((section) => {
    section.setAttribute('aria-expanded', expanded);
  });
}

/**
 * Toggles the entire nav
 * @param {Element} nav The container element
 * @param {Element} navSections The nav sections within the container element
 * @param {*} forceExpanded Optional param to force nav expand behavior when not null
 */
function toggleMenu(nav, navSections, forceExpanded = null) {
  const expanded = forceExpanded !== null ? !forceExpanded : nav.getAttribute('aria-expanded') === 'true';
  const button = nav.querySelector('.nav-hamburger button');
  document.body.style.overflowY = (expanded || isDesktop.matches) ? '' : 'hidden';
  nav.setAttribute('aria-expanded', expanded ? 'false' : 'true');
  toggleAllNavSections(navSections, expanded || isDesktop.matches ? 'false' : 'true');
  button.setAttribute('aria-label', expanded ? 'Open navigation' : 'Close navigation');
  if (!navSections) return;
  // enable nav dropdown keyboard accessibility
  const navDrops = navSections.querySelectorAll('.nav-drop');
  if (isDesktop.matches) {
    navDrops.forEach((drop) => {
      if (!drop.hasAttribute('tabindex')) {
        drop.setAttribute('tabindex', 0);
        drop.addEventListener('focus', focusNavSection);
      }
    });
  } else {
    navDrops.forEach((drop) => {
      drop.removeAttribute('tabindex');
      drop.removeEventListener('focus', focusNavSection);
    });
  }

  // enable menu collapse on escape keypress
  if (!expanded || isDesktop.matches) {
    // collapse menu on escape press
    window.addEventListener('keydown', closeOnEscape);
    // collapse menu on focus lost
    nav.addEventListener('focusout', closeOnFocusLost);
  } else {
    window.removeEventListener('keydown', closeOnEscape);
    nav.removeEventListener('focusout', closeOnFocusLost);
  }
}

/**
 * loads and decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  // Language root detection and path adjustment
  const supportedLocales = ['es', 'fr', 'jp', 'de'];
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  let langRoot = '';
  if (pathParts.length > 0 && supportedLocales.includes(pathParts[0])) {
    langRoot = `/${pathParts[0]}`;
  }
  const navMeta = getMetadata('nav');
  let navPath = navMeta ? new URL(navMeta, window.location).pathname : '/nav';
  if (langRoot && !navPath.startsWith(`${langRoot}/`)) {
    navPath = `${langRoot}${navPath}`;
  }
  const fragment = await loadFragment(navPath);

  // decorate nav DOM
  block.textContent = '';
  const nav = document.createElement('nav');
  nav.id = 'nav';
  while (fragment.firstElementChild) nav.append(fragment.firstElementChild);

  const classes = ['brand', 'sections', 'tools'];
  classes.forEach((c, i) => {
    const section = nav.children[i];
    if (section) section.classList.add(`nav-${c}`);
  });

  const navBrand = nav.querySelector('.nav-brand');
  const navBrandLink = navBrand?.querySelector('a:any-link');
  if (navBrandLink) navBrandLink.classList.add('nav-brand-link');

  const brandLink = navBrand?.querySelector('.button');
  if (brandLink) {
    brandLink.className = '';
    const buttonContainer = brandLink.closest('.button-container');
    if (buttonContainer) buttonContainer.className = '';
  }

  decorateBrandIcon(navBrand);

  const navSections = nav.querySelector('.nav-sections');
  if (navSections) {
    markActiveNavigation(navSections);

    navSections.querySelectorAll(':scope .default-content-wrapper > ul > li').forEach((navSection) => {
      if (navSection.querySelector('ul')) {
        navSection.classList.add('nav-drop');
        navSection.setAttribute('aria-haspopup', 'true');
      }
      navSection.addEventListener('click', () => {
        if (isDesktop.matches) {
          const expanded = navSection.getAttribute('aria-expanded') === 'true';
          toggleAllNavSections(navSections);
          navSection.setAttribute('aria-expanded', expanded ? 'false' : 'true');
        }
      });
    });

    navSections.querySelectorAll('a[href]').forEach((link) => {
      link.addEventListener('click', () => {
        if (!isDesktop.matches) {
          toggleMenu(nav, navSections, false);
        }
      });
    });
  }

  // hamburger for mobile
  const hamburger = document.createElement('div');
  hamburger.classList.add('nav-hamburger');
  hamburger.innerHTML = `<button type="button" aria-controls="nav" aria-label="Open navigation">
      <span class="nav-hamburger-icon"></span>
    </button>`;
  hamburger.addEventListener('click', () => toggleMenu(nav, navSections));
  nav.prepend(hamburger);
  nav.setAttribute('aria-expanded', 'false');
  // prevent mobile nav behavior on window resize
  toggleMenu(nav, navSections, isDesktop.matches);
  isDesktop.addEventListener('change', () => toggleMenu(nav, navSections, isDesktop.matches));

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav);
  block.append(navWrapper);
}
