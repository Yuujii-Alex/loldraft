import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import type { LeagueWebSocket } from 'league-connect';
import { createLcuWebSocket } from './api/lcu';
import {
  fetchChampionCatalog,
  buildChampionIdToNameMap,
  mapChampionIdToName,
} from './api/lol';
import { getChampionAnalysis, getLaneMatchupGuide, getMetaChampions } from './api/mcp';
import { generateLaneTips, generateDraftSuggestions } from './api/llm';
import { preloadDDragonData } from './api/ddragon';
import type { GameplanPayload, SuggestionsPayload } from './types/build-types';
import type { ChampSelectUpdatePayload, LcuStatus } from './types/champ-select-types';

const CHAMP_SELECT_UPDATE_CHANNEL = 'champ-select:update';
const LCU_STATUS_CHANNEL = 'lcu:status';

function publishLcuStatus(status: LcuStatus): void {
  const mainWindow = getLiveMainWindow();
  if (!mainWindow) return;
  mainWindow.webContents.send(LCU_STATUS_CHANNEL, status);
}

interface ChampSelectPlayer {
  championId: number;
  championPickIntent?: number;
  cellId?: number;
  assignedPosition?: string;
}

interface ChampSelectAction {
  actorCellId?: number;
  championId?: number;
  completed?: boolean;
  type?: string; // "pick" | "ban"
}

interface ChampSelectSession {
  localPlayerCellId?: number;
  myTeam?: ChampSelectPlayer[];
  theirTeam?: ChampSelectPlayer[];
  actions?: ChampSelectAction[][];
  hasSimultaneousBans?: boolean;
  timer?: { phase: string; isInfinite: boolean };
  bans?: {
    myTeamBans: number[];
    theirTeamBans: number[];
    numBans: number;
  }
  [key: string]: unknown;
}

function getHoverFromActions(session: ChampSelectSession, cellId?: number): number {
  if (cellId == null) return 0;
  const rounds = session.actions ?? [];
  for (const round of rounds) {
    for (const action of round) {
      if (
        action.actorCellId === cellId &&
        action.type === 'pick' &&
        action.completed === false &&
        typeof action.championId === 'number' &&
        action.championId > 0
      ) {
        return action.championId;
      }
    }
  }
  return 0;
}

function getEffectiveChampionId(player: ChampSelectPlayer, session: ChampSelectSession): number {
  if (player.championId > 0) return player.championId; // locked
  const championPickIntent = player.championPickIntent ?? 0;
  if (championPickIntent > 0) return championPickIntent; // hover intent
  return getHoverFromActions(session, player.cellId); // fallback
}

let leagueSocket: LeagueWebSocket | null = null;
let championMapPromise: Promise<Map<number, string>> | null = null;
let latestSession: ChampSelectSession | null = null;
let currentChampionId = 0;
let mainWindowRef: BrowserWindow | null = null;

function getChampionMap(): Promise<Map<number, string>> {
  if (!championMapPromise) {
    championMapPromise = fetchChampionCatalog().then(buildChampionIdToNameMap);
  }
  return championMapPromise;
}

function detectMyRole(session: ChampSelectSession): string | null {
  const me = (session.myTeam ?? []).find(
    (p) => p.cellId === session.localPlayerCellId,
  );
  return me?.assignedPosition ?? null;
}

function getLiveMainWindow(): BrowserWindow | null {
  if (!mainWindowRef) return null;
  if (mainWindowRef.isDestroyed()) return null;
  return mainWindowRef;
}

async function publishChampSelectUpdate(): Promise<void> {
  const mainWindow = getLiveMainWindow();
  if (!mainWindow || !latestSession) return;

  const session = latestSession;

  const idToName = await getChampionMap();

  const myTeamIds = (session.myTeam ?? []).map((p) =>
    getEffectiveChampionId(p, session),
  );
  const enemyTeamIds = (session.theirTeam ?? []).map((p) =>
    getEffectiveChampionId(p, session),
  );

  const myTeamNames = myTeamIds.map((id) =>
    id === 0 ? 'No Pick' : mapChampionIdToName(id, idToName),
  );
  const enemyTeamNames = enemyTeamIds.map((id) =>
    id === 0 ? 'No Pick' : mapChampionIdToName(id, idToName),
  );

  const me = (session.myTeam ?? []).find(
    (player) => player.cellId === session.localPlayerCellId,
  );
  const liveCurrentChampionId = me
    ? getEffectiveChampionId(me, session)
    : currentChampionId;

  const myTeamBans = session.bans?.myTeamBans ?? [];
  const theirTeamBans = session.bans?.theirTeamBans ?? [];

  const hasBans = session.hasSimultaneousBans === true ||
    (session.actions?.flat().some(a => a.type === 'ban') ?? false);

  let phase = (session.timer?.phase as string) ?? '';
  if (phase === 'BAN_PICK') {
    const hasIncompleteBans = session.actions?.flat().some(a => a.type === 'ban' && !a.completed);
    phase = hasIncompleteBans ? 'BANNING' : 'PICKING';
  }

  const payload: ChampSelectUpdatePayload = {
    myRole: detectMyRole(session),
    myTeamIds,
    enemyTeamIds,
    myTeamNames,
    enemyTeamNames,
    currentChampionId: liveCurrentChampionId,
    currentChampionName:
      liveCurrentChampionId === 0
        ? 'No Pick'
        : mapChampionIdToName(liveCurrentChampionId, idToName),
    hasBans,
    myTeamBans,
    theirTeamBans,
    phase: phase as ChampSelectUpdatePayload['phase'],
  };

  mainWindow.webContents.send(CHAMP_SELECT_UPDATE_CHANNEL, payload);
}

