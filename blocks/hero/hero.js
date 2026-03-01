/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const picture = block.querySelector('picture');
  if (picture) {
    const pictureContainer = picture.parentElement;
    if (pictureContainer && pictureContainer !== block) {
      block.prepend(picture);
      if (!pictureContainer.textContent.trim() && pictureContainer.children.length === 0) {
        pictureContainer.remove();
      }
    }

    picture.setAttribute('aria-hidden', 'true');
    block.classList.add('hero-has-image');
  }

  if (block.querySelector(':scope > .hero-content')) return;

  const content = document.createElement('div');
  content.className = 'hero-content';
  [...block.children].forEach((child) => {
    if (child !== picture) content.append(child);
  });

  if (content.children.length > 0) {
    block.append(content);
  }
}
