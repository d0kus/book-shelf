/* Добавляем модуль http для создания сервера */
const http = require('node:http');

/* Устанавливаем хост и порт для сервера */
const hostname = '127.0.0.1';
const port = 3000;

/* Захардоженные данные о книгах */
let books = [
    { id: 1, title: 'The Great Gatsby', author: 'F. Scott Fitzgerald' },
    { id: 2, title: 'To Kill a Mockingbird', author: 'Harper Lee' },
    { id: 3, title: '1984', author: 'George Orwell' }
]


/* Создаем сервер и обрабатываем запросы */
const server = http.createServer((req, res) => {
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    if (parsedUrl.pathname === '/books' && req.method === 'GET') {
        const queryParams = parsedUrl.searchParams;
        let filteredBooks = books;

        if (queryParams.has('id')){
            const id = parseInt(queryParams.get('id'));
            filteredBooks = filteredBooks.filter(book => book.id === id);
        }

        if (queryParams.has('author')) {
            const author = queryParams.get('author').trim().toLowerCase();
            filteredBooks = filteredBooks.filter(book => book.author.toLowerCase().includes(author));
        }

        if (queryParams.has('title')) {
            const title = queryParams.get('title').trim().toLowerCase();
            filteredBooks = filteredBooks.filter(book => book.title.toLowerCase().includes(title));
        }

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(filteredBooks));
    }
    
    else if (parsedUrl.pathname === '/' && req.method === 'GET') {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/plain');
        res.end('Welcome to the Book API, try /books to see the list of books');
    }
    else {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Not Found' }));
    }
});

/* Запускаем сервер и выводим сообщение в консоль */
server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});