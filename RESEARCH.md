# Итерация 0: 

## Что изучил:
### 1. localStorage методы:
```
localStorage.setItem('key', 'value')      добавляет значение с ключом для доступа

localStorage.getItem('key')               получает значение от ключа

localStorage.removeItem('key')            удаляет значение по ключу

localStorage.clear()                      очищает полностью весь local storage
```

### 2. методы JSON.stringify() и JSON.parse()
```
const book = {
  id: 1,
  title: "Чистый код",
  author: "Роберт Мартин",
}

JSON.stringify(value)       преобразует значение в JSON

const bookString = JSON.stringify(book);
console.log(bookString);            вывод: {"id":1,"title":"Чистый код","author":"Роберт Мартин"}



JSON.parse(text)            разбирает строку JSON

const rawText = localStorage.getItem('my_saved_book');          rawText равен: '{"id":1,"title":"Чистый код","author":"Роберт Мартин"}

const restoredBook = JSON.parse(rawText);
console.log(restoredBook.title);  // "Чистый код"
```

### 3. метод event.preventDefault()

Убирает станадртную перезагрузку страницы при отправке формы

### 4. методы .push(), .map(), .filter()
```
array.push(element);     добавляет элемент

array.filter(book => book.status === "reading");      вернет новый массив с заданным условием

array.map(book => {                                   перебирает массив и применяет функцию к каждому элементу массива
  if (book.id === targetId) {
    return { ...book, status: newStatus }; 
  }
  return book; // чужие книги не трогаем
});
```
### 5. метод .trim()
```
const rawTitle = "   Гарри Поттер   ";
const cleanTitle = rawTitle.trim();     "Гарри Поттер"
```

### 6. метод .find()
```
books.find(book => book.id === bookId)    ищет одну книгу по условию
```

### 7. метод includes()

проверяет есть ли элемент внутри массива(true/false)

### 8. метод Array.from

превращает псевдомассив в настоящий массив

### 9. event.target

конкретный элемент по которому кликнул пользователь

### 10. element.closest()
`element.closest('.book_card')` идет от кликнутого элемента вверх до первого родительского элеменета с нужным условием

### 11. card.dataset.id / card.dataset.status

удобный способ читать и записывать data-* атрибуты прямо из HTML(возвращает string)


### 12. разница событий
- **submit** — отправка формы.
- **input** — срабатывает в реальном времени при каждом нажатии клавиши
- **change** — срабатывает при выборе в \<select> или переключении чекбокса.

## Что понял:
1. `localStorage` сохраняет данные на диске браузера, но понимает только строки. Поэтому объекты и массивы всегда нужно пропускать через `JSON.stringify()`, а при чтении через `JSON.parse()`.

2. Если в `localStorage` ещё ничего нет, метод `getItem()` вернёт `null`. Чтобы код не падал с ошибкой, нужно ставить дефолтное значение: `JSON.parse(localStorage.getItem('books')) || []`.

3. Чтобы интерфейс не рассинхронизировался, данные меняем только в массиве JavaScript, а потом сохраняем массив в `localStorage` и вызываем функцию перерисовки экрана.

4. Каждой книге обязательно нужен уникальный идентификатор (`id = Date.now()`), чтобы при удалении или смене статуса не задеть одноимённые книги.

5. Делегирование событий (Event Delegation):
Вместо того чтобы создавать десятки слушателей кликов на каждую кнопку удаления или звездочку, мы вешаем один слушатель на общий контейнер booksList. Это сильно экономит память браузера и работает для любых новых книг, которые добавятся позже.

6. UI как функция от данных:
не меняем вручную разметку в пяти местах. Наш массив books — единственный источник правды. Мы просто меняем поле в объекте (book.status = ... или book.rating = ...) и вызываем renderBooks(), который сам перерисовывает полку.

## Исследование XSS-уязвимости и безопасность:
### Что такое XSS (Cross-Site Scripting):
Это уязвимость, возникающая при прямой вставке непроверенных пользовательских данных в HTML через `innerHTML`. Если пользователь введет теги вроде `<script>` или `<img src=x onerror=...>`, браузер выполнит этот код в контексте текущей страницы, что позволяет украсть данные (например, из `localStorage` или cookie).

