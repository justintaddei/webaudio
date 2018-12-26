var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { Visualizer } from './visualizer.js';
import { Controls } from './audio-controls.js';
import { Maximizer } from './maximizer.js';
const trackInput = document.querySelector('#track');
class AudioEditor {
    constructor() {
        this.audioElement = document.querySelector('audio');
        this.maximizerThresholdElemenet = document.querySelector('#threshold');
        this.ctx = new AudioContext();
        this.src = this.ctx.createMediaElementSource(this.audioElement);
        this.visualizer = new Visualizer(this.ctx);
        this.maximizer = new Maximizer(this.ctx);
        this.limiter = new Maximizer(this.ctx);
        this.limiter.output.connect(this.ctx.destination);
        this.maximizer.output.connect(this.visualizer.input);
        this.maximizer.output.connect(this.destination);
        this.src.connect(this.destination);
        this.src.connect(this.visualizer.input);
        this.controls = new Controls();
        this.audioElement.addEventListener('timeupdate', e => {
            this.controls.setTime(this.audioElement.currentTime);
        });
        this.visualizer.onAmplitudeChange = (a) => {
            this.controls.amplitude = a;
        };
        this.controls.onSeek = (time) => {
            this.audioElement.currentTime = time;
        };
        this.controls.onTogglePlayState = () => {
            if (this.audioElement.paused)
                this.play();
            else
                this.pause();
        };
        const thresholdControl = document.querySelector('#preGain');
        const postGainControl = document.querySelector('#postGain');
        let trackRange = false;
        document.addEventListener('pointerdown', () => {
            trackRange = true;
        });
        document.addEventListener('pointermove', () => {
            if (!trackRange)
                return;
            this.maximizer.threshold = -1 * thresholdControl.valueAsNumber;
            this.maximizer.postGainLevel = postGainControl.valueAsNumber;
            this.maximizerThresholdElemenet.style.height = `${(1 - (this.maximizer.input.threshold.value / -100)) * 100}%`;
        });
        document.addEventListener('pointerup', () => {
            trackRange = false;
        });
        document.querySelector('#maximize').addEventListener('change', e => {
            this.maximize = e.target.checked;
            if (!this.maximize) {
                document.querySelector('#maximizerControls').style.display = 'none';
            }
            else {
                document.querySelector('#maximizerControls').style.display = '';
            }
        });
    }
    get maximize() {
        return this._maximize;
    }
    set maximize(v) {
        this._maximize = v;
        this.maximizerThresholdElemenet.style.display = v ? 'block' : 'none';
        this.maximizerThresholdElemenet.style.height = `${(1 - (this.maximizer.input.threshold.value / -100)) * 100}%`;
        const prevPostGain = this.maximizer.postGainLevel;
        this.maximizer.postGainLevel = 0;
        if (v) {
            this.src.disconnect(this.destination);
            this.src.disconnect(this.visualizer.input);
            this.src.connect(this.maximizer.input);
        }
        else {
            this.src.disconnect(this.maximizer.input);
            this.src.connect(this.destination);
            this.src.connect(this.visualizer.input);
        }
        setTimeout(() => {
            this.maximizer.postGainLevel = prevPostGain;
        }, 20);
    }
    get destination() {
        return this.limiter.input;
    }
    /**
     * Sets the url of the source audio
     * @param url The url of the audio src
     */
    setSource(url) {
        this.audioElement.src = url;
    }
    pause() {
        return __awaiter(this, void 0, void 0, function* () {
            this.visualizer.paused = true;
            yield this.audioElement.pause();
            this.controls.paused = this.audioElement.paused;
        });
    }
    play() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.audioElement.play();
            this.clearMessage();
            this.visualizer.paused = false;
            this.controls.paused = this.audioElement.paused;
            this.controls.duration = this.audioElement.duration;
        });
    }
    message(msg) {
        this.controls.message(msg);
    }
    clearMessage() {
        this.controls.clearMessage();
    }
}
let editor;
document.addEventListener('mousedown', () => __awaiter(this, void 0, void 0, function* () {
    editor = new AudioEditor();
    yield editor.pause();
    editor.setSource(trackInput.value);
}), { once: true });
trackInput.addEventListener('change', () => __awaiter(this, void 0, void 0, function* () {
    editor.message('Loading...');
    yield editor.pause();
    editor.setSource(trackInput.value);
    yield editor.play();
}));
document.addEventListener('dragover', e => {
    e.preventDefault();
    document.querySelector('#dragdrop').classList.add('show');
    return false;
}, false);
document.addEventListener('dragleave', () => {
    document.querySelector('#dragdrop').classList.remove('show');
}, false);
document.addEventListener('drop', (e) => __awaiter(this, void 0, void 0, function* () {
    e.preventDefault();
    e.stopPropagation();
    document.querySelector('#dragdrop').classList.remove('show');
    if (!e.dataTransfer.files[0] || !/audio|video/i.test(e.dataTransfer.files[0].type)) {
        return false;
    }
    yield editor.pause();
    const droppedFile = URL.createObjectURL(e.dataTransfer.files[0]);
    editor.setSource(droppedFile);
    editor.play();
    return false;
}), false);
//# sourceMappingURL=main.js.map