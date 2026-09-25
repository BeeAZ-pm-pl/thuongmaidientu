const mysql = require('mysql2/promise');
const config = require('../config');
const { publishOrderEvent } = require('../utils/messageQueue');

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
    CREATE TABLE IF NOT EXISTS orders (
      id VARCHAR(64) PRIMARY KEY,
      userId VARCHAR(64) DEFAULT 'guest',
      customerName VARCHAR(255) NOT NULL,
      customerPhone VARCHAR(50) NOT NULL,
      shippingAddress TEXT NOT NULL,
      paymentMethod VARCHAR(50) DEFAULT 'cod',
      items JSON NOT NULL,
      totalAmount BIGINT NOT NULL,
      status VARCHAR(50) DEFAULT 'pending',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  return pool;
};

const formatOrderRow = (row) => {
  if (!row) return null;
  return {
    ...row,
    items: typeof row.items === 'string' ? JSON.parse(row.items) : row.items
  };
};

const findAll = async ({ status } = {}) => {
  const db = await initDb();
  let query = 'SELECT * FROM orders';
  const params = [];

  if (status) {
    query += ' WHERE status = ?';
    params.push(status);
  }

  query += ' ORDER BY createdAt DESC';
  const [rows] = await db.query(query, params);
  return rows.map(formatOrderRow);
};

const findById = async (id) => {
  const db = await initDb();
  const [rows] = await db.query('SELECT * FROM orders WHERE id = ? LIMIT 1', [id]);
  if (rows.length === 0) return null;
  return formatOrderRow(rows[0]);
};

const findByUserId = async (userId) => {
  const db = await initDb();
  const [rows] = await db.query('SELECT * FROM orders WHERE userId = ? ORDER BY createdAt DESC', [userId]);
  return rows.map(formatOrderRow);
};

const create = async (orderData) => {
  const items = orderData.items || [];
  if (items.length === 0) {
    throw new Error('Đơn hàng phải có ít nhất một sản phẩm');
  }

  try {
    const deductResponse = await fetch(`${config.productServiceUrl}/api/products/deduct-stock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: items.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          quantity: i.quantity
        }))
      })
    });
    const deductResult = await deductResponse.json();
    if (!deductResult.success) {
      throw new Error(deductResult.message || 'Không thể trừ tồn kho sản phẩm');
    }
  } catch (err) {
    throw new Error(`Lỗi cập nhật kho từ Product Service: ${err.message}`);
  }

  const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const id = `ORD_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
  const userId = orderData.userId || 'guest';
  const paymentMethod = orderData.paymentMethod || 'cod';

  const db = await initDb();
  await db.query(
    `INSERT INTO orders (id, userId, customerName, customerPhone, shippingAddress, paymentMethod, items, totalAmount, status, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW(), NOW())`,
    [id, userId, orderData.customerName, orderData.customerPhone, orderData.shippingAddress, paymentMethod, JSON.stringify(items), totalAmount]
  );

  const newOrder = {
    id,
    userId,
    customerName: orderData.customerName,
    customerPhone: orderData.customerPhone,
    shippingAddress: orderData.shippingAddress,
    paymentMethod,
    items,
    totalAmount,
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await publishOrderEvent('order.created', newOrder);

  return newOrder;
};

const updateStatus = async (id, status) => {
  const validStatuses = ['pending', 'processing', 'completed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    throw new Error('Trạng thái đơn hàng không hợp lệ');
  }

  const db = await initDb();
  const [result] = await db.query('UPDATE orders SET status = ?, updatedAt = NOW() WHERE id = ?', [status, id]);
  if (result.affectedRows === 0) return null;

  const updatedOrder = await findById(id);
  await publishOrderEvent('order.status_updated', updatedOrder);
  return updatedOrder;
};

const getStats = async () => {
  const db = await initDb();
  const [rows] = await db.query('SELECT totalAmount, status FROM orders');

  const totalRevenue = rows
    .filter((o) => o.status === 'completed')
    .reduce((sum, o) => sum + Number(o.totalAmount), 0);

  const countPending = rows.filter((o) => o.status === 'pending').length;
  const countProcessing = rows.filter((o) => o.status === 'processing').length;
  const countCompleted = rows.filter((o) => o.status === 'completed').length;
  const countCancelled = rows.filter((o) => o.status === 'cancelled').length;

  return {
    totalOrders: rows.length,
    totalRevenue,
    countPending,
    countProcessing,
    countCompleted,
    countCancelled
  };
};

module.exports = {
  initDb,
  findAll,
  findById,
  findByUserId,
  create,
  updateStatus,
  getStats
};
