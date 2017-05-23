# {pattern}

[![npm version](https://badge.fury.io/js/%40gilles.rasigade%2Fpattern.svg)](https://badge.fury.io/js/%40gilles.rasigade%2Fpattern) [![Build Status](https://travis-ci.org/GillesRasigade/pattern.svg?branch=master)](https://travis-ci.org/GillesRasigade/pattern) [![Test Coverage](https://codeclimate.com/github/GillesRasigade/pattern/badges/coverage.svg)](https://codeclimate.com/github/GillesRasigade/pattern/coverage) [![Code Climate](https://codeclimate.com/github/GillesRasigade/pattern/badges/gpa.svg)](https://codeclimate.com/github/GillesRasigade/pattern) [![Documentation Status](https://readthedocs.org/projects/pattern/badge/?version=latest)](http://pattern.readthedocs.org/en/latest/?badge=latest) [![npm dependencies](https://david-dm.org/GillesRasigade/pattern.svg)](https://david-dm.org/GillesRasigade/pattern.svg)

_Useful patterns and components for NodeJS applications._

## Roadmap

### Validator

A Validator is a component validating a data against a schema. Currently the only
Validator available is for JSON data and JSON Schema definition.

- [x] JSON Schema
- [ ] Date
- [ ] Number

### Queues

Queues are based on the Interface of EventEmitter where a message can be routed
to one or several suscribers. Different technologies can be used to distribute
message: EventEmitter, AMQP, WebSocket. By combining all these three approaches
a message can transit from a browser to another browser in a fully scalable and
distributed manner.

- [x] EventEmitter
- [x] AMQP
- [x] WebSocket
- [x] Redis

### Mappers

Mappers are responsible of the Extract (E) and Load (L) parts from the ETL stack.
From a given object definition, she is able to load data from a specific data
source and persists it in.

- [x] MongoDb
- [ ] Swagger API
- [ ] Mock
- [ ] Redis
- [ ] PostgreSQL

### Entity

An Entity is a Domain object embedding the business logic. She is persisted
thanks to the Mapper components.

- [x] Entity

### Localization

Component responsible of the localization of strings, currencies, date, etc.

### Logger

Logger component

### Under consideration

## Getting started

### Installation

```bash
npm install -S @gilles.rasigade/pattern
```

### Require

```js
const pattern = require('@gilles.rasigade/pattern');
```

### Documentation

You can find the documentation of the project at the following url:
http://gillesrasigade.github.io/pattern/documentation

## Contribute

### Clone and build the code

```bash
git clone git@github.com:GillesRasigade/pattern.git
cd pattern
npm build
```

### Build

The `build` npm command will install all dependencies required for the development
environment, execute tests to validate the installation then generate documentation
for the project.

To build the project, please execute the following command:

```bash
npm run build
```

### Documentation

The project documentation is available after the build process in the folder
`./doc/pattern/index.html`
