'use strict';

// AMQP configuration:
process.env.RABBITMQ_BIGWIG_RX_URL = 'amqp://localhost:5672';
process.env.RABBITMQ_BIGWIG_TX_URL = 'amqp://localhost:5672';

// Redis configuration:
process.env.REDISCLOUD_URL = 'redis://localhost:6379';

const co = require('co');
const pattern = require('./index.js');

const queue = new pattern.QueueAmqp({
  queue: 'tasks',
  url: true,
  rx: true,
  tx: true,
  ack: false
});

const main = co.wrap(function* () {
  yield queue.connect();

  queue.on('task', (message, ...args) => {
    console.log(message);
    queue.ack(args[args.length-1]);
  });

  setInterval(() => {
    queue.emit('task', 'A coffee please !', 'Yes please');
  }, 1000);
});

main();
