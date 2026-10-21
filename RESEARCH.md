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

## Что понял:
1. `localStorage` сохраняет данные на диске браузера, но понимает только строки. Поэтому объекты и массивы всегда нужно пропускать через `JSON.stringify()`, а при чтении через `JSON.parse()`.
2. Если в `localStorage` ещё ничего нет, метод `getItem()` вернёт `null`. Чтобы код не падал с ошибкой, нужно ставить дефолтное значение: `JSON.parse(localStorage.getItem('books')) || []`.
3. Чтобы интерфейс не рассинхронизировался, данные меняем только в массиве JavaScript, а потом сохраняем массив в `localStorage` и вызываем функцию перерисовки экрана.
4. Каждой книге обязательно нужен уникальный идентификатор (`id = Date.now()`), чтобы при удалении или смене статуса не задеть одноимённые книги.
