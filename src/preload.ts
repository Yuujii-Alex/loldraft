// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron';

const CHAMP_SELECT_UPDATE_CHANNEL = 'champ-select:update';
const LCU_STATUS_CHANNEL = 'lcu:status';

export interface ChampSelectUpdatePayload {
    myRole: string | null;
    myTeamIds: number[];
    enemyTeamIds: number[];
    myTeamNames: string[];
    enemyTeamNames: string[];
    currentChampionId: number;
    currentChampionName: string;
}

contextBridge.exposeInMainWorld('loldraft', {
    onChampSelectUpdate: (callback: (payload: ChampSelectUpdatePayload) => void) => {
        const listener = (_event: unknown, payload: ChampSelectUpdatePayload) =>
            callback(payload);

        ipcRenderer.on(CHAMP_SELECT_UPDATE_CHANNEL, listener);
        return () => ipcRenderer.removeListener(CHAMP_SELECT_UPDATE_CHANNEL, listener);
    },

    onLcuStatus: (callback: (status: 'good' | 'disconnected') => void) => {
        const listener = (_event: unknown, status: 'good' | 'disconnected') => callback(status);
        ipcRenderer.on(LCU_STATUS_CHANNEL, listener);
        return () => ipcRenderer.removeListener(LCU_STATUS_CHANNEL, listener);
    },
});
