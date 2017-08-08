const SUPPORTS_WEB_AUDIO = ('AudioContext' in window || 'webkitAudioContext' in window || 'mozAudioContext' in window || false);

const WEB_AUDIO = SUPPORTS_WEB_AUDIO ? (window.AudioContext || window.webkitAudioContext || window.mozAudioContext) : null;

const SUPPORTS_MEDIA_RECORDER = 'MediaRecorder' in window;

const queueFrame = (requestAnimationFrame || webkitRequestAnimationFrame || mozRequestAnimationFrame || function (fn) {
    return setTimeout(fn, 16);
});
const removeFrameFromQueue = (cancelAnimationFrame || webkitCancelAnimationFrame || mozCancelAnimationFrame || function (fn) {
    return clearTimeout(fn, 16);
});

if (SUPPORTS_WEB_AUDIO)
    document.body.classList.add('web-audio-support');
else
    document.body.classList.add('no-web-audio-support');

// From https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
// Older browsers might not implement mediaDevices at all, so we set an empty object first
if (navigator.mediaDevices === undefined) {
    navigator.mediaDevices = {};
}

// Some browsers partially implement mediaDevices. We can't just assign an object
// with getUserMedia as it would overwrite existing properties.
// Here, we will just add the getUserMedia property if it's missing.
if (navigator.mediaDevices.getUserMedia === undefined) {
    navigator.mediaDevices.getUserMedia = function (constraints) {

        // First get ahold of the legacy getUserMedia, if present
        var getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

        // Some browsers just don't implement it - return a rejected promise with an error
        // to keep a consistent interface
        if (!getUserMedia) {
            return Promise.reject(new Error('getUserMedia is not implemented in this browser'));
        }

        // Otherwise, wrap the call to the old navigator.getUserMedia with a Promise
        return new Promise(function (resolve, reject) {
            getUserMedia.call(navigator, constraints, resolve, reject);
        });
    }
}