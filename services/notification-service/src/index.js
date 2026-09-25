const express = require('express');
const cors = require('cors');
const config = require('./config');
const notificationRoutes = require('./routes/notificationRoutes');
const { startConsumer } = require('./consumers/orderConsumer');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ service: 'notification-service', status: 'healthy', timestamp: new Date() });
});

app.use('/api/notifications', notificationRoutes);
app.use('/', notificationRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Tuyến đường không tồn tại trên Notification Service' });
});

app.listen(config.port, async () => {
  console.log(`Notification Service running on port ${config.port}`);
  await startConsumer();
});
