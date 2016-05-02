'use strict';

global.api = {};

global.application = require('./emitter.js').emitter;

application.on('smth', function(data) {
  console.dir(data);
});

application.on('*', function(name, data) {
  console.dir([name, data]);
});

application.emit('smth', { a: 5 });
