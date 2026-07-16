const audio = document.getElementById('lofiPlayer');
audio.volume = 0.4;

chrome.runtime.onMessage.addListener((message) => {
    if (message.target !== 'offscreen') return;

    if (message.type === 'PLAY_LOFI') {
        audio.play();
    } else if (message.type === 'PAUSE_LOFI') {
        audio.pause();
    }
});