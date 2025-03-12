const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Mapeamento de salas para gerenciar conexões
const rooms = {};

io.on('connection', (socket) => {
  console.log('Novo cliente conectado:', socket.id);

  // Cliente cria uma nova sala (PC transmissor)
  socket.on('create-room', (roomId) => {
    rooms[roomId] = {
      host: socket.id,
      clients: []
    };
    socket.join(roomId);
    console.log(`Sala criada: ${roomId} pelo host: ${socket.id}`);
    socket.emit('room-created', roomId);
  });

  // Cliente entra em uma sala existente (celular receptor)
  socket.on('join-room', (roomId) => {
    if (rooms[roomId]) {
      socket.join(roomId);
      rooms[roomId].clients.push(socket.id);
      console.log(`Cliente ${socket.id} entrou na sala ${roomId}`);
      socket.emit('room-joined', roomId);
      
      // Notifica o host que um novo cliente se conectou
      io.to(rooms[roomId].host).emit('client-connected', socket.id);
    } else {
      socket.emit('error', 'Sala não encontrada');
    }
  });

  // Encaminhamento de sinais WebRTC
  socket.on('signal', (data) => {
    console.log('Sinal recebido de:', socket.id, 'para:', data.to);
    io.to(data.to).emit('signal', {
      from: socket.id,
      signal: data.signal
    });
  });

  // Desconexão
  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
    
    // Limpar salas se o host desconectar
    for (const roomId in rooms) {
      if (rooms[roomId].host === socket.id) {
        io.to(roomId).emit('host-disconnected');
        delete rooms[roomId];
        console.log(`Sala ${roomId} fechada porque o host desconectou`);
      } else {
        // Remover cliente da lista se ele desconectar
        const index = rooms[roomId].clients.indexOf(socket.id);
        if (index !== -1) {
          rooms[roomId].clients.splice(index, 1);
          io.to(rooms[roomId].host).emit('client-disconnected', socket.id);
        }
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});