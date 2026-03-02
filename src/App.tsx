import { useEffect, useState } from 'react';
import type { ChampSelectUpdatePayload } from './renderer.d';
import ChampionPicksRow from './components/ChampionPicksRow';
import LCUStatus from './components/LCUStatus';
import BanPicksRow from './components/BanPicksRow';
import PhaseIndicator from './components/PhaseIndicator';
import DraftAdvice from './components/DraftAdvice';

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
            // eslint-disable-next-line @typescript-eslint/no-empty-function
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
            <div className='flex flex-row justify-between items-center mb-4'>
                <h1 className="text-2xl font-bold">LoLDraft</h1>
                {update && (
                    <PhaseIndicator phase={update.phase} hasBans={update.hasBans} />
                )}
                <div /* Placeholder for alignment */ className="w-24"></div>
            </div>

            {update?.hasBans && (
                <div className="mb-6 mt-[-1rem]">
                    <BanPicksRow
                        myTeamBans={update.myTeamBans}
                        theirTeamBans={update.theirTeamBans}
                    />
                </div>
            )}

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

            <div className="mt-8 flex justify-center w-full">
                <DraftAdvice payload={update} />
            </div>

            <LCUStatus status={status} />
            <p className="text-sm text-slate-300">Role: {update?.myRole ?? 'unknown'}</p>
            <p className="text-sm text-slate-300 mb-4">
                Current Selection: {update?.currentChampionName ?? 'No Pick'} ({update?.currentChampionId ?? 0})
            </p>
        </main>
    );
}