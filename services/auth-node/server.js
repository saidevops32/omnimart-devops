const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { DefaultAzureCredential } = require('@azure/identity');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'omnimart_devsecops_jwt_secret_token';
const AAD_TOKEN_SCOPE = 'https://ossrdbms-aad.database.windows.net/.default';

const credential = new DefaultAzureCredential();

async function getDbConnection() {
  let password = process.env.DB_PASSWORD;

  // Use Workload Identity token if no static password is set
  if (!password) {
    try {
      const tokenResponse = await credential.getToken(AAD_TOKEN_SCOPE);
      password = tokenResponse.token;
    } catch (tokenErr) {
      console.warn('Could not fetch Entra ID token, falling back to empty password:', tokenErr.message);
    }
  }

  return mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: password || '',
    database: process.env.DB_NAME || 'omnimart_auth',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : false
  });
}

async function initDB() {
  let conn;
  try {
    conn = await getDbConnection();
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        full_name VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('[Auth Service] Connected to MySQL and validated schema.');
  } catch (err) {
    console.error('[Auth Service] DB Init Error:', err.message);
  } finally {
    if (conn) await conn.end();
  }
}
initDB();

app.get('/api/auth/healthz', async (req, res) => {
  let conn;
  try {
    conn = await getDbConnection();
    await conn.ping();
    res.status(200).json({ status: 'healthy', service: 'auth-node', mode: 'passwordless-workload-identity' });
  } catch (err) {
    res.status(500).json({ status: 'unhealthy', error: err.message });
  } finally {
    if (conn) await conn.end();
  }
});

app.post('/api/auth/register', async (req, res) => {
  let conn;
  try {
    const { email, password, full_name } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const hashedPassword = await bcrypt.hash(password, 10);
    conn = await getDbConnection();
    const [result] = await conn.query(
      'INSERT INTO users (email, password, full_name) VALUES (?, ?, ?)',
      [email, hashedPassword, full_name || 'Customer']
    );

    res.status(201).json({ message: 'User registered successfully', userId: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ error: 'Email is already registered' });
    } else {
      res.status(500).json({ error: err.message });
    }
  } finally {
    if (conn) await conn.end();
  }
});

app.post('/api/auth/login', async (req, res) => {
  let conn;
  try {
    const { email, password } = req.body;
    conn = await getDbConnection();
    const [rows] = await conn.query('SELECT * FROM users WHERE email = ?', [email]);

    if (rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { userId: user.id, email: user.email, name: user.full_name },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    res.json({ message: 'Authentication successful', token, user: { id: user.id, email: user.email, name: user.full_name } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.end();
  }
});

app.listen(PORT, () => console.log(`[Auth Service] Running on port ${PORT}`));
