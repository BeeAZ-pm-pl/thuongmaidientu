import express from 'express';
import cors from 'cors';
import config from './config';
import chatRoutes from './routes/chatRoutes';
import * as chatModel from './models/chatModel';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({
    service: 'chat-service',
    status: 'healthy',
    timestamp: new Date(),
    geminiConfigured: Boolean(config.geminiApiKey)
  });
});

app.use('/api/chat', chatRoutes);
app.use('/', chatRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Tuyến đường không tồn tại trên Chat Service' });
});

chatModel.initDb().then(() => {
  console.log('Database tables for chat-service initialized');
}).catch((err: any) => {
  console.warn('Database initialization warning for chat-service:', err.message);
});

app.listen(config.port, () => {
  console.log(`Chat Service running on port ${config.port}`);
});

export default app;
