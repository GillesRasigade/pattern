'use strict';

const co = require('co');
const pattern = require('../../index.js');

const main = co.wrap(function* () {
  const server = new pattern.QueueWebSocket({
    name: 'server',
    server: true
  });
  const alice = new pattern.QueueWebSocket({
    name: 'Alice'
  });
  const bernard = new pattern.QueueWebSocket({
    name: 'Bernard'
  });

  // Server and clients connection:
  yield server.connect();
  yield alice.connect();
  yield bernard.connect();

  alice.on('bernard', msg => {
    console.log('Message coming from Bernard: ' + msg);
  });
  bernard.on('alice', msg => {
    console.log('Message coming from Alice: ' + msg);
  });

  alice.emit('alice', 'Hello Bernard !');
  bernard.emit('bernard', 'Hello Alice !');
});

main();
