const Commands = require('../../src/Command/Commands');

describe('Commands', () => {
  class Alice {
    constructor(firstname = 'Alice') {
      this.firstname = firstname;
      this.commands = new Commands(this);
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
  }

  describe('constructor', () => {
    it('creates command successfully', () => {
      const alice = new Alice();
      expect(alice).to.have.property('commands');
      expect(alice.commands).to.have.property('context', alice);
      expect(alice.commands).to.have.property('history');
      expect(alice.commands.history).to.deep.equal([]);
      expect(alice.commands).to.have.property('index', -1);
    });
  });
  describe('execute', () => {
    it('executes command successfully', () => {
      const alice = new Alice();
      const result = alice.commands.execute('hello', ['John'], 'bye', ['John']);
      expect(result).to.be.equal('Hello John, my name is Alice.');
      expect(alice.commands.history).to.have.property('length', 1);
      expect(alice.commands).to.have.property('index', 0);
    });
    it('executes generator command successfully', function* it() {
      const alice = new Alice();
      const result = yield alice.commands.execute('sing', [], 'sing', []);
      expect(result).to.be.equal('Singin\' in the rain!');
      expect(alice.commands.history).to.have.property('length', 1);
      expect(alice.commands).to.have.property('index', 0);
    });
    it('replaces history after undo', function* it() {
      const alice = new Alice();
      yield alice.commands.execute('sing', [], 'sing', []);
      expect(alice.commands.history).to.have.property('length', 1);
      expect(alice.commands).to.have.property('index', 0);
      yield alice.commands.undo();
      expect(alice.commands.history).to.have.property('length', 1);
      expect(alice.commands).to.have.property('index', -1);
      const result = alice.commands.execute('hello', ['John'], 'bye', ['John']);
      expect(result).to.be.equal('Hello John, my name is Alice.');
      expect(alice.commands.history).to.have.property('length', 1);
    });
  });
  describe('undo', () => {
    it('undoes command successfully', () => {
      const alice = new Alice();
      alice.commands.execute('hello', ['John'], 'bye', ['John']);
      const result = alice.commands.undo();
      expect(result).to.be.equal('Bye John.');
    });
    it('undoes generator command successfully', function* it() {
      const alice = new Alice();
      yield alice.commands.execute('sing', [], 'sing', []);
      const result = yield alice.commands.undo();
      expect(result).to.be.equal('Singin\' in the rain!');
    });
    it('undoes nothing if nothing to undo', () => {
      const alice = new Alice();
      const result = alice.commands.undo();
      expect(result).to.be.eql(null);
    });
  });
  describe('redo', () => {
    it('redoes undoed command successfully', () => {
      const alice = new Alice();
      alice.commands.execute('hello', ['John'], 'bye', ['John']);
      alice.commands.undo();
      const result = alice.commands.redo();
      expect(result).to.be.equal('Hello John, my name is Alice.');
    });
    it('redoes undoed generator command successfully', function* it() {
      const alice = new Alice();
      yield alice.commands.execute('sing', [], 'sing', []);
      yield alice.commands.undo();
      const result = yield alice.commands.redo();
      expect(result).to.be.equal('Singin\' in the rain!');
    });
    it('redoes nothing if nothing to redo', () => {
      const alice = new Alice();
      const result = alice.commands.redo();
      expect(result).to.be.eql(null);
    });
  });
  describe('last', () => {
    it('returns last command successfully', () => {
      const alice = new Alice();

      expect(alice.commands.last()).to.be.eql(null);

      alice.commands.execute('hello', ['John'], 'bye', ['John']);

      // @FIXME
      expect(alice.commands.last()).to.not.be.eql(null);
    });
  });
});
