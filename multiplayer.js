// --- CONSTANTES ---
const BLOCK_SIZE = 20;
const ROWS = 20, COLS = 10;
const COLORS = [null, '#FF0D72', '#0DC2FF', '#0DFF72', '#F538FF', '#FF8E0D', '#FFE138', '#3877FF'];

let gameRunning = false, paused = false;
let isVsCPU = false;
let difficulty = 'normal';
let p1Name = "", p2Name = "";

// IA PERFIL
const AI_PROFILE = {
    easy: { lines: 5, height: -1, holes: -1, bumpiness: -1, speed: 600 },
    normal: { lines: 20, height: -5, holes: -10, bumpiness: -5, speed: 350 },
    hard: { lines: 50, height: -20, holes: -50, bumpiness: -10, speed: 200 }
};

// --- CLASE TETRIS ---
class Tetris {
    constructor(cvsId, nextId, scoreId, linesId, isCPU) {
        this.canvas = document.getElementById(cvsId);
        this.ctx = this.canvas.getContext('2d');
        this.nextCvs = document.getElementById(nextId);
        this.nextCtx = this.nextCvs.getContext('2d');
        this.scoreEl = document.getElementById(scoreId);
        this.linesEl = document.getElementById(linesId);

        this.ctx.scale(BLOCK_SIZE, BLOCK_SIZE);
        this.nextCtx.scale(15, 15);
        this.isCPU = isCPU;
        this.opponent = null;

        this.resetVars();
    }

    resetVars() {
        this.arena = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
        this.score = 0; this.lines = 0;
        this.gameOver = false;
        this.dropCounter = 0; this.dropInterval = 1000;
        this.pieces = 'ILJOTSZ'; this.bag = [];
        this.player = { pos: { x: 0, y: 0 }, matrix: null, next: null };
        this.aiQueue = []; this.aiTimer = 0;
    }

    fullReset() {
        this.resetVars();
        this.nextPiece();
        this.spawn();
        this.updateScore();
    }

    getPieceFromBag() {
        if (this.bag.length === 0) {
            this.bag = this.pieces.split('').map(c => this.createPiece(c));
            for (let i = this.bag.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
            }
        }
        return this.bag.pop();
    }

    createPiece(type) {
        if (type === 'I') return [[0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0]];
        if (type === 'L') return [[0, 2, 0], [0, 2, 0], [0, 2, 2]];
        if (type === 'J') return [[0, 3, 0], [0, 3, 0], [3, 3, 0]];
        if (type === 'O') return [[4, 4], [4, 4]];
        if (type === 'Z') return [[5, 5, 0], [0, 5, 5], [0, 0, 0]];
        if (type === 'S') return [[0, 6, 6], [6, 6, 0], [0, 0, 0]];
        if (type === 'T') return [[0, 7, 0], [7, 7, 7], [0, 0, 0]];
    }

    nextPiece() {
        if (!this.player.next) this.player.next = this.getPieceFromBag();
        this.player.matrix = this.player.next;
        this.player.next = this.getPieceFromBag();
    }

    spawn() {
        this.player.pos.y = 0;
        this.player.pos.x = (this.arena[0].length / 2 | 0) - (this.player.matrix[0].length / 2 | 0);
        
        if (this.collide(this.arena, this.player)) {
            this.gameOver = true;
            // SI ESTE JUGADOR PIERDE, GANA EL OTRO
            const winnerId = (this === p1) ? 2 : 1;
            handleWin(winnerId);
        } else if (this.isCPU) {
            this.planAiMove();
        }
    }

    collide(arena, player) {
        const [m, o] = [player.matrix, player.pos];
        for (let y = 0; y < m.length; ++y) {
            for (let x = 0; x < m[y].length; ++x) {
                if (m[y][x] !== 0 && (arena[y + o.y] && arena[y + o.y][x + o.x]) !== 0) return true;
            }
        }
        return false;
    }

