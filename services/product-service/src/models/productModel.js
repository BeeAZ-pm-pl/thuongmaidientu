const mysql = require('mysql2/promise');
const config = require('../config');

let pool = null;

const initialCategories = [
  { id: 'cat_all', name: 'Tất cả sản phẩm', icon: 'ri-apps-line' },
  { id: 'cat_electronics', name: 'Điện tử & Công nghệ', icon: 'ri-macbook-line' },
  { id: 'cat_fashion', name: 'Thời trang & Phụ kiện', icon: 'ri-t-shirt-line' },
  { id: 'cat_home', name: 'Gia dụng thông minh', icon: 'ri-home-wifi-line' },
  { id: 'cat_books', name: 'Sách & Văn phòng phẩm', icon: 'ri-book-open-line' }
];

const initialProducts = [
  {
    id: 'prod_01',
    name: 'Tai nghe Bluetooth Sony WH-1000XM5 Chống Ồn',
    categoryId: 'cat_electronics',
    categoryName: 'Điện tử & Công nghệ',
    price: 7490000,
    originalPrice: 8490000,
    stock: 30,
    rating: 4.9,
    soldCount: 312,
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80',
    description: 'Tai nghe chụp tai chống ồn hàng đầu thế giới với công nghệ Dual Noise Sensor, thời lượng pin 30 giờ và âm thanh chuẩn Hi-Res Audio. Tích hợp 8 micro thu âm đàm thoại lọc ồn AI tuyệt đối.',
    featured: 1,
    isFlashSale: 1,
    flashSaleDiscount: 35
  },
  {
    id: 'prod_02',
    name: 'Bàn phím cơ không dây Keychron Q1 Pro QMK/VIA',
    categoryId: 'cat_electronics',
    categoryName: 'Điện tử & Công nghệ',
    price: 4350000,
    originalPrice: 4890000,
    stock: 24,
    rating: 4.8,
    soldCount: 154,
    imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&q=80',
    description: 'Bàn phím cơ khung nhôm CNC cao cấp, kết nối Bluetooth 5.1 và Type-C, switch hot-swappable tuỳ biến linh hoạt, mạch xuôi hỗ trợ tùy biến QMK/VIA toàn diện.',
    featured: 1,
    isFlashSale: 1,
    flashSaleDiscount: 25
  },
  {
    id: 'prod_03',
    name: 'Đồng hồ thông minh Apple Watch Series 9 GPS 45mm',
    categoryId: 'cat_electronics',
    categoryName: 'Điện tử & Công nghệ',
    price: 10490000,
    originalPrice: 11290000,
    stock: 17,
    rating: 4.9,
    soldCount: 220,
    imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80',
    description: 'Màn hình Retina luôn bật sáng 2000 nits, chip S9 SiP mạnh mẽ, cử chỉ chạm hai lần thông minh và đo oxy trong máu SpO2, theo dõi sức khỏe và giấc ngủ chuyên sâu.',
    featured: 1,
    isFlashSale: 0,
    flashSaleDiscount: 0
  },
  {
    id: 'prod_04',
    name: 'Áo khoác Bomber phong cách Minimalist Urban',
    categoryId: 'cat_fashion',
    categoryName: 'Thời trang & Phụ kiện',
    price: 890000,
    originalPrice: 1200000,
    stock: 53,
    rating: 4.7,
    soldCount: 520,
    imageUrl: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&q=80',
    description: 'Chất liệu vải dù 2 lớp chống gió và nước nhẹ, form dáng hiện đại trẻ trung, may đo chuẩn xác tạo cảm giác thoải mái tối đa khi vận động dạo phố.',
    featured: 1,
    isFlashSale: 1,
    flashSaleDiscount: 40
  },
  {
    id: 'prod_05',
    name: 'Balo chống gù & chống nước Mark Ryden Stealth',
    categoryId: 'cat_fashion',
    categoryName: 'Thời trang & Phụ kiện',
    price: 1150000,
    originalPrice: 1450000,
    stock: 30,
    rating: 4.8,
    soldCount: 189,
    imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80',
    description: 'Balo laptop cao cấp có ngăn chứa laptop 15.6 inch chống sốc, cổng sạc USB tích hợp bên hông và khóa chống trộm an toàn đạt tiêu chuẩn hành lý máy bay.',
    featured: 0,
    isFlashSale: 0,
    flashSaleDiscount: 0
  },
  {
    id: 'prod_06',
    name: 'Robot hút bụi lau nhà thông minh Dreame L10s Ultra',
    categoryId: 'cat_home',
    categoryName: 'Gia dụng thông minh',
    price: 15990000,
    originalPrice: 18990000,
    stock: 8,
    rating: 5.0,
    soldCount: 88,
    imageUrl: 'https://images.unsplash.com/photo-1589003077984-894e133dabab?w=800&q=80',
    description: 'Trạm sạc đa năng tự giặt sấy khăn lau bằng khí nóng, tự động hút bụi vào túi chứa 3L, lực hút 5300Pa mạnh mẽ và định vị camera 3D AI tránh chướng ngại vật.',
    featured: 1,
    isFlashSale: 0,
    flashSaleDiscount: 0
  },
  {
    id: 'prod_07',
    name: 'Nồi chiên không dầu Philips điện tử XXL HD9650',
    categoryId: 'cat_home',
    categoryName: 'Gia dụng thông minh',
    price: 5490000,
    originalPrice: 6990000,
    stock: 23,
    rating: 4.9,
    soldCount: 340,
    imageUrl: 'https://images.unsplash.com/photo-1585515320310-259814833e62?w=800&q=80',
    description: 'Công nghệ Twin TurboStar loại bỏ đến 90% dầu mỡ thừa trong thực phẩm, dung tích lớn 1.4kg chiên gà nguyên con dễ dàng với màn hình cảm ứng điện tử hiện đại.',
    featured: 0,
    isFlashSale: 1,
    flashSaleDiscount: 30
  },
  {
    id: 'prod_08',
    name: 'Bộ sách Thiết kế Hệ thống Lớn (System Design Interview)',
    categoryId: 'cat_books',
    categoryName: 'Sách & Văn phòng phẩm',
    price: 420000,
    originalPrice: 550000,
    stock: 45,
    rating: 5.0,
    soldCount: 650,
    imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&q=80',
    description: 'Cẩm nang toàn diện về kiến trúc hệ thống phân tán, microservices, scalability, caching, load balancing và các bài toán thực tế chuẩn kỹ sư cấp cao.',
    featured: 1,
    isFlashSale: 0,
    flashSaleDiscount: 0
  }
];

