#!/usr/bin/env bash
# ====================================================================
# Script tự động khởi tạo & triển khai NovaShop trên Linux VPS
# ====================================================================

set -e

echo "=== [1/4] Cài đặt dependencies hệ thống ==="
npm install --prefix services/identity-service
npm install --prefix services/product-service
npm install --prefix services/order-service
npm install --prefix services/notification-service
npm install --prefix services/chat-service
npm install --prefix gateway
npm install

echo "=== [2/4] Biên dịch TypeScript Client, Admin & Chat Service ==="
npx tsc -p services/chat-service/tsconfig.json
npx tsc -p client/tsconfig.json
npx tsc -p admin/tsconfig.json

echo "=== [3/4] Cài đặt PM2 toàn cục (nếu chưa có) ==="
if ! command -v pm2 &> /dev/null; then
    echo "PM2 chưa được cài đặt, đang cài đặt..."
    npm install -g pm2
fi

echo "=== [4/4] Khởi động hệ thống Microservices qua PM2 ==="
pm2 restart ecosystem.config.js || pm2 start ecosystem.config.js
pm2 save

echo ""
echo ">>> TRIỂN KHAI THÀNH CÔNG! <<<"
echo "Cửa hàng Storefront: http://localhost:8000"
echo "Trang Quản trị Admin: http://localhost:8000/admin"
pm2 status
