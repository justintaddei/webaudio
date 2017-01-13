var audio = document.querySelector('audio');
var audioContext = new AudioContext();
var audioElementSource = audioContext.createMediaElementSource(audio);
var source = audioElementSource;
var canvas1 = document.querySelector('#canvas1');
var canvas2 = document.querySelector('#canvas2');
var synthFrequencyLabel = document.querySelector('[for=synthFrequency]');
var synthFrequencyLabelCount = document.querySelector('[for=synthFrequency] > input');
var synthFrequency = document.querySelector('#synthFrequency');
synthFrequencyLabelCount.style.display = 'none';
synthFrequencyLabel.style.display = 'none';
synthFrequency.style.display = 'none';
var canvas1Context = canvas1.getContext('2d');
var canvas2Context = canvas2.getContext('2d');
var synth = false;
var microphone = false;
canvas1.width = canvas1.getBoundingClientRect().width;
canvas1.height = canvas1.getBoundingClientRect().height;

navigator.getUserMedia(
    {
        audio: true
    },
    function (stream) {
        microphone = audioContext.createMediaStreamSource(stream);
    },
    function (err) {
        console.log('The following gUM error occured: ' + err);
    }
);

var analyser = audioContext.createAnalyser();
var gain1;
var gain2;
var filter = audioContext.createGain();
source.connect(filter);
filter.connect(analyser);
analyser.connect(audioContext.destination);

function changeFilter(filterType) {
    source.disconnect(filter);
    if (synth)
        filter.disconnect(gain1);
    else
        filter.disconnect(analyser);

    if (filterType === 'none') {
        filter = audioContext.createGain();
    } else {
        filter = audioContext.createBiquadFilter();
        filter.type = filterType;
    }

    source.connect(filter);

    if (synth)
        filter.connect(gain1);
    else
        filter.connect(analyser);
}

function changeSource(src) {
    if (src === 'sine') {
        synthFrequencyLabelCount.style.display = '';
        synthFrequency.style.display = '';
        synthFrequencyLabel.style.display = '';
        source.disconnect(filter);
        if (!synth)
            filter.disconnect(analyser);
        else
            filter.disconnect(gain1);
        source = audioContext.createOscillator();
        source.frequency.value = synthFrequency.value;
        gain1 = audioContext.createGain();
        gain1.gain.value = 0.3;
        source.connect(filter);
        filter.connect(gain1);
        gain1.connect(analyser);
        if (!synth)
            analyser.disconnect(audioContext.destination);
        else
            analyser.disconnect(gain2);

        gain2 = audioContext.createGain();
        gain2.gain.value = 0.05;
        analyser.connect(gain2);
        gain2.connect(audioContext.destination);
        source.start(0);
        audio.style.display = 'none';
    } else if (src === 'microphone') {
        if (!microphone)
            return alert('No microphone access!');
        source.disconnect(filter);
        if (!synth)
            filter.disconnect(analyser);
        else
            filter.disconnect(gain1);
        source = microphone;
        gain1 = audioContext.createGain();
        gain1.gain.value = 1;
        source.connect(filter);
        filter.connect(gain1);
        gain1.connect(analyser);
        if (!synth)
            analyser.disconnect(audioContext.destination);
        else
            analyser.disconnect(gain2);

        gain2 = audioContext.createGain();
        gain2.gain.value = 0;
        analyser.connect(gain2);
        gain2.connect(audioContext.destination);
        synthFrequencyLabel.style.display = 'none';
        synthFrequencyLabelCount.style.display = 'none';
        synthFrequency.style.display = 'none';
        audio.style.display = 'none';
    }
    synth = true;
}

analyser.fftSize = 2048;

