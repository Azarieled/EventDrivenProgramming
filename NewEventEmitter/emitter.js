'use strict';

class EventEmitter {
  constructor() {
    this.events = {};
  }

  on(name, callback) {
    let events = this.events;
    events[name] = events[name] || [];
    events[name].push(callback);
  }

  emit(name) {
    let args = [];
    Array.prototype.push.apply(args, arguments);
    let restArgs = args.slice(1);  // no need to pass name argument

    let event = this.events[name];
    if (event) event.forEach(callback => callback.apply(this, restArgs));

    let genericEvent = this.events['*'];
    if (genericEvent) genericEvent.forEach(callback => callback.apply(this, args));
  }
}

exports.emitter = new EventEmitter();
