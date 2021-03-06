'use strict';

const assert = require('assert');

/**
 * @class Command
 * @constructor
 *
 * @description
 * Undoable command
 *
 * @example
 * const a = { sum: 0 };
 *
 * const command = new Command(
 *   (subject, inc) => subject.sum += inc,
 *   (subject, inc) => subject.sum -= inc,
 *   [a, 1]
 * );
 *
 * command.execute();
 * // a.sum = 1
 *
 * command.undo();
 * // a.sum = 0
 */
class Command {
  /**
   * @param {Object} context - context of the command
   * @param {Function} execute - function for action
   * @param {Object} executeArguments - context of the command
   * @param {Function} undo - function for undo
   * @param {Object} undoArguments - context of the command
   */
  constructor(context, execute, executeArguments = [], undo = null, undoArguments = []) {
    this._context = context;

    assert(
      typeof context[execute] === 'function' ||
      typeof context.constructor[execute] === 'function',
      'Wrong input parameter: execute must be a valid function in context');
    assert(executeArguments instanceof Array,
      'Wrong input parameter: executeArguments must be an array');

    // Command execution standard workflow:
    this._execute = execute;
    this._executeArguments = executeArguments;

    if (undo !== null) {
      assert(typeof context[undo] === 'function',
        'Wrong input parameter: undo must be a valid function in context');
      assert(undoArguments instanceof Array,
        'Wrong input parameter: undoArguments must be an array');

      // Command undo workflow:
      this._undo = undo;
      this._undoArguments = undoArguments;
      this._undoable = true;
    } else {
      this._undoable = false;
    }
  }

  /**
   * Is the command undoable.
   *
   * @returns {Boolean} True if undoable, false otherwise
   */
  undoable() {
    return this._undoable;
  }

  /**
   * Apply the given function with arguments in the command context.
   *
   * @private
   * @param {Function} method Function to call
   * @param {Array} [args=[]] Arguments to apply on
   * @returns {mixed}
   */
  _apply(method, args = []) {
    if (typeof this._context.emit === 'function') {
      this._context.emit('execute', method, args);
    }
    const fn = this._context[method] || this._context.constructor[method];
    return fn.apply(this._context, args);
  }

  /**
   * Execute the command function with the given arguments
   *
   * @returns {mixed}
   */
  execute() {
    return this._apply(this._execute, this._executeArguments);
  }

  /**
   * Undo the command if possible.
   *
   * @see #undoable
   * @exception {Error} Raises an exception if the command is not _undoable_
   * @returns {mixed}
   */
  undo() {
    if (!this.undoable()) {
      throw new Error('Command is not undoable');
    }
    return this._apply(this._undo, this._undoArguments);
  }
}

module.exports = Command;
