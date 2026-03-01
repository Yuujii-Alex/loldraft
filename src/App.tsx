import { useEffect, useState } from 'react';

interface ChampSelectPlayer {
    championId: number;
}

interface ChampSelectSession {
    myTeam?: ChampSelectPlayer[];
    theirTeam?: ChampSelectPlayer[];
    [key: string]: unknown;
}

interface LoldraftApi {
    onChampSelectUpdate: (callback: (session: ChampSelectSession) => void) => () => void;
}

export default function App() {
    const [session, setSession] = useState<ChampSelectSession | null>(null);

    useEffect(() => {
        const loldraftApi = (window as typeof window & { loldraft: LoldraftApi }).loldraft;

        const unsubscribe = loldraftApi.onChampSelectUpdate((nextSession: ChampSelectSession) => {
            setSession(nextSession);
        });

        return () => {
            unsubscribe();
        };
    }, []);

    const myTeam = (session?.myTeam ?? []).map((player) => player.championId);
    const enemyTeam = (session?.theirTeam ?? []).map((player) => player.championId);

    return (
        <main>
            <h1>LoLDraft</h1>
            <p>Waiting for champ select updates from League Client...</p>

            <h2>My Team Champion IDs</h2>
            <pre>{JSON.stringify(myTeam, null, 2)}</pre>

            <h2>Enemy Team Champion IDs</h2>
            <pre>{JSON.stringify(enemyTeam, null, 2)}</pre>
        </main>
    );
}