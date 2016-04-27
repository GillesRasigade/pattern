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
    it('resolves a Promise when connected', function* it() {
      const queue = new QueueAmqp({ rx: 'amqp://rx', tx: 'amqp://rx' });
      yield queue.connect();
      const result = yield queue.onClose();

      expect(result).to.be.eql(true);
    });
  });
});
