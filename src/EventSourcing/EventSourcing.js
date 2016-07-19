'use strict';

const EventEmitter = require('events').EventEmitter;
const co = require('co');
const uuid = require('node-uuid');
const jsonpatch = require('fast-json-patch');

/**
 * Creates an instance of Entity.
 *
 * @alias EventSourcing
 * @constructor
 *
 * @param {Object} [snapshot={}]
 * @param {Array} [events=[]]
 *
 * @example
 *
 * class Person extends EventSourcing {
 *   constructor(data = { name: 'unknown' }) {
 *     super(data);
 *   }
 *   setName(name) {
 *     this.push('setName', name);
 *     this.data.name = name;
 *   }
 * }
 *
 * const alice = new Person();
 * alice.setName('Alice');
 *
 * console.log(alice);
 */
class EventSourcing extends EventEmitter {
  constructor(snapshot = {}, events = []) {
    super();

    this.init(snapshot, events);
    this._replaying = false;
  }
  /**
   * Initializes the entity with the given snapshot and events stack.
   *
   * @param {Object} [snapshot={}]
   * @param {Array} [events=[]]
   * @returns {EventSourcing}
   */
  init(snapshot = {}, events = []) {
    this.setEvents(events);
    this.setSnapshot(snapshot);

    this.data = Object.assign({}, snapshot);
    delete this.data._version;

    return this;
  }
  /**
   * Set the snapshot to the current entity.
   *
   * @param {Object} [snapshot={}]
   * @returns {EventSourcing}
   */
  setSnapshot(snapshot = {}) {
    this._snapshot = Object.assign({
      _version: this._version || 0,
      _uuid: this._uuid || uuid(),
    }, snapshot);
    this._version = this._snapshot._version;
    this._uuid = this._snapshot._uuid;
    Object.freeze(this._snapshot);
    return this;
  }
  /**
   * Set the events to the current entity.
   *
   * @param {Array} [events=[]]
   * @returns {EventSourcing}
   */
  setEvents(events = []) {
    this._sourcedEvents = [].concat(events);
    return this;
  }
  /**
   * Build a new entity snapœshot based on current entity data and reset events
   * stack.
   *
   * @returns {EventSourcing}
   */
  buildSnapshot() {
    const events = [].concat(this._sourcedEvents);
    const patch = this.getPatch();
    this
      .setSnapshot(this.data)
      .setEvents([]);

    return {
      _version: this._version,
      _uuid: this._uuid,
      snapshot: this._snapshot,
      events,
      patch,
    };
  }
  /**
   * Push a new event to the entity stack.
   *œ
   * @param {String} method The method to be called on replay
   * @param {Array} [args=[]] Arguments to apply the function on
   * @returns {EventSourcing}
   */
  push(method, args = []) {
    if (!this._replaying) {
      const event = {
        method, args,
        timestamp: Date.now(),
        version: ++this._version,
      };
      this._sourcedEvents.push(event);
      // this.emit('pushed', event);
    }

    return this;
  }
  /**
   * Replay the current events stack from entity snapshop.
   *
   * @returns {EventSourcing}
   */
  replay() {
    const self = this;
    return co(function* replay() {
      self._replaying = true;

      self.init(self._snapshot, self._sourcedEvents);

      for (const event of self._sourcedEvents) {
        if (!(typeof self[event.method] === 'function')) {
          throw new Error(`${event.method} method not found`);
        }

        const result = self[event.method].apply(self, event.args);
        // @FIXME
        if (result
          && result.constructor
          && result.constructor.constructor
          && result.constructor.constructor.name === 'GeneratorFunction') {
          yield result;
        }
        self._version = event.version;
      }

      self._replaying = false;

      return self;
    });
  }
  toJSON() {
    return Object.assign({
      _version: this._version,
      _uuid: this._uuid,
    }, this.data);
  }
  getPatch(origin) {
    return jsonpatch.compare(origin || this._snapshot, this.toJSON());
  }
}

module.exports = EventSourcing;
