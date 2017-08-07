class Recorder {
    constructor(visualizerContext) {
        this.visualizerContext = visualizerContext;
        this.recordButton = document.querySelector('#record');
        this.deleteButton = document.querySelector('#delete');

        if (!SUPPORTS_MEDIA_RECORDER) {
            this.recordButton.parentNode.removeChild(this.recordButton);
            this.deleteButton.parentNode.removeChild(this.deleteButton);
            return;
        }

        this.recorder = false;
        this.chunks = [];

        this.recordButton.addEventListener('click', this.visualizerContext.record.bind(this.visualizerContext));

        this.deleteButton.addEventListener('click', () => {
            this.chunks = [];
            URL.revokeObjectURL(this.objURL);
            this.objURL = null;
            this.recordButton.classList.remove('recorded');
            this.visualizerContext.useMicrophone();
        });
    }

    record(stream) {
        return new Promise((resolve, reject) => {
            this.recorder = new MediaRecorder(stream);

            this.recorder.ondataavailable = e => {
                this.chunks.push(e.data);
            };

            this.recorder.start(0);

            this.recordButton.classList.add('recording');
            this.recordButton.innerHTML = '<i class="material-icons">stop</i><span>Stop recording</span>';

            let onRecorderStopped = () => {
                let blob = new Blob(this.chunks, { 'type': 'audio/ogg; codecs=opus' });
                this.chunks = [];
                this.objURL = URL.createObjectURL(blob)
                resolve(this.objURL);

                this.recordButton.removeEventListener('click', onRecorderStopped);
                this.recordButton.addEventListener('click', this.visualizerContext.record);

                this.recordButton.classList.remove('recording');
                this.recordButton.classList.add('recorded');
                this.recordButton.innerHTML = '<i class="material-icons">mic</i><span>Record audio</span>';
                // record.style.display = 'none';
                this.recordButton.classList.add('recorded');
            }

            this.recordButton.removeEventListener('click', this.visualizerContext.record);
            this.recordButton.addEventListener('click', onRecorderStopped);
        });
    }

    hide() {
        this.recordButton.style.display = 'none';
        this.deleteButton.style.display = 'none';
    }

    show() {
        this.recordButton.style.display = '';
        this.deleteButton.style.display = '';
    }

}


