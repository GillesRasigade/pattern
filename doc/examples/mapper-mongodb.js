'use strict';

const co = require('co');

class User {
  constructor(data = {}) {
    this.data = data;
  }
  get _id() {
    return this.data._id;
  }
  toJSON() {
    return this.data;
  }
}

function* main() {
  // Require the mapper class:
  const MapperMongoDb = require('../../index').MapperMongoDb;

  // Instanciate the mapper with default values:
  const mapper = new MapperMongoDb();

  // Connect the database:
  yield mapper.connect();

  // Creation of the new user:
  let user = new User({
    firstname: 'Alice'
  });

  // Save it in database:
  user = yield mapper.saveObject(user);

  // Perform tasks such as loading objects:
  const alice = yield mapper.getObject(user._id, User);

  yield mapper.close();

  return alice;
}

return co(main.apply(null, process.argv.slice(2)))
.then(console.log, console.error);