### https://thecode.media/chto-takoe-xss-uyazvimost/
### https://developer.mozilla.org/en-US/docs/Web/Security/Attacks/XSS#defenses_against_xss

### Два способа решения:
1. **Способ 1: Отказ от innerHTML в пользу чистого DOM API (`document.createElement()`)**  
   Создавать все элементы вручную в коде и наполнять их через безопасное свойство `.textContent`. Свойство `textContent` вставляет данные исключительно как текст и никогда не парсит HTML.
   * *Минус:* код создания карточек сильно раздувается (десятки строчек `createElement`, `classList.add`, `appendChild`).
2. **Способ 2: Функция экранирования HTML-сущностей (`escapeHtml`)**  
   Преобразовывать спецсимволы `<`, `>`, `&`, `"`, `'` в их безопасные HTML-коды (`&lt;`, `&gt;` и т.д.) перед вставкой в шаблонную строку.
### Почему я выбрал Способ 2:
Я выбрал функцию санитизации `escapeHtml`, которая использует браузерный механизм `textContent` для автоматического экранирования. Ее легко реализовать и это позволило сохранить читаемый и лаконичный синтаксис шаблонных строк для верстки карточки книги, при этом на 100% нейтрализовать внедрение вредоносных тегов и инлайн-скриптов.

# Итерация 1: Сервер

## Что изучил: 

### Callback
```
function loadScript(src, callback) {
  let script = document.createElement('script');
  script.src = src;

  script.onload = () => callback(null, script);
  script.onerror = () => callback(new Error(`Ошибка загрузки скрипта ${src}`));

  document.head.append(script);
}
```
функция callback  заработает только тогда когда загрузится скрипт 

**callback** - функция, переданная аргументом, чтобы её вызвала другая функция.

### Promise
```
function loadScriptPromise(src) {
  return new Promise((resolve, reject) => {
    let script = document.createElement('script');
    script.src = src;

    script.onload = () => resolve(script);

    script.onerror = () => reject(new Error(`Ошибка загрузки: ${src}`));

    document.head.append(script);
  });
}


loadScriptPromise('/script1.js')
  .then((script) => {
    console.log("Скрипт 1 загружен!");
    return loadScriptPromise('/script2.js');
  })
  .then((script) => {
    console.log("Скрипт 2 загружен!");
  })
  .catch((err) => {
    console.error("Произошла ошибка:", err);
  });
```
**then** срабатывает при **resolve**

**catch** срабатывает при **reject**

### await / async

```
async function showDashboard() {
  try {
    const user = await getUser(1);
    console.log("Пользователь:", user.name);

    const orders = await getOrders(user.id);
    console.log("Заказы:", orders);

  } catch (err) {

    console.error("Ошибка:", err.message);
  } finally {
    console.log("Завершение работы");
  }
}

showDashboard();
```
`async` Савится перед объявлением функции, ВСЕГДА возвращает Промис

`await` ждет пока промис вернет значение, ставит функцию в которой она находится на паузу если промис упал, возвращает исключение



### Импортирование модулей `require('...')`;
```
const http = require('node:http');

импортирует модуль "http"
```

### Модуль http:

#### Метод createServer()
```
const server = http.createServer((req, res) => {        создает новый http сервер и возваращет его
  res.statusCode = 200              возвращаемый статус код
  res.setHeader('Content-Type', 'text/plain')     Заголовок 'Content-Type'
  res.end('Hello World\n')            возвраащемый ответ
})
```
Сервер получает запрос, вызывается событие request, представляющее два обьекта:

Первый — это **запрос** (req, объект http.IncomingMessage)

Второй — **ответ** (res, объект http.ServerResponse)

### server.listen()

```
server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`)
})
```
запускает сервер на выбранном порту и адресе

### Методы incomingMessage
`message.headers`
```
{
   'user-agent': 'curl/7.22.0',
   host: '127.0.0.1:8000',
   accept: '*/*' 
}
```

`message.method`
возвращает метод запроса(GET, POST, DELETE, PUT)

`message.url`
```
GET http://localhost:3000/users?id=42&role=admin
req.url = "/users?id=42&role=admin"
```
метод .url возвращает неудобную версию запроса в виде /...

`new URL(req.url, base)`
```
const parsedUrl = new URL(req.url, `http://${req.headers.host}`);

