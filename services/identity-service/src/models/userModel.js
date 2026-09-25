const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
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
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'customer',
      phone VARCHAR(50) DEFAULT '',
      address TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  const [rows] = await pool.query('SELECT COUNT(*) as count FROM users');
  if (rows[0].count === 0) {
    const defaultAdminPass = await bcrypt.hash('admin', 10);
    const defaultAdminShopPass = await bcrypt.hash('123456', 10);
    const defaultCustomerPass = await bcrypt.hash('123456', 10);

    await pool.query(
      `INSERT INTO users (id, name, email, password, role, phone, address) VALUES 
      (?, ?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?, ?)`,
      [
        'usr_admin_root', 'Quản Trị Viên', 'admin', defaultAdminPass, 'admin', '0988888888', 'Hà Nội, Việt Nam',
        'usr_admin_01', 'Quản trị viên Hệ thống', 'admin@shop.com', defaultAdminShopPass, 'admin', '0988888888', 'Hà Nội, Việt Nam',
        'usr_customer_01', 'Nguyễn Văn Khách', 'customer@shop.com', defaultCustomerPass, 'customer', '0912345678', 'Hồ Chí Minh, Việt Nam'
      ]
    );
  } else {
    const [adminRow] = await pool.query('SELECT id FROM users WHERE email = ?', ['admin']);
    if (adminRow.length === 0) {
      const defaultAdminPass = await bcrypt.hash('admin', 10);
      await pool.query(
        'INSERT INTO users (id, name, email, password, role, phone, address) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ['usr_admin_root', 'Quản Trị Viên', 'admin', defaultAdminPass, 'admin', '0988888888', 'Hà Nội, Việt Nam']
      );
    }
  }

  return pool;
};

const findByEmail = async (emailOrUsername) => {
  const db = await initDb();
  const [rows] = await db.query('SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1', [emailOrUsername]);
  return rows[0] || null;
};

const findById = async (id) => {
  const db = await initDb();
  const [rows] = await db.query('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
};

const create = async ({ name, email, password, role = 'customer', phone = '', address = '' }) => {
  const db = await initDb();
  const hashedPassword = await bcrypt.hash(password, 10);
  const id = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const cleanEmail = email.toLowerCase().trim();

  await db.query(
    'INSERT INTO users (id, name, email, password, role, phone, address, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
    [id, name, cleanEmail, hashedPassword, role, phone, address]
  );

  return {
    id,
    name,
    email: cleanEmail,
    role,
    phone,
    address,
    createdAt: new Date().toISOString()
  };
};

const getAllUsers = async () => {
  const db = await initDb();
  const [rows] = await db.query('SELECT id, name, email, role, phone, address, createdAt FROM users ORDER BY createdAt DESC');
  return rows;
};

const updateProfile = async (id, { name, phone, address }) => {
  const db = await initDb();
  await db.query(
    'UPDATE users SET name = COALESCE(?, name), phone = COALESCE(?, phone), address = COALESCE(?, address) WHERE id = ?',
    [name || null, phone || null, address || null, id]
  );
  return findById(id);
};

const updatePassword = async (id, newHashedPassword) => {
  const db = await initDb();
  await db.query('UPDATE users SET password = ? WHERE id = ?', [newHashedPassword, id]);
  return true;
};

module.exports = {
  initDb,
  findByEmail,
  findById,
  create,
  getAllUsers,
  updateProfile,
  updatePassword
};
