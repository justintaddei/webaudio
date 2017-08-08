var audio = document.querySelector('audio');
var audioContext = new (window.AudioContext || window.webkitAudioContext || window.mozAudioContext)();
var audioElementSource = audioContext.createMediaElementSource(audio);
var source = audioElementSource;
var canvas1 = document.querySelector('#canvas1');
var canvas2 = document.querySelector('#canvas2');
var canvasAvg = document.querySelector('#canvasAvg');
var synthFrequencyLabel = document.querySelector('[for=synthFrequency]');
var synthFrequencyLabelCount = document.querySelector('[for=synthFrequency] > input');
var synthFrequency = document.querySelector('#synthFrequency');
var avgTimeScaleLabelCount = document.querySelector('[for=avgTimeScale] > input');
var avgTimeScaleVal = document.querySelector('#avgTimeScale');
var filterFLabel = document.querySelector('[for=filterF]');
var filterFLabelCount = document.querySelector('[for=filterF] > input');
var filterF = document.querySelector('#filterF');
var mediaRecorder = false, recordedDataChunks = [], recordedObjUrl = false;
var record = document.querySelector('#record');
var deleteRecording = document.querySelector('#delete');
var track = document.querySelector('#track');
record.style.display = 'none';

filterFLabel.style.display = 'none';
filterF.style.display = 'none';
synthFrequencyLabelCount.style.display = 'none';
synthFrequencyLabel.style.display = 'none';
synthFrequency.style.display = 'none';
var canvas1Context = canvas1.getContext('2d');
var canvas2Context = canvas2.getContext('2d');
var canvasAvgContext = canvasAvg.getContext('2d');
var synth = false;
var microphone = false;
canvas1.width = canvas1.getBoundingClientRect().width;
canvas1.height = canvas1.getBoundingClientRect().height;
canvas2.width = canvas2.getBoundingClientRect().width;
canvas2.height = canvas2.getBoundingClientRect().height;
canvasAvg.width = canvasAvg.getBoundingClientRect().width;
canvasAvg.height = canvasAvg.getBoundingClientRect().height;

if (navigator.getUserMedia) {
    navigator.getUserMedia(
        {
            audio: true
        },
        function (stream) {
            microphone = audioContext.createMediaStreamSource(stream);

            if (window.MediaRecorder)
                mediaRecorder = new MediaRecorder(stream);

            if (mediaRecorder) {
                mediaRecorder.ondataavailable = function (e) {
                    recordedDataChunks.push(e.data);
                };
                record.addEventListener('click', function () {
                    if (mediaRecorder.state === 'recording') {
                        mediaRecorder.stop();
                        record.classList.remove('recording');
                        record.innerHTML = '<i class="material-icons">mic</i><span>Record audio</span>';
                        record.style.display = 'none';
                        record.classList.add('recorded');
                        audio.style.display = '';

                        var blob = new Blob(recordedDataChunks, { 'type': 'audio/ogg; codecs=opus' });
                        recordedDataChunks = [];
                        recordedObjUrl = URL.createObjectURL(blob);
                        changeTrack(recordedObjUrl);
                    } else {
                        mediaRecorder.start(0);
                        record.classList.add('recording');
                        record.innerHTML = '<i class="material-icons">stop</i><span>Stop recording</span>';
                    }
                });

                deleteRecording.addEventListener('click', function () {
                    recordedDataChunks = [];
                    URL.revokeObjectURL(recordedObjUrl);
                    recordedObjUrl = false;
                    record.classList.remove('recorded');
                    changeSource('microphone');
                });
            }
        },
        function (err) {
            console.log('The following gUM error occured: ' + err);
        }
    );
} else {
    document.querySelector('select#track').removeChild(document.querySelector('[value=microphone]'));
}

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
        filterFLabel.style.display = 'none';
        filterF.style.display = 'none';
    } else {
        filter = audioContext.createBiquadFilter();
        filter.type = filterType;
        filterFLabelCount.value = filter.frequency.value;
        filterF.value = filter.frequency.value;
        filterFLabel.style.display = '';
        filterF.style.display = '';
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
        record.style.display = 'none';
    } else if (src === 'microphone') {
        if (!microphone)
            return alert('No microphone access!');
        if (recordedObjUrl !== false)
            return changeTrack(recordedObjUrl);
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
        record.style.display = '';
        audio.style.display = 'none';
    }
    synth = true;
}

