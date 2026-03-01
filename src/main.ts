import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { createWebSocketConnection } from 'league-connect';
import type { LeagueWebSocket } from 'league-connect';

const CHAMP_SELECT_UPDATE_CHANNEL = 'champ-select:update';

interface ChampSelectPlayer {
  championId: number;
}

interface ChampSelectSession {
  myTeam?: ChampSelectPlayer[];
  theirTeam?: ChampSelectPlayer[];
  [key: string]: unknown;
}

let leagueSocket: LeagueWebSocket | null = null;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  // Open the DevTools.
  mainWindow.webContents.openDevTools();

  startLeagueConnection(mainWindow).catch((error: unknown) => {
    console.error('Failed to initialize League connection', error);
  });
};

async function startLeagueConnection(mainWindow: BrowserWindow): Promise<void> {
  if (leagueSocket) {
    return;
  }

  try {
    leagueSocket = await createWebSocketConnection({
      authenticationOptions: { awaitConnection: true },
      maxRetries: -1,
    });

    leagueSocket.subscribe<ChampSelectSession>(
      '/lol-champ-select/v1/session',
      (data) => {
        if (!data) {
          return;
        }

        const myTeam = (data.myTeam ?? []).map((player) => player.championId);
        const enemyTeam = (data.theirTeam ?? []).map(
          (player) => player.championId,
        );

        console.log('Champ Select updated!');
        console.log('My Team Champ IDs:', myTeam);
        console.log('Enemy Team Champ IDs:', enemyTeam);

        if (!mainWindow.isDestroyed()) {
          mainWindow.webContents.send(CHAMP_SELECT_UPDATE_CHANNEL, data);
        }
      },
    );
  } catch (error) {
    console.error('League client not found', error);
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (leagueSocket) {
      leagueSocket.close();
      leagueSocket = null;
    }
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