var frequencyBinCount = analyser.frequencyBinCount;
var height = canvas1.height;
var width = canvas1.width;
var barWidth = width / frequencyBinCount;
var frequencyData = new Uint8Array(frequencyBinCount);
var timeDomainData = new Uint8Array(frequencyBinCount);
var delay = 0;
var clearDelay = 1;
function draw() {
    analyser.getByteFrequencyData(frequencyData);
    analyser.getByteTimeDomainData(timeDomainData);
    canvas1Context.clearRect(0, 0, width, height);
    if (delay % clearDelay === 0)
        canvas2Context.clearRect(0, 0, width, height);

    delay++;

    var barXOffset = 0;

    var color = 'rgb(0,200,145)';
    var grd = canvas1Context.createLinearGradient(0, 0, 0, height);
    grd.addColorStop(0, 'rgb(255, 0, 0)');
    grd.addColorStop(1, 'rgb(0,255,100)');
    canvas1Context.fillStyle = grd;
    canvas1Context.lineJoin = 'round';
    canvas1Context.lineCap = 'round';
    canvas2Context.strokeStyle = color;
    canvas2Context.lineJoin = 'round';
    canvas2Context.lineCap = 'round';

    canvas1Context.beginPath();
    canvas2Context.beginPath();

    canvas1Context.moveTo(0, height);
    for (var i = 0; i < frequencyBinCount; i++) {
        var barHeight = frequencyData[i] / 256 * height;
        var barYOffset = height - barHeight;
        canvas1Context.lineTo(barXOffset, barYOffset);

        var v = timeDomainData[i];
        var y = v - (height/8);
        if (i === 0) {
            canvas2Context.moveTo(barXOffset, y);
        } else {
            canvas2Context.lineTo(barXOffset, y);
        }

        barXOffset += barWidth;
    }

    canvas1Context.lineTo(width, height);
    canvas2Context.lineTo(width, height / 2);
    canvas1Context.closePath();
    canvas1Context.fill();
    canvas2Context.stroke();

    requestAnimationFrame(draw);
}

/*function draw() {
    analyser.getByteFrequencyData(frequencyData);
    analyser.getByteTimeDomainData(timeDomainData);
    canvas1Context.clearRect(0, 0, width, height);
    if (delay % clearDelay === 0)
        canvas2Context.clearRect(0, 0, width, height);

    delay++;

    var barXOffset = 0;

    var color = 'rgb(0,200,145)';
    var grd = canvas1Context.createLinearGradient(0, 0, 0, height);
    grd.addColorStop(0, 'rgb(255, 0, 0)');
    grd.addColorStop(1, 'rgb(0,255,100)');
    canvas2Context.strokeStyle = color;
    canvas2Context.lineJoin = 'round';
    canvas2Context.lineCap = 'round';
    canvas1Context.fillStyle = grd;

    canvas2Context.beginPath();

    for (var i = 0; i < frequencyBinCount; i++) {
        var barHeight = frequencyData[i] / 255 * height;
        var barYOffset = height - barHeight;
        canvas1Context.fillRect(barXOffset, barYOffset, barWidth, barHeight);

        var v = timeDomainData[i] / 255.0;
        var y = ((height / 2) * v);
        if (i === 0) {
            canvas2Context.moveTo(barXOffset, y);
        } else {
            canvas2Context.lineTo(barXOffset, y);
        }

        barXOffset += barWidth;
    }

    canvas2Context.lineTo(width, height / 2);
    canvas2Context.stroke();

    requestAnimationFrame(draw);
}*/

draw();

document.querySelector('#track').addEventListener('change', function () {
    if (this.value.indexOf('.mp3') < 0) {
        changeSource(this.value);
        return;
    }
    synthFrequencyLabel.style.display = 'none';
    synthFrequencyLabelCount.style.display = 'none';
    synthFrequency.style.display = 'none';
    audio.style.display = 'block';
    audio.src = this.value;
    if (gain1 && synth) {
        source.disconnect(filter);
        filter.disconnect(gain1);
        source = audioElementSource;
        analyser.disconnect(gain2);
        gain2.disconnect(audioContext.destination);
        source.connect(filter);
        filter.connect(analyser);
        analyser.connect(audioContext.destination);
    }
    synth = false;
    audio.play();
});

var canSliderChangeFrequency = true;
document.querySelector('#smoothing').addEventListener('change', function () {
    analyser.smoothingTimeConstant = this.value;
});
document.addEventListener('mousemove', function () {
    analyser.smoothingTimeConstant = document.querySelector('#smoothing').value;
    clearDelay = document.querySelector('#delay').value;
});
document.querySelector('#delay').addEventListener('change', function () {
    clearDelay = this.value;
});
synthFrequency.addEventListener('change', function () {
    source.frequency.value = synthFrequency.value;
    synthFrequencyLabelCount.value = synthFrequency.value;
});
synthFrequency.addEventListener('mousemove', function () {
    if (canSliderChangeFrequency && source.frequency) {
        source.frequency.value = synthFrequency.value;
        synthFrequencyLabelCount.value = synthFrequency.value;
    }
});
synthFrequency.addEventListener('mousedown', function () {
    canSliderChangeFrequency = true;
});
synthFrequencyLabelCount.addEventListener('change', function () {
    source.frequency.value = synthFrequencyLabelCount.value;
    synthFrequency.value = synthFrequencyLabelCount.value;
    canSliderChangeFrequency = false;
});
document.querySelector('#filter').addEventListener('change', function () {
    changeFilter(this.value);
});