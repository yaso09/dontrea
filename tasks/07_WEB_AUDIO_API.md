# 📋 Task 07: Web Audio API, Sound Synthesis & Spatial Audio Subsystem

## 1. Scope & Objective
Provide 100% complete Wasm-to-host virtualization for the Web Audio API, enabling sound synthesis libraries (ZzFX, Tone.js, Howler.js, custom DSP code) and game audio engines to construct `AudioContext`, wire `AudioNode` graphs, modulate `AudioParam` automation curves, synthesize procedural sound effects, and manipulate high-performance PCM audio buffers (`AudioBuffer`, `Float32Array`).

---

## 2. API Surface & Interface Inventory

### 2.1 Interface: `BaseAudioContext` & `AudioContext`
- **Constructors:**
  - `new AudioContext(options?: AudioContextOptions)`
  - Legacy alias: `window.webkitAudioContext === window.AudioContext`
- **Properties:**
  - `currentTime: number` (Audio hardware hardware-clock timestamp in seconds)
  - `sampleRate: number` (e.g. 44100, 48000 Hz)
  - `state: AudioContextState` ("suspended" | "running" | "closed")
  - `destination: AudioDestinationNode` (Hardware speaker output)
  - `listener: AudioListener` (3D spatial listener)
  - `audioWorklet: AudioWorklet`
  - `onstatechange: ((this: BaseAudioContext, ev: Event) => any) | null`
- **Methods (Node & Graph Factory):**
  - `createBuffer(numberOfChannels: number, length: number, sampleRate: number): AudioBuffer`
  - `decodeAudioData(audioData: ArrayBuffer, successCallback?: DecodeSuccessCallback, errorCallback?: DecodeErrorCallback): Promise<AudioBuffer>`
  - `createBufferSource(): AudioBufferSourceNode`
  - `createGain(): GainNode`
  - `createDelay(maxDelayTime?: number): DelayNode`
  - `createBiquadFilter(): BiquadFilterNode`
  - `createIIRFilter(feedforward: number[], feedback: number[]): IIRFilterNode`
  - `createWaveShaper(): WaveShaperNode`
  - `createPanner(): PannerNode`
  - `createConvolver(): ConvolverNode`
  - `createDynamicsCompressor(): DynamicsCompressorNode`
  - `createAnalyser(): AnalyserNode`
  - `createStereoPanner(): StereoPannerNode`
  - `createOscillator(): OscillatorNode`
  - `createPeriodicWave(real: number[] | Float32Array, imag: number[] | Float32Array, constraints?: PeriodicWaveConstraints): PeriodicWave`
  - `createChannelSplitter(numberOfOutputs?: number): ChannelSplitterNode`
  - `createChannelMerger(numberOfInputs?: number): ChannelMergerNode`
  - `createConstantSource(): ConstantSourceNode`
  - State management: `suspend(): Promise<void>`, `resume(): Promise<void>`, `close(): Promise<void>`
  - Media stream inputs: `createMediaElementSource(mediaElement: HTMLMediaElement): MediaElementAudioSourceNode`, `createMediaStreamSource(mediaStream: MediaStream): MediaStreamAudioSourceNode`

---

### 2.2 Interface: `OfflineAudioContext`
Constructor: `new OfflineAudioContext(numberOfChannels: number, length: number, sampleRate: number)` or `new OfflineAudioContext(options: OfflineAudioContextOptions)`
- **Methods:**
  - `startRendering(): Promise<AudioBuffer>`
  - `suspend(suspendTime: number): Promise<void>`, `resume(): Promise<void>`

---

### 2.3 Base Class: `AudioNode`
The base class for all nodes in the audio processing graph.
- **Properties:**
  - `context: BaseAudioContext`
  - `numberOfInputs: number`, `numberOfOutputs: number`
  - `channelCount: number`, `channelCountMode: ChannelCountMode`, `channelInterpretation: ChannelInterpretation`
- **Graph Connection Methods:**
  - `connect(destinationNode: AudioNode, output?: number, input?: number): AudioNode`
  - `connect(destinationParam: AudioParam, output?: number): void`
  - `disconnect(): void`
  - `disconnect(output: number): void`
  - `disconnect(destinationNode: AudioNode): void`
  - `disconnect(destinationParam: AudioParam): void`

---

### 2.4 Interface: `AudioParam`
Enables sample-accurate parameter modulation and audio-rate scheduling.
- **Properties:**
  - `value: number` (Current value; mutating changes baseline value)
  - `defaultValue: number`, `minValue: number`, `maxValue: number`
