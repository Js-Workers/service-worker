const brick = document.getElementById('brick');
const moveBtn = document.getElementById('move-btn');

const documentWidth = document.body.clientWidth;
const brickWidth = brick.clientWidth;

moveBtn.addEventListener('click', () => {
  const moveLeft = () => {
    const timer1 = setInterval(() => {
      if (brick.offsetLeft + brickWidth < documentWidth) {
        brick.style.left = `${brick.offsetLeft - 1}px`;
      } else {
        clearInterval(timer1);
        moveRight();
      }
    }, 50);
  };

  const moveRight = () => {
    const timer2 = setInterval(() => {
      if (brick.offsetLeft >= 8) {
        brick.style.left = `${brick.offsetLeft - 16}px`;
      } else {
        clearInterval(timer2);
        moveLeft();
      }
    }, 50);
  };

  moveLeft();
});
