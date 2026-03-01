interface ChampSelectPlayer {
    championId: number;
}

interface ChampSelectSession {
    myTeam?: ChampSelectPlayer[];
    theirTeam?: ChampSelectPlayer[];
    [key: string]: unknown;
}

interface Window {
    loldraft: {
        onChampSelectUpdate: (
            callback: (session: ChampSelectSession) => void,
        ) => () => void;
    };
}
