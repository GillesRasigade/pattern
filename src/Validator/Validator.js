'use strict';

const tv4 = require('tv4');

/**
 * Validator a Javascript against a JSON Schema thanks to tv4 module.
 *
 * @class Validator
 *
 * @see https://github.com/geraintluff/tv4
 *
 */
class Validator {
  constructor() {
    // Attach a fresh tv4 API to this validator:
    this.tv4 = tv4.freshApi();
  }

  /**
   * Check if the object is valid against its JSON Schema definition.
   *
   * @param  {Object}  obj - Object with toJSON() implemented
   * @return {Boolean}     - True if valid, False otherwise
   */
  isValid(obj) {
    // Get the object schema:
    const schema = this.getSchema(obj);

    const json = typeof obj.toJSON === 'function' ? obj.toJSON() : obj;

    // Validate the object against its schema:
    const isValid = this.tv4.validate(json, schema);

    // Attach the validation error to the object if supported:
    // console.error(this.tv4.error);
    if (isValid !== true && typeof obj.setValidationError === 'function') {
      obj.setValidationError(this.tv4.error);
    }

    return isValid;
  }

  /**
   * Get the JSON Schema definition from the object given as input parameter.
   *
   * @param  {Object} obj - Object to search a JSON Schema for
   * @return {Object}     - JSON Schema definition
   */
  getSchema(obj) {
    // Retrieve the object constructor name:
    const constructor = obj.constructor.name;

    return this.tv4.getSchema(`${constructor}.json`)
      || this.addSchema(obj);
  }

  /**
   * Add a Schema definition for a specific object.
   *
   * @param  {Object} obj    - Object to attache to definition on
   * @param  {String} [path] - Path to the JSON Schema definition
   * @return {Object}        - JSON Schema definition
   */
  addSchema(obj, path) {
    // Retrieve the object constructor name:
    const constructor = this.getClassName(obj);

    let schema = null;
    if (typeof path === 'string') {
      schema = require(path); // eslint-disable-line global-require
    } else if (typeof path === 'object') {
      schema = path;
    } else if (obj.hasOwnProperty('schema')) {
      schema = obj.schema;
    } else if (typeof obj.getValidationSchema === 'function') {
      schema = obj.getValidationSchema();
    } else {
      schema = {};
    }

    // Add the object Schema:
    this.tv4.addSchema(`${constructor}.json`, schema);

    return schema;
  }

  /**
   * Get the className from an object.
   *
   * @param  {String|Object} obj - Object or string
   * @return {String}            - Name of the constructor
   */
  getClassName(obj) {
    // Get the constructor name:
    let name = null;
    if (typeof obj === 'string') {
      name = obj;
    } else if (obj.prototype && obj.prototype.constructor.name) {
      name = obj.prototype.constructor.name;
    } else {
      name = obj.constructor.name;
    }
    return name;
  }
}

module.exports = Validator;
