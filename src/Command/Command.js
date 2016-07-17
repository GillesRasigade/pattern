'use strict';

const assert = require('assert');

/**
 * Undoable command.
 * @class Command
 *
 * @constructor
 *u
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
  constructor(context, execute, executeArguments = [], undo, undoArguments = []) {
    this._context = context;

    assert(typeof context[execute] === 'function',
      'Wrong input parameter: execute must be a valid function in context');
    assert(executeArguments instanceof Array,
      'Wrong input parameter: executeArguments must be an array');
    assert(typeof context[undo] === 'function',
      'Wrong input parameter: undo must be a valid function in context');
    assert(undoArguments instanceof Array,
      'Wrong input parameter: undoArguments must be an array');

    // Command execution standard workflow:
    this._execute = execute;
    this._executeArguments = executeArguments;

    // Command undo workflow:
    this._undo = undo;
    this._undoArguments = undoArguments;
  }

  /**
   * Execute the command function with the given arguments
   */
  execute() {
    return this._context[this._execute].apply(this._context, this._executeArguments);
  }

  /**
   * Undo the command function
   */
  undo() {
    return this._context[this._undo].apply(this._context, this._undoArguments);
  }
}

module.exports = Command;
