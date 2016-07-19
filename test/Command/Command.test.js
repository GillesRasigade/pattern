const Command = require('../../src/Command/Command');

const EventEmitter = require('events').EventEmitter;

describe('Command', () => {
  class Alice {
    constructor(firstname = 'Alice') {
      this.firstname = firstname;
    }
    hello(firstname) {
      return `Hello ${firstname}, my name is ${this.firstname}.`;
    }
    *sing() {
      return 'Singin\' in the rain!';
    }
    bye(firstname) {
      return `Bye ${firstname}.`;
    }
    static sayA() {
      return 'Aaaaah';
    }
  }

  describe('constructor', () => {
    it('creates command successfully', () => {
      const alice = new Alice();
      const command = new Command(alice, 'hello', ['John'], 'bye', ['John']);
      expect(command).to.have.property('_context', alice);
      expect(command).to.have.property('_execute', 'hello');
      expect(command).to.have.property('_executeArguments');
      expect(command._executeArguments).to.deep.equal(['John']);

      expect(command).to.have.property('_undo', 'bye');
      expect(command).to.have.property('_undoArguments');
      expect(command._undoArguments).to.deep.equal(['John']);
    });
    it('raises an exception if execute method does not exist', () => {
      const alice = new Alice();
      expect(() => {
        // eslint-disable-next-line no-new
        new Command(alice, 'goodbye', ['John'], 'hello', ['John']);
      }).throws(Error);
    });
    it('raises an exception if executeArguments is not an array', () => {
      const alice = new Alice();
      expect(() => {
        // eslint-disable-next-line no-new
        new Command(alice, 'hello', 'John', 'bye', ['John']);
      }).throws(Error);
    });
    it('raises an exception if undo method is defined and does not exist', () => {
      const alice = new Alice();
      expect(() => {
        // eslint-disable-next-line no-new
        new Command(alice, 'hello', ['John'], 'byebye', ['John']);
      }).throws(Error);
    });
    it('raises an exception if executeArguments is not an array', () => {
      const alice = new Alice();
      expect(() => {
        // eslint-disable-next-line no-new
        new Command(alice, 'hello', ['John'], 'bye', 'John');
      }).throws(Error);
    });
  });
  describe('execute', () => {
    it('executes the command successfully', () => {
      const alice = new Alice();
      const command = new Command(alice, 'hello', ['John'], 'bye', ['John']);

      expect(command.execute()).to.be.eql('Hello John, my name is Alice.');
    });
    it('executes generator command successfully', function* it() {
      const alice = new Alice();
      const command = new Command(alice, 'sing', [], 'sing', []);

      const result = yield command.execute();
      expect(result).to.be.eql('Singin\' in the rain!');
    });
    it('executes the command on static context', () => {
      const alice = new Alice();
      const command = new Command(alice, 'sayA');

      const result = command.execute();
      expect(result).to.be.eql('Aaaaah');
    });
    it('emits message on command execution if context support it', done => {
      class Charles extends EventEmitter {
        sayHello() {
          return 'hello';
        }
      }
      const charles = new Charles();

      charles.on('execute', (command, args) => {
        expect(command).to.be.eql('sayHello');
        expect(args).to.deep.equal([]);
        done();
      });

      const command = new Command(charles, 'sayHello');

      command.execute();
    });
  });
  describe('undo', () => {
    it('undoes the command successfully', () => {
      const alice = new Alice();
      const command = new Command(alice, 'hello', ['John'], 'bye', ['John']);

      expect(command.undoable()).to.be.eql(true);
      expect(command.undo()).to.be.eql('Bye John.');
    });
    it('undoes generator command successfully', function* it() {
      const alice = new Alice();
      const command = new Command(alice, 'sing', [], 'sing', []);

      const result = yield command.undo();
      expect(result).to.be.eql('Singin\' in the rain!');
    });
    it('allows to execute commands not undoable', function* it() {
      const alice = new Alice();
      const command = new Command(alice, 'sing', []);

      expect(command.undo.bind(command)).throws(Error, 'Command is not undoable');
    });
  });
});
