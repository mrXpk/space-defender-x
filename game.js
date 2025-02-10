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

        // Initialize controls
        this.keys = {
            'ArrowLeft': false,
            'ArrowRight': false,
            'ArrowUp': false,
            'ArrowDown': false,
            'a': false,
            'd': false,
            'w': false,
            's': false,
            ' ': false
        };

        this.particles = new ParticleSystem();
        this.stars = this.createStars();
        this.setupGame();
        this.setupControls();

        // Initialize game state
        this.screenShake = 0;
        this.multiplier = 1;
        this.multiplierTimer = 0;
        this.achievements = new AchievementSystem();
        this.highScore = localStorage.getItem('highScore') || 0;
        this.bossSpawnScore = 1000;
        this.weaponLevel = 1;
        this.shootCount = 0;

        // Start the game loop
        this.gameLoop();
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
        window.addEventListener('keydown', (e) => {
            if (this.keys.hasOwnProperty(e.key)) {
                this.keys[e.key] = true;
            }
            if (e.key === 'p' || e.key === 'P') {
                this.paused = !this.paused;
            }
            if (['1', '2', '3'].includes(e.key)) {
                this.activatePowerUp(e.key);
            }
        });

        window.addEventListener('keyup', (e) => {
            if (this.keys.hasOwnProperty(e.key)) {
                this.keys[e.key] = false;
            }
        });
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
        }
    }

    createBulletPattern(x, y) {
        const patterns = {
            1: [{ dx: 0, dy: -1 }],  // Single shot
            2: [{ dx: -0.2, dy: -1 }, { dx: 0.2, dy: -1 }],  // Double shot
            3: [{ dx: -0.3, dy: -1 }, { dx: 0, dy: -1 }, { dx: 0.3, dy: -1 }],  // Triple shot
            4: [{ dx: -0.4, dy: -1 }, { dx: -0.2, dy: -1 }, { dx: 0.2, dy: -1 }, { dx: 0.4, dy: -1 }],  // Quad shot
            5: [  // Pentagon formation
                { dx: -0.5, dy: -1 }, { dx: -0.25, dy: -1 }, 
                { dx: 0, dy: -1 },
                { dx: 0.25, dy: -1 }, { dx: 0.5, dy: -1 }
            ]
        };

        const level = Math.min(5, Math.floor(this.score / 500) + 1);
        return patterns[level] || patterns[1];
    }

    spawnEnemy() {
        if (this.enemySpawnTimer <= 0) {
            this.enemySpawnTimer = 60;
        }
        this.enemySpawnTimer--;
    }

    spawnEnemy() {
        const types = ['normal', 'fast', 'tank', 'shooter', 'asteroid'];
        const type = types[Math.floor(Math.random() * types.length)];
        
        const enemy = {
            x: Math.random() * (this.canvas.width - 40),
            y: -40,
            width: 40,
            height: 40,
            type: type,
            health: type === 'tank' ? 200 : type === 'asteroid' ? 50 : 100,
            speed: type === 'fast' ? 5 : type === 'asteroid' ? 1 : 2,
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
            case 'asteroid':
                enemy.width = 40;
                enemy.height = 40;
                break;
        }

        this.enemies.push(enemy);
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
            speed: 2,
            phase: 0,
            phaseTimer: 0,
            bullets: [],
            shootTimer: 0,
            patterns: [
                // Phase 1: Spread shot
                () => {
                    if (this.shootTimer <= 0) {
                        for (let i = -2; i <= 2; i++) {
                            this.bullets.push({
                                x: this.x + this.width/2,
                                y: this.y + this.height,
                                width: 8,
                                height: 8,
                                dx: i * 3,
                                dy: 5
                            });
                        }
                        this.shootTimer = 30;
                    }
                },
                // Phase 2: Circle shot
                () => {
                    if (this.shootTimer <= 0) {
                        for (let i = 0; i < 8; i++) {
                            const angle = (i / 8) * Math.PI * 2;
                            this.bullets.push({
                                x: this.x + this.width/2,
                                y: this.y + this.height/2,
                                width: 8,
                                height: 8,
                                dx: Math.cos(angle) * 5,
                                dy: Math.sin(angle) * 5
                            });
                        }
                        this.shootTimer = 45;
                    }
                },
                // Phase 3: Laser beams
                () => {
                    if (this.shootTimer <= 0) {
                        const targetAngle = Math.atan2(
                            game.player.y - (this.y + this.height/2),
                            game.player.x - (this.x + this.width/2)
                        );
                        this.bullets.push({
                            x: this.x + this.width/2,
                            y: this.y + this.height/2,
                            width: 12,
                            height: 12,
                            dx: Math.cos(targetAngle) * 8,
                            dy: Math.sin(targetAngle) * 8
                        });
                        this.shootTimer = 15;
                    }
                }
            ]
        };

        this.enemies.push(boss);
        this.particles.createExplosion(boss.x + boss.width/2, boss.y + boss.height/2, 50, '#f0f', 5);
    }

    update() {
        if (this.gameOver || this.paused) return;

        // Update game objects
        this.updatePlayer();
        this.updateEnemies();
        this.updateStars();
        this.particles.update();

        // Spawn enemies
        if (this.enemySpawnTimer <= 0) {
            if (this.score >= this.bossSpawnScore) {
                this.spawnBoss();
                this.bossSpawnScore += 1000;
                this.enemySpawnTimer = 120;
            } else {
                this.spawnEnemy();
                // Decrease spawn timer as score increases
                const minSpawnTime = 30;
                const maxSpawnTime = 120;
                const spawnTime = maxSpawnTime - (this.score / 1000) * 30;
                this.enemySpawnTimer = Math.max(minSpawnTime, spawnTime);
            }
        }
        this.enemySpawnTimer--;

        // Update power-ups
        Object.values(this.powerUps).forEach(powerUp => powerUp.update());

        // Update UI
        document.getElementById('healthFill').style.width = this.health + '%';
        document.getElementById('scoreValue').textContent = this.score;
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
                    x: this.player.x + this.player.width / 2,
                    y: this.player.y,
                    width: 4,
                    height: 10,
                    dx: bullet.dx * 10,
                    dy: bullet.dy * 10
                });
            });
            
            this.player.shootTimer = this.powerUps.rapid.active ? 5 : 15;
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
                    enemy.health -= 25;
                    this.particles.createExplosion(bullet.x, bullet.y, 5, '#ff4');
                    if (enemy.health <= 0) {
                        this.score += 100;
                        document.getElementById('scoreValue').textContent = this.score;
                        this.particles.createExplosion(enemy.x + enemy.width/2, enemy.y + enemy.height/2, 20, '#f44');
                    }
                    return false;
                }
                return true;
            });

            // Check collision with player
            if (this.checkCollision(this.player, enemy)) {
                if (!this.powerUps.shield.active) {
                    this.health -= 1;
                    if (this.health <= 0) {
                        this.gameOver = true;
                        document.getElementById('gameOver').style.display = 'block';
                        document.getElementById('finalScore').textContent = this.score;
                    }
                }
                return false;
            }

            // Boss logic
            if (enemy.type === 'boss') {
                // Move boss
                if (enemy.phase === 0) {
                    if (enemy.y < this.canvas.height / 2) {
                        enemy.y += enemy.speed;
                    } else {
                        enemy.phase = 1;
                        enemy.phaseTimer = 0;
                    }
                } else if (enemy.phase === 1) {
                    // Move boss left and right
                    if (enemy.phaseTimer < 60) {
                        enemy.x -= enemy.speed;
                    } else if (enemy.phaseTimer < 120) {
                        enemy.x += enemy.speed;
                    } else {
                        enemy.phaseTimer = 0;
                    }
                    enemy.phaseTimer++;

                    // Shoot bullets
                    enemy.patterns[enemy.phase - 1]();
                    enemy.shootTimer--;
                }

                // Check if boss is dead
                if (enemy.health <= 0) {
                    this.score += 500;
                    document.getElementById('scoreValue').textContent = this.score;
                    this.particles.createExplosion(enemy.x + enemy.width/2, enemy.y + enemy.height/2, 50, '#f0f', 5);
                    return false;
                }
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

    drawEnemy(enemy) {
        const x = enemy.x;
        const y = enemy.y;
        const w = enemy.width;
        const h = enemy.height;

        switch(enemy.type) {
            case 'fast':
                // Draw sleek, fast enemy (arrow shape)
                this.ctx.fillStyle = '#f0f';
                this.ctx.beginPath();
                this.ctx.moveTo(x + w/2, y);
                this.ctx.lineTo(x + w, y + h);
                this.ctx.lineTo(x + w/2, y + h*0.8);
                this.ctx.lineTo(x, y + h);
                this.ctx.closePath();
                this.ctx.fill();

                // Add engine glow
                const fastGlow = this.ctx.createRadialGradient(
                    x + w/2, y + h, 0,
                    x + w/2, y + h, 15
                );
                fastGlow.addColorStop(0, 'rgba(255, 0, 255, 0.5)');
                fastGlow.addColorStop(1, 'rgba(255, 0, 255, 0)');
                this.ctx.fillStyle = fastGlow;
                this.ctx.beginPath();
                this.ctx.arc(x + w/2, y + h, 15, 0, Math.PI * 2);
                this.ctx.fill();
                break;

            case 'tank':
                // Draw heavy tank enemy (hexagon shape)
                this.ctx.fillStyle = '#f80';
                this.ctx.beginPath();
                this.ctx.moveTo(x + w*0.2, y);
                this.ctx.lineTo(x + w*0.8, y);
                this.ctx.lineTo(x + w, y + h*0.3);
                this.ctx.lineTo(x + w*0.8, y + h);
                this.ctx.lineTo(x + w*0.2, y + h);
                this.ctx.lineTo(x, y + h*0.3);
                this.ctx.closePath();
                this.ctx.fill();

                // Add armor details
                this.ctx.strokeStyle = '#fa0';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.moveTo(x + w*0.2, y + h*0.3);
                this.ctx.lineTo(x + w*0.8, y + h*0.3);
                this.ctx.moveTo(x + w*0.2, y + h*0.6);
                this.ctx.lineTo(x + w*0.8, y + h*0.6);
                this.ctx.stroke();
                break;

            case 'shooter':
                // Draw shooter enemy (diamond with cannons)
                this.ctx.fillStyle = '#08f';
                this.ctx.beginPath();
                this.ctx.moveTo(x + w/2, y);
                this.ctx.lineTo(x + w, y + h/2);
                this.ctx.lineTo(x + w/2, y + h);
                this.ctx.lineTo(x, y + h/2);
                this.ctx.closePath();
                this.ctx.fill();

                // Add cannons
                this.ctx.fillStyle = '#0af';
                this.ctx.fillRect(x - 5, y + h*0.3, 10, 10);
                this.ctx.fillRect(x + w - 5, y + h*0.3, 10, 10);
                break;

            case 'asteroid':
                // Draw asteroid (irregular polygon)
                this.ctx.fillStyle = '#888';
                this.ctx.beginPath();
                this.ctx.moveTo(x + w*0.5, y);
                this.ctx.lineTo(x + w*0.8, y + h*0.3);
                this.ctx.lineTo(x + w, y + h*0.5);
                this.ctx.lineTo(x + w*0.8, y + h*0.8);
                this.ctx.lineTo(x + w*0.5, y + h);
                this.ctx.lineTo(x + w*0.2, y + h*0.8);
                this.ctx.lineTo(x, y + h*0.5);
                this.ctx.lineTo(x + w*0.2, y + h*0.3);
                this.ctx.closePath();
                this.ctx.fill();

                // Add crater details
                this.ctx.strokeStyle = '#666';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.arc(x + w*0.3, y + h*0.3, 5, 0, Math.PI * 2);
                this.ctx.arc(x + w*0.7, y + h*0.7, 7, 0, Math.PI * 2);
                this.ctx.stroke();
                break;

            case 'boss':
                // Draw boss ship (large complex shape)
                this.ctx.fillStyle = '#f0f';
                
                // Main body
                this.ctx.beginPath();
                this.ctx.moveTo(x + w*0.5, y);
                this.ctx.lineTo(x + w*0.8, y + h*0.2);
                this.ctx.lineTo(x + w, y + h*0.4);
                this.ctx.lineTo(x + w, y + h*0.8);
                this.ctx.lineTo(x + w*0.8, y + h);
                this.ctx.lineTo(x + w*0.2, y + h);
                this.ctx.lineTo(x, y + h*0.8);
                this.ctx.lineTo(x, y + h*0.4);
                this.ctx.lineTo(x + w*0.2, y + h*0.2);
                this.ctx.closePath();
                this.ctx.fill();

                // Add details
                this.ctx.strokeStyle = '#f0f';
                this.ctx.lineWidth = 3;
                this.ctx.beginPath();
                // Core
                this.ctx.arc(x + w*0.5, y + h*0.5, 20, 0, Math.PI * 2);
                // Weapon mounts
                this.ctx.moveTo(x + 10, y + h*0.6);
                this.ctx.lineTo(x + 30, y + h*0.6);
                this.ctx.moveTo(x + w - 30, y + h*0.6);
                this.ctx.lineTo(x + w - 10, y + h*0.6);
                this.ctx.stroke();

                // Add boss shield if health is high
                if (enemy.health > enemy.maxHealth * 0.5) {
                    const shieldGlow = this.ctx.createRadialGradient(
                        x + w*0.5, y + h*0.5, w*0.5,
                        x + w*0.5, y + h*0.5, w*0.7
                    );
                    shieldGlow.addColorStop(0, 'rgba(255, 0, 255, 0.1)');
                    shieldGlow.addColorStop(0.5, 'rgba(255, 0, 255, 0.2)');
                    shieldGlow.addColorStop(1, 'rgba(255, 0, 255, 0)');
                    this.ctx.fillStyle = shieldGlow;
                    this.ctx.beginPath();
                    this.ctx.arc(x + w*0.5, y + h*0.5, w*0.7, 0, Math.PI * 2);
                    this.ctx.fill();
                }
                break;

            default:
                // Default enemy (improved triangle)
                this.ctx.fillStyle = '#f00';
                this.ctx.beginPath();
                this.ctx.moveTo(x + w/2, y);
                this.ctx.lineTo(x + w, y + h);
                this.ctx.lineTo(x, y + h);
                this.ctx.closePath();
                this.ctx.fill();

                // Add engine glow
                const normalGlow = this.ctx.createRadialGradient(
                    x + w/2, y + h, 0,
                    x + w/2, y + h, 15
                );
                normalGlow.addColorStop(0, 'rgba(255, 0, 0, 0.5)');
                normalGlow.addColorStop(1, 'rgba(255, 0, 0, 0)');
                this.ctx.fillStyle = normalGlow;
                this.ctx.beginPath();
                this.ctx.arc(x + w/2, y + h, 15, 0, Math.PI * 2);
                this.ctx.fill();
        }

        // Draw health bar for all enemies except asteroids
        if (enemy.type !== 'asteroid') {
            const healthPercent = enemy.health / (enemy.type === 'boss' ? enemy.maxHealth : 100);
            this.ctx.fillStyle = `rgb(${255 * (1 - healthPercent)}, ${255 * healthPercent}, 0)`;
            this.ctx.fillRect(x, y - 10, w * healthPercent, 5);
        }
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
            // Draw player ship with a more visible design
            this.ctx.fillStyle = '#0f0';
            this.ctx.beginPath();
            this.ctx.moveTo(this.player.x + this.player.width / 2, this.player.y);
            this.ctx.lineTo(this.player.x, this.player.y + this.player.height);
            this.ctx.lineTo(this.player.x + this.player.width, this.player.y + this.player.height);
            this.ctx.closePath();
            this.ctx.fill();

            // Add engine glow
            const gradient = this.ctx.createRadialGradient(
                this.player.x + this.player.width / 2,
                this.player.y + this.player.height,
                0,
                this.player.x + this.player.width / 2,
                this.player.y + this.player.height,
                20
            );
            gradient.addColorStop(0, 'rgba(0, 255, 0, 0.5)');
            gradient.addColorStop(1, 'rgba(0, 255, 0, 0)');
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(
                this.player.x + this.player.width / 2,
                this.player.y + this.player.height,
                20, 0, Math.PI * 2
            );
            this.ctx.fill();

            // Draw player bullets
            this.ctx.fillStyle = '#0f0';
            this.player.bullets.forEach(bullet => {
                this.ctx.fillRect(bullet.x - bullet.width/2, bullet.y, bullet.width, bullet.height);
            });
        }

        // Draw enemies
        this.enemies.forEach(enemy => {
            this.drawEnemy(enemy);
        });

        // Update UI elements
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
    }
}

// Start the game
let game = null;

function startNewGame() {
    if (game) {
        // Clean up old game
        game = null;
    }
    game = new Game();
}

// Initialize game when the window loads
window.addEventListener('load', () => {
    startNewGame();
});
