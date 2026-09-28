# HỆ THỐNG THƯƠNG MẠI ĐIỆN TỬ PHÂN TÁN NOVASHOP (MICROSERVICES ARCHITECTURE)

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript" />
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express.js" />
  <img src="https://img.shields.io/badge/RabbitMQ-FF6600?style=for-the-badge&logo=rabbitmq&logoColor=white" alt="RabbitMQ" />
  <img src="https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white" alt="MySQL" />
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/Google_Gemini_AI-8E75B2?style=for-the-badge&logo=googlegemini&logoColor=white" alt="Google Gemini" />
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white" alt="HTML5" />
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white" alt="CSS3" />
  <img src="https://img.shields.io/badge/Dependabot-025E8C?style=for-the-badge&logo=dependabot&logoColor=white" alt="Dependabot" />
</p>

> **Đề tài:** Phát triển hệ thống mua sắm trực tuyến toàn diện theo kiến trúc Microservices, API Gateway, kiến trúc hướng sự kiện (Event-Driven Architecture) và Trợ lý ảo tư vấn thông minh Google Gemini AI.  
> **Cơ sở công nghệ:** Nền tảng phân tán đồng bộ và bất đồng bộ, lập trình type-safe với TypeScript, quản lý thông điệp hàng đợi qua RabbitMQ, và cơ sở dữ liệu quan hệ MySQL chuẩn hóa.

---

## 1. BẢNG MA TRẬN CÔNG NGHỆ & NGÔN NGỮ SỬ DỤNG

