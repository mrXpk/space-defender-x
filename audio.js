class AudioManager {
    constructor() {
        this.sounds = {};
        this.musicVolume = 0.3;
        this.sfxVolume = 0.5;
        this.isMuted = false;

        // Initialize all game sounds
        this.loadSounds();
    }

    loadSounds() {
        // Background Music
        this.loadSound('bgm', 'audio/background.mp3', true);

        // Player sounds
        this.loadSound('shoot', 'audio/laser12.wav');
        this.loadSound('altShoot', 'audio/laser8.wav');
        this.loadSound('playerHit', 'audio/ville_seppanen-1_g.mp3');
        
        // Enemy sounds
        this.loadSound('enemyExplode', 'audio/ville_seppanen-1_g.mp3');
        
        // Boss sounds
        this.loadSound('bossAppear', 'audio/appear-2-88047.mp3');
        
        // Power-up sounds
        this.loadSound('powerupCollect', 'audio/levelup.mp3');
        this.loadSound('shieldActivate', 'audio/sheildactivate.mp3');
        this.loadSound('rapidFireActivate', 'audio/levelup.mp3');
        this.loadSound('bombActivate', 'audio/ville_seppanen-1_g.mp3');

        // UI sounds
        this.loadSound('menuSelect', 'audio/laser8.wav');
        this.loadSound('achievement', 'audio/levelup.mp3');
    }

    loadSound(name, path, isMusic = false) {
        const audio = new Audio();
        audio.src = path;
        audio.volume = isMusic ? this.musicVolume : this.sfxVolume;
        
        if (isMusic) {
            audio.loop = true;
        }

        this.sounds[name] = {
            audio: audio,
            isMusic: isMusic
        };
    }

    play(soundName) {
        if (this.isMuted || !this.sounds[soundName]) return;

        const sound = this.sounds[soundName];
        
        if (sound.isMusic) {
            sound.audio.currentTime = 0;
            sound.audio.play();
        } else {
            // For sound effects, create a new instance to allow overlapping
            const sfx = new Audio(sound.audio.src);
            sfx.volume = this.sfxVolume;
            sfx.play();
        }
    }

    stopMusic(soundName) {
        if (this.sounds[soundName] && this.sounds[soundName].isMusic) {
            this.sounds[soundName].audio.pause();
            this.sounds[soundName].audio.currentTime = 0;
        }
    }

    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        Object.values(this.sounds).forEach(sound => {
            if (sound.isMusic) {
                sound.audio.volume = this.musicVolume;
            }
        });
    }

    setSFXVolume(volume) {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
        Object.values(this.sounds).forEach(sound => {
            if (!sound.isMusic) {
                sound.audio.volume = this.sfxVolume;
            }
        });
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        Object.values(this.sounds).forEach(sound => {
            if (this.isMuted) {
                sound.audio.pause();
            } else if (sound.isMusic) {
                sound.audio.play();
            }
        });
        return this.isMuted;
    }
}
