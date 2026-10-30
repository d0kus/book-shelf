/* Добавляем модуль http для создания сервера */
const http = require('node:http');

/* Устанавливаем хост и порт для сервера */
const hostname = '127.0.0.1';
const port = 3000;

/* Захардоженные данные о книгах */
let books = [
    { id: 1, title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', status: 'read', rating: 5 },
    { id: 2, title: 'To Kill a Mockingbird', author: 'Harper Lee', status: 'reading', rating: null },
    { id: 3, title: '1984', author: 'George Orwell', status: 'want', rating: null }
]
const validStatuses = ["want", "reading", "read"];

function getRequestBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                const parsedBody = JSON.parse(body);
                resolve(parsedBody);
            }
            catch (err) {
                reject(err);
            }
        });
        req.on('error', err => {
            reject(err);
        });
    });
}



/* Создаем сервер и обрабатываем запросы */
const server = http.createServer(async (req, res) => {
    /* Устанавливаем заголовки для CORS */
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

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

        if (queryParams.has('status')) {
            const statuses = queryParams.getAll('status');
            filteredBooks = filteredBooks.filter(book => statuses.includes(book.status));
        }

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(filteredBooks));
    }
    
    else if (parsedUrl.pathname === '/' && req.method === 'GET') {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end('Добро пожаловать на сервер книг! Используйте /books для получения списка книг.');
    }

    else if (parsedUrl.pathname === '/books' && req.method === 'POST') {
        try {
            const newBook = await getRequestBody(req);
            if (!newBook.title || !newBook.title.trim() || !validStatuses.includes(newBook.status)) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Некорректные данные книги' }));
                return;
            }
            const isRatingInvalid = newBook.rating !== undefined && newBook.rating !== null && (!Number.isInteger(newBook.rating) || newBook.rating < 1 || newBook.rating > 5);
            if (isRatingInvalid) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Оценка должна быть числом от 1 до 5' }));
                return;
            }
            newBook.id = Date.now();
            newBook.title = newBook.title.trim();
            newBook.author = newBook.author ? newBook.author.trim() : 'Неизвестный автор';
            if (newBook.status !== 'read') {
                newBook.rating = null;
            }
            else {
                newBook.rating = newBook.rating ?? null;
            }
            books.push(newBook);
            res.statusCode = 201;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(newBook));
        }
        catch (err) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Некорректный JSON в теле запроса' }));
        }
    }

    else {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Страница не найдена' }));
    }
});

/* Запускаем сервер и выводим сообщение в консоль */
server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});