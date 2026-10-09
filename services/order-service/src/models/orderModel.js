const mysql = require('mysql2/promise');
const config = require('../config');
const { publishOrderEvent } = require('../utils/messageQueue');
const ghnService = require('../services/ghnService');

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

    const ensureOrderColumn = async (colName, colDef) => {
      try {
        const [c] = await pool.query(`SHOW COLUMNS FROM orders LIKE '${colName}'`);
        if (c.length === 0) {
          await pool.query(`ALTER TABLE orders ADD COLUMN ${colName} ${colDef}`);
        }
      } catch (err) {
        console.warn(`[DB] Column ${colName} check error:`, err.message);
      }
    };

    await ensureOrderColumn('paymentStatus', "VARCHAR(50) DEFAULT 'unpaid'");
    await ensureOrderColumn('transactionId', "VARCHAR(128) DEFAULT NULL");
    await ensureOrderColumn('shippingFee', "BIGINT DEFAULT 0");
    await ensureOrderColumn('provinceId', "INT DEFAULT NULL");
    await ensureOrderColumn('districtId', "INT DEFAULT NULL");
    await ensureOrderColumn('wardCode', "VARCHAR(30) DEFAULT NULL");
    await ensureOrderColumn('ghnOrderCode', "VARCHAR(64) DEFAULT NULL");
    await ensureOrderColumn('ghnStatus', "VARCHAR(64) DEFAULT NULL");
    await ensureOrderColumn('ghnExpectedDelivery', "VARCHAR(64) DEFAULT NULL");
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

const getAllVouchersAdmin = async () => {
  const db = await initDb();
  const [rows] = await db.query('SELECT * FROM vouchers ORDER BY createdAt DESC');
  return rows;
};

