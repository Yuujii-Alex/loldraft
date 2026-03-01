import { useEffect, useMemo, useState } from 'react';

interface TeamPicksProps {
    label: string;
    championIds: number[];
    championNames: string[];
}

const iconUrlCache = new Map<number, string>();
const iconPreloadCache = new Map<number, Promise<void>>();
const readyIconIds = new Set<number>();

function getChampionIconUrl(championId: number): string {
    const cachedUrl = iconUrlCache.get(championId);
    if (cachedUrl) {
        return cachedUrl;
    }

    const url = `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/${championId}.png`;
    iconUrlCache.set(championId, url);
    return url;
}

function preloadChampionIcon(championId: number): Promise<void> {
    if (championId <= 0 || readyIconIds.has(championId)) {
        return Promise.resolve();
    }

    const cachedPreload = iconPreloadCache.get(championId);
    if (cachedPreload) {
        return cachedPreload;
    }

    const preloadPromise = new Promise<void>((resolve) => {
        const image = new Image();
        image.decoding = 'async';
        image.onload = () => {
            readyIconIds.add(championId);
            resolve();
        };
        image.onerror = () => {
            resolve();
        };
        image.src = getChampionIconUrl(championId);
    });

    iconPreloadCache.set(championId, preloadPromise);
    return preloadPromise;
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