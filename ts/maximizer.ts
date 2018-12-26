export class Maximizer {
    private limiter: DynamicsCompressorNode;
    private postGain: GainNode;

    constructor(ctx: AudioContext) {
        this.postGain = ctx.createGain();
        this.limiter = ctx.createDynamicsCompressor();
        this.limiter.threshold.value = -2; // this is the pitfall, leave some headroom
        this.limiter.knee.value = 0.0; // brute force
        this.limiter.ratio.value = 20.0; // max compression
        this.limiter.attack.value = 0.005; // 5ms attack
        this.limiter.release.value = 0.050; // 50ms release

        this.limiter.connect(this.postGain);

        this.postGainLevel = 1;
    }

    get input() {
        return this.limiter;
    }
    get output() {
        return this.postGain;
    }

    set threshold(db: number) {
        this.limiter.threshold.value = db;
    }

    get postGainLevel(): number {
        return this.postGain.gain.value;
    }
    set postGainLevel(gain: number) {
        this.postGain.gain.value = gain;
    }
}