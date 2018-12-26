/**
 * Converts a time in seconds to minute:second format
 * @param t The time to format
 */
function formatTime(t) {
    let min = Math.floor(Math.floor(t) / 60);
    let sec = Math.floor(Math.floor(t % 60));
    return `${min < 10 ? `0${min}` : min}:${sec < 10 ? `0${sec}` : sec}`;
}
export class Controls {
    constructor() {
        this.canvas = document.querySelector('#audioControls');
        this.timeDisplay = document.querySelector('#currentTime');
        this.duration = 0;
        this._time = 0;
        this.amplitude = 0;
        this.paused = true;
        this.seeking = false;
        this.onTogglePlayState = () => { };
        this.onSeek = () => { };
        this.ctx = this.canvas.getContext('2d');
        const { width, height } = this.canvas.getBoundingClientRect();
        this.canvas.width = width;
        this.canvas.height = height;
        this.grad = this.ctx.createRadialGradient(0, 0, 0, 0, 0, this.canvas.height / 2 * 0.75);
        this.grad.addColorStop(0, 'rgb(0,255,100)');
        this.grad.addColorStop(1, 'rgb(255, 0, 0)');
        // this.canvas.addEventListener('click', )
        this.canvas.addEventListener('pointerdown', e => {
            const { x, y } = this.shiftPointerPos(e);
            const dist = Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));
            if (dist > this.canvas.width / 2 * 0.75) {
                e.preventDefault();
                e.stopPropagation();
                this.seeking = true;
                document.body.style.touchAction = 'none';
                let theta = Math.atan2(y, x) + Math.PI * 0.5;
                if (theta < 0)
                    theta = 6.283185307179586 /* TAU */ + theta;
                this.time = theta / 6.283185307179586 /* TAU */ * this.duration;
            }
            else {
                this.onTogglePlayState();
            }
        });
        document.addEventListener('pointermove', e => {
            if (!this.seeking)
                return;
            e.preventDefault();
            e.stopPropagation();
            const { x, y } = this.shiftPointerPos(e);
            let theta = Math.atan2(y, x) + Math.PI * 0.5;
            if (theta < 0)
                theta = 6.283185307179586 /* TAU */ + theta;
            this.time = theta / 6.283185307179586 /* TAU */ * this.duration;
        });
        document.addEventListener('pointerup', e => {
            if (this.seeking)
                this.onSeek(this.time);
            document.body.style.touchAction = '';
            this.seeking = false;
        });
        this.render();
    }
    get time() {
        return this._time;
    }
    set time(t) {
        this._time = t;
        this.timeDisplay.textContent = `${formatTime(t)}/${formatTime(this.duration)}`;
    }
    setTime(t) {
        if (!this.seeking)
            this.time = t;
    }
    get progress() {
        return this.time / this.duration;
    }
    shiftPointerPos(e) {
        const { top, left, width, height } = this.canvas.getBoundingClientRect();
        return {
            x: e.x - (left + width / 2),
            y: e.y - (top + height / 2)
        };
    }
    triangle(sideLength, cx, cy) {
        const h = sideLength * (Math.sqrt(3) / 2);
        this.ctx.save();
        this.ctx.translate(cx, cy);
        this.ctx.beginPath();
        this.ctx.moveTo(0, -h / 2);
        this.ctx.lineTo(-sideLength / 2, h / 2);
        this.ctx.lineTo(sideLength / 2, h / 2);
        this.ctx.closePath();
        this.ctx.restore();
    }
    rotate(x, y, degs) {
        this.ctx.translate(x, y);
        this.ctx.rotate(degs);
        this.ctx.translate(-x, -y);
    }
    drawPlayButton(mid) {
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(mid, mid, mid * 0.752, 0, 6.283185307179586 /* TAU */);
        this.ctx.closePath();
        this.ctx.fillStyle = "#26a69a" /* MAIN */;
        this.ctx.fill();
        this.rotate(mid, mid, 1.57079633 /* NINETY_DEGREES */);
        this.triangle(50, mid, mid - 3.5);
        this.ctx.fillStyle = "#333" /* BACKGROUND */;
        this.ctx.fill();
        this.ctx.restore();
    }
    drawAmplitude(mid) {
        const buttonWidth = 43.301;
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.translate(mid, mid);
        // const scale = this.visualizer.currentAmplitude + 0.8;
        // this.ctx.scale(scale, scale);
        let smallest = buttonWidth * 1.05;
        let biggest = mid * 0.75;
        let circleRadius = smallest + (biggest - smallest) * this.amplitude;
        if (isNaN(circleRadius))
            circleRadius = smallest;
        this.ctx.arc(0, 0, circleRadius, 0, 6.283185307179586 /* TAU */);
        this.ctx.closePath();
        this.ctx.fillStyle = this.grad;
        this.ctx.fill();
        this.ctx.restore();
    }
    drawPauseButton(mid) {
        const buttonWidth = 43.301;
        const barWidth = 15;
        this.ctx.fillStyle = "#333" /* BACKGROUND */;
        this.ctx.fillRect(mid - buttonWidth / 2, mid - 25, barWidth, 50);
        this.ctx.fillRect((mid + buttonWidth / 2) - barWidth, mid - 25, barWidth, 50);
    }
    render() {
        const mid = this.canvas.width * 0.5;
        this.ctx.restore();
        this.ctx.save();
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.rotate(mid, mid, -1.57079633 /* NINETY_DEGREES */);
        this.ctx.beginPath();
        this.ctx.moveTo(mid, mid);
        this.ctx.arc(mid, mid, mid, 0, this.progress * 6.283185307179586 /* TAU */);
        this.ctx.closePath();
        this.ctx.fillStyle = "#26a69a" /* MAIN */;
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.moveTo(mid, mid);
        this.ctx.arc(mid, mid, mid * 0.75, 0, 6.283185307179586 /* TAU */);
        this.ctx.closePath();
        this.ctx.fillStyle = '#222';
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.moveTo(mid, mid);
        this.ctx.arc(mid, mid, mid * 0.75 - 4, 0, 6.283185307179586 /* TAU */);
        this.ctx.closePath();
        this.ctx.fillStyle = "#333" /* BACKGROUND */;
        this.ctx.fill();
        this.ctx.restore();
        this.drawAmplitude(mid);
        if (this.paused)
            this.drawPlayButton(mid);
        else
            this.drawPauseButton(mid);
        requestAnimationFrame(() => this.render());
    }
}
//# sourceMappingURL=audio-controls.js.map