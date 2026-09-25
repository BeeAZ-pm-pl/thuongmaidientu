const express = require('express');
const cors = require('cors');
const config = require('./config');
const productRoutes = require('./routes/productRoutes');
const productController = require('./controllers/productController');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ service: 'product-service', status: 'healthy', timestamp: new Date() });
});

app.get('/api/categories', productController.getCategories);
app.get('/categories', productController.getCategories);

app.use('/api/products', productRoutes);
app.use('/', productRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Tuyến đường không tồn tại trên Product Service' });
});

app.listen(config.port, () => {
  console.log(`Product Service running on port ${config.port}`);
});
