'use strict';

const bodyParser = require('body-parser');
const browserify = require('browserify-middleware');
const express = require('express');
const app = express();
const wss = require('ws');
const http = require('http').Server(app);
const wrtc = require('wrtc');
const ws = new wss.Server({server: http});
const uuidv4 = require('uuid/v4');
const RTCAudioSourceSineWave = require('./lib.js');

var peerConnectionConfig = {
	sdpSemantics: 'unified-plan',
	iceServers: [
		{'urls': [ 'stun:192.168.96.139:3478', 'stun:stun.l.google.com:19302' ]},
    ]
};

function gotRemoteStream(e) {
	console.log('gots', e);
}

function gotIceCandidate(e, s) {
	s.send(JSON.stringify({'ice': e.candidate, 'uuid': s.uuid}));
}

function errorHandler(e) {
	console.log('err', e);
}

function iceStateChange(e) {
	console.log(e);
}

function createdDescription(s, desc) {
	console.log('desc', desc);
	s.peerConnection.setLocalDescription(new wrtc.RTCSessionDescription(desc)).then(function() {
		s.uuid == uuidv4();
		s.send(JSON.stringify({ 'sdp': s.peerConnection.localDescription, 'uuid': s.uuid }));
	}).catch(errorHandler);
}

ws.on('connection', function(s) {
    s.peerConnection = null;
	console.log('connect');

	s.peerConnection = new wrtc.RTCPeerConnection(peerConnectionConfig);
	s.peerConnection.addEventListener('icecandidate', event => gotIceCandidate(event, s));
	s.peerConnection.addEventListener('iceconnectionstatechange', iceStateChange);

	const source = new RTCAudioSourceSineWave();
    const track = source.createTrack();

    s.peerConnection.addTrack(track);
    s.peerConnection.createOffer().then(desc => createdDescription(s, desc)).catch(errorHandler);

	s.on('message', function(message) {
        var signal = JSON.parse(message);

		if(signal.sdp) {
			s.peerConnection.setRemoteDescription(new wrtc.RTCSessionDescription(signal.sdp)).then(function() {

			// Only create answers in response to offers
				if(signal.sdp.type == 'offer') {
					s.peerConnection.createAnswer().then(createdDescription).catch(errorHandler);
				}
			}).catch(errorHandler);
		} else if(signal.ice) {
			s.peerConnection.addIceCandidate(new wrtc.RTCIceCandidate(signal.ice)).catch(errorHandler);
		}
	});
});

ws.broadcast = function(data) {
	  this.clients.forEach(function(client) {
			if(client.readyState === wss.OPEN) {
				  client.send(data);
			}
	  });
};

/*
const WebRtcConnectionManager = require('./lib/server/connections/webrtcconnectionmanager');


app.use(bodyParser.json());

function beforeOffer(peerConnection) {
    const source = new RTCAudioSourceSineWave();
    const track = source.createTrack();
    peerConnection.addTrack(track);

    function onMessage({
        data
    }) {
        console.log(data);
    }

    const {
        close
    } = peerConnection;
    peerConnection.close = function() {
        track.stop();
        source.close();
        return close.apply(this, arguments);
    };
}

const connectionManager = WebRtcConnectionManager.create({
    beforeOffer
});

app.get('/connections', (req, res) => {
    res.send(connectionManager.getConnections());
});

app.post('/connections', async (req, res) => {
    try {
        const connection = await connectionManager.createConnection();
        res.send(connection);
    } catch (error) {
        console.error(error);
        res.sendStatus(500);
    }
});

app.delete('/connections/:id', (req, res) => {
    const {
        id
    } = req.params;
    const connection = connectionManager.getConnection(id);
    if (!connection) {
        res.sendStatus(404);
        return;
    }
    connection.close();
    res.send(connection);
});

app.get('/connections/:id', (req, res) => {
    const {
        id
    } = req.params;
    const connection = connectionManager.getConnection(id);
    if (!connection) {
        res.sendStatus(404);
        return;
    }
    res.send(connection);
});

app.get('/connections/:id/local-description', (req, res) => {
    const {
        id
    } = req.params;
    const connection = connectionManager.getConnection(id);
    if (!connection) {
        res.sendStatus(404);
        return;
    }
    res.send(connection.toJSON().localDescription);
});

app.get('/connections/:id/remote-description', (req, res) => {
    const {
        id
    } = req.params;
    const connection = connectionManager.getConnection(id);
    if (!connection) {
        res.sendStatus(404);
        return;
    }
    res.send(connection.toJSON().remoteDescription);
});

app.post('/connections/:id/remote-description', async (req, res) => {
    const {
        id
    } = req.params;
    const connection = connectionManager.getConnection(id);
    if (!connection) {
        res.sendStatus(404);
        return;
    }
    try {
        await connection.applyAnswer(req.body);
        res.send(connection.toJSON().remoteDescription);
    } catch (error) {
        res.sendStatus(400);
    }
});
app.use('/blah.js', browserify('public/client.js'));
*/

app.use(express.static('public'));

const server = http.listen(3000, () => {
    const address = server.address();
    console.log('Listening on port 3000.');
    server.once('close', () => {
        //connectionManagers.forEach(connectionManager => connectionManager.close());
    });
});
