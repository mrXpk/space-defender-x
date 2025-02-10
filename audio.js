class AudioManager {
    constructor() {
        this.sounds = {};
        this.musicVolume = 0.3;
        this.sfxVolume = 0.5;
        this.currentMusic = null;

        // Initialize audio context
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Create audio elements
        this.createAudio('shoot', 'sounds/laser.mp3');
        this.createAudio('explosion', 'sounds/explosion.mp3');
        this.createAudio('powerup', 'sounds/powerup.mp3');
        this.createAudio('hit', 'sounds/hit.mp3');
        this.createAudio('bgm', 'sounds/bgm.mp3', true);
        
        // Initialize all game sounds
        this.loadSounds();
    }

    createAudio(name, src, isMusic = false) {
        const audio = new Audio();
        audio.src = src;
        if (isMusic) {
            audio.loop = true;
            audio.volume = this.musicVolume;
        } else {
            audio.volume = this.sfxVolume;
        }
        this.sounds[name] = audio;
    }

    loadSounds() {
        // Background Music
        this.createAudio('bgm', 'audio/background.mp3', true);

        // Player sounds
        this.createAudio('shoot', 'audio/laser12.wav');
        this.createAudio('altShoot', 'audio/laser8.wav');
        this.createAudio('playerHit', 'audio/ville_seppanen-1_g.mp3');
        
        // Enemy sounds
        this.createAudio('enemyExplode', 'audio/ville_seppanen-1_g.mp3');
        
        // Boss sounds
        this.createAudio('bossAppear', 'audio/appear-2-88047.mp3');
        
        // Power-up sounds
        this.createAudio('powerupCollect', 'audio/levelup.mp3');
        this.createAudio('shieldActivate', 'audio/sheildactivate.mp3');
        this.createAudio('rapidFireActivate', 'audio/levelup.mp3');
        this.createAudio('bombActivate', 'audio/ville_seppanen-1_g.mp3');

        // UI sounds
        this.createAudio('menuSelect', 'audio/laser8.wav');
        this.createAudio('achievement', 'audio/levelup.mp3');
    }

    playSound(name) {
        if (this.sounds[name]) {
            // For sound effects, create a new audio element each time
            if (name !== 'bgm') {
                const sound = this.sounds[name].cloneNode();
                sound.volume = this.sfxVolume;
                sound.play().catch(error => console.log('Audio play failed:', error));
            } else {
                // For background music, reuse the same element
                this.sounds[name].currentTime = 0;
                this.sounds[name].play().catch(error => console.log('BGM play failed:', error));
            }
        }
    }

    stopSound(name) {
        if (this.sounds[name]) {
            this.sounds[name].pause();
            this.sounds[name].currentTime = 0;
        }
    }

    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        if (this.sounds['bgm']) {
            this.sounds['bgm'].volume = this.musicVolume;
        }
    }

    setSFXVolume(volume) {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
        Object.keys(this.sounds).forEach(key => {
            if (key !== 'bgm') {
                this.sounds[key].volume = this.sfxVolume;
            }
        });
    }
}

// Create a global audio manager instance
window.audioManager = new AudioManager();
