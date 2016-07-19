const EventSourcing = require('../../src/EventSourcing/EventSourcing');

const EventEmitter = require('events').EventEmitter;

class MyClass extends EventSourcing {
  constructor(data = { x: 0 }) {
    super(data);
  }
  incrementX() {
    this.push('incrementX');
    this.data.x++;
  }
}

describe('EventSourcing', () => {
  describe('Interface', () => {
    it('extends the EventEmitter', () => {
      const entity = new EventSourcing();
      expect(entity).to.be.instanceof(EventEmitter);
    });
  });

  describe('when managing snapshots', () => {
    it('initializes snapshot successfully', () => {
      const Alice = new MyClass();
      expect(Alice._snapshot).to.have.property('x', 0);
      expect(Alice._snapshot).to.have.property('_version', 0);
      expect(Alice._snapshot).to.have.property('_uuid');
    });
    it('freezes snapshot successfully', () => {
      const Alice = new MyClass();
      Alice._snapshot.x = 1;
      expect(Alice._snapshot).to.have.property('x', 0);
      expect(Alice._snapshot).to.have.property('_version', 0);
      expect(Alice._snapshot).to.have.property('_uuid');
    });
    it('builds snapshot successfully', () => {
      const Alice = new MyClass();
      Alice.incrementX();
      Alice.buildSnapshot();
      expect(Alice._snapshot).to.have.property('x', 1);
      expect(Alice._snapshot).to.have.property('_version', 1);
      expect(Alice._snapshot).to.have.property('_uuid');
    });
  });

  describe('when managing events', () => {
    it('initializes events successfully', () => {
      const Alice = new MyClass();
      expect(Alice._sourcedEvents).to.deep.equal([]);
    });
    it('push event to the stack successfully', () => {
      const Alice = new MyClass();
      Alice.incrementX();
      expect(Alice._sourcedEvents).to.be.an('array');
      expect(Alice._sourcedEvents.length).to.be.eql(1);

      const event = Alice._sourcedEvents[0];
      expect(event).to.have.property('version', 1);
      expect(event).to.have.property('timestamp');

      expect(event).to.have.property('method', 'incrementX');
      expect(event).to.have.property('args');
      expect(event.args).to.deep.eql([]);
    });
  });

  describe('when replaying the game', () => {
    it('replays events from snapshot successfully', () => {
      const Alice = new MyClass();
      Alice.incrementX();

      const Bernard = new MyClass();
      Bernard.init(Alice._snapshot, Alice._sourcedEvents).replay();

      expect(Bernard._snapshot).to.deep.equal(Alice._snapshot);
      expect(Bernard.data).to.have.property('x', 1);
    });
    it('raises an exception if event method is not matching', function* it() {
      const Alice = new MyClass();
      Alice.incrementX();

      Alice._sourcedEvents[0].method = 'test';
      return expect(Alice.replay())
        .to.be.rejectedWith(Error, 'test method not found');
    });
  });
});
