const btn = document.getElementById('btn');
const brick = document.getElementById('brick');
const moveBtn = document.getElementById('move-btn');
const calcBtn = document.getElementById('calc-btn');

btn.addEventListener('click', () => {
  alert('This alert blocks js');
});

calcBtn.addEventListener('click', () => {
  let i = 0;
  while (i < 50000) {
    console.log(i++);
  }
});

const documentWidth = document.body.clientWidth;
const brickWidth = brick.clientWidth;

moveBtn.addEventListener('click', () => {
  const moveLeft = () => {
    const timer1 = setInterval(() => {
      if (brick.offsetLeft + brickWidth < documentWidth) {
        brick.style.left = `${brick.offsetLeft + 2}px`;
      } else {
        clearInterval(timer1);
        moveRight();
      }
    }, 50);
  };

  const moveRight = () => {
    const timer2 = setInterval(() => {
      if (brick.offsetLeft >= 8) {
        brick.style.left = `${brick.offsetLeft - 18}px`;
      } else {
        clearInterval(timer2);
        moveLeft();
      }
    }, 50);
  };

  moveLeft();
});
