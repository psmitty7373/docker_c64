/* global Scope */
'use strict';

const { acquireAudioContext, releaseAudioContext } = require('../lib/browser/webaudio/refcountedaudiocontext');
const ConnectionClient = require('../lib/client');

async function beforeAnswer(peerConnection) {
  console.log('here');
  const audioContext = acquireAudioContext();

  const remoteStream = new MediaStream(peerConnection.getReceivers().map(receiver => receiver.track));

  const remoteAudio = document.createElement('audio');
  remoteAudio.srcObject = remoteStream;
  remoteAudio.play();
  document.body.appendChild(remoteAudio);

  const source = audioContext.createMediaStreamSource(remoteStream);

  const canvas = document.createElement('canvas');
  document.body.appendChild(canvas);

  let dataChannel = null;

  // NOTE(mroberts): This is a hack so that we can get a callback when the
  // RTCPeerConnection is closed. In the future, we can subscribe to
  // "connectionstatechange" events.
  const { close } = peerConnection;
  peerConnection.close = function() {
    remoteAudio.remove();
    remoteAudio.srcObject = null;

    canvas.remove();
    scope.stop();

    clearInterval(interval);
    releaseAudioContext();

    return close.apply(this, arguments);
  };
}

function createStartStopButton(onStart, onStop) {
  const startButton = document.createElement('button');
  startButton.innerText = 'Start';
  document.body.appendChild(startButton);

  const stopButton = document.createElement('button');
  stopButton.innerText = 'Stop';
  stopButton.disabled = true;
  document.body.appendChild(stopButton);

  startButton.addEventListener('click', async () => {
    startButton.disabled = true;
    try {
      await onStart();
      stopButton.disabled = false;
    } catch (error) {
      startButton.disabled = false;
      throw error;
    }
  });

  stopButton.addEventListener('click', async () => {
    stopButton.disabled = true;
    try {
      await onStop();
      startButton.disabled = false;
    } catch (error) {
      stopButton.disabled = false;
      throw error;
    }
  });
}

const connectionClient = new ConnectionClient();

  let peerConnection = null;

  createStartStopButton(async () => {
    peerConnection = await connectionClient.createConnection({beforeAnswer});
    window.peerConnection = peerConnection;
  }, () => {
    peerConnection.close();
  });



//createExample('sine-wave', description, { beforeAnswer });
