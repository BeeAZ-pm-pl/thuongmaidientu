# BÁO CÁO KỸ THUẬT VÀ KIẾN TRÚC HỆ THỐNG
## ĐỀ TÀI: PHÁT TRIỂN ỨNG DỤNG WEB MUA SẮM TRỰC TUYẾN SỬ DỤNG KIẾN TRÚC MICROSERVICES VÀ API GATEWAY

---

## MỤC LỤC
1. [TỔNG QUAN ĐỀ TÀI](#1-tổng-quan-đề-tài)
2. [KIẾN TRÚC HỆ THỐNG TỔNG THỂ](#2-kiến-trúc-hệ-thống-tổng-thể)
3. [CHI TIẾT CÁC MICROSERVICES VÀ CƠ CHẾ GIAO TIẾP](#3-chi-tiết-các-microservices-và-cơ-chế-giao-tiếp)
4. [THIẾT KẾ GIAO DIỆN NGƯỜI DÙNG VÀ TỐI ƯU CSS](#4-thiết-kế-giao-diện-người-dùng-và-tối-ưu-css)
5. [ĐÓNG GÓI DOCKER VÀ HƯỚNG DẪN TRIỂN KHAI](#5-đóng-gói-docker-và-hướng-dẫn-triển-khai)
6. [KẾT LUẬN VÀ HƯỚNG MỞ RỘNG](#6-kết-luận-và-hướng-mở-rộng)

---

## 1. TỔNG QUAN ĐỀ TÀI

### 1.1. Bối cảnh
Trong các hệ thống thương mại điện tử hiện đại, mô hình Monolithic (nguyên khối) truyền thống bộc lộ nhiều điểm hạn chế khi quy mô hệ thống tăng trưởng:
- Khó mở rộng từng thành phần độc lập (khó scale riêng module tìm kiếm hoặc giỏ hàng).
- Độ phụ thuộc mã nguồn cao, một sự cố nhỏ ở module thanh toán có thể làm ngừng trệ toàn bộ hệ thống.
- Khó khăn trong việc phối hợp nhóm và triển khai liên tục (CI/CD).

### 1.2. Mục tiêu dự án
Dự án hướng đến việc xây dựng một hệ thống thương mại điện tử phân tán hoàn chỉnh trên nền tảng **Node.js**:
- Triển khai kiến trúc **Microservices** chuẩn mực, áp dụng nguyên lý phân tách trách nhiệm đơn lẻ (Single Responsibility Principle) và cơ chế **Database-per-service**.
- Sử dụng **API Gateway** làm điểm tiếp nhận duy nhất cho client, định tuyến yêu cầu và ẩn đi cấu trúc mạng nội bộ.
- Ứng dụng **Message Queue (RabbitMQ)** để xử lý sự kiện bất đồng bộ (Event-Driven Architecture) giữa các service.
- Giao diện người dùng trực quan, thiết kế hiện đại, tách biệt hoàn toàn mã định kiểu CSS, đáp ứng trải nghiệm mua sắm của khách hàng và quản trị của admin.

---

## 2. KIẾN TRÚC HỆ THỐNG TỔNG THỂ

### 2.1. Sơ đồ khối kiến trúc

```
+--------------------------------------------------------------------+
|                         CLIENT LAYER                               |
|   +-----------------------------+   +--------------------------+   |
|   | Customer Storefront (HTML)  |   | Admin Dashboard (HTML)   |   |
|   | Styles: client/css/*.css    |   | Styles: client/css/*.css |   |
|   | Logic:  client/js/app.js    |   | Logic:  client/js/admin.js|  |
|   +-----------------------------+   +--------------------------+   |
+---------------------------------+----------------------------------+
                                  |
                           HTTP / REST API
                                  v
+--------------------------------------------------------------------+
|                   API GATEWAY (Port: 8000)                         |
|   - Reverse Proxy Routing (http-proxy-middleware)                  |
|   - Phục vụ Static Client Web (HTML, CSS, JS)                      |
|   - Quản lý CORS, Bảo mật & Health Check Tập trung                 |
+-------+--------------------+-------------------+-------------------+
        |                    |                   |
        v                    v                   v
+---------------+    +---------------+   +---------------+
| Identity      |    | Product       |   | Order         |
| Service       |    | Service       |   | Service       |
| (Port: 8001)  |    | (Port: 8002)  |   | (Port: 8003)  |
+-------+-------+    +-------+-------+   +-------+-------+
        |                    |                   |
        | [JSON/DB Store]    | [JSON/DB Store]   | [JSON/DB Store]
        |                    |                   |
        |                    +<--------+---------+
        |                   Inter-service HTTP (Deduct Stock)
        |                                        |
        |                                        v
        |                              +-------------------+
        |                              | RabbitMQ Broker   | (Port: 5672)
        |                              | Queue: orders_q   |
        |                              +---------+---------+
        |                                        |
        |                                        v (Subscribe)
        |                              +-------------------+
        |                              | Notification      |
        |                              | Service           |
        |                              | (Port: 8004)      |
        |                              +---------+---------+
        |                                        |
        +----------------------------------------+
```

### 2.2. Các Design Patterns được áp dụng
1. **API Gateway Pattern**: Client không cần biết địa chỉ IP hay port của từng service con. Mọi yêu cầu đều hướng về port `8000`. API Gateway phân phối lưu lượng chính xác.
2. **Database-per-service Pattern**: Mỗi service sở hữu phân vùng lưu trữ dữ liệu hoàn toàn độc lập, không dùng chung cơ sở dữ liệu. Điều này ngăn chặn sự ràng buộc chặt chẽ (tight coupling) giữa các domain.
3. **Event-Driven Architecture (EDA)**: Khi đơn hàng được tạo hoặc cập nhật trạng thái trong Order Service, sự kiện được phát tán qua RabbitMQ để Notification Service tiêu thụ bất đồng bộ, không làm nghẽn luồng xử lý đơn hàng chính.

---

## 3. CHI TIẾT CÁC MICROSERVICES VÀ CƠ CHẾ GIAO TIẾP

### 3.1. API Gateway (Port 8000)
- **Công nghệ**: Express.js, `http-proxy-middleware`, `cors`.
- **Nhiệm vụ**:
  - Điểm vào duy nhất (Single Point of Entry) cho toàn bộ ứng dụng.
  - Định tuyến các URL:
    - `/api/auth/*` -> `http://identity-service:8001`
    - `/api/products/*`, `/api/categories/*` -> `http://product-service:8002`
    - `/api/orders/*`, `/api/cart/*` -> `http://order-service:8003`
    - `/api/notifications/*` -> `http://notification-service:8004`
  - Phục vụ các trang tĩnh của giao diện (`/` cho Storefront và `/admin` cho trang Quản trị).
  - Cung cấp endpoint giám sát tập trung `/api/health`.

### 3.2. Identity Service (Port 8001)
- **Công nghệ**: Express.js, `jsonwebtoken`, `bcryptjs`.
- **Nhiệm vụ**:
  - Quản lý thông tin tài khoản người dùng, phân quyền vai trò (`customer`, `admin`).
  - Mã hoá mật khẩu bằng thuật toán Salted Hash (`bcryptjs`).
  - Cấp phát và xác thực JWT token (JSON Web Token).
- **API Endpoints**:
  - `POST /api/auth/register`: Đăng ký tài khoản người dùng mới.
  - `POST /api/auth/login`: Đăng nhập, nhận JWT token và thông tin phiên.
  - `GET /api/auth/me`: Lấy thông tin cá nhân dựa trên token.
  - `GET /api/auth/users`: Trả về danh sách tất cả người dùng (dành cho Admin).

### 3.3. Product Service (Port 8002)
- **Công nghệ**: Express.js, module quản lý danh mục và sản phẩm.
- **Nhiệm vụ**:
  - Quản lý danh mục hàng hóa (Categories) và danh sách sản phẩm (Products).
  - Tìm kiếm toàn văn (Search), lọc theo danh mục, lọc theo tầm giá và sắp xếp linh hoạt.
  - Cập nhật và kiểm soát số lượng hàng tồn kho (Stock).
- **API Endpoints**:
  - `GET /api/categories`: Lấy danh sách phân loại hàng hóa.
  - `GET /api/products`: Truy vấn danh sách sản phẩm với các bộ lọc `search`, `category`, `sort`.
  - `GET /api/products/:id`: Xem chi tiết sản phẩm.
  - `POST /api/products`: Thêm sản phẩm mới (Admin).
  - `PUT /api/products/:id`: Cập nhật thông tin sản phẩm (Admin).
  - `DELETE /api/products/:id`: Xóa sản phẩm khỏi kho (Admin).
  - `POST /api/products/deduct-stock`: Giao tiếp liên dịch vụ để trừ tồn kho khi có đơn hàng.

### 3.4. Order Service (Port 8003)
- **Công nghệ**: Express.js, `amqplib`.
- **Nhiệm vụ**:
  - Tạo đơn hàng mới từ giỏ hàng.
  - Giao tiếp đồng bộ (Synchronous HTTP) với Product Service để xác minh và trừ hàng tồn kho.
  - Quản lý vòng đời đơn hàng: `pending` -> `processing` -> `completed` / `cancelled`.
  - Thống kê doanh thu, đơn hàng phục vụ bảng điều khiển quản trị viên.
  - Phát sự kiện `order.created` và `order.status_updated` vào Message Queue.
- **API Endpoints**:
  - `GET /api/orders`: Danh sách đơn hàng (hỗ trợ lọc theo `status`).
  - `GET /api/orders/:id`: Chi tiết một đơn hàng kèm thông tin người nhận và danh sách mặt hàng.
  - `GET /api/orders/my-orders`: Xem lịch sử đơn hàng của người dùng cá nhân.
  - `GET /api/orders/stats`: Thống kê tổng doanh thu, số lượng đơn theo từng trạng thái.
  - `POST /api/orders`: Tạo đơn hàng mới.
  - `PATCH /api/orders/:id/status`: Cập nhật trạng thái đơn hàng.

### 3.5. Notification Service & Message Queue (Port 8004 & Port 5672)
- **Công nghệ**: Express.js, `amqplib`, RabbitMQ.
- **Nhiệm vụ**:
  - Lắng nghe hàng đợi `orders_queue` trên RabbitMQ.
  - Xử lý các sự kiện `order.created` để gửi thông báo đơn hàng mới cho Admin.
  - Xử lý các sự kiện `order.status_updated` để gửi thông báo tiến độ cho khách hàng.
  - Hỗ trợ cơ chế dự phòng HTTP fallback khi môi trường cục bộ chưa khởi động RabbitMQ.
- **API Endpoints**:
  - `GET /api/notifications`: Xem danh sách thông báo hệ thống.
  - `POST /api/notifications/events`: Tiếp nhận sự kiện dạng HTTP Event.
  - `PATCH /api/notifications/:id/read`: Đánh dấu thông báo đã đọc.

---

## 4. THIẾT KẾ GIAO DIỆN NGƯỜI DÙNG VÀ TỐI ƯU CSS

### 4.1. Nguyên tắc thiết kế tách biệt (Separation of Concerns)
Toàn bộ mã định kiểu CSS được tách thành các file riêng biệt đặt trong thư mục `client/css/`, tuyệt đối không dùng inline style hoặc thẻ `<style>` trong file HTML:
- `variables.css`: Định nghĩa toàn bộ Design Tokens (bảng màu HSL hiện đại, bóng đổ Shadow tầng bậc, viền bo tròn Border Radius, thời gian chuyển cảnh Transitions).
- `base.css`: CSS Reset chuẩn quốc tế, typography từ font chữ Inter, thiết lập hệ thống nút bấm, nhãn mác (badges), khung nhập liệu và hệ thống thông báo Toast nổi.
- `navbar.css`: Thiết kế thanh điều hướng nổi dạng kính mờ (Glassmorphism), thanh tìm kiếm nhanh, giỏ hàng với huy hiệu số lượng tự động cập nhật và menu tài khoản.
- `storefront.css`: Banner chào đón (Hero Banner) ấn tượng, thanh cuộn danh mục dạng con nhộng (Pills), lưới thẻ sản phẩm với hiệu ứng phóng to ảnh khi rê chuột (Zoom hover effect) và chân trang.
- `admin.css`: Bảng điều khiển quản trị chuyên nghiệp với bố cục Sidebar - Header - Content, hệ thống thẻ chỉ số KPI trực quan, bảng quản lý đơn hàng, kho sản phẩm và sơ đồ kiểm tra trạng thái Microservices.
- `modals.css`: Cửa sổ trượt xem giỏ hàng từ góc phải (Slide-out Drawer), Modal xem chi tiết sản phẩm, Modal thanh toán đơn hàng và Modal xác thực tài khoản.

### 4.2. Trải nghiệm người dùng (UX)
- **Mua sắm liền mạch**: Khách hàng có thể tìm kiếm sản phẩm theo thời gian thực, lọc nhanh theo danh mục, thêm vào giỏ hàng với thông báo Toast động.
- **Đặt hàng nhanh**: Quy trình đặt hàng trực quan với tính năng điền nhanh thông tin tài khoản mẫu để kiểm nghiệm luồng hoạt động.
- **Quản trị toàn diện**: Admin có thể giám sát doanh thu tức thì, điều chỉnh trạng thái đơn hàng (Đang giao, Hoàn tất, Huỷ), chỉnh sửa giá bán và cập nhật tồn kho.

---

## 5. ĐÓNG GÓI DOCKER VÀ HƯỚNG DẪN TRIỂN KHAI

### 5.1. Cấu hình Docker & Docker Compose
Mỗi Microservice sở hữu một `Dockerfile` riêng sử dụng base image `node:20-alpine` siêu nhẹ và tối ưu bộ nhớ. Tệp `docker-compose.yml` liên kết toàn bộ 6 container:
1. `ecommerce-rabbitmq`: Port `5672` (AMQP) và `15672` (Management Dashboard).
2. `ecommerce-identity-service`: Port `8001`.
3. `ecommerce-product-service`: Port `8002`.
4. `ecommerce-order-service`: Port `8003`.
5. `ecommerce-notification-service`: Port `8004`.
6. `ecommerce-api-gateway`: Port `8000`.

### 5.2. Hướng dẫn chạy ứng dụng

#### Cách 1: Chạy trực tiếp bằng Node.js (Khuyên dùng khi phát triển local)
1. Mở cửa sổ dòng lệnh tại thư mục gốc của dự án:
   ```bash
   node start-all.js
   ```
2. Mở trình duyệt web truy cập:
   - Giao diện Mua sắm (Khách hàng): **`http://localhost:8000`**
   - Giao diện Quản trị (Admin): **`http://localhost:8000/admin`**
   - Tài khoản Admin có sẵn: `admin@shop.com` / Mật khẩu: `123456`
   - Tài khoản Khách có sẵn: `customer@shop.com` / Mật khẩu: `123456`

#### Cách 2: Triển khai toàn diện bằng Docker Compose
1. Đảm bảo Docker Desktop đang chạy trên máy tính.
2. Tại thư mục dự án, chạy lệnh:
   ```bash
   docker-compose up --build
   ```
3. Truy cập vào **`http://localhost:8000`** để sử dụng hệ thống.

---

## 6. KẾT LUẬN VÀ HƯỚNG MỞ RỘNG

### 6.1. Kết quả đạt được
- Xây dựng thành công toàn bộ 4 giai đoạn theo đúng yêu cầu:
  1. Thiết kế kiến trúc, API Gateway, Identity Service và cấu hình Docker.
  2. Xây dựng Product Service và Giao diện mua sắm Storefront hiện đại.
  3. Xây dựng Order Service và Bảng điều khiển Quản trị Admin đa chức năng.
  4. Hoàn thiện Notification Service, tích hợp Message Queue và biên soạn Báo cáo kiến trúc.
- Mã nguồn tuân thủ nghiêm ngặt tiêu chuẩn sạch (Clean Code), không chứa comment dư thừa, tách riêng toàn bộ hệ thống CSS thành các tệp chuyên biệt.

### 6.2. Hướng phát triển trong tương lai
- Tích hợp thêm Cổng thanh toán trực tuyến thực tế (Stripe, VNPAY Sandbox).
- Triển khai dịch vụ Service Discovery (Consul hoặc Eureka) và cấu hình Circuit Breaker (Opossum) để tăng khả năng chịu lỗi mạng phân tán.
- Triển khai hệ thống giám sát phân tán với OpenTelemetry và Prometheus / Grafana.
