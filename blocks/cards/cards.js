import { createOptimizedPicture, toClassName } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

const BLOCK_DEFAULTS = {
  layout: 'grid',
  desktopColumns: '3',
  tabletColumns: '2',
  cardStyle: 'elevated',
  imageRatio: '16-10',
  gap: 'regular',
  contentAlign: 'start',
};

const BLOCK_ALLOWED = {
  layout: ['grid', 'feature', 'masonry', 'stack'],
  desktopColumns: ['2', '3', '4'],
  tabletColumns: ['1', '2', '3'],
  cardStyle: ['elevated', 'outline', 'minimal', 'glass'],
  imageRatio: ['16-10', '16-9', '4-3', '1-1', '3-4'],
  gap: ['compact', 'regular', 'spacious'],
  contentAlign: ['start', 'center'],
};

const BLOCK_KEY_MAP = {
  layout: 'layout',
  disposition: 'layout',
  desktopcolumns: 'desktopColumns',
  'desktop-columns': 'desktopColumns',
  columnsdesktop: 'desktopColumns',
  'columns-desktop': 'desktopColumns',
  tabletcolumns: 'tabletColumns',
  'tablet-columns': 'tabletColumns',
  columnstablet: 'tabletColumns',
  'columns-tablet': 'tabletColumns',
  cardstyle: 'cardStyle',
  'card-style': 'cardStyle',
  imageratio: 'imageRatio',
  'image-ratio': 'imageRatio',
  ratio: 'imageRatio',
  gap: 'gap',
  spacing: 'gap',
  contentalign: 'contentAlign',
  'content-align': 'contentAlign',
  align: 'contentAlign',
};

const CARD_ALLOWED = {
  variant: ['default', 'featured', 'wide'],
  tone: ['neutral', 'dark', 'accent'],
  align: ['start', 'center'],
};

function sanitizeOption(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

function normalizeOptionValue(value = '') {
  return toClassName(value).replace(/\//g, '-');
}

function parseBlockConfig(block) {
  const config = { ...BLOCK_DEFAULTS };
  const cardRows = [];

  [...block.children].forEach((row) => {
    const cells = [...row.children];
    if (cells.length !== 2 || row.querySelector('picture, img')) {
      cardRows.push(row);
      return;
    }

    const key = BLOCK_KEY_MAP[toClassName(cells[0].textContent)];
    if (!key) {
      cardRows.push(row);
      return;
    }

    const value = normalizeOptionValue(cells[1].textContent);
    config[key] = sanitizeOption(value, BLOCK_ALLOWED[key], BLOCK_DEFAULTS[key]);
  });

  return {
    cardRows,
    config,
  };
}

function applyBlockClasses(block, config) {
  block.classList.add(`cards-layout-${config.layout}`);
  block.classList.add(`cards-style-${config.cardStyle}`);
  block.classList.add(`cards-image-${config.imageRatio}`);
  block.classList.add(`cards-gap-${config.gap}`);
  block.classList.add(`cards-align-${config.contentAlign}`);
  block.style.setProperty('--cards-columns-tablet', config.tabletColumns);
  block.style.setProperty('--cards-columns-desktop', config.desktopColumns);
}

function moveChildren(from, to) {
  while (from?.firstChild) {
    to.append(from.firstChild);
  }
}

function parseCardOptions(extraCells, bodyWrapper) {
  const options = {
    align: 'start',
    tone: 'neutral',
    variant: 'default',
  };

  extraCells.forEach((cell, index) => {
    const value = normalizeOptionValue(cell.textContent);
    const optionKey = ['variant', 'tone', 'align'][index];
    if (optionKey && CARD_ALLOWED[optionKey].includes(value)) {
      options[optionKey] = value;
      return;
    }

    moveChildren(cell, bodyWrapper);
  });

  return options;
}

function createCard(row) {
  const li = document.createElement('li');
  moveInstrumentation(row, li);

  const columns = [...row.children];
  const firstColumnHasImage = !!columns[0]?.querySelector('picture, img');
  const imageCell = firstColumnHasImage ? columns[0] : null;
  const bodyCell = columns[firstColumnHasImage ? 1 : 0] || null;
  const extraCells = columns.slice(firstColumnHasImage ? 2 : 1);

  if (imageCell) {
    const imageWrapper = document.createElement('div');
    imageWrapper.className = 'cards-card-image';
    moveChildren(imageCell, imageWrapper);
    if (imageWrapper.children.length) {
      li.append(imageWrapper);
    }
  }

  const bodyWrapper = document.createElement('div');
  bodyWrapper.className = 'cards-card-body';
  moveChildren(bodyCell, bodyWrapper);

  const options = parseCardOptions(extraCells, bodyWrapper);
  li.classList.add(`cards-variant-${options.variant}`);
  li.classList.add(`cards-tone-${options.tone}`);
  li.classList.add(`cards-align-${options.align}`);

  if (bodyWrapper.children.length) {
    li.append(bodyWrapper);
  }

  return li;
}

/**
 * Makes the full card clickable when there is a single primary link.
 * @param {HTMLElement} card the generated card element
 */
function makeCardClickable(card) {
  const links = [...card.querySelectorAll('.cards-card-body a[href]')];
  if (links.length !== 1) return;

  const [primaryLink] = links;
  const openLink = () => primaryLink.click();

  card.classList.add('cards-card-linked');
  card.setAttribute('role', 'link');
  card.setAttribute('tabindex', '0');

  card.addEventListener('click', (event) => {
    if (event.target.closest('a, button, input, select, textarea, label')) return;
    openLink();
  });

  card.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    openLink();
  });
}

export default function decorate(block) {
  const { cardRows, config } = parseBlockConfig(block);
  applyBlockClasses(block, config);

  const ul = document.createElement('ul');
  cardRows.forEach((row) => {
    const li = createCard(row);
    makeCardClickable(li);
    ul.append(li);
  });

  ul.querySelectorAll('.cards-card-image picture > img').forEach((img) => {
    const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '1200' }]);
    moveInstrumentation(img, optimizedPic.querySelector('img'));
    img.closest('picture').replaceWith(optimizedPic);
  });

  block.replaceChildren(ul);
}
