class Recorder {
    constructor() {
        this.recordButton = document.querySelector('#record');
        this.deleteButton = document.querySelector('#delete');
    }

    hide() {
        this.recordButton.style.display = 'none';
        this.deleteButton.style.display = 'none';
    }

    show() {
        this.recordButton.style.display = '';
    }

}


class Visualizer {
    constructor() {

        // If the WebAudio API doesn't exist, return
        if (!SUPPORTS_WEB_AUDIO) {
            document.body.classList.add('no-support');
            return;
        }

        this.audio = document.querySelector('audio');
        this.audioContext = new WEB_AUDIO();// AudioContext, prefixed if necessary

        this.source = this.audioContext.createMediaElementSource(this.audio);
        this.trackSelector = document.querySelector('#track');
        this.audio.src = this.trackSelector.value;

        // Recorder
        this.recorder = new Recorder();
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
        // The analyser will always be the last device before the destination
        this.analyser.connect(this.audioContext.destination);

        // Vars needed for analyser data
        this.frequencyBinCount = this.analyser.frequencyBinCount;
        this.frequencyData = new Uint8Array(this.frequencyBinCount);
        this.waveformData = new Uint8Array(this.frequencyBinCount);

        this.lastConnectedToAnalyser = null;

        this.filter = this.audioContext.createBiquadFilter();
        this.oscillator = this.audioContext.createOscillator();

        this.source.connect(this.filter);

        this.setOutput(this.source);

        // Other info needed to render data to canvas
        let bounds = this.waveform.getBoundingClientRect();
        this.height = bounds.height;
        this.width = bounds.width;
        this.queuedFrame = null;

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
        this.timeScale = (1000 * 30);// 30 Secounds

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
    }

    addEventListeners() {
        let self = this;

        this.updateVisualizer = this.updateVisualizer.bind(this);
        this.audio.addEventListener('play', this.play.bind(this));
        this.audio.addEventListener('pause', this.pause.bind(this));

        this.trackSelector.addEventListener('change', function (e) {
            self.pause();
            self.waveformOverTimeContext.clearRect(0, 0, self.width, self.height);
            self.time = Date.now();
            self.audio.src = this.value;
            self.setOutput(self.source);
            self.play();
        });
    }

    get pauseAtEnd() {
        return document.querySelector('#pauseAtEnd').checked;
    }
    set pauseAtEnd(value) {
        document.querySelector('#pauseAtEnd').checked = value;
    }

    setOutput(device) {
        this.disconnectAnalyser();
        this.lastConnectedToAnalyser = device;
        device.connect(this.analyser);
    }

    disconnectAnalyser() {
        if (!this.lastConnectedToAnalyser)
            return;

        this.lastConnectedToAnalyser.disconnect(this.analyser);
        this.lastConnectedToAnalyser = null;
    }

    updateVisualizer() {
        this.analyser.getByteTimeDomainData(this.waveformData);
        this.analyser.getByteFrequencyData(this.frequencyData);

        this.frequencyDomainContext.clearRect(0, 0, this.width, this.height);
        this.waveformContext.clearRect(0, 0, this.width, this.height);

        this.frequencyDomainContext.beginPath();
        this.waveformContext.beginPath();

        this.frequencyDomainContext.moveTo(0, this.height);

        let max = Math.max.apply(null, this.waveformData) / 255 * this.height;
        let min = Math.min.apply(null, this.waveformData) / 255 * this.height;
        let timeX = ((Date.now() - this.time) / this.timeScale) * this.width;
        this.waveformOverTimeContext.fillRect(timeX, min, 1, max - min);

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
                this.audio.pause();
                this.pauseAtEnd = false;
                return;
            }
            this.waveformOverTimeContext.clearRect(0, 0, this.width, this.height);
            this.time = Date.now();
        }

        this.frequencyDomainContext.lineTo(this.width, this.height);
        this.frequencyDomainContext.closePath();
        this.frequencyDomainContext.fill();

        this.waveformContext.lineTo(this.width, this.height / 2);
        this.waveformContext.stroke();

        this.queuedFrame = queueFrame(this.updateVisualizer);
    }

    play() {
        this.time += Date.now() - this.time - this.pausedTime;
        this.pausedTime = 0;
        queueFrame(this.updateVisualizer);
        this.audio.play();
    }

    pause(e) {
        this.pausedTime = Date.now() - this.time;
        removeFrameFromQueue(this.queuedFrame);
        this.audio.pause();
    }
}

const visualizer = new Visualizer();