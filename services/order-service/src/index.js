const express = require('express');
const cors = require('cors');
const config = require('./config');
const orderRoutes = require('./routes/orderRoutes');
const { connectQueue } = require('./utils/messageQueue');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ service: 'order-service', status: 'healthy', timestamp: new Date() });
});

app.use('/api/orders', orderRoutes);
app.use('/', orderRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Tuyến đường không tồn tại trên Order Service' });
});

app.listen(config.port, async () => {
  console.log(`Order Service running on port ${config.port}`);
  await connectQueue();
});