parsedUrl.href             вернет полную ссылку "http://localhost:3000/api/v1/users"
parsedUrl.pathname        "/users"
parsedUrl.search          "?id=42&role=admin"
parsedUrl.searchParams     Специальный объект URLSearchParams

parsedUrl.password        ":...."
parsedUrl.hash            "#..."
```
base должен быть корректным адресом типа http://....

`URLSearchParams`
```
const url = new URL('https://site.com/catalog?category=phones&page=2&tag=apple&tag=sale&filter=');

searchParams.get('category');    "phones"
searchParams.get('page');        "2" (ВНИМАНИЕ: это строка, не число!)
searchParams.get('unknown');      null (ключа нет)
searchParams.get('filter');      "" (пустая строка, ключ есть, но без значения)

searchParams.getAll('tag');       ["apple", "sale"]

searchParams.has('category');     true
```

`message.httpVersion`
версия http протокола


`req.on('data', ...)` - при получении порции данных — выполни эту функцию

`req.on('end', ...)` - при окончании передачи данных — выполни эту функцию

### Методы ServerResponse

`response.setHeader(name, value)`

```
response.setHeader('Content-Type', 'text/html');
```
создает заголовок ответа

`response.end([data])`

```
res.end('Hello World');
res.end(JSON.stringify({ success: true }));
res.statusCode = 204;
res.end();
```

`res.getHeader('Content-Type')`
читает существуюущий заголовок

`res.hasHeader('Content-Type')`
проверяет существует ли заголовк

`res.removeHeader('Content-Type')`
удаляет заголовок

`res.writeHead(statusCode, [headers])`
```
const body = 'hello world';
response
  .writeHead(200, {
    'Content-Length': Buffer.byteLength(body),
    'Content-Type': 'text/plain',
  })
  .end(body);
 ```

`res.write(chunk)`
```
res.write('Часть 1...\n');
res.write('Часть 2...\n');
res.write('Часть 3...\n');
res.end('Финальная часть.');
```

`res.statusCode`
```
res.statusCode = 404;
res.end('Страница не найдена');
```
для показа статус кода

###  Некоторые виды headers

**Content-Type**: показывает формат данных, которые лежат в теле.

**Access-Control-Allow-Origin: \***: Сервер говорит браузеру: «Разрешаю сайтам с других доменов/портов читать мои ответы»

**Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS**: Список разрешенных HTTP-методов для внешних сайтов.

**Access-Control-Allow-Headers: Content-Type, Authorization**: Разрешение клиенту отправлять кастомные заголовки.

### Важные Content-Type виды

**1. application/json**: данные в формате JSON

**2. text/html; charset=utf-8**: веб-страница с разметкой.

**3. text/plain**: обычный голый текст без всякого оформления.

**4. multipart/form-data**: формат для отправки бинарных файлов (картинки, PDF, аватарки).


### Object.assign
```
const book = { id: 1, title: '1984', status: 'want', rating: null };
const updates = { status: 'read', rating: 5 };

Object.assign(book, updates);

