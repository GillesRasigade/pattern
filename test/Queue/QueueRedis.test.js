const QueueRedis = require('../../src/Queue/QueueRedis');

const EventEmitter = require('events').EventEmitter;
const redis = require('redis');

describe('QueueRedis', () => {
  const sandbox = sinon.sandbox.create();

  before(() => {
    sandbox.stub(redis, 'createClient', () => ({
      close: () => {},
      publish: (topic, message) => {
        this.fn(topic, message);
      },
      on: (name, fn) => {
        this.fn = fn;
      },
      quit: () => true,
      subscribe: () => true,
    }));
  });

  after(() => {
    sandbox.restore();
  });

  describe('Interface', () => {
    it('extends the EventEmitter', () => {
      const queue = new QueueRedis();
      expect(queue).to.be.instanceof(EventEmitter);
    });
  });

  describe('#connect()', () => {
    it('resolves a Promise when connected', function* it() {
      const queue = new QueueRedis({
        url: true,
      });
      const result = yield queue.connect();

      expect(result).to.be.eql(true);
    });
  });

  describe('#emit()', () => {
    it('publishes message to the AMQP queue', function* it(done) {
      const queue = new QueueRedis();
      yield queue.connect();
      queue.tx.publish = (topic, msg) => {
        expect(topic).to.be.eql('task');
        expect(msg).to.be.a('string');
        done();
      };

      queue.emit('task', 'Message to send');
    });
  });

  describe('#on()', () => {
    it('receives messages from the queue', function* it(done) {
      const queue = new QueueRedis();
      yield queue.connect();
      queue.rx = queue.tx;
      queue.on('task', (msg) => {
        expect(msg).to.be.eql('message');
        done();
      });

      queue.emit('task', 'message');
    });
  });

  describe('#close()', () => {
    it('returns the queue when channels are closed', function* it() {
      const queue = new QueueRedis();
      yield queue.connect();
      const result = queue.close();

      expect(result).to.be.eql(queue);
    });
  });
});
