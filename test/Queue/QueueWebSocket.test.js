'use strict';

const QueueWebSocket = require('../../src/Queue/QueueWebSocket');

const EventEmitter = require('events').EventEmitter;
const net = require('net');
const WebSocket = require('ws');
const WebSocketServer = require('uws').Server;

describe('QueueWebSocket', () => {
  const sandbox = sinon.sandbox.create();
  const http = net.createServer();
  let server;
  let queues = [];

  beforeEach(done => {
    sandbox.restore();

    http.close();

    // Close all client queues:
    for (const queue of queues) {
      queue.close();
    }
    queues = [];

    // Close server:
    if (server) {
      server.close(done);
      server = null;
    } else {
      done();
    }
  });

  describe('Interface', () => {
    it('extends the EventEmitter', () => {
      const queue = new QueueWebSocket();
      expect(queue).to.be.instanceof(EventEmitter);
    });
  });

  describe('#connect()', () => {
    it('allows to create a websocket as server', function* it() {
      server = new QueueWebSocket({ server: true });
      const result = yield server.connect();

      expect(result).to.be.eql(true);
      expect(server.ws).to.be.an.instanceof(WebSocketServer);
    });

    it('allows to open a websocket as a client', function* it() {
      // Open the server first:
      server = new QueueWebSocket({ server: true });
      yield server.connect();

      const client = new QueueWebSocket();
      const result = yield client.connect();

      expect(result).to.be.eql(true);
      expect(client.ws).to.be.an.instanceof(WebSocket);
    });
  });

  describe('#broadcast()', () => {
    it('throws an exception for client', function* it() {
      const queue = new QueueWebSocket({ name: 'queue' });
      expect(() => {
        queue.broadcast();
      }).to.throw(Error, 'Only WebSocket Server can broadcast');
    });
  });

  describe('#onMessage()', () => {
    it('throws an exception on binary flag message', function* it() {
      const queue = new QueueWebSocket({ name: 'queue' });
      expect(() => {
        queue.onMessage(new Buffer(''), { binary: true });
      }).to.throw(Error, 'Binary flag not yet supported =)');
    });
  });

  describe('#subscribe()', () => {
    it('subscribes client topics on special message', function* it(done) {
      server = new QueueWebSocket({ server: true });

      const queue = new QueueWebSocket({ name: 'queue' });

      yield server.connect();
      yield queue.connect();

      queues.push(queue);

      queue.subscribe('topic');
      setTimeout(() => {
        const connections = Object.keys(server.connections);
        expect(connections).to.have.property('length', 2);
        expect(server.connections[connections[0]]._topics).to.be.eql(['topic']);
        done();
      }, 500);
    });
  });

  describe('#emit()', () => {
    it('publishes message to the WebSocket queue from the server', function* it() {
      const queue = new QueueWebSocket({ name: 'server', server: true });
      const broadcastStub = sandbox.stub(queue, 'broadcast');

      queue.emit('task', 'Buy some milk');

      expect(broadcastStub.callCount).to.be.eql(1);

      const args = broadcastStub.lastCall.args;
      expect(args.length).to.be.eql(2);
      expect(args[0]).to.be.eql(JSON.stringify({ topic: 'task', args: ['Buy some milk'] }));
      expect(args[1]).to.be.eql('task');
    });

    xit('publishes message to the WebSocket queue from the client', function* it() {
      const queue = new QueueWebSocket({ name: 'server' });
      queue.ws = {
        send: () => true,
      };
      const stub = sandbox.stub(queue.ws, 'send');

      queue.emit('task', 'Buy some milk');

      expect(stub.callCount).to.be.eql(1);

      const args = stub.lastCall.args;
      expect(args.length).to.be.eql(2);
      expect(args[0]).to.be.eql(JSON.stringify({ topic: 'task', args: ['Buy some milk'] }));
      expect(args[1]).to.be.eql({ mask: true });
    });

    it('publishes message to the WebSocket queue from the client', function* it(done) {
      server = new QueueWebSocket({ server: true });
      yield server.connect();

      const queue = new QueueWebSocket({ name: 'queue' });
      yield queue.connect();

      const queue2 = new QueueWebSocket({ name: 'queue2' });
      yield queue2.connect();

      queues.push(queue);
      queues.push(queue2);

      queue2.on('task', msg => {
        expect(msg).to.be.eql('Buy some milk');
        const connections = Object.keys(server.connections);
        expect(connections).to.have.property('length', 3);
        expect(server.connections[connections[2]]._topics).to.be.eql(['task']);
        done();
      });

      setTimeout(() => {
        queue.emit('task', 'Buy some milk');
      }, 500);
    });
  });

  describe('#on()', () => {
    it('receives messages from the server', function* it(done) {
      server = new QueueWebSocket({ server: true, name: 'server' });
      yield server.connect();

      const queue = new QueueWebSocket({ name: 'queue' });
      yield queue.connect();

      queues.push(queue);

      queue.on('task', (msg) => {
        expect(msg).to.be.eql('message');

        const connections = Object.keys(server.connections);
        expect(connections).to.have.property('length', 2);
        expect(server.connections[connections[0]]._topics).to.be.eql(['task']);
        done();
      });

      setTimeout(() => {
        server.emit('task', 'message');
      }, 10);
    });

    it('allows to bind several callbacks on the same topic', function* it(done) {
      server = new QueueWebSocket({ server: true, name: 'server' });
      yield server.connect();

      const queue = new QueueWebSocket({ name: 'queue' });
      yield queue.connect();

      queues.push(queue);

      queue.on('task', (msg) => {
        expect(msg).to.be.eql('message');
      });

      queue.on('task', (msg) => {
        expect(msg).to.be.eql('message');

        const connections = Object.keys(server.connections);
        expect(connections).to.have.property('length', 2);
        expect(server.connections[connections[0]]._topics).to.be.eql(['task']);
        done();
      });

      setTimeout(() => {
        server.emit('task', 'message');
      }, 100);
    });

    it('receives messages from another client', function* it(done) {
      server = new QueueWebSocket({ server: true, name: 'server' });
      yield server.connect();

      const queue = new QueueWebSocket({ name: 'queue' });
      yield queue.connect();

      const queue2 = new QueueWebSocket({ name: 'queue2' });
      yield queue2.connect();

      queues.push(queue);
      queues.push(queue2);

      queue.on('task', (msg) => {
        expect(msg).to.be.eql('message');

        const connections = Object.keys(server.connections);
        expect(connections).to.have.property('length', 3);
        expect(server.connections[connections[0]]._topics).to.be.eql(['task']);

        // expect(server.ws.clients).to.have.property('length', 3);
        // expect(server.ws.clients[1]._topics).to.be.eql([ 'task' ]);
        done();
      });

      setTimeout(() => {
        queue2.emit('task', 'message');
      }, 10);
    });

    it('receives messages on the server from a client', function* it(done) {
      server = new QueueWebSocket({ server: true, name: 'server' });
      yield server.connect();

      const queue = new QueueWebSocket({ name: 'queue' });
      yield queue.connect();

      queues.push(queue);

      server.on('task', (msg) => {
        expect(msg).to.be.eql('message');

        const connections = Object.keys(server.connections);
        expect(connections).to.have.property('length', 2);
        done();
      });

      setTimeout(() => {
        queue.emit('task', 'message');
      }, 10);
    });
  });

  describe('#close()', () => {
    it('returns the queue when channels are closed', function* it(done) {
      server = new QueueWebSocket({ server: true, name: 'server' });
      yield server.connect();

      const queue = new QueueWebSocket({ name: 'queue' });
      yield queue.connect();

      queues.push(queue);

      const connections = Object.keys(server.connections);
      expect(connections).to.have.property('length', 2);

      setTimeout(() => {
        queue.close(() => {
          expect(queue.ws).to.have.property('_closeCode', 1000);
          expect(queue.ws).to.have.property('_closeReceived', true);
          done();
        });
      }, 10);
    });

    it('returns the queue when channels are closed without websocket', function* it() {
      const queue = new QueueWebSocket({ name: 'queue' });

      queue.close();
      expect(queue.ws).to.be.eql(null);
    });

    it('returns the queue when channels are closed without websocket but callback',
    function* it(done) {
      const queue = new QueueWebSocket({ name: 'queue' });

      queue.close(() => {
        expect(queue.ws).to.be.eql(null);
        done();
      });
    });

    it('reconnects client when the connection is lost', function* it(done) {
      server = new QueueWebSocket({ server: true, name: 'server' });
      yield server.connect();

      const queue = new QueueWebSocket({ name: 'queue' });
      yield queue.connect();

      queues.push(queue);

      queue.on('task', (msg) => {
        expect(msg).to.be.eql('message');

        const connections = Object.keys(server.connections);
        expect(connections).to.have.property('length', 2);
        expect(server.connections[connections[1]]._topics).to.be.eql(['task']);
        done();
      });

      setTimeout(() => {
        queue.ws.close();
        setTimeout(() => {
          server.emit('task', 'message');
        }, 1000);
      }, 10);
    });

    it('reconnects server when the connection is lost', function* it(done) {
      server = new QueueWebSocket({ server: true, name: 'server' });
      yield server.connect();

      const queue = new QueueWebSocket({ name: 'queue' });
      yield queue.connect();

      queues.push(queue);

      queue.on('task', (msg) => {
        expect(msg).to.be.eql('message');

        const connections = Object.keys(server.connections);
        expect(connections).to.have.property('length', 2);
        done();
      });

      setTimeout(() => {
        server.ws.httpServer.close();
        server.ws.close();
        setTimeout(() => {
          server.emit('task', 'message');
        }, 1000);
      }, 10);
    });

    it('fails to reconnect server if the port is always taken', function* it() {
      server = new QueueWebSocket({
        server: true,
        name: 'server',
        WEBSOCKET_RECONNECT_TIMEOUT: 100,
        WEBSOCKET_RECONNECT_MAX_ATTEMPTS: 3,
      });
      yield server.connect();

      const queue = new QueueWebSocket({ name: 'queue' });
      yield queue.connect();

      yield cb => setTimeout(cb, 10);

      server.ws.httpServer.close();
      server.ws.close();

      http.listen(4080, '127.0.0.1');

      yield cb => setTimeout(cb, 1000);

      expect(server._attempts).to.be.eql(3);
    });
  });
});
