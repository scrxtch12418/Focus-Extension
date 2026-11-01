// Focus Command Center — Bulletproof Ambient Audio & Lofi Engine
// Runs inside the Chrome MV3 Offscreen Document

const lofiAudio = document.getElementById('lofiPlayer');
let audioCtx = null;
let masterGain = null;
let currentSourceNode = null;
let currentSoundscape = 'lofi';
let isPlaying = false;
let currentVolume = 0.5;
let lofiChordInterval = null;

function getAudioContext() {
    if (!audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioContextClass();
        masterGain = audioCtx.createGain();
        masterGain.gain.setValueAtTime(currentVolume, audioCtx.currentTime);
        masterGain.connect(audioCtx.destination);
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

// Generate pink or brown noise buffer for soundscapes
function createNoiseBuffer(type = 'pink') {
    const ctx = getAudioContext();
    const bufferSize = ctx.sampleRate * 5;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    if (type === 'brown') {
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            lastOut = (lastOut + (0.02 * white)) / 1.02;
            data[i] = lastOut * 3.5;
        }
    } else {
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;
            data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
            b6 = white * 0.115926;
        }
    }
    return buffer;
}

function stopProcedural() {
    if (lofiChordInterval) {
        clearInterval(lofiChordInterval);
        lofiChordInterval = null;
    }
    if (currentSourceNode) {
        try {
            if (currentSourceNode.stop) currentSourceNode.stop();
            if (currentSourceNode.disconnect) currentSourceNode.disconnect();
        } catch (e) {}
        currentSourceNode = null;
    }
}

// Procedural Lo-Fi Electric Piano Chords (Jazzy 7th chords + vinyl texture)
// Runs 100% offline, zero bandwidth, sounds soothing and never drops out!
function playProceduralLofiSynth() {
    const ctx = getAudioContext();
    stopProcedural();

    // Subtle vinyl crackle/surface noise in background
    const vinylBuffer = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
    const vinylData = vinylBuffer.getChannelData(0);
    for (let i = 0; i < vinylData.length; i++) {
        if (Math.random() < 0.0008) {
            vinylData[i] = (Math.random() * 2 - 1) * 0.15;
        } else {
            vinylData[i] = (Math.random() * 2 - 1) * 0.005;
        }
    }
    const vinylSource = ctx.createBufferSource();
    vinylSource.buffer = vinylBuffer;
    vinylSource.loop = true;
    const vinylFilter = ctx.createBiquadFilter();
    vinylFilter.type = 'lowpass';
    vinylFilter.frequency.setValueAtTime(1400, ctx.currentTime);
    const vinylGain = ctx.createGain();
    vinylGain.gain.setValueAtTime(0.08, ctx.currentTime);
    vinylSource.connect(vinylFilter);
    vinylFilter.connect(vinylGain);
    vinylGain.connect(masterGain);
    vinylSource.start();

    // Jazz Lo-Fi Chord Progressions (in Hz)
    const progressions = [
        [261.63, 329.63, 392.00, 493.88], // Cmaj7
        [220.00, 261.63, 329.63, 392.00], // Am7
        [293.66, 349.23, 440.00, 523.25], // Dm7
        [196.00, 246.94, 293.66, 349.23], // G7
        [174.61, 220.00, 261.63, 329.63]  // Fmaj7
    ];

    let chordIndex = 0;

    function triggerChord() {
        if (!isPlaying || currentSoundscape !== 'lofi') return;
        const now = ctx.currentTime;
        const freqs = progressions[chordIndex % progressions.length];
        chordIndex++;

        freqs.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const noteGain = ctx.createGain();
            const filter = ctx.createBiquadFilter();

            osc.type = i % 2 === 0 ? 'sine' : 'triangle';
            // Slight detune for analog warmth
            const detuneAmount = (Math.random() - 0.5) * 6;
            osc.frequency.setValueAtTime(freq, now);
            osc.detune.setValueAtTime(detuneAmount, now);

            // Warm lowpass filter
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(550 + (i * 80), now);

            // Envelope: soft attack, sustained bell decay
            noteGain.gain.setValueAtTime(0.0001, now);
            noteGain.gain.linearRampToValueAtTime(0.07, now + 0.35);
            noteGain.gain.exponentialRampToValueAtTime(0.001, now + 3.8);

            osc.connect(filter);
            filter.connect(noteGain);
            noteGain.connect(masterGain);

            osc.start(now);
            osc.stop(now + 3.9);
        });
    }

    triggerChord();
    lofiChordInterval = setInterval(triggerChord, 3600);

    currentSourceNode = {
        stop: () => {
            if (lofiChordInterval) clearInterval(lofiChordInterval);
            try { vinylSource.stop(); } catch(e) {}
        },
        disconnect: () => {
            try { vinylSource.disconnect(); vinylGain.disconnect(); } catch(e) {}
        }
    };
}

