'use strict';

/**
 * Undoable command.
 * @class Command
 *
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
   * @param {Function} execute - function for action
   * @param {Function} undo - function for undo
   * @param {Object} args - context of the command
   */
  constructor(execute, undo, args) {
    this._execute = execute;
    this._undo = undo;

    // Addition context for this command:
    this._args = args || [];
  }

  /**
   * Execute the command function with the given arguments
   */
  execute() {
    return this._execute.apply(this, this._args);
  }

  /**
   * Undo the command function
   */
  undo() {
    return this._undo.apply(this, this._args);
  }
}

module.exports = Command;
