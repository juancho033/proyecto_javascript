const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextContext = nextCanvas.getContext('2d');
const feedbackEl = document.getElementById('feedback');
const mainContainer = document.getElementById('main-container');

context.scale(20, 20);
nextContext.scale(20, 20);

const colors = [null, '#FF0D72', '#0DC2FF', '#0DFF72', '#F538FF', '#FF8E0D', '#FFE138', '#3877FF'];

function drawBlock(ctx, x, y, colorIndex, isGhost = false) {
    const color = colors[colorIndex];
    if (isGhost) {
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = 0.1;
        ctx.strokeRect(x + 0.05, y + 0.05, 0.9, 0.9);
        ctx.globalAlpha = 1.0;
        return;
    }
    ctx.fillStyle = color;
    ctx.fillRect(x, y, 1, 1);
    let gradient = ctx.createLinearGradient(x, y, x + 1, y + 1);
    gradient.addColorStop(0, 'rgba(255,255,255,0.4)');
    gradient.addColorStop(0.5, 'rgba(255,255,255,0)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.3)');
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, 1, 1);
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 0.05;
    ctx.strokeRect(x, y, 1, 1);
}

const arena = createMatrix(12, 20);
const player = { pos: { x: 0, y: 0 }, matrix: null, next: null, score: 0, level: 1, lines: 0 };

let playerName = localStorage.getItem('lastPlayer') || "";
let gamePaused = true;
let dropCounter = 0;
let lastTime = 0;

function createMatrix(w, h) {
    const matrix = [];
    while (h--) { matrix.push(new Array(w).fill(0)); }
    return matrix;
}

function createPiece(type) {
    if (type === 'I') return [[0, 2, 0, 0], [0, 2, 0, 0], [0, 2, 0, 0], [0, 2, 0, 0]];
    if (type === 'L') return [[0, 5, 0], [0, 5, 0], [0, 5, 5]];
    if (type === 'J') return [[0, 7, 0], [0, 7, 0], [7, 7, 0]];
    if (type === 'O') return [[6, 6], [6, 6]];
    if (type === 'Z') return [[4, 4, 0], [0, 4, 4], [0, 0, 0]];
    if (type === 'S') return [[0, 3, 3], [3, 3, 0], [0, 0, 0]];
    if (type === 'T') return [[0, 1, 0], [1, 1, 1], [0, 0, 0]];
}

function draw() {
    context.fillStyle = '#000';
    context.fillRect(0, 0, canvas.width, canvas.height);

    // --- DIBUJAR CUADRÍCULA (Grid) ---
    context.strokeStyle = '#222'; // Color de las líneas
    context.lineWidth = 0.05;

    for (let x = 0; x <= 12; x++) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, 20);
        context.stroke();
    }
    for (let y = 0; y <= 20; y++) {
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(12, y);
        context.stroke();
    }
    // --------------------------------

    arena.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) drawBlock(context, x, y, value);
        });
    });

    if (player.matrix) {
        let ghostPos = { x: player.pos.x, y: player.pos.y };
        while (!collide(arena, { pos: ghostPos, matrix: player.matrix })) { ghostPos.y++; }
        ghostPos.y--;
        player.matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) drawBlock(context, x + ghostPos.x, y + ghostPos.y, value, true);
            });
        });

        player.matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) drawBlock(context, x + player.pos.x, y + player.pos.y, value);
            });
        });
    }

    if (player.next) {
        nextContext.fillStyle = '#000';
        nextContext.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
        player.next.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) drawBlock(nextContext, x + 1, y + 1, value);
            });
        });
    }
}

function collide(arena, player) {
    const [m, o] = [player.matrix, player.pos];
    for (let y = 0; y < m.length; ++y) {
        for (let x = 0; x < m[y].length; ++x) {
            if (m[y][x] !== 0 && (arena[y + o.y] && arena[y + o.y][x + o.x]) !== 0) return true;
        }
    }
    return false;
}

