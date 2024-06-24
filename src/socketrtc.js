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
        this.events = {};
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

    initializeServer() {
        const clients = {};
        this.io.on('connection', (socket) => {
            this.socket = socket;
            const peer = new SimplePeer(this.config);
            const id = socket.id;
            clients[id] = peer;
            peer.socketId = id;
            peer.events = new CustomEvents();

            // console.log('socket connected', socket.id);
            peer.on('connect', () => {
                this.emit('connect', peer);
            });

            peer.on('signal', (data) => {
                this.socket.emit('signal', data);
            });

            peer.on('data', (data) => {
                this.emit('message', data);
                sendMessage(data);
            });

            peer.on('close', () => {
                console.log('peerconnection closed');
                delete clients[id];
            });

            peer.on('error', (err) => {
                this.emit('error', err);
            })

            socket.on('signal', (data) => {
                peer.signal(data);
            });

            socket.on("disconnect", async (event) => {
                this.emit('disconnect', event);
                delete clients[id];
                peer.destroy();
            })

            socket.on('error', (err) => {
                this.emit('error', err);
            });
        })

        const sendMessage = (data, to = null) => {
            const pdata = JSON.parse(data);
            const allClients = Object.keys(clients);

            if(to != null) {
                if(clients[to])
                    clients[to].send(data);
                return;
            }
            for (let i = 0; i < allClients.length; i++) {
                if (allClients[i] !== pdata.sender) {
                    // console.log(`Sending message from ${pdata.sender} to ${allClients[i]}`)
                    try {
                        clients[allClients[i]].send(data);
                    } catch (error) {
                        console.log(`error sending to ${allClients[i]}`, error.message)
                    }
                }
            };
        }
        this.send = sendMessage;

        const except = (id) => {
            // const excludedClient = clients[id];
            const sendExcept = (message) => {
                Object.entries(clients).forEach(([clientId, client]) => {
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
            // const pdata = JSON.parse(data)
            this.emit('message', data);
            // console.log(`Received message from ${pdata.from}: ${pdata.data}`);
            // chatBox.value += 'Peer: ' + data + '\n';
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

        const sendMessage = (message) => {
            if (peer && peer.connected) {
                peer.send(message);
            } else {
                console.error('Peer is not connected');
            }
        }

        this.send = sendMessage;
    }

}

module.exports = SocketRTC;
