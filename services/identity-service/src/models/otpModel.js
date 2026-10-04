const { initDb } = require('./db');

const saveOtp = async ({ email, otp, payload, expiresInMinutes = 5 }) => {
  const db = await initDb();
  const cleanEmail = email.toLowerCase().trim();

  // Xóa các OTP cũ của email này
  await db.query('DELETE FROM customer_otps WHERE LOWER(email) = ?', [cleanEmail]);

  // Thêm OTP mới với thời hạn
  const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
  await db.query(
    'INSERT INTO customer_otps (email, otp, payload, expiresAt, createdAt) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE), NOW())',
    [cleanEmail, otp.trim(), payloadString, expiresInMinutes]
  );

  return true;
};

const verifyOtp = async ({ email, otp }) => {
  const db = await initDb();
  const cleanEmail = email.toLowerCase().trim();
  const cleanOtp = otp.trim();

  // Tìm OTP còn hiệu lực
  const [rows] = await db.query(
    'SELECT * FROM customer_otps WHERE LOWER(email) = ? AND otp = ? AND expiresAt > NOW() ORDER BY id DESC LIMIT 1',
    [cleanEmail, cleanOtp]
  );

  if (!rows || rows.length === 0) {
    return null;
  }

  const record = rows[0];
  let payload = record.payload;
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload);
    } catch {
      // payload giữ nguyên
    }
  }

  // Xóa OTP sau khi xác thực thành công để không tái sử dụng
  await db.query('DELETE FROM customer_otps WHERE id = ?', [record.id]);

  return payload;
};

const deleteByEmail = async (email) => {
  const db = await initDb();
  await db.query('DELETE FROM customer_otps WHERE LOWER(email) = ?', [email.toLowerCase().trim()]);
};

module.exports = {
  saveOtp,
  verifyOtp,
  deleteByEmail
};
