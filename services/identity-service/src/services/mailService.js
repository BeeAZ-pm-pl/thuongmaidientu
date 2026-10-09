const nodemailer = require('nodemailer');
const config = require('../config');

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: config.mail.host,
    port: config.mail.port,
    secure: config.mail.secure, // true for 465, false for other ports
    auth: {
      user: config.mail.auth.user,
      pass: config.mail.auth.pass
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  return transporter;
};

const sendRegistrationOtp = async ({ toEmail, customerName, otpCode }) => {
  const mailer = getTransporter();

  const htmlContent = `
  <!DOCTYPE html>
  <html lang="vi">
  <head>
    <meta charset="UTF-8">
    <style>
      body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
      .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
      .header { background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 32px 24px; text-align: center; color: #ffffff; }
      .header h1 { margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px; }
      .header p { margin: 8px 0 0; opacity: 0.9; font-size: 14px; }
      .content { padding: 32px 28px; line-height: 1.6; }
      .greeting { font-size: 16px; font-weight: 600; margin-bottom: 12px; }
      .otp-box { background: #eff6ff; border: 2px dashed #3b82f6; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0; }
      .otp-label { font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: #3b82f6; font-weight: 700; margin-bottom: 8px; }
      .otp-code { font-size: 38px; font-weight: 900; letter-spacing: 8px; color: #1e3a8a; font-family: 'Courier New', Courier, monospace; }
      .notice { font-size: 13px; color: #64748b; background: #f1f5f9; padding: 12px 16px; border-radius: 8px; margin-top: 16px; }
      .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center; font-size: 12px; color: #94a3b8; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>NovaShop</h1>
        <p>Hệ thống mua sắm trực tuyến thông minh</p>
      </div>
      <div class="content">
        <div class="greeting">Xin chào ${customerName || 'Quý khách'},</div>
        <p>Cảm ơn bạn đã lựa chọn đăng ký tài khoản thành viên tại <strong>NovaShop</strong>. Để hoàn tất quá trình kích hoạt tài khoản, vui lòng sử dụng mã xác thực OTP dưới đây:</p>
        
        <div class="otp-box">
          <div class="otp-label">MÃ XÁC THỰC OTP CỦA BẠN</div>
          <div class="otp-code">${otpCode}</div>
        </div>

        <div class="notice">
          ⏱️ Mã OTP này có hiệu lực trong vòng <strong>5 phút</strong>.<br>
          🔒 Tuyệt đối không chia sẻ mã này cho bất kỳ ai để đảm bảo an toàn cho tài khoản của bạn.
        </div>
      </div>
      <div class="footer">
        © 2026 NovaShop E-Commerce System. Mọi quyền được bảo lưu.<br>
        Email này được gửi tự động, vui lòng không phản hồi trực tiếp thư này.
      </div>
    </div>
  </body>
  </html>
  `;

  const mailOptions = {
    from: `"${config.mail.fromName}" <${config.mail.fromAddress}>`,
    to: toEmail,
    subject: `[NovaShop] ${otpCode} là mã xác thực OTP đăng ký tài khoản của bạn`,
    html: htmlContent
  };

  return await mailer.sendMail(mailOptions);
};

module.exports = {
  sendRegistrationOtp
};
