# service-worker
Experiments with service-worker


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
