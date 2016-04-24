'use strict';

const redis = require('redis');
const co = require('co');

const Queue = require('./Queue');

/**
 * REDISCLOUD_URL
 * @alias REDISCLOUD_URL
 * @type {String}
 */
const REDISCLOUD_URL = process.env.REDISCLOUD_URL;

/**
 * Queue over Redis
 *
 * @alias QueueRedis
 * @constructor
 *
 * @see Queue
 * @see https://github.com/antirez/redis
 * @see REDISCLOUD_URL
 *
 * @param {Object} options - Queue configuration
 * @param {String|Boolean} options.url - Redis database URL
 *
 * @example
 *
 * const QueueRedis = require('QueueRedis');
 *
 * const queue = new QueueRedis({ url: true });
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
class QueueRedis extends Queue {
  constructor(options) {
    super(options);
    if (this._options.url === true) {
      this._options.url = REDISCLOUD_URL;
    }

    this.name = this._options.name || 'queue';
  }

  /**
   * Connect the Redis queue.
   *
   * @return {Promise} - True when connected
   */
  connect() {
    const self = this;
    return co(function* connect() {
      self.rx = redis.createClient(self._options.url);
      self.tx = redis.createClient(self._options.url);
      return true;
    });
  }

  /**
   * Close the RX / TX channels.
   *
   * @return {QueueRedis} - The queue to be closed
   */
  close() {
    this.rx.quit();
    this.tx.quit();
    return this;
  }

  /**
   * Emit a new message to the queue.
   *
   * @return {QueueRedis} - The queue to be closed
   */
  emit(topic) {
    const args = Array.from(arguments).slice(1); // eslint-disable-line prefer-rest-params
    const msg = JSON.stringify(args);
    this.tx.publish(topic, msg);
  }

  /**
   * Listen to new messages emitted from the queue.
   *
   * @return {QueueRedis} - The queue to be closed
   */
  on(topic, func) {
    this.rx.subscribe(topic);
    this.rx.on('message', (channel, message) => {
      const args = JSON.parse(message);
      func.apply(null, args);
    });
  }
}

module.exports = QueueRedis;
