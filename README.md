# HỆ THỐNG MUA SẮM TRỰC TUYẾN MICROSERVICES (NOVASHOP)

> **Đề tài:** Phát triển ứng dụng Web Mua sắm Trực tuyến sử dụng kiến trúc Microservices, API Gateway và Event-Driven Architecture.  
> **Nền tảng công nghệ:** Node.js • Express.js • RabbitMQ • MySQL • Docker & Docker Compose • Vanilla HTML/CSS/JS.

---

## 1. TỔNG QUAN HỆ THỐNG

Dự án áp dụng kiến trúc phần mềm phân tán **Microservices** hiện đại, khắc phục các nhược điểm cố hữu của mô hình Monolithic (nguyên khối). Toàn bộ hệ thống được chia tách thành các dịch vụ độc lập với ranh giới nghiệp vụ (Bounded Context) rõ ràng, giao tiếp qua cả giao thức đồng bộ (Synchronous HTTP REST) và bất đồng bộ (Asynchronous Event-Driven qua RabbitMQ).

```
                      +-----------------------------+
                      |         CLIENT LAYER        |
                      |  (Storefront Web / Admin)   |
                      +--------------+--------------+
                                     | HTTP (:8000)
                                     v
                      +-----------------------------+
                      |     API GATEWAY (Proxy)     |
                      |  Reverse Proxy & Routing    |
                      +--------------+--------------+
                                     |
         +-------------------+-------+-------+--------------------+
         | HTTP              | HTTP          | HTTP               | HTTP
         v                   v               v                    v
+-----------------+ +-----------------+ +-----------------+ +-----------------+
| IDENTITY-SRV    | | PRODUCT-SRV     | | ORDER-SRV       | | NOTIFICATION-SRV|
| Port: 8001      | | Port: 8002      | | Port: 8003      | | Port: 8004      |
| JWT, Auth, User | | Catalog, Stock  | | Orders, Checkout| | Alert, Events   |
+--------+--------+ +--------+--------+ +--------+--------+ +--------+--------+
         |                   ^                   |                   ^
         |                   | Sync REST         | Publish Event     | Consume
         |                   +--- Deduct Stock --+                   |
         |                                       v                   |
         |                              +-----------------+          |
         |                              | RABBITMQ BROKER |----------+
         |                              | orders_queue    |
         |                              +-----------------+
         v                                       v
+-----------------------------------------------------------------------------+
|                          DATABASE LAYER (MySQL)                             |
|                        Cơ sở dữ liệu: ecommerce_db                          |
+-----------------------------------------------------------------------------+
```

---

## 2. PHÂN CÔNG NHIỆM VỤ THÀNH VIÊN (NHÓM 2)

| STT | Thành viên | Vai trò & Nhiệm vụ chính | Nhánh tính năng |
| :---: | :--- | :--- | :--- |
| **1** | **Nguyễn Công Đạt** *(Nhóm trưởng)* | Thiết kế kiến trúc tổng thể, API Gateway, Identity Service, Docker Compose & Quản lý CSDL | `master` |
| **2** | **Hoàng Minh Hiếu** | Phát triển Product Microservice, quản lý danh mục & kho, xây dựng giao diện Storefront Web | `feature/product-client` |
| **3** | **Nguyễn Văn Hoàng** | Phát triển Order Microservice, quy trình đặt hàng, tích hợp RabbitMQ Producer & giao diện Admin Dashboard | `feature/order-admin` |
| **4** | **Nguyễn Tô Trung Sơn** | Phát triển Notification Microservice, tích hợp RabbitMQ Consumer nhận sự kiện tự động | `feature/notification-service` |

---

## 3. CÁC THÀNH PHẦN VÀ CỔNG TRUY CẬP (PORTS)

| Dịch vụ / Thành phần | Cổng (Port) | Đường dẫn truy cập / Mục đích |
| :--- | :---: | :--- |
| **API Gateway** | `8000` | Điểm tiếp nhận tập trung (Reverse Proxy tới các service con) |
| • Storefront Web (Khách mua) | `8000` | `http://localhost:8000` |
| • Admin Dashboard (Quản trị) | `8000` | `http://localhost:8000/admin` |
| **Identity Service** | `8001` | Xác thực người dùng, băm mật khẩu bcrypt, cấp phát JWT |
| **Product Service** | `8002` | Quản lý danh mục, sản phẩm, biến thể và trừ tồn kho |
| **Order Service** | `8003` | Tiếp nhận đơn hàng, tính tiền, phát sự kiện vào RabbitMQ |
| **Notification Service** | `8004` | Lắng nghe hàng đợi tin nhắn, tạo thông báo hệ thống |
| **RabbitMQ Management** | `15672` | `http://localhost:15672` (User/Pass: `guest` / `guest`) |
| **MySQL Server** | `3306` | CSDL tập trung / độc lập (`ecommerce_db`) |

