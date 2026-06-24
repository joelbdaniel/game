const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const joinScreen = document.getElementById('join-screen');
const gameUi = document.getElementById('game-ui');
const deathScreen = document.getElementById('death-screen');
const joinBtn = document.getElementById('join-btn');
const botDifficultyInput = document.getElementById('bot-difficulty');

const hpDisplay = document.getElementById('hp-display');
const weaponDisplay = document.getElementById('weapon-display');
const timeDisplay = document.getElementById('time-display');

// Game Constants
const GAME_DURATION = 30 * 60;
const MAP_WIDTH = 2500;
const MAP_HEIGHT = 2500;
const PLAYER_RADIUS = 20;
const TREE_RADIUS = 40;
const BOX_SIZE = 60;

// Game State
let gameState = {
    entities: {}, // includes player and bots
    bullets: [],
    timeLeft: GAME_DURATION,
    trees: [],
    boxes: []
};
let myId = 'player1';
let botDifficulty = 'medium';
let lastTime = performance.now();

// Input State
const input = {
    up: false, down: false, left: false, right: false,
    angle: 0,
    weapon: 1, // 1: Assault, 2: Shotgun, 3: Sniper
    shooting: false
};
let mouseX = 0; let mouseY = 0;
let isScoping = false;

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

function collides(x, y, r, checkTrees = true, checkBoxes = true) {
    if (x - r < 0 || x + r > MAP_WIDTH || y - r < 0 || y + r > MAP_HEIGHT) return true;
    
    if (checkTrees) {
        for (let t of gameState.trees) {
            if (Math.hypot(x - t.x, y - t.y) < r + t.radius) return true;
        }
    }
    if (checkBoxes) {
        for (let b of gameState.boxes) {
            if (x + r > b.x && x - r < b.x + b.width && y + r > b.y && y - r < b.y + b.height) return true;
        }
    }
    return false;
}

function generateMap() {
    gameState.trees = [];
    gameState.boxes = [];
    
    const attempts = 1000;
    
    for (let i = 0; i < attempts; i++) {
        if (gameState.trees.length >= 40) break;
        let x = Math.random() * (MAP_WIDTH - TREE_RADIUS * 2) + TREE_RADIUS;
        let y = Math.random() * (MAP_HEIGHT - TREE_RADIUS * 2) + TREE_RADIUS;
        if (!collides(x, y, TREE_RADIUS + 20, true, true)) {
            gameState.trees.push({x, y, radius: TREE_RADIUS});
        }
    }
    for (let i = 0; i < attempts; i++) {
        if (gameState.boxes.length >= 30) break;
        let x = Math.random() * (MAP_WIDTH - BOX_SIZE);
        let y = Math.random() * (MAP_HEIGHT - BOX_SIZE);
        if (!collides(x + BOX_SIZE/2, y + BOX_SIZE/2, BOX_SIZE/2 + 20, true, true)) {
            gameState.boxes.push({x, y, width: BOX_SIZE, height: BOX_SIZE});
        }
    }
}

function spawnEntity(id, isBot = false) {
    let x, y;
    do {
        x = Math.random() * MAP_WIDTH;
        y = Math.random() * MAP_HEIGHT;
    } while (collides(x, y, PLAYER_RADIUS));

    const weapon = isBot ? Math.floor(Math.random() * 3) + 1 : 1;

    return {
        id, isBot, x, y, hp: 100, angle: 0, weapon, isDead: false,
        shootCooldown: 0, recentlyShotTimer: 0,
        dashTimer: 0, dashCooldown: 0, teleportCooldown: 0,
        state: 'wander', stateTimer: 0, wanderAngle: 0
    };
}

joinBtn.addEventListener('click', () => {
    botDifficulty = botDifficultyInput.value;
    joinScreen.style.display = 'none';
    gameUi.style.display = 'block';

    generateMap();
    gameState.entities[myId] = spawnEntity(myId, false);
    for (let i = 0; i < 14; i++) {
        const id = 'bot' + i;
        gameState.entities[id] = spawnEntity(id, true);
    }

    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
});

