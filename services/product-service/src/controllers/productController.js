const productModel = require('../models/productModel');

const getCategories = async (req, res) => {
  try {
    const categories = await productModel.getCategories();
    return res.json({ success: true, data: categories });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi khi tải danh mục', error: error.message });
  }
};

const getAllProducts = async (req, res) => {
  try {
    const { category, search, minPrice, maxPrice, sort, flashSale, minRating, inStock } = req.query;
    const products = await productModel.findAll({ category, search, minPrice, maxPrice, sort, flashSale, minRating, inStock });
    return res.json({
      success: true,
      total: products.length,
      data: products
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách sản phẩm', error: error.message });
  }
};

const getProductById = async (req, res) => {
  try {
    const product = await productModel.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
    }
    return res.json({ success: true, data: product });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi khi tìm sản phẩm', error: error.message });
  }
};

const createProduct = async (req, res) => {
  try {
    const { name, categoryId, price, stock, description, imageUrl, featured } = req.body;
    if (!name || !categoryId || price === undefined) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp tên sản phẩm, danh mục và giá bán' });
    }
    const newProduct = await productModel.create({
      name,
      categoryId,
      price,
      stock: stock || 0,
      description: description || '',
      imageUrl: imageUrl || '',
      featured: featured || false
    });
    return res.status(201).json({ success: true, message: 'Thêm sản phẩm thành công', data: newProduct });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi khi tạo sản phẩm', error: error.message });
  }
};

const updateProduct = async (req, res) => {
  try {
    const updated = await productModel.update(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm cần cập nhật' });
    }
    return res.json({ success: true, message: 'Cập nhật sản phẩm thành công', data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi khi cập nhật sản phẩm', error: error.message });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const deleted = await productModel.remove(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm để xóa' });
    }
    return res.json({ success: true, message: 'Đã xóa sản phẩm thành công' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi khi xóa sản phẩm', error: error.message });
  }
};

const deductStock = async (req, res) => {
  try {
    const { items } = req.body;
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ success: false, message: 'Danh sách sản phẩm không hợp lệ' });
    }
    await productModel.deductStock(items);
    return res.json({ success: true, message: 'Trừ tồn kho thành công' });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

const updateProductVariants = async (req, res) => {
  try {
    const { variants } = req.body;
    if (!variants || !Array.isArray(variants)) {
      return res.status(400).json({ success: false, message: 'Danh sách biến thể không hợp lệ' });
    }
    const updated = await productModel.updateVariants(req.params.id, variants);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
    }
    return res.json({ success: true, message: 'Cập nhật biến thể thành công', data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi khi cập nhật biến thể', error: error.message });
  }
};

const getProductReviews = async (req, res) => {
  try {
    const data = await productModel.getReviewsByProductId(req.params.id);
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi khi lấy đánh giá sản phẩm', error: error.message });
  }
};

const addProductReview = async (req, res) => {
  try {
    const { rating, comment, userName, userAvatar, userId, isBuyer } = req.body;
    if (!comment || !comment.trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập nội dung đánh giá' });
    }
    const review = await productModel.addReview({
      productId: req.params.id,
      rating: parseInt(rating, 10) || 5,
      comment,
      userName,
      userAvatar,
      userId,
      isBuyer: isBuyer !== false
    });
    return res.status(201).json({ success: true, message: 'Gửi đánh giá thành công', data: review });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi khi gửi đánh giá', error: error.message });
  }
};

module.exports = {
  getCategories,
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  updateProductVariants,
  deleteProduct,
  deductStock,
  getProductReviews,
  addProductReview
};
