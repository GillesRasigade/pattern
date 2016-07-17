'use strict';

const Command = require('./Command');

/**
 * Commands collection.
 * @class Commands
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
  /**
   * @constructor
   */
  constructor(context) {
    // Store the commands context:
    this.context = context;

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
    const command = execute instanceof Command ?
      execute : new Command(this.context, execute, executeArguments, undo, undoArguments);

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
}

module.exports = Commands;