const createVoucher = async (data) => {
  const db = await initDb();
  const code = String(data.code || '').trim().toUpperCase();
  if (!code) throw new Error('Mã voucher không được để trống');
  if (!data.name) throw new Error('Tên voucher không được để trống');
  const discountType = data.discountType === 'percent' ? 'percent' : 'fixed';
  const discountValue = Number(data.discountValue) || 0;
  const minOrderValue = Number(data.minOrderValue) || 0;
  const maxDiscount = data.maxDiscount ? Number(data.maxDiscount) : null;
  const description = data.description || '';
  const usageLimit = data.usageLimit !== undefined ? Number(data.usageLimit) : 1000;
  const isActive = data.isActive === false || data.isActive === 0 || data.isActive === '0' ? 0 : 1;
  const expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;

  await db.query(
    `INSERT INTO vouchers (code, name, discountType, discountValue, minOrderValue, maxDiscount, description, usageLimit, isActive, expiresAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [code, data.name, discountType, discountValue, minOrderValue, maxDiscount, description, usageLimit, isActive, expiresAt]
  );

  const [rows] = await db.query('SELECT * FROM vouchers WHERE code = ?', [code]);
  return rows[0];
};

const updateVoucher = async (code, data) => {
  const db = await initDb();
  const cleanCode = String(code).trim().toUpperCase();
  const [existing] = await db.query('SELECT * FROM vouchers WHERE code = ?', [cleanCode]);
  if (existing.length === 0) throw new Error('Không tìm thấy voucher');

  const cur = existing[0];
  const name = data.name !== undefined ? data.name : cur.name;
  const discountType = data.discountType !== undefined ? (data.discountType === 'percent' ? 'percent' : 'fixed') : cur.discountType;
  const discountValue = data.discountValue !== undefined ? Number(data.discountValue) : cur.discountValue;
  const minOrderValue = data.minOrderValue !== undefined ? Number(data.minOrderValue) : cur.minOrderValue;
  const maxDiscount = data.maxDiscount !== undefined ? (data.maxDiscount ? Number(data.maxDiscount) : null) : cur.maxDiscount;
  const description = data.description !== undefined ? data.description : cur.description;
  const usageLimit = data.usageLimit !== undefined ? Number(data.usageLimit) : cur.usageLimit;
  const isActive = data.isActive !== undefined ? (data.isActive ? 1 : 0) : cur.isActive;
  const expiresAt = data.expiresAt !== undefined ? (data.expiresAt ? new Date(data.expiresAt) : null) : cur.expiresAt;

  await db.query(
    `UPDATE vouchers SET name = ?, discountType = ?, discountValue = ?, minOrderValue = ?, maxDiscount = ?, description = ?, usageLimit = ?, isActive = ?, expiresAt = ? WHERE code = ?`,
    [name, discountType, discountValue, minOrderValue, maxDiscount, description, usageLimit, isActive, expiresAt, cleanCode]
  );

  const [rows] = await db.query('SELECT * FROM vouchers WHERE code = ?', [cleanCode]);
  return rows[0];
};

const deleteVoucher = async (code) => {
  const db = await initDb();
  const cleanCode = String(code).trim().toUpperCase();
  await db.query('DELETE FROM vouchers WHERE code = ?', [cleanCode]);
  return true;
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
  const ghnCode = row.ghnOrderCode || null;
  return {
    ...row,
    items: typeof row.items === 'string' ? JSON.parse(row.items) : row.items,
    voucherCode: row.voucherCode || null,
    discountAmount: Number(row.discountAmount || 0),
    shippingFee: Number(row.shippingFee || 0),
    paymentStatus: row.paymentStatus || 'unpaid',
    transactionId: row.transactionId || null,
    provinceId: row.provinceId ? Number(row.provinceId) : null,
    districtId: row.districtId ? Number(row.districtId) : null,
    wardCode: row.wardCode || null,
    ghnOrderCode: ghnCode,
    ghnStatus: row.ghnStatus || null,
    ghnExpectedDelivery: row.ghnExpectedDelivery || null,
    ghnTrackingUrl: ghnCode ? `${config.ghn.trackingUrl}${ghnCode}` : null
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

  const shippingFee = Number(orderData.shippingFee) || 0;
  const totalAmount = Math.max(0, subtotal - discountAmount + shippingFee);
  const id = `ORD_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
  const userId = orderData.userId || 'guest';
  const paymentMethod = orderData.paymentMethod || 'cod';
  const paymentStatus = orderData.paymentStatus || 'unpaid';
  const provinceId = orderData.provinceId ? Number(orderData.provinceId) : null;
  const districtId = orderData.districtId ? Number(orderData.districtId) : null;
  const wardCode = orderData.wardCode ? String(orderData.wardCode) : null;

  let ghnOrderCode = null;
  let ghnStatus = null;
  let ghnExpectedDelivery = null;

  if (paymentMethod === 'cod' && districtId && wardCode) {
    try {
      const ghnRes = await ghnService.createShippingOrder(
        {
          id,
          customerName: orderData.customerName,
          customerPhone: orderData.customerPhone,
          shippingAddress: orderData.shippingAddress,
          totalAmount,
          items,
          paymentStatus: 'unpaid'
        },
        { districtId, wardCode }
      );
      if (ghnRes && ghnRes.success && ghnRes.order_code) {
        ghnOrderCode = ghnRes.order_code;
        ghnStatus = 'ready_to_pick';
        ghnExpectedDelivery = ghnRes.expected_delivery_time || null;
      }
    } catch (ghnErr) {
      console.warn('[GHN] Auto create shipping order for COD order warning:', ghnErr.message);
    }
  }

  const db = await initDb();
  await db.query(
    `INSERT INTO orders (
      id, userId, customerName, customerPhone, shippingAddress, paymentMethod, items,
      totalAmount, status, voucherCode, discountAmount, paymentStatus, transactionId,
      shippingFee, provinceId, districtId, wardCode, ghnOrderCode, ghnStatus,
      ghnExpectedDelivery, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      id,
      userId,
      orderData.customerName,
      orderData.customerPhone,
      orderData.shippingAddress,
      paymentMethod,
      JSON.stringify(items),
      totalAmount,
      voucherCode,
      discountAmount,
      paymentStatus,
      shippingFee,
      provinceId,
      districtId,
      wardCode,
      ghnOrderCode,
      ghnStatus,
      ghnExpectedDelivery
    ]
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
    paymentStatus,
    transactionId: null,
    shippingFee,
    provinceId,
    districtId,
    wardCode,
    ghnOrderCode,
    ghnStatus,
    ghnExpectedDelivery,
    ghnTrackingUrl: ghnOrderCode ? `${config.ghn.trackingUrl}${ghnOrderCode}` : null,
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
  const paymentStatus = orderData.paymentStatus !== undefined ? orderData.paymentStatus : current.paymentStatus;
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
    const shippingFee = Number(current.shippingFee || 0);
    totalAmount = Math.max(0, subtotal - discountAmount + shippingFee);
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
      paymentStatus = ?,
      status = ?,
      items = ?,
      totalAmount = ?,
      voucherCode = ?,
      discountAmount = ?,
      updatedAt = NOW()
     WHERE id = ?`,
    [customerName, customerPhone, shippingAddress, paymentMethod, paymentStatus, status, JSON.stringify(items), totalAmount, voucherCode, discountAmount, id]
  );

  const updatedOrder = await findById(id);
  await publishOrderEvent('order.updated', updatedOrder);
  return updatedOrder;
};

const getStats = async () => {
  const db = await initDb();
  const [rows] = await db.query('SELECT totalAmount, status, createdAt, paymentMethod, items FROM orders');

  const totalRevenue = rows
    .filter((o) => o.status === 'completed')
    .reduce((sum, o) => sum + Number(o.totalAmount), 0);

  const countPending = rows.filter((o) => o.status === 'pending').length;
  const countProcessing = rows.filter((o) => o.status === 'processing').length;
  const countCompleted = rows.filter((o) => o.status === 'completed').length;
  const countCancelled = rows.filter((o) => o.status === 'cancelled').length;

  // Doanh thu theo ngày (30 ngày gần nhất)
  const dailyRevenue = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const dayOrders = rows.filter(o => {
      if (!o.createdAt) return false;
      const oDate = new Date(o.createdAt).toISOString().slice(0, 10);
      return oDate === dateStr;
    });
    const rev = dayOrders.filter(o => o.status === 'completed').reduce((s, o) => s + Number(o.totalAmount), 0);
    const count = dayOrders.length;
    dailyRevenue.push({ date: dateStr, revenue: rev, orders: count });
  }

  // Doanh thu theo tháng (12 tháng gần nhất)
  const monthlyRevenue = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const monthOrders = rows.filter(o => {
      if (!o.createdAt) return false;
      const oMonth = new Date(o.createdAt).toISOString().slice(0, 7);
      return oMonth === monthStr;
    });
    const rev = monthOrders.filter(o => o.status === 'completed').reduce((s, o) => s + Number(o.totalAmount), 0);
    const count = monthOrders.length;
    monthlyRevenue.push({ month: monthStr, revenue: rev, orders: count });
  }

  // Doanh thu theo phương thức thanh toán
  const paymentMethods = {};
  rows.filter(o => o.status === 'completed').forEach(o => {
    const method = (o.paymentMethod || 'COD').toUpperCase();
    if (!paymentMethods[method]) paymentMethods[method] = { revenue: 0, count: 0 };
    paymentMethods[method].revenue += Number(o.totalAmount);
    paymentMethods[method].count += 1;
  });

  // Top sản phẩm bán chạy
  const productSales = {};
  rows.filter(o => o.status !== 'cancelled').forEach(o => {
    try {
      const items = typeof o.items === 'string' ? JSON.parse(o.items) : o.items;
      if (Array.isArray(items)) {
        items.forEach(item => {
          const key = item.productId || item.id;
          if (!key) return;
          if (!productSales[key]) productSales[key] = { name: item.name || item.productName || `SP #${key}`, quantity: 0, revenue: 0 };
          productSales[key].quantity += Number(item.quantity) || 1;
          productSales[key].revenue += (Number(item.price) || 0) * (Number(item.quantity) || 1);
        });
      }
    } catch {}
  });
  const topProducts = Object.entries(productSales)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);

  // Doanh thu hôm nay
  const todayStr = now.toISOString().slice(0, 10);
  const todayOrders = rows.filter(o => o.createdAt && new Date(o.createdAt).toISOString().slice(0, 10) === todayStr);
  const todayRevenue = todayOrders.filter(o => o.status === 'completed').reduce((s, o) => s + Number(o.totalAmount), 0);

  return {
    totalOrders: rows.length,
    totalRevenue,
    countPending,
    countProcessing,
    countCompleted,
    countCancelled,
    dailyRevenue,
    monthlyRevenue,
    paymentMethods,
    topProducts,
    todayRevenue,
    todayOrders: todayOrders.length
  };
};