// Procedural soundscapes
function playProceduralSoundscape(name) {
    const ctx = getAudioContext();
    stopProcedural();

    if (name === 'rain') {
        const noiseSource = ctx.createBufferSource();
        noiseSource.buffer = createNoiseBuffer('pink');
        noiseSource.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, ctx.currentTime);

        const highpass = ctx.createBiquadFilter();
        highpass.type = 'highpass';
        highpass.frequency.setValueAtTime(180, ctx.currentTime);

        noiseSource.connect(highpass);
        highpass.connect(filter);
        filter.connect(masterGain);

        noiseSource.start();
        currentSourceNode = noiseSource;

    } else if (name === 'noise') {
        const noiseSource = ctx.createBufferSource();
        noiseSource.buffer = createNoiseBuffer('brown');
        noiseSource.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(550, ctx.currentTime);

        noiseSource.connect(filter);
        filter.connect(masterGain);

        noiseSource.start();
        currentSourceNode = noiseSource;

    } else if (name === 'ocean') {
        const noiseSource = ctx.createBufferSource();
        noiseSource.buffer = createNoiseBuffer('brown');
        noiseSource.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(600, ctx.currentTime);

        const swellGain = ctx.createGain();
        swellGain.gain.setValueAtTime(0.25, ctx.currentTime);

        const lfo = ctx.createOscillator();
        lfo.frequency.setValueAtTime(0.12, ctx.currentTime);

        const lfoGain = ctx.createGain();
        lfoGain.gain.setValueAtTime(0.35, ctx.currentTime);

        lfo.connect(lfoGain);
        lfoGain.connect(swellGain.gain);

        noiseSource.connect(filter);
        filter.connect(swellGain);
        swellGain.connect(masterGain);

        lfo.start();
        noiseSource.start();

        currentSourceNode = {
            stop: () => {
                try { noiseSource.stop(); lfo.stop(); } catch(e) {}
            },
            disconnect: () => {
                try { noiseSource.disconnect(); lfo.disconnect(); swellGain.disconnect(); } catch(e) {}
            }
        };

    } else if (name === 'cafe') {
        const noiseSource = ctx.createBufferSource();
        noiseSource.buffer = createNoiseBuffer('pink');
        noiseSource.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(750, ctx.currentTime);
        filter.Q.setValueAtTime(1.2, ctx.currentTime);

        const hum = ctx.createOscillator();
        hum.frequency.setValueAtTime(110, ctx.currentTime);
        const humGain = ctx.createGain();
        humGain.gain.setValueAtTime(0.04, ctx.currentTime);
        hum.connect(humGain);

        noiseSource.connect(filter);
        filter.connect(masterGain);
        humGain.connect(masterGain);

        hum.start();
        noiseSource.start();

        currentSourceNode = {
            stop: () => {
                try { noiseSource.stop(); hum.stop(); } catch(e) {}
            },
            disconnect: () => {
                try { noiseSource.disconnect(); hum.disconnect(); filter.disconnect(); } catch(e) {}
            }
        };

    } else if (name === 'binaural') {
        // 40Hz Gamma wave for peak focus (200Hz Left, 240Hz Right)
        const leftOsc = ctx.createOscillator();
        const rightOsc = ctx.createOscillator();
        const merger = ctx.createChannelMerger(2);

        leftOsc.type = 'sine';
        leftOsc.frequency.setValueAtTime(200, ctx.currentTime);

        rightOsc.type = 'sine';
        rightOsc.frequency.setValueAtTime(240, ctx.currentTime);

        const binGain = ctx.createGain();
        binGain.gain.setValueAtTime(0.2, ctx.currentTime);

        leftOsc.connect(merger, 0, 0);
        rightOsc.connect(merger, 0, 1);
        merger.connect(binGain);
        binGain.connect(masterGain);

        leftOsc.start();
        rightOsc.start();

        currentSourceNode = {
            stop: () => {
                try { leftOsc.stop(); rightOsc.stop(); } catch(e) {}
            },
            disconnect: () => {
                try { leftOsc.disconnect(); rightOsc.disconnect(); merger.disconnect(); } catch(e) {}
            }
        };
    }
}

