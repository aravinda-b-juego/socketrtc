const SimplePeer = require('simple-peer');

const IS_BROWSER = typeof window != 'undefined';

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

class SocketRTC {
    constructor(socketConfig, rtcconfig = {}) {

        this._socket = null;
        this._events = new CustomEvents();
        if (IS_BROWSER) {
            // Browser environment
            this._config = Object.assign({initiator: true}, rtcconfig);
            const socketioclient = require('socket.io-client');
            this._socket = socketioclient(socketConfig.url, socketConfig.options);
            this.initializeClient();
        } else {
            // Node.js environment
            const wrtc = require('wrtc');
            this._config = Object.assign({ wrtc: wrtc }, rtcconfig);
            this._io = require('socket.io')(socketConfig.server, socketConfig.options);
            this._clients = {};
            this.initializeServer();
        }

    }

    /**
     * Adds a listener for the specified event.
     *
     * @param {string} event - The event to listen for.
     * @param {Function} listener - The function to execute when the event is triggered.
     */
    on(event, listener) {
        this._events.on(event, listener);
    }

    _emit(event, ...args) {
        this._events.emit(event, ...args);
    }

    initializeServer() {
        this._io.on('connection', (socket) => {
            this._socket = socket;
            const peer = new SimplePeer(this._config);
            const id = socket.id;
            peer.socketId = id;
            peer.events = new CustomEvents();
            peer.events.send = (event, ...args) => {
                peer.send(JSON.stringify([event, ...args]));
            }

            this._clients[id] = peer;
            // console.log('socket connected', socket.id);
            peer.on('connect', () => {
                this._emit('connect', peer);
            });

            peer.on('signal', (data) => {
                this._socket.emit('signal', data);
            });

            peer.on('data', (data) => {
                const [event, ...args] = JSON.parse(data);
                peer.events.emit(event, ...args);
            });

            peer.on('close', () => {
                console.log('peerconnection closed');
                delete this._clients[id];
            });

            peer.on('error', (err) => {
                this._emit('error', err);
            })

            socket.on('signal', (data) => {
                peer.signal(data);
            });

            socket.on("disconnect", async (event) => {
                this._emit('disconnect', event);
                delete this._clients[id];
                peer.destroy();
            })

            socket.on('error', (err) => {
                this._emit('error', err);
            });
        })

        const broadcastMessage = (event, ...args) => {
            const allClients = Object.keys(this._clients);

            for (let i = 0; i < allClients.length; i++) {
                if (allClients[i]) {
                    // console.log(`Sending message from ${pdata.sender} to ${allClients[i]}`)
                    try {
                        this._clients[allClients[i]].send(JSON.stringify([event, ...args]));
                    } catch (error) {
                        console.log(`error sending to ${allClients[i]}`, error.message)
                    }
                }
            };
        }
        this.broadcast = broadcastMessage;

        const to = (clientIds) => {
            const sendTo = (event, ...args) => {
                if(Array.isArray(clientIds)) {
                    for (let i = 0; i < clientIds.length; i++) {
                        const client = this._clients[clientIds[i]];
                        if (client && client.connected) {
                            client.send(JSON.stringify([event, ...args]));
                        }
                    }
                } else {
                    this._clients[clientIds].send(JSON.stringify([event, ...args]));
                }
            };

            return {
                send: sendTo
            };
        }
        this.to = to;

        const except = (id) => {
            // const excludedClient = clients[id];
            const sendExcept = (event, ...args) => {
                Object.entries(this._clients).forEach(([clientId, client]) => {
                    if (clientId !== id && client.connected) {
                        client.send(JSON.stringify([event, ...args]));
                    }
                });
            };

            return {
                send: sendExcept
            };
        }
        this.except = except;
    }

    initializeClient() {
        // const clients = {};

        this._socket.on('connect', () => {
            // console.log('socket connected');
        });
        const peer = new SimplePeer(this._config);

        // console.log(peer)
        peer.on('signal', (data) => {
            this._socket.emit('signal', data);
        });

        peer.on('connect', () => {
            this._emit('connect', this._socket.id);
        });

        peer.on('data', (data) => {
            const [event, ...args] = JSON.parse(data);
            this._emit(event, ...args);
        });

        peer.on('close', () => {
            peer.destroy();
        });

        peer.on('error', (err) => {
            this._emit('error', err);
        })

        this._socket.on('signal', (data) => {
            peer.signal(data);
        });

        this._socket.on('disconnect', (event) => {
            this._emit('disconnect', event);
        });

        this._socket.on('error', (err) => {
            this._emit('error', err);
        });

        const sendMessage = (event, ...args) => {
            if (peer && peer.connected) {
                peer.send(JSON.stringify([event, ...args]));
            } else {
                console.error('Peer is not connected');
            }
        }

        this.send = sendMessage;
    }

}

module.exports = SocketRTC;
