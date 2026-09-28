# HƯỚNG DẪN SỬ DỤNG HỆ THỐNG THƯƠNG MẠI ĐIỆN TỬ NOVASHOP

Tài liệu này hướng dẫn chi tiết cách cài đặt, vận hành và sử dụng toàn bộ tính năng của hệ thống NovaShop dành cho cả **Khách hàng (Storefront)** và **Quản trị viên (Admin)**.

---

## 1. CÀI ĐẶT VÀ KHỞI CHẠY HỆ THỐNG

### 1.1. Yêu cầu môi trường
- **Node.js**: Phiên bản 18+ hoặc 20+.
- **MySQL**: 8.0+ (hoặc qua XAMPP / MariaDB trên cổng mặc định 3306).
- **Docker & Docker Compose** (nếu triển khai bằng container).

### 1.2. Chuẩn bị cơ sở dữ liệu
1. Mở MySQL client hoặc phpMyAdmin.
2. Tạo database và nạp schema từ file `database.sql`:
   ```bash
   mysql -u root -p < database.sql
   ```
   *(File `database.sql` đã bao gồm các bảng: người dùng, sản phẩm, danh mục, đơn hàng, chi tiết đơn hàng, phiên chat `chat_sessions` và tin nhắn `chat_messages`).*

### 1.3. Cấu hình biến môi trường (.env)
Sao chép `.env.example` thành `.env` tại thư mục gốc và điều chỉnh nếu cần:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=ecommerce_db
DB_PORT=3306

PORT_GATEWAY=8000
PORT_IDENTITY=8001
PORT_PRODUCT=8002
PORT_ORDER=8003
PORT_NOTIFICATION=8004
PORT_CHAT=8005

JWT_SECRET=super_secret_jwt_key_2026
GEMINI_API_KEY=your_gemini_api_key_here
```
> *Lưu ý: Nếu chưa cấu hình `GEMINI_API_KEY`, dịch vụ Live Chat vẫn tự động hoạt động với thuật toán dự phòng thông minh (tự động gợi ý sản phẩm phù hợp từ database).*

### 1.4. Biên dịch TypeScript
Chạy lệnh biên dịch toàn bộ các module TypeScript (chat-service, client, admin):
```bash
npm run build
```

### 1.5. Khởi chạy hệ thống

**Cách 1: Khởi chạy bằng Docker Compose (Khuyên dùng)**
```bash
docker compose up --build
```

**Cách 2: Khởi chạy cục bộ**
Chạy từng dịch vụ trên các terminal riêng biệt:
- Gateway: `npm run start:gateway` (Cổng 8000)
- Identity Service: `npm run start:identity` (Cổng 8001)
- Product Service: `npm run start:product` (Cổng 8002)
- Order Service: `npm run start:order` (Cổng 8003)
- Notification Service: `npm run start:notification` (Cổng 8004)
- Chat Service: `npm run start:chat` (Cổng 8005)

---

## 2. HƯỚNG DẪN SỬ DỤNG CHO KHÁCH HÀNG (STOREFRONT)

Địa chỉ truy cập: `http://localhost:8000/`

### 2.1. Tìm kiếm và Bộ lọc sản phẩm nâng cao
- **Tìm kiếm từ khóa**: Nhập tên sản phẩm (tai nghe, bàn phím, chuột...) vào thanh tìm kiếm ở đầu trang và nhấn biểu tượng kính lúp hoặc phím `Enter`.
- **Lọc theo khoảng giá nhanh**: Nhấn vào các chip giá:
  - *Dưới 1 triệu*
  - *1 - 5 triệu*
  - *5 - 10 triệu*
  - *Trên 10 triệu*
- **Lọc theo khoảng giá tùy chỉnh**: Nhập số tiền tối thiểu vào ô `Từ đ...` và số tiền tối đa vào ô `Đến đ...`, sau đó nhấn nút **Áp dụng**.
- **Lọc theo đánh giá**: Chọn số sao mong muốn (5 sao, 4 sao trở lên, 3 sao trở lên).
- **Bộ lọc nhanh**:
  - Tích chọn `Chỉ hiện còn hàng` để ẩn các sản phẩm đã hết hàng.
  - Tích chọn `Flash Sale` để chỉ xem các deal đang giảm giá sốc.
