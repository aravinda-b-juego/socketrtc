const CustomEvents = require('./events');

class BaseRTC {
    constructor() {
        this._events = new CustomEvents();
    }

    /**
     * Adds a listener for the specified event.
     *
     * @param {string} event - The event to listen for.
     * @param {Function} listener - The function to execute when the event is triggered.
     */
    on(event, listener = () => {}) {
        this._events.on(event, listener);
    }

    /**
     * Emits an event with optional arguments.
     *
     * @param {string} event - The event to emit.
     * @param {...*} args - The arguments to pass to the listeners.
     */
    _emit(event, ...args) {
        this._events.emit(event, ...args);
    }
}

module.exports = BaseRTC;