class ParticleSystem {
    constructor() {
        this.particles = [];
        this.nebulaClouds = this.createNebulaClouds();
    }

    createNebulaClouds() {
        const clouds = [];
        for (let i = 0; i < 5; i++) {
            clouds.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                size: Math.random() * 300 + 200,
                color: `hsla(${Math.random() * 60 + 200}, 70%, 50%, 0.1)`,
                speed: Math.random() * 0.2 + 0.1
            });
        }
        return clouds;
    }

    addParticle(x, y, color, speed, size, lifetime, type = 'normal') {
        const particle = {
            x, y,
            vx: (Math.random() - 0.5) * speed,
            vy: (Math.random() - 0.5) * speed,
            size,
            color,
            lifetime,
            maxLifetime: lifetime,
            type
        };

        if (type === 'trail') {
            particle.vy = Math.random() * 2;
        }

        this.particles.push(particle);
    }

    createExplosion(x, y, count, color, size = 3) {
        const colors = ['#ff4', '#f44', '#ff0'];
        for (let i = 0; i < count; i++) {
            const explosionColor = color || colors[Math.floor(Math.random() * colors.length)];
            this.addParticle(x, y, explosionColor, 8, Math.random() * size + 1, 50);
        }
        // Screen shake
        game.screenShake = 10;
    }

    createTrail(x, y, color) {
        this.addParticle(x, y, color, 2, Math.random() * 2 + 1, 20, 'trail');
    }

    update() {
        // Update nebula clouds
        this.nebulaClouds.forEach(cloud => {
            cloud.y += cloud.speed;
            if (cloud.y > window.innerHeight) {
                cloud.y = -cloud.size;
                cloud.x = Math.random() * window.innerWidth;
            }
        });

        // Update particles
        this.particles = this.particles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.lifetime--;

            if (p.type === 'trail') {
                p.size *= 0.9;
            }

            return p.lifetime > 0;
        });
    }

    draw(ctx) {
        // Draw nebula clouds
        this.nebulaClouds.forEach(cloud => {
            const gradient = ctx.createRadialGradient(
                cloud.x, cloud.y, 0,
                cloud.x, cloud.y, cloud.size
            );
            gradient.addColorStop(0, cloud.color);
            gradient.addColorStop(1, 'transparent');
            ctx.fillStyle = gradient;
            ctx.fillRect(cloud.x - cloud.size, cloud.y - cloud.size,
                        cloud.size * 2, cloud.size * 2);
        });

        // Draw particles
        this.particles.forEach(p => {
            ctx.globalAlpha = p.lifetime / p.maxLifetime;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;
    }
}

class PowerUp {
    constructor(type) {
        this.type = type;
        this.active = false;
        this.duration = 300;
        this.timer = 0;
    }

    activate() {
        this.active = true;
        this.timer = this.duration;
        document.getElementById(this.type).classList.add('active');
    }

    update() {
        if (this.active) {
            this.timer--;
            if (this.timer <= 0) {
                this.active = false;
                document.getElementById(this.type).classList.remove('active');
            }
        }
    }
}

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        this.particles = new ParticleSystem();
        this.stars = this.createStars();
        this.setupGame();
        this.setupControls();

        // Initialize audio manager
        this.audio = new AudioManager();
        
        // Set up audio controls
        this.setupAudioControls();

        this.screenShake = 0;
        this.multiplier = 1;
        this.multiplierTimer = 0;
        this.achievements = new AchievementSystem();
        this.highScore = localStorage.getItem('highScore') || 0;
        this.bossSpawnScore = 1000;
        this.weaponLevel = 1;
        this.shootCount = 0;

        // Start background music
        window.addEventListener('click', () => {
            this.audio.play('bgm');
        }, { once: true });
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    createStars() {
        const stars = [];
        for (let i = 0; i < 200; i++) {
            stars.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: Math.random() * 2 + 1,
                speed: Math.random() * 2 + 1
            });
        }
        return stars;
    }

    setupGame() {
        this.score = 0;
        this.health = 100;
        this.paused = false;
        this.gameOver = false;
        
        // Initialize player
        this.player = {
            x: this.canvas.width / 2 - 25,
            y: this.canvas.height - 100,
            width: 50,
            height: 50,
            speed: 8,
            bullets: [],
            shootTimer: 0
        };

        // Initialize enemies and power-ups
        this.enemies = [];
        this.enemySpawnTimer = 60;
        this.powerUps = {
            shield: new PowerUp('shield'),
            rapid: new PowerUp('rapid'),
            bomb: new PowerUp('bomb')
        };

        // Reset UI
        document.getElementById('scoreValue').textContent = '0';
        document.getElementById('healthFill').style.width = '100%';
        document.getElementById('gameOver').style.display = 'none';
    }

    setupControls() {
        // Keyboard controls
        window.addEventListener('keydown', e => {
            if (this.keys.hasOwnProperty(e.key)) {
                this.keys[e.key] = true;
                if (e.key === 'p' || e.key === 'P') {
                    this.paused = !this.paused;
                }
                if (['1', '2', '3'].includes(e.key)) {
                    this.activatePowerUp(e.key);
                }
            }
        });

        window.addEventListener('keyup', e => {
            if (this.keys.hasOwnProperty(e.key)) {
                this.keys[e.key] = false;
            }
        });
    }

    setupAudioControls() {
        const musicBtn = document.getElementById('toggleMusic');
        const sfxBtn = document.getElementById('toggleSFX');
        const musicVolume = document.getElementById('musicVolume');
        const sfxVolume = document.getElementById('sfxVolume');

        if (musicBtn) {
            musicBtn.addEventListener('click', () => {
                const isMuted = this.audio.toggleMute();
                musicBtn.textContent = isMuted ? '🔇' : '🎵';
            });
        }

        if (musicVolume) {
            musicVolume.addEventListener('input', (e) => {
                this.audio.setMusicVolume(e.target.value / 100);
            });
        }

        if (sfxVolume) {
            sfxVolume.addEventListener('input', (e) => {
                this.audio.setSFXVolume(e.target.value / 100);
            });
        }
    }

    activatePowerUp(key) {
        const powerUpMap = {
            '1': 'shield',
            '2': 'rapid',
            '3': 'bomb'
        };
        const type = powerUpMap[key];
        if (type) {
            this.powerUps[type].activate();
            switch(type) {
                case 'shield':
                    this.audio.play('shieldActivate');
                    break;
                case 'rapid':
                    this.audio.play('rapidFireActivate');
                    break;
                case 'bomb':
                    this.audio.play('bombActivate');
                    break;
            }
            if (type === 'bomb') {
                this.enemies.forEach(enemy => {
                    this.particles.createExplosion(enemy.x, enemy.y, 20, '#ff4');
                });
                this.enemies = [];
            }
        }
    }

    createBulletPattern(x, y) {
        const patterns = {
            1: [{ dx: 0, dy: -1 }],
            2: [{ dx: -0.2, dy: -1 }, { dx: 0.2, dy: -1 }],
            3: [{ dx: -0.3, dy: -1 }, { dx: 0, dy: -1 }, { dx: 0.3, dy: -1 }],
            4: [{ dx: -0.3, dy: -1 }, { dx: -0.1, dy: -1 }, 
                { dx: 0.1, dy: -1 }, { dx: 0.3, dy: -1 }]
        };

        const pattern = patterns[this.weaponLevel] || patterns[1];
        return pattern;
    }

    spawnEnemy() {
        if (this.enemySpawnTimer <= 0) {
            this.enemySpawnTimer = 60;
        }
        this.enemySpawnTimer--;
    }

    spawnEnemy() {
        const types = ['normal', 'fast', 'tank', 'shooter'];
        const type = types[Math.floor(Math.random() * types.length)];
        
        const enemy = {
            x: Math.random() * (this.canvas.width - 40),
            y: -40,
            width: 40,
            height: 40,
            type: type,
            health: type === 'tank' ? 200 : 100,
            speed: type === 'fast' ? 5 : 2,
            bullets: [],
            shootTimer: 0
        };

        // Add type-specific properties
        switch(type) {
            case 'fast':
                enemy.speed = 5;
                enemy.width = 30;
                enemy.height = 30;
                break;
            case 'tank':
                enemy.speed = 1;
                enemy.width = 60;
                enemy.height = 60;
                break;
            case 'shooter':
                enemy.speed = 1.5;
                enemy.shootTimer = Math.random() * 60;
                break;
        }

        this.enemies.push(enemy);
    }

    update() {
        if (this.gameOver || this.paused) return;

        // Update game objects
        this.updatePlayer();
        this.updateEnemies();
        this.updateStars();
        this.particles.update();

        // Spawn enemies
        this.spawnEnemy();

        // Check for boss spawn
        if (this.score >= this.bossSpawnScore) {
            this.spawnBoss();
            this.bossSpawnScore += 1000; // Next boss at 1000 more points
        }

        // Update power-ups
        Object.values(this.powerUps).forEach(powerUp => powerUp.update());

        // Update weapon level based on score
        this.weaponLevel = Math.min(4, Math.floor(this.score / 500) + 1);

        // Update score multiplier
        if (this.multiplierTimer > 0) {
            this.multiplierTimer--;
            if (this.multiplierTimer <= 0) {
                this.multiplier = 1;
            }
        }

        // Update high score
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('highScore', this.highScore);
        }
    }

    updatePlayer() {
        if (this.gameOver) return;

        // Movement
        const speed = this.player.speed;
        if ((this.keys.ArrowLeft || this.keys.a) && this.player.x > 0) {
            this.player.x -= speed;
        }
        if ((this.keys.ArrowRight || this.keys.d) && this.player.x < this.canvas.width - this.player.width) {
            this.player.x += speed;
        }
        if ((this.keys.ArrowUp || this.keys.w) && this.player.y > 0) {
            this.player.y -= speed;
        }
        if ((this.keys.ArrowDown || this.keys.s) && this.player.y < this.canvas.height - this.player.height) {
            this.player.y += speed;
        }

        // Shooting
        if (this.keys[' '] && this.player.shootTimer <= 0) {
            const bulletPattern = this.createBulletPattern(this.player.x + this.player.width / 2, this.player.y);
            bulletPattern.forEach(bullet => {
                this.player.bullets.push({
                    x: bullet.x,
                    y: bullet.y,
                    width: 4,
                    height: 10,
                    dx: bullet.dx * 10,
                    dy: bullet.dy * 10
                });
            });
            
            this.audio.play('shoot');
            this.player.shootTimer = this.powerUps.rapid.active ? 5 : 15;
            this.particles.createTrail(this.player.x + this.player.width / 2, this.player.y, '#0f0');
        }
        this.player.shootTimer--;

        // Update bullets
        this.player.bullets = this.player.bullets.filter(bullet => {
            bullet.x += bullet.dx;
            bullet.y += bullet.dy;
            return bullet.y > 0 && bullet.y < this.canvas.height &&
                   bullet.x > 0 && bullet.x < this.canvas.width;
        });

        // Create engine trail
        if (Math.random() < 0.3) {
            this.particles.createTrail(
                this.player.x + this.player.width / 2,
                this.player.y + this.player.height,
                '#0f0'
            );
        }
    }

    updateEnemies() {
        this.enemies = this.enemies.filter(enemy => {
            // Move enemy
            enemy.y += enemy.speed;

            // Shooter type enemies shoot at player
            if (enemy.type === 'shooter' && enemy.shootTimer <= 0) {
                const dx = this.player.x - enemy.x;
                const dy = this.player.y - enemy.y;
                const angle = Math.atan2(dy, dx);
                
                enemy.bullets.push({
                    x: enemy.x + enemy.width / 2,
                    y: enemy.y + enemy.height,
                    width: 4,
                    height: 4,
                    dx: Math.cos(angle) * 5,
                    dy: Math.sin(angle) * 5
                });
                
                enemy.shootTimer = 120; // Shoot every 2 seconds
            }
            enemy.shootTimer--;

            // Update enemy bullets
            if (enemy.bullets) {
                enemy.bullets = enemy.bullets.filter(bullet => {
                    bullet.x += bullet.dx;
                    bullet.y += bullet.dy;
                    
                    // Check collision with player
                    if (this.checkCollision(bullet, this.player)) {
                        if (!this.powerUps.shield.active) {
                            this.health -= 10;
                            this.audio.play('playerHit');
                            if (this.health <= 0) {
                                this.gameOver = true;
                                document.getElementById('gameOver').style.display = 'block';
                                document.getElementById('finalScore').textContent = this.score;
                            }
                        }
                        return false;
                    }
                    
                    return bullet.y > 0 && bullet.y < this.canvas.height &&
                           bullet.x > 0 && bullet.x < this.canvas.width;
                });
            }

            // Check collision with player bullets
            this.player.bullets = this.player.bullets.filter(bullet => {
                if (this.checkCollision(bullet, enemy)) {
                    enemy.health -= 25 * this.multiplier;
                    this.particles.createExplosion(bullet.x, bullet.y, 5, '#ff4');
                    this.audio.play('enemyHit');
                    if (enemy.health <= 0) {
                        this.score += 100 * this.multiplier;
                        document.getElementById('scoreValue').textContent = this.score;
                        this.particles.createExplosion(enemy.x + enemy.width/2, enemy.y + enemy.height/2, 20, '#f44');
                        this.audio.play('enemyExplode');
                        this.achievements.unlock('firstKill');
                    }
                    return false;
                }
                return true;
            });

            // Check collision with player
            if (this.checkCollision(this.player, enemy)) {
                if (!this.powerUps.shield.active) {
                    this.health -= 1;
                    this.audio.play('playerHit');
                    if (this.health <= 0) {
                        this.gameOver = true;
                        document.getElementById('gameOver').style.display = 'block';
                        document.getElementById('finalScore').textContent = this.score;
                        this.audio.stopMusic('bgm');
                        this.audio.play('enemyExplode');
                    }
                }
                return false;
            }

            return enemy.y < this.canvas.height + enemy.height && enemy.health > 0;
        });
    }

    checkCollision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }

    updateStars() {
        this.stars.forEach(star => {
            star.y += star.speed;
            if (star.y > this.canvas.height) {
                star.y = 0;
                star.x = Math.random() * this.canvas.width;
            }
        });
    }

    draw() {
        // Clear canvas with black background
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw particles and stars
        this.particles.draw(this.ctx);
        this.ctx.fillStyle = '#fff';
        this.stars.forEach(star => {
            this.ctx.beginPath();
            this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            this.ctx.fill();
        });

        // Draw player if game is not over
        if (!this.gameOver) {
            // Draw player ship
            this.ctx.fillStyle = '#0f0';
            this.ctx.beginPath();
            this.ctx.moveTo(this.player.x + this.player.width / 2, this.player.y);
            this.ctx.lineTo(this.player.x, this.player.y + this.player.height);
            this.ctx.lineTo(this.player.x + this.player.width, this.player.y + this.player.height);
            this.ctx.closePath();
            this.ctx.fill();

            // Draw player bullets
            this.ctx.fillStyle = '#0f0';
            this.player.bullets.forEach(bullet => {
                this.ctx.fillRect(bullet.x - bullet.width/2, bullet.y, bullet.width, bullet.height);
            });
        }

        // Draw enemies
        this.enemies.forEach(enemy => {
            this.ctx.fillStyle = enemy.type === 'boss' ? '#f0f' : '#f00';
            this.ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
            
            // Draw enemy bullets
            if (enemy.bullets) {
                this.ctx.fillStyle = '#f00';
                enemy.bullets.forEach(bullet => {
                    this.ctx.fillRect(bullet.x - bullet.width/2, bullet.y, bullet.width, bullet.height);
                });
            }
        });

        // Draw UI elements
        document.getElementById('healthFill').style.width = this.health + '%';
        document.getElementById('scoreValue').textContent = this.score;
    }

    gameLoop() {
        if (!this.gameOver) {
            this.update();
            this.draw();
            requestAnimationFrame(() => this.gameLoop());
        }
    }
}

class AchievementSystem {
    constructor() {
        this.achievements = {
            firstKill: { name: "First Blood", description: "Destroy your first enemy", unlocked: false },
            sharpshooter: { name: "Sharpshooter", description: "Get 10 kills without missing", unlocked: false },
            survivor: { name: "Survivor", description: "Reach 1000 points", unlocked: false },
            bossKiller: { name: "Boss Killer", description: "Defeat a boss", unlocked: false }
        };
    }

    unlock(id) {
        if (!this.achievements[id].unlocked) {
            this.achievements[id].unlocked = true;
            this.showNotification(this.achievements[id].name);
        }
    }

    showNotification(name) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 255, 255, 0.2);
            border: 2px solid #0ff;
            padding: 10px 20px;
            border-radius: 20px;
            color: #fff;
            font-family: Orbitron;
            animation: fadeOut 3s forwards;
        `;
        notification.textContent = `🏆 Achievement Unlocked: ${name}`;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
        game.audio.play('achievement');
    }
}

// Start the game
let game;
function startNewGame() {
    game = new Game();
    game.gameLoop();
}

// Start the game
startNewGame();
