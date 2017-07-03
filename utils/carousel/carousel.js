const carouselEl = document.querySelector('.carousel-container');
const nav = document.querySelectorAll('.nav');

Array.from(nav).forEach(createNavigationEventListener);

function createNavigationEventListener(el) {
  el.addEventListener('click', () => {
    const items = carouselEl.querySelectorAll('.carousel-item');

    if (items.length) {
      const lastIndex = items.length - 1;
      const activeIndex = Array.from(items).findIndex(item => item.classList.contains('active'));
      const nextIndex = activeIndex + 1 > lastIndex ? 0 : activeIndex + 1;

      items[activeIndex].classList.remove('active');
      items[nextIndex].classList.add('active');
    }
  });
}
