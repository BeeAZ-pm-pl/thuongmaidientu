const bcrypt = require('bcryptjs');
const { initDb } = require('./db');

const findByUsernameOrEmail = async (identifier) => {
  const db = await initDb();
  const clean = identifier.trim().toLowerCase();
  const [rows] = await db.query(
    'SELECT * FROM admins WHERE LOWER(username) = ? OR LOWER(email) = ? LIMIT 1',
    [clean, clean]
  );
  return rows[0] || null;
};

const findById = async (id) => {
  const db = await initDb();
  const [rows] = await db.query('SELECT * FROM admins WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
};

const create = async ({ name, username, email, password, phone = '' }) => {
  const db = await initDb();
  const hashedPassword = await bcrypt.hash(password, 10);
  const id = `usr_adm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const cleanUsername = username.toLowerCase().trim();
  const cleanEmail = email.toLowerCase().trim();

  await db.query(
    'INSERT INTO admins (id, name, username, email, password, phone, role, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
    [id, name, cleanUsername, cleanEmail, hashedPassword, phone, 'admin']
  );

  return {
    id,
    name,
    username: cleanUsername,
    email: cleanEmail,
    role: 'admin',
    phone,
    createdAt: new Date().toISOString()
  };
};

const getAllAdmins = async () => {
  const db = await initDb();
  const [rows] = await db.query('SELECT id, name, username, email, role, phone, createdAt FROM admins ORDER BY createdAt DESC');
  return rows;
};

const updatePassword = async (id, newHashedPassword) => {
  const db = await initDb();
  await db.query('UPDATE admins SET password = ? WHERE id = ?', [newHashedPassword, id]);
  return true;
};

module.exports = {
  findByUsernameOrEmail,
  findById,
  create,
  getAllAdmins,
  updatePassword
};