class Visualizer {
    constructor() {

        // If the WebAudio API doesn't exist, return
        if (!SUPPORTS_WEB_AUDIO) {
            document.body.classList.add('no-support');
            return;
        }

        if (!SUPPORTS_MEDIA_RECORDER) {
            document.querySelector('[value="other:microphone"]')
                .parentNode.removeChild(document.querySelector('[value="other:microphone"]'));
        }

        this.audio = document.querySelector('audio');
        this.audioContext = new WEB_AUDIO();// AudioContext, prefixed if necessary

        this.source = this.audioContext.createMediaElementSource(this.audio);
        this.trackSelector = document.querySelector('#track');
        this.audio.src = this.trackSelector.value;

        // Recorder
        this.recorder = new Recorder(this);
        // Hide the record button until microphone is choosen from trackSelector
        this.recorder.hide();

        // Canvases
        this.waveformOverTime = document.querySelector('#waveformOverTime');
        this.frequencyDomain = document.querySelector('#frequencyDomain');
        this.waveform = document.querySelector('#waveform');
        this.waveformOverTimeContext = this.waveformOverTime.getContext('2d');
        this.frequencyDomainContext = this.frequencyDomain.getContext('2d');
        this.waveformContext = this.waveform.getContext('2d');

        this.analyser = this.audioContext.createAnalyser();
        // The analyser will always be the last device before the destination unless output is muted
        this.analyser.connect(this.audioContext.destination);
        this.defaultSmoothingTimeConstant = this.analyser.smoothingTimeConstant;

        this.muteGain = this.audioContext.createGain();
        this.muted = false;

        this.muteGain.gain.value = 0;
        this.analyser.connect(this.muteGain);
        this.muteGain.connect(this.audioContext.destination);

        // Controls
        this.filterFrequencyLabel = document.querySelector('[for="filterFrequency"]');
        this.filterFrequencyDetailed = document.querySelector('[for="filterFrequency"] > input');
        this.filterFrequency = document.querySelector('#filterFrequency');

        this.filterTypeLabel = document.querySelector('[for="filter"]');
        this.filterType = document.querySelector('#filter');

        this.oscillatorFrequencyLabel = document.querySelector('[for="oscillatorFrequency"]');
        this.oscillatorFrequencyDetailed = document.querySelector('[for="oscillatorFrequency"] > input');
        this.oscillatorFrequency = document.querySelector('#oscillatorFrequency');

        this.oscillatorTypeLabel = document.querySelector('[for="oscillatorType"]');
        this.oscillatorType = document.querySelector('#oscillatorType');

        // Vars needed for analyser data
        this.frequencyBinCount = this.analyser.frequencyBinCount;
        this.frequencyData = new Uint8Array(this.frequencyBinCount);
        this.waveformData = new Uint8Array(this.frequencyBinCount);

        this.lastConnectedToAnalyser = null;

        this.filter = this.audioContext.createBiquadFilter();
        this.filter.type = 'allpass';
        this.filter.Q.value = 0.05;
        this.filter.gain.value = 15;
        this.oscillator = this.audioContext.createOscillator();
        this.oscillator.start(0);
        this.microphone = null;

        this.srcIsMP3 = true;
        this.source.connect(this.filter);

        // Other info needed to render data to canvas
        let bounds = this.waveform.getBoundingClientRect();
        this.height = bounds.height;
        this.width = bounds.width;
        // this.queuedFrame = null;

        // Update size of canvases
        this.waveformOverTime.width = this.width;
        this.waveformOverTime.height = this.height;
        this.frequencyDomain.width = this.width;
        this.frequencyDomain.height = this.height;
        this.waveform.width = this.width;
        this.waveform.height = this.height;


        // Time scale settings
        this.time = Date.now();
        this.pausedTime = 0;
        this.timeScale = 1000 * 60;
        this.lastTimeX = 0;
        this.timeMax = 0;
        this.timeMin = 0;

        this.frequencyWidth = this.width / this.frequencyBinCount;

        // Colors
        this.frequencyGrd = this.frequencyDomainContext.createLinearGradient(0, 0, 0, this.height);
        this.frequencyGrd.addColorStop(0, 'rgb(255, 0, 0)');
        this.frequencyGrd.addColorStop(1, 'rgb(0,255,100)');

        this.waveformGrd = this.waveformContext.createLinearGradient(0, 0, 0, this.height);
        this.waveformGrd.addColorStop(0, 'rgb(255, 0, 0)');
        this.waveformGrd.addColorStop(0.5, 'rgb(0,255,100)');
        this.waveformGrd.addColorStop(1, 'rgb(255, 0, 0)');

        // Apply colors and line styles
        this.waveformOverTimeContext.fillStyle = this.waveformGrd;

        this.frequencyDomainContext.fillStyle = this.frequencyGrd;
        this.frequencyDomainContext.lineJoin = 'round';
        this.frequencyDomainContext.lineCap = 'round';

        this.waveformContext.strokeStyle = this.waveformGrd;
        this.waveformContext.lineJoin = 'round';
        this.waveformContext.lineCap = 'round';


        this.addEventListeners();

        this.paused = false;

        this.hideAuxControls();
        this.showAuxControls('filterType');
        this.setInputDevice(this.filter);
        queueFrame(this.updateVisualizer);
    }

    get pauseAtEnd() {
        return document.querySelector('#pauseAtEnd').checked;
    }
    set pauseAtEnd(value) {
        document.querySelector('#pauseAtEnd').checked = value;
    }

    setInputDevice(device) {
        this.disconnectAnalyser();
        this.lastConnectedToAnalyser = device;
        device.connect(this.analyser);
    }

    useOscillator() {
        this.analyser.smoothingTimeConstant = 0;

        this.showAuxControls('oscillatorFrequency');
        this.showAuxControls('oscillatorType');

        this.setInputDevice(this.oscillator);
    }

    useMicrophone() {
        this.resetSource();
        let connect = () => {
            if (this.recorder.objURL) {
                this.setSrcAsObjectURL(this.recorder.objURL);
            } else {
                this.setInputDevice(this.microphone);
                this.recorder.show();
                this.mute();
            }
        }

        if (!this.microphone) {
            navigator.mediaDevices.getUserMedia({
                audio: true
            }).then(stream => {
                this.microphoneStream = stream;
                this.microphone = this.audioContext.createMediaStreamSource(stream);
                connect();
            }).catch(err => console.log(err));

        } else {
            connect();
        }
    }

    disconnectAnalyser() {
        if (!this.lastConnectedToAnalyser)
            return;

        this.lastConnectedToAnalyser.disconnect(this.analyser);
        this.lastConnectedToAnalyser = null;
    }

