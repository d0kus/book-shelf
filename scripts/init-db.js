const { Client } = require('pg');

const baseConfig = {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    password: process.env.DB_PASSWORD || 'postgres',
};

const client = new Client({
    ...baseConfig,
    database: 'postgres',
});

async function initDB() {
    try {
        await client.connect();
        console.log('Connected to PostgreSQL database');

        const checkDb = await client.query(`SELECT 1 FROM pg_database WHERE datname = $1;`, [process.env.DB_NAME || 'book_shelf']);

        if (checkDb.rowCount === 0) {
            await client.query(`CREATE DATABASE ${process.env.DB_NAME || 'book_shelf'};`);
            console.log(`Database ${process.env.DB_NAME || 'book_shelf'} created successfully.`);
        }
        else {
            console.log(`Database ${process.env.DB_NAME || 'book_shelf'} already exists.`);
        }
    } catch (err) {
        console.error('Error executing query', err.message);
    } finally {
        await client.end();
    }
}

const client2 = new Client({
    ...baseConfig,
    database: process.env.DB_NAME || 'book_shelf',
});

async function createTables() {
    try {
        await client2.connect();
        console.log(`Connected to PostgreSQL database ${process.env.DB_NAME || 'book_shelf'}`);

        await client2.query(`DROP TABLE IF EXISTS books,notes CASCADE;`);
        console.log('Старые таблицы успешно удалены (если они были).');


        await client2.query(`
            CREATE TABLE IF NOT EXISTS books (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                author VARCHAR(255) NOT NULL DEFAULT 'Неизвестный автор',
                status VARCHAR(50) NOT NULL DEFAULT 'want' CHECK (status IN ('want', 'reading', 'read')),
                rating INT CHECK (rating BETWEEN 1 AND 5),
                created_at TIMESTAMPTZ DEFAULT NOW()
            )`
        );
        
        await client2.query(`
            CREATE TABLE IF NOT EXISTS notes (
                id SERIAL PRIMARY KEY,
                book_id INT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
                text TEXT NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_notes_book_id ON notes(book_id);`
        );
        console.log('Таблицы books и notes успешно созданы.');

        await client2.query(`
            INSERT INTO books (title, author, status, rating) VALUES
            ('The Great Gatsby', 'F. Scott Fitzgerald', 'read', 5),
            ('To Kill a Mockingbird', 'Harper Lee', 'reading', NULL),
            ('1984', 'George Orwell', 'want', NULL),
            ('Pride and Prejudice', 'Jane Austen', 'read', 3);
        `);
        console.log('Данные успешно вставлены в таблицу books.');

        await client2.query(`
            INSERT INTO notes (book_id, text) VALUES
            (1, 'A classic novel set in the Jazz Age.'),
            (1, 'Explores themes of wealth, love, and the American Dream.'),
            (2, 'A powerful story about racial injustice.'),
            (3, 'A dystopian novel that explores totalitarianism.'),
            (4, 'A romantic novel that critiques societal norms.');
        `);
        console.log('Данные успешно вставлены в таблицу notes.');

    } catch (err) {
        console.error('Error executing query', err.message);
    } finally {
        await client2.end();
    }
}

async function main() {
    await initDB();
    await createTables();
}

main();