    draw() {
        // Efecto visual: si gameOver, fondo gris
        this.ctx.fillStyle = this.gameOver ? '#222' : '#050505';
        this.ctx.fillRect(0, 0, this.canvas.width / BLOCK_SIZE, this.canvas.height / BLOCK_SIZE);
        
        this.arena.forEach((row, y) => { 
            row.forEach((val, x) => { 
                if (val) this.drawBlock(this.ctx, x, y, val, false, this.gameOver); 
            }); 
        });

        if (!this.gameOver) {
            let ghostY = this.player.pos.y;
            while (!this.collide(this.arena, { pos: { x: this.player.pos.x, y: ghostY + 1 }, matrix: this.player.matrix })) ghostY++;
            this.player.matrix.forEach((row, y) => { row.forEach((val, x) => { if (val) this.drawBlock(this.ctx, x + this.player.pos.x, y + ghostY, val, true); }); });
            this.player.matrix.forEach((row, y) => { row.forEach((val, x) => { if (val) this.drawBlock(this.ctx, x + this.player.pos.x, y + this.player.pos.y, val); }); });
        }

        this.nextCtx.fillStyle = '#111'; this.nextCtx.fillRect(0, 0, 4, 4);
        if (this.player.next) {
            this.player.next.forEach((row, y) => { row.forEach((val, x) => { if (val) this.drawBlock(this.nextCtx, x + (val === 4 ? 0 : 0.5), y + (val === 4 ? 0 : 0.5), val); }); });
        }
    }

    drawBlock(ctx, x, y, c, isGhost = false, forceGray = false) {
        let color = forceGray ? '#555' : COLORS[c];
        if (isGhost) {
            ctx.globalAlpha = 0.2; ctx.fillStyle = color; ctx.fillRect(x, y, 1, 1);
            ctx.globalAlpha = 1.0; ctx.strokeStyle = color; ctx.lineWidth = 0.05; ctx.strokeRect(x, y, 1, 1);
        } else {
            ctx.fillStyle = color; ctx.fillRect(x, y, 1, 1);
            ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 0.05; ctx.strokeRect(x, y, 1, 1);
            ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(x, y, 1, 0.2);
        }
    }

    merge() {
        this.player.matrix.forEach((row, y) => { row.forEach((val, x) => { if (val) this.arena[y + this.player.pos.y][x + this.player.pos.x] = val; }); });
    }

