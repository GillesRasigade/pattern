'use strict';

const WebSocket = require('ws');
// const WebSocket = require('uws');
const WebSocketServer = WebSocket.Server;
const net = require('net')

const co = require('co');

const Queue = require('./Queue');

/**
 * WEBSOCKET_PORT
 * @alias WEBSOCKET_PORT
 * @type {Integer}
 */
const WEBSOCKET_PORT = process.env.WEBSOCKET_PORT || 4080;

/**
 * WEBSOCKET_RECONNECT_TIMEOUT
 * @alias WEBSOCKET_RECONNECT_TIMEOUT
 * @type {Integer}
 */
const WEBSOCKET_RECONNECT_TIMEOUT = process.env.WEBSOCKET_RECONNECT_TIMEOUT || 100;

/**
 * WEBSOCKET_RECONNECT_MAX_ATTEMPTS
 * @alias WEBSOCKET_RECONNECT_MAX_ATTEMPTS
 * @type {Integer}
 */
const WEBSOCKET_RECONNECT_MAX_ATTEMPTS = process.env.WEBSOCKET_RECONNECT_MAX_ATTEMPTS || 10;

/**
 * Queue over WebSocket
 *
 * @description
 *
 * The objective of the WebSocket queue is to perform client to client real-time
 * communication based on the EventEmitter model.
 *
 * client A <-> server <-> client B
 *
 * The server is the man in the middle.
 *
 * Each client is subscribing functions to a specific topic. The server is
 * broadcasting to any client which have explicitly subscribed their interest
 * to the message topic.
 *
 * The communication can go:
 * - from the client to the server
 * - from a client to subscribed clients
 * - from the server to subscribed clients
 *
 * @DONE Currently a crash of the server does not restart automatically the
 *       WebSocket server. This has to be done but the EADDRINUSE is not
 *       catched properly on the ws level.
 *
 * @TODO How to allow vertical scalability between websocket servers and clients
 *       When all servers are listening on a specific event and send data to their
 *       client, the scalability is validated.
 *       However, when a client is sending a message to the server, this message
 *       must be propagated to each WebSocket as well.
 *       A solution can be to use QueueAmqp or QueueRedis for this.
 *
 * @alias QueueWebSocket
 * @constructor
 *
 * @see Queue
 * @see https://github.com/einaros/ws
 * @see WEBSOCKET_PORT
 * @see [example](../examples/queue-websocket.js)
 *
 * @example
 *
 * const QueueWebSocket = require('QueueWebSocket');
 *
 * const server = new QueueWebSocket({
 *   name: 'server',
 *   server: true
 * });
 * const alice = new QueueWebSocket({
 *   name: 'Alice'
 * });
 * const bernard = new QueueWebSocket({
 *   name: 'Bernard'
 * });
 *
 * // Server and clients connection:
 * yield server.connect();
 * yield alice.connect();
 * yield bernard.connect();
 *
 * alice.on('bernard', msg => {
 *   console.log('Message coming from Bernard: ' + msg);
 * });
 * bernard.on('alice', msg => {
 *   console.log('Message coming from Alice: ' + msg);
 * });
 *
 * alice.emit('alice', 'Hello Bernard !');
 * bernard.emit('bernard', 'Hello Alice !');
 *
 * // Message coming from Alice: Hello Bernard !
 * // Message coming from Bernard: Hello Alice !
 */
class QueueWebSocket extends Queue {
  constructor(options) {
    super(options);

    this.name = this._options.name || 'queue';

    this.ws = null;
  }

  /**
   * @return {Number} WEBSOCKET_RECONNECT_TIMEOUT
   */
  get WEBSOCKET_RECONNECT_TIMEOUT() {
    return this._options.WEBSOCKET_RECONNECT_TIMEOUT || WEBSOCKET_RECONNECT_TIMEOUT;
  }

  /**
   * @return {Number} WEBSOCKET_RECONNECT_MAX_ATTEMPTS
   */
  get WEBSOCKET_RECONNECT_MAX_ATTEMPTS() {
    return this._options.WEBSOCKET_RECONNECT_MAX_ATTEMPTS || WEBSOCKET_RECONNECT_MAX_ATTEMPTS;
  }

  /**
   * @return {Number} WEBSOCKET_PORT
   */
  get WEBSOCKET_PORT() {
    return this._options.WEBSOCKET_PORT || WEBSOCKET_PORT;
  }

  /**
   * @return {Boolean} Does this queue a server ?
   */
  get isServer () {
    return this._options.server || false;
  }

  /**
   * Return the formatted client address to listen to.
   * @return {String} ws://[host]:[port] address
   */
  get address () {
    return `ws://${this._options.host || 'localhost'}:${this.WEBSOCKET_PORT}`;
  }

  static addTopic(ws, topic) {
    const len = ws._topics.length;
    if (len === 0 || ws._topics[len-1] !== topic) {
      ws._topics.push(topic);
    }
  }

  /**
   * Close the websocket safely
   * @return {QueueWebSocket} The queue to be closed
   */
  close(callback) {
    if (this.ws) {
      if (this._supervisor) {
        this._supervisor.removeAllListeners();
        this._supervisor.close(1000, '');
      }
      this.ws.removeAllListeners();
      if (this.isServer) {
        this.ws.close(callback);
      } else {
        this.ws.on('close', callback || function(){});
        this.ws.close(1000, '');
      }

    } else if (typeof callback === 'function' ) {
      callback();
    }
    return this;
  }