const updatePaymentStatus = async (id, { paymentStatus, transactionId, paymentMethod }) => {
  const current = await findById(id);
  if (!current) return null;

  const db = await initDb();
  const newPaymentStatus = paymentStatus || current.paymentStatus;
  const newTransId = transactionId !== undefined ? transactionId : current.transactionId;
  const newPaymentMethod = paymentMethod || current.paymentMethod;
  const newStatus = (newPaymentStatus === 'paid' && current.status === 'pending') ? 'processing' : current.status;

  await db.query(
    `UPDATE orders SET
      paymentStatus = ?,
      transactionId = ?,
      paymentMethod = ?,
      status = ?,
      updatedAt = NOW()
     WHERE id = ?`,
    [newPaymentStatus, newTransId, newPaymentMethod, newStatus, id]
  );

  let updatedOrder = await findById(id);

  if (newPaymentStatus === 'paid' && !updatedOrder.ghnOrderCode) {
    try {
      const ghnRes = await ghnService.createShippingOrder(updatedOrder, {
        districtId: updatedOrder.districtId,
        wardCode: updatedOrder.wardCode
      });
      if (ghnRes && ghnRes.success && ghnRes.order_code) {
        await updateGhnShipping(id, {
          ghnOrderCode: ghnRes.order_code,
          ghnStatus: 'ready_to_pick',
          ghnExpectedDelivery: ghnRes.expected_delivery_time || null
        });
        updatedOrder = await findById(id);
      }
    } catch (ghnErr) {
      console.warn('[GHN] Auto create shipping after payment error:', ghnErr.message);
    }
  }

  await publishOrderEvent('order.payment_updated', updatedOrder);
  return updatedOrder;
};

const updateGhnShipping = async (id, { ghnOrderCode, ghnStatus, ghnExpectedDelivery }) => {
  const db = await initDb();
  await db.query(
    `UPDATE orders SET
      ghnOrderCode = COALESCE(?, ghnOrderCode),
      ghnStatus = COALESCE(?, ghnStatus),
      ghnExpectedDelivery = COALESCE(?, ghnExpectedDelivery),
      updatedAt = NOW()
     WHERE id = ?`,
    [ghnOrderCode, ghnStatus, ghnExpectedDelivery, id]
  );
  return findById(id);
};

module.exports = {
  initDb,
  findAll,
  findById,
  findByUserId,
  create,
  updateStatus,
  updateOrder,
  updatePaymentStatus,
  updateGhnShipping,
  getStats,
  getAvailableVouchers,
  getAllVouchersAdmin,
  createVoucher,
  updateVoucher,
  deleteVoucher,
  validateVoucher
};

