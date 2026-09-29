-- ====================================================================
-- CƠ SỞ DỮ LIỆU HỆ THỐNG MUA SẮM TRỰC TUYẾN MICROSERVICES
-- Đề tài: Phát triển ứng dụng Web Thương Mại Điện Tử
-- Kiến trúc: Microservices, API Gateway, RabbitMQ, Docker & MySQL
-- ====================================================================

CREATE DATABASE IF NOT EXISTS `ecommerce_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `ecommerce_db`;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `chat_messages`;
DROP TABLE IF EXISTS `chat_sessions`;
DROP TABLE IF EXISTS `notifications`;
DROP TABLE IF EXISTS `product_reviews`;
DROP TABLE IF EXISTS `orders`;
DROP TABLE IF EXISTS `vouchers`;
DROP TABLE IF EXISTS `product_variants`;
DROP TABLE IF EXISTS `products`;
DROP TABLE IF EXISTS `categories`;
DROP TABLE IF EXISTS `users`;
SET FOREIGN_KEY_CHECKS = 1;

-- --------------------------------------------------------------------
-- 1. BẢNG USERS (Identity Service)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(64) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) UNIQUE NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `role` VARCHAR(50) DEFAULT 'customer',
  `phone` VARCHAR(50) DEFAULT '',
  `address` TEXT,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dữ liệu tài khoản mẫu được quản lý toàn diện trong SQL (Mật khẩu tài khoản admin: admin hoặc 123456; Khách hàng: 123456)
INSERT INTO `users` (`id`, `name`, `email`, `password`, `role`, `phone`, `address`) VALUES
('usr_admin_root', 'Quản Trị Viên Hệ Thống', 'admin', '$2b$10$WqI1RdgQu9OXqA7ZRvaQ.e/JMjAEzXTYvsjgvE5.Sd1M5M5wv80ja', 'admin', '0988888888', 'Hà Nội, Việt Nam'),
('usr_admin_01', 'Admin Quản Lý Shop', 'admin@shop.com', '$2b$10$MpXB0RB9DiiD/4B8OBDzWOGeZ7R.kbIF3cswuM4Cj079SDELjdPV2', 'admin', '0988888888', 'Hà Nội, Việt Nam'),
('usr_customer_01', 'Khách Hàng Mẫu', 'customer@shop.com', '$2b$10$MpXB0RB9DiiD/4B8OBDzWOGeZ7R.kbIF3cswuM4Cj079SDELjdPV2', 'customer', '0912345678', '123 Nguyễn Trãi, Quận 1, TP. Hồ Chí Minh'),
('usr_customer_02', 'Nguyễn Hoàng Nam', 'hoangnam@gmail.com', '$2b$10$MpXB0RB9DiiD/4B8OBDzWOGeZ7R.kbIF3cswuM4Cj079SDELjdPV2', 'customer', '0905123456', '45 Lê Duẩn, Quận Hải Châu, Đà Nẵng'),
('usr_customer_03', 'Trần Thị Mai', 'maitran@gmail.com', '$2b$10$MpXB0RB9DiiD/4B8OBDzWOGeZ7R.kbIF3cswuM4Cj079SDELjdPV2', 'customer', '0934567890', '78 Cầu Giấy, Hà Nội'),
('usr_customer_04', 'Lê Quốc Hưng', 'quochung@gmail.com', '$2b$10$MpXB0RB9DiiD/4B8OBDzWOGeZ7R.kbIF3cswuM4Cj079SDELjdPV2', 'customer', '0987654321', '12 Hoàng Diệu, TP. Nha Trang');

-- --------------------------------------------------------------------
-- 2. BẢNG CATEGORIES (Product Service)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `categories` (
  `id` VARCHAR(64) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `icon` VARCHAR(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `categories` (`id`, `name`, `icon`) VALUES
('cat_all', 'Tất cả sản phẩm', 'ri-apps-line'),
('cat_electronics', 'Điện tử & Công nghệ', 'ri-macbook-line'),
('cat_fashion', 'Thời trang & Phụ kiện', 'ri-t-shirt-line'),
('cat_home', 'Gia dụng thông minh', 'ri-home-wifi-line'),
('cat_books', 'Sách & Văn phòng phẩm', 'ri-book-open-line');

-- --------------------------------------------------------------------
-- 3. BẢNG PRODUCTS (Product Service)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `products` (
  `id` VARCHAR(64) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `categoryId` VARCHAR(64) NOT NULL,
  `categoryName` VARCHAR(255) NOT NULL,
  `price` BIGINT NOT NULL,
  `originalPrice` BIGINT,
  `stock` INT DEFAULT 0,
  `rating` FLOAT DEFAULT 5.0,
  `soldCount` INT DEFAULT 0,
  `imageUrl` TEXT,
  `description` TEXT,
  `featured` BOOLEAN DEFAULT 0,
  `isFlashSale` BOOLEAN DEFAULT 0,
  `flashSaleDiscount` INT DEFAULT 0,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `products` (`id`, `name`, `categoryId`, `categoryName`, `price`, `originalPrice`, `stock`, `rating`, `soldCount`, `imageUrl`, `description`, `featured`, `isFlashSale`, `flashSaleDiscount`, `createdAt`) VALUES
('prod_01', 'Tai nghe Bluetooth Sony WH-1000XM5 Chống Ồn', 'cat_electronics', 'Điện tử & Công nghệ', 7490000, 8490000, 30, 4.9, 312, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80', 'Tai nghe chụp tai chống ồn hàng đầu thế giới với công nghệ Dual Noise Sensor, thời lượng pin 30 giờ và âm thanh chuẩn Hi-Res Audio. Tích hợp 8 micro thu âm đàm thoại lọc ồn AI tuyệt đối.', 1, 1, 35, NOW()),
('prod_02', 'Bàn phím cơ không dây Keychron Q1 Pro QMK/VIA', 'cat_electronics', 'Điện tử & Công nghệ', 4350000, 4890000, 24, 4.8, 154, 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&q=80', 'Bàn phím cơ khung nhôm CNC cao cấp, kết nối Bluetooth 5.1 và Type-C, switch hot-swappable tuỳ biến linh hoạt, mạch xuôi hỗ trợ tùy biến QMK/VIA toàn diện.', 1, 1, 25, NOW()),
('prod_03', 'Đồng hồ thông minh Apple Watch Series 9 GPS 45mm', 'cat_electronics', 'Điện tử & Công nghệ', 10490000, 11290000, 17, 4.9, 220, 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80', 'Màn hình Retina luôn bật sáng 2000 nits, chip S9 SiP mạnh mẽ, cử chỉ chạm hai lần thông minh và đo oxy trong máu SpO2, theo dõi sức khỏe và giấc ngủ chuyên sâu.', 1, 0, 0, NOW()),
('prod_04', 'Áo khoác Bomber phong cách Minimalist Urban', 'cat_fashion', 'Thời trang & Phụ kiện', 890000, 1200000, 53, 4.7, 520, 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&q=80', 'Chất liệu vải dù 2 lớp chống gió và nước nhẹ, form dáng hiện đại trẻ trung, may đo chuẩn xác tạo cảm giác thoải mái tối đa khi vận động dạo phố.', 1, 1, 40, NOW()),
('prod_05', 'Balo chống gù & chống nước Mark Ryden Stealth', 'cat_fashion', 'Thời trang & Phụ kiện', 1150000, 1450000, 30, 4.8, 189, 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80', 'Balo laptop cao cấp có ngăn chứa laptop 15.6 inch chống sốc, cổng sạc USB tích hợp bên hông và khóa chống trộm an toàn đạt tiêu chuẩn hành lý máy bay.', 0, 0, 0, NOW()),
('prod_06', 'Robot hút bụi lau nhà thông minh Dreame L10s Ultra', 'cat_home', 'Gia dụng thông minh', 15990000, 18990000, 8, 5, 88, 'https://images.unsplash.com/photo-1589003077984-894e133dabab?w=800&q=80', 'Trạm sạc đa năng tự giặt sấy khăn lau bằng khí nóng, tự động hút bụi vào túi chứa 3L, lực hút 5300Pa mạnh mẽ và định vị camera 3D AI tránh chướng ngại vật.', 1, 0, 0, NOW()),
('prod_07', 'Nồi chiên không dầu Philips điện tử XXL HD9650', 'cat_home', 'Gia dụng thông minh', 5490000, 6990000, 23, 4.9, 340, 'https://images.unsplash.com/photo-1585515320310-259814833e62?w=800&q=80', 'Công nghệ Twin TurboStar loại bỏ đến 90% dầu mỡ thừa trong thực phẩm, dung tích lớn 1.4kg chiên gà nguyên con dễ dàng với màn hình cảm ứng điện tử hiện đại.', 0, 1, 30, NOW()),
('prod_08', 'Bộ sách Thiết kế Hệ thống Lớn (System Design Interview)', 'cat_books', 'Sách & Văn phòng phẩm', 420000, 550000, 45, 5, 650, 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&q=80', 'Cẩm nang toàn diện về kiến trúc hệ thống phân tán, microservices, scalability, caching, load balancing và các bài toán thực tế chuẩn kỹ sư cấp cao.', 1, 0, 0, NOW());

-- --------------------------------------------------------------------
-- 4. BẢNG PRODUCT_VARIANTS (Product Service)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `product_variants` (
  `id` VARCHAR(64) PRIMARY KEY,
  `productId` VARCHAR(64) NOT NULL,
  `color` VARCHAR(100) NOT NULL,
  `type` VARCHAR(100) NOT NULL,
  `price` BIGINT NOT NULL,
  `originalPrice` BIGINT,
  `stock` INT NOT NULL DEFAULT 0,
  `imageUrl` TEXT,
  FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `product_variants` (`id`, `productId`, `color`, `type`, `price`, `originalPrice`, `stock`, `imageUrl`) VALUES
('var_01_1', 'prod_01', 'Đen Huyền Bí', 'Bản Tiêu Chuẩn', 7490000, 8490000, 15, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80'),
('var_01_2', 'prod_01', 'Bạc Ánh Kim', 'Bản Tiêu Chuẩn', 7690000, 8690000, 10, 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&q=80'),
('var_01_3', 'prod_01', 'Xanh Midnight', 'Bản Cao Cấp Hi-Res', 7990000, 8990000, 5, 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800&q=80'),
('var_02_1', 'prod_02', 'Xám Carbon', 'Red Switch (Êm Ái)', 4350000, 4890000, 12, 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&q=80'),
('var_02_2', 'prod_02', 'Xám Carbon', 'Brown Switch (Tactile)', 4390000, 4890000, 8, 'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=800&q=80'),
('var_02_3', 'prod_02', 'Trắng Retro', 'Blue Switch (Clicky)', 4450000, 4990000, 4, 'https://images.unsplash.com/photo-1595225476474-87563907a212?w=800&q=80'),
('var_03_1', 'prod_03', 'Midnight Nhôm', 'Dây Thể Thao M/L', 10490000, 11290000, 8, 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80'),
('var_03_2', 'prod_03', 'Starlight Nhôm', 'Dây Vải Dệt Sport Loop', 10790000, 11590000, 6, 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800&q=80'),
('var_03_3', 'prod_03', 'Thép Bạc Cao Cấp', 'Dây Thép Milanese', 18990000, 19990000, 3, 'https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?w=800&q=80'),
('var_04_1', 'prod_04', 'Đen Huyền Bí', 'Size M (50-65kg)', 890000, 1200000, 20, 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&q=80'),
('var_04_2', 'prod_04', 'Đen Huyền Bí', 'Size L (65-75kg)', 890000, 1200000, 15, 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&q=80'),
('var_04_3', 'prod_04', 'Rêu Quân Đội', 'Size L (65-75kg)', 920000, 1250000, 10, 'https://images.unsplash.com/photo-1548883354-7622d03aca27?w=800&q=80'),
('var_04_4', 'prod_04', 'Xám Khói', 'Size XL (75-85kg)', 950000, 1300000, 8, 'https://images.unsplash.com/photo-1544441893-675973e31985?w=800&q=80'),
('var_05_1', 'prod_05', 'Đen Nhám', 'Bản 1 Ngăn 15.6 inch', 1150000, 1450000, 20, 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80'),
('var_05_2', 'prod_05', 'Xám Carbon', 'Bản Mở Rộng 17 inch', 1290000, 1590000, 10, 'https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?w=800&q=80'),
('var_06_1', 'prod_06', 'Trắng Tinh Khôi', 'Bản Tiêu Chuẩn Dock Sạc Tự Động', 15990000, 18990000, 5, 'https://images.unsplash.com/photo-1589003077984-894e133dabab?w=800&q=80'),
('var_06_2', 'prod_06', 'Đen Sang Trọng', 'Bản Combo Kèm 10 Túi & Khăn Lau', 16990000, 19990000, 3, 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80'),
('var_07_1', 'prod_07', 'Đen Bóng', 'Dung tích 7.3 Lít', 5490000, 6990000, 15, 'https://images.unsplash.com/photo-1585515320310-259814833e62?w=800&q=80'),
('var_07_2', 'prod_07', 'Inox Xước', 'Dung tích 7.3L Kèm Khay Nướng Pizza', 5890000, 7490000, 8, 'https://images.unsplash.com/photo-1528740561666-dc2479dc08ab?w=800&q=80'),
('var_08_1', 'prod_08', 'Bìa Mềm Chuẩn', 'Trọn Bộ Tập 1 & 2', 420000, 550000, 30, 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&q=80'),
('var_08_2', 'prod_08', 'Bìa Cứng Giới Hạn', 'Trọn Bộ Sách + Ebook Bản Quyền', 590000, 750000, 15, 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&q=80');

-- --------------------------------------------------------------------
-- 5. BẢNG VOUCHERS (Order Service)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `vouchers` (
  `code` VARCHAR(50) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `discountType` ENUM('fixed', 'percent') NOT NULL DEFAULT 'fixed',
  `discountValue` INT NOT NULL,
  `minOrderValue` BIGINT NOT NULL DEFAULT 0,
  `maxDiscount` BIGINT DEFAULT NULL,
  `description` TEXT,
  `usageLimit` INT DEFAULT 1000,
  `usedCount` INT DEFAULT 0,
  `isActive` BOOLEAN DEFAULT 1,
  `expiresAt` DATETIME DEFAULT NULL,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `vouchers` (`code`, `name`, `discountType`, `discountValue`, `minOrderValue`, `maxDiscount`, `description`, `usageLimit`, `usedCount`, `isActive`, `expiresAt`) VALUES
('NOVASHOP50', 'Ưu đãi Khách hàng Thân thiết', 'fixed', 50000, 200000, 50000, 'Giảm ngay 50.000đ cho đơn hàng từ 200.000đ', 500, 12, 1, '2026-12-31 23:59:59'),
('SALE10', 'Siêu Sale Siêu Tiết Kiệm', 'percent', 10, 300000, 100000, 'Giảm 10% (tối đa 100.000đ) cho đơn từ 300.000đ', 1000, 45, 1, '2026-12-31 23:59:59'),
('FREESHIP', 'Miễn Phí Vận Chuyển', 'fixed', 30000, 150000, 30000, 'Giảm 30.000đ phí giao hàng cho đơn từ 150.000đ', 2000, 89, 1, '2026-12-31 23:59:59'),
('VIP100', 'Đặc Quyền Thành Viên VIP', 'fixed', 100000, 500000, 100000, 'Giảm 100.000đ cho đơn hàng giá trị từ 500.000đ', 200, 8, 1, '2026-12-31 23:59:59'),
('WELCOME', 'Quà Chào Mừng Khách Hàng Mới', 'fixed', 20000, 100000, 20000, 'Giảm 20.000đ cho đơn hàng từ 100.000đ', 5000, 34, 1, '2026-12-31 23:59:59');

-- --------------------------------------------------------------------
-- 6. BẢNG ORDERS (Order Service)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `orders` (
  `id` VARCHAR(64) PRIMARY KEY,
  `userId` VARCHAR(64) DEFAULT 'guest',
  `customerName` VARCHAR(255) NOT NULL,
  `customerPhone` VARCHAR(50) NOT NULL,
  `shippingAddress` TEXT NOT NULL,
  `paymentMethod` VARCHAR(50) DEFAULT 'cod',
  `items` JSON NOT NULL,
  `totalAmount` BIGINT NOT NULL,
  `status` VARCHAR(50) DEFAULT 'pending',
  `voucherCode` VARCHAR(50) DEFAULT NULL,
  `discountAmount` BIGINT DEFAULT 0,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`voucherCode`) REFERENCES `vouchers`(`code`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `orders` (`id`, `userId`, `customerName`, `customerPhone`, `shippingAddress`, `paymentMethod`, `items`, `totalAmount`, `status`, `voucherCode`, `discountAmount`, `createdAt`) VALUES
('ord_1001', 'usr_customer_01', 'Khách Hàng Mẫu', '0912345678', '123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh', 'cod', '[{"productId":"prod_01","variantId":"var_01_1","name":"Tai nghe Bluetooth Sony WH-1000XM5 Chống Ồn","variantName":"Đen Huyền Bí - Bản Tiêu Chuẩn","price":7490000,"quantity":1,"imageUrl":"https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80"}]', 7390000, 'completed', 'VIP100', 100000, '2026-09-20 14:30:00'),
('ord_1002', 'usr_customer_01', 'Khách Hàng Mẫu', '0912345678', '123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh', 'banking', '[{"productId":"prod_02","variantId":"var_02_1","name":"Bàn phím cơ không dây Keychron Q1 Pro QMK/VIA","variantName":"Xám Carbon - Red Switch (Êm Ái)","price":4350000,"quantity":1,"imageUrl":"https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&q=80"}]', 4300000, 'processing', 'NOVASHOP50', 50000, '2026-09-25 09:15:00'),
('ord_1003', 'guest', 'Trần Văn Hùng', '0938112233', '45 Hoàng Hoa Thám, Quận Ba Đình, Hà Nội', 'cod', '[{"productId":"prod_04","variantId":"var_04_1","name":"Áo khoác Bomber phong cách Minimalist Urban","variantName":"Đen Huyền Bí - Size M (50-65kg)","price":890000,"quantity":2,"imageUrl":"https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&q=80"}]', 1680000, 'pending', 'SALE10', 100000, '2026-09-28 16:40:00');

-- --------------------------------------------------------------------
-- 7. BẢNG PRODUCT_REVIEWS (Product Service)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `product_reviews` (
  `id` VARCHAR(64) PRIMARY KEY,
  `productId` VARCHAR(64) NOT NULL,
  `userId` VARCHAR(64) DEFAULT NULL,
  `userName` VARCHAR(255) NOT NULL,
  `userAvatar` TEXT,
  `rating` INT NOT NULL DEFAULT 5,
  `comment` TEXT NOT NULL,
  `isBuyer` BOOLEAN DEFAULT 1,
  `helpfulCount` INT DEFAULT 0,
  `replyComment` TEXT,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `product_reviews` (`id`, `productId`, `userId`, `userName`, `rating`, `comment`, `isBuyer`, `helpfulCount`, `replyComment`, `createdAt`) VALUES
('rev_01_1', 'prod_01', 'usr_customer_01', 'Nguyễn Hoàng Nam', 5, 'Chống ồn ANC đỉnh cao thực sự, đeo liên tục 4 tiếng làm việc rất êm không bị đau tai hay cấn gọng kính. Pin dùng cả tuần chưa hết. Hàng chính hãng đóng gói kỹ lưỡng 10/10!', 1, 18, 'NovaShop cảm ơn bạn Hoàng Nam đã tin tưởng mua sắm và đánh giá sản phẩm. Chúc bạn có những phút giây trải nghiệm âm nhạc tuyệt vời!', '2026-09-21 10:20:00'),
('rev_01_2', 'prod_01', NULL, 'Trần Thị Mai', 5, 'Âm bass chắc khỏe, âm trường rộng, nghe nhạc pop với acoustic rất nịnh tai. Giao hàng hỏa tốc trong 24h, nhân viên hỗ trợ nhiệt tình.', 1, 9, NULL, '2026-09-22 15:45:00'),
('rev_01_3', 'prod_01', NULL, 'Lê Minh Trí', 4, 'Tai nghe chất lượng hoàn thiện rất tốt, mic đàm thoại lọc gió tốt khi đi ngoài đường. Hộp đựng hơi to một chút khi bỏ balo nhưng tổng thể rất đáng tiền.', 1, 4, NULL, '2026-09-23 08:30:00'),
('rev_02_1', 'prod_02', NULL, 'Vũ Đức Anh', 5, 'Vỏ nhôm CNC nguyên khối cực kỳ đầm tay, gõ rất chắc và không bị vang. Switch Banana gõ sướng tay, kết nối Bluetooth chuyển đổi nhanh giữa Mac và Windows.', 1, 14, 'Cảm ơn bạn Đức Anh đã chia sẻ trải nghiệm chuyên nghiệp cùng Keychron Q1 Pro!', '2026-09-24 11:10:00'),
('rev_02_2', 'prod_02', NULL, 'Phạm Thu Trang', 5, 'Bàn phím xịn, gõ êm, đèn led RGB dịu mắt. Thiết kế retro sang trọng đặt trên bàn làm việc rất tôn góc setup.', 1, 7, NULL, '2026-09-25 14:05:00'),
('rev_03_1', 'prod_03', NULL, 'Lê Quốc Hưng', 5, 'Màn hình siêu sáng 2000 nits đi ngoài trời nắng gắt nhìn rõ mồn một. Tính năng chạm 2 ngón (Double Tap) cực kỳ tiện khi đang bận nấu ăn hoặc lái xe.', 1, 12, NULL, '2026-09-25 18:20:00'),
('rev_04_1', 'prod_04', NULL, 'Hoàng Văn Tuấn', 5, 'Áo khoác bomber form chuẩn, vải dù chống gió dày dặn và đường may tỉ mỉ. Lớp lót trần bông ấm áp, mặc rất tôn dáng.', 1, 8, NULL, '2026-09-26 09:40:00'),
('rev_05_1', 'prod_05', NULL, 'Đỗ Hải Đăng', 5, 'Balo chống nước tuyệt đối, ngăn laptop 15.6 inch êm ái chống sốc tốt. Đệm lưng thoáng khí đeo cả ngày không bị mỏi vai.', 1, 11, NULL, '2026-09-26 16:30:00'),
('rev_06_1', 'prod_06', NULL, 'Nguyễn Thị Bích', 5, 'Robot quét hút siêu sạch, tự giặt và sấy khô giẻ không hề bị mùi ẩm mốc. Ứng dụng điều khiển tiếng Việt rất dễ dùng cho bố mẹ.', 1, 16, NULL, '2026-09-27 10:15:00'),
('rev_07_1', 'prod_07', NULL, 'Bùi Thanh Hương', 5, 'Nồi chiên dung tích lớn nướng nguyên con gà 2kg vàng ruộm, giòn rụm bên ngoài mà bên trong vẫn mọng nước. Cực kỳ tiện cho gia đình.', 1, 10, NULL, '2026-09-27 19:00:00'),
('rev_08_1', 'prod_08', NULL, 'Phan Nhật Minh', 5, 'Sách in đẹp, giấy xốp nhẹ chống lóa mắt. Nội dung truyền cảm hứng mạnh mẽ, rất xứng đáng mua và đọc lại nhiều lần.', 1, 15, NULL, '2026-09-28 12:45:00');

-- --------------------------------------------------------------------
-- 8. BẢNG NOTIFICATIONS (Notification Service)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` VARCHAR(64) PRIMARY KEY,
  `type` VARCHAR(100) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `recipient` VARCHAR(100) DEFAULT 'admin',
  `metadata` JSON,
  `isRead` BOOLEAN DEFAULT 0,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 9. BẢNG CHAT_SESSIONS (Chat Service / Live Chat & Gemini AI)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `chat_sessions` (
  `id` VARCHAR(64) PRIMARY KEY,
  `userId` VARCHAR(64) DEFAULT NULL,
  `customerName` VARCHAR(255) NOT NULL DEFAULT 'Khách hàng',
  `customerEmail` VARCHAR(255) DEFAULT '',
  `status` ENUM('ai', 'human_waiting', 'human_active', 'closed') DEFAULT 'ai',
  `lastMessage` TEXT,
  `unreadByAdmin` INT DEFAULT 0,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 10. BẢNG CHAT_MESSAGES (Chat Service / Live Chat & Gemini AI)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `chat_messages` (
  `id` VARCHAR(64) PRIMARY KEY,
  `sessionId` VARCHAR(64) NOT NULL,
  `sender` ENUM('customer', 'ai', 'staff') NOT NULL,
  `senderName` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `suggestedProducts` JSON DEFAULT NULL,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`sessionId`) REFERENCES `chat_sessions`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- HOÀN TẤT KHỞI TẠO CƠ SỞ DỮ LIỆU
-- ====================================================================
