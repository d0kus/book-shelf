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

