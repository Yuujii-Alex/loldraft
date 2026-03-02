import { useEffect, useMemo, useState } from 'react';

import { getChampionIconUrl, preloadChampionIcon, readyIconIds } from '../api/champion-icons';

interface TeamPicksProps {
    label: string;
    championIds: number[];
    championNames: string[];
}

export default function ChampionPicksRow({
    label,
    championIds,
    championNames,
}: TeamPicksProps) {
    const slotCount = Math.max(5, championIds.length, championNames.length);
    const slotChampionIds = Array.from(
        { length: slotCount },
        (_, index) => championIds[index] ?? 0
    );
    const slotChampionNames = Array.from(
        { length: slotCount },
        (_, index) => championNames[index] ?? 'No Pick'
    );

    const [loadedIds, setLoadedIds] = useState<Set<number>>(() => new Set(readyIconIds));

    const uniqueChampionIds = useMemo(
        () => Array.from(new Set(slotChampionIds.filter((championId) => championId > 0))),
        [slotChampionIds]
    );

    useEffect(() => {
        let isCancelled = false;

        if (uniqueChampionIds.length === 0) {
            return;
        }

        void Promise.all(uniqueChampionIds.map(preloadChampionIcon)).then(() => {
            if (isCancelled) return;
            setLoadedIds(new Set(readyIconIds));
        });

        return () => {
            isCancelled = true;
        };
    }, [uniqueChampionIds]);

    return (
        <section className='flex flex-row justify-center gap-1'>
            {slotChampionIds.map((championId, index) => {
                const championName = slotChampionNames[index];
                const isIconLoaded = loadedIds.has(championId);

                return (
                    <div
                        key={`${label}-${index}`}
                        title={championName}
                        className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 overflow-hidden"
                    >
                        {championId > 0 && isIconLoaded ? (
                            <img
                                src={getChampionIconUrl(championId)}
                                alt={championName}
                                className="w-full h-full object-cover"
                            />
                        ) : null}
                    </div>
                );
            })}
        </section>
    );
}