const { Client } = require('pg');

const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'postgres',
    password: 'postgres',
    port: 5432,
});

async function clientDemo() {
    try {
        await client.connect();
        console.log('Connected to PostgreSQL database');

        await client.query(`
            CREATE TABLE IF NOT EXISTS test_table (
            id SERIAL PRIMARY KEY,
            title VARCHAR(50)
            );
        `);

        const insertRes = await client.query(`
            INSERT INTO test_table (title) VALUES ($1) RETURNING *;
        `, ['Sample Title2']);
        console.log('Inserted row:', insertRes.rows[0]);

        const selectRes = await client.query('SELECT * FROM test_table;');
        console.log('Selected rows:', selectRes.rows);
    } catch (err) {
        console.error('Error executing query', err.message);
    } finally {
        await client.end();
    }
}
clientDemo();