const initialVariants = [
  {
    id: 'var_01_1',
    productId: 'prod_01',
    color: 'Đen Huyền Bí',
    type: 'Bản Tiêu Chuẩn',
    price: 7490000,
    originalPrice: 8490000,
    stock: 15,
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80'
  },
  {
    id: 'var_01_2',
    productId: 'prod_01',
    color: 'Bạc Ánh Kim',
    type: 'Bản Tiêu Chuẩn',
    price: 7690000,
    originalPrice: 8690000,
    stock: 10,
    imageUrl: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&q=80'
  },
  {
    id: 'var_01_3',
    productId: 'prod_01',
    color: 'Xanh Midnight',
    type: 'Bản Cao Cấp Hi-Res',
    price: 7990000,
    originalPrice: 8990000,
    stock: 5,
    imageUrl: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800&q=80'
  },
  {
    id: 'var_02_1',
    productId: 'prod_02',
    color: 'Xám Carbon',
    type: 'Red Switch (Êm Ái)',
    price: 4350000,
    originalPrice: 4890000,
    stock: 12,
    imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&q=80'
  },
  {
    id: 'var_02_2',
    productId: 'prod_02',
    color: 'Xám Carbon',
    type: 'Brown Switch (Tactile)',
    price: 4390000,
    originalPrice: 4890000,
    stock: 8,
    imageUrl: 'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=800&q=80'
  },
  {
    id: 'var_02_3',
    productId: 'prod_02',
    color: 'Trắng Retro',
    type: 'Blue Switch (Clicky)',
    price: 4450000,
    originalPrice: 4990000,
    stock: 4,
    imageUrl: 'https://images.unsplash.com/photo-1595225476474-87563907a212?w=800&q=80'
  },
  {
    id: 'var_03_1',
    productId: 'prod_03',
    color: 'Midnight Nhôm',
    type: 'Dây Thể Thao M/L',
    price: 10490000,
    originalPrice: 11290000,
    stock: 8,
    imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80'
  },
  {
    id: 'var_03_2',
    productId: 'prod_03',
    color: 'Starlight Nhôm',
    type: 'Dây Vải Dệt Sport Loop',
    price: 10790000,
    originalPrice: 11590000,
    stock: 6,
    imageUrl: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800&q=80'
  },
  {
    id: 'var_03_3',
    productId: 'prod_03',
    color: 'Thép Bạc Cao Cấp',
    type: 'Dây Thép Milanese',
    price: 18990000,
    originalPrice: 19990000,
    stock: 3,
    imageUrl: 'https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?w=800&q=80'
  },
  {
    id: 'var_04_1',
    productId: 'prod_04',
    color: 'Đen Huyền Bí',
    type: 'Size M (50-65kg)',
    price: 890000,
    originalPrice: 1200000,
    stock: 20,
    imageUrl: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&q=80'
  },
  {
    id: 'var_04_2',
    productId: 'prod_04',
    color: 'Đen Huyền Bí',
    type: 'Size L (65-75kg)',
    price: 890000,
    originalPrice: 1200000,
    stock: 15,
    imageUrl: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&q=80'
  },
  {
    id: 'var_04_3',
    productId: 'prod_04',
    color: 'Rêu Quân Đội',
    type: 'Size L (65-75kg)',
    price: 920000,
    originalPrice: 1250000,
    stock: 10,
    imageUrl: 'https://images.unsplash.com/photo-1548883354-7622d03aca27?w=800&q=80'
  },
  {
    id: 'var_04_4',
    productId: 'prod_04',
    color: 'Xám Khói',
    type: 'Size XL (75-85kg)',
    price: 950000,
    originalPrice: 1300000,
    stock: 8,
    imageUrl: 'https://images.unsplash.com/photo-1544441893-675973e31985?w=800&q=80'
  },
  {
    id: 'var_05_1',
    productId: 'prod_05',
    color: 'Đen Nhám',
    type: 'Bản 1 Ngăn 15.6 inch',
    price: 1150000,
    originalPrice: 1450000,
    stock: 20,
    imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80'
  },
  {
    id: 'var_05_2',
    productId: 'prod_05',
    color: 'Xám Carbon',
    type: 'Bản Mở Rộng 17 inch',
    price: 1290000,
    originalPrice: 1590000,
    stock: 10,
    imageUrl: 'https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?w=800&q=80'
  },
  {
    id: 'var_06_1',
    productId: 'prod_06',
    color: 'Trắng Tinh Khôi',
    type: 'Bản Tiêu Chuẩn Dock Sạc Tự Động',
    price: 15990000,
    originalPrice: 18990000,
    stock: 5,
    imageUrl: 'https://images.unsplash.com/photo-1589003077984-894e133dabab?w=800&q=80'
  },
  {
    id: 'var_06_2',
    productId: 'prod_06',
    color: 'Đen Sang Trọng',
    type: 'Bản Combo Kèm 10 Túi & Khăn Lau',
    price: 16990000,
    originalPrice: 19990000,
    stock: 3,
    imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80'
  },
  {
    id: 'var_07_1',
    productId: 'prod_07',
    color: 'Đen Bóng',
    type: 'Dung tích 7.3 Lít',
    price: 5490000,
    originalPrice: 6990000,
    stock: 15,
    imageUrl: 'https://images.unsplash.com/photo-1585515320310-259814833e62?w=800&q=80'
  },
  {
    id: 'var_07_2',
    productId: 'prod_07',
    color: 'Inox Xước',
    type: 'Dung tích 7.3L Kèm Khay Nướng Pizza',
    price: 5890000,
    originalPrice: 7490000,
    stock: 8,
    imageUrl: 'https://images.unsplash.com/photo-1528740561666-dc2479dc08ab?w=800&q=80'
  },
  {
    id: 'var_08_1',
    productId: 'prod_08',
    color: 'Bìa Mềm Chuẩn',
    type: 'Trọn Bộ Tập 1 & 2',
    price: 420000,
    originalPrice: 550000,
    stock: 30,
    imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&q=80'
  },
  {
    id: 'var_08_2',
    productId: 'prod_08',
    color: 'Bìa Cứng Giới Hạn',
    type: 'Trọn Bộ Sách + Ebook Bản Quyền',
    price: 590000,
    originalPrice: 750000,
    stock: 15,
    imageUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&q=80'
  }
];

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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      icon VARCHAR(100) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      categoryId VARCHAR(64) NOT NULL,
      categoryName VARCHAR(255) NOT NULL,
      price BIGINT NOT NULL,
      originalPrice BIGINT,
      stock INT DEFAULT 0,
      rating FLOAT DEFAULT 5.0,
      soldCount INT DEFAULT 0,
      imageUrl TEXT,
      description TEXT,
      featured BOOLEAN DEFAULT 0,
      isFlashSale BOOLEAN DEFAULT 0,
      flashSaleDiscount INT DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  try {
    const [existingCols] = await pool.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'products'
    `, [config.db.database]);

    const colNames = existingCols.map((c) => c.COLUMN_NAME.toLowerCase());
    if (!colNames.includes('isflashsale')) {
      await pool.query('ALTER TABLE products ADD COLUMN isFlashSale BOOLEAN DEFAULT 0');
    }
    if (!colNames.includes('flashsalediscount')) {
      await pool.query('ALTER TABLE products ADD COLUMN flashSaleDiscount INT DEFAULT 0');
    }
  } catch (err) {}

  await pool.query(`
    CREATE TABLE IF NOT EXISTS product_variants (
      id VARCHAR(64) PRIMARY KEY,
      productId VARCHAR(64) NOT NULL,
      color VARCHAR(100) NOT NULL,
      type VARCHAR(100) NOT NULL,
      price BIGINT NOT NULL,
      originalPrice BIGINT,
      stock INT NOT NULL DEFAULT 0,
      imageUrl TEXT,
      FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  const [catRows] = await pool.query('SELECT COUNT(*) as count FROM categories');
  if (catRows[0].count === 0) {
    for (const cat of initialCategories) {
      await pool.query('INSERT INTO categories (id, name, icon) VALUES (?, ?, ?)', [cat.id, cat.name, cat.icon]);
    }
  }

  const [prodRows] = await pool.query('SELECT COUNT(*) as count FROM products');
  if (prodRows[0].count === 0) {
    for (const p of initialProducts) {
      await pool.query(
        `INSERT INTO products (id, name, categoryId, categoryName, price, originalPrice, stock, rating, soldCount, imageUrl, description, featured, isFlashSale, flashSaleDiscount, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [p.id, p.name, p.categoryId, p.categoryName, p.price, p.originalPrice, p.stock, p.rating, p.soldCount, p.imageUrl, p.description, p.featured, p.isFlashSale, p.flashSaleDiscount]
      );
    }
  } else {
    for (const p of initialProducts) {
      await pool.query(
        'UPDATE products SET isFlashSale = ?, flashSaleDiscount = ? WHERE id = ?',
        [p.isFlashSale, p.flashSaleDiscount, p.id]
      );
    }
  }

  const [varRows] = await pool.query('SELECT COUNT(*) as count FROM product_variants');
  if (varRows[0].count === 0) {
    for (const v of initialVariants) {
      await pool.query(
        `INSERT INTO product_variants (id, productId, color, type, price, originalPrice, stock, imageUrl)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [v.id, v.productId, v.color, v.type, v.price, v.originalPrice, v.stock, v.imageUrl]
      );
    }
  }

  return pool;
};

const getCategories = async () => {
  const db = await initDb();
  const [rows] = await db.query('SELECT * FROM categories');
  return rows;
};

const getVariantsByProductId = async (productId) => {
  const db = await initDb();
  const [rows] = await db.query('SELECT * FROM product_variants WHERE productId = ? ORDER BY price ASC', [productId]);
  return rows;
};

const findAll = async ({ category, search, minPrice, maxPrice, sort, flashSale } = {}) => {
  const db = await initDb();
  let query = 'SELECT * FROM products WHERE 1=1';
  const params = [];

  if (flashSale === '1' || flashSale === true) {
    query += ' AND isFlashSale = 1';
  }

  if (category && category !== 'cat_all') {
    query += ' AND categoryId = ?';
    params.push(category);
  }

  if (search) {
    query += ' AND (LOWER(name) LIKE ? OR LOWER(description) LIKE ? OR LOWER(categoryName) LIKE ?)';
    const term = `%${search.toLowerCase().trim()}%`;
    params.push(term, term, term);
  }

  if (minPrice) {
    query += ' AND price >= ?';
    params.push(Number(minPrice));
  }

  if (maxPrice) {
    query += ' AND price <= ?';
    params.push(Number(maxPrice));
  }

  if (sort === 'price-asc') {
    query += ' ORDER BY price ASC';
  } else if (sort === 'price-desc') {
    query += ' ORDER BY price DESC';
  } else if (sort === 'rating') {
    query += ' ORDER BY rating DESC';
  } else {
    query += ' ORDER BY createdAt DESC';
  }

  const [rows] = await db.query(query, params);
  const [allVariants] = await db.query('SELECT * FROM product_variants ORDER BY price ASC');

  return rows.map((r) => {
    const variants = allVariants.filter((v) => v.productId === r.id);
    return {
      ...r,
      featured: Boolean(r.featured),
      isFlashSale: Boolean(r.isFlashSale),
      flashSaleDiscount: Number(r.flashSaleDiscount || 0),
      variants
    };
  });
};

const findById = async (id) => {
  const db = await initDb();
  const [rows] = await db.query('SELECT * FROM products WHERE id = ? LIMIT 1', [id]);
  if (rows.length === 0) return null;
  const variants = await getVariantsByProductId(id);
  return {
    ...rows[0],
    featured: Boolean(rows[0].featured),
    isFlashSale: Boolean(rows[0].isFlashSale),
    flashSaleDiscount: Number(rows[0].flashSaleDiscount || 0),
    variants
  };
};

const create = async (productData) => {
  const db = await initDb();
  const categories = await getCategories();
  const matchedCategory = categories.find((c) => c.id === productData.categoryId);
  const categoryName = matchedCategory ? matchedCategory.name : 'Khác';
  const id = `prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const price = Number(productData.price);
  const originalPrice = Number(productData.originalPrice || productData.price);
  const stock = Number(productData.stock || 0);
  const rating = Number(productData.rating || 5.0);
  const imageUrl = productData.imageUrl || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80';
  const description = productData.description || '';
  const featured = productData.featured ? 1 : 0;
  const isFlashSale = productData.isFlashSale ? 1 : 0;
  const flashSaleDiscount = Number(productData.flashSaleDiscount || 0);

  await db.query(
    `INSERT INTO products (id, name, categoryId, categoryName, price, originalPrice, stock, rating, soldCount, imageUrl, description, featured, isFlashSale, flashSaleDiscount, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, NOW())`,
    [id, productData.name, productData.categoryId, categoryName, price, originalPrice, stock, rating, imageUrl, description, featured, isFlashSale, flashSaleDiscount]
  );

  const defaultVariantId = `var_${Date.now()}_1`;
  await db.query(
    `INSERT INTO product_variants (id, productId, color, type, price, originalPrice, stock, imageUrl)
     VALUES (?, ?, 'Tiêu chuẩn', 'Tiêu chuẩn', ?, ?, ?, ?)`,
    [defaultVariantId, id, price, originalPrice, stock, imageUrl]
  );

  return findById(id);
};

const update = async (id, updateData) => {
  const db = await initDb();
  const current = await findById(id);
  if (!current) return null;

  let categoryName = current.categoryName;
  if (updateData.categoryId) {
    const categories = await getCategories();
    const matched = categories.find((c) => c.id === updateData.categoryId);
    if (matched) categoryName = matched.name;
  }

  const name = updateData.name !== undefined ? updateData.name : current.name;
  const categoryId = updateData.categoryId !== undefined ? updateData.categoryId : current.categoryId;
  const price = updateData.price !== undefined ? Number(updateData.price) : current.price;
  const originalPrice = updateData.originalPrice !== undefined ? Number(updateData.originalPrice) : current.originalPrice;
  const stock = updateData.stock !== undefined ? Number(updateData.stock) : current.stock;
  const rating = updateData.rating !== undefined ? Number(updateData.rating) : current.rating;
  const imageUrl = updateData.imageUrl !== undefined ? updateData.imageUrl : current.imageUrl;
  const description = updateData.description !== undefined ? updateData.description : current.description;
  const featured = updateData.featured !== undefined ? (updateData.featured ? 1 : 0) : (current.featured ? 1 : 0);
  const isFlashSale = updateData.isFlashSale !== undefined ? (updateData.isFlashSale ? 1 : 0) : (current.isFlashSale ? 1 : 0);
  const flashSaleDiscount = updateData.flashSaleDiscount !== undefined ? Number(updateData.flashSaleDiscount) : current.flashSaleDiscount;

  await db.query(
    `UPDATE products SET name = ?, categoryId = ?, categoryName = ?, price = ?, originalPrice = ?, stock = ?, rating = ?, imageUrl = ?, description = ?, featured = ?, isFlashSale = ?, flashSaleDiscount = ?
     WHERE id = ?`,
    [name, categoryId, categoryName, price, originalPrice, stock, rating, imageUrl, description, featured, isFlashSale, flashSaleDiscount, id]
  );

  return findById(id);
};

const remove = async (id) => {
  const db = await initDb();
  const [result] = await db.query('DELETE FROM products WHERE id = ?', [id]);
  return result.affectedRows > 0;
};

const deductStock = async (items) => {
  const db = await initDb();
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    for (const item of items) {
      if (item.variantId) {
        const [vRows] = await connection.query(
          'SELECT stock, color, type FROM product_variants WHERE id = ? FOR UPDATE',
          [item.variantId]
        );
        if (vRows.length === 0 || vRows[0].stock < item.quantity) {
          const detail = vRows.length > 0 ? `${vRows[0].color} - ${vRows[0].type}` : item.variantId;
          throw new Error(`Phân loại ${detail} không đủ số lượng trong kho`);
        }
      }

      const [rows] = await connection.query('SELECT stock, name FROM products WHERE id = ? FOR UPDATE', [item.productId]);
      if (rows.length === 0 || rows[0].stock < item.quantity) {
        const name = rows.length > 0 ? rows[0].name : item.productId;
        throw new Error(`Sản phẩm ${name} không đủ số lượng trong kho`);
      }
    }

    for (const item of items) {
      if (item.variantId) {
        await connection.query(
          'UPDATE product_variants SET stock = stock - ? WHERE id = ?',
          [item.quantity, item.variantId]
        );
      }
      await connection.query(
        'UPDATE products SET stock = stock - ?, soldCount = soldCount + ? WHERE id = ?',
        [item.quantity, item.quantity, item.productId]
      );
    }

    await connection.commit();
    return true;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

module.exports = {
  initDb,
  getCategories,
  getVariantsByProductId,
  findAll,
  findById,
  create,
  update,
  remove,
  deductStock
};