try {
    analyser.fftSize = 4096;
} catch (e) {
    console.log(e);
}

var frequencyBinCount = analyser.frequencyBinCount;
var height = canvas1.height;
var width = canvas1.width;
var barWidth = width / frequencyBinCount;
var frequencyData = new Uint8Array(frequencyBinCount);
var timeDomainData = new Uint8Array(frequencyBinCount);
var delay = 0;
var clearDelay = 1;
var grd = canvas1Context.createLinearGradient(0, 0, 0, height);
grd.addColorStop(0, 'rgb(255, 0, 0)');
grd.addColorStop(1, 'rgb(0,255,100)');
var grd2 = canvas1Context.createLinearGradient(0, 0, 0, height);
grd2.addColorStop(0, 'rgb(255, 0, 0)');
grd2.addColorStop(0.5, 'rgb(0,255,100)');
grd2.addColorStop(1, 'rgb(255, 0, 0)');
canvasAvgContext.fillStyle = grd2;

canvas1Context.fillStyle = grd;
canvas1Context.lineJoin = 'round';
canvas1Context.lineCap = 'round';
canvas2Context.strokeStyle = grd2;
canvas2Context.lineJoin = 'round';
canvas2Context.lineCap = 'round';
var avgBarOffset = 1;
var avgX = 0;
var avgTime = Date.now();
audio.addEventListener('play', function () {
    avgTime = Date.now();
    changeTimeScale(avgTimeScaleLabelCount.value);
    if (isPaused) {
        pause();// Play
    }
});
var avgTimeScale = (1000 * 30);// One minute

var recording = false;
function recordWaveform(btn) {
    if (recording) return;
    recording = true;
    btn.innerHTML = 'Recording . . .';
    btn.disabled = true;
    btn.classList.add('red');
    audio.currentTime = 0;
    audio.loop = false;
    audio.play();
    avgTimeScaleLabelCount.value = Math.round(audio.duration) + 1;
    changeTimeScale(Math.round(audio.duration) + 1);
    document.querySelector('#pauseAtEnd').checked = true;
    audio.addEventListener('ended', function () {
        window.location.href = (canvasAvg.toDataURL())
    });

}

/*setInterval(function () {
    if (isPaused)
        return;
},8);*/

function draw() {
    analyser.getByteTimeDomainData(timeDomainData);
    analyser.getByteFrequencyData(frequencyData);
    canvas1Context.clearRect(0, 0, width, height);
    if (delay % clearDelay === 0)
        canvas2Context.clearRect(0, 0, width, height);

    delay++;

    var barXOffset = 0;
    // var avgHeight = 0;

    canvas1Context.beginPath();
    canvas2Context.beginPath();

    canvas1Context.moveTo(0, height);
    var max, min;
    for (var i = 0; i < frequencyBinCount; i++) {
        // avgHeight += frequencyData[i];
        var barHeight = frequencyData[i] / 256 * height;
        var barYOffset = height - barHeight;
        canvas1Context.lineTo(barXOffset, barYOffset);

        var v = timeDomainData[i];
        var y = v / 255 * height;
        if (i === 0) {
            canvas2Context.moveTo(barXOffset, y);
        } else {
            canvas2Context.lineTo(barXOffset, y);
        }

        barXOffset += barWidth;
    }

    max = Math.max.apply(null, timeDomainData) / 255 * height;
    min = Math.min.apply(null, timeDomainData) / 255 * height;
    // canvasAvgContext.lineTo(avgX, min / 255 * height);
    // canvasAvgContext.lineTo(avgX, max / 255 * height);
    canvasAvgContext.fillRect(avgX, min, 1, max - min);
    avgX = ((Date.now() - avgTime) / avgTimeScale) * width;
    // avgX += avgBarOffset;
    // avgHeight /= frequencyBinCount;
    // avgHeight = (avgHeight / 256 * canvasAvg.height) * 1.8;// Increase the height to make it easier to see the peeks and valleys.

    if (avgX > width) {
        if (document.querySelector('#pauseAtEnd').checked) {
            pause();
            document.querySelector('#pauseAtEnd').checked = false;
            audio.pause();
            return;
        }
        // canvasAvgContext.closePath();
        canvasAvgContext.clearRect(0, 0, width, height);
        avgX = 0;
        avgTime = Date.now();
    }

    // if (avgX === 0) {
    // canvasAvgContext.beginPath();
    // canvasAvgContext.moveTo(avgX, timeDomainData[0] / 255 * height);
    // }

    canvas1Context.lineTo(width, height);
    canvas2Context.lineTo(width, height / 2);
    canvas1Context.closePath();
    canvas1Context.fill();
    canvas2Context.stroke();
    canvasAvgContext.stroke();

    window.raf = requestAnimationFrame(draw);
}