    rotate(dir) {
        const pos = this.player.pos.x;
        let offset = 1;
        this._rotateMatrix(this.player.matrix, dir);
        while (this.collide(this.arena, this.player)) {
            this.player.pos.x += offset;
            offset = -(offset + (offset > 0 ? 1 : -1));
            if (offset > this.player.matrix[0].length) { this._rotateMatrix(this.player.matrix, -dir); this.player.pos.x = pos; return; }
        }
    }
    _rotateMatrix(matrix, dir) {
        for (let y = 0; y < matrix.length; ++y) { for (let x = 0; x < y; ++x) { [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]]; } }
        if (dir > 0) matrix.forEach(row => row.reverse()); else matrix.reverse();
    }

    drop() {
        this.player.pos.y++;
        if (this.collide(this.arena, this.player)) {
            this.player.pos.y--; this.merge(); this.sweep(); this.nextPiece(); this.spawn();
        }
        this.dropCounter = 0;
    }

    hardDrop() {
        while (!this.collide(this.arena, this.player)) { this.player.pos.y++; }
        this.player.pos.y--;
        this.merge(); this.sweep(); this.nextPiece(); this.spawn(); this.dropCounter = 0;
    }

    sweep() {
        let rowCount = 0;
        outer: for (let y = this.arena.length - 1; y > 0; --y) {
            for (let x = 0; x < this.arena[y].length; ++x) { if (this.arena[y][x] === 0) continue outer; }
            const row = this.arena.splice(y, 1)[0].fill(0); this.arena.unshift(row); ++y; rowCount++;
        }
        if (rowCount > 0) {
            this.score += rowCount * 10 * rowCount;
            this.lines += rowCount;
            this.dropInterval = Math.max(100, 1000 - (this.lines * 15));
            this.updateScore();
            showComboMessage(this.canvas, rowCount);
        }
    }

    updateScore() {
        this.scoreEl.innerText = this.score; this.linesEl.innerText = this.lines;
    }

    evaluate(arena) {
        let lines = 0, holes = 0, bumpiness = 0, aggregateHeight = 0, maxHeight = 0;
        let tempArena = arena.map(row => [...row]);
        for (let y = 0; y < ROWS; y++) if (tempArena[y].every(v => v !== 0)) { lines++; tempArena.splice(y, 1); tempArena.unshift(new Array(COLS).fill(0)); }
        const heights = new Array(COLS).fill(0);
        for (let x = 0; x < COLS; x++) {
            for (let y = 0; y < ROWS; y++) {
                if (tempArena[y][x] !== 0) { if (heights[x] === 0) heights[x] = ROWS - y; } else if (heights[x] > 0) holes++;
            }
            aggregateHeight += heights[x]; if (heights[x] > maxHeight) maxHeight = heights[x];
        }
        for (let x = 0; x < COLS - 1; x++) bumpiness += Math.abs(heights[x] - heights[x + 1]);
        if (maxHeight >= 19) return -Infinity;
        const w = AI_PROFILE[difficulty];
        return (lines * w.lines) + (aggregateHeight * w.height) + (holes * w.holes) + (bumpiness * w.bumpiness);
    }

    planAiMove() {
        if (!this.isCPU) return;
        let strategy = "normal", speedMod = 1.0;
        if (this.opponent) {
            const opH = this.opponent.getHighestBlock();
            const myH = this.getHighestBlock();
            if (opH > 15) { strategy = "safe"; speedMod = 1.5; }
            else if (opH < 8 && myH < 10) { strategy = "aggro"; speedMod = 0.8; }
        }
        let bestScore = -Infinity, bestMove = { rot: 0, x: 0 };
        for (let r = 0; r < 4; r++) {
            let piece = JSON.parse(JSON.stringify(this.player.matrix));
            for (let i = 0; i < r; i++) this._rotateMatrix(piece, 1);
            for (let x = -2; x < COLS; x++) {
                if (this.collide(this.arena, { pos: { x: x, y: 0 }, matrix: piece })) continue;
                let y = 0; while (!this.collide(this.arena, { pos: { x: x, y: y + 1 }, matrix: piece })) y++;
                let simArena = this.arena.map(row => [...row]);
                piece.forEach((row, dy) => { row.forEach((val, dx) => { if (val) simArena[y + dy][x + dx] = val; }); });
                let score = this.evaluate(simArena);
                if (strategy === "aggro") score += (Math.random() * 5);
                if (score > bestScore) { bestScore = score; bestMove = { rot: r, x: x }; }
            }
        }
        this.aiQueue = [];
        for (let i = 0; i < bestMove.rot; i++) this.aiQueue.push('R');
        let curX = this.player.pos.x;
        while (curX < bestMove.x) { this.aiQueue.push('D'); curX++; }
        while (curX > bestMove.x) { this.aiQueue.push('I'); curX--; }
        this.aiQueue.push('DROP');
        this.aiMoveSpeed = AI_PROFILE[difficulty].speed * speedMod;
    }
    getHighestBlock() { for (let y = 0; y < ROWS; y++) if (this.arena[y].some(c => c !== 0)) return ROWS - y; return 0; }
    updateCPU(dt) {
        if (!this.isCPU || this.aiQueue.length === 0 || this.gameOver) return;
        this.aiTimer += dt;
        if (this.aiTimer > this.aiMoveSpeed) {
            const move = this.aiQueue.shift();
            if (move === 'R') this.rotate(1);
            else if (move === 'D') { this.player.pos.x++; if (this.collide(this.arena, this.player)) this.player.pos.x--; }
            else if (move === 'I') { this.player.pos.x--; if (this.collide(this.arena, this.player)) this.player.pos.x++; }
            else if (move === 'DROP') this.hardDrop();
            this.aiTimer = 0;
        }
    }
}

const p1 = new Tetris('p1-tetris', 'p1-next', 'p1-score', 'p1-lines', false);
const p2 = new Tetris('p2-tetris', 'p2-next', 'p2-score', 'p2-lines', false);
p1.opponent = p2;
p2.opponent = p1;