- **Xóa bộ lọc**: Nhấn nút `Xóa bộ lọc` hoặc `Xóa tìm kiếm` để đưa toàn bộ danh sách về trạng thái mặc định.

### 2.2. Xem chi tiết và Mua hàng
- Nhấn vào sản phẩm hoặc nút **Xem Nhanh** để mở cửa sổ chi tiết (Quickview).
- Chọn phân loại sản phẩm (nếu có), tùy chỉnh số lượng.
- Nhấn **Thêm Vào Giỏ Hàng** để tiếp tục mua sắm hoặc nhấn **Mua Ngay** để chuyển thẳng tới giỏ hàng.

### 2.3. Quản lý Giỏ hàng và Thanh toán
- Truy cập giỏ hàng qua biểu tượng xe đẩy trên thanh điều hướng hoặc truy cập `http://localhost:8000/cart`.
- Điều chỉnh số lượng sản phẩm bằng nút `+` hoặc `-`, xóa sản phẩm bằng nút biểu tượng thùng rác.
- Nhập thông tin người nhận: Họ và tên, Số điện thoại, Địa chỉ nhận hàng.
- Chọn phương thức thanh toán:
  - Thanh toán khi nhận hàng (COD).
  - Chuyển khoản ngân hàng / Quét mã VietQR.
  - Ví điện tử VNPAY / MoMo.
- Nhấn **Xác Nhận Đặt Hàng**. Sau khi đặt hàng thành công, hệ thống sẽ tự động chuyển hướng đến trang theo dõi đơn mua.

### 2.4. Tra cứu lịch sử đơn hàng
- Truy cập `http://localhost:8000/orders`.
- Xem danh sách tất cả các đơn hàng đã đặt cùng trạng thái tương ứng:
  - `Chờ xác nhận` (Pending)
  - `Đang xử lý / Đang giao` (Processing)
  - `Hoàn thành` (Completed)

### 2.5. Đăng ký & Đăng nhập thành viên
- **Đăng nhập**: `http://localhost:8000/login`
- **Đăng ký**: `http://localhost:8000/register`
- Khách hàng có thể sử dụng nút con mắt để xem/ẩn mật khẩu khi nhập. Sau khi đăng nhập, thông tin họ tên, số điện thoại và địa chỉ sẽ được tự động điền sẵn khi thanh toán.

### 2.6. Trợ lý ảo Live Chat & CSKH tích hợp Google Gemini AI
- Nhấn vào nút tròn hỗ trợ khách hàng ở góc dưới bên phải màn hình để mở hộp thoại Live Chat.
- **Tư vấn bằng AI**:
  - Nhập câu hỏi vào ô chat hoặc nhấn vào các gợi ý câu hỏi nhanh (VD: *Tai nghe chống ồn*, *Bàn phím cơ*, *Deal Flash Sale*, *Chính sách bảo hành*...).
  - Trợ lý AI sẽ giải đáp và tự động hiển thị thẻ sản phẩm đề xuất kèm hình ảnh và giá bán để bạn có thể xem nhanh và mua hàng ngay trong cuộc trò chuyện.
- **Chuyển sang nhân viên CSKH**:
  - Nhấn nút **Gặp CSKH** trên thanh tiêu đề của hộp chat.
  - Hệ thống sẽ chuyển phiên chat sang hàng chờ nhân viên. Khi nhân viên quản trị phản hồi, tin nhắn sẽ hiển thị trong luồng trò chuyện theo thời gian thực.

---

## 3. HƯỚNG DẪN DÀNH CHO QUẢN TRỊ VIÊN (ADMIN)

Địa chỉ truy cập: `http://localhost:8000/admin`

### 3.1. Đăng nhập hệ thống quản trị
- Truy cập `http://localhost:8000/admin/login`.
- **Tài khoản mặc định**:
  - Tên tài khoản: `admin`
  - Mật khẩu: `admin123`
- Nhấn **Xác Thực & Đăng Nhập** để vào Bảng điều khiển chính.

