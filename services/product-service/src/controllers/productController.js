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
    const { category, search, minPrice, maxPrice, sort } = req.query;
    const products = await productModel.findAll({ category, search, minPrice, maxPrice, sort });
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

module.exports = {
  getCategories,
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  deductStock
};
