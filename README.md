# service-worker
Experiments with service-worker

# To start project

* ```npm i```  
* ```npm run dev```

### Service worker

* не имеет доступа к DOM 
* работает в отдельном потоке от основного JavaScript 
* синхронные XHR и localStorage, не могут быть использованы в SW???
* SW запускаются только по HTTPS из соображений безопасности
* не работает localStorage
* можно использовать IndexedDB  

### Service worker будет следовать следующему жизненному циклу:

* Загрузка
* Установка
* Активация

### Useful links

* https://developers.google.com/web/ilt/pwa/tools-for-pwa-developers#offline
* https://github.com/jakearchibald/trained-to-thrill
* https://www.youtube.com/watch?v=4uQMl7mFB6g
* https://github.com/GoogleChrome/samples/tree/gh-pages/service-worker
