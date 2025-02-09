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

        this.screenShake = 0;
        this.multiplier = 1;
        this.multiplierTimer = 0;
        this.achievements = new AchievementSystem();
        this.highScore = localStorage.getItem('highScore') || 0;
        this.bossSpawnScore = 1000;
        this.weaponLevel = 1;
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
        this.gameOver = false;
        this.paused = false;

        // Player
        this.player = {
            x: this.canvas.width / 2,
            y: this.canvas.height - 100,
            width: 50,
            height: 50,
            speed: 8,
            bullets: [],
            shootDelay: 10,
            shootTimer: 0
        };

        // Enemies
        this.enemies = [];
        this.enemySpawnDelay = 60;
        this.enemySpawnTimer = 0;

        // Power-ups
        this.powerUps = {
            shield: new PowerUp('shield'),
            rapid: new PowerUp('rapid'),
            bomb: new PowerUp('bomb')
        };

        // Update UI
        document.getElementById('scoreValue').textContent = this.score;
        document.getElementById('healthFill').style.width = this.health + '%';
        document.getElementById('gameOver').style.display = 'none';
    }

    setupControls() {
        this.keys = {};
        window.addEventListener('keydown', e => {
            this.keys[e.key] = true;
            if (e.key === 'p' || e.key === 'P') this.paused = !this.paused;
            if (['1','2','3'].includes(e.key)) this.activatePowerUp(e.key);
        });
        window.addEventListener('keyup', e => this.keys[e.key] = false);
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
        pattern.forEach(p => {
            this.player.bullets.push({
                x: x,
                y: y,
                width: 4,
                height: 15,
                speed: 15,
                dx: p.dx * 5,
                dy: p.dy * 15,
                color: `hsl(${Math.random() * 60 + 200}, 100%, 50%)`
            });
        });
    }

    spawnEnemy() {
        if (this.enemySpawnTimer <= 0) {
            const types = ['normal', 'fast', 'tank', 'shooter'];
            const type = types[Math.floor(Math.random() * types.length)];
            
            const enemy = {
                x: Math.random() * (this.canvas.width - 40),
                y: -40,
                width: 40,
                height: 40,
                type: type,
                health: type === 'tank' ? 200 : 100,
                speed: type === 'fast' ? 4 : 2,
                shootTimer: 0,
                shootDelay: type === 'shooter' ? 60 : 120,
                bullets: []
            };

            this.enemies.push(enemy);
            this.enemySpawnTimer = this.enemySpawnDelay;
            this.enemySpawnDelay = Math.max(20, this.enemySpawnDelay - 0.2);
        }
        this.enemySpawnTimer--;

        // Check for boss spawn
        if (this.score >= this.bossSpawnScore) {
            this.spawnBoss();
            this.bossSpawnScore += 1000;
        }
    }

    spawnBoss() {
        const boss = {
            x: this.canvas.width / 2 - 100,
            y: -100,
            width: 200,
            height: 100,
            type: 'boss',
            health: 1000,
            maxHealth: 1000,
            speed: 1,
            phase: 0,
            phaseTimer: 0,
            bullets: []
        };
        this.enemies.push(boss);
        // Create boss entrance effect
        this.particles.createExplosion(boss.x + boss.width/2, boss.y + boss.height/2, 50, '#f0f', 5);
    }

    updatePlayer() {
        // Movement
        if (this.keys['ArrowLeft'] || this.keys['a']) this.player.x -= this.player.speed;
        if (this.keys['ArrowRight'] || this.keys['d']) this.player.x += this.player.speed;
        if (this.keys['ArrowUp'] || this.keys['w']) this.player.y -= this.player.speed;
        if (this.keys['ArrowDown'] || this.keys['s']) this.player.y += this.player.speed;

        // Keep player in bounds
        this.player.x = Math.max(0, Math.min(this.canvas.width - this.player.width, this.player.x));
        this.player.y = Math.max(0, Math.min(this.canvas.height - this.player.height, this.player.y));

        // Shooting
        if ((this.keys[' '] || this.keys['Space']) && this.player.shootTimer <= 0) {
            const shootDelay = this.powerUps.rapid.active ? 5 : 10;
            this.createBulletPattern(
                this.player.x + this.player.width / 2,
                this.player.y
            );
            this.player.shootTimer = shootDelay;
        }
        this.player.shootTimer--;

        // Update bullets
        this.player.bullets = this.player.bullets.filter(bullet => {
            bullet.y += bullet.dy;
            bullet.x += bullet.dx;
            return bullet.y > -bullet.height;
        });

        // Add engine trails
        if (!this.gameOver && !this.paused) {
            this.particles.createTrail(
                this.player.x + this.player.width / 2,
                this.player.y + this.player.height,
                '#0f0'
            );
        }

        // Update weapon level based on score
        this.weaponLevel = Math.min(4, Math.floor(this.score / 500) + 1);

        // Update score multiplier
        if (this.multiplierTimer > 0) {
            this.multiplierTimer--;
            if (this.multiplierTimer <= 0) {
                this.multiplier = 1;
            }
        }
    }

    updateEnemies() {
        this.enemies = this.enemies.filter(enemy => {
            enemy.y += enemy.speed;

            // Check collision with player bullets
            this.player.bullets = this.player.bullets.filter(bullet => {
                if (this.checkCollision(bullet, enemy)) {
                    enemy.health -= 25 * this.multiplier;
                    this.particles.createExplosion(bullet.x, bullet.y, 5, '#ff4');
                    if (enemy.health <= 0) {
                        this.score += 100 * this.multiplier;
                        document.getElementById('scoreValue').textContent = this.score;
                        this.particles.createExplosion(enemy.x + enemy.width/2, enemy.y + enemy.height/2, 20, '#f44');
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
                    document.getElementById('healthFill').style.width = this.health + '%';
                    if (this.health <= 0) {
                        this.gameOver = true;
                        document.getElementById('gameOver').style.display = 'block';
                        document.getElementById('finalScore').textContent = this.score;
                    }
                }
                return false;
            }

            return enemy.y < this.canvas.height && enemy.health > 0;
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
        // Apply screen shake
        if (this.screenShake > 0) {
            const dx = (Math.random() - 0.5) * this.screenShake;
            const dy = (Math.random() - 0.5) * this.screenShake;
            this.ctx.save();
            this.ctx.translate(dx, dy);
            this.screenShake--;
        }

        // Clear canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw stars
        this.ctx.fillStyle = '#fff';
        this.stars.forEach(star => {
            this.ctx.globalAlpha = star.size / 3;
            this.ctx.beginPath();
            this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            this.ctx.fill();
        });
        this.ctx.globalAlpha = 1;

        // Draw player
        this.ctx.fillStyle = '#0f0';
        this.ctx.beginPath();
        this.ctx.moveTo(this.player.x + this.player.width / 2, this.player.y);
        this.ctx.lineTo(this.player.x, this.player.y + this.player.height);
        this.ctx.lineTo(this.player.x + this.player.width, this.player.y + this.player.height);
        this.ctx.closePath();
        this.ctx.fill();

        // Draw shield if active
        if (this.powerUps.shield.active) {
            this.ctx.strokeStyle = '#0ff';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(
                this.player.x + this.player.width / 2,
                this.player.y + this.player.height / 2,
                this.player.width * 0.8,
                0, Math.PI * 2
            );
            this.ctx.stroke();
        }

        // Draw bullets
        this.ctx.fillStyle = '#ff0';
        this.player.bullets.forEach(bullet => {
            this.ctx.fillRect(bullet.x - bullet.width/2, bullet.y, bullet.width, bullet.height);
        });

        // Draw enemies
        this.enemies.forEach(enemy => {
            this.ctx.fillStyle = '#f44';
            this.ctx.beginPath();
            this.ctx.moveTo(enemy.x + enemy.width / 2, enemy.y + enemy.height);
            this.ctx.lineTo(enemy.x, enemy.y);
            this.ctx.lineTo(enemy.x + enemy.width, enemy.y);
            this.ctx.closePath();
            this.ctx.fill();
        });

        // Draw particles
        this.particles.draw(this.ctx);

        // Draw multiplier
        if (this.multiplier > 1) {
            this.ctx.fillStyle = '#0ff';
            this.ctx.font = '24px Orbitron';
            this.ctx.fillText(`${this.multiplier}x`, 20, 80);
        }

        // Draw high score
        this.ctx.fillStyle = '#666';
        this.ctx.font = '20px Orbitron';
        this.ctx.fillText(`High Score: ${this.highScore}`, 20, 110);

        // Draw pause screen
        if (this.paused) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '48px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('PAUSED', this.canvas.width / 2, this.canvas.height / 2);
        }

        if (this.screenShake > 0) {
            this.ctx.restore();
        }
    }

    update() {
        if (this.gameOver || this.paused) return;

        this.updateStars();
        this.updatePlayer();
        this.spawnEnemy();
        this.updateEnemies();
        this.particles.update();

        // Update power-ups
        Object.values(this.powerUps).forEach(powerUp => powerUp.update());
    }

    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
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