    updateVisualizer() {
        queueFrame(this.updateVisualizer);

        if (this.paused && this.srcIsMP3)
            return;
        this.analyser.getByteTimeDomainData(this.waveformData);
        this.analyser.getByteFrequencyData(this.frequencyData);

        this.frequencyDomainContext.clearRect(0, 0, this.width, this.height);
        this.waveformContext.clearRect(0, 0, this.width, this.height);

        this.frequencyDomainContext.beginPath();
        this.waveformContext.beginPath();

        this.frequencyDomainContext.moveTo(0, this.height);

        let timeX = ((Date.now() - this.time) / this.timeScale) * this.width,
            timeWidth = timeX - this.lastTimeX;

        this.waveformOverTimeContext.fillRect(this.lastTimeX, this.timeMin, timeWidth, this.timeMax - this.timeMin);

        this.lastTimeX = timeX;

        // Display the waveform one frame behind to set widths properly.
        this.timeMax = Math.max.apply(null, this.waveformData) / 255 * this.height;
        this.timeMin = Math.min.apply(null, this.waveformData) / 255 * this.height;


        let frequencyXOffset = 0;

        let barHeight, barYOffset;
        for (let i = 0; i < this.frequencyBinCount; i++) {
            barHeight = this.frequencyData[i] / 256 * this.height;
            barYOffset = this.height - barHeight;
            this.frequencyDomainContext.lineTo(frequencyXOffset, barYOffset);

            let y = this.waveformData[i] / 255 * this.height;
            if (i === 0) {
                this.waveformContext.moveTo(frequencyXOffset, y);
            } else {
                this.waveformContext.lineTo(frequencyXOffset, y);
            }

            frequencyXOffset += this.frequencyWidth;
        }
        if (timeX > this.width) {
            if (this.pauseAtEnd) {
                this.pause();
                this.pauseAtEnd = false;
            } else {
                this.clearAll();
            }
        }

        this.frequencyDomainContext.lineTo(this.width, this.height);
        this.frequencyDomainContext.closePath();
        this.frequencyDomainContext.fill();

        this.waveformContext.lineTo(this.width, this.height / 2);
        this.waveformContext.stroke();

        // this.queuedFrame = queueFrame(this.updateVisualizer);
    }

    record() {
        this.recorder.record(this.microphoneStream).then(data => {
            this.setSrcAsObjectURL(data);
        });
    }

    setSrcAsObjectURL(url) {
        this.pause();
        this.resetSource();
        this.srcIsMP3 = true;
        this.audio.src = url;
        this.audio.loop = true;
        this.play();
        this.showAuxControls('filterType');
        if (this.filter.type !== 'allpass')
            this.showAuxControls('filterFrequency');
    }

    play() {
        this.time += Date.now() - this.time - this.pausedTime;
        this.pausedTime = 0;
        this.paused = false;
        // queueFrame(this.updateVisualizer);
        this.audio.play();
    }

    pause(e) {
        this.paused = true;
        this.pausedTime = Date.now() - this.time;
        // removeFrameFromQueue(this.queuedFrame);
        this.audio.pause();
    }

    hide(control) {
        control.style.display = 'none';
    }

    show(control) {
        if (control && control.style)
            control.style.display = '';
    }

    mute() {
        if (!this.muted) {
            this.analyser.disconnect(this.audioContext.destination);
            this.muted = true;
        }
    }

    unmute() {
        if (this.muted) {
            this.analyser.connect(this.audioContext.destination);
            this.muted = false;
        }
    }

    hideAuxControls() {
        this.hide(this.filterType);
        this.hide(this.filterTypeLabel);

        this.hide(this.filterFrequencyLabel);
        this.hide(this.filterFrequency);

        this.hide(this.oscillatorFrequencyLabel);
        this.hide(this.oscillatorFrequency);

        this.hide(this.oscillatorTypeLabel);
        this.hide(this.oscillatorType);
    }

    showAuxControls(controlId) {
        this.show(this[controlId]);
        this.show(this[controlId + 'Label']);
    }

    resetSource() {
        this.hideAuxControls();

        this.analyser.smoothingTimeConstant = this.defaultSmoothingTimeConstant;
        this.unmute();
        this.audio.src = '';
        this.audio.loop = false;
        this.clearAll();
        this.setInputDevice(this.filter);
    }

    clearAll() {
        this.waveformOverTimeContext.clearRect(0, 0, this.width, this.height);
        this.waveformContext.clearRect(0, 0, this.width, this.height);
        this.frequencyDomainContext.clearRect(0, 0, this.width, this.height);
        this.time = Date.now();
        this.lastTimeX = 0;
        this.pausedTime = 0;
    }

