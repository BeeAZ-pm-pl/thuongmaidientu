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
    CREATE TABLE IF NOT EXISTS vouchers (
      code VARCHAR(50) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      discountType ENUM('fixed', 'percent') NOT NULL DEFAULT 'fixed',
      discountValue INT NOT NULL,
      minOrderValue BIGINT NOT NULL DEFAULT 0,
      maxDiscount BIGINT DEFAULT NULL,
      description TEXT,
      usageLimit INT DEFAULT 1000,
      usedCount INT DEFAULT 0,
      isActive BOOLEAN DEFAULT 1,
      expiresAt DATETIME DEFAULT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

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
      voucherCode VARCHAR(50) DEFAULT NULL,
      discountAmount BIGINT DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (voucherCode) REFERENCES vouchers(code) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  try {
    const [cols] = await pool.query("SHOW COLUMNS FROM orders LIKE 'voucherCode'");
    if (cols.length === 0) {
      await pool.query("ALTER TABLE orders ADD COLUMN voucherCode VARCHAR(50) DEFAULT NULL, ADD COLUMN discountAmount BIGINT DEFAULT 0");
    }
  } catch {}

  const [vRows] = await pool.query('SELECT COUNT(*) as count FROM vouchers');
  if (vRows[0].count === 0) {
    await pool.query(`
      INSERT INTO vouchers (code, name, discountType, discountValue, minOrderValue, maxDiscount, description, usageLimit, usedCount, isActive, expiresAt) VALUES
      ('NOVASHOP50', 'Ưu đãi Khách hàng Thân thiết', 'fixed', 50000, 200000, 50000, 'Giảm ngay 50.000đ cho đơn hàng từ 200.000đ', 500, 12, 1, '2026-12-31 23:59:59'),
      ('SALE10', 'Siêu Sale Siêu Tiết Kiệm', 'percent', 10, 300000, 100000, 'Giảm 10% (tối đa 100.000đ) cho đơn từ 300.000đ', 1000, 45, 1, '2026-12-31 23:59:59'),
      ('FREESHIP', 'Miễn Phí Vận Chuyển', 'fixed', 30000, 150000, 30000, 'Giảm 30.000đ phí giao hàng cho đơn từ 150.000đ', 2000, 89, 1, '2026-12-31 23:59:59'),
      ('VIP100', 'Đặc Quyền Thành Viên VIP', 'fixed', 100000, 500000, 100000, 'Giảm 100.000đ cho đơn hàng giá trị từ 500.000đ', 200, 8, 1, '2026-12-31 23:59:59'),
      ('WELCOME', 'Quà Chào Mừng Khách Hàng Mới', 'fixed', 20000, 100000, 20000, 'Giảm 20.000đ cho đơn hàng từ 100.000đ', 5000, 34, 1, '2026-12-31 23:59:59')
    `);
  }

  return pool;
};

const getAvailableVouchers = async () => {
  const db = await initDb();
  const [rows] = await db.query(
    'SELECT code, name, discountType, discountValue, minOrderValue, maxDiscount, description FROM vouchers WHERE isActive = 1 AND (expiresAt IS NULL OR expiresAt > NOW()) ORDER BY minOrderValue ASC'
  );
  return rows;
};

const validateVoucher = async (code, orderTotal) => {
  if (!code) {
    return { valid: false, message: 'Vui lòng cung cấp mã voucher' };
  }
  const cleanCode = String(code).trim().toUpperCase();
  const db = await initDb();
  const [rows] = await db.query(
    'SELECT * FROM vouchers WHERE code = ? AND isActive = 1 LIMIT 1',
    [cleanCode]
  );
  if (rows.length === 0) {
    return { valid: false, message: 'Mã giảm giá không tồn tại hoặc đã hết hạn' };
  }
  const voucher = rows[0];
  if (voucher.expiresAt && new Date(voucher.expiresAt) < new Date()) {
    return { valid: false, message: 'Mã giảm giá đã hết hạn sử dụng' };
  }
  if (voucher.usageLimit && voucher.usedCount >= voucher.usageLimit) {
    return { valid: false, message: 'Mã giảm giá này đã hết lượt sử dụng' };
  }

  const subtotal = Number(orderTotal) || 0;
  if (subtotal < Number(voucher.minOrderValue)) {
    return {
      valid: false,
      message: `Đơn hàng cần đạt tối thiểu ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(voucher.minOrderValue)} để áp dụng mã này`
    };
  }

  let discountAmount = 0;
  if (voucher.discountType === 'percent') {
    discountAmount = Math.round((subtotal * Number(voucher.discountValue)) / 100);
    if (voucher.maxDiscount && discountAmount > Number(voucher.maxDiscount)) {
      discountAmount = Number(voucher.maxDiscount);
    }
  } else {
    discountAmount = Number(voucher.discountValue);
  }

  discountAmount = Math.min(discountAmount, subtotal);
  const finalTotal = Math.max(0, subtotal - discountAmount);

  return {
    valid: true,
    voucher: {
      code: voucher.code,
      name: voucher.name,
      discountType: voucher.discountType,
      discountValue: voucher.discountValue,
      minOrderValue: voucher.minOrderValue,
      maxDiscount: voucher.maxDiscount,
      description: voucher.description
    },
    discountAmount,
    finalTotal
  };
};

