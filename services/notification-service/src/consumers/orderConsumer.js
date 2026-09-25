const amqp = require('amqplib');
const config = require('../config');
const notificationModel = require('../models/notificationModel');

const processOrderEvent = async (event) => {
  const { eventType, data } = event;

  if (eventType === 'order.created') {
    await notificationModel.create({
      type: 'order.created',
      title: `Đơn hàng mới #${data.id}`,
      message: `Khách hàng ${data.customerName} vừa đặt đơn hàng giá trị ${data.totalAmount} đ.`,
      recipient: 'admin',
      metadata: { orderId: data.id, totalAmount: data.totalAmount }
    });
    console.log(`[Event Processed] Order created: #${data.id}`);
  } else if (eventType === 'order.status_updated') {
    await notificationModel.create({
      type: 'order.status_updated',
      title: `Cập nhật trạng thái #${data.id}`,
      message: `Đơn hàng #${data.id} đã cập nhật sang trạng thái "${data.status}".`,
      recipient: data.userId || 'customer',
      metadata: { orderId: data.id, status: data.status }
    });
    console.log(`[Event Processed] Order status updated: #${data.id} -> ${data.status}`);
  }
};

const startConsumer = async () => {
  try {
    const connection = await amqp.connect(config.rabbitmqUrl);
    const channel = await connection.createChannel();
    await channel.assertQueue(config.queueName, { durable: true });

    console.log(`Notification Service consumer listening on RabbitMQ queue: ${config.queueName}`);

    channel.consume(config.queueName, async (msg) => {
      if (msg !== null) {
        try {
          const content = JSON.parse(msg.content.toString());
          await processOrderEvent(content);
          channel.ack(msg);
        } catch (err) {
          console.error('Error processing message:', err.message);
          channel.nack(msg, false, false);
        }
      }
    });
  } catch (error) {
    console.log('RabbitMQ not accessible, listening via HTTP fallback');
  }
};

module.exports = {
  startConsumer,
  processOrderEvent
};
