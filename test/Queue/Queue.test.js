const Queue = require('../../src/Queue/Queue');

const EventEmitter = require('events').EventEmitter;

describe('Queue', () => {
  describe('Interface', () => {
    it('extends the EventEmitter', () => {
      const queue = new Queue();
      expect(queue).to.be.instanceof(EventEmitter);
    });
  });

  describe('#connect()', () => {
    it('resolves a Promise', () => {
      const queue = new Queue();
      expect(queue.connect()).to.eventually.eql(true);
    });
  });
});
