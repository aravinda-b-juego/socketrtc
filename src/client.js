const SimplePeer = require('simple-peer');
const BaseRTC = require('./basertc');

class ClientRTC extends BaseRTC {
    constructor(socketConfig, config) {
        super();
        this._peer = null;
        this._config = Object.assign({initiator: true}, config);
        const socketioclient = require('socket.io-client');
        this._socket = socketioclient(socketConfig.url);
        this._setUp();
    }

    _setUp() {
        // const clients = {};

        this._socket.on('connect', () => {
            // console.log('socket connected');
        });
        this._peer = new SimplePeer(this._config);

        // console.log(peer)
        this._peer.on('signal', (data) => {
            this._socket.emit('signal', data);
        });

        this._peer.on('connect', () => {
            this._emit('connect', this._socket.id);
        });

        this._peer.on('data', (data) => {
            const [event, ...args] = JSON.parse(data);
            this._emit(event, ...args);
        });

        this._peer.on('close', () => {
            this._peer.destroy();
        });

        this._peer.on('error', (err) => {
            this._emit('error', err);
        })

        this._socket.on('signal', (data) => {
            this._peer.signal(data);
        });

        this._socket.on('disconnect', (event) => {
            this._emit('disconnect', event);
        });

        this._socket.on('error', (err) => {
            this._emit('error', err);
        });
    }

    send(event, ...args) {
        if (this._peer && this._peer.connected) {
            this._peer.send(JSON.stringify([event, ...args]));
        } else {
            console.error('Peer is not connected');
        }
    }
}

module.exports = ClientRTC;