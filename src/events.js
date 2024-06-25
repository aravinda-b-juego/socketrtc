class CustomEvents {
    constructor() {
        this._events = {};
    }

    on(event, listener) {
        // If the event doesn't exist in the events object, create an empty array for it
        if (!this._events[event]) {
            this._events[event] = [];
        }
        
        // Add the listener to the event's array of listeners
        this._events[event].push(listener);
    }

    emit(event, ...args) {
        if (this._events[event]) {
            this._events[event].forEach(callback => callback(...args));
        }
    }
}

module.exports = CustomEvents;