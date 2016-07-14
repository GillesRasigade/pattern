'use strict';

const EventEmitter = require('events').EventEmitter;

const Events = require('./Events');

module.exports = class Entity extends EventEmitter {
  constructor(snapshot = {}, events = []) {
    super();

    this.init(snapshot, events);
    this._replaying = false;
  }
  init(snapshot = {}, events = []) {

    this.setEvents(events);
    this.setSnapshot(snapshot);

    this.data = Object.assign({}, snapshot);
    delete this.data._version;

    return this;
  }
  setSnapshot(snapshot = {}) {
    this._snapshot = Object.assign({
      _version: this._version || 0
    }, snapshot);
    this._version = this._snapshot._version;
    Object.freeze(this._snapshot);
    return this;
  }
  setEvents(events = []) {
    this._events = events;
    return this;
  }
  buildSnapshot() {
    return this
      .setSnapshot(this.data)
      .setEvents([]);
  }
  push(method, args = []) {
    if (!this._replaying) {
      this._events.push({
        method, args,
        timestamp: Date.now(),
        version: ++this._version
      });
    }

    return this;
  }
  replay() {
    this._replaying = true;

    this.init(this._snapshot, this._events);

    for(const event of this._events) {
      if (!(typeof this[event.method] === 'function')) {
        throw new Error(`${event.method} method not found`);
      }

      this[event.method].apply(this, event.args);
      this._version = event.version;
    }

    this._replaying = false;
  }
};
