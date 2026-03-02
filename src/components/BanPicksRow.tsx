import { useEffect, useMemo, useState } from 'react';

interface BanPicksRowProps {
    myTeamBans: number[];
    theirTeamBans: number[];
}

import { getChampionIconUrl, preloadChampionIcon, readyIconIds } from '../api/champion-icons';

function BanSlot({ championId, isLoaded }: { championId: number; isLoaded: boolean }) {
    return (
        <div className="relative w-7 h-7 rounded-[0.35rem] bg-[#1a1a1a] border border-white/5 overflow-hidden shrink-0">
            {championId > 0 && isLoaded && (
                <>
                    <img
                        src={getChampionIconUrl(championId)}
                        alt={"Banned Champion"}
                        className="w-full h-full object-cover opacity-40 grayscale"
                    />
                    <div className="absolute inset-0 w-full h-full pointer-events-none">
                        <svg className="absolute w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                            <line x1="0" y1="0" x2="100" y2="100" stroke="#888" strokeWidth="4" />
                        </svg>
                    </div>
                </>
            )}
        </div>
    );
}

export default function BanPicksRow({ myTeamBans, theirTeamBans }: BanPicksRowProps) {
    // Pad arrays to 5 slots
    const myBans = Array.from({ length: 5 }, (_, i) => myTeamBans[i] ?? 0);
    const theirBans = Array.from({ length: 5 }, (_, i) => theirTeamBans[i] ?? 0);

    const allBans = useMemo(() => [...myBans, ...theirBans], [myBans, theirBans]);
    const uniqueBanIds = useMemo(() => Array.from(new Set(allBans.filter(id => id > 0))), [allBans]);
    const [loadedIds, setLoadedIds] = useState<Set<number>>(() => new Set(readyIconIds));

    useEffect(() => {
        let isCancelled = false;
        if (uniqueBanIds.length === 0) return;

        void Promise.all(uniqueBanIds.map(preloadChampionIcon)).then(() => {
            if (isCancelled) return;
            setLoadedIds(new Set(readyIconIds));
        });

        return () => { isCancelled = true; };
    }, [uniqueBanIds]);

    return (
        <div className="flex flex-row items-center justify-center gap-2">
            <div className="flex gap-1">
                {myBans.map((id, index) => (
                    <BanSlot key={`my-${index}`} championId={id} isLoaded={loadedIds.has(id)} />
                ))}
            </div>

            <span className="text-[#3c3c3c] font-bold px-[2px] leading-none text-xl">-</span>

            <div className="flex gap-1">
                {theirBans.map((id, index) => (
                    <BanSlot key={`their-${index}`} championId={id} isLoaded={loadedIds.has(id)} />
                ))}
            </div>
        </div>
    );
}
