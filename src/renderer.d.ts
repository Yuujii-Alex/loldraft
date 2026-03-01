export interface ChampSelectUpdatePayload {
    myRole: string | null;
    myTeamIds: number[];
    enemyTeamIds: number[];
    myTeamNames: string[];
    enemyTeamNames: string[];
    currentChampionId: number;
    currentChampionName: string;
}

interface Window {
    loldraft: {
        onChampSelectUpdate: (
            callback: (payload: ChampSelectUpdatePayload) => void,
        ) => () => void;
    };
}

declare global {
    interface Window {
        loldraft: {
            onChampSelectUpdate: (
                callback: (payload: ChampSelectUpdatePayload) => void,
            ) => () => void;
        };
    }
}

export { };
