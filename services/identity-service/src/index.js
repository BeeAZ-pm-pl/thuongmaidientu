const express = require('express');
const cors = require('cors');
const config = require('./config');
const authRoutes = require('./routes/authRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ service: 'identity-service', status: 'healthy', timestamp: new Date() });
});

app.use('/api/auth', authRoutes);
app.use('/', authRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Tuyến đường không tồn tại trên Identity Service' });
});

app.listen(config.port, () => {
  console.log(`Identity Service running on port ${config.port}`);
});
