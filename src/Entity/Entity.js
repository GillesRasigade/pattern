'use strict';

const EventEmitter = require('events').EventEmitter;

module.exports = class Entity extends EventEmitter {
  /**
   * Creates an instance of Entity.
   *
   * @param {Object} [snapshot={}]
   * @param {Array} [events=[]]
   */
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
   * @returns {Entity}
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
   * @returns {Entity}
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
   * @returns {Entity}
   */
  setEvents(events = []) {
    this._events = events;
    return this;
  }
  /**
   * Build a new entity snapshot based on current entity data and reset events
   * stack.
   *
   * @returns {Entity}
   */
  buildSnapshot() {
    return this
      .setSnapshot(this.data)
      .setEvents([]);
  }
  /**
   * Push a new event to the entity stack.
   *
   * @param {String} method The method to be called on replay
   * @param {Array} [args=[]] Arguments to apply the function on
   * @returns {Entity}
   */
  push(method, args = []) {
    if (!this._replaying) {
      this._events.push({
        method, args,
        timestamp: Date.now(),
        version: ++this._version,
      });
    }

    return this;
  }
  /**
   * Replay the current events stack from entity snapsho.
   *
   * @returns {Entity}
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
};
