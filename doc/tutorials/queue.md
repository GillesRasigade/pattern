### [Queue](./Queue.html)

The Queue object is simple exposing the EventEmitter interface and can be used as explained in the official [NodeJs documentation](https://nodejs.org/api/events.html).

No configuration is required and you can just refer to the queue

```js
const pattern = require('@gilles.rasigade/pattern');

const queue = new pattern.Queue();

queue.on('task', message => {
  console.log(message);
});

queue.emit('task', 'A coffee please !');

```

### [QueueAmqp](./QueueAmqp.html)

To follow this tutorial, please open a free account on [Heroku](https://www.heroku.com/), create an app in US and add the plugin [RabbitMQ Bigwig](https://elements.heroku.com/addons/rabbitmq-bigwig). The US is for now the only location supporting this plugin.

More information here: https://devcenter.heroku.com/articles/rabbitmq-bigwig

After this step, you will have 2 more environment variables configured in your application:

```bash
// For consumers:
RABBITMQ_BIGWIG_RX_URL='amqp://user:pass@instance.ip/resourceid'

// For producers:
RABBITMQ_BIGWIG_TX_URL='amqp://user:pass@instance.ip/resourceid2'
```

Export these variables to your development environment, then execute the following example code:

```js
const pattern = require('@gilles.rasigade/pattern');

const queue = new pattern.QueueAmqp({
  queue: 'tasks',
  rx: true,
  tx: true
});

queue
.connect()
.then(() => {
  queue.on('task', message => {
    console.log(message);
  });

  queue.emit('task', 'A coffee please !');
});
```

You will see the following line to your terminal:

```bash
A coffee please !
```

This line is indicating that the connection to your [RabbitMQ Bigwig](https://elements.heroku.com/addons/rabbitmq-bigwig) is successful and that the message has been sent then consume without issue.

To confirm on your own, please go to your management console and check the activity:

> [https://bigwig.lshift.net/management/#####](https://bigwig.lshift.net/management/)
