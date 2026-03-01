export default function decorate(block) {
  const cols = [...block.firstElementChild.children];
  block.classList.add(`columns-${cols.length}-cols`);

  // setup image columns
  let hasImage = false;
  let hasImageFirstColumn = false;
  [...block.children].forEach((row) => {
    const firstColumn = row.firstElementChild;
    [...row.children].forEach((col) => {
      const pic = col.querySelector('picture');
      if (pic) {
        hasImage = true;
        const picWrapper = pic.closest('div');
        if (picWrapper && picWrapper.children.length === 1) {
          // picture is only content in column
          picWrapper.classList.add('columns-img-col');
          if (picWrapper === firstColumn) {
            hasImageFirstColumn = true;
          }
        }
      }
    });
  });

  if (hasImage) {
    block.classList.add('columns-has-image');
  }

  if (hasImageFirstColumn) {
    block.classList.add('columns-image-first');
  }
}
