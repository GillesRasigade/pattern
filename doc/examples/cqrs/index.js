'use strict';

const co = require('co');

const pattern = require('../../..');

let mapper, commandEmitter, commandHandler, stateEmitter, stateHandler;

// User class definition:
class User extends pattern.Entity {
  *setData(data = {}) {
    this.data = data;
    return this;
  }
  *setFirstname(firstname) {
    this.firstname = firstname;
    return this;
  }
  *setAge(age) {
    this.age = age;
    return this;
  }
}
User.SCHEMA = {
  type: 'object',
  properties: {
    firstname: {
      type: 'string'
    },
    age: {
      type: 'number'
    }
  }
};

// UserCommands definition:
const userCommands = new pattern.Commands({
  *getUser(_uuid, _version = null) {
    const query = { _uuid };
    if (_version !== null) {
      query._version = _version;
    }
    const data = yield mapper
      .connection
      .collection('event')
      .findOne(query, { snapshot: 1 }, {
      sort: { _id: -1 }
    });
    console.log('getUser data:', _uuid, data);
    const user = new User(data.snapshot);
    console.log(21, user._version);
    return user;
  },
  *createUser(data) {
    const user = new User();
    yield user.commands.execute('setData', [data]);
    return user;
  },

  // All these function does nothing... remove them:
  *setFirstname(uuid, firstname) {
    console.log('setFirstname data:', uuid, firstname);
    const user = yield this.getUser(uuid);
    yield user.commands.execute('setFirstname', [firstname]);
    return user;
  },
  *setAge(uuid, age) {
    const user = yield this.getUser(uuid);
    yield user.commands.execute('setAge', [age]);
    // user.data.age = age;
    return user;
  }
})

function* main() {
  // let { mapper, commandEmitter, commandHandler, stateEmitter, stateHandler } =
  yield before();

  const user = {};

  // 0a. Listen command message
  // 0b. Listen consolidation message
  commandHandler.on('command', (command, args, message) => {
    return co(function* () {
      commandHandler.ack(message);
      console.log('onCommand', command, args);

      const user = yield userCommands.execute(command, args);
      const patch = user.getPatch({});
      console.log('After command', user.data, user._snapshot, { patch });

      console.log(33, user.data, user._snapshot);
      const result = yield mapper.connection.collection('event').save(user.buildSnapshot());
      // const result = yield mapper.connection.collection('event').save({
      //   _version: user._version,
      //   _uuid: user.data._uuid,
      //   snapshot: user._snapshot,
      //   patch
      // });

      if (command === 'createUser') {
        yield commandEmitter.emit('command', 'setFirstname', [ user._uuid, 'July']);
      } else if (command === 'setFirstname') {
        yield commandEmitter.emit('command', 'setAge', [ user._uuid, 21]);
      } else {
        const userV1 = yield userCommands.execute('getUser', [user._uuid, 1]);
        const userV2 = yield userCommands.execute('getUser', [user._uuid, 2]);
        const userV3 = yield userCommands.execute('getUser', [user._uuid, 3]);
        console.log(88, userV1.toJSON(), userV2.toJSON(), userV3.toJSON());

        const events = yield mapper.connection.collection('event').find({
          _uuid: user._uuid
        }, {
          sort: { _id: 1 }
        }).toArray();
        console.log(events);

        const bernard = new User();
        for (var event of events) {
          console.log(112, event.events);
          bernard._sourcedEvents = bernard._sourcedEvents.concat(event.events);
        }
        console.log(114, bernard._sourcedEvents, bernard.toJSON());

        yield bernard.replay();

        console.log(119, bernard.toJSON());
      }

      // console.log('After storing events', result);
    }).then(console.log, console.error);
  });
  stateHandler.on('stateChanged', (args, message) => {
    stateHandler.ack(message);
    console.log('onStateChanged', event);
  });

  // 1. Send command message
  commandEmitter.emit('command', 'createUser', [{ firstname: 'Alice' }]);

  // 2. Command handler processing

  // 3. Store event sourcing

  // 4. Consolidate event sourcing

  // 5. Query

  yield cb => setTimeout(cb, 500);

  yield after();

  return;
}





function* before() {
  commandEmitter = new pattern.QueueAmqp({ tx: 'amqp://localhost', name: 'command' });
  yield commandEmitter.connect();

  commandHandler = new pattern.QueueAmqp({ rx: 'amqp://localhost', name: 'command' });
  yield commandHandler.connect();

  stateEmitter = new pattern.QueueAmqp({ tx: 'amqp://localhost', name: 'state' });
  yield stateEmitter.connect();

  stateHandler = new pattern.QueueAmqp({ rx: 'amqp://localhost', name: 'state' });
  yield stateHandler.connect();

  mapper = new pattern.MapperMongoDb();
  yield mapper.connect({
    url: 'mongodb://localhost:27017/test'
  });
  yield mapper.connection.dropDatabase();

  return { mapper, commandEmitter, commandHandler, stateEmitter, stateHandler };
}
function* after() {
  commandEmitter.close();
  commandHandler.close();
  stateEmitter.close();
  stateHandler.close();
  yield mapper.close();
}

return co(main.apply(null, process.argv.slice(2)))
.then(res => {
  process.exit(0);
}, console.error);
