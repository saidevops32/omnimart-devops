const express = require('express');
const { Pool } = require('pg');
const { DefaultAzureCredential } = require('@azure/identity');

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3002;
const AAD_TOKEN_SCOPE = 'https://ossrdbms-aad.database.windows.net/.default';

const credential = new DefaultAzureCredential();

async function getPgPool() {
  let password = process.env.DB_PASSWORD;

  if (!password) {
    try {
      const tokenResponse = await credential.getToken(AAD_TOKEN_SCOPE);
      password = tokenResponse.token;
    } catch (tokenErr) {
      console.warn('Could not acquire Entra ID token for Postgres:', tokenErr.message);
    }
  }

  return new Pool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'postgres',
    password: password || '',
    database: process.env.DB_NAME || 'omnimart_catalog',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : false
  });
}

let pool;
async function initDB() {
  try {
    pool = await getPgPool();
    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        price NUMERIC(10, 2) NOT NULL,
        unit VARCHAR(50) NOT NULL,
        stock_quantity INT NOT NULL DEFAULT 100,
        rating NUMERIC(2, 1) DEFAULT 4.8
      );
    `);

    const countRes = await pool.query('SELECT COUNT(*) FROM products');
    if (parseInt(countRes.rows[0].count, 10) === 0) {
      await pool.query(`
        INSERT INTO products (id, name, category, price, unit, stock_quantity, rating) VALUES
        ('PROD-001', 'Fresh Bananas (Robusta)', 'Fresh Fruits', 48.00, '1 kg', 120, 4.8),
        ('PROD-002', 'Full Cream Milk (Farm Fresh)', 'Dairy & Eggs', 33.00, '500 ml', 90, 4.9),
        ('PROD-003', 'Artisan Multigrain Sourdough', 'Bakery', 55.00, '400 g', 35, 4.7),
        ('PROD-004', 'Hydroponic Spinach', 'Vegetables', 35.00, '250 g', 60, 4.6),
        ('PROD-005', 'Hass Avocado (Imported)', 'Fresh Fruits', 99.00, '1 pc', 40, 4.5);
      `);
      console.log('[Catalog Service] Seeded PostgreSQL products catalogue.');
    }
  } catch (err) {
    console.error('[Catalog Service] DB connection failed:', err.message);
  }
}
initDB();

app.get('/api/catalog/healthz', async (req, res) => {
  try {
    if (!pool) pool = await getPgPool();
    await pool.query('SELECT 1');
    res.status(200).json({ status: 'healthy', service: 'catalog-node', mode: 'passwordless-workload-identity' });
  } catch (err) {
    res.status(500).json({ status: 'unhealthy', error: err.message });
  }
});

app.get('/api/catalog/items', async (req, res) => {
  try {
    if (!pool) pool = await getPgPool();
    const result = await pool.query('SELECT * FROM products ORDER BY category, name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve products' });
  }
});

app.listen(PORT, () => console.log(`[Catalog Service] Running on port ${PORT}`));