  /**
   * Broadcast a message on every connected clients.
   * **Only a WebSocket server** can broadcast messages to clients.
   *
   * @param  {String} message Message to send
   * @param  {String} topic Topic to use to broadcast on
   * @return {QueueWebSocket} The queue used to broadcast
   */
  broadcast(message, topic) {
    if (!this.isServer) {
      throw new Error('Only WebSocket Server can broadcast');
    }

    const self = this;
    for(var i in self.ws.clients) {
      const topics = self.ws.clients[i]._topics;
      if (-1 !== topics.indexOf(topic)) {
        self.ws.clients[i].send(message);
      }
    }
    return this;
  }

  /**
   * Callback called when a message is sent to the QueueWebSocket.
   * @param  {String} message The message sent
   * @param  {Object} flags   List of flags used for the communication
   * @return {QueueWebSocket} The queue binded to the websocket
   */
  onMessage(message, flags) {
    if (flags.binary) {
      throw new Error('Binary flag not yet supported =)');
    } else {
      const data = JSON.parse(message);
      if (this.queue.isServer) {
        // Special case of client subscription:
        if (data.subscribe) {
          QueueWebSocket.addTopic(this, data.subscribe);
        } else {
          this.queue.broadcast(message, data.topic);
        }
      }

      if (data.topic) {
        data.args = data.args;
        data.args.unshift(data.topic);
        super.emit.apply(this.queue, data.args);
      }
    }
    return this.queue;
  }

  /**
   * Reconnect the client or server queue if disconnected
   * @return {QueueWebSocket} The queue binded to the websocket
   */
  reconnect() {
    const self = this;
    const ws = this.ws;

    self._attempts = 0;
    const cb = co.wrap(function* () {
      if (self._attempts > self.WEBSOCKET_RECONNECT_MAX_ATTEMPTS) {
        return false;
      }

      self._attempts++;
      if (self.isServer) {

        QueueWebSocket.portInUse(self.WEBSOCKET_PORT, co.wrap(function* (err, res) {
          if (res === false) {
            yield self.connect();
          } else {
            timeout = setTimeout(cb, self.WEBSOCKET_RECONNECT_TIMEOUT);
          }
        }))
      } else {
        const supervisor = new WebSocket(self.address);

        supervisor.on('error', () => {
          timeout = setTimeout(cb, self.WEBSOCKET_RECONNECT_TIMEOUT);
        });

        supervisor.on('open', co.wrap(function* () {
          supervisor.close();

          yield self.connect();

          // Client queue is reconnecting with topics:
          for (const topic in ws._topics) {
            const callbacks = ws._topics[topic];
            for (const i in callbacks) {
              self.removeListener(topic, callbacks[i]);
              self.on(topic, callbacks[i]);
            }
          }

        }))
      }
    });

    let timeout = setTimeout(cb, self.WEBSOCKET_RECONNECT_TIMEOUT);

    return this;
  }

  /**
   * onClose callback when a websocket client or supervisor is disconnected.
   * @return {QueueWebSocket} The queue binded to the websocket
   */
  onClose() {
    return this.queue.reconnect();
  }

  /**
   * Create the WebSocket server
   * @return {Promise} Resolved
   */
  connectServer() {
    const self = this;
    return new Promise((resolve, reject) => {
      self.ws = new WebSocketServer({ port: self.WEBSOCKET_PORT });
      self.ws.queue = self;

      self.ws.on('error', self.onClose);
      self.ws.on('connection', ws => {
        ws.queue = self;
        ws._topics = [];
        ws.on('message', self.onMessage);
        // ws.on('close', this.onClose);
      });
      resolve(true);

      self._supervisor = new WebSocket(self.address);
      self._supervisor.queue = self;
      self._supervisor._topics = [];

      self._supervisor.on('open', () => {
        self._supervisor.on('close', self.onClose);
      });
    });

  }

  connectClient() {
    const self = this;
    return new Promise((resolve, reject) => {
      self.ws = new WebSocket(self.address);
      self.ws.queue = self;
      self.ws._topics = {};
      self.ws.on('open', () => {
        // self.bindEvents();
        self.ws.on('message', self.onMessage);
        self.ws.on('close', self.onClose);
        self.ws.on('error', self.onClose);
        resolve(true);
      });
    });
  }

  /**
   * Connect the WebSocket queue.
   *
   * @return {Promise} - True when connected
   */
  connect() {
    const self = this;
    if (this.isServer) {
      return this.connectServer();
    }

    return this.connectClient();
  }

  /**
   * Emit a new message to the queue.
   *
   * @return {QueueWebSocket} - The queue on which to emit the message
   */
  emit(topic) {
    const args = Array.from(arguments).slice(1); // eslint-disable-line prefer-rest-params
    const msg = JSON.stringify({
      topic, args
    });
    if (this.isServer) {
      this.broadcast(msg, topic);
      super.emit.apply(this, arguments);
    } else {
      this.ws.send(msg, { mask: true });
    }
    // super.emit(topic, data);
    return this;
  }

  subscribe(topic) {
    this.ws.send(JSON.stringify({
      subscribe: topic
    }), { mask: true });
    return this;
  }

  /**
   * Listen to new messages emitted from the queue.
   *
   * @return {QueueWebSocket} - The queue to be listened
   */
  on(topic, func) {
    super.on(topic, func);
    if (!this.isServer) {
      // Register the topics to the ws:
      // if (!this.ws._topics) this.ws._topics = {};
      if (!this.ws._topics[topic]) this.ws._topics[topic] = [];
      this.ws._topics[topic].push(func);

      // Send Websocket message to bind on specific message only.
      this.subscribe(topic);
    }
    return this;
  }

  static portInUse (port, callback) {
    const server = net.createServer();

    server.listen(port, '127.0.0.1');
    server.on('error', function (e) {
      callback(null, true);
    });
    server.on('listening', function (e) {
      server.close();
      callback(null, false);
    });
  }
}

module.exports = QueueWebSocket;
