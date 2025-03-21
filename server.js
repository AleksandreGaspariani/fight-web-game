const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

let players = {};
let playerCount = 0;
const ATTACK_RADIUS = 30;
const MAX_HEALTH = 20;
const GRAVITY = 1.2; // Slightly increased for faster fall (tune as needed)
const JUMP_VELOCITY = -12; // Slightly higher initial upward velocity for longer air time
const MOVE_SPEED = 3; // Horizontal speed while moving

io.on('connection', (socket) => {
    console.log('A player connected:', socket.id);
    playerCount++;
    const playerNumber = playerCount === 1 ? 1 : 2;
    players[socket.id] = { 
        x: playerNumber === 1 ? 150 : 350, 
        y: 300, // Starting y position (ground level)
        health: MAX_HEALTH, 
        blocking: false, 
        attacking: false,
        playerNumber: playerNumber,
        jumping: false,
        velocityX: 0, // Horizontal velocity
        velocityY: 0  // Vertical velocity for jumping
    };
    
    io.emit('updatePlayers', players);

    socket.on('move', (direction) => {
        if (players[socket.id]) {
            if (direction === 'left') {
                players[socket.id].velocityX = -MOVE_SPEED;
                players[socket.id].x -= MOVE_SPEED; // Immediate move
            } else if (direction === 'right') {
                players[socket.id].velocityX = MOVE_SPEED;
                players[socket.id].x += MOVE_SPEED; // Immediate move
            } else if (direction === 'stop') {
                players[socket.id].velocityX = 0; // Stop horizontal movement
            }
            io.emit('updatePlayers', players);
        }
    });

    socket.on('jump', () => {
        if (players[socket.id] && !players[socket.id].jumping) {
            players[socket.id].jumping = true;
            players[socket.id].velocityY = JUMP_VELOCITY;
            io.emit('updatePlayers', players);
        }
    });

    socket.on('attack', (opponentId) => {
        if (players[socket.id] && !players[socket.id].blocking) {
            if (players[opponentId]) {
                const distance = Math.abs(players[socket.id].x - players[opponentId].x);
                if (distance <= ATTACK_RADIUS && !players[opponentId].blocking) {
                    players[opponentId].health -= 1;
                    if (players[opponentId].health <= 0) {
                        io.emit('gameOver', socket.id);
                    }
                }
            }
            players[socket.id].attacking = true;
            io.emit('updatePlayers', players);
            setTimeout(() => {
                if (players[socket.id]) {
                    players[socket.id].attacking = false;
                    io.emit('updatePlayers', players);
                }
            }, 500);
        }
    });

    socket.on('block', (isBlocking) => {
        if (players[socket.id] && !players[socket.id].attacking) {
            players[socket.id].blocking = isBlocking;
            io.emit('updatePlayers', players);
        }
    });

    socket.on('disconnect', () => {
        console.log('Player disconnected:', socket.id);
        delete players[socket.id];
        if (Object.keys(players).length === 0) {
            playerCount = 0;
        }
        io.emit('updatePlayers', players);
    });

    // Game loop to handle physics
    setInterval(() => {
        for (let id in players) {
            let player = players[id];
            // Apply horizontal velocity
            player.x += player.velocityX;
            // Apply jumping physics
            if (player.jumping) {
                player.y += player.velocityY;
                player.velocityY += GRAVITY;
                if (player.y >= 300) { // Ground level
                    player.y = 300;
                    player.jumping = false;
                    player.velocityY = 0;
                    player.velocityX = 0; // Stop horizontal momentum on landing (optional)
                }
            }
            // Keep players within canvas bounds
            if (player.x < 0) player.x = 0;
            if (player.x > 550) player.x = 550; // 600 - 50 (player width)
            io.emit('updatePlayers', players);
        }
    }, 1000 / 60); // 60 FPS
});

server.listen(3000, () => console.log('Server running on port 3000'));