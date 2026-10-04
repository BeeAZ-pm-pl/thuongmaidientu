module.exports = {
  apps: [
    {
      name: 'api-gateway',
      script: './gateway/src/index.js',
      env: {
        PORT: 8000,
        NODE_ENV: 'production'
      }
    },
    {
      name: 'identity-service',
      script: './services/identity-service/src/index.js',
      env: {
        PORT: 8001,
        NODE_ENV: 'production'
      }
    },
    {
      name: 'product-service',
      script: './services/product-service/src/index.js',
      env: {
        PORT: 8002,
        NODE_ENV: 'production'
      }
    },
    {
      name: 'order-service',
      script: './services/order-service/src/index.js',
      env: {
        PORT: 8003,
        NODE_ENV: 'production'
      }
    },
    {
      name: 'notification-service',
      script: './services/notification-service/src/index.js',
      env: {
        PORT: 8004,
        NODE_ENV: 'production'
      }
    },
    {
      name: 'chat-service',
      script: './services/chat-service/dist/index.js',
      env: {
        PORT: 8005,
        NODE_ENV: 'production'
      }
    }
  ]
};
