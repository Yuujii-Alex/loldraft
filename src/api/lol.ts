import type { ChampionRecord } from "../types/lol-types";

type ChampionCatalog = Record<string, ChampionRecord>;

const VERSIONS_URL = "https://ddragon.leagueoflegends.com/api/versions.json";

export async function fetchLatestVersion(fetchFn: typeof fetch = fetch): Promise<string> {
    const response = await fetchFn(VERSIONS_URL);
    if (!response.ok) {
        throw new Error(`Failed to fetch versions: ${response.status} ${response.statusText}`);
    }

    const versions = (await response.json()) as string[];
    if (!Array.isArray(versions) || versions.length === 0) {
        throw new Error("Versions response is empty or invalid.");
    }

    return versions[0];
}

export async function fetchChampionCatalog(
    locale = "en_US",
    fetchFn: typeof fetch = fetch
): Promise<ChampionCatalog> {
    const version = await fetchLatestVersion(fetchFn);
    const url = `https://ddragon.leagueoflegends.com/cdn/${version}/data/${locale}/champion.json`;

    const response = await fetchFn(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch champion catalog: ${response.status} ${response.statusText}`);
    }

    const payload = (await response.json()) as { data: ChampionCatalog };
    if (!payload?.data) {
        throw new Error("Champion catalog response is invalid.");
    }

    return payload.data;
}

export function buildChampionIdToNameMap(catalog: ChampionCatalog): Map<number, string> {
    const idToName = new Map<number, string>();

    for (const champion of Object.values(catalog)) {
        const numericId = Number(champion.key);
        if (!Number.isNaN(numericId)) {
            idToName.set(numericId, champion.name);
        }
    }

    return idToName;
}

export function mapChampionIdToName(
    championId: number,
    idToName: Map<number, string>
): string {
    return idToName.get(championId) ?? `Unknown (${championId})`;
}