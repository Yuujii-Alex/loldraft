// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron';
import type { ChampSelectUpdatePayload, LcuStatus } from './types/champ-select-types';

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
        const listener = (_event: unknown, status: LcuStatus) => callback(status);
        ipcRenderer.on(LCU_STATUS_CHANNEL, listener);
        return () => ipcRenderer.removeListener(LCU_STATUS_CHANNEL, listener);
    },
});