- **Automation Timeline Methods:**
  - `setValueAtTime(value: number, startTime: number): AudioParam`
  - `linearRampToValueAtTime(value: number, endTime: number): AudioParam`
  - `exponentialRampToValueAtTime(value: number, endTime: number): AudioParam`
  - `setTargetAtTime(target: number, startTime: number, timeConstant: number): AudioParam`
  - `setValueCurveAtTime(values: number[] | Float32Array, startTime: number, duration: number): AudioParam`
  - `cancelScheduledValues(cancelTime: number): AudioParam`
  - `cancelAndHoldAtTime(cancelTime: number): AudioParam`

---

### 2.5 Specific Audio Nodes & Processors

#### 1. `AudioBufferSourceNode` (Playback of PCM Samples)
- `buffer: AudioBuffer | null`
- `playbackRate: AudioParam`, `detune: AudioParam`
- `loop: boolean`, `loopStart: number`, `loopEnd: number`
- `start(when?: number, offset?: number, duration?: number): void`
- `stop(when?: number): void`
- `onended: ((this: AudioScheduledSourceNode, ev: Event) => any) | null`

#### 2. `GainNode` (Volume Control)
- `gain: AudioParam`

#### 3. `OscillatorNode` (Synthesizer Waveforms)
- `type: OscillatorType` ("sine" | "square" | "sawtooth" | "triangle" | "custom")
- `frequency: AudioParam`, `detune: AudioParam`
- `setPeriodicWave(periodicWave: PeriodicWave): void`
- `start(when?: number): void`, `stop(when?: number): void`

#### 4. `BiquadFilterNode` (Audio Filters)
- `type: BiquadFilterType` ("lowpass" | "highpass" | "bandpass" | "lowshelf" | "highshelf" | "peaking" | "notch" | "allpass")
- `frequency: AudioParam`, `detune: AudioParam`, `Q: AudioParam`, `gain: AudioParam`
- `getFrequencyResponse(frequencyHz: Float32Array, magResponse: Float32Array, phaseResponse: Float32Array): void`

#### 5. `AnalyserNode` (Real-Time Visualizers & FFT)
- `fftSize: number`, `frequencyBinCount: number`
- `minDecibels: number`, `maxDecibels: number`, `smoothingTimeConstant: number`
- `getFloatFrequencyData(array: Float32Array): void`
- `getByteFrequencyData(array: Uint8Array): void`
- `getFloatTimeDomainData(array: Float32Array): void`
- `getByteTimeDomainData(array: Uint8Array): void`

#### 6. `DynamicsCompressorNode` (Mastering & Limiters)
- `threshold: AudioParam`, `knee: AudioParam`, `ratio: AudioParam`, `reduction: number`, `attack: AudioParam`, `release: AudioParam`

#### 7. `StereoPannerNode` & `DelayNode`
- `StereoPannerNode.pan: AudioParam` (-1.0 to 1.0)
- `DelayNode.delayTime: AudioParam`

#### 8. `WaveShaperNode` & `ConvolverNode`
- `WaveShaperNode`: `curve: Float32Array | null`, `oversample: OverSampleType` ("none" | "2x" | "4x")
- `ConvolverNode`: `buffer: AudioBuffer | null`, `normalize: boolean`

---

### 2.6 Interface: `AudioBuffer`
- **Properties:**
  - `length: number` (Sample frames)
  - `duration: number` (Seconds)
  - `sampleRate: number` (Hz)
  - `numberOfChannels: number`
- **Methods:**
  - `getChannelData(channel: number): Float32Array` (Direct linear memory view)
  - `copyFromChannel(destination: Float32Array, channelNumber: number, bufferOffset?: number): void`
  - `copyToChannel(source: Float32Array, channelNumber: number, bufferOffset?: number): void`

---

## 3. High-Performance Audio Synthesis Implementation Plan

1. **Solving the Constructor Issue:**
   - Map `AudioContext` and `webkitAudioContext` to the `new.target` construct trap in UWPE:
     ```javascript
     function AudioContextProxy(...args) {
         if (!new.target) throw new TypeError("Failed to construct 'AudioContext': Please use the 'new' operator");
         return __uwpe_construct_host_object('AudioContext', args);
     }
     ```
2. **Fast Procedural Audio Generation (ZzFX & Sound Synthesizers):**
   - In sound synthesizers, thousands of samples are calculated in an inner loop:
     ```javascript
     const buffer = audioContext.createBuffer(1, length, sampleRate);
     const data = buffer.getChannelData(0);
     for (let i = 0; i < length; i++) data[i] = Math.sin(i * freq);
     ```
   - `buffer.getChannelData(0)` returns a `Float32Array` pointing directly into Wasm memory.
   - When `source.buffer = buffer` is assigned, host Web Audio copies the buffer from Wasm memory in a single native `set()` call, eliminating round-trip latency.
