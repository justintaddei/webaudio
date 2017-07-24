const SUPPORTS_WEB_AUDIO = ('AudioContext' in window || 'webkitAudioContext' in window || 'mozAudioContext' in window || false);

const WEB_AUDIO = SUPPORTS_WEB_AUDIO ? (window.AudioContext || window.webkitAudioContext || window.mozAudioContext) : null;

const SUPPORTS_MEDIA_RECORDER = 'MediaRecorder' in window;

const queueFrame = (requestAnimationFrame || webkitRequestAnimationFrame || mozRequestAnimationFrame || function (fn) {
    return setTimeout(fn, 16);
});
const removeFrameFromQueue = (cancelAnimationFrame || webkitCancelAnimationFrame || mozCancelAnimationFrame || function (fn) {
    return clearTimeout(fn, 16);
});