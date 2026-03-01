import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

function decorateFooterColumns(footer) {
  const children = [...footer.children].filter((child) => child.tagName !== 'HR');
  if (children.length === 0) return;

  footer.classList.add('footer-grid');
  children.forEach((child) => child.classList.add('footer-column'));

  const legalCandidate = children[children.length - 1];
  if (legalCandidate) {
    legalCandidate.classList.add('footer-legal');
  }
}

function decorateFooterLinks(footer) {
  footer.querySelectorAll('ul').forEach((list) => {
    if (list.children.length > 1) {
      list.classList.add('footer-link-list');
    }
  });

  footer.querySelectorAll('a[href]').forEach((link) => {
    if (link.hostname && link.hostname !== window.location.hostname) {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    }
  });
}

function replaceYearTokens(footer) {
  const year = new Date().getFullYear();
  const tokenPattern = /{{\s*year\s*}}|{\s*year\s*}/gi;
  footer.querySelectorAll('p, li, span, small').forEach((node) => {
    if (node.textContent && tokenPattern.test(node.textContent)) {
      node.textContent = node.textContent.replace(tokenPattern, year);
    }
  });
}

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  // Language root detection and path adjustment
  const supportedLocales = ['es', 'fr', 'jp', 'de'];
  const pathParts = window.location.pathname.split('/').filter(Boolean);

  let langRoot = '';
  if (pathParts.length > 0 && supportedLocales.includes(pathParts[0])) {
    langRoot = `/${pathParts[0]}`;
  }
  const footerMeta = getMetadata('footer');
  let footerPath = footerMeta ? new URL(footerMeta, window.location).pathname : '/footer';
  if (langRoot && !footerPath.startsWith(`${langRoot}/`)) {
    footerPath = `${langRoot}${footerPath}`;
  }
  const fragment = await loadFragment(footerPath);

  // decorate footer DOM
  block.textContent = '';
  const footer = document.createElement('div');
  while (fragment.firstElementChild) footer.append(fragment.firstElementChild);

  replaceYearTokens(footer);
  decorateFooterLinks(footer);
  decorateFooterColumns(footer);

  block.append(footer);
}