function merge(arena, player) {
    player.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) arena[y + player.pos.y][x + player.pos.x] = value;
        });
    });
}

function rotate(matrix, dir) {
    for (let y = 0; y < matrix.length; ++y) {
        for (let x = 0; x < y; ++x) {
            [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
        }
    }
    if (dir > 0) matrix.forEach(row => row.reverse());
    else matrix.reverse();
}

function showFeedback(count) {
    const messages = ["", "GOOD!", "EXCELLENT!", "AMAZING!", "PERFECT!"];
    const colorsFeedback = ["", "#3498db", "#2ecc71", "#9b59b6", "#f1c40f"];

    feedbackEl.innerText = messages[count];
    feedbackEl.style.color = colorsFeedback[count];
    feedbackEl.style.display = 'block';

    canvas.classList.add('flash');
    mainContainer.classList.add('shake');

    setTimeout(() => {
        feedbackEl.style.display = 'none';
        canvas.classList.remove('flash');
        mainContainer.classList.remove('shake');
    }, 1000);
}

function arenaSweep() {
    let rowCount = 0;
    outer: for (let y = arena.length - 1; y > 0; --y) {
        for (let x = 0; x < arena[y].length; ++x) {
            if (arena[y][x] === 0) continue outer;
        }
        arena.unshift(arena.splice(y, 1)[0].fill(0));
        ++y;
        rowCount++;
    }
    if (rowCount > 0) {
        player.score += (rowCount * 10) * player.level * rowCount;
        player.lines += rowCount;
        player.level = Math.floor(player.lines / 10) + 1;
        showFeedback(rowCount);
        updateStats();
    }
}

function playerReset() {
    const pieces = 'ILJOTSZ';
    if (player.next === null) player.next = createPiece(pieces[pieces.length * Math.random() | 0]);
    player.matrix = player.next;
    player.next = createPiece(pieces[pieces.length * Math.random() | 0]);
    player.pos.y = 0;
    player.pos.x = (arena[0].length / 2 | 0) - (player.matrix[0].length / 2 | 0);

    if (collide(arena, player)) {
        gamePaused = true;
        saveScore(playerName, player.score);
        document.getElementById('game-over-overlay').style.display = 'flex';
        document.getElementById('final-score').innerText = player.score;
    }
}

function playerDrop() {
    player.pos.y++;
    if (collide(arena, player)) {
        player.pos.y--;
        merge(arena, player);
        playerReset();
        arenaSweep();
    }
    dropCounter = 0;
}

function updateStats() {
    document.getElementById('score').innerText = player.score;
    document.getElementById('level').innerText = player.level;
    document.getElementById('lines').innerText = player.lines;
    document.getElementById('display-name').innerText = playerName.toUpperCase() || "JUGADOR";
}

function saveScore(name, score) {
    let scores = JSON.parse(localStorage.getItem('tetrisRankingPro')) || [];
    const existingIndex = scores.findIndex(s => s.name.toLowerCase() === name.toLowerCase());

    if (existingIndex > -1) {
        if (score > scores[existingIndex].score) {
            scores[existingIndex].score = score;
        }
    } else {
        scores.push({ name, score });
    }

    scores.sort((a, b) => b.score - a.score);
    localStorage.setItem('tetrisRankingPro', JSON.stringify(scores.slice(0, 5)));
    displayRanking();
}

function displayRanking() {
    let scores = JSON.parse(localStorage.getItem('tetrisRankingPro')) || [];
    document.getElementById('ranking-list').innerHTML = scores.map(s =>
        `<li>${s.name} <span>${s.score}</span></li>`).join('');
}

function resetRanking() {
    if (confirm("¿Estás seguro de que quieres borrar el TOP 5? Esta acción no se puede deshacer.")) {
        // 1. Eliminamos el dato de localStorage
        localStorage.removeItem('tetrisRankingPro');
        
        // 2. Actualizamos la lista visual (quedará vacía)
        displayRanking();
        
        console.log("Ranking reseteado con éxito.");
    }
}

function togglePause() {
    if (document.getElementById('start-screen').style.display === 'flex' || document.getElementById('game-over-overlay').style.display === 'flex') return;
    gamePaused = !gamePaused;
    document.getElementById('pause-overlay').style.display = gamePaused ? 'flex' : 'none';
}

function resetGame() {
    arena.forEach(row => row.fill(0));
    player.score = 0; player.level = 1; player.lines = 0;
    player.next = null;
    playerReset();
    updateStats();
    gamePaused = false;
    document.getElementById('game-over-overlay').style.display = 'none';
    document.getElementById('pause-overlay').style.display = 'none';
    document.getElementById('start-screen').style.display = 'none';
}

document.addEventListener('keydown', event => {
    if (gamePaused && event.keyCode !== 80 && event.keyCode !== 27) return;
    if (event.keyCode === 37) { player.pos.x--; if (collide(arena, player)) player.pos.x++; }
    if (event.keyCode === 39) { player.pos.x++; if (collide(arena, player)) player.pos.x--; }
    if (event.keyCode === 40) { playerDrop(); }
    if (event.keyCode === 38 || event.keyCode === 87) {
        const pos = player.pos.x;
        let offset = 1; rotate(player.matrix, 1);
        while (collide(arena, player)) {
            player.pos.x += offset;
            offset = -(offset + (offset > 0 ? 1 : -1));
            if (offset > player.matrix[0].length) { rotate(player.matrix, -1); player.pos.x = pos; return; }
        }
    }
    if (event.keyCode === 32) { while (!collide(arena, player)) { player.pos.y++; } player.pos.y--; playerDrop(); }
    if (event.keyCode === 80 || event.keyCode === 27) { togglePause(); }
});

document.getElementById('btn-play').addEventListener('click', () => {
    const input = document.getElementById('player-name-input');
    const errorMsg = document.getElementById('error-msg');
    const name = input.value.trim();

    if (name === "") {
        errorMsg.style.display = 'block';
        input.style.borderColor = '#e74c3c';
    } else {
        errorMsg.style.display = 'none';
        playerName = name;
        localStorage.setItem('lastPlayer', playerName);
        resetGame();
    }
});

document.getElementById('btn-pause').addEventListener('click', togglePause);
document.getElementById('btn-resume').addEventListener('click', togglePause);
document.getElementById('btn-hard-restart').addEventListener('click', resetGame);
document.getElementById('btn-restart').addEventListener('click', resetGame);

document.getElementById('btn-change-name').addEventListener('click', () => {
    // 1. Forzamos la pausa del juego
    gamePaused = true;

    // 2. Ocultamos TODOS los overlays que puedan estar activos
    document.getElementById('game-over-overlay').style.display = 'none';
    document.getElementById('pause-overlay').style.display = 'none';

    // 3. Mostramos la pantalla de inicio
    const startScreen = document.getElementById('start-screen');
    startScreen.style.display = 'flex';

    // 4. Ponemos el foco en el input para que el usuario pueda escribir directo
    const input = document.getElementById('player-name-input');
    input.focus();
    input.select(); // Selecciona el texto actual para borrarlo fácil
});

document.getElementById('btn-multiplayer').addEventListener('click', () => {
    window.location.href = 'multiplayer.html';
});


// Quita el foco de cualquier botón después de hacer clic
document.addEventListener('click', function(e) {
    if (document.activeElement.tagName === 'BUTTON') {
        document.activeElement.blur();
    }
});

function update(time = 0) {
    if (!gamePaused) {
        const deltaTime = time - lastTime;
        lastTime = time;
        dropCounter += deltaTime;
        let speed = 1000 - (player.level * 100);
        if (dropCounter > Math.max(speed, 80)) playerDrop();
        draw();
    }
    requestAnimationFrame(update);
}

displayRanking();
if (playerName) document.getElementById('player-name-input').value = playerName;
updateStats();
update();