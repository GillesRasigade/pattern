'use strict';

// const MapperAbstract = require('../../src/Mapper/MapperAbstract');
const MapperMongoDb = require('../../src/Mapper/MapperMongoDb');

describe('MapperMongoDb', () => {
  it('implements the MapperInterface', () => {
    expect(MapperMongoDb.prototype.saveObject).to.be.a('function');
    expect(MapperMongoDb.prototype.getObject).to.be.a('function');
    expect(MapperMongoDb.prototype.deleteObject).to.be.a('function');
    expect(MapperMongoDb.prototype.findObjects).to.be.a('function');
  });
  it('implements additional methods', () => {
    expect(typeof MapperMongoDb.prototype.connect).to.be.eql('function');
    expect(MapperMongoDb.prototype.getObjectCollectionName).to.be.a('function');
    expect(MapperMongoDb.prototype.getObjectCollection).to.be.a('function');
  });
  it('allows to connect to the database', function* it() {
    const mapper = new MapperMongoDb();
    yield mapper.connect();
    expect(mapper.connection).to.be.an('object');
  });
  it('allows to close the connection to the database', function* it() {
    const mapper = new MapperMongoDb();
    yield mapper.close();
    expect(mapper.connection).to.be.eql(null);

    yield mapper.connect();
    expect(mapper.connection).to.be.an('object');

    yield mapper.close();
    expect(mapper.connection).to.be.eql(null);
  });

  describe('#getObjectCollectionName', () => {
    it('retrieves the object collection name from string', () => {
      const mapper = new MapperMongoDb();
      const collection = mapper.getObjectCollectionName('user');
      expect(collection).to.be.eql('user');
    });
    it('retrieves the object collection name from constructor', () => {
      const mapper = new MapperMongoDb();

      function User() {}
      const collection = mapper.getObjectCollectionName(User);
      expect(collection).to.be.eql('user');
    });
    it('retrieves the object collection name from prototype collection', () => {
      const mapper = new MapperMongoDb();

      function User() {}
      User.prototype.collection = () => 'users';

      const user = new User();

      const collection = mapper.getObjectCollectionName(user);
      expect(collection).to.be.eql('users');
    });
    it('retrieves the object collection name from constructor name', () => {
      const mapper = new MapperMongoDb();

      function User() {}

      const user = new User();

      const collection = mapper.getObjectCollectionName(user);
      expect(collection).to.be.eql('user');
    });
  });

  describe('#getObjectCollection', () => {
    it('retrieves the object collection name from string', function* it() {
      const mapper = new MapperMongoDb();
      yield mapper.connect();

      function User() {}
      const user = new User();

      const collection = mapper.getObjectCollection(user);
      expect(collection).to.be.an('object');
      expect(collection).to.have.property('s');
      expect(collection.s).to.have.property('db');
    });
  });

  describe('CRUD', () => {
    const mapper = new MapperMongoDb();
    function User(data) {
      this._data = data || {};
    }
    User.prototype.toJSON = function toJSON() {
      return Object.assign({}, this._data);
    };

    before(function* before() {
      yield mapper.connect();
    });
    after(function* after() {
      yield mapper.close();
    });
    it('allows to save object in MongoDb database', function* it() {
      const joe = new User({
        firstname: 'Joe',
      });
      // Save the object:
      const saved = yield mapper.saveObject(joe);
      expect(saved.toJSON()).to.not.be.eql(joe.toJSON());
      expect(saved.toJSON()).to.have.property('_id');
    });
    it('allows to update object in MongoDb database', function* it() {
      const joe = new User({
        firstname: 'Joe',
      });
      // Save the object:
      const saved = yield mapper.saveObject(joe);
      expect(saved.toJSON()).to.not.be.eql(joe.toJSON());

      saved._data.lastname = 'Dalton';
      const updated = yield mapper.saveObject(saved);
      expect(updated.toJSON()).to.have.property('lastname', 'Dalton');
    });
    it('allows to load object from MongoDb database', function* it() {
      const william = new User({
        firstname: 'William',
      });
      // Save the object:
      const saved = yield mapper.saveObject(william);

      // Load object from database:
      const loaded = yield mapper.getObject(saved._data._id, User);

      expect(loaded).to.be.an.instanceof(User);
      expect(loaded.toJSON()).to.be.eql(saved.toJSON());
    });
    it('allows to load object from MongoDb database by ObjectId', function* it() {
      const william = new User({
        firstname: 'William',
      });
      // Save the object:
      const saved = yield mapper.saveObject(william);

      const collection = mapper.getObjectCollection(william);

      // eslint-disable-next-line new-cap
      const objectId = collection.s.pkFactory.ObjectID(saved._data._id);

      // Load object from database:
      const loaded = yield mapper.getObject(objectId, User);

      expect(loaded).to.be.an.instanceof(User);
      expect(loaded.toJSON()).to.be.eql(saved.toJSON());
    });
    it('allows to delete object from MongoDb database', function* it() {
      const jack = new User({
        firstname: 'Jack',
      });
      // Save the object:
      const saved = yield mapper.saveObject(jack);

      const deleted = yield mapper.deleteObject(saved);
      expect(deleted.toJSON()).to.be.eql(saved.toJSON());

      const loadedAfterDelete = yield mapper.getObject(saved._data._id, User);

      expect(loadedAfterDelete).to.be.eql(null);
    });
  });
});
