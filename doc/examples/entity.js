'use strict';

const co = require('co');
const Entity = require('../..').Entity;

const ADDRESS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    street: {
      type: 'string',
      default: 'rue Lamblardie',
    },
  },
}

const USER_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    firstname: {
      type: 'string',
      default: 'Firstname',
    },
    address: {
      $ref: 'Address.json'
    }
  },
}

class User extends Entity {
  constructor(data = {}) {
    super(data, USER_SCHEMA);
  }
}

function* main() {
  const alice = new User({
    firstname: 'Alice'
  });

  alice.firstname = 123;
  // alice._data.test = 1234;

  console.log(30, alice.isValid());

  return alice;
}

return co(main.apply(null, process.argv.slice(2)))
.then(console.log, console.error);
