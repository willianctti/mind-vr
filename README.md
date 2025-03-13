# VR Mouse Streaming

Um sistema para transmissão de tela do computador para dispositivos móveis com suporte a VR, usando WebRTC para streaming em tempo real.

## Estrutura do Projeto

O projeto é dividido em três componentes principais:

- **electron-app**: Aplicativo desktop para captura e transmissão de tela
- **server**: Servidor de sinalização para estabelecer conexões WebRTC
- **next-app**: Aplicativo web para visualização do streaming em dispositivos móveis

## Requisitos

- Node.js (versão 14 ou superior)
- NPM ou Yarn

## Instalação

Clone o repositório e instale as dependências em cada componente:

# Clone o repositório
git clone https://github.com/willianctti/mind-vr
cd vr-mouse-streaming

# Instale as dependências do servidor
cd server
npm install

# Instale as dependências do aplicativo Electron
cd ../electron-app
npm install

# Instale as dependências do aplicativo Next.js
cd ../next-app
npm install

## Executando o Projeto

Você precisa iniciar os três componentes:

### 1. Servidor de Sinalização

cd server
npm start

O servidor será iniciado na porta 3001.

### 2. Aplicativo Electron (Transmissor)

cd electron-app
npm start

### 3. Aplicativo Next.js (Receptor)

cd next-app
npm run dev

O aplicativo web estará disponível em `(seuipv4local:3000`.

## Como Usar

1. No aplicativo Electron, selecione a tela ou janela que deseja transmitir
2. Clique em "Iniciar Transmissão"
3. Um QR Code será exibido
4. No dispositivo móvel, acesse `http://192.168.10.100:3000` ou escaneie o QR Code
5. Digite o ID da sala mostrado no aplicativo Electron ou use o link do QR Code
6. A transmissão começará automaticamente

## Tecnologias Utilizadas

- WebRTC: Para streaming de mídia em tempo real
- Socket.IO: Para sinalização e estabelecimento de conexões
- Electron: Para captura de tela no desktop
- Next.js: Para a interface web responsiva
- Simple-Peer: Biblioteca WebRTC simplificada

![image](https://github.com/user-attachments/assets/11904538-dc85-4375-8ccf-81754bae33b6)


## Resolução de Problemas

Se encontrar problemas de conexão:

1. Verifique se todos os componentes estão rodando
2. Certifique-se de que o dispositivo móvel e o computador estão na mesma rede
3. Verifique se as portas 3000 e 3001 estão acessíveis
4. Tente reiniciar os componentes na ordem: servidor, aplicativo Next.js e aplicativo Electron

## Licença

MIT, Willian Nicoletti
