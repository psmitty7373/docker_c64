(function() {
    function r(e, n, t) {
        function o(i, f) {
            if (!n[i]) {
                if (!e[i]) {
                    var c = "function" == typeof require && require;
                    if (!f && c)
                        return c(i, !0);
                    if (u)
                        return u(i, !0);
                    var a = new Error("Cannot find module '" + i + "'");
                    throw a.code = "MODULE_NOT_FOUND",
                    a
                }
                var p = n[i] = {
                    exports: {}
                };
                e[i][0].call(p.exports, function(r) {
                    var n = e[i][1][r];
                    return o(n || r)
                }, p, p.exports, r, e, n, t)
            }
            return n[i].exports
        }
        for (var u = "function" == typeof require && require, i = 0; i < t.length; i++)
            o(t[i]);
        return o
    }
    return r
}
)()({
    1: [function(require, module, exports) {
        /* global Scope */
        'use strict';

        require('Scope/dist/Scope.js');

        const createExample = require('../../lib/browser/example');
        const {acquireAudioContext, releaseAudioContext} = require('../../lib/browser/webaudio/refcountedaudiocontext');
        const PitchDetector = require('../../lib/common/pitchdetector');

        const description = 'This example uses node-webrtc&rsquo;s RTCAudioSource to \
generate a sine wave server-side. Use the number input to change the frequency \
of the server-generated sine wave. Frequency changes are sent to the server \
using RTCDataChannel. Finally, pitch is detected client-side and displayed \
alongside the received waveform.';

        async function beforeAnswer(peerConnection) {
            const audioContext = acquireAudioContext();

            const remoteStream = new MediaStream(peerConnection.getReceivers().map(receiver=>receiver.track));

            const remoteAudio = document.createElement('audio');
            remoteAudio.srcObject = remoteStream;
            remoteAudio.play();
            document.body.appendChild(remoteAudio);

            const source = audioContext.createMediaStreamSource(remoteStream);

            const canvas = document.createElement('canvas');
            const scope = new Scope(audioContext,canvas);
            source.connect(scope.input);
            scope.start();
            document.body.appendChild(canvas);

            let dataChannel = null;

            // NOTE(mroberts): This is a hack so that we can get a callback when the
            // RTCPeerConnection is closed. In the future, we can subscribe to
            // "connectionstatechange" events.
            const {close} = peerConnection;
            peerConnection.close = function() {
                remoteAudio.remove();
                remoteAudio.srcObject = null;

                canvas.remove();
                scope.stop();

                clearInterval(interval);
                releaseAudioContext();

                return close.apply(this, arguments);
            }
            ;
        }

        createExample('sine-wave', description, {
            beforeAnswer
        });

    }
    , {
        "../../lib/browser/example": 2,
        "../../lib/browser/webaudio/refcountedaudiocontext": 4,
        "../../lib/common/pitchdetector": 6,
        "Scope/dist/Scope.js": 7
    }],
    2: [function(require, module, exports) {
        'use strict';

        const createStartStopButton = require('./startstopbutton');
        const ConnectionClient = require('../client');

        function createExample(name, description, options) {
            const nameTag = document.createElement('h2');
            nameTag.innerText = name;
            document.body.appendChild(nameTag);

            const descriptionTag = document.createElement('p');
            descriptionTag.innerHTML = description;
            document.body.appendChild(descriptionTag);

            const clickStartTag = document.createElement('p');
            clickStartTag.innerHTML = 'Click &ldquo;Start&rdquo; to begin.';
            document.body.appendChild(clickStartTag);

            const connectionClient = new ConnectionClient();

            let peerConnection = null;

            createStartStopButton(async()=>{
                peerConnection = await connectionClient.createConnection(options);
                window.peerConnection = peerConnection;
            }
            , ()=>{
                peerConnection.close();
            }
            );
        }

        module.exports = createExample;

    }
    , {
        "../client": 5,
        "./startstopbutton": 3
    }],
    3: [function(require, module, exports) {
        'use strict';

        function createStartStopButton(onStart, onStop) {
            const startButton = document.createElement('button');
            startButton.innerText = 'Start';
            document.body.appendChild(startButton);

            const stopButton = document.createElement('button');
            stopButton.innerText = 'Stop';
            stopButton.disabled = true;
            document.body.appendChild(stopButton);

            startButton.addEventListener('click', async()=>{
                startButton.disabled = true;
                try {
                    await onStart();
                    stopButton.disabled = false;
                } catch (error) {
                    startButton.disabled = false;
                    throw error;
                }
            }
            );

            stopButton.addEventListener('click', async()=>{
                stopButton.disabled = true;
                try {
                    await onStop();
                    startButton.disabled = false;
                } catch (error) {
                    stopButton.disabled = false;
                    throw error;
                }
            }
            );
        }

        module.exports = createStartStopButton;

    }
    , {}],
    4: [function(require, module, exports) {
        'use strict';

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

        exports.acquireAudioContext = acquireAudioContext;
        exports.releaseAudioContext = releaseAudioContext;

    }
    , {}],
    5: [function(require, module, exports) {
        'use strict';

        const fetch = require('node-fetch');
        const DefaultRTCPeerConnection = require('wrtc').RTCPeerConnection;
        const {RTCSessionDescription} = require('wrtc');

        const TIME_TO_HOST_CANDIDATES = 3000;
        // NOTE(mroberts): Too long.

        class ConnectionClient {
            constructor(options={}) {
                options = {
                    RTCPeerConnection: DefaultRTCPeerConnection,
                    clearTimeout,
                    host: '',
                    prefix: '.',
                    setTimeout,
                    timeToHostCandidates: TIME_TO_HOST_CANDIDATES,
                    ...options
                };

                const {RTCPeerConnection, prefix, host} = options;

                this.createConnection = async(options={})=>{
                    options = {
                        beforeAnswer() {},
                        stereo: false,
                        ...options
                    };

                    const {beforeAnswer, stereo} = options;

                    const response1 = await fetch(`${host}${prefix}/connections`,{method:'POST'});

                    const remotePeerConnection = await response1.json();
                    const {id} = remotePeerConnection;

                    const localPeerConnection = new RTCPeerConnection({
                        sdpSemantics: 'unified-plan'
                    });

                    // NOTE(mroberts): This is a hack so that we can get a callback when the
                    // RTCPeerConnection is closed. In the future, we can subscribe to
                    // "connectionstatechange" events.
                    localPeerConnection.close = function() {
                        fetch(`${host}${prefix}/connections/${id}`, {
                            method: 'delete'
                        }).catch(()=>{}
                        );
                        return RTCPeerConnection.prototype.close.apply(this, arguments);
                    }
                    ;

                    try {
                        await localPeerConnection.setRemoteDescription(remotePeerConnection.localDescription);

                        await beforeAnswer(localPeerConnection);

                        const originalAnswer = await localPeerConnection.createAnswer();
                        const updatedAnswer = new RTCSessionDescription({
                            type: 'answer',
                            sdp: stereo ? enableStereoOpus(originalAnswer.sdp) : originalAnswer.sdp
                        });
                        await localPeerConnection.setLocalDescription(updatedAnswer);

                        await fetch(`${host}${prefix}/connections/${id}/remote-description`,{method:'POST',body:JSON.stringify(localPeerConnection.localDescription),headers:{'Content-Type':'application/json'}});

                        return localPeerConnection;
                    } catch (error) {
                        localPeerConnection.close();
                        throw error;
                    }
                }
                ;
            }
        }

        function enableStereoOpus(sdp) {
            return sdp.replace(/a=fmtp:111/, 'a=fmtp:111 stereo=1\r\na=fmtp:111');
        }

        module.exports = ConnectionClient;

    }
    , {
        "node-fetch": 8,
        "wrtc": 9
    }],
    6: [function(require, module, exports) {
        'use strict';

        class PitchDetector {
            constructor(options={}) {
                options = {
                    samples: 1024,
                    ...options
                };

                const {samples} = options;
                if (samples.length < 2) {
                    throw new Error('samples must be greater than 2');
                }

                const crossings = [];

                let changed = false;
                let lastTime = 0;
                let frequency = null;
                let isPositive = true;
                let sampleRate = null;

                this.onData = data=>{
                    sampleRate = data.sampleRate;
                    const timePerSample = 1 / sampleRate;
                    const zero = data.unsigned ? (2 ** data.bitsPerSample) / 2 : 0;
                    data.samples.forEach((sample,i)=>{
                        if (isPositive && sample < zero) {
                            changed = true;
                            isPositive = false;
                            const crossing = lastTime + i * timePerSample;
                            enqueue(crossings, crossing, samples);
                        } else if (!isPositive && sample > zero) {
                            isPositive = true;
                        }
                    }
                    );
                    lastTime += data.samples.length * timePerSample;
                    if (changed && crossings.length >= 2) {
                        changed = false;
                        const averagePeriod = averageDifference(crossings);
                        const averageFrequency = 1 / averagePeriod;
                        frequency = averageFrequency;
                        return frequency === null ? null : Math.floor(frequency);
                    }
                    return null;
                }
                ;

                Object.defineProperties(this, {
                    frequency: {
                        get() {
                            return frequency;
                        }
                    },
                    sampleRate: {
                        get() {
                            return sampleRate;
                        }
                    }
                });
            }
        }

        function averageDifference(xs) {
            return pairs(xs).reduce((y,[x1,x2])=>(x2 - x1) + y, 0) / xs.length;
        }

        function enqueue(xs, x, n) {
            if (xs.length === n) {
                xs.shift();
            }
            xs.push(x);
        }

        function pairs(xs) {
            return xs.slice(1).map((x,i)=>[xs[i], x]);
        }

        module.exports = PitchDetector;

    }
    , {}],
    7: [function(require, module, exports) {
        (function(global) {

            function Scope(ac, canvas) {
                if (!ac) {
                    throw new Error('No AudioContext provided');
                }
                if (!canvas) {
                    throw new Error('No Canvas provided');
                }
                this.ac = ac;
                this.canvas = canvas;
                this.ctx = canvas.getContext('2d');
                this.width = canvas.width;
                this.height = canvas.height;
                this.input = ac.createGain();
                this.analyzer = ac.createAnalyser();
                this.analyzer.fftSize = 2048;
                this.input.connect(this.analyzer);
                this.freqData = new Uint8Array(this.analyzer.frequencyBinCount);
                this.rAF = null;
                this.strokeStyle = '#6cf';
                this.sensitivity = 42;
            }

            // borrowed from https://github.com/cwilso/oscilloscope/blob/master/js/oscilloscope.js
            Scope.prototype.findZeroCrossing = function(data, width) {
                var i = 0, last = -1, min = this.sensitivity * 128 / 100 + 128, s;

                while (i < width && (data[i] > 128)) {
                    i++;
                }

                if (i >= width) {
                    return 0;
                }

                while (i < width && ((s = data[i]) < min)) {
                    last = s >= 128 ? last === -1 ? i : last : -1;
                    i++;
                }

                last = last < 0 ? i : last;
                return i === width ? 0 : last;
            }
            ;

            Scope.prototype.start = function() {
                this.rAF = requestAnimationFrame(this.draw.bind(this));
                return this;
            }
            ;

            Scope.prototype.stop = function() {
                cancelAnimationFrame(this.rAF);
                this.rAF = null;
                return this;
            }
            ;

            Scope.prototype.draw = function() {
                var len = this.freqData.length, scale = this.height / 256 / 2, i = j = 50, magnitude;

                // grid
                this.ctx.fillStyle = '#002233';
                this.ctx.fillRect(0, 0, this.width, this.height);
                this.ctx.lineWidth = 0;
                this.ctx.strokeStyle = 'rgba(60,180,220,0.05)';
                this.ctx.beginPath();
                for (; i < this.width; i += 50) {
                    this.ctx.moveTo(i, 0);
                    this.ctx.lineTo(i, this.height);
                    for (j = 0; j < this.height; j += 50) {
                        this.ctx.moveTo(0, j);
                        this.ctx.lineTo(this.width, j);
                    }
                }
                this.ctx.stroke();

                // x axis
                this.ctx.strokeStyle = 'rgba(60,180,220,0.22)';
                this.ctx.beginPath();
                this.ctx.moveTo(0, this.height / 2);
                this.ctx.lineTo(this.width, this.height / 2);
                this.ctx.stroke();

                // waveform
                this.analyzer.getByteTimeDomainData(this.freqData);
                i = this.findZeroCrossing(this.freqData, this.width);
                this.ctx.lineWidth = 2.5;
                this.ctx.strokeStyle = this.strokeStyle;
                this.ctx.beginPath();
                this.ctx.moveTo(0, (256 - this.freqData[i]) * scale + this.height / 4);
                for (j = 0; i < len && j < this.width; i++,
                j++) {
                    magnitude = (256 - this.freqData[i]) * scale + this.height / 4;
                    this.ctx.lineTo(j, magnitude);
                }
                this.ctx.stroke();

                this.rAF = requestAnimationFrame(this.draw.bind(this));
                return this;
            }
            ;

            global.Scope = Scope;

        }(typeof window !== 'undefined' ? window : this));

    }
    , {}],
    8: [function(require, module, exports) {
        (function(global) {
            "use strict";

            // ref: https://github.com/tc39/proposal-global
            var getGlobal = function() {
                // the only reliable means to get the global object is
                // `Function('return this')()`
                // However, this causes CSP violations in Chrome apps.
                if (typeof self !== 'undefined') {
                    return self;
                }
                if (typeof window !== 'undefined') {
                    return window;
                }
                if (typeof global !== 'undefined') {
                    return global;
                }
                throw new Error('unable to locate global object');
            }

            var global = getGlobal();

            module.exports = exports = global.fetch;

            // Needed for TypeScript and Webpack.
            exports.default = global.fetch.bind(global);

            exports.Headers = global.Headers;
            exports.Request = global.Request;
            exports.Response = global.Response;
        }
        ).call(this, typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

    }
    , {}],
    9: [function(require, module, exports) {
        'use strict';

        exports.MediaStream = window.MediaStream;
        exports.RTCIceCandidate = window.RTCIceCandidate;
        exports.RTCPeerConnection = window.RTCPeerConnection;
        exports.RTCSessionDescription = window.RTCSessionDescription;

    }
    , {}]
}, {}, [1])
