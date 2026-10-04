const bcrypt = require('bcryptjs');
const { initDb } = require('./db');

const findByEmail = async (email) => {
  const db = await initDb();
  const [rows] = await db.query('SELECT * FROM customers WHERE LOWER(email) = LOWER(?) LIMIT 1', [email.trim()]);
  return rows[0] || null;
};

const findById = async (id) => {
  const db = await initDb();
  const [rows] = await db.query('SELECT * FROM customers WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
};

const create = async ({ name, email, password, phone = '', address = '' }) => {
  const db = await initDb();
  const hashedPassword = await bcrypt.hash(password, 10);
  const id = `usr_cust_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const cleanEmail = email.toLowerCase().trim();

  await db.query(
    'INSERT INTO customers (id, name, email, password, phone, address, role, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
    [id, name, cleanEmail, hashedPassword, phone, address, 'customer']
  );

  return {
    id,
    name,
    email: cleanEmail,
    role: 'customer',
    phone,
    address,
    createdAt: new Date().toISOString()
  };
};

const getAllCustomers = async () => {
  const db = await initDb();
  const [rows] = await db.query('SELECT id, name, email, role, phone, address, createdAt FROM customers ORDER BY createdAt DESC');
  return rows;
};

const updateProfile = async (id, { name, phone, address }) => {
  const db = await initDb();
  await db.query(
    'UPDATE customers SET name = COALESCE(?, name), phone = COALESCE(?, phone), address = COALESCE(?, address) WHERE id = ?',
    [name || null, phone || null, address || null, id]
  );
  return findById(id);
};

const updatePassword = async (id, newHashedPassword) => {
  const db = await initDb();
  await db.query('UPDATE customers SET password = ? WHERE id = ?', [newHashedPassword, id]);
  return true;
};

module.exports = {
  findByEmail,
  findById,
  create,
  getAllCustomers,
  updateProfile,
  updatePassword
};
