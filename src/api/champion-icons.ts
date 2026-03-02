const iconUrlCache = new Map<number, string>();
const iconPreloadCache = new Map<number, Promise<void>>();
export const readyIconIds = new Set<number>();

export function getChampionIconUrl(championId: number): string {
    const cachedUrl = iconUrlCache.get(championId);
    if (cachedUrl) {
        return cachedUrl;
    }

    const url = `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/${championId}.png`;
    iconUrlCache.set(championId, url);
    return url;
}

export function preloadChampionIcon(championId: number): Promise<void> {
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
