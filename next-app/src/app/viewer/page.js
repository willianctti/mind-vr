'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import io from 'socket.io-client';
import SimplePeer from 'simple-peer';
import styles from './viewer.module.css';

export default function Viewer() {
  const searchParams = useSearchParams();
  const [connecting, setConnecting] = useState(false);
  const room = searchParams.get('room');
  const videoRef = useRef(null);
  const socketRef = useRef(null);
  const peerRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!room) return;

    // Obter o endereço do servidor a partir da URL atual
    const serverHost = window.location.hostname;
    const serverUrl = `http://${serverHost}:3001`;
    console.log(`Conectando ao servidor de sinalização em ${serverUrl}`);
    
    // Conectar ao servidor de sinalização
    socketRef.current = io(serverUrl);
    
    console.log('Room ID:', room);

    socketRef.current.on('connect', () => {
      console.log('Conectado ao servidor de sinalização com ID:', socketRef.current.id);
      socketRef.current.emit('join-room', room);
    });
    
    socketRef.current.on('room-joined', (roomId) => {
      console.log('Entrou na sala:', roomId);
    });
    
    socketRef.current.on('signal', (data) => {
      console.log('Sinal recebido do host');
      
      if (!peerRef.current) {
        // Criar conexão peer quando receber o primeiro sinal
        peerRef.current = new SimplePeer({
          initiator: false,
          trickle: true,
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
        peerRef.current.on('signal', (signal) => {
          socketRef.current.emit('signal', {
            to: data.from,
            signal: signal
          });
        });
        
        peerRef.current.on('connect', () => {
          console.log('Conexão P2P estabelecida');
          setConnected(true);
        });
        
        peerRef.current.on('stream', (stream) => {
          console.log('Stream recebido!', stream);
          if (videoRef.current) {
            console.log('Atribuindo stream ao elemento de vídeo');
            videoRef.current.srcObject = stream;
            
            // Adicione um evento para verificar se o vídeo está realmente reproduzindo
            videoRef.current.onloadedmetadata = () => {
              console.log('Metadados do vídeo carregados, dimensões:', 
                         videoRef.current.videoWidth, 'x', videoRef.current.videoHeight);
              videoRef.current.play().catch(e => console.error('Erro ao reproduzir vídeo:', e));
            };
          } else {
            console.error('Elemento de vídeo não encontrado!');
          }
        });
        
        peerRef.current.on('error', (err) => {
          console.error('Erro na conexão P2P:', err);
          setError('Erro na conexão: ' + err.message);
        });
      }
      
      // Processar o sinal recebido
      peerRef.current.signal(data.signal);
    });
    
    socketRef.current.on('host-disconnected', () => {
      setError('O host desconectou');
      setConnected(false);
      if (peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = null;
      }
    });
    
    socketRef.current.on('error', (msg) => {
      setError(msg);
    });
    
    // Limpar ao desmontar
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (peerRef.current) {
        peerRef.current.destroy();
      }
    };
  }, [room]);

  // Função para entrar em modo de tela cheia
  const enterFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      } else if (videoRef.current.webkitRequestFullscreen) {
        videoRef.current.webkitRequestFullscreen();
      } else if (videoRef.current.msRequestFullscreen) {
        videoRef.current.msRequestFullscreen();
      }
    }
  };

  const tryConnect = () => {
    setConnecting(true);
    console.log("Tentando conectar manualmente...");
    
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    
    const serverHost = window.location.hostname;
    const serverUrl = `http://${serverHost}:3001`;
    console.log(`Reconectando ao servidor em ${serverUrl}`);
    
    socketRef.current = io(serverUrl);
    
    socketRef.current.on('connect', () => {
      console.log('Conectado ao servidor de sinalização');
      socketRef.current.emit('join-room', room);
    });
    
  };

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        {error && <div className={styles.error}>{error}</div>}
        
        <div className={styles.videoContainer}>
        <video 
  ref={videoRef} 
  autoPlay 
  playsInline
  muted 
  className={styles.video}
/>
          
          {connected && (
            <div className={styles.controls}>
              <button onClick={enterFullscreen} className={styles.fullscreenButton}>
                Tela Cheia
              </button>
            </div>
          )}
          
          {!connected && !error && (
            <div className={styles.loading}>
            <p>Conectando à sala {room}...</p>
            <button 
              onClick={tryConnect} 
              disabled={connecting}
              className={styles.connectButton}
            >
              {connecting ? 'Conectando...' : 'Tentar Conectar Manualmente'}
            </button>
          </div>
          )}
        </div>
      </main>
    </div>
  );
}