const mysql = require('mysql2/promise');
const config = require('../config');

let pool = null;

const initDb = async () => {
  if (pool) return pool;

  const connection = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password
  });

  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${config.db.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await connection.end();

  pool = mysql.createPool({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id VARCHAR(64) PRIMARY KEY,
      type VARCHAR(100) NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      recipient VARCHAR(100) DEFAULT 'admin',
      metadata JSON,
      isRead BOOLEAN DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  return pool;
};

const formatNotificationRow = (row) => {
  if (!row) return null;
  return {
    ...row,
    read: Boolean(row.isRead),
    metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata
  };
};

const getAll = async () => {
  const db = await initDb();
  const [rows] = await db.query('SELECT * FROM notifications ORDER BY createdAt DESC');
  return rows.map(formatNotificationRow);
};

const create = async ({ type, title, message, recipient = 'admin', metadata = {} }) => {
  const db = await initDb();
  const id = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  await db.query(
    'INSERT INTO notifications (id, type, title, message, recipient, metadata, isRead, createdAt) VALUES (?, ?, ?, ?, ?, ?, 0, NOW())',
    [id, type, title, message, recipient, JSON.stringify(metadata)]
  );

  return {
    id,
    type,
    title,
    message,
    recipient,
    metadata,
    read: false,
    createdAt: new Date().toISOString()
  };
};

const markAsRead = async (id) => {
  const db = await initDb();
  await db.query('UPDATE notifications SET isRead = 1 WHERE id = ?', [id]);
  const [rows] = await db.query('SELECT * FROM notifications WHERE id = ? LIMIT 1', [id]);
  if (rows.length === 0) return null;
  return formatNotificationRow(rows[0]);
};

module.exports = {
  initDb,
  getAll,
  create,
  markAsRead
};
