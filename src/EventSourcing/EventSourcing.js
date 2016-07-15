'use strict';

const EventEmitter = require('events').EventEmitter;

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
    }, snapshot);
    this._version = this._snapshot._version;
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
    this._events = events;
    return this;
  }
  /**
   * Build a new entity snapœshot based on current entity data and reset events
   * stack.
   *
   * @returns {EventSourcing}
   */
  buildSnapshot() {
    return this
      .setSnapshot(this.data)
      .setEvents([]);
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
      this._events.push(event);
      this.emit('pushed', event);
    }

    return this;
  }
  /**
   * Replay the current events stack from entity snapshop.
   *
   * @returns {EventSourcing}
   */
  replay() {
    this._replaying = true;

    this.init(this._snapshot, this._events);

    for (const event of this._events) {
      if (!(typeof this[event.method] === 'function')) {
        throw new Error(`${event.method} method not found`);
      }

      this[event.method].apply(this, event.args);
      this._version = event.version;
    }

    this._replaying = false;

    return this;
  }
}

module.exports = EventSourcing;
