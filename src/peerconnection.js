const SimplePeer = require('simple-peer');

const PeerConnection = (socketObj) => {
    let peer;
    const socket = socketObj;
    const createPeerConnection = (self, config) => {
        peer = new SimplePeer(config);

        peer.on('connect', () => {
            self._emit('connect', peer);
        });

        peer.on('signal', (data) => {
            socket.emit('signal', data);
        });

        peer.on('data', (data) => {
            const [event, ...args] = JSON.parse(data);
            peer.events.emit(event, ...args);
        });

        peer.on('close', () => {
            console.log('peerconnection closed');
        });

        peer.on('error', (err) => {
            self._emit('error', err);
        })

        return peer;
    }

    const destroyPeerConnection = () => {
        if (peer) {
            if(!peer.destroyed)
                peer.destroy();

            peer.off('connect', () => {
                self._emit('connect', peer);
            });

            peer.off('signal', (data) => {
                socket.emit('signal', data);
            });

            peer.off('data', (data) => {
                const [event, ...args] = JSON.parse(data);
                peer.events.emit(event, ...args);
            });

            peer.off('close', () => {
                console.log('peerconnection closed');
            });

            peer.off('error', (err) => {
                self._emit('error', err);
            })

        }
    }
    return {
        createPeerConnection,
        destroyPeerConnection
    }
}

module.exports = PeerConnection;