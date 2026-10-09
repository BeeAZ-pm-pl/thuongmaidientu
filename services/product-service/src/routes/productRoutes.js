const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

// Quản lý đánh giá toàn hệ thống (Admin & Store)
router.get('/reviews/all', productController.getAllReviews);
router.put('/reviews/:id/reply', productController.replyReview);
router.delete('/reviews/:id', productController.deleteReview);

// Quản lý danh mục
router.get('/categories', productController.getCategories);
router.post('/categories', productController.createCategory);
router.put('/categories/:id', productController.updateCategory);
router.delete('/categories/:id', productController.deleteCategory);

router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProductById);
router.get('/:id/reviews', productController.getProductReviews);
router.get('/:id/review-eligibility', productController.checkReviewEligibility);
router.post('/:id/reviews', productController.addProductReview);
router.post('/', productController.createProduct);
router.put('/:id', productController.updateProduct);
router.put('/:id/variants', productController.updateProductVariants);
router.delete('/:id', productController.deleteProduct);
router.post('/deduct-stock', productController.deductStock);

module.exports = router;

