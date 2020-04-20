var localVideo;
var localStream;
var remoteVideo;
var peerConnection;
var uuid;
var serverConnection;
var unmuted = false;

var peerConnectionConfig = {
    'iceServers': [{
            'urls': [ 'stun:192.168.96.139:3478', 'stun:stun.l.google.com:19302' ]
        },
    ]
};

let audioContext = null;
let refCount = 0;

function acquireAudioContext() {
    refCount++;
    if (refCount && !audioContext) {
        audioContext = new AudioContext();
    }
    return audioContext;
}

function releaseAudioContext() {
    refCount--;
    if (!refCount && audioContext) {
        audioContext.close();
        audioContext = null;
    }
}

function connectionOpened(e) {
    e.target.send(JSON.stringify({'rtc': true}));
}

function pageReady() {
    uuid = createUUID();
    serverConnection = new WebSocket('ws://' + window.location.host);
    serverConnection.onmessage = gotMessageFromServer;
    serverConnection.onopen = connectionOpened;
}

function createPeer() {
    peerConnection = new RTCPeerConnection(peerConnectionConfig);
    peerConnection.onicecandidate = gotIceCandidate;
    peerConnection.ontrack = gotRemoteStream;
}

function gotMessageFromServer(message) {
    if (!peerConnection) {
        createPeer();
    }

    var signal = JSON.parse(message.data);

    if (signal.uuid == uuid)
        return;

    if (signal.sdp) {
        peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(function() {
            // Only create answers in response to offers
            if (signal.sdp.type == 'offer') {
                peerConnection.createAnswer().then(createdDescription).catch(errorHandler);
            }
        }).catch(errorHandler);
    } else if (signal.ice) {
        console.log('add ice');
        peerConnection.addIceCandidate(new RTCIceCandidate(signal.ice)).catch(errorHandler);
    }
}

function gotIceCandidate(event) {
    console.log('got ice');
    if (event.candidate != null) {
        serverConnection.send(JSON.stringify({
            'ice': event.candidate,
            'uuid': uuid
        }));
    }
}

function createdDescription(description) {
    console.log('got description');

    peerConnection.setLocalDescription(description).then(function() {
        serverConnection.send(JSON.stringify({
            'sdp': peerConnection.localDescription,
            'uuid': uuid
        }));
    }).catch(errorHandler);
}

function gotRemoteStream(event) {
    console.log('got remote stream');
}

function startAud() {
    if (unmuted) {
        return;
    }

    unmuted = true;
    const audioContext = acquireAudioContext();
    const remoteStream = new MediaStream(peerConnection.getReceivers().map(receiver => receiver.track));

    const remoteAudio = document.createElement('audio');
    remoteAudio.srcObject = remoteStream;
    remoteAudio.play();
    document.body.appendChild(remoteAudio);

    const source = audioContext.createMediaStreamSource(remoteStream);
    console.log(source);
}

function errorHandler(error) {
    console.log(error);
}

// Taken from http://stackoverflow.com/a/105074/515584
// Strictly speaking, it's not a real UUID, but it gets the job done here
function createUUID() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    }

    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}
