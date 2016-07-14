'use strict';

const a = { sum: 0 };

const Command = require('./Command');
const Commands = require('./Commands');

const commands = new Commands(a);

const command = new Command(
  (subject, inc) => subject.sum += inc,
  (subject, inc) => subject.sum -= inc,
  [a, 1]
);

commands.execute(
  (subject, inc) => subject.sum += inc,
  (subject, inc) => subject.sum -= inc,
  [a, 1]
);

console.log(a, commands, commands.index);

commands.execute(command);

console.log(a, commands, commands.index);

commands.undo();

console.log(a, commands.index);

commands.redo();

console.log(a, commands.index);

commands.undo();

console.log(a, commands.index);

const command2 = new Command(
  (subject, inc) => subject.sum += inc,
  (subject, inc) => subject.sum -= inc,
  [a, 2]
);

commands.execute(
  (subject, inc) => subject.sum += inc,
  (subject, inc) => subject.sum -= inc,
  [a, 2]
);

console.log(a, commands);

process.exit(0);


// const command = new Command(
//   (subject, inc) => subject.sum += inc,
//   (subject, inc) => subject.sum -= inc,
//   [a, 1]
// );

// command.execute();
// console.log(a);
// // a.sum = 4

// command.undo();
// console.log(a);
// // a.sum = 0