// --- GESTIÓN DE UI ---
function showComboMessage(canvasEl, lines) {
    const messages = {
        1: "GOOD!",
        2: "EXCELLENT!",
        3: "AMAZING!",
        4: "PERFECT!!"
    };

    if (!messages[lines]) return;

    // Buscamos el contenedor padre inmediato del canvas
    const container = canvasEl.parentElement; 
    const el = document.createElement('div');
    el.className = 'combo-text';
    el.innerText = messages[lines];

    // Aplicar colores según el ID del canvas
    if (canvasEl.id === 'p1-tetris') {
        el.style.color = 'var(--p1-color)';
        el.style.textShadow = '0 0 15px rgba(13, 194, 255, 0.7), 2px 2px 0px #000';
        // Ajuste fino para centrarlo solo sobre el canvas de juego
        el.style.left = "100px"; // La mitad del ancho del canvas (200px / 2)
    } else {
        el.style.color = 'var(--p2-color)';
        el.style.textShadow = '0 0 15px rgba(255, 13, 114, 0.7), 2px 2px 0px #000';
        el.style.left = "100px"; // La mitad del ancho del canvas (200px / 2)
    }
    
    container.appendChild(el);
    setTimeout(() => el.remove(), 800);
}

function showStartMenu() {
    gameRunning = false;
    document.querySelectorAll('.overlay').forEach(el => el.style.display = 'none');
    document.getElementById('start-overlay').style.display = 'flex';
}

function toggleControls() {
    const el = document.getElementById('controls-overlay');
    el.style.display = el.style.display === 'flex' ? 'none' : 'flex';
}

function setupGame(isCpuMode) {
    isVsCPU = isCpuMode;
    document.getElementById('start-overlay').style.display = 'none';
    document.getElementById('setup-overlay').style.display = 'flex';
    document.getElementById('error-msg').style.display = 'none';

    if (isVsCPU) {
        document.getElementById('p2-group').style.display = 'none';
        document.getElementById('cpu-group').style.display = 'block';
        document.getElementById('setup-title').innerText = "VS MÁQUINA";
    } else {
        document.getElementById('p2-group').style.display = 'block';
        document.getElementById('cpu-group').style.display = 'none';
        document.getElementById('setup-title').innerText = "1 VS 1 LOCAL";
    }
}

function validateAndStart() {
    const n1 = document.getElementById('p1-input').value.trim();
    const n2 = document.getElementById('p2-input').value.trim();
    const errorEl = document.getElementById('error-msg');

    if (n1 === "" || (!isVsCPU && n2 === "")) {
        errorEl.style.display = 'block';
        return;
    }

    p1Name = n1.substring(0, 10);
    p2Name = isVsCPU ? "CPU" : n2.substring(0, 10);
    difficulty = document.getElementById('cpu-diff').value;

    document.getElementById('p1-name-disp').innerText = p1Name;
    document.getElementById('p2-name-disp').innerText = p2Name + (isVsCPU ? ` (${difficulty.toUpperCase()})` : "");

    // Mostrar/ocultar mini-controles P2
    const p2Section = document.querySelector('.p2-border');
    if (isVsCPU) p2Section.classList.add('is-cpu');
    else p2Section.classList.remove('is-cpu');

    p2.isCPU = isVsCPU;
    document.getElementById('setup-overlay').style.display = 'none';
    restartMatch();
}

function restartMatch() {
    document.getElementById('end-overlay').style.display = 'none';
    p1.fullReset(); p2.fullReset();
    gameRunning = true; paused = false;
    lastTime = 0;
    update();
}

function handleWin(winnerId) {
    gameRunning = false;
    const name = winnerId === 1 ? p1Name : p2Name;
    const score = winnerId === 1 ? p1.score : p2.score;

    document.getElementById('winner-text').innerText = `¡GANÓ ${name}!`;
    document.getElementById('winner-text').style.color = winnerId === 1 ? "var(--p1-color)" : "var(--p2-color)";
    document.getElementById('winner-score').innerText = `Puntos: ${score}`;
    document.getElementById('end-overlay').style.display = 'flex';

    if (isVsCPU) {
        if (winnerId === 1) saveScore('cpu', { name: p1Name, score: p1.score, info: difficulty });
    } else {
        const loserName = winnerId === 1 ? p2Name : p1Name;
        saveScore('pvp', { name: name, score: score, info: `vs ${loserName}` });
    }
}

