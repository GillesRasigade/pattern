'use strict';

const assert = require('assert');
const defaults = require('json-schema-defaults');
const _ = require('lodash');

const EventSourcing = require('../EventSourcing/EventSourcing');
const Validator = require('../Validator/Validator');
const Commands = require('../Command/Commands');
const Errors = require('./Errors');

const entityValidator = new Validator();

class Entity extends EventSourcing {
  constructor(data = {}, validator = entityValidator) {
    assert(new.target && new.target.name !== 'Entity',
      'Cannot construct Entity instance directly');

    if (new.target.initialized !== true) {
      Entity.initConstructor(new.target);
    }

    assert(new.target.initialized === true,
      'Cannot construct Entity instance without initializing it');

    // Build data based on the entity schema:
    const _data = _.merge({}, defaults(new.target.SCHEMA), data);

    super(_data);

    this.validator = validator;
    this.commands = new Commands(this);

    this.on('execute', this.push.bind(this));

    // Attach the entityName:
    this._constructor = new.target;
    this._entityName = new.target.name;
  }
  /**
   * Initialize the Entity with the
   */
  static initConstructor(constructor) {
    if (!constructor.SCHEMA) {
      // eslint-disable-next-line no-param-reassign
      constructor.SCHEMA = {};
    }
    // Add Entity schema to the validator:
    entityValidator.addSchema(constructor, constructor.SCHEMA);

    // Expose getter and setter to schema properties:
    Entity._defineGettersSetters(constructor);

    // Set constructor as initialized:
    // eslint-disable-next-line no-param-reassign
    constructor.initialized = true;
  }
  /**
   * Check whether the instance data is valid against schema.
   *
   * @returns {boolean}
   */
  isValid() {
    return this.validator.isValid(this);
  }
  /**
   * Define default getters and setters to exposed first level schema properties.
   *
   * @returns {void}
   */
  static _defineGettersSetters(constructor) {
    const schema = constructor.SCHEMA;
    if (schema && schema.properties) {
       // eslint-disable-next-line no-restricted-syntax
      for (const key in schema.properties) {
        if (!constructor.prototype.hasOwnProperty(key)) {
          Object.defineProperty(constructor.prototype, key, {
            // eslint-disable-next-line object-shorthand
            get: function get() {
              return this.data[key];
            },
            // eslint-disable-next-line object-shorthand
            set: function set(value) {
              this.data[key] = value;
            },
            enumerable: false,
            configurable: false,
          });
        }
      }
    }
  }
  mutator() {
    throw new Errors.MutatorError('Must be implemented');
  }
  accessor() {
    throw new Errors.AccessorError('Must be implemented');
  }
}

module.exports = Entity;
