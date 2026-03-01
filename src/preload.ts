// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron';

const CHAMP_SELECT_UPDATE_CHANNEL = 'champ-select:update';

export interface ChampSelectPlayer {
    championId: number;
}

export interface ChampSelectSession {
    myTeam?: ChampSelectPlayer[];
    theirTeam?: ChampSelectPlayer[];
    [key: string]: unknown;
}

contextBridge.exposeInMainWorld('loldraft', {
    onChampSelectUpdate: (callback: (session: ChampSelectSession) => void) => {
        const listener = (_event: Electron.IpcRendererEvent, data: ChampSelectSession) => {
            callback(data);
        };

        ipcRenderer.on(CHAMP_SELECT_UPDATE_CHANNEL, listener);

        return () => {
            ipcRenderer.removeListener(CHAMP_SELECT_UPDATE_CHANNEL, listener);
        };
    },
});