### 3.2. Quản lý Đơn hàng
- Xem các thẻ thống kê tổng quan: Doanh thu thực thu, Tổng số đơn hàng, Số lượng sản phẩm và Tài khoản đăng ký.
- Xem bảng danh sách toàn bộ đơn hàng của khách hàng.
- Lọc đơn hàng theo trạng thái: Chờ xử lý, Đang giao, Đã hoàn tất, Đã hủy.
- Nhấn nút **Chi tiết** để xem đầy đủ thông tin người nhận, địa chỉ giao hàng và danh sách mặt hàng đã đặt.
- Cập nhật trực tiếp trạng thái đơn hàng thông qua menu chọn trạng thái ngay tại từng dòng.

### 3.3. Quản lý Kho hàng & Sản phẩm
- Chọn mục **Quản Lý Sản Phẩm** trên thanh điều hướng bên trái.
- **Thêm sản phẩm mới**:
  1. Nhấn nút **Thêm Sản Phẩm Mới**.
  2. Điền tên sản phẩm, danh mục, giá bán, giá gốc, số lượng tồn kho, điểm đánh giá, URL hình ảnh và mô tả.
  3. Nhấn **Lưu Sản Phẩm**.
- **Chỉnh sửa sản phẩm**: Nhấn nút **Sửa** tại dòng sản phẩm cần cập nhật thông tin, thay đổi dữ liệu trong modal và nhấn **Cập Nhật Sản Phẩm**.
- **Xóa sản phẩm**: Nhấn nút **Xóa** và xác nhận để loại bỏ sản phẩm khỏi hệ thống.

### 3.4. Quản lý Người dùng
- Chọn mục **Người Dùng & Phân Quyền**.
- Xem danh sách thành viên: Mã người dùng, Họ tên, Email, Vai trò (`ADMIN` hoặc `USER`), Số điện thoại, Địa chỉ và Ngày đăng ký.

### 3.5. Bảng điều khiển Live Chat & CSKH trực tiếp
- Chọn mục **Live Chat & CSKH** trên thanh điều hướng bên trái (có huy hiệu số đỏ báo tin nhắn cần hỗ trợ).
- **Cột danh sách phiên trò chuyện (bên trái)**:
  - Xem danh sách tất cả các phiên chat của khách hàng.
  - Bộ lọc phiên chat:
    - *Cần nhân viên hỗ trợ*: Khách hàng đã nhấn nút yêu cầu gặp CSKH.
    - *Đang trao đổi với CSKH*: Cuộc trò chuyện đang được nhân viên tiếp nhận.
    - *Trợ lý AI đang tư vấn*: Phiên chat đang trao đổi tự động với Gemini AI.
    - *Phiên đã đóng*: Các cuộc hội thoại đã kết thúc.
- **Cột hội thoại chi tiết (bên phải)**:
  - Chọn một phiên chat để xem toàn bộ lịch sử trao đổi giữa khách hàng và AI.
  - **Trả lời khách hàng**: Nhập nội dung vào ô phản hồi phía dưới và nhấn **Gửi phản hồi**. Tin nhắn của bạn sẽ được gửi tới khách hàng ngay lập tức.
  - **Chuyển lại AI**: Nhấn nút **Chuyển AI** nếu muốn AI tiếp tục tự động tư vấn cho khách hàng.
  - **Đóng phiên**: Nhấn nút **Đóng phiên** khi cuộc hỗ trợ đã hoàn tất.

### 3.6. Trạng thái Hệ thống Microservices
- Chọn mục **Trạng Thái Hệ Thống**.
- Theo dõi hiện trạng kết nối của toàn bộ 6 microservices:
  - API Gateway (`:8000`)
  - Identity Service (`:8001`)
  - Product Service (`:8002`)
  - Order Service (`:8003`)
  - Notification Service (`:8004`)
  - Chat Service (`:8005`)
- Trạng thái sức khỏe kết nối trực tiếp cơ sở dữ liệu MySQL và trạng thái online của từng dịch vụ.

### 3.7. Đăng xuất Admin
- Nhấn nút **Đăng Xuất Admin** ở chân thanh điều hướng bên trái để đăng xuất an toàn khỏi hệ thống quản trị.