    addEventListeners() {
        // Used to release document level mousemove listener when it's not needed
        let slider = null;

        let mousemove = e => {
            if (!slider)
                return;

            slider.dest.value = slider.source.value;
        }

        let mouseup = e => {
            if (!slider)
                return;

            e.preventDefault();
            slider = false;
        }

        this.updateVisualizer = this.updateVisualizer.bind(this);
        this.audio.addEventListener('play', this.play.bind(this));
        this.audio.addEventListener('pause', this.pause.bind(this));

        // The user has choosen a different source of audio
        this.trackSelector.addEventListener('change', e => {
            this.pause();
            this.clearAll();
            this.resetSource();
            this.srcIsMP3 = false;

            switch (this.trackSelector.value) {
                case 'other:oscillator':
                    this.useOscillator();
                    break;
                case 'other:microphone':
                    this.useMicrophone();
                    break;
                default:
                    this.srcIsMP3 = true;
                    this.audio.src = this.trackSelector.value;
                    this.showAuxControls('filterType');
                    if (this.filter.type !== 'allpass')
                        this.showAuxControls('filterFrequency');
                    break;
            }
            this.play();
        });

        // Change time scale
        let timeScale = document.querySelector('#timeScale');
        let timeScaleDetail = document.querySelector('[for="timeScale"] > input');

        let changeTimeScale = e => {
            if (e.target === timeScale)
                timeScaleDetail.value = timeScale.value;

            this.timeScale = timeScaleDetail.value * 1000;

            this.clearAll();
        };

        timeScale.addEventListener('change', changeTimeScale);
        timeScaleDetail.addEventListener('change', changeTimeScale);

        // Change oscillator options

        let changeOscillatorFrequency = e => {
            if (e.target === this.oscillatorFrequency)
                this.oscillatorFrequencyDetailed.value = this.oscillatorFrequency.value;

            this.oscillatorFrequency.value = this.oscillatorFrequencyDetailed.value;

            this.oscillator.frequency.value = this.oscillatorFrequencyDetailed.value;

            this.clearAll();
        };

        this.oscillatorFrequencyDetailed.addEventListener('change', changeOscillatorFrequency);
        this.oscillatorFrequency.addEventListener('change', changeOscillatorFrequency);
        this.oscillatorFrequency.addEventListener('mousedown', () => {
            slider = {
                source: this.oscillatorFrequency,
                dest: this.oscillator.frequency
            }
        });

        this.oscillatorType.addEventListener('change', () => {
            this.oscillator.type = this.oscillatorType.value;
        });

        // Change filter options

        let changeFilterFrequency = e => {
            if (e.target === this.filterFrequency)
                this.filterFrequencyDetailed.value = this.filterFrequency.value;

            this.filterFrequency.value = this.filterFrequencyDetailed.value;

            this.filter.frequency.value = this.filterFrequencyDetailed.value;
        };

        this.filterFrequencyDetailed.addEventListener('change', changeFilterFrequency);
        this.filterFrequency.addEventListener('change', changeFilterFrequency);
        this.filterFrequency.addEventListener('mousedown', () => {
            slider = {
                source: this.filterFrequency,
                dest: this.filter.frequency
            }
        });

        this.filterType.addEventListener('change', () => {
            if (this.filterType.value === 'allpass') {
                this.filterFrequencyLabel.style.display = 'none';
                this.filterFrequency.style.display = 'none';
            } else {
                this.showAuxControls('filter');
                this.showAuxControls('filterFrequency');
            }
            this.filter.type = this.filterType.value;
            this.filter.frequency.value = this.filter.frequency.defaultValue;
            this.filterFrequency.value = this.filter.frequency.defaultValue;
            this.filterFrequencyDetailed.value = this.filter.frequency.defaultValue;
        });

        document.addEventListener('mousemove', mousemove);
        document.addEventListener('mouseup', mouseup);

        let recordWaveform = document.querySelector('#recordWaveform');
        let recordingWaveform = false;
        recordWaveform.addEventListener('click', e => {
            if (recordingWaveform)
                return;

            recordingWaveform = true;
            recordWaveform.classList.add('red');
            recordWaveform.disabled = true;
            recordWaveform.innerHTML = '<i class="material-icons">radio_button_checked</i> Recording . . .';

            this.clearAll();
            this.audio.currentTime = 0;
            this.play();
            timeScaleDetail.value = Math.ceil(this.audio.duration);
            this.timeScale = Math.ceil(this.audio.duration) * 1000;
            this.pauseAtEnd = true;
            this.audio.loop = false;
            this.audio.addEventListener('ended', e => {
                let waveform = this.waveformOverTime.toDataURL();

                let link = document.createElement("a");
                link.download = 'waveform.png';
                link.href = waveform;
                document.body.appendChild(link);
                link.click();
                window.location.reload();
            });
        });
    }

}

const visualizer = new Visualizer();