---

## 4. HƯỚNG DẪN KHỞI TẠO CƠ SỞ DỮ LIỆU (MYSQL)

Dự án cung cấp sẵn file [`database.sql`](database.sql) chứa toàn bộ cấu trúc bảng và dữ liệu mẫu danh mục/sản phẩm:

### Cách nhập (Import) dữ liệu:
1. Mở công cụ quản lý MySQL của bạn (**phpMyAdmin**, **MySQL Workbench**, **DBeaver**, hoặc **Navicat**).
2. Tạo mới hoặc chọn cơ sở dữ liệu `ecommerce_db`:
   ```sql
   CREATE DATABASE IF NOT EXISTS `ecommerce_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   USE `ecommerce_db`;
   ```
3. Nhập trực tiếp toàn bộ nội dung trong file **[`database.sql`](database.sql)** hoặc dùng lệnh dòng lệnh:
   ```bash
   mysql -u root -p ecommerce_db < database.sql
   ```

### Tài khoản đăng nhập thử nghiệm có sẵn:
* **Tài khoản Quản trị viên (Admin):**
  * Email: `admin@shop.com` (hoặc username `admin`)
  * Mật khẩu: `123456`
* **Tài khoản Khách hàng (Customer):**
  * Email: `customer@shop.com`
  * Mật khẩu: `123456`

---

## 5. HƯỚNG DẪN CÀI ĐẶT VÀ KHỞI CHẠY

### Cách 1: Khởi chạy bằng Docker Compose (Khuyên dùng - Chuẩn đồ án)
Yêu cầu: Máy tính đã cài đặt và bật **Docker Desktop**.

```bash
# 1. Di chuyển vào thư mục dự án
cd thuongmaidientu

# 2. Khởi chạy toàn bộ 6 container (RabbitMQ + Gateway + 4 Services)
docker compose up --build
```
> Khi các container đã báo `ready`, mở trình duyệt truy cập ngay:
> * Khách hàng mua sắm: **`http://localhost:8000`**
> * Quản trị viên: **`http://localhost:8000/admin`**
> * Để dừng hệ thống: Bấm `Ctrl + C` hoặc chạy `docker compose down`.

---

### Cách 2: Khởi chạy thủ công từng Service bằng Node.js (Local Dev)
Yêu cầu: Đã cài **Node.js (>= 18)** và mở **MySQL** (XAMPP).

```bash
# Khởi chạy API Gateway
cd gateway && npm install && node src/index.js

# Khởi chạy Identity Service
cd services/identity-service && npm install && node src/index.js

# Khởi chạy Product Service
cd services/product-service && npm install && node src/index.js

# Khởi chạy Order Service
cd services/order-service && npm install && node src/index.js

# Khởi chạy Notification Service
cd services/notification-service && npm install && node src/index.js
```

---

## 6. QUY TRÌNH NGHIỆP VỤ CỐT LÕI (EVENT-DRIVEN WORKFLOW)

1. **Khách hàng đặt hàng (Checkout)**: Trình duyệt gửi thông tin giỏ hàng lên `API Gateway:8000` -> chuyển tiếp tới `Order Service:8003`.
2. **Kiểm tra & Trừ tồn kho đồng bộ (Sync HTTP)**: `Order Service` gọi ngay lập tức sang `Product Service:8002` (`POST /api/products/deduct-stock`) để kiểm tra số lượng và trừ kho ngay lập tức, triệt tiêu hoàn toàn nguy cơ bán vượt tồn kho (Overselling).
3. **Lưu đơn & Bắn sự kiện (Asynchronous Event)**: `Order Service` lưu đơn hàng với trạng thái `pending`, đồng thời phát ngay một thông điệp sự kiện `order.created` vào hàng đợi `orders_queue` trên **RabbitMQ Broker**.
4. **Phản hồi tức thì**: `Order Service` trả kết quả thành công ngay cho người dùng mà không cần chờ tác vụ gửi email/thông báo (Non-blocking).
5. **Tiêu thụ sự kiện (Event Consumer)**: `Notification Service:8004` lắng nghe từ RabbitMQ, bóc tách dữ liệu sự kiện để ghi nhận thông báo cho Admin trên bảng điều khiển.

---

## 7. GIẤY PHÉP & BẢN QUYỀN
Đồ án thuộc về **Nhóm 2 - Môn học Thương Mại Điện Tử**. Mọi mã nguồn được thiết kế phục vụ mục đích học tập và nghiên cứu kiến trúc phần mềm phân tán.