// Input handling
window.addEventListener('keydown', e => {
    if (e.key === 'w' || e.key === 'W') input.up = true;
    if (e.key === 's' || e.key === 'S') input.down = true;
    if (e.key === 'a' || e.key === 'A') input.left = true;
    if (e.key === 'd' || e.key === 'D') input.right = true;
    
    const me = gameState.entities[myId];
    if (me && !me.isDead) {
        if ((e.key === 'e' || e.key === 'E') && me.dashCooldown <= 0) {
            me.dashTimer = 10; // 10 seconds of increased speed
            me.dashCooldown = 15; // 15 sec cooldown
        }
        if ((e.key === 'q' || e.key === 'Q') && me.teleportCooldown <= 0) {
            // Teleport a short distance in the facing direction
            const tpDistance = 250;
            let nx = me.x + Math.cos(me.angle) * tpDistance;
            let ny = me.y + Math.sin(me.angle) * tpDistance;
            
            // Check if target teleport spot is valid
            if (!collides(nx, ny, PLAYER_RADIUS)) {
                me.x = nx;
                me.y = ny;
            } else {
                // Try moving as far as possible
                for (let dist = tpDistance; dist > 0; dist -= 20) {
                    nx = me.x + Math.cos(me.angle) * dist;
                    ny = me.y + Math.sin(me.angle) * dist;
                    if (!collides(nx, ny, PLAYER_RADIUS)) {
                        me.x = nx;
                        me.y = ny;
                        break;
                    }
                }
            }
            me.teleportCooldown = 5; // 5 sec cooldown
        }
    }
});
window.addEventListener('keyup', e => {
    if (e.key === 'w' || e.key === 'W') input.up = false;
    if (e.key === 's' || e.key === 'S') input.down = false;
    if (e.key === 'a' || e.key === 'A') input.left = false;
    if (e.key === 'd' || e.key === 'D') input.right = false;
});
window.addEventListener('mousemove', e => { mouseX = e.clientX; mouseY = e.clientY; });
window.addEventListener('mousedown', e => {
    if (e.button === 0) input.shooting = true;
    if (e.button === 2) isScoping = true;
});
window.addEventListener('mouseup', e => {
    if (e.button === 0) input.shooting = false;
    if (e.button === 2) isScoping = false;
});
window.addEventListener('contextmenu', e => e.preventDefault());
window.addEventListener('wheel', e => {
    if (e.deltaY > 0) { input.weapon++; if (input.weapon > 3) input.weapon = 1; } 
    else { input.weapon--; if (input.weapon < 1) input.weapon = 3; }
});

const weaponNames = { 1: 'Assault', 2: 'Shotgun', 3: 'Sniper' };

function shoot(entity) {
    if (entity.shootCooldown > 0) return;

    let speed = 600, damage = 10, lifetime = 1.5, spread = 0, bulletsToSpawn = 1, cooldown = 0.2;
    if (entity.weapon === 1) { speed = 800; damage = 15; spread = 0.05; cooldown = 0.15; }
    else if (entity.weapon === 2) { speed = 700; damage = 8; spread = 0.2; bulletsToSpawn = 5; lifetime = 0.5; cooldown = 0.8; }
    else if (entity.weapon === 3) { speed = 1500; damage = 50; spread = 0; lifetime = 2; cooldown = 1.5; }

    entity.shootCooldown = cooldown;

    for (let i = 0; i < bulletsToSpawn; i++) {
        const finalAngle = entity.angle + (Math.random() - 0.5) * spread;
        gameState.bullets.push({
            ownerId: entity.id,
            x: entity.x + Math.cos(finalAngle) * PLAYER_RADIUS,
            y: entity.y + Math.sin(finalAngle) * PLAYER_RADIUS,
            vx: Math.cos(finalAngle) * speed,
            vy: Math.sin(finalAngle) * speed,
            damage, lifetime, age: 0
        });
    }
}

function lineOfSight(x1, y1, x2, y2) {
    const dist = Math.hypot(x2 - x1, y2 - y1);
    const steps = Math.ceil(dist / 20);
    for (let i = 0; i <= steps; i++) {
        const cx = x1 + (x2 - x1) * (i / steps);
        const cy = y1 + (y2 - y1) * (i / steps);
        if (collides(cx, cy, 5, true, true)) return false;
    }
    return true;
}

function getZoomForWeapon(weapon) {
    if (weapon === 1) return 0.8; // Assault: Medium view
    if (weapon === 2) return 1.0; // Shotgun: Small view
    if (weapon === 3) return 0.5; // Sniper: Large view
    return 1.0;
}

