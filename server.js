/* Добавляем модуль http для создания сервера */
const http = require('node:http');

const { Pool } = require('pg');

/* Создаем пул соединений с базой данных PostgreSQL */
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'book_shelf',
    password: process.env.DB_PASSWORD || 'postgres',
    port: process.env.DB_PORT || 5432,
});

/* Устанавливаем хост и порт для сервера */
const hostname = '127.0.0.1';
const port = 3000;

const validStatuses = ["want", "reading", "read"];

/* Функция для получения тела запроса в формате JSON */
function getRequestBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', chunk => {
            chunks.push(chunk);
        });
        req.on('end', () => {
            try {
                const body = Buffer.concat(chunks).toString('utf-8');
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

    let parsedUrl;
    try {
        parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    }
    catch (err) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Некорректный URL' }));
        return;
    }

    /* Обрабатываем GET-запросы к /books с фильтрацией по параметрам */
    if (parsedUrl.pathname === '/books' && req.method === 'GET') {
        try {
            const queryParams = parsedUrl.searchParams;
            
            const conditions = [];
            const values = [];

            if (queryParams.has('id')) {
                values.push(parseInt(queryParams.get('id')));
                conditions.push(`b.id = $${values.length}`);
            }

            if (queryParams.has('title')) {
                values.push(`%${queryParams.get('title').trim()}%`);
                conditions.push(`b.title ILIKE $${values.length}`);
            }

            if (queryParams.has('author')) {
                values.push(`%${queryParams.get('author').trim()}%`);
                conditions.push(`b.author ILIKE $${values.length}`);
            }

            if (queryParams.has('status')) {
                const statuses = queryParams.getAll('status');
                values.push(statuses);
                conditions.push(`b.status = ANY($${values.length})`);
            }

            const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

            const query = `
                SELECT b.id, b.title, b.author, b.status, b.rating,
                     COALESCE(json_agg(json_build_object('id', n.id, 'text', n.text, 'created_at', n.created_at) ORDER BY n.created_at DESC)
                    FILTER (WHERE n.id IS NOT NULL),
                    '[]'
                     ) AS notes
                FROM books b LEFT JOIN notes n ON b.id = n.book_id
                 ${whereClause}
                GROUP BY b.id
                ORDER BY b.id;
                `;
            const result = await pool.query(query, values);
                    
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(result.rows));
        } catch (err) {
            console.error('Ошибка при выполнении запроса к базе данных:', err.message);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Внутренняя ошибка сервера' }));
        }
    }
    
    /* Обрабатываем GET-запрос к корневому пути */
    else if (parsedUrl.pathname === '/' && req.method === 'GET') {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end('Добро пожаловать на сервер книг! Используйте /books для получения списка книг.');
    }

    /* Обрабатываем POST-запросы к /books для добавления новой книги */
    else if (parsedUrl.pathname === '/books' && req.method === 'POST') {
        try {
            const newBook = await getRequestBody(req);
            if (typeof newBook.title !== 'string' || !newBook.title.trim()) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Название книги должно быть непустой строкой' }));
                return;
            }
            if (!validStatuses.includes(newBook.status)) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Некорректный статус книги' }));
                return;
            }
            const isRatingInvalid = newBook.rating !== undefined && newBook.rating !== null && (!Number.isInteger(newBook.rating) || newBook.rating < 1 || newBook.rating > 5);
            if (isRatingInvalid) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Оценка должна быть числом от 1 до 5' }));
                return;
            }
            if (newBook.author !== undefined && typeof newBook.author !== 'string') {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Автор должен быть строкой' }));
                return;
            }
            newBook.title = newBook.title.trim();
            if (newBook.author) {
                newBook.author = newBook.author.trim();
            }
            newBook.author = newBook.author || "Неизвестный автор";
            
            if (newBook.status !== 'read') {
                newBook.rating = null;
            }
            else {
                newBook.rating = newBook.rating ?? null;
            }
            const insertQuery = `
                INSERT INTO books (title, author, status, rating)
                VALUES ($1, $2, $3, $4)
                RETURNING *;
            `;

            try {
                const result = await pool.query(insertQuery, [newBook.title, newBook.author, newBook.status, newBook.rating]);
                const createdBook = result.rows[0];
                createdBook.notes = [];
                res.statusCode = 201;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(createdBook));
            }
            catch (err) {
                console.error('Ошибка при выполнении запроса к базе данных:', err.message);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Внутренняя ошибка сервера' }));
            }
        }
        catch (err) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Некорректный JSON в теле запроса' }));
        }
    }

    /* Обрабатываем PATCH-запросы к /books/:id для обновления книги по ID */
    else if (parsedUrl.pathname.startsWith('/books/') && req.method === 'PATCH') {
        const id = parseInt(parsedUrl.pathname.split('/')[2]);
        if (isNaN(id)) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Некорректный ID книги' }));
            return;
        }
        const book = books.find(b => b.id === id);
        if (!book) {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Книга не найдена' }));
            return;
        }
        try {
            const updates = await getRequestBody(req);
            delete updates.id;
            if (updates.title !== undefined) {
                if (typeof updates.title !== 'string' || !updates.title.trim()) {
                    res.statusCode = 400;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: 'Название книги должно быть непустой строкой' }));
                    return;
                }
                updates.title = updates.title.trim();
            }
            if (updates.status !== undefined && !validStatuses.includes(updates.status)) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Некорректный статус книги' }));
                return;
            }
            if (updates.rating !== undefined && updates.rating !== null && (!Number.isInteger(updates.rating) || updates.rating < 1 || updates.rating > 5)) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Оценка должна быть числом от 1 до 5' }));
                return;
            }
            if (updates.author !== undefined) {
                if (typeof updates.author !== 'string') {
                    res.statusCode = 400;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: 'Автор должен быть строкой' }));
                    return;
                }
                updates.author = updates.author.trim() || "Неизвестный автор";
            }
            Object.assign(book, updates);
            if (book.status !== 'read') {
                book.rating = null;
            }
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(book));
        }
        catch (err) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Некорректный JSON в теле запроса' }));
        }
    }
    
    /* Обрабатываем DELETE-запросы к /books/:id для удаления книги по ID */
    else if (parsedUrl.pathname.startsWith('/books/') && req.method === 'DELETE') {
        const id = parseInt(parsedUrl.pathname.split('/')[2]);
        if (isNaN(id)) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Некорректный ID книги' }));
            return;
        }
        const book = books.find(b => b.id === id);
        if (!book) {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Книга не найдена' }));
            return;
        }
        books = books.filter(b => b.id !== id);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ message: 'Книга успешно удалена' }));
    }
        
    /* Обрабатываем остальные запросы */
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