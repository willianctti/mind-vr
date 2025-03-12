const { ipcRenderer } = require('electron');
const io = require('socket.io-client');
const QRCode = require('qrcode');
const SimplePeer = require('simple-peer');

let socket;
let peers = {};
let selectedSource = null;
let localStream = null;
let roomId = null;

// Elementos da UI
const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const sourceList = document.getElementById('source-list');
const roomInfo = document.getElementById('room-info');
const roomIdElement = document.getElementById('room-id');
const qrcodeElement = document.getElementById('qrcode');
const statusElement = document.getElementById('status');

// Carregar fontes de captura disponíveis
async function loadSources() {
  const sources = await ipcRenderer.invoke('get-sources');
  sourceList.innerHTML = '';
  
  sources.forEach(source => {
    const sourceItem = document.createElement('div');
    sourceItem.className = 'source-item';
    sourceItem.innerHTML = `
      <img src="${source.thumbnail}" alt="${source.name}">
      <p>${source.name}</p>
    `;
    
    sourceItem.onclick = () => {
      document.querySelectorAll('.source-item').forEach(item => {
        item.classList.remove('selected');
      });
      sourceItem.classList.add('selected');
      selectedSource = source;
    };
    
    sourceList.appendChild(sourceItem);
  });
}

function getLocalIP() {
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost'; 
}


// Iniciar transmissão
async function startStreaming() {
  if (!selectedSource) {
    alert('Por favor, selecione uma fonte para transmitir');
    return;
  }
  
  try {
    // Capturar a tela selecionada
    const constraints = {
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: selectedSource.id,
          minWidth: 1280,
          maxWidth: 1920,
          minHeight: 720,
          maxHeight: 1080
        }
      }
    };
    
    localStream = await navigator.mediaDevices.getUserMedia(constraints);
    console.log('Stream local obtido:', localStream);
    console.log('Tracks de vídeo:', localStream.getVideoTracks());
    
    // Opcional: Crie um elemento de vídeo local para testar
    const localVideo = document.createElement('video');
    localVideo.srcObject = localStream;
    localVideo.autoplay = true;
    localVideo.muted = true;
    localVideo.style.width = '200px';
    localVideo.style.position = 'fixed';
    localVideo.style.bottom = '10px';
    localVideo.style.right = '10px';
    document.body.appendChild(localVideo);
    
    // Conectar ao servidor de sinalização
    socket = io(`http://${getLocalIP()}:3001`);
    console.log(`Conectando ao servidor de sinalização em http://${getLocalIP()}:3001`);
    
    socket.on('connect', async () => {
      // Gerar ID único para a sala
      roomId = await ipcRenderer.invoke('generate-room-id');
      socket.emit('create-room', roomId);
    });
    
    socket.on('room-created', (id) => {
      roomId = id;
      roomIdElement.textContent = roomId;
      
      // Gerar QR Code com URL para o cliente móvel
      const localIP = getLocalIP();
      console.log("IP local detectado:", localIP); // Para debug
      const clientUrl = `http://${localIP}:3000/viewer?room=${roomId}`;
      console.log("URL para cliente:", clientUrl);
      
      // Tente usar toCanvas primeiro, se falhar, use toDataURL
      try {
        QRCode.toCanvas(qrcodeElement, clientUrl, { width: 200 }, (error) => {
          if (error) {
            console.error('Erro ao gerar QR Code com toCanvas:', error);
            // Fallback para toDataURL
            QRCode.toDataURL(clientUrl, { width: 200 }, (err, url) => {
              if (err) {
                console.error('Erro ao gerar QR Code com toDataURL:', err);
              } else {
                const img = document.createElement('img');
                img.src = url;
                img.width = 200;
                qrcodeElement.innerHTML = '';
                qrcodeElement.appendChild(img);
              }
            });
          }
        });
      } catch (e) {
        console.error('Exceção ao gerar QR Code:', e);
      }
      
      roomInfo.style.display = 'block';
      startBtn.disabled = true;
      stopBtn.disabled = false;
      statusElement.textContent = 'Aguardando conexão...';
      statusElement.className = 'status';
    });
    
    socket.on('client-connected', (clientId) => {
      console.log('Novo cliente conectado:', clientId);
      statusElement.textContent = 'Cliente conectado!';
      statusElement.className = 'status connected';
      
      // Iniciar conexão peer-to-peer com o cliente
      const peer = new SimplePeer({
        initiator: true,
        stream: localStream,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' }
          ]
        }
      });
      
      peer.on('signal', (signal) => {
        socket.emit('signal', {
          to: clientId,
          signal: signal
        });
      });
      
      peer.on('connect', () => {
        console.log('Conexão P2P estabelecida com', clientId);
      });
      
      peer.on('error', (err) => {
        console.error('Erro na conexão P2P:', err);
      });
      
      peers[clientId] = peer;
    });
    
    socket.on('signal', (data) => {
      if (peers[data.from]) {
        peers[data.from].signal(data.signal);
      }
    });
    
    socket.on('client-disconnected', (clientId) => {
      if (peers[clientId]) {
        peers[clientId].destroy();
        delete peers[clientId];
      }
      
      if (Object.keys(peers).length === 0) {
        statusElement.textContent = 'Aguardando conexão...';
        statusElement.className = 'status';
      }
    });
    
  } catch (error) {
    console.error('Erro ao iniciar streaming:', error);
    alert('Erro ao iniciar streaming: ' + error.message);
  }
}

// Parar transmissão
function stopStreaming() {
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
    localStream = null;
  }
  
  // Destruir todas as conexões peer
  Object.values(peers).forEach(peer => peer.destroy());
  peers = {};
  
  // Desconectar do servidor
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  
  roomInfo.style.display = 'none';
  startBtn.disabled = false;
  stopBtn.disabled = true;
  statusElement.textContent = 'Desconectado';
  statusElement.className = 'status disconnected';
}

// Eventos
startBtn.addEventListener('click', startStreaming);
stopBtn.addEventListener('click', stopStreaming);

// Carregar fontes ao iniciar
loadSources();