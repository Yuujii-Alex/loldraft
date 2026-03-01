import { useEffect, useState } from 'react';
import type { ChampSelectUpdatePayload } from './renderer.d';

export default function App() {
    const [update, setUpdate] = useState<ChampSelectUpdatePayload | null>(null);
    const [status, setStatus] = useState('Waiting for champ select...');

    useEffect(() => {
        if (!window.loldraft?.onChampSelectUpdate) {
            setStatus('IPC bridge not available (check preload).');
            return;
        }

        const unsubscribe = window.loldraft.onChampSelectUpdate((payload) => {
            setUpdate(payload);
            setStatus('Connected');
        });

        return () => unsubscribe();
    }, []);

    const myTeamNames = update?.myTeamNames ?? [];
    const enemyTeamNames = update?.enemyTeamNames ?? [];
    const myTeamIds = update?.myTeamIds ?? [];
    const enemyTeamIds = update?.enemyTeamIds ?? [];

    return (
        <main>
            <h1>LoLDraft</h1>
            <p>Status: {status}</p>
            <p>Role: {update?.myRole ?? 'unknown'}</p>
            <p>
                Current Selection: {update?.currentChampionName ?? 'No Pick'} (
                {update?.currentChampionId ?? 0})
            </p>

            <h2>My Team (Names)</h2>
            <pre>{JSON.stringify(myTeamNames, null, 2)}</pre>

            <h2>Enemy Team (Names)</h2>
            <pre>{JSON.stringify(enemyTeamNames, null, 2)}</pre>

            <h2>My Team (IDs)</h2>
            <pre>{JSON.stringify(myTeamIds, null, 2)}</pre>

            <h2>Enemy Team (IDs)</h2>
            <pre>{JSON.stringify(enemyTeamIds, null, 2)}</pre>
        </main>
    );
}