| Phân Hệ / Thành Phần | Ngôn Ngữ & Công Nghệ Chính | Biểu Tượng Chuẩn (Badges) | Vai Trò Kỹ Thuật |
| :--- | :--- | :--- | :--- |
| **Cửa Hàng Storefront** | TypeScript, HTML5, Vanilla CSS3 | ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white) ![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white) ![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white) | Single Page Application (SPA), Quản lý State tập trung, UI 2 tầng hiện đại, Modal tương tác, 7 trang chân trang |
| **Cổng Quản Trị Admin** | TypeScript, Dark Glassmorphism CSS | ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white) ![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white) | Bảng điều khiển kinh doanh, Quản lý sản phẩm, Danh mục, Đơn hàng, Xác thực JWT |
| **API Gateway** | JavaScript, Node.js, Express.js | ![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black) ![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white) ![Express](https://img.shields.io/badge/Express.js-000000?style=flat-square&logo=express&logoColor=white) | Reverse Proxy, Rate Limiting chống DDoS, Middleware ghi log độ trễ và theo dõi tình trạng sức khỏe dịch vụ |
| **Identity Service** | JavaScript, Node.js, Express, MySQL | ![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white) ![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=flat-square&logo=mysql&logoColor=white) | Quản lý người dùng, Mã hóa mật khẩu bcrypt, Cấp phát và thẩm định JSON Web Token (JWT) |
| **Product Service** | JavaScript, Node.js, Express, MySQL | ![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white) ![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=flat-square&logo=mysql&logoColor=white) | Quản lý danh mục hàng hóa, Chi tiết sản phẩm, Biến thể màu sắc/dung lượng, Trừ kho đồng bộ tức thì |
| **Order Service** | JavaScript, Node.js, Express, RabbitMQ, MySQL | ![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white) ![RabbitMQ](https://img.shields.io/badge/RabbitMQ-FF6600?style=flat-square&logo=rabbitmq&logoColor=white) ![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=flat-square&logo=mysql&logoColor=white) | Tiếp nhận giỏ hàng, Thanh toán COD/Chuyển khoản, Event Producer phát sự kiện đơn hàng vào RabbitMQ |
| **Notification Service** | JavaScript, Node.js, Express, RabbitMQ | ![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white) ![RabbitMQ](https://img.shields.io/badge/RabbitMQ-FF6600?style=flat-square&logo=rabbitmq&logoColor=white) | Event Consumer lắng nghe hàng đợi `orders_queue`, Trích xuất dữ liệu và tạo thông báo hệ thống |
| **Chat & AI Service** | TypeScript, Node.js, Google Gemini | ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white) ![Gemini](https://img.shields.io/badge/Google_Gemini-8E75B2?style=flat-square&logo=googlegemini&logoColor=white) | Trợ lý tư vấn mua sắm thông minh NovaBot AI, Đề xuất sản phẩm chuẩn xác theo câu hỏi khách hàng |
| **Container & Bảo Mật** | Docker, Docker Compose, Dependabot | ![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white) ![Dependabot](https://img.shields.io/badge/Dependabot-025E8C?style=flat-square&logo=dependabot&logoColor=white) | Đóng gói môi trường đồng nhất, Quét và vá lỗ hổng bảo mật tự động hàng tuần |

---

## 2. TỔNG QUAN KIẾN TRÚC HỆ THỐNG

Hệ thống **NovaShop** được thiết kế và xây dựng trên mô hình kiến trúc phân tán **Microservices**, chia tách rõ ràng ranh giới nghiệp vụ (Bounded Context) giữa các phân hệ chức năng độc lập. Giải pháp này giúp hệ thống đạt độ sẵn sàng cao, dễ dàng mở rộng theo chiều ngang (Horizontal Scaling) và tối ưu hóa hiệu năng xử lý.

```
                              +---------------------------------------+
                              |              CLIENT LAYER             |
                              |  - Storefront Web SPA (Khách hàng)    |
                              |  - Admin Dashboard Portal (Quản trị)  |
                              +-------------------+-------------------+
                                                  | HTTP (:8000)
                                                  v
                              +---------------------------------------+
                              |          API GATEWAY (Proxy)          |
                              |  - Reverse Proxy & URL Dispatcher     |
                              |  - Rate Limiting & Latency Tracker    |
                              |  - Centralized Health Monitoring      |
                              +-------------------+-------------------+
                                                  |
                 +-------------------+------------+-----------+--------------------+
                 | HTTP              | HTTP                   | HTTP               | HTTP
                 v                   v                        v                    v
        +-----------------+ +-----------------+      +-----------------+ +-----------------+
        | IDENTITY-SRV    | | PRODUCT-SRV     |      | ORDER-SRV       | | NOTIFICATION-SRV|
        | Port: 8001      | | Port: 8002      |      | Port: 8003      | | Port: 8004      |
        | JWT, Auth, User | | Catalog, Stock  |      | Orders, Checkout| | Alert, Events   |
        +--------+--------+ +--------+--------+      +--------+--------+ +--------+--------+
                 |                   ^                        |                   ^
                 |                   | Sync REST              | Publish Event     | Consume
                 |                   +--- Deduct Stock -------+                   |
                 |                                            v                   |
                 |                                   +-----------------+          |
                 |                                   | RABBITMQ BROKER |----------+
                 |                                   | orders_queue    |
                 |                                   +-----------------+
                 v                                            v
+------------------------------------------------------------------------------------------+
|                                 DATABASE LAYER (MySQL)                                   |
|                               Cơ sở dữ liệu: ecommerce_db                                |
+------------------------------------------------------------------------------------------+
```

---

## 3. PHÂN CÔNG NHIỆM VỤ THÀNH VIÊN (NHÓM 2)

| STT | Thành viên | Vai trò & Trách nhiệm chính | Nhánh tính năng |
| :---: | :--- | :--- | :--- |
| **1** | **Nguyễn Công Đạt** *(Nhóm trưởng)* | Thiết kế kiến trúc tổng thể, API Gateway, Identity Service, Docker Compose & Quản lý CSDL | `feature/architecture-gateway-identity` |
| **2** | **Hoàng Minh Hiếu** | Phát triển Product Microservice, quản lý danh mục & kho hàng, xây dựng giao diện Storefront Web | `feature/product-client` |
| **3** | **Nguyễn Văn Hoàng** | Phát triển Order Microservice, quy trình đặt hàng, tích hợp RabbitMQ Producer & giao diện Admin Dashboard | `feature/order-admin` |
| **4** | **Nguyễn Tô Trung Sơn** | Phát triển Notification Microservice, tích hợp RabbitMQ Consumer nhận và phân phối sự kiện | `feature/notification-service` |

---

## 4. THIẾT KẾ GIAO DIỆN NGƯỜI DÙNG TRỰC QUAN (UI/UX DESIGN)

Hệ thống được phát triển theo tiêu chuẩn giao diện hiện đại, trực quan, tối ưu trải nghiệm tương tác (UX) và thân thiện với mọi kích cỡ thiết bị.

### 4.1. Giao diện Cửa hàng Dành cho Khách Mua (Storefront Web - `http://localhost:8000`)
* **Thanh Tiện Ích Trên Cùng (Top Bar)**:
  * Bên trái: Nhãn chứng nhận *"NovaShop Chính Hãng 100%"*, liên kết tải ứng dụng di động, kết nối mạng xã hội.
  * Bên phải: Mục *Thông Báo*, liên kết *Hỗ Trợ* (dẫn tới Trung tâm trợ giúp), cụm điều hướng tài khoản thành viên (*Đăng Ký*, *Đăng Nhập*, *Đơn Mua*, *Đăng Xuất*).
* **Thanh Header Chính (Main Navigation)**:
  * Logo thương hiệu nhận diện cao.
  * Thanh tìm kiếm trung tâm đa năng: Hỗ trợ tự động hiển thị gợi ý thông minh (Live Search Suggestions) kèm nhãn từ khóa nổi bật (Hot Keywords).
  * Nút giỏ hàng chuyên dụng có hiển thị số lượng badge phản hồi theo thời gian thực.
* **Khu Vực Flash Sale Giờ Vàng**:
  * Bộ đồng hồ đếm ngược tự động (Countdown Timer).
  * Thẻ sản phẩm hiển thị tỷ lệ giảm giá, thanh tiến độ số lượng đã bán trực quan.
  * Nút mua ngay và nút thêm giỏ hàng được căn chỉnh cân đối, chuẩn tỷ lệ bố cục.
* **Danh Mục Sản Phẩm & Bộ Lọc Nhanh**:
  * Điều hướng theo tab danh mục (Điện thoại, Laptop, Phụ kiện, Thiết bị số).
  * Bộ lọc sắp xếp sản phẩm theo giá thành (Tăng dần / Giảm dần) và thời gian ra mắt mới nhất.
* **Modal Chi Tiết Sản Phẩm Đa Chiều (Product Detail Modal)**:
  * Bộ sưu tập hình ảnh sắc nét.
  * Lựa chọn phiên bản / màu sắc / dung lượng tương tác; giá thành tự động cập nhật linh hoạt theo lựa chọn của khách.
  * Bảng thông số kỹ thuật chi tiết và chính sách cam kết chất lượng.
* **Trang Giỏ Hàng & Thanh Toán (`/cart`)**:
  * Kiểm tra danh mục sản phẩm đã chọn, điều chỉnh số lượng, áp dụng voucher khuyến mãi.
  * Tùy chọn phương thức thanh toán thuận tiện: Thanh toán khi nhận hàng (COD) hoặc Chuyển khoản ngân hàng.
* **Trang Tra Cứu Đơn Hàng (`/orders`)**:
  * Quản lý toàn bộ lịch sử đơn mua, hiển thị mã đơn, ngày tạo, tổng tiền và trạng thái xử lý đơn hàng.
* **Hệ Thống Trang Thông Tin Chân Trang (Footer SPA Pages)**:
  * Toàn bộ 7 trang thông tin được định tuyến SPA mượt mà không tải lại trang:
    * `/about`: Giới thiệu công ty, câu chuyện thương hiệu và tầm nhìn sứ mệnh.
    * `/careers`: Cơ hội nghề nghiệp, chính sách đãi ngộ và thông tin ứng tuyển 4 vị trí kỹ thuật & vận hành.
    * `/terms`: Quy chế hoạt động, điều khoản dịch vụ và cơ chế bảo đảm quyền lợi người tiêu dùng.
    * `/privacy`: Chính sách bảo vệ dữ liệu cá nhân theo chuẩn an ninh mạng.
    * `/help`: Trung tâm trợ giúp khách hàng & tổng hợp giải đáp câu hỏi thường gặp (FAQ).
    * `/guide`: Hướng dẫn quy trình 4 bước mua sắm và lưu ý đồng kiểm bưu kiện an toàn.
    * `/shipping`: Bảng cước phí vận chuyển, cam kết thời gian giao hàng và quy cách đóng gói chống sốc.
* **Trợ Lý Ảo Trực Tuyến NovaBot AI**:
  * Cửa sổ Live Chat tương tác trực tiếp tích hợp mô hình **Google Gemini AI**.
  * Hỗ trợ tìm kiếm, so sánh tính năng và đưa ra gợi ý sản phẩm phù hợp với nhu cầu người mua.

### 4.2. Cổng Quản Trị Dành Cho Chủ Cửa Hàng (Admin Portal - `http://localhost:8000/admin`)
* **Trang Đăng Nhập Quản Trị (`/admin/login`)**: Thiết kế Dark Mode hiện đại, hiệu ứng kính mờ (Glassmorphism), cơ chế xác thực JWT an toàn.
* **Bảng Điều Khiển Tổng Quan (Dashboard)**: Thống kê tức thời doanh thu, tổng số đơn mua, lượng khách hàng và các chỉ số kinh doanh quan trọng.
* **Quản Lý Sản Phẩm**: Thêm mới, chỉnh sửa thông tin, giá bán, số lượng tồn kho và cập nhật hình ảnh.
* **Quản Lý Đơn Hàng**: Theo dõi trạng thái các đơn hàng (*Chờ xử lý, Đang giao, Đã hoàn tất, Đã hủy*).
* **Quản Lý Danh Mục**: Phân loại và cấu trúc lại hệ thống danh mục hàng hóa.

---

## 5. CÁC THÀNH PHẦN VÀ CỔNG TRUY CẬP (PORTS & SERVICES)

| Thành phần / Dịch vụ | Cổng (Port) | Địa chỉ truy cập / Vai trò |
| :--- | :---: | :--- |
| **API Gateway** | `8000` | Điểm tiếp nhận trung tâm, định tuyến Reverse Proxy tới các microservices |
| • Cửa hàng trực tuyến (Storefront) | `8000` | `http://localhost:8000` |
| • Cổng quản trị (Admin Portal) | `8000` | `http://localhost:8000/admin` |
| • Đăng nhập quản trị viên | `8000` | `http://localhost:8000/admin/login` |
| **Identity Service** | `8001` | Đăng ký, đăng nhập, băm mật khẩu bcrypt, quản lý tài khoản và cấp phát JWT |
| **Product Service** | `8002` | Quản lý danh mục, sản phẩm, phiên bản và trừ tồn kho thời gian thực |
| **Order Service** | `8003` | Tiếp nhận đơn đặt hàng, tính toán giá trị, gửi sự kiện vào RabbitMQ |
| **Notification Service** | `8004` | Tiêu thụ sự kiện từ RabbitMQ, ghi nhận thông báo cho quản trị viên |
| **Chat & AI Service** | `8005` | Quản lý phiên chat, tích hợp Google Gemini AI tư vấn sản phẩm thông minh |
| **RabbitMQ Management** | `15672` | `http://localhost:15672` (Tài khoản: `guest` / `guest`) |
| **MySQL Database Server** | `3306` | Lưu trữ cơ sở dữ liệu quan hệ tập trung (`ecommerce_db`) |

---

## 6. HƯỚNG DẪN KHỞI TẠO CƠ SỞ DỮ LIỆU (MYSQL)

Dự án cung cấp tệp khởi tạo [`database.sql`](database.sql) bao gồm toàn bộ lược đồ bảng, khóa ngoại và dữ liệu sản phẩm/danh mục mẫu chuẩn:

### Cách nhập (Import) dữ liệu:
1. Mở công cụ quản lý cơ sở dữ liệu MySQL (**phpMyAdmin**, **MySQL Workbench**, **DBeaver**, hoặc **Navicat**).
2. Tạo mới hoặc lựa chọn cơ sở dữ liệu `ecommerce_db`:
   ```sql
   CREATE DATABASE IF NOT EXISTS `ecommerce_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   USE `ecommerce_db`;
   ```
3. Nhập trực tiếp toàn bộ nội dung trong tệp **[`database.sql`](database.sql)** hoặc sử dụng câu lệnh terminal:
   ```bash
   mysql -u root -p ecommerce_db < database.sql
   ```

### Tài khoản thử nghiệm có sẵn:
* **Tài khoản Quản trị viên (Admin):**
  * Email: `admin@shop.com` (hoặc tên đăng nhập `admin`)
  * Mật khẩu: `123456`
* **Tài khoản Khách hàng (Customer):**
  * Email: `customer@shop.com`
  * Mật khẩu: `123456`

---

## 7. HƯỚNG DẪN CÀI ĐẶT VÀ KHỞI CHẠY DỰ ÁN

### Cách 1: Khởi chạy siêu tốc bằng Node.js Runner (Khuyên dùng khi phát triển cục bộ)
Yêu cầu: Máy đã cài **Node.js (>= 18)** và đang chạy dịch vụ **MySQL** (qua XAMPP, Laragon hoặc Docker).

```bash
# 1. Cài đặt các gói phụ thuộc (nếu chưa cài)
npm install

# 2. Biên dịch toàn bộ TypeScript sang JavaScript chuẩn
npm run build

# 3. Khởi chạy đồng bộ tất cả 6 microservices và API Gateway chỉ với 1 lệnh
node start_all.js
```
> Trình điều phối `start_all.js` sẽ tự động mở đồng thời toàn bộ 6 dịch vụ, phân biệt màu sắc console trực quan và tự động dọn dẹp tiến trình khi bạn nhấn `Ctrl + C`.

---

### Cách 2: Khởi chạy bằng Docker Compose (Môi trường Container hóa)
Yêu cầu: Máy tính đã cài đặt và khởi động sẵn **Docker Desktop**.

```bash
# 1. Di chuyển vào thư mục gốc của dự án
cd thuongmaidientu

# 2. Xây dựng image và kích hoạt toàn bộ container
docker compose up --build
```
> Khi các container thông báo trạng thái `ready`, mở trình duyệt truy cập:
> * Giao diện mua sắm: **`http://localhost:8000`**
> * Giao diện quản trị: **`http://localhost:8000/admin`**
> * Để dừng toàn bộ container: Nhấn tổ hợp phím `Ctrl + C` hoặc chạy `docker compose down`.

---

### Cách 3: Khởi chạy độc lập từng Service thủ công
```bash
# 1. API Gateway
cd gateway && npm install && node src/index.js

# 2. Identity Service
cd services/identity-service && npm install && node src/index.js

# 3. Product Service
cd services/product-service && npm install && node src/index.js

# 4. Order Service
cd services/order-service && npm install && node src/index.js

# 5. Notification Service
cd services/notification-service && npm install && node src/index.js

# 6. Chat & AI Service
cd services/chat-service && npm install && node dist/index.js
```

---

## 8. QUY TRÌNH XỬ LÝ NGHIỆP VỤ HƯỚNG SỰ KIỆN (EVENT-DRIVEN WORKFLOW)

```
[Khách Hàng Checkout] 
         │ (HTTP POST /api/orders)
         ▼
[API Gateway:8000]
         │ (Reverse Proxy)
         ▼
[Order Service:8003] ──(Sync HTTP POST /deduct-stock)──> [Product Service:8002]
         │                                                      │
         │ (Lưu đơn 'pending')                                  ▼
         │                                            [Trừ Tồn Kho CSDL]
         ▼
[Publish Event: 'order.created']
         │
         ▼
[RabbitMQ Broker: orders_queue]
         │
         ▼ (Async Consume)
[Notification Service:8004] ──> [Ghi Nhận Thông Báo Quản Trị Hệ Thống]
```

1. **Khách hàng xác nhận đơn mua**: Trình duyệt gửi payload đơn hàng lên `API Gateway:8000` và chuyển tiếp đến `Order Service:8003`.
2. **Kiểm tra và trừ tồn kho tức thời (Sync HTTP)**: `Order Service` gửi yêu cầu đồng bộ trực tiếp sang `Product Service:8002` (`POST /api/products/deduct-stock`). Số lượng sản phẩm được khấu trừ ngay lập tức tại CSDL, ngăn chặn triệt để tình trạng bán vượt số lượng thực tế (Overselling).
3. **Lưu trữ đơn hàng & Phát hành sự kiện (Asynchronous Event)**: `Order Service` ghi nhận đơn vào bảng `orders` với trạng thái `pending`, đồng thời phát ngay một thông điệp sự kiện `order.created` vào hàng đợi `orders_queue` trên **RabbitMQ Broker**.
4. **Phản hồi trải nghiệm người dùng nhanh chóng**: `Order Service` trả kết quả thành công về cho khách hàng mà không cần chờ đợi các tác vụ phụ trợ (Non-blocking I/O).
5. **Tiêu thụ sự kiện tự động (Event Consumer)**: `Notification Service:8004` liên tục lắng nghe hàng đợi trên RabbitMQ, trích xuất dữ liệu đơn hàng và kích hoạt thông báo hệ thống trên bảng điều khiển Quản trị viên.

---

## 9. BẢN QUYỀN & MỤC ĐÍCH SỬ DỤNG
Dự án được xây dựng và hoàn thiện bởi **Nhóm 2 - Học phần Thương Mại Điện Tử**. Toàn bộ mã nguồn phục vụ mục đích nghiên cứu, học tập và ứng dụng thực tiễn kiến trúc hệ thống phần mềm phân tán hiện đại.
