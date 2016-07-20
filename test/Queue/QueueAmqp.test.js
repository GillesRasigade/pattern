'use strict';

const QueueAmqp = require('../../src/Queue/QueueAmqp');

const EventEmitter = require('events').EventEmitter;
const amqp = require('amqplib');

describe('QueueAmqp', () => {
  const sandbox = sinon.sandbox.create();

  before(() => {
    sandbox.stub(amqp, 'connect', () => function* connect() {
      return {
        close: () => {},
        createChannel: () => function *createChannel() {
          return {
            assertQueue: () => true,
            assertExchange: () => true,
            bindQueue: () => true,
            publish: (queue, topic, message) => {
              this.fn({ content: message });
            },
            consume: (name, fn) => {
              this.fn = fn;
            },
            on: () => true,
            close: () => true,
            ack: () => true,
          };
        },
      };
    });
  });

  after(() => {
    sandbox.restore();
  });

  describe('Interface', () => {
    it('extends the EventEmitter', () => {
      const queue = new QueueAmqp();
      expect(queue).to.be.instanceof(EventEmitter);
    });
  });

  describe('configuration', () => {
    it('allows to configure exchange name', () => {
      const queue = new QueueAmqp({
        exchange: {
          name: 'exchangeName',
        },
      });
      expect(queue.exchangeName).to.be.equal('exchangeName');
    });
    it('allows to configure the queue type', () => {
      const queue = new QueueAmqp({
        type: 'fanout',
      });
      expect(queue.type).to.be.equal('fanout');
    });
  });

  describe('#connect()', () => {
    it('allows to connect only RX from environment variable', function* it() {
      const queue = new QueueAmqp({ rx: true });
      const result = yield queue.connect();

      expect(result).to.be.eql(true);
    });

    it('allows to connect only TX from environment variable', function* it() {
      const queue = new QueueAmqp({ tx: true });
      const result = yield queue.connect();

      expect(result).to.be.eql(true);
    });

    it('resolves a Promise when connected', function* it() {
      const queue = new QueueAmqp({ rx: 'amqp://rx', tx: 'amqp://rx' });
      const result = yield queue.connect();

      expect(result).to.be.eql(true);
    });
  });

  describe('#emit()', () => {
    it('publishes message to the AMQP queue', function* it(done) {
      const queue = new QueueAmqp({ rx: 'amqp://rx', tx: 'amqp://rx' });
      yield queue.connect();
      queue.txChannel.publish = (name, topic, msg) => {
        expect(name).to.be.eql(queue.name);
        expect(topic).to.be.eql('task');
        expect(msg).to.be.instanceof(Buffer);
        done();
      };

      queue.emit('task', 'Message to send');
    });
  });

  describe('#on()', () => {
    it('receives messages from the queue', function* it(done) {
      const queue = new QueueAmqp({ rx: 'amqp://rx', tx: 'amqp://rx' });
      yield queue.connect();
      queue.rxChannel = queue.txChannel;
      queue.on('task', (msg) => {
        expect(msg).to.be.eql('message');
        done();
      });

      queue.emit('task', 'message');
    });
  });

  describe('#close()', () => {
    it('returns the queue when channels are closed', function* it() {
      const queue = new QueueAmqp({ rx: 'amqp://rx', tx: 'amqp://rx' });
      yield queue.connect();
      const result = queue.close();

      expect(result).to.be.eql(queue);
    });
  });

  describe('#onClose()', () => {
    it('resolves a Promise when disconnected', function* it() {
      const queue = new QueueAmqp({ rx: 'amqp://rx', tx: 'amqp://rx' });
      yield queue.connect();
      const result = yield queue.onClose();

      expect(result).to.be.eql(true);
    });
    it('closes listener only successfully', function* it() {
      const listener = new QueueAmqp({ rx: 'amqp://rx' });
      yield listener.connect();

      const result = yield listener.onClose();

      expect(result).to.be.eql(true);
    });
    it('closes publisher only successfully', function* it() {
      const publisher = new QueueAmqp({ tx: 'amqp://tx' });
      yield publisher.connect();

      const result = yield publisher.onClose();

      expect(result).to.be.eql(true);
    });
  });

  describe.skip('#ack / nack', () => {
    before(() => {
      sandbox.restore();
    });
    it('acknowledges messages successfully', function* it(done) {
      const listener = new QueueAmqp({ name: 'ack', rx: 'amqp://localhost' });
      yield listener.connect();

      const publisher = new QueueAmqp({ name: 'ack', tx: 'amqp://localhost' });
      yield publisher.connect();

      let cpt = 0;
      listener.on('message', (data, message) => {
        expect(data).to.deep.equal({
          hello: 'world',
        });
        if (cpt === 0) {
          cpt++;
          listener.nack(message);
        } else if (cpt === 1) {
          listener.ack(message);
          done();
        }
      });

      publisher.emit('message', { hello: 'world' });
    });
    it('acknowledges messages automatically if requested', function* it(done) {
      const listener = new QueueAmqp({ name: 'auto', ack: true, rx: 'amqp://localhost' });
      yield listener.connect();

      const publisher = new QueueAmqp({ name: 'auto', tx: 'amqp://localhost' });
      yield publisher.connect();

      let cpt = 0;
      listener.on('message', data => {
        expect(data).to.deep.equal({
          hello: 'world',
        });
        cpt++;

        setTimeout(() => {
          expect(cpt).to.be.eql(1);
          done();
        }, 100);
      });

      publisher.emit('message', { hello: 'world' });
    });
  });

  describe('integration', () => {
    before(() => {
      sandbox.restore();
    });

    it('allows to broadcast messages to multiple consumers', function* it(done) {
      const queue = new QueueAmqp({
        tx: 'amqp://localhost',
        type: 'fanout',
        queue: {
          name: '',
          autoDelete: true,
        },
        exchange: {
          durable: false,
        },
      });
      yield queue.connect();

      const alice = new QueueAmqp({
        rx: 'amqp://localhost',
        type: 'fanout',
        queue: {
          name: '',
          autoDelete: true,
        },
        exchange: {
          durable: false,
        },
      });
      yield alice.connect();

      const bernard = new QueueAmqp({
        rx: 'amqp://localhost',
        type: 'fanout',
        queue: {
          name: '',
          autoDelete: true,
        },
        exchange: {
          durable: false,
        },
      });
      yield bernard.connect();

      let cpt = 0;
      const receive = () => {
        cpt++;
        if (cpt === 2) {
          done();
        }
      };

      alice.on('task', receive);
      bernard.on('task', receive);

      setTimeout(() => {
        queue.rxChannel = queue.txChannel;
        queue.emit('task', 'message');
      }, 100);
    });
  });
});
