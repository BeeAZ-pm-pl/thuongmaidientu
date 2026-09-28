const { spawn } = require('child_process');
const path = require('path');

const services = [
  { name: 'IDENTITY-SERVICE', path: 'services/identity-service/src/index.js', color: '\x1b[36m' },
  { name: 'PRODUCT-SERVICE ', path: 'services/product-service/src/index.js', color: '\x1b[32m' },
  { name: 'ORDER-SERVICE   ', path: 'services/order-service/src/index.js', color: '\x1b[33m' },
  { name: 'NOTIFICATION-SRV', path: 'services/notification-service/src/index.js', color: '\x1b[35m' },
  { name: 'CHAT-SERVICE    ', path: 'services/chat-service/dist/index.js', color: '\x1b[38;5;208m' },
  { name: 'API-GATEWAY     ', path: 'gateway/src/index.js', color: '\x1b[34m' }
];

const processes = [];

console.log('\x1b[1m\x1b[32m====================================================\x1b[0m');
console.log('\x1b[1m\x1b[32m  KHỞI ĐỘNG HỆ THỐNG E-COMMERCE MICROSERVICES & WEB\x1b[0m');
console.log('\x1b[1m\x1b[32m====================================================\x1b[0m');

services.forEach((service) => {
  const fullPath = path.join(__dirname, service.path);
  const child = spawn(process.execPath, [fullPath], {
    cwd: path.dirname(path.dirname(fullPath)),
    env: { ...process.env }
  });

  child.stdout.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach((line) => {
      if (line.trim()) {
        console.log(`${service.color}[${service.name}]\x1b[0m ${line}`);
      }
    });
  });

  child.stderr.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach((line) => {
      if (line.trim()) {
        console.error(`${service.color}[${service.name} ERR]\x1b[0m \x1b[31m${line}\x1b[0m`);
      }
    });
  });

  child.on('close', (code) => {
    console.log(`${service.color}[${service.name}]\x1b[0m Tiến trình dừng với mã ${code}`);
  });

  processes.push(child);
});

setTimeout(() => {
  console.log('\n\x1b[1m\x1b[32m>>> TẤT CẢ DỊCH VỤ ĐÃ SẴN SÀNG HOẠT ĐỘNG! <<<\x1b[0m');
  console.log('\x1b[1mCửa hàng Storefront:      \x1b[36mhttp://localhost:8000\x1b[0m');
  console.log('\x1b[1mTrang Quản Trị Admin:     \x1b[35mhttp://localhost:8000/admin\x1b[0m');
  console.log('\x1b[1mIdentity Service:         \x1b[0mhttp://localhost:8001');
  console.log('\x1b[1mProduct Service:          \x1b[0mhttp://localhost:8002');
  console.log('\x1b[1mOrder Service:            \x1b[0mhttp://localhost:8003');
  console.log('\x1b[1mNotification Service:     \x1b[0mhttp://localhost:8004');
  console.log('\x1b[1mChat Service (Gemini AI): \x1b[0mhttp://localhost:8005\n');
}, 3000);

const cleanExit = () => {
  processes.forEach((p) => {
    try {
      p.kill();
    } catch {}
  });
  process.exit();
};

process.on('SIGINT', cleanExit);
process.on('SIGTERM', cleanExit);
