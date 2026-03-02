import type { ChampSelectUpdatePayload, LcuStatus } from './types/champ-select-types';
import type { GameplanPayload, SuggestionsPayload } from './types/build-types';

declare global {
    interface Window {
        loldraft: {
            onChampSelectUpdate: (
                callback: (payload: ChampSelectUpdatePayload) => void,
            ) => () => void;

            onLcuStatus?: (
                callback: (status: LcuStatus) => void
            ) => () => void;

            generateGameplan: (
                myChampion: string,
                opponentChampion: string | null,
                position: string
            ) => Promise<GameplanPayload | string>;

            getDraftSuggestions: (
                position: string,
                myTeamNames: string[],
                enemyTeamNames: string[]
            ) => Promise<SuggestionsPayload | string>;
        };
    }
}

export { };
export type { ChampSelectUpdatePayload, LcuStatus };
