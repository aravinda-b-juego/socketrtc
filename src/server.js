const SimplePeer = require('simple-peer');
const BaseRTC = require('./basertc');
const CustomEvents = require('./events');

class ServerRTC extends BaseRTC {

    constructor(socketConfig, config) {
        super();
        this._clients = {};
        const wrtc = require('wrtc');
        this._config = Object.assign({ wrtc: wrtc }, config);
        this._io = require('socket.io')(socketConfig.server);
        this._setUp();
    }

    _setUp() {
        this._io.on('connection', (socket) => {
            this._socket = socket;
            const peer = new SimplePeer(this._config);
            const id = socket.id;
            peer.socketId = id;
            peer.events = new CustomEvents();

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

    }

    broadcast(event, ...args) {
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

    to(clientIds) {
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

    except(id) {
        const sendExcept = (event, ...args) => {
            Object.entries(this._clients).forEach(([clientId, client]) => {
                if (clientId !== id && client.connected) {
                    client.send(JSON.stringify([event, ...args]));
                }
            });
        };

        return {
            send: sendExcept
        }
    }
}

module.exports = ServerRTC;