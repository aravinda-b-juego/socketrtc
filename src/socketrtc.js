const SimplePeer = require('simple-peer');

const IS_BROWSER = typeof window != 'undefined';

class CustomEvents {
    constructor() {
        this.events = {};
    }

    on(event, listener) {
        // If the event doesn't exist in the events object, create an empty array for it
        if (!this.events[event]) {
            this.events[event] = [];
        }
        
        // Add the listener to the event's array of listeners
        this.events[event].push(listener);
    }

    emit(event, ...args) {
        if (this.events[event]) {
            this.events[event].forEach(callback => callback(...args));
        }
    }
}

class SocketRTC {
    constructor(socketConfig, rtcconfig = {}) {

        this.socket = null;
        this.events = new CustomEvents();
        if (IS_BROWSER) {
            // Browser environment
            this.config = Object.assign({initiator: true}, rtcconfig);
            const socketioclient = require('socket.io-client');
            this.socket = socketioclient(socketConfig.url);
            this.initializeClient();
        } else {
            // Node.js environment
            const wrtc = require('wrtc');
            this.config = Object.assign({ wrtc: wrtc }, rtcconfig);
            this.io = require('socket.io')(socketConfig.server);
            this.clients = {};
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
        this.events.on(event, listener);
    }

    emit(event, ...args) {
        this.events.emit(event, ...args);
    }

    initializeServer() {
        this.io.on('connection', (socket) => {
            this.socket = socket;
            const peer = new SimplePeer(this.config);
            const id = socket.id;
            peer.socketId = id;
            peer.events = new CustomEvents();

            this.clients[id] = peer;
            // console.log('socket connected', socket.id);
            peer.on('connect', () => {
                this.emit('connect', peer);
            });

            peer.on('signal', (data) => {
                this.socket.emit('signal', data);
            });

            peer.on('data', (data) => {
                const [event, ...args] = JSON.parse(data);
                peer.events.emit(event, ...args);
            });

            peer.on('close', () => {
                console.log('peerconnection closed');
                delete this.clients[id];
            });

            peer.on('error', (err) => {
                this.emit('error', err);
            })

            socket.on('signal', (data) => {
                peer.signal(data);
            });

            socket.on("disconnect", async (event) => {
                this.emit('disconnect', event);
                delete this.clients[id];
                peer.destroy();
            })

            socket.on('error', (err) => {
                this.emit('error', err);
            });
        })

        const broadcastMessage = (event, ...args) => {
            const allClients = Object.keys(this.clients);

            for (let i = 0; i < allClients.length; i++) {
                if (allClients[i]) {
                    // console.log(`Sending message from ${pdata.sender} to ${allClients[i]}`)
                    try {
                        this.clients[allClients[i]].send(JSON.stringify([event, ...args]));
                    } catch (error) {
                        console.log(`error sending to ${allClients[i]}`, error.message)
                    }
                }
            };
        }
        this.broadcast = broadcastMessage;


        const except = (id) => {
            // const excludedClient = clients[id];
            const sendExcept = (message) => {
                Object.entries(this.clients).forEach(([clientId, client]) => {
                    if (clientId !== id && client.connected) {
                        client.send(message);
                    }
                });
            };

            return {
                send: sendExcept,
                emit
            };
        }
        this.except = except;
    }

    initializeClient() {
        // const clients = {};

        this.socket.on('connect', () => {
            // console.log('socket connected');
        });
        const peer = new SimplePeer(this.config);

        // console.log(peer)
        peer.on('signal', (data) => {
            this.socket.emit('signal', data);
        });

        peer.on('connect', () => {
            this.emit('connect', this.socket.id);
        });

        peer.on('data', (data) => {
            const [event, ...args] = JSON.parse(data);
            this.emit(event, ...args);
        });

        peer.on('close', () => {
            peer.destroy();
        });

        peer.on('error', (err) => {
            this.emit('error', err);
        })

        this.socket.on('signal', (data) => {
            peer.signal(data);
        });

        this.socket.on('disconnect', (event) => {
            this.emit('disconnect', event);
        });

        this.socket.on('error', (err) => {
            this.emit('error', err);
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
