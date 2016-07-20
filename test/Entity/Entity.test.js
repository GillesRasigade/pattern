const Entity = require('../../src/Entity/Entity');
const Errors = require('../../src/Entity/Errors');

describe('Entity', () => {
  const PERSON_SCHEMA = Object.freeze({
    type: 'object',
    properties: {
      firstname: {
        type: 'string',
        default: 'Alice',
      },
      lastname: {
        type: 'string',
      },
      address: {
        type: 'object',
        properties: {
          street: {
            type: 'string',
            default: '12, rue de Paradis',
          },
          zipcode: {
            type: 'string',
            default: '75001',
          },
          city: {
            type: 'string',
            default: 'Paris',
          },
          country: {
            type: 'string',
            default: 'France',
          },
        },
      },
    },
  });
  class Person extends Entity {
    setFirstname(firstname) {
      this.firstname = firstname;
    }
  }
  Person.SCHEMA = PERSON_SCHEMA;

  describe('constructor', () => {
    it('creates a new entity instance successfully', () => {
      const alice = new Person();
      expect(alice).to.be.an.instanceof(Person);
      expect(alice).to.have.property('validator');
      expect(alice).to.have.property('commands');
      expect(alice).to.have.property('_constructor', Person);
      expect(alice).to.have.property('_entityName', 'Person');
    });
    it('creates a new entity instance with default values from schema', () => {
      const alice = new Person();
      expect(alice).to.have.property('firstname', 'Alice');
      expect(alice).to.have.property('lastname', undefined);
      expect(alice).to.have.property('address');
      expect(alice.address).to.deep.equal({
        city: 'Paris',
        country: 'France',
        street: '12, rue de Paradis',
        zipcode: '75001',
      });
    });
    it('does not redefine getters and setters for properties in schema', () => {
      class Person2 extends Entity {
        get firstname() {
          return 'ok';
        }
      }
      Person2.SCHEMA = PERSON_SCHEMA;
      const alice = new Person2();
      expect(alice.firstname).to.be.equal('ok');
    });
  });
  describe('commands and event sourcing', () => {
    it('register commands in the event sourcing events stack', function* it() {
      const bernard = new Person();
      bernard.commands.execute('setFirstname', ['Bernard'], 'setFirstname', [bernard.firstname]);
      expect(bernard).to.have.property('firstname', 'Bernard');
      expect(bernard._sourcedEvents).to.have.property('length', 1);
      expect(bernard.commands.history).to.have.property('length', 1);

      // Create Bernard from snapshot and events stack:
      const bernard2 = yield (new Person())
        .init(bernard._snapshot, bernard._sourcedEvents)
        .replay();
      expect(bernard2).to.have.property('firstname', 'Bernard');
      expect(bernard2._sourcedEvents).to.have.property('length', 1);
      expect(bernard2.commands.history).to.have.property('length', 0);

      // Undo the last command:
      bernard.commands.undo();
      expect(bernard).to.have.property('firstname', 'Alice');
      expect(bernard._sourcedEvents).to.have.property('length', 2);

      // Redo the last undo:
      bernard.commands.redo();
      expect(bernard).to.have.property('firstname', 'Bernard');
      expect(bernard._sourcedEvents).to.have.property('length', 3);
    });
    // const alice = new Person({
    //   firstname: 'Alice',
    //   address: {
    //     city: 'Lyon'
    //   }
    // });
    // alice.address.street = 'hello';
    // console.log(11, alice.data, alice.firstname);

    // alice.commands.execute('sayHello', ['John'], 'sayGoodBye', ['John']);
    // console.log(alice._sourcedEvents);

    // alice.address.street = 123;
    // console.log(62, alice.isValid());

    // const bernard = new Person();
    // console.log(63, 'Replaying');
    // bernard.init(alice._snapshot, alice._sourcedEvents).replay();
  });
  describe('validation', () => {
    it('validates entity against schema', () => {
      const bernard = new Person();
      expect(bernard.isValid()).to.be.eql(true);
    });
    it('invalidates entity against schema', () => {
      const bernard = new Person({
        firstname: 123,
      });
      expect(bernard.isValid()).to.be.eql(false);
    });
    it('validates entity without schema', () => {
      class Void extends Entity {}
      const _void = new Void();
      _void.data.test = 1;
      expect(_void.isValid()).to.be.eql(true);
    });
  });
  describe('mutator', () => {
    it('raises MutatorError if not redefined', () => {
      const bernard = new Person();
      expect(bernard.mutator).throws(Errors.MutatorError);
    });
  });
  describe('accessor', () => {
    it('raises AccessorError if not redefined', () => {
      const bernard = new Person();
      expect(bernard.accessor).throws(Errors.AccessorError);
    });
  });
});
