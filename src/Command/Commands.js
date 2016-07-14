'use strict';

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
  constructor() {
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
    this.history = this.history.slice(0,this.index);
    this.history.push({date: new Date(), command});
    
    return this;
  }
  
  /**
   * Execute the given command
   */
  execute(execute, undo, args) {
    // Create the command to be executed:
    const command = execute instanceof Command ?
      execute : new Command(execute, undo, args);
    
    // Execute the command first:
    command.execute();
    
    // Push the command to the commands history:
    this.pushHistory(command);
    
    return this;
  }

  /**
   * Undo the last action
   */
  undo() {
    // Get the last command from the history:
    if (this.history[this.index]) {
      this.history[this.index].command.undo();
      this.index = this.index - 1;
    }
    
    return this;
  }
  
  /*
   * Redo the last reversed action
   */
  redo() {
    const index = this.index + 1;
    if (this.history[index]) {
      this.history[index].command.execute();
      this.index = index;
    }
  }
}

module.exports = Commands;

const Command = require('./Command');