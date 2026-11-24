/* Добавляем модуль http для создания сервера */
const http = require('node:http');

/* Добавляем модуль pg для работы с PostgreSQL */
const { Pool } = require('pg');

/* Создаем пул соединений с базой данных PostgreSQL */
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'book_shelf',
    password: process.env.DB_PASSWORD || 'postgres',
    port: process.env.DB_PORT || 5432,
});

pool.on('error', (err) => {
    console.error('Непредвиденная ошибка в пуле PostgreSQL: ', err.message);
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
                const id = parseInt(queryParams.get('id'));
                if (isNaN(id)) {
                    res.statusCode = 400;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: 'Некорректный ID книги' }));
                    return;
                }
                values.push(id);
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
                SELECT b.id, b.title, b.author, b.status, b.rating, b.created_at,
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
            
            if (newBook.title.length > 255) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Название книги не должно превышать 255 символов' }));
                return;
            }
            if (newBook.author.length > 255) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Имя автора не должно превышать 255 символов' }));
                return;
            }

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
    else if (/^\/books\/\d+\/?$/.test(parsedUrl.pathname) && req.method === 'PATCH') {
        const id = parseInt(parsedUrl.pathname.split('/')[2]);
        if (isNaN(id)) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Некорректный ID книги' }));
            return;
        }
        let updates;
        try {
            updates = await getRequestBody(req);
        } catch (err) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Некорректный JSON в теле запроса' }));
            return;
        }
        if(!updates || typeof updates !== 'object'|| Array.isArray(updates)) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Тело запроса должно быть объектом' }));
            return;
        }

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

        if (updates.title && updates.title.length > 255) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Название книги не должно превышать 255 символов' }));
            return;
        }
        if (updates.author && updates.author.length > 255) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Имя автора не должно превышать 255 символов' }));
            return;
        }


        try {
            const checkResult = await pool.query('SELECT * FROM books WHERE id = $1', [id]);
            if (checkResult.rowCount === 0) {
                res.statusCode = 404;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Книга не найдена' }));
                return;
            }

            const currentBook = checkResult.rows[0];

            const finalTitle = updates.title ?? currentBook.title;
            const finalAuthor = updates.author ?? currentBook.author;
            const finalStatus = updates.status ?? currentBook.status;
            let finalRating;
            if (finalStatus !== 'read') {
                finalRating = null;
            } else {
                finalRating = updates.rating !== undefined ? updates.rating : currentBook.rating;
            }

            const updateQuery = `
                UPDATE books
                SET title = $1, author = $2, status = $3, rating = $4
                WHERE id = $5
                RETURNING *;
            `;
            const updateResult = await pool.query(updateQuery, [finalTitle, finalAuthor, finalStatus, finalRating, id]);
            const updatedBook = updateResult.rows[0];

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(updatedBook));
        } catch (err) {
            console.error('Ошибка при выполнении запроса к базе данных:', err.message);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Внутренняя ошибка сервера' }));
        }
    }
    
    /* Обрабатываем DELETE-запросы к /books/:id для удаления книги по ID */
    else if (/^\/books\/\d+\/?$/.test(parsedUrl.pathname) && req.method === 'DELETE') {
        const id = parseInt(parsedUrl.pathname.split('/')[2]);
        if (isNaN(id)) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Некорректный ID книги' }));
            return;
        }
        
        try {
            const deleteResult = await pool.query('DELETE FROM books WHERE id = $1 RETURNING *;', [id]);
            if (deleteResult.rowCount === 0) {
                res.statusCode = 404;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Книга не найдена' }));
                return;
            }

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ message: 'Книга успешно удалена' }));
        } catch (err) {
            console.error('Ошибка при выполнении запроса к базе данных:', err.message);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Внутренняя ошибка сервера' }));
        }
    }

    /* Обрабатываем POST-запросы к /books/:id/notes для добавления заметки к книге по ID */
    else if (parsedUrl.pathname.startsWith('/books/') && parsedUrl.pathname.replace(/\/$/, '').endsWith('/notes') && req.method === 'POST') {
        const id = parseInt(parsedUrl.pathname.split('/')[2]);
        if (isNaN(id)) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Некорректный ID книги' }));
            return;
        }

        let newNote;
        try {
            newNote = await getRequestBody(req);
        } catch (err) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Некорректный JSON в теле запроса' }));
            return;
        }

        if(!newNote || typeof newNote !== 'object' || Array.isArray(newNote)) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Тело запроса должно быть объектом' }));
            return;
        }

        if (typeof newNote.text !== 'string' || !newNote.text.trim()) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Текст заметки должен быть непустой строкой' }));
            return;
        }
        newNote.text = newNote.text.trim();

        try {
            const checkResult = await pool.query('SELECT * FROM books WHERE id = $1', [id]);
            if (checkResult.rowCount === 0) {
                res.statusCode = 404;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Книга не найдена' }));
                return;
            }
            const insertResult = await pool.query('INSERT INTO notes (book_id, text) VALUES ($1, $2) RETURNING *;', [id, newNote.text]);
            res.statusCode = 201;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(insertResult.rows[0]));
        } catch (err) {
            console.error('Ошибка при выполнении запроса к базе данных:', err.message);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Внутренняя ошибка сервера' }));
        }
    }

    /* Обрабатываем PATCH-запросы к /notes/:id для обновления заметки по ID */
    else if (parsedUrl.pathname.startsWith('/notes/') && req.method === 'PATCH') {
        const noteId = parseInt(parsedUrl.pathname.split('/')[2]);
        if (isNaN(noteId)) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Некорректный ID заметки' }));
            return;
        }

        let updates;
        try {
            updates = await getRequestBody(req);
        } catch (err) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Некорректный JSON в теле запроса' }));
            return;
        }
        if(!updates || typeof updates !== 'object'|| Array.isArray(updates)) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Тело запроса должно быть объектом' }));
            return;
        }

        if (updates.text === undefined || typeof updates.text !== 'string' || !updates.text.trim()) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Текст заметки должен быть непустой строкой' }));
            return;
        }
        updates.text = updates.text.trim();

        try {
            const updateResult = await pool.query('UPDATE notes SET text = $1 WHERE id = $2 RETURNING *;', [updates.text, noteId]);

            if (updateResult.rowCount === 0) {
                res.statusCode = 404;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Заметка не найдена' }));
                return;
            }

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(updateResult.rows[0]));
        } catch (err) {
            console.error('Ошибка при выполнении запроса к базе данных:', err.message);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Внутренняя ошибка сервера' }));
        }
    }

    /* Обрабатываем DELETE-запросы к /notes/:id для удаления заметки по ID */
    else if (parsedUrl.pathname.startsWith('/notes/') && req.method === 'DELETE') {
        const noteId = parseInt(parsedUrl.pathname.split('/')[2]);
        if (isNaN(noteId)) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Некорректный ID заметки' }));
            return;
        }

        try {
            const deleteResult = await pool.query('DELETE FROM notes WHERE id = $1 RETURNING *;', [noteId]);
            if (deleteResult.rowCount === 0) {
                res.statusCode = 404;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Заметка не найдена' }));
                return;
            }
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ message: 'Заметка успешно удалена' }));
        } catch (err) {
            console.error('Ошибка при выполнении запроса к базе данных:', err.message);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Внутренняя ошибка сервера' }));
        }
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