const productModel = require('../models/productModel');

const getCategories = async (req, res) => {
  try {
    const categories = await productModel.getCategories();
    return res.json({ success: true, data: categories });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi khi tải danh mục', error: error.message });
  }
};

const createCategory = async (req, res) => {
  try {
    const { id, name, icon } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Tên danh mục không được để trống' });
    }
    const cat = await productModel.createCategory({ id, name, icon });
    return res.status(201).json({ success: true, message: 'Thêm danh mục thành công', data: cat });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const cat = await productModel.updateCategory(id, req.body);
    return res.json({ success: true, message: 'Cập nhật danh mục thành công', data: cat });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    await productModel.deleteCategory(id);
    return res.json({ success: true, message: 'Đã xóa danh mục thành công' });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
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

const checkReviewEligibility = async (req, res) => {
  try {
    const productId = req.params.id;
    const userId = req.query.userId || (req.user && req.user.id);
    if (!userId || userId === 'guest') {
      return res.json({
        success: true,
        canReview: false,
        reason: 'not_logged_in',
        message: 'Vui lòng đăng nhập để đánh giá sản phẩm'
      });
    }

    const hasPurchased = await productModel.hasUserPurchasedProduct(userId, productId);
    if (!hasPurchased) {
      return res.json({
        success: true,
        canReview: false,
        reason: 'not_purchased',
        message: 'Bạn chưa mua sản phẩm này nên chưa thể gửi đánh giá'
      });
    }

    const existingReview = await productModel.getUserProductReview(userId, productId);
    if (existingReview) {
      return res.json({
        success: true,
        canReview: false,
        hasReviewed: true,
        existingReview,
        reason: 'already_reviewed',
        message: 'Bạn đã đánh giá sản phẩm này rồi'
      });
    }

    return res.json({
      success: true,
      canReview: true,
      reason: 'eligible',
      message: 'Bạn đủ điều kiện đánh giá sản phẩm này'
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi kiểm tra quyền đánh giá', error: error.message });
  }
};

const addProductReview = async (req, res) => {
  try {
    const productId = req.params.id;
    const { rating, comment, userName, userAvatar, userId } = req.body;
    const finalUserId = userId || (req.user && req.user.id);

    if (!finalUserId || finalUserId === 'guest') {
      return res.status(401).json({
        success: false,
        message: 'Vui lòng đăng nhập tài khoản đã mua hàng để gửi đánh giá'
      });
    }

    if (!comment || !comment.trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập nội dung đánh giá' });
    }

    // Bắt buộc xác thực người dùng đã từng mua sản phẩm này
    const hasPurchased = await productModel.hasUserPurchasedProduct(finalUserId, productId);
    if (!hasPurchased) {
      return res.status(403).json({
        success: false,
        message: 'Bạn chưa mua sản phẩm này tại NovaShop nên không thể gửi đánh giá'
      });
    }

    // Kiểm tra xem đã từng đánh giá chưa
    const existing = await productModel.getUserProductReview(finalUserId, productId);
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Bạn đã đánh giá sản phẩm này trước đó rồi'
      });
    }

    const review = await productModel.addReview({
      productId,
      rating: parseInt(rating, 10) || 5,
      comment,
      userName,
      userAvatar,
      userId: finalUserId,
      isBuyer: true
    });
    return res.status(201).json({ success: true, message: 'Gửi đánh giá thành công', data: review });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi khi gửi đánh giá', error: error.message });
  }
};

const getAllReviews = async (req, res) => {
  try {
    const { rating, productId, keyword } = req.query;
    const reviews = await productModel.getAllReviews({ rating, productId, keyword });
    return res.json({ success: true, data: reviews });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi khi tải danh sách đánh giá', error: error.message });
  }
};

const replyReview = async (req, res) => {
  try {
    const { replyComment } = req.body;
    if (!replyComment || !replyComment.trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập nội dung phản hồi' });
    }
    const updated = await productModel.replyReview(req.params.id, replyComment);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đánh giá' });
    }
    return res.json({ success: true, message: 'Phản hồi đánh giá thành công', data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi khi phản hồi đánh giá', error: error.message });
  }
};

const deleteReview = async (req, res) => {
  try {
    const deleted = await productModel.deleteReview(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đánh giá cần xóa' });
    }
    return res.json({ success: true, message: 'Đã xóa đánh giá thành công' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi khi xóa đánh giá', error: error.message });
  }
};

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  updateProductVariants,
  deleteProduct,
  deductStock,
  getProductReviews,
  checkReviewEligibility,
  addProductReview,
  getAllReviews,
  replyReview,
  deleteReview
};

