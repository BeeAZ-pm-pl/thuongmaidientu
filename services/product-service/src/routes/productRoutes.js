const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProductById);
router.get('/:id/reviews', productController.getProductReviews);
router.post('/:id/reviews', productController.addProductReview);
router.post('/', productController.createProduct);
router.put('/:id', productController.updateProduct);
router.put('/:id/variants', productController.updateProductVariants);
router.delete('/:id', productController.deleteProduct);
router.post('/deduct-stock', productController.deductStock);

module.exports = router;
