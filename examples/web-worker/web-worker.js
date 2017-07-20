self.addEventListener('message', event => {
  const {data} = event;
  const fib = n => {
    return n <= 1 ? n : fib(n - 1) + fib(n - 2);
  };

  setTimeout(() => {
    switch (data.type) {
      case 'fib':
        const result = fib(data.body);

        postMessage({result});
        break;
      default:
        postMessage(event.data);
    }
  }, 2000);
});
