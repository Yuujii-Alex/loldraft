/**
 * Data Dragon asset utilities.
 * Provides icon URLs for champions, items, runes, and summoner spells.
 */

const DDRAGON_BASE = "https://ddragon.leagueoflegends.com";
const VERSIONS_URL = `${DDRAGON_BASE}/api/versions.json`;

let cachedVersion: string | null = null;

export async function getLatestVersion(): Promise<string> {
    if (cachedVersion) return cachedVersion;
    try {
        const res = await fetch(VERSIONS_URL);
        const versions = (await res.json()) as string[];
        cachedVersion = versions[0];
    } catch {
        cachedVersion = "16.4.1"; // fallback
    }
    return cachedVersion;
}

// ── Champion square icons ──
// DDragon uses the champion's "id" key (e.g. "Aatrox", "LeeSin", "MonkeyKing")
// We maintain a name→id map from the champion catalog

let championNameToId: Map<string, string> | null = null;

export async function loadChampionMapping(): Promise<Map<string, string>> {
    if (championNameToId) return championNameToId;
    const ver = await getLatestVersion();
    const url = `${DDRAGON_BASE}/cdn/${ver}/data/en_US/champion.json`;
    const res = await fetch(url);
    const data = (await res.json()) as { data: Record<string, { id: string; name: string; key: string }> };

    championNameToId = new Map();
    for (const champ of Object.values(data.data)) {
        championNameToId.set(champ.name.toLowerCase(), champ.id);
    }
    return championNameToId;
}

export async function getChampionSquareUrl(championName: string): Promise<string> {
    const ver = await getLatestVersion();
    const map = await loadChampionMapping();
    const ddId = map.get(championName.toLowerCase()) ?? championName.replace(/\s+/g, "");
    return `${DDRAGON_BASE}/cdn/${ver}/img/champion/${ddId}.png`;
}

// Synchronous version — requires loadChampionMapping() to have been called first
export function getChampionSquareUrlSync(championName: string, version: string): string {
    const ddId = championNameToId?.get(championName.toLowerCase()) ?? championName.replace(/\s+/g, "");
    return `${DDRAGON_BASE}/cdn/${version}/img/champion/${ddId}.png`;
}

// ── Item icons ──
export function getItemIconUrl(itemId: number, version: string): string {
    return `${DDRAGON_BASE}/cdn/${version}/img/item/${itemId}.png`;
}

// ── Rune icons ──
// Rune icons use a different path pattern — loaded from runesReforged.json
interface RuneMetadata {
    id: number;
    icon: string;
    name: string;
}

let runeIconMap: Map<number, string> | null = null;

export async function loadRuneIcons(): Promise<Map<number, string>> {
    if (runeIconMap) return runeIconMap;
    const ver = await getLatestVersion();
    const url = `${DDRAGON_BASE}/cdn/${ver}/data/en_US/runesReforged.json`;
    const res = await fetch(url);
    const trees = (await res.json()) as Array<{
        id: number; icon: string; name: string;
        slots: Array<{ runes: RuneMetadata[] }>;
    }>;

    runeIconMap = new Map();
    for (const tree of trees) {
        // Tree icon (e.g. Precision, Domination)
        runeIconMap.set(tree.id, `${DDRAGON_BASE}/cdn/img/${tree.icon}`);
        for (const slot of tree.slots) {
            for (const rune of slot.runes) {
                runeIconMap.set(rune.id, `${DDRAGON_BASE}/cdn/img/${rune.icon}`);
            }
        }
    }
    return runeIconMap;
}

export function getRuneIconUrl(runeId: number): string | undefined {
    return runeIconMap?.get(runeId);
}

// ── Summoner Spell icons ──
// Spell IDs → DDragon spell image key mapping
const SPELL_ID_TO_KEY: Record<number, string> = {
    1: "SummonerBoost",       // Cleanse
    3: "SummonerExhaust",     // Exhaust
    4: "SummonerFlash",       // Flash
    6: "SummonerHaste",       // Ghost
    7: "SummonerHeal",        // Heal
    11: "SummonerSmite",      // Smite
    12: "SummonerTeleport",   // Teleport
    13: "SummonerMana",       // Clarity
    14: "SummonerDot",        // Ignite
    21: "SummonerBarrier",    // Barrier
    32: "SummonerSnowball",   // Mark (ARAM)
};

export function getSpellIconUrl(spellId: number, version: string): string {
    const key = SPELL_ID_TO_KEY[spellId] ?? "SummonerFlash";
    return `${DDRAGON_BASE}/cdn/${version}/img/spell/${key}.png`;
}

// ── Preload all data ──
export async function preloadDDragonData(): Promise<string> {
    const ver = await getLatestVersion();
    await Promise.all([
        loadChampionMapping(),
        loadRuneIcons(),
    ]);
    return ver;
}
