const express = require('express');
const http = require('http');
const path = require('path');
const SocketRTC = require('../src/socketrtc');

const app = express();
const server = http.createServer(app);

const PORT = 8001;

app.use(express.static(path.join(__dirname, '../')));

const socketRTC = new SocketRTC({ server })

socketRTC.on('connect', (peer) => {
    console.log('peer connection established: ', peer.socketId);

    peer.events.on('message', (data) => {
        console.log('message from peer: ', data);
        socketRTC.broadcast('message', data); // broadcast message
        // socketRTC.to(peer.socketId).send('message', data); // send message to particular peer
    })
})

socketRTC.on('disconnect', (data) => {
    console.log('peer connection disconnected', data);
})

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});