function saveScore(type, data) {
    const key = type === 'cpu' ? 'tetris_cpu_rank' : 'tetris_pvp_rank';
    let ranks = JSON.parse(localStorage.getItem(key)) || [];
    ranks.push({ ...data, date: new Date().toLocaleDateString() });
    ranks.sort((a, b) => b.score - a.score);
    localStorage.setItem(key, JSON.stringify(ranks.slice(0, 15)));
}

function toggleRanking() {
    const ol = document.getElementById('rank-overlay');
    ol.style.display = ol.style.display === 'flex' ? 'none' : 'flex';
    if (ol.style.display === 'flex') switchTab(currentTab);
}

// Quita el foco de cualquier botón después de hacer clic
document.addEventListener('click', function(e) {
    if (document.activeElement.tagName === 'BUTTON') {
        document.activeElement.blur();
    }
});

let currentTab = 'cpu';
function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.querySelector(`.tab-btn[onclick*="${tab}"]`);
    if(activeBtn) activeBtn.classList.add('active');
    
    const list = document.getElementById('rank-list');
    const key = tab === 'cpu' ? 'tetris_cpu_rank' : 'tetris_pvp_rank';
    const data = JSON.parse(localStorage.getItem(key)) || [];

    if (data.length === 0) list.innerHTML = "<p style='color:#777;text-align:center'>Sin registros</p>";
    else {
        list.innerHTML = data.map((r, i) => `
            <div class="rank-row ${i === 0 ? 'rank-gold' : ''}">
                <div><span>${i + 1}. <b>${r.name}</b></span><span class="rank-meta">(${r.info})</span></div>
                <b>${r.score}</b>
            </div>
        `).join('');
    }
}

function clearRankings() {
    if (confirm("¿Seguro que quieres borrar todos los records?")) {
        localStorage.removeItem('tetris_cpu_rank');
        localStorage.removeItem('tetris_pvp_rank');
        switchTab(currentTab);
    }
}

// --- CONTROLES ---
document.addEventListener('keydown', e => {
    if (e.key === "Escape" || e.key.toLowerCase() === "p") {
        if (gameRunning) { paused = !paused; document.getElementById('btn-pause').innerText = paused ? "▶ REANUDAR" : "⏸ PAUSAR"; }
    }
    if (!gameRunning || paused) return;

    // P1
    if (e.code === 'KeyA') { p1.player.pos.x--; if (p1.collide(p1.arena, p1.player)) p1.player.pos.x++; }
    if (e.code === 'KeyD') { p1.player.pos.x++; if (p1.collide(p1.arena, p1.player)) p1.player.pos.x--; }
    if (e.code === 'KeyS') p1.drop();
    if (e.code === 'KeyW') p1.rotate(1);
    if (e.code === 'Space') p1.hardDrop();

    // P2 (Solo si no es CPU)
    if (!isVsCPU) {
        if (e.code === 'ArrowLeft') { p2.player.pos.x--; if (p2.collide(p2.arena, p2.player)) p2.player.pos.x++; }
        if (e.code === 'ArrowRight') { p2.player.pos.x++; if (p2.collide(p2.arena, p2.player)) p2.player.pos.x--; }
        if (e.code === 'ArrowDown') p2.drop();
        if (e.code === 'ArrowUp') p2.rotate(1);
        if (e.code === 'Enter' || e.code === 'NumpadEnter') p2.hardDrop();
    }
});

document.getElementById('btn-pause').addEventListener('click', () => {
    if (gameRunning) { paused = !paused; document.getElementById('btn-pause').innerText = paused ? "▶ REANUDAR" : "⏸ PAUSAR"; }
});

let lastTime = 0;
function update(time = 0) {
    if (!gameRunning) return;
    const deltaTime = time - lastTime; lastTime = time;
    if (!paused) {
        p1.dropCounter += deltaTime; if (p1.dropCounter > p1.dropInterval) p1.drop();
        p2.dropCounter += deltaTime; if (p2.dropCounter > p2.dropInterval) p2.drop();
        if (p2.isCPU) p2.updateCPU(deltaTime);
    }
    p1.draw(); p2.draw();
    requestAnimationFrame(update);
}