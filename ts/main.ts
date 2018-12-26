import { Visualizer } from './visualizer.js';
import { Controls } from './audio-controls.js'
import { Maximizer } from './maximizer.js'

const trackInput: HTMLSelectElement = document.querySelector('#track');

class AudioEditor {
    private audioElement: HTMLAudioElement = document.querySelector('audio');
    private maximizerThresholdElemenet: HTMLElement = document.querySelector('#threshold');
    private ctx: AudioContext;
    private src: MediaElementAudioSourceNode;
    private visualizer: Visualizer;
    private controls: Controls;
    private maximizer: Maximizer;
    private limiter: Maximizer;

    private _maximize: boolean;
    public get maximize(): boolean {
        return this._maximize;
    }
    public set maximize(v: boolean) {
        this._maximize = v;

        this.maximizerThresholdElemenet.style.display = v ? 'block' : 'none';
        this.maximizerThresholdElemenet.style.height = `${(1 - (this.maximizer.input.threshold.value / -100)) * 100}%`;

        const prevPostGain = this.maximizer.postGainLevel;
        this.maximizer.postGainLevel = 0;
        if (v) {
            this.src.disconnect(this.destination);
            this.src.disconnect(this.visualizer.input);
            this.src.connect(this.maximizer.input);
        } else {
            this.src.disconnect(this.maximizer.input);
            this.src.connect(this.destination);
            this.src.connect(this.visualizer.input);
        }
        setTimeout(() => {
            this.maximizer.postGainLevel = prevPostGain;
        }, 20);
    }

    constructor() {
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
        })

        this.visualizer.onAmplitudeChange = (a: number) => {
            this.controls.amplitude = a;
        }
        this.controls.onSeek = (time: number) => {
            this.audioElement.currentTime = time;
        }
        this.controls.onTogglePlayState = () => {
            if (this.audioElement.paused)
                this.play();
            else
                this.pause();
        }

        const thresholdControl: HTMLInputElement = document.querySelector('#preGain');
        const postGainControl: HTMLInputElement = document.querySelector('#postGain');

        let trackRange: boolean = false;

        document.addEventListener('pointerdown', () => {
            trackRange = true;
        });

        document.addEventListener('pointermove', () => {
            if (!trackRange) return;

            this.maximizer.threshold = -1 * thresholdControl.valueAsNumber;
            this.maximizer.postGainLevel = postGainControl.valueAsNumber;

            this.maximizerThresholdElemenet.style.height = `${(1 - (this.maximizer.input.threshold.value / -100)) * 100}%`;
        })

        document.addEventListener('pointerup', () => {
            trackRange = false;
        });

        document.querySelector('#maximize').addEventListener('change', e => {
            this.maximize = (e.target as HTMLInputElement).checked;

            if (!this.maximize) {
                (document.querySelector('#maximizerControls') as HTMLElement).style.display = 'none';
            } else {
                (document.querySelector('#maximizerControls') as HTMLElement).style.display = '';
            }
        })
    }

    get destination() {
        return this.limiter.input;
    }

    /**
     * Sets the url of the source audio
     * @param url The url of the audio src
     */
    setSource(url: string) {
        this.audioElement.src = url;
    }

    async pause() {
        this.visualizer.paused = true;
        
        await this.audioElement.pause();

        this.controls.paused = this.audioElement.paused;
        
    }

    async play() {
        await this.audioElement.play();

        this.visualizer.paused = false;

        this.controls.paused = this.audioElement.paused;
        this.controls.duration = this.audioElement.duration;
    }
}

let editor: AudioEditor;

document.addEventListener('mousedown', async () => {
    editor = new AudioEditor();
    await editor.pause();
    editor.setSource(trackInput.value);
}, { once: true })

trackInput.addEventListener('change', async () => {
    await editor.pause();
    editor.setSource(trackInput.value);
    editor.play();
});

document.addEventListener('dragover', e => {
    e.preventDefault();
    document.querySelector('#dragdrop').classList.add('show');
    return false;
}, false);

document.addEventListener('dragleave', () => {
    document.querySelector('#dragdrop').classList.remove('show');
}, false);

document.addEventListener('drop', async e => {
    e.preventDefault();
    e.stopPropagation();
    document.querySelector('#dragdrop').classList.remove('show');

    if (!e.dataTransfer.files[0] || !/audio|video/i.test(e.dataTransfer.files[0].type)) {
        return false;
    }


    await editor.pause();
    const droppedFile = URL.createObjectURL(e.dataTransfer.files[0]);
    editor.setSource(droppedFile);
    editor.play();

    return false;
}, false);