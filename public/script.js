const socket = io();
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 600;
canvas.height = 400;

let players = {};
const playerImages = {
    1: new Image(),
    2: new Image()
};
playerImages[1].src = 'assets/player1.gif';
playerImages[2].src = 'assets/player2.gif';

socket.on('updatePlayers', (data) => {
    players = data;
    draw();
});

socket.on('gameOver', (winnerId) => {
    alert(`Player ${winnerId} wins!`);
    location.reload();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') socket.emit('move', 'left');
    if (e.key === 'ArrowRight') socket.emit('move', 'right');
    if (e.key === 'ArrowUp') socket.emit('jump');
    if (e.key === ' ') {
        let opponentId = Object.keys(players).find(id => id !== socket.id);
        if (opponentId) socket.emit('attack', opponentId);
    }
    if (e.key === 'Shift') socket.emit('block', true);
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') socket.emit('move', 'stop');
    if (e.key === 'Shift') socket.emit('block', false);
});

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let id in players) {
        let player = players[id];
        let img = playerImages[player.playerNumber];

        ctx.drawImage(img, player.x, player.y, 50, 50);
        ctx.fillStyle = 'black';
        ctx.fillText(`❤️ ${player.health}`, player.x + 10, player.y - 10);
        if (player.attacking) {
            ctx.fillStyle = 'red';
            ctx.fillRect(player.x + (player.playerNumber === 1 ? 50 : -10), player.y + 20, 20, 20);
        }
        if (player.blocking) {
            ctx.fillStyle = 'blue';
            ctx.fillRect(player.x, player.y - 10, 50, 10);
        }
    }
    requestAnimationFrame(draw);
}

draw();