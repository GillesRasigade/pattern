'use strict';

const amqp = require('amqplib');
const co = require('co');

const Queue = require('./Queue');

/**
 * RABBITMQ_BIGWIG_RX_URL
 * @alias RABBITMQ_BIGWIG_RX_URL
 * @type {String}
 */
const RABBITMQ_BIGWIG_RX_URL = process.env.RABBITMQ_BIGWIG_RX_URL;

/**
 * RABBITMQ_BIGWIG_TX_URL
 * @alias RABBITMQ_BIGWIG_TX_URL
 * @type {String}
 */
const RABBITMQ_BIGWIG_TX_URL = process.env.RABBITMQ_BIGWIG_TX_URL;

/**
 * Channel types RX / TX
 * * RX: consumer
 * * TX: publisher
 *
 * @enum {string}
 */
const QUEUE_AMQP_CHANNEL_TYPES = {
  RX: 'rx',
  TX: 'tx',
};

/**
 * Queue over AMQP
 *
 * @class QueueAmqp
 * @extends {Queue}
 * @constructor
 *
 * @see Queue
 * @see https://github.com/squaremo/amqp.node
 * @see RABBITMQ_BIGWIG_RX_URL
 * @see RABBITMQ_BIGWIG_TX_URL
 *
 * @param {Object} options - Queue configuration
 * @param {String|Boolean} options.rx - AMQP Read Channel URL
 * @param {String|Boolean} options.tx - AMQP Write Channel URL
 * @param {String} [options.name=name] - Queue name
 * @param {String} [options.type=direct] - Amqp queue type
 * @param {String} [options.exchange={}] - Exchange configuration
 *
 * @example
 *
 * const QueueAmqp = require('QueueAmqp');
 *
 * const queue = new QueueAmqp({ queue: 'tasks', rx: true, tx: true });
 *
 * queue
 * .connect()
 * .then(() => {
 *   queue.on('task', message => {
 *     console.log(message);
 *   });
 *   queue.emit('task', 'A coffee please !');
 * });
 */
class QueueAmqp extends Queue {
  constructor(options) {
    super(options);
    if (this._options.rx === true) {
      this._options.rx = RABBITMQ_BIGWIG_RX_URL;
    }
    if (this._options.tx === true) {
      this._options.tx = RABBITMQ_BIGWIG_TX_URL;
    }

    this.name = this._options.name || 'queue';

    this._options.exchangeName = this._options.exchangeName || this.name;
    this._options.queue = this._options.queue || {};
    this._options.type = this._options.type || 'direct';
    this._options.exchange = this._options.exchange || {};
  }

  get queueName() {
    return this._options.queue.name !== undefined ? this._options.queue.name : this.name;
  }

  get exchangeName() {
    return this._options.exchange.name !== undefined ? this._options.exchange.name : this.name;
  }

  get type() {
    return this._options.type;
  }

  /**
   * On close event emission from AMQP for automatic reconnect.
   *
   * @return {Promise} - True when reconnected
   */
  onClose() {
    const self = this;
    return co(function* onClose() {
      self.close();
      yield self.connect();
      return true;
    });
  }

  /**
   * Close the RX / TX channels.
   *
   * @return {QueueAmqp} - The queue to be closed
   */
  close(callback) {
    if (this.rxChannel) {
      this.rxChannel.close();
      this.rx.close.bind(this.rx, callback);
    }
    if (this.txChannel) {
      this.txChannel.close();
      this.tx.close.bind(this.tx, callback);
    }
    return this;
  }

  /**
   * continueect a Rx / Tx queue
   * @param  {QUEUE_AMQP_CHANNEL_TYPES} type Rx or Tx type for the channel
   * @return {QueueAmqp}      [description]
   */
  * connectRxTx(TYPE) {
    const type = QUEUE_AMQP_CHANNEL_TYPES[TYPE];
    if (this._options[type]) {
      // Connect to the queues:
      this[type] = yield amqp.connect(this._options[type]);
      // Create the channels:
      this[`${type}Channel`] = yield this[type].createChannel();
      // Assert queue to exists:
      this[`${type}Channel`].assertQueue(this.queueName, this._options.queue);
      // Assert exchange definition:
      this[`${type}Channel`].assertExchange(
        this.exchangeName, this._options.type, this._options.exchange);
      // If the connection close:
      this[`${type}Channel`].on('close', this.onClose);
    }
    return this;
  }

  /**
   * Connect the AMQP queue.
   *
   * @return {Promise} - True when connected
   */
  connect() {
    const self = this;
    return co(function* connect() {
      yield self.connectRxTx('RX');
      yield self.connectRxTx('TX');
      return true;
    });
  }

  /**
   * Emit a new message to the queue.
   *
   * @return {QueueAmqp} - The queue to be closed
   */
  emit(topic) {
    const args = Array.from(arguments).slice(1); // eslint-disable-line prefer-rest-params
    const msg = JSON.stringify(args);
    this.txChannel.bindQueue(this.queueName, this.exchangeName, topic);
    this.txChannel.publish(this.exchangeName, topic,
      new Buffer(msg), {
        persistent: true,
      }
    );
    return this;
  }

  /**
   * Listen to new messages emitted from the queue.
   *
   * @return {QueueAmqp} - The queue to be closed
   */
  on(topic, func) {
    this.rxChannel.bindQueue(this.queueName, this.exchangeName, topic);
    this.rxChannel.consume(this.queueName, msg => {
      // @todo REMOVE
      if (this._options.ack) {
        this.rxChannel.ack(msg);
      }
      const message = msg.content.toString();
      const args = JSON.parse(message);
      args.push(msg);
      func.apply(null, args);
    });
    return this;
  }

  /**
   * Acknowledge the message
   * @param  {Message} msg Message to acknowledge
   * @return {QueueAmqp}   The queue used to acknowledge
   */
  ack(msg) {
    this.rxChannel.ack(msg);
    return this;
  }

  /**
   * Not acknowledge the message
   * @param  {Message} msg Message to acknowledge
   * @return {QueueAmqp}   The queue used to acknowledge
   */
  nack(msg) {
    this.rxChannel.nack(msg);
    return this;
  }
}

module.exports = QueueAmqp;
