'use strict';

const DefaultRTCPeerConnection = require('wrtc').RTCPeerConnection;

const Connection = require('./connection');

const TIME_TO_CONNECTED = 10000;
const TIME_TO_HOST_CANDIDATES = 3000; // NOTE(mroberts): Too long.
const TIME_TO_RECONNECTED = 10000;

class WebRtcConnection extends Connection {
    constructor(id, options = {}) {
        super(id);

        options = {
            RTCPeerConnection: DefaultRTCPeerConnection,
            beforeOffer() {},
            clearTimeout,
            setTimeout,
            timeToConnected: TIME_TO_CONNECTED,
            timeToHostCandidates: TIME_TO_HOST_CANDIDATES,
            timeToReconnected: TIME_TO_RECONNECTED,
            ...options
        };

        const {
            RTCPeerConnection,
            beforeOffer,
            timeToConnected,
            timeToReconnected
        } = options;

        const peerConnection = new RTCPeerConnection({
            sdpSemantics: 'unified-plan',
            iceServers: [{
                urls: 'stun:172.17.0.1:3478'
            }]
        });

        beforeOffer(peerConnection);

        let connectionTimer = options.setTimeout(() => {
            if (peerConnection.iceConnectionState !== 'connected' &&
                peerConnection.iceConnectionState !== 'completed') {
                this.close();
            }
        }, timeToConnected);

        let reconnectionTimer = null;

        const onIceConnectionStateChange = () => {
            if (peerConnection.iceConnectionState === 'connected' ||
                peerConnection.iceConnectionState === 'completed') {
                if (connectionTimer) {
                    options.clearTimeout(connectionTimer);
                    connectionTimer = null;
                }
                options.clearTimeout(reconnectionTimer);
                reconnectionTimer = null;
            } else if (peerConnection.iceConnectionState === 'disconnected' ||
                peerConnection.iceConnectionState === 'failed') {
                if (!connectionTimer && !reconnectionTimer) {
                    const self = this;
                    reconnectionTimer = options.setTimeout(() => {
                        self.close();
                    }, timeToReconnected);
                }
            }
        };

        peerConnection.addEventListener('iceconnectionstatechange', onIceConnectionStateChange);

        this.doOffer = async () => {
            console.log('dooffer');
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            try {
                await waitUntilIceGatheringStateComplete(peerConnection, options);
            } catch (error) {
                this.close();
                throw error;
            }
        };

        this.applyAnswer = async answer => {
            console.log('applyanswer');
            await peerConnection.setRemoteDescription(answer);
        };

        this.close = () => {
            peerConnection.removeEventListener('iceconnectionstatechange', onIceConnectionStateChange);
            if (connectionTimer) {
                options.clearTimeout(connectionTimer);
                connectionTimer = null;
            }
            if (reconnectionTimer) {
                options.clearTimeout(reconnectionTimer);
                reconnectionTimer = null;
            }
            peerConnection.close();
            super.close();
        };

        this.toJSON = () => {
            return {
                ...super.toJSON(),
                iceConnectionState: this.iceConnectionState,
                localDescription: this.localDescription,
                remoteDescription: this.remoteDescription,
                signalingState: this.signalingState
            };
        };

        Object.defineProperties(this, {
            iceConnectionState: {
                get() {
                    return peerConnection.iceConnectionState;
                }
            },
            localDescription: {
                get() {
                    return descriptionToJSON(peerConnection.localDescription, true);
                }
            },
            remoteDescription: {
                get() {
                    return descriptionToJSON(peerConnection.remoteDescription);
                }
            },
            signalingState: {
                get() {
                    return peerConnection.signalingState;
                }
            }
        });
    }
}

function descriptionToJSON(description, shouldDisableTrickleIce) {
    return !description ? {} : {
        type: description.type,
        sdp: shouldDisableTrickleIce ? disableTrickleIce(description.sdp) : description.sdp
    };
}

function disableTrickleIce(sdp) {
    return sdp.replace(/\r\na=ice-options:trickle/g, '');
}

async function waitUntilIceGatheringStateComplete(peerConnection, options) {
    var candidates = false;

    if (peerConnection.iceGatheringState === 'complete') {
        return;
    }

    const {
        timeToHostCandidates
    } = options;

    const deferred = {};
    deferred.promise = new Promise((resolve, reject) => {
        deferred.resolve = resolve;
        deferred.reject = reject;
    });

    const timeout = options.setTimeout(() => {
        peerConnection.removeEventListener('icecandidate', onIceCandidate);
        if (candidates) {
            deferred.resolve();
        } else {
            deferred.reject(new Error('Timed out waiting for host candidates'));
        }
    }, timeToHostCandidates);

    function onIceCandidate({candidate}) {
        candidates = true;
        if (!candidate) {
            options.clearTimeout(timeout);
            peerConnection.removeEventListener('icecandidate', onIceCandidate);
            deferred.resolve();
        }
    }

    peerConnection.addEventListener('icecandidate', onIceCandidate);

    await deferred.promise;
}

module.exports = WebRtcConnection;