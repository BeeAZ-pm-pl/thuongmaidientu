const amqp = require('amqplib');
const config = require('../config');

let channel = null;

const connectQueue = async () => {
  try {
    const connection = await amqp.connect(config.rabbitmqUrl);
    channel = await connection.createChannel();
    await channel.assertQueue(config.queueName, { durable: true });
    console.log('Order Service connected to RabbitMQ');
  } catch (error) {
    console.log('RabbitMQ not available, running in standalone mode');
  }
};

const publishOrderEvent = async (eventType, orderData) => {
  const message = {
    eventType,
    timestamp: new Date().toISOString(),
    data: orderData
  };

  if (channel) {
    try {
      channel.sendToQueue(
        config.queueName,
        Buffer.from(JSON.stringify(message)),
        { persistent: true }
      );
      return;
    } catch (err) {
      console.error(err);
    }
  }

  try {
    const notificationServiceUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:8004';
    await fetch(`${notificationServiceUrl}/api/notifications/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });
  } catch (err) {}
};

module.exports = {
  connectQueue,
  publishOrderEvent
};
