const { app, BrowserWindow, ipcMain, desktopCapturer } = require('electron');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile('index.html');
  
  // abrir devtools em desenvolvimento
  mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// Listar fontes de captura de tela disponíveis
ipcMain.handle('get-sources', async () => {
  const sources = await desktopCapturer.getSources({ 
    types: ['window', 'screen'],
    thumbnailSize: { width: 150, height: 150 }
  });
  
  return sources.map(source => ({
    id: source.id,
    name: source.name,
    thumbnail: source.thumbnail.toDataURL()
  }));
});

// Gerar ID único para a sala
ipcMain.handle('generate-room-id', () => {
  return uuidv4();
});