const pattern = require('../../..');

const a = {
  sum: 0,
  incr() {
    this.sum++;
  },
  decr() {
    this.sum--;
  }
};

const commands = new pattern.Commands(a);

commands.execute('incr', [], 'decr', []);
console.log(`a.sum = ${a.sum}`); // a.sum = 1;

commands.undo();
console.log(`a.sum = ${a.sum}`); // a.sum = 0;

commands.redo();
console.log(`a.sum = ${a.sum}`); // a.sum = 1;
