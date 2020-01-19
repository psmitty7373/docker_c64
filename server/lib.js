'use strict';

const { RTCAudioSource } = require('wrtc').nonstandard;
const AlsaCapture = require("alsa-capture");

class AlsaSource {
  constructor(options = {}) {
    const captureInstance = new AlsaCapture({
        channels: 1,
        debug: true,
        device: "hw:0,1,0",
        format: "S16_LE",
        periodSize: 441,
        periodTime: undefined,
        rate: 44100,
    });

    const source = new RTCAudioSource();
    const bitsPerSample = 16;
    const sampleRate = 44100;
    const channelCount = 1;
    const samples = new Int16Array(441);
    const data = {
      sampleRate,
      bitsPerSample,
      channelCount,
      samples
    };

    captureInstance.on("audio", (s) => {
        for (let i = 0; i < s.length / 2; i++) {
            samples[i] = s.readInt16LE(i * 2, 2);
        }
        data.numberOfFrames = data.samples.length;
        source.onData(data);
        //console.log(s);
    });


    this.close = () => {
    };

    this.createTrack = () => {
      return source.createTrack();
    };
  }
}

module.exports = AlsaSource;
