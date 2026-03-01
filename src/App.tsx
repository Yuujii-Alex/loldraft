import { useEffect, useState } from 'react';
import type { ChampSelectUpdatePayload } from './renderer.d';
import ChampionPicksRow from './components/ChampionPicksRow';
import LCUStatus from './components/LCUStatus';

export default function App() {
    const [update, setUpdate] = useState<ChampSelectUpdatePayload | null>(null);
    const [status, setStatus] = useState('disconnected');
    const [lastUpdateAt, setLastUpdateAt] = useState<number | null>(null);

    useEffect(() => {
        if (!window.loldraft?.onChampSelectUpdate) {
            setStatus('IPC bridge not available (check preload).');
            return;
        }

        const unsubscribeUpdate = window.loldraft.onChampSelectUpdate((payload) => {
            setUpdate(payload);
            setLastUpdateAt(Date.now());
        });

        const unsubscribeStatus = window.loldraft?.onLcuStatus
            ? window.loldraft.onLcuStatus((nextStatus) => setStatus(nextStatus))
            : () => { };

        return () => {
            unsubscribeUpdate();
            unsubscribeStatus();
        };
    }, []);

    // Fallback only if onLcuStatus is unavailable
    useEffect(() => {
        if (window.loldraft?.onLcuStatus) return;

        const STALE_AFTER_MS = 5000;
        const timer = window.setInterval(() => {
            if (!lastUpdateAt) {
                setStatus('disconnected');
                return;
            }

            const isStale = Date.now() - lastUpdateAt > STALE_AFTER_MS;
            setStatus(isStale ? 'disconnected' : 'good');
        }, 1000);

        return () => window.clearInterval(timer);
    }, [lastUpdateAt]);

    const myTeamNames = update?.myTeamNames ?? [];
    const enemyTeamNames = update?.enemyTeamNames ?? [];
    const myTeamIds = update?.myTeamIds ?? [];
    const enemyTeamIds = update?.enemyTeamIds ?? [];

    return (
        <main className="min-h-screen min-w-screen bg-[#181818] text-slate-100 p-4">
            <div className='flex flex-row gap-4'>
                <h1 className="text-2xl font-bold mb-4">LoLDraft</h1>
            </div>

            <div className='flex flex-row gap-10 justify-center'>
                <ChampionPicksRow
                    label="My Team Picks"
                    championIds={myTeamIds}
                    championNames={myTeamNames}
                />

                <span>vs</span>

                <ChampionPicksRow
                    label="Enemy Team Picks"
                    championIds={enemyTeamIds}
                    championNames={enemyTeamNames}
                />
            </div>

            <LCUStatus status={status} />
            <p className="text-sm text-slate-300">Role: {update?.myRole ?? 'unknown'}</p>
            <p className="text-sm text-slate-300 mb-4">
                Current Selection: {update?.currentChampionName ?? 'No Pick'} ({update?.currentChampionId ?? 0})
            </p>
        </main>
    );
}