const ClientRTC = require('./client');
const ServerRTC = require('./server');
const IS_BROWSER = typeof window != 'undefined';

class SocketRTC {
    constructor(socketConfig, rtcconfig = {}) {
        if (IS_BROWSER) {
            // Browser environment
            return new ClientRTC(socketConfig, rtcconfig);
        } else {
            // Node.js environment
            return new ServerRTC(socketConfig, rtcconfig);
        }
    }
}

module.exports = SocketRTC;