function updateBots(dt) {
    // Reduced speed for bots
    const botSpeed = botDifficulty === 'easy' ? 80 : botDifficulty === 'medium' ? 120 : 160;
    
    for (let id in gameState.entities) {
        let e = gameState.entities[id];
        if (!e.isBot || e.isDead) continue;

        e.stateTimer -= dt;

        // Find nearest target (FFA)
        let nearestDist = Infinity;
        let target = null;
        for (let oid in gameState.entities) {
            if (oid === id) continue;
            let other = gameState.entities[oid];
            if (other.isDead) continue;
            let d = Math.hypot(e.x - other.x, e.y - other.y);
            if (d < 1000 && d < nearestDist && lineOfSight(e.x, e.y, other.x, other.y)) {
                nearestDist = d;
                target = other;
            }
        }

        if (target) {
            e.angle = Math.atan2(target.y - e.y, target.x - e.x);
            
            // Aiming inaccuracy based on difficulty
            if (botDifficulty === 'easy') e.angle += (Math.random() - 0.5) * 0.5;
            else if (botDifficulty === 'medium') e.angle += (Math.random() - 0.5) * 0.2;

            // Only hide if recently shot (in the last 4 seconds)
            const shouldHide = (botDifficulty === 'medium' || botDifficulty === 'hard') && e.recentlyShotTimer > 0;
            
            if (shouldHide) {
                // Find nearest box to hide behind
                let nearestBox = null, bd = Infinity;
                for (let b of gameState.boxes) {
                    let d = Math.hypot(e.x - (b.x + b.width/2), e.y - (b.y + b.height/2));
                    if (d < bd) { bd = d; nearestBox = b; }
                }
                
                if (nearestBox && nearestDist < 600) {
                    // Hide behind box away from target
                    const angleAway = Math.atan2((nearestBox.y + nearestBox.height/2) - target.y, (nearestBox.x + nearestBox.width/2) - target.x);
                    const hideX = nearestBox.x + nearestBox.width/2 + Math.cos(angleAway) * (BOX_SIZE/2 + 20);
                    const hideY = nearestBox.y + nearestBox.height/2 + Math.sin(angleAway) * (BOX_SIZE/2 + 20);
                    
                    if (Math.hypot(e.x - hideX, e.y - hideY) > 10) {
                        const mAngle = Math.atan2(hideY - e.y, hideX - e.x);
                        let nx = e.x + Math.cos(mAngle) * botSpeed * dt;
                        let ny = e.y + Math.sin(mAngle) * botSpeed * dt;
                        // Use sliding collision to avoid getting stuck
                        if (!collides(nx, e.y, PLAYER_RADIUS)) e.x = nx;
                        if (!collides(e.x, ny, PLAYER_RADIUS)) e.y = ny;
                    }
                } else {
                    // Move towards target
                    if (nearestDist > 300) {
                        let nx = e.x + Math.cos(e.angle) * botSpeed * dt;
                        let ny = e.y + Math.sin(e.angle) * botSpeed * dt;
                        if (!collides(nx, e.y, PLAYER_RADIUS)) e.x = nx;
                        if (!collides(e.x, ny, PLAYER_RADIUS)) e.y = ny;
                    }
                }
            } else {
                // Aggressive mode - chase target, slide on walls
                if (nearestDist > 200) {
                    let nx = e.x + Math.cos(e.angle) * botSpeed * dt;
                    let ny = e.y + Math.sin(e.angle) * botSpeed * dt;
                    if (!collides(nx, e.y, PLAYER_RADIUS)) e.x = nx;
                    if (!collides(e.x, ny, PLAYER_RADIUS)) e.y = ny;
                }
            }

            // Shooting logic
            if (Math.random() < (botDifficulty === 'hard' ? 0.05 : botDifficulty === 'medium' ? 0.02 : 0.01)) {
                shoot(e);
            }
            
        } else {
            // Wander
            if (e.stateTimer <= 0) {
                e.stateTimer = 2 + Math.random() * 3;
                e.wanderAngle = Math.random() * Math.PI * 2;
            }
            e.angle = e.wanderAngle;
            let nx = e.x + Math.cos(e.angle) * botSpeed * 0.5 * dt;
            let ny = e.y + Math.sin(e.angle) * botSpeed * 0.5 * dt;
            if (collides(nx, ny, PLAYER_RADIUS)) {
                e.wanderAngle += Math.PI; // Turn around
            } else {
                e.x = nx; e.y = ny;
            }
        }
        
        e.x = Math.max(PLAYER_RADIUS, Math.min(MAP_WIDTH - PLAYER_RADIUS, e.x));
        e.y = Math.max(PLAYER_RADIUS, Math.min(MAP_HEIGHT - PLAYER_RADIUS, e.y));
    }
}