async function startLeagueConnection(): Promise<void> {
  if (leagueSocket) return;

  try {
    leagueSocket = await createLcuWebSocket();

    publishLcuStatus('good');

    leagueSocket.subscribe<ChampSelectSession>('/lol-champ-select/v1/session', (data) => {
      if (!data) return;
      latestSession = data;
      void publishChampSelectUpdate().catch((err) =>
        console.error('publishChampSelectUpdate(session) failed', err),
      );
    });

    leagueSocket.subscribe<number>('/lol-champ-select/v1/current-champion', (data) => {
      currentChampionId = typeof data === 'number' ? data : 0;
      void publishChampSelectUpdate().catch((err) =>
        console.error('publishChampSelectUpdate(current-champion) failed', err),
      );
    });
  } catch (error) {
    publishLcuStatus('disconnected');
    leagueSocket = null;
    console.error('League client not found', error);

    setTimeout(() => {
      void startLeagueConnection();
    }, 1500);
  }
}

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

// LCU provides: TOP, JUNGLE, MIDDLE, BOTTOM, UTILITY, or "" (empty string in practice tool/blind)
// OP.GG expects: top, jungle, mid, adc, support
function mapPosition(raw: string): string {
  let pos = (raw || 'mid').toLowerCase();
  if (pos === 'middle' || pos === 'unknown' || pos === 'unselected') pos = 'mid';
  if (pos === 'bottom') pos = 'adc';
  if (pos === 'utility') pos = 'support';
  return pos;
}

ipcMain.handle('mcp:generateGameplan', async (_event, args: { myChampion: string; opponentChampion: string | null; position: string }): Promise<GameplanPayload | string> => {
  try {
    const pos = mapPosition(args.position);
    console.log('Fetching MCP build data for', args.myChampion, 'at', pos);
    const build = await getChampionAnalysis(args.myChampion, pos);

    // Fetch matchup guide + generate tips in parallel
    let matchupText: unknown = null;
    if (args.opponentChampion) {
      try {
        matchupText = await getLaneMatchupGuide(args.myChampion, args.opponentChampion, pos);
      } catch (e) {
        console.warn('Could not fetch matchup guide, continuing without it.');
      }
    }

    console.log('Generating lane tips...');
    const tips = await generateLaneTips(args.myChampion, pos, args.opponentChampion, matchupText);
    build.tips = tips;

    return { championName: args.myChampion, position: pos, build };
  } catch (error: unknown) {
    console.error('Failed to generate gameplan:', error);
    return `Failed to generate gameplan: ${(error as Error).message}`;
  }
});

ipcMain.handle('mcp:getDraftSuggestions', async (_event, args: { position: string; myTeamNames: string[]; enemyTeamNames: string[] }): Promise<SuggestionsPayload | string> => {
  try {
    const pos = mapPosition(args.position);
    console.log('Fetching meta champions for', pos);
    const metaChampions = await getMetaChampions(pos);

    console.log('Generating draft suggestions...');
    const suggestions = await generateDraftSuggestions(pos, args.myTeamNames, args.enemyTeamNames, metaChampions);
    return { suggestions };
  } catch (error: unknown) {
    console.error('Failed to generate draft suggestions:', error);
    return `Failed to generate suggestions: ${(error as Error).message}`;
  }
});

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindowRef = mainWindow;
  mainWindow.on('closed', () => {
    mainWindowRef = null;
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  mainWindow.webContents.openDevTools();

  startLeagueConnection().catch((error: unknown) => {
    console.error('Failed to initialize League connection', error);
  });

  preloadDDragonData().then(ver => {
    console.log(`DDragon data loaded (version ${ver})`);
  }).catch(err => {
    console.warn('Failed to preload DDragon data:', err);
  });
};

app.on('ready', createWindow);

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
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
