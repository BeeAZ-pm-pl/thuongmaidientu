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

  // 1. Tạo bảng riêng biệt: admins (Lưu tài khoản Quản trị viên)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admins (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      username VARCHAR(255) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      phone VARCHAR(50) DEFAULT '',
      role VARCHAR(50) DEFAULT 'admin',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // 2. Tạo bảng riêng biệt: customers (Lưu tài khoản Khách hàng mua sắm)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS customers (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      phone VARCHAR(50) DEFAULT '',
      address TEXT,
      role VARCHAR(50) DEFAULT 'customer',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // 3. Tạo bảng lưu trữ OTP đăng ký tài khoản khách hàng
  await pool.query(`
    CREATE TABLE IF NOT EXISTS customer_otps (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      otp VARCHAR(10) NOT NULL,
      payload JSON NOT NULL,
      expiresAt DATETIME NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // 4. Khởi tạo/đồng bộ dữ liệu nếu bảng rỗng
  try {
    const [adminRows] = await pool.query('SELECT COUNT(*) as count FROM admins');
    if (adminRows[0].count === 0) {
      // Kiểm tra xem bảng users cũ có dữ liệu admin không
      const [oldAdmins] = await pool.query("SELECT * FROM users WHERE role = 'admin'").catch(() => [[]]);
      if (oldAdmins && oldAdmins.length > 0) {
        for (const adm of oldAdmins) {
          const uname = adm.email.includes('@') ? (adm.email.split('@')[0] || adm.id) : adm.email;
          const uemail = adm.email.includes('@') ? adm.email : `${adm.email}@system.local`;
          await pool.query(
            'INSERT IGNORE INTO admins (id, name, username, email, password, phone, role, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [adm.id, adm.name, uname, uemail, adm.password, adm.phone || '', 'admin', adm.createdAt || new Date()]
          );
        }
      } else {
        const hashAdmin = await bcrypt.hash('admin', 10);
        const hash123 = await bcrypt.hash('123456', 10);
        await pool.query(`
          INSERT IGNORE INTO admins (id, name, username, email, password, phone, role) VALUES
          ('usr_admin_root', 'Quản Trị Viên Hệ Thống', 'admin', 'admin@system.local', '${hashAdmin}', '0988888888', 'admin'),
          ('usr_admin_01', 'Admin Quản Lý Shop', 'admin01', 'admin@shop.com', '${hash123}', '0988888888', 'admin')
        `);
      }
    }

    const [customerRows] = await pool.query('SELECT COUNT(*) as count FROM customers');
    if (customerRows[0].count === 0) {
      // Kiểm tra xem bảng users cũ có dữ liệu customer không
      const [oldCusts] = await pool.query("SELECT * FROM users WHERE role != 'admin'").catch(() => [[]]);
      if (oldCusts && oldCusts.length > 0) {
        for (const cust of oldCusts) {
          await pool.query(
            'INSERT IGNORE INTO customers (id, name, email, password, phone, address, role, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [cust.id, cust.name, cust.email, cust.password, cust.phone || '', cust.address || '', 'customer', cust.createdAt || new Date()]
          );
        }
      } else {
        const hash123 = await bcrypt.hash('123456', 10);
        await pool.query(`
          INSERT IGNORE INTO customers (id, name, email, password, phone, address, role) VALUES
          ('usr_customer_01', 'Khách Hàng Mẫu', 'customer@shop.com', '${hash123}', '0912345678', '123 Nguyễn Trãi, Quận 1, TP. Hồ Chí Minh', 'customer'),
          ('usr_customer_02', 'Nguyễn Hoàng Nam', 'hoangnam@gmail.com', '${hash123}', '0905123456', '45 Lê Duẩn, Quận Hải Châu, Đà Nẵng', 'customer'),
          ('usr_customer_03', 'Trần Thị Mai', 'maitran@gmail.com', '${hash123}', '0934567890', '78 Cầu Giấy, Hà Nội', 'customer'),
          ('usr_customer_04', 'Lê Quốc Hưng', 'quochung@gmail.com', '${hash123}', '0987654321', '12 Hoàng Diệu, TP. Nha Trang', 'customer')
        `);
      }
    }
  } catch (seedErr) {
    console.error('[DB] Khởi tạo dữ liệu mẫu thất bại:', seedErr.message);
  }

  return pool;
};

module.exports = {
  initDb
};