status и rating обновится а все остальное останется не тронутым
```

### `fetch()`
`fetch(куда, { настройки });`
**встроенный в браузер инструмент для отправки HTTP-запросов по сети**
```
const response = await fetch(API_URL);  Браузер отправляет запрос на сервер и ждёт, пока сервер пришлёт заголовки и статус-код
books = await response.json();         Браузер дожидается окончания загрузки всех чанков и превращает полученную JSON-строку в готовый массив объектов.
```

### Buffer.concat()
Сшивает все части байтов в единную непрерывную ленту памяти

## Что понял: 
1. **Потоки (Readable Streams) и буферы в Node.js:** Запрос `req` передаёт данные не сразу целиком, а чанками сырых байтов (`Buffer`). Их нужно собирать через событие `'data'` и обрабатывать по событию `'end'`, после перерабатывать их функцией `toString`.

2. **Промисы и async/await:** Оборачивание событий потока Node.js в `new Promise((resolve, reject) => ...)` позволяет писать линейный и понятный асинхронный код через `await` и избегать Callback Hell.

3. **CORS и Preflight (метод OPTIONS):** Браузер в целях безопасности отправляет предварительный запрос `OPTIONS` перед запросами (`POST`, `PATCH`, `DELETE` с `Content-Type: application/json`). Сервер обязан ответить `204 No Content` с разрешающими заголовками `Access-Control-Allow-*`.

4. **Дефолт REST API:** Чёткое разделение между параметрами пути (`/books/:id` для идентификации конкретного ресурса) и Query-параметрами (`/books?status=...` для фильтрации списка).

5. **Пессимистичный UI:** Интерфейс не должен вводить пользователя в заблуждение — все изменения на экране происходят строго после успешного ответа сервера (`response.ok`).

## С чем возникли сложности:
- **Особенность `fetch()` при ошибках HTTP:** `fetch` не падает в блок `catch` при статус-кодах 400, 404 или 500, так как считает сам факт ответа сервера успехом. Для перехвата ошибок обязательна проверка `if (!response.ok)`.
- **Парсинг некорректных URL (`new URL`):** парсер `new URL(req.url, base)` в соответствии со стандартом WHATWG выбрасывает ошибку `ERR_INVALID_URL` при относительных путях вроде `//`. Без блока `try...catch` это приводило к падению процесса Node.js вместо возврата клиенту `400 Bad Request`.
- **Пустые значения при валидации `PATCH`:** проверка вида `if (updates.status)` пропускала пустую строку `""` или `null`, обходя валидацию допустимых статусов. Для частичных обновлений обязательна строгая проверка через `updates.status !== undefined`.
- **Блочная область видимости в `try catch`:** переменные, объявленные через `const` внутри `try`, недоступны снаружи блока. Чтобы объект `parsedUrl` был доступен дальше по всей цепочке роутинга, его потребовалось объявить через `let` перед блоком `try`.