draw();
var isPaused = false;
function pause() {
    if (!isPaused) {
        window.cancelAnimationFrame(window.raf);
        document.getElementById('playpause').innerHTML = '<i class="material-icons">play_arrow</i><span>Play graphics</span>';
    } else {
        document.getElementById('playpause').innerHTML = '<i class="material-icons">pause</i><span>Pause graphics</span>';
        draw();
    }
    isPaused = !isPaused;
}

function changeTrack(value) {
    synthFrequencyLabel.style.display = 'none';
    synthFrequencyLabelCount.style.display = 'none';
    synthFrequency.style.display = 'none';
    record.style.display = 'none';
    audio.style.display = 'block';
    audio.src = value;
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
}

document.querySelector('#track').addEventListener('change', function () {
    if (this.value.indexOf('.mp3') < 0 && this.value.indexOf('blob:http') < 0) {
        changeSource(this.value);
        return;
    }
    changeTrack(this.value);
});

var canSliderChangeFrequency = true;
var canSliderChangeTimeScale = true;
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
function changeTimeScale(val) {
    avgTimeScale = val * 1000;
    canvasAvgContext.clearRect(0, 0, width, height);
    avgX = 0;
    avgTime = Date.now();
}
avgTimeScaleVal.addEventListener('change', function () {
    changeTimeScale(avgTimeScaleVal.value);
    avgTimeScaleLabelCount.value = avgTimeScaleVal.value;
});

avgTimeScaleLabelCount.addEventListener('change', function () {
    changeTimeScale(avgTimeScaleVal.value);
    avgTimeScaleVal.value = avgTimeScaleLabelCount.value;
});

document.querySelector('#filter').addEventListener('change', function () {
    changeFilter(this.value);
});

filterFLabelCount.addEventListener('change', function () {
    filter.frequency.value = this.value;
    filterF.value = this.value;
});
filterF.addEventListener('change', function () {
    filter.frequency.value = this.value;
    filterFLabelCount.value = this.value;
});
filterF.addEventListener('mousemove', function () {
    if (filter instanceof BiquadFilterNode) {
        filter.frequency.value = this.value;
        filterFLabelCount.value = this.value;
    }
});


document.addEventListener('dragover', function (e) {
    e.preventDefault();
    document.querySelector('#dragdrop').classList.add('show');
    return false;
}, false);

document.addEventListener('dragleave', function () {
    document.querySelector('#dragdrop').classList.remove('show');
}, false);

document.addEventListener('drop', function (e) {
    e.preventDefault();
    e.stopPropagation();
    document.querySelector('#dragdrop').classList.remove('show');

    audio.src = URL.createObjectURL(e.dataTransfer.files[0]);
    audio.load();
    audio.play();
    return false;
}, false);