function gameLoop(time) {
    const dt = Math.min((time - lastTime) / 1000, 0.1);
    lastTime = time;

    const me = gameState.entities[myId];
    if (!me) return requestAnimationFrame(gameLoop);

    // Update Time
    gameState.timeLeft -= dt;
    if (gameState.timeLeft <= 0) {
        gameState.timeLeft = GAME_DURATION;
        for (let id in gameState.entities) {
            Object.assign(gameState.entities[id], spawnEntity(id, gameState.entities[id].isBot));
        }
    }

    // Player Update
    if (!me.isDead) {
        me.weapon = input.weapon;
        weaponDisplay.innerText = weaponNames[me.weapon];
        
        // Handle dash speed boost
        let currentSpeed = 180; // Decreased base speed of momentum
        if (me.dashTimer > 0) {
            currentSpeed = 350; // Increased speed while dashing
        }
        
        let nx = me.x, ny = me.y;
        if (input.up) ny -= currentSpeed * dt;
        if (input.down) ny += currentSpeed * dt;
        if (input.left) nx -= currentSpeed * dt;
        if (input.right) nx += currentSpeed * dt;

        // Sliding collision for player
        if (!collides(nx, me.y, PLAYER_RADIUS)) me.x = nx;
        if (!collides(me.x, ny, PLAYER_RADIUS)) me.y = ny;

        me.x = Math.max(PLAYER_RADIUS, Math.min(MAP_WIDTH - PLAYER_RADIUS, me.x));
        me.y = Math.max(PLAYER_RADIUS, Math.min(MAP_HEIGHT - PLAYER_RADIUS, me.y));

        if (input.shooting) shoot(me);
    } else {
        deathScreen.style.display = 'block';
        hpDisplay.innerText = "DEAD";
    }

    // Update Entity Cooldowns and Timers
    for (let id in gameState.entities) {
        let e = gameState.entities[id];
        if (e.shootCooldown > 0) e.shootCooldown -= dt;
        if (e.recentlyShotTimer > 0) e.recentlyShotTimer -= dt;
        if (e.dashTimer > 0) e.dashTimer -= dt;
        if (e.dashCooldown > 0) e.dashCooldown -= dt;
        if (e.teleportCooldown > 0) e.teleportCooldown -= dt;
    }
    
    updateBots(dt);

    // Bullet Update
    for (let i = gameState.bullets.length - 1; i >= 0; i--) {
        let b = gameState.bullets[i];
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.age += dt;

        let hit = false;
        if (b.x < 0 || b.x > MAP_WIDTH || b.y < 0 || b.y > MAP_HEIGHT) hit = true;

        if (!hit && collides(b.x, b.y, 4, true, true)) hit = true;

        if (!hit) {
            for (let id in gameState.entities) {
                if (id === b.ownerId) continue;
                let p = gameState.entities[id];
                if (p.isDead) continue;
                if (Math.hypot(b.x - p.x, b.y - p.y) < PLAYER_RADIUS + 4) {
                    p.hp -= b.damage;
                    p.recentlyShotTimer = 4; // Trigger hiding behavior for 4 seconds
                    
                    if (id === myId) hpDisplay.innerText = Math.max(0, Math.ceil(p.hp));
                    if (p.hp <= 0) {
                        p.isDead = true;
                        setTimeout(() => {
                            Object.assign(p, spawnEntity(id, p.isBot));
                            if (id === myId) { deathScreen.style.display = 'none'; hpDisplay.innerText = 100; }
                        }, id === myId ? 3000 : 5000); // 5 sec respawn for bots, 3 for player
                    }
                    hit = true; break;
                }
            }
        }

        if (b.age > b.lifetime || hit) {
            gameState.bullets.splice(i, 1);
        }
    }

    // Rendering
    const zoom = getZoomForWeapon(me.weapon);

    let camX = me.x;
    let camY = me.y;
    
    // Adjust logic for zoom in scoping
    if (isScoping && !me.isDead) {
        const offsetRange = 400 / zoom;
        const dx = mouseX - canvas.width / 2;
        const dy = mouseY - canvas.height / 2;
        const dist = Math.hypot(dx, dy);
        const maxOffset = Math.min(dist, offsetRange);
        const angle = Math.atan2(dy, dx);
        camX += Math.cos(angle) * maxOffset;
        camY += Math.sin(angle) * maxOffset;
    }

    // Determine player angle
    if (!me.isDead) {
        const screenCenterX = canvas.width / 2;
        const screenCenterY = canvas.height / 2;
        const playerScreenX = screenCenterX + (me.x - camX) * zoom;
        const playerScreenY = screenCenterY + (me.y - camY) * zoom;
        me.angle = Math.atan2(mouseY - playerScreenY, mouseX - playerScreenX);
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    
    // Center camera and apply zoom
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-camX, -camY);

    // Draw Map
    ctx.fillStyle = '#222233';
    ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
    ctx.strokeStyle = '#333344';
    ctx.lineWidth = 5;
    ctx.strokeRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x <= MAP_WIDTH; x += 100) { ctx.moveTo(x, 0); ctx.lineTo(x, MAP_HEIGHT); }
    for (let y = 0; y <= MAP_HEIGHT; y += 100) { ctx.moveTo(0, y); ctx.lineTo(MAP_WIDTH, y); }
    ctx.stroke();

    // Draw Boxes
    ctx.fillStyle = '#b2bec3';
    for (let b of gameState.boxes) {
        ctx.fillRect(b.x, b.y, b.width, b.height);
        ctx.strokeStyle = '#636e72';
        ctx.lineWidth = 3;
        ctx.strokeRect(b.x, b.y, b.width, b.height);
    }

    // Draw Trees
    for (let t of gameState.trees) {
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#00b894'; ctx.fill();
        ctx.strokeStyle = '#009432'; ctx.lineWidth = 4; ctx.stroke();
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.radius * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = '#55efc4'; ctx.fill();
    }

    // Draw Bullets
    for (let b of gameState.bullets) {
        ctx.beginPath();
        ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#feca57'; ctx.fill();
        ctx.shadowBlur = 10; ctx.shadowColor = '#feca57'; ctx.fill(); ctx.shadowBlur = 0;
    }

    // Draw Entities (Player & Bots)
    for (let id in gameState.entities) {
        const p = gameState.entities[id];
        if (p.isDead) continue;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);

        ctx.beginPath();
        ctx.arc(0, 0, 20, 0, Math.PI * 2);
        ctx.fillStyle = p.isBot ? '#d63031' : '#0984e3';
        ctx.fill();
        
        // Draw Dash Indicator
        if (p.dashTimer > 0) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#0984e3';
            ctx.stroke();
        } else {
            ctx.shadowBlur = 0;
        }

        ctx.strokeStyle = '#2d3436';
        ctx.lineWidth = 3; ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#b2bec3';
        if (p.weapon === 1) ctx.fillRect(15, -4, 25, 8);
        else if (p.weapon === 2) ctx.fillRect(15, -6, 20, 12);
        else if (p.weapon === 3) ctx.fillRect(15, -3, 40, 6);

        ctx.restore();

        // Health bar
        if (id !== myId) {
            ctx.fillStyle = '#d63031';
            ctx.fillRect(p.x - 20, p.y - 35, 40, 6);
            ctx.fillStyle = '#00b894';
            ctx.fillRect(p.x - 20, p.y - 35, 40 * (p.hp / 100), 6);
            ctx.strokeStyle = '#2d3436';
            ctx.lineWidth = 1;
            ctx.strokeRect(p.x - 20, p.y - 35, 40, 6);
        }
    }

    ctx.restore(); // Restore global translation and scaling

    // HUD Updates
    if (me.dashCooldown > 0) {
        // Optional: show dash cooldown in HUD, but we keep it simple
    }

    // HUD / Crosshairs overlay (not scaled by zoom)
    if (isScoping && !me.isDead) {
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(mouseX - 15, mouseY); ctx.lineTo(mouseX + 15, mouseY);
        ctx.moveTo(mouseX, mouseY - 15); ctx.lineTo(mouseX, mouseY + 15);
        ctx.stroke();
        ctx.beginPath(); ctx.arc(mouseX, mouseY, 10, 0, Math.PI * 2); ctx.stroke();
    } else if (!isScoping && !me.isDead) {
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(mouseX - 10, mouseY); ctx.lineTo(mouseX + 10, mouseY);
        ctx.moveTo(mouseX, mouseY - 10); ctx.lineTo(mouseX, mouseY + 10);
        ctx.stroke();
    }

    // Time display
    const m = Math.floor(gameState.timeLeft / 60);
    const s = Math.floor(gameState.timeLeft % 60).toString().padStart(2, '0');
    timeDisplay.innerText = `${m}:${s}`;

    requestAnimationFrame(gameLoop);
}