### Использованные источники
**[Http Nodejs](https://nodejs.org/docs/latest/api/http.html)**

**[Object.assign](https://developer.mozilla.org/ru/docs/Web/JavaScript/Reference/Global_Objects/Object/assign)**

**[CORS](https://developer.mozilla.org/ru/docs/Web/HTTP/CORS)**

**[fetch](https://developer.mozilla.org/ru/docs/Web/API/Fetch_API/Using_Fetch)**

**[URL](https://developer.mozilla.org/en-US/docs/Web/API/URL)**

**[Buffer.concat](https://nodejs.org/api/buffer.html#static-method-bufferconcatlist-totallength)**

**[serve (npm)](https://www.npmjs.com/package/serve)**

### Использование ИИ *(журнал восстановлен задним числом)*

### 1.
* **Запрос:** Зачем в чистом Node.js нужен Promise для чтения тела POST-запроса? Что такое Callback Hell?

* **Ответ ИИ:** Объяснение  ReadableStream, событий 'data' и 'end', пример промисификации сбора чанков в функцию getRequestBody.

### 2.
* **Запрос:** Зачем серверу метод OPTIONS и почему мы пишем return после 204? Зачем нужны заголовки Access-Control-Allow-*?

* **Ответ ИИ:** Принцип безопасности Same-Origin Policy в браузере, механизм работы preflight-разведчика перед отправкой JSON и разницу между простыми и сложными междоменными запросами.

### 3.
* **Запрос:** Как правильно извлекать ID из пути (/books/:id)? Как работает метод `Number.isInteger`? Что делает `Object.assign`? Почему после добавления книги лучше делать `books.push(newBook)`, а не вызывать повторный `fetchBooks()`?

* **Ответ ИИ:** Разница между Path и Query параметрами по стандартам REST, экономию трафика и сетевых запросов (1 запрос вместо 2), механизм поверхностного слияния объектов.

### 4.
* **Запрос:** Как работать с fetch при POST и PATCH запросах.

* **Ответ ИИ:** Обьяснение дополнительных параметров в fetch.

### 5.
* **Запрос:** Почему `parsedUrl` объявляется через `let` перед `try/catch`, а не внутри? Почему `fetch()` не выбрасывает ошибку при статус-кодах 400 и 500 и как извлечь текст ошибки сервера в Toast-уведомление?
* **Ответ ИИ:** Объяснение блочной области видимости в JavaScript, разбор флага `response.ok` и безопасное чтение тела ошибки через `await response.json().catch(() => null)`.

### 6.
* **Запрос:** Почему запуск фронтенда через `file://` (двойным кликом) не подходит для веб-приложений? Как работает утилита `npx serve .` и чем она отличается от запуска через Live Server в VS Code?
* **Ответ ИИ:** Объяснение ограничений безопасности браузера при открытии через `file://` (заголовок Origin равен null, строгие политики CORS, проблемы с относительными путями). Разбор утилиты `npx serve`, которая без установки глобальных пакетов раздаёт текущую директорию (`.`) по протоколу HTTP и автоматически ищет `index.html`.


# Итерация 2: База данных
## Что изучил:

# Пакет pg(node-postgres)

**Client, Pool** - это типы подключения к базе данных

**Client** - одиночное подключение(используется для разовых скриптов)

**Pool** - групповое подключение(используется когда делают много запросов и много людей)

**подключение через Pool**
- `const { Pool } = require('pg');`

**подключение через Client**
- `const { Client } = require('pg');`

**можно использовать сразу 2**
- `const { Pool, Client } = require("pg");`


`new Client(config) / new Pool(config)` - создание клиента/пула


**Пример config:**
```
const config = {
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'твой_пароль',
  database: 'postgres',
};


const client = new Client(config);
const pool = new Pool(config);
```

**Команда: `.connect()`**
Для подключения клиента, используется в основном с Client

`.release()` вернуть/отпустить клиента обратно в пул если используешь в pool обязательно

**Команда: `.query(...)` - запрос** 

`const res = await pool.query(...)`

`res.rows` - массив строк из базы данных

`res.rowCount` - количество строк которые затронул запрос

**Параметризованный запрос**
```
const text = 'INSERT INTO users(name, email) VALUES($1, $2) RETURNING *'
const values = ['brianc', 'brian.m.carlson@gmail.com']
 
const res = await client.query(text, values)
console.log(res.rows[0])
// { name: 'brianc', email: 'brian.m.carlson@gmail.com' }
```
**$1, $2... это места в которые будут вставлятся данные из 2 параметра query() по очереди с начала до конца**

`await client.end() / await pool.end()`
Закрывает соединения, чтобы скрипт Node.js не зависал в терминале.


## Что понял:
1. **Разница между `Client` и `Pool`:**
   - **`Client`** держит ровно одно физическое соединение. Он выполняет строго один запрос за раз и требует ручного подключения (`connect()`) и закрытия (`end()`). Подходит для разовых утилит и скриптов.
   - **`Pool`** — это пул (набор) переиспользуемых клиентов. Он держит открытыми несколько соединений и выдаёт свободного клиента при запросе от пользователя. Необходим для долгоживущего веб-сервера, чтобы не тратить ресурсы на повторное TCP-рукопожатие при каждом HTTP-запросе.
2. **Обычные vs Параметризованные запросы (`$1, $2`):**
   - Обычная склейка строк через `${value}` опасна уязвимостью SQL Injection и ломается на кавычках (например, в названиях вроде `Mcdonald's`).
   - Параметризованный запрос разделяет команду и данные: Node.js передаёт каркас SQL и массив значений раздельно. База данных сначала компилирует структуру команды, а значения подставляет строго как сырые данные, что гарантирует 100% безопасность.
3. **Результат `res`:**
   - Результат запроса всегда лежит массивом объектов в `res.rows`.
   - Поле `res.rowCount` содержит количество затронутых строк (позволяет легко возвращать 404, если при DELETE/UPDATE ничего не найдено).


## Что не понял/вызвало сложности:
1. **Механизм передачи параметров `$1, $2`:**  
   *Вопрос:* Не понимал, делает ли библиотека `pg` простую замену подстрок через `.replace()`.  
   *Как разобрался:* Изучил документацию протокола — база принимает каркас и параметры двумя отдельными сетевыми пакетами, подстановка происходит внутри движка БД, а не в JS.



## Хранение медиа-файлов в базе данных
**Вывод:**
В базе данных медиа файлы можно хранить в виде ссылок на них, к примеру загрузить в облако, либо хранить относительную ссылку к корню проекта

### Источники:
[pg(node-postgres)](https://node-postgres.com)

https://habr.com/ru/companies/otus/articles/828684/

https://dev.to/thisdotmedia/connecting-to-postgresql-with-node-js-k6k