const formatOrderRow = (row) => {
  if (!row) return null;
  return {
    ...row,
    items: typeof row.items === 'string' ? JSON.parse(row.items) : row.items,
    voucherCode: row.voucherCode || null,
    discountAmount: Number(row.discountAmount || 0)
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

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  let discountAmount = 0;
  let voucherCode = null;

  if (orderData.voucherCode) {
    const vResult = await validateVoucher(orderData.voucherCode, subtotal);
    if (vResult.valid) {
      voucherCode = vResult.voucher.code;
      discountAmount = vResult.discountAmount;
    }
  }

  const totalAmount = Math.max(0, subtotal - discountAmount);
  const id = `ORD_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
  const userId = orderData.userId || 'guest';
  const paymentMethod = orderData.paymentMethod || 'cod';

  const db = await initDb();
  await db.query(
    `INSERT INTO orders (id, userId, customerName, customerPhone, shippingAddress, paymentMethod, items, totalAmount, status, voucherCode, discountAmount, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, NOW(), NOW())`,
    [id, userId, orderData.customerName, orderData.customerPhone, orderData.shippingAddress, paymentMethod, JSON.stringify(items), totalAmount, voucherCode, discountAmount]
  );

  if (voucherCode) {
    await db.query('UPDATE vouchers SET usedCount = usedCount + 1 WHERE code = ?', [voucherCode]);
  }

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
    voucherCode,
    discountAmount,
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

const updateOrder = async (id, orderData) => {
  const current = await findById(id);
  if (!current) return null;

  const validStatuses = ['pending', 'processing', 'completed', 'cancelled'];
  const status = orderData.status !== undefined ? orderData.status : current.status;
  if (status && !validStatuses.includes(status)) {
    throw new Error('Trạng thái đơn hàng không hợp lệ');
  }

  const customerName = orderData.customerName !== undefined ? orderData.customerName : current.customerName;
  const customerPhone = orderData.customerPhone !== undefined ? orderData.customerPhone : current.customerPhone;
  const shippingAddress = orderData.shippingAddress !== undefined ? orderData.shippingAddress : current.shippingAddress;
  const paymentMethod = orderData.paymentMethod !== undefined ? orderData.paymentMethod : current.paymentMethod;
  const voucherCode = orderData.voucherCode !== undefined ? orderData.voucherCode : current.voucherCode;
  let discountAmount = orderData.discountAmount !== undefined ? Number(orderData.discountAmount) : Number(current.discountAmount || 0);

  let items = current.items;
  let totalAmount = current.totalAmount;

  if (orderData.items && Array.isArray(orderData.items)) {
    if (orderData.items.length === 0) {
      throw new Error('Đơn hàng phải có ít nhất một sản phẩm');
    }
    items = orderData.items;
    const subtotal = items.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0);
    totalAmount = Math.max(0, subtotal - discountAmount);
  } else if (orderData.totalAmount !== undefined) {
    totalAmount = Number(orderData.totalAmount);
  }

  const db = await initDb();
  await db.query(
    `UPDATE orders SET
      customerName = ?,
      customerPhone = ?,
      shippingAddress = ?,
      paymentMethod = ?,
      status = ?,
      items = ?,
      totalAmount = ?,
      voucherCode = ?,
      discountAmount = ?,
      updatedAt = NOW()
     WHERE id = ?`,
    [customerName, customerPhone, shippingAddress, paymentMethod, status, JSON.stringify(items), totalAmount, voucherCode, discountAmount, id]
  );

  const updatedOrder = await findById(id);
  await publishOrderEvent('order.updated', updatedOrder);
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
  updateOrder,
  getStats,
  getAvailableVouchers,
  validateVoucher
};
