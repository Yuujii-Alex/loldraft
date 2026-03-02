// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron';
import type { ChampSelectUpdatePayload, LcuStatus } from './types/champ-select-types';
import type { GameplanPayload, SuggestionsPayload } from './types/build-types';

const CHAMP_SELECT_UPDATE_CHANNEL = 'champ-select:update';
const LCU_STATUS_CHANNEL = 'lcu:status';

contextBridge.exposeInMainWorld('loldraft', {
    onChampSelectUpdate: (callback: (payload: ChampSelectUpdatePayload) => void) => {
        const listener = (_event: unknown, payload: ChampSelectUpdatePayload) =>
            callback(payload);

        ipcRenderer.on(CHAMP_SELECT_UPDATE_CHANNEL, listener);
        return () => ipcRenderer.removeListener(CHAMP_SELECT_UPDATE_CHANNEL, listener);
    },

    onLcuStatus: (callback: (status: LcuStatus) => void) => {
        ipcRenderer.on(LCU_STATUS_CHANNEL, (_event, status: LcuStatus) => callback(status));
        return () => ipcRenderer.removeAllListeners(LCU_STATUS_CHANNEL);
    },

    generateGameplan: (myChampion: string, opponentChampion: string | null, position: string): Promise<GameplanPayload | string> => {
        return ipcRenderer.invoke('mcp:generateGameplan', { myChampion, opponentChampion, position });
    },

    getDraftSuggestions: (position: string, myTeamNames: string[], enemyTeamNames: string[]): Promise<SuggestionsPayload | string> => {
        return ipcRenderer.invoke('mcp:getDraftSuggestions', { position, myTeamNames, enemyTeamNames });
    }
});
