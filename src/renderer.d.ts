import type { ChampSelectUpdatePayload, LcuStatus } from './types/champ-select-types';

declare global {
    interface Window {
        loldraft: {
            onChampSelectUpdate: (
                callback: (payload: ChampSelectUpdatePayload) => void,
            ) => () => void;

            // Add this:
            onLcuStatus?: (
                callback: (status: LcuStatus) => void
            ) => () => void;
        };
    }
}

export { };
export type { ChampSelectUpdatePayload, LcuStatus };