// Master soundscape control
function startSoundscape(name) {
    currentSoundscape = name || currentSoundscape;
    isPlaying = true;
    getAudioContext();

    if (currentSoundscape === 'lofi') {
        stopProcedural();
        if (lofiAudio) {
            lofiAudio.volume = currentVolume;
            const playPromise = lofiAudio.play();
            if (playPromise !== undefined) {
                playPromise.catch(err => {
                    console.warn('Lofi web stream unavailable, activating procedural chill synth fallback:', err);
                    playProceduralLofiSynth();
                });
            }
        } else {
            playProceduralLofiSynth();
        }
    } else {
        if (lofiAudio) {
            lofiAudio.pause();
        }
        playProceduralSoundscape(currentSoundscape);
    }

    broadcastAudioState();
}

function stopSoundscape() {
    isPlaying = false;
    if (lofiAudio) {
        lofiAudio.pause();
    }
    stopProcedural();
    broadcastAudioState();
}

function setMasterVolume(vol) {
    currentVolume = Math.max(0, Math.min(1, vol));
    if (lofiAudio) {
        lofiAudio.volume = currentVolume;
    }
    if (masterGain && audioCtx) {
        masterGain.gain.setValueAtTime(currentVolume, audioCtx.currentTime);
    }
}

function playChime(mode = 'focus') {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    if (mode === 'focus') {
        const fundamental = 528;
        const harmonics = [1, 2, 2.76, 5.4];
        const harmonicGains = [0.45, 0.22, 0.12, 0.04];

        harmonics.forEach((mult, index) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(fundamental * mult, now);

            gain.gain.setValueAtTime(harmonicGains[index] * currentVolume, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.2);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now);
            osc.stop(now + 3.3);
        });
    } else {
        const notes = [
            { freq: 587.33, start: 0, dur: 1.5 },
            { freq: 739.99, start: 0.18, dur: 2.0 }
        ];

        notes.forEach(note => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(note.freq, now + note.start);

            gain.gain.setValueAtTime(0.35 * currentVolume, now + note.start);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + note.start + note.dur);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now + note.start);
            osc.stop(now + note.start + note.dur + 0.1);
        });
    }
}

function broadcastAudioState() {
    chrome.runtime.sendMessage({
        type: 'AMBIENT_STATE_CHANGED',
        isPlaying,
        soundscape: currentSoundscape,
        volume: currentVolume
    }).catch(() => {});
}

// Runtime message dispatcher
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.target !== 'offscreen') return;

    if (message.type === 'PING') {
        sendResponse({ ready: true, isPlaying, soundscape: currentSoundscape });
    } else if (message.type === 'PLAY_SOUNDSCAPE') {
        if (message.volume !== undefined) setMasterVolume(message.volume);
        startSoundscape(message.soundscape || currentSoundscape);
        sendResponse({ success: true, isPlaying: true, soundscape: currentSoundscape });
    } else if (message.type === 'PAUSE_SOUNDSCAPE') {
        stopSoundscape();
        sendResponse({ success: true, isPlaying: false });
    } else if (message.type === 'TOGGLE_SOUNDSCAPE') {
        if (isPlaying) {
            stopSoundscape();
        } else {
            if (message.soundscape) currentSoundscape = message.soundscape;
            if (message.volume !== undefined) setMasterVolume(message.volume);
            startSoundscape(currentSoundscape);
        }
        sendResponse({ success: true, isPlaying, soundscape: currentSoundscape });
    } else if (message.type === 'SET_AMBIENT_VOLUME') {
        setMasterVolume(message.volume);
        sendResponse({ success: true, volume: currentVolume });
    } else if (message.type === 'PLAY_CHIME') {
        playChime(message.mode || 'focus');
        sendResponse({ success: true });
    } else if (message.type === 'GET_AUDIO_STATUS') {
        sendResponse({ isPlaying, soundscape: currentSoundscape, volume: currentVolume });
    }
});

// Notify background that offscreen is loaded and ready
chrome.runtime.sendMessage({ type: 'OFFSCREEN_LOADED' }).catch(() => {});
