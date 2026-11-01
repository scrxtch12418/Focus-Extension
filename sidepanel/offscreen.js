// Focus Command Center — Ambient Audio & Chime Engine
// Runs inside the Chrome MV3 Offscreen Document

const lofiAudio = document.getElementById('lofiPlayer');
let audioCtx = null;
let masterGain = null;
let currentSourceNode = null;
let currentSoundscape = 'lofi';
let isPlaying = false;
let currentVolume = 0.5;

// Lazy initialize AudioContext on user action
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

// Generate 5-second buffer of pink/brown noise for procedural soundscapes
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
            data[i] = lastOut * 3.5; // Gain compensation
        }
    } else {
        // Pink noise (Paul Kellet's filter method)
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

// Stop any currently running procedural Web Audio nodes
function stopProcedural() {
    if (currentSourceNode) {
        try {
            if (currentSourceNode.stop) currentSourceNode.stop();
            if (currentSourceNode.disconnect) currentSourceNode.disconnect();
        } catch (e) {}
        currentSourceNode = null;
    }
}

// Start procedural soundscape
function playProceduralSoundscape(name) {
    const ctx = getAudioContext();
    stopProcedural();

    if (name === 'rain') {
        // Rain: Pink noise through bandpass + highpass with gentle drops
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
        // Brown noise for deep focus & ADHD calming
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
        // Ocean: Brown/pink noise with oscillating swell (0.1 Hz LFO)
        const noiseSource = ctx.createBufferSource();
        noiseSource.buffer = createNoiseBuffer('brown');
        noiseSource.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(600, ctx.currentTime);

        const swellGain = ctx.createGain();
        swellGain.gain.setValueAtTime(0.25, ctx.currentTime);

        // LFO for wave swells
        const lfo = ctx.createOscillator();
        lfo.frequency.setValueAtTime(0.12, ctx.currentTime); // ~8.3 second wave cycle

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
        // Café: Warm pink noise with multi-frequency low buzz
        const noiseSource = ctx.createBufferSource();
        noiseSource.buffer = createNoiseBuffer('pink');
        noiseSource.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(750, ctx.currentTime);
        filter.Q.setValueAtTime(1.2, ctx.currentTime);

        // Subtle warm hum (60Hz + 120Hz harmonics)
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
    }
}

// Master soundscape control
function startSoundscape(name) {
    currentSoundscape = name || currentSoundscape;
    isPlaying = true;

    if (currentSoundscape === 'lofi') {
        stopProcedural();
        if (lofiAudio) {
            lofiAudio.volume = currentVolume;
            lofiAudio.play().catch(err => console.error('Lofi audio play error:', err));
        }
    } else {
        if (lofiAudio) {
            lofiAudio.pause();
        }
        playProceduralSoundscape(currentSoundscape);
    }
}

function stopSoundscape() {
    isPlaying = false;
    if (lofiAudio) {
        lofiAudio.pause();
    }
    stopProcedural();
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

// Synthesize serene meditation chime / bowl for Pomodoro completion
function playChime(mode = 'focus') {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    if (mode === 'focus') {
        // Tibetan Singing Bowl / Miracle 528Hz Focus Chime
        const fundamental = 528;
        const harmonics = [1, 2, 2.76, 5.4];
        const harmonicGains = [0.45, 0.22, 0.12, 0.04];

        harmonics.forEach((mult, index) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = index === 0 ? 'sine' : 'sine';
            osc.frequency.setValueAtTime(fundamental * mult, now);

            // Exponential decay over 3.2 seconds
            gain.gain.setValueAtTime(harmonicGains[index] * currentVolume, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.2);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now);
            osc.stop(now + 3.3);
        });
    } else {
        // Uplifting two-tone major third chime for Break Finished (D5 -> F#5)
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

// Runtime message dispatcher
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.target !== 'offscreen') return;

    if (message.type === 'PLAY_SOUNDSCAPE') {
        if (message.volume !== undefined) setMasterVolume(message.volume);
        startSoundscape(message.soundscape || currentSoundscape);
        sendResponse({ success: true, isPlaying: true, soundscape: currentSoundscape });
    } else if (message.type === 'PAUSE_SOUNDSCAPE') {
        stopSoundscape();
        sendResponse({ success: true, isPlaying: false });
    } else if (message.type === 'SET_AMBIENT_VOLUME') {
        setMasterVolume(message.volume);
        sendResponse({ success: true, volume: currentVolume });
    } else if (message.type === 'PLAY_CHIME') {
        playChime(message.mode || 'focus');
        sendResponse({ success: true });
    } else if (message.type === 'PLAY_LOFI') {
        // Backward compatibility
        startSoundscape('lofi');
    } else if (message.type === 'PAUSE_LOFI') {
        stopSoundscape();
    }
});
