'use strict';

// AMQP configuration:
process.env.RABBITMQ_BIGWIG_RX_URL = 'amqp://localhost:5672';
process.env.RABBITMQ_BIGWIG_TX_URL = 'amqp://localhost:5672';

// Redis configuration:
process.env.REDISCLOUD_URL = 'redis://localhost:6379';

const co = require('co');
const pattern = require('./index.js');

const queue = new pattern.QueueAmqp({
  name: 'W',
  exchangeName: 'tasks',
  url: true,
  rx: true,
  tx: true,
  type: 'direct',
  ack: false
});

const queueA = new pattern.QueueAmqp({
  name: 'W',
  exchangeName: 'tasksA',
  url: true,
  rx: true,
  tx: true,
  type: 'direct',
  ack: false
});

const queueB = new pattern.QueueAmqp({
  name: 'W',
  exchangeName: 'tasksB',
  url: true,
  rx: true,
  tx: true,
  type: 'direct',
  ack: false
});

const main = co.wrap(function* () {
  yield queue.connect();
  yield queueA.connect();
  yield queueB.connect();

  queueA.on('task', (message, ...args) => {
    console.log('A', message);
  });

  queueB.on('task', (message, ...args) => {
    console.log('B', message);
  });

  queue.on('task', (message, ...args) => {
    console.log('W', message);
    // queue.ack(args[args.length-1]);
    // queue.nack(args[args.length-1]);
  });

  setInterval(() => {
    queue.emit('task', 'A coffee please !', 'Yes please');
  }, 1000);
});

main();
