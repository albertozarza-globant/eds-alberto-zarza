import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

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
  /* change to ul, li */
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    moveInstrumentation(row, li);
    while (row.firstElementChild) li.append(row.firstElementChild);
    [...li.children].forEach((div) => {
      if (div.children.length === 1 && div.querySelector('picture')) div.className = 'cards-card-image';
      else div.className = 'cards-card-body';
    });
    makeCardClickable(li);
    ul.append(li);
  });
  ul.querySelectorAll('picture > img').forEach((img) => {
    const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
    moveInstrumentation(img, optimizedPic.querySelector('img'));
    img.closest('picture').replaceWith(optimizedPic);
  });
  block.replaceChildren(ul);
}
