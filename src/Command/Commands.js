'use strict';

const Command = require('./Command');

/**
 * @class Commands
 * @constructor
 *
 * @param {Object} [context=this] Future commands execution context
 * @param {Constructor} [CommandConstructor=Command] Constructor of the command
 *
 * @description
 *
 * Commands collection.
 *
 * @example
 * const a = { sum: 1 };
 *
 * const commands = new Commands();
 *
 * commands.execute(
 *   (subject, inc) => subject.sum += inc,
 *   (subject, inc) => subject.sum -= inc,
 *   [a, 1]
 * );
 * // a.sum = 1;
 *
 * commands.undo();
 * // a.sum = 0;
 *
 * commands.redo();
 * // a.sum = 1;
 */
class Commands {
  constructor(context = this, CommandConstructor = Command) {
    // Store the commands context:
    this.context = context;
    this.Command = CommandConstructor;

    // Initialize the empty history:
    this.history = [];

    // Current history index:
    this.index = -1;
  }

  /**
   * Push the command to the commands history.
   *
   * @param {Command} command - Undoable command
   * @return {Commands} Commands with updated history
   */
  pushHistory(command) {
    // Push the command to the history:
    this.index++;
    this.history = this.history.slice(0, this.index);
    this.history.push({ date: new Date(), command });

    return this;
  }

  /**
   * Execute the given command
   */
  execute(execute, executeArguments, undo, undoArguments) {
    // Create the command to be executed:
    const command = new this.Command(this.context, execute, executeArguments, undo, undoArguments);

    const result = command.execute();

    // Push the command to the commands history:
    this.pushHistory(command);

    return result;
  }

  /**
   * Undo the last action
   */
  undo() {
    let result = null;
    // Get the last command from the history:
    if (this.history[this.index]) {
      const command = this.history[this.index].command;
      result = command.undo();
      this.index = this.index - 1;
    }

    return result;
  }

  /*
   * Redo the last reversed action
   */
  redo() {
    let result = null;
    const index = this.index + 1;
    if (this.history[index]) {
      const command = this.history[index].command;
      result = command.execute();
      this.index = index;
    }

    return result;
  }

  last() {
    if (this.history.length === 0) return null;

    return this.history[this.history.length - 1];
  }
}

module.exports = Commands;
