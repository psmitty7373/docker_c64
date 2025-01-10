'use strict';

const bodyParser = require('body-parser');
const browserify = require('browserify-middleware');
const express = require('express');
const app = express();
const wss = require('ws');
const http = require('http').Server(app);
//const wrtc = require('wrtc');
//const ws = new wss.Server({server: http});
//const uuidv4 = require('uuid/v4');
//const RTCAudioSourceSineWave = require('./lib.js');
let connected = false;

/*
var peerConnectionConfig = {
	sdpSemantics: 'unified-plan',
	iceServers: [
		{'urls': [ 'stun:192.168.96.139:3478', 'stun:stun.l.google.com:19302' ]},
    ]
};

function gotRemoteStream(e) {
}

function gotIceCandidate(e, s) {
	s.send(JSON.stringify({'ice': e.candidate, 'uuid': s.uuid}));
}

function errorHandler(e) {
}

function iceStateChange(e) {
}

function createdDescription(s, desc) {
	s.peerConnection.setLocalDescription(new wrtc.RTCSessionDescription(desc)).then(function() {
		s.uuid == uuidv4();
		s.send(JSON.stringify({ 'sdp': s.peerConnection.localDescription, 'uuid': s.uuid }));
	}).catch(errorHandler);
}

ws.on('connection', function(s) {
    s.peerConnection = null;
    s.source = null;
    s.rtc = false;

    if (connected) {
        s.close();
        return;
    }

	s.on('message', function(message) {
        var signal = JSON.parse(message);

        if (signal.rtc) {
            connected = true;

            s.rtc = true;
            s.peerConnection = new wrtc.RTCPeerConnection(peerConnectionConfig);
            s.peerConnection.addEventListener('icecandidate', event => gotIceCandidate(event, s));
            s.peerConnection.addEventListener('iceconnectionstatechange', iceStateChange);

            s.source = new RTCAudioSourceSineWave();
            s.track = s.source.createTrack();

            s.peerConnection.addTrack(s.track);
            s.peerConnection.createOffer().then(desc => createdDescription(s, desc)).catch(errorHandler);

        } else if (signal.sdp) {
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

    s.on('close', function(e) {
        if (s.rtc) {
            s.source.close();
            connected = false;
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
*/
app.use(express.static('public'));

const server = http.listen(3000, () => {
    const address = server.address();
    console.log('Listening on port 3000.');
    server.once('close', () => {
        //connectionManagers.forEach(connectionManager => connectionManager.close());
    });
});
