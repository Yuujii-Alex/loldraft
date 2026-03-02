// === Suggestion Card Types ===

export interface ChampionSuggestion {
    name: string;
    tier: number;
    winRate: number;
    pickRate: number;
    banRate: number;
    kda: number;
    reason: string;
}

// === Build Data Types ===

export interface RuneData {
    primaryPageId: number;
    primaryPageName: string;
    primaryRuneIds: number[];
    primaryRuneNames: string[];
    secondaryPageId: number;
    secondaryPageName: string;
    secondaryRuneIds: number[];
    secondaryRuneNames: string[];
    statModIds?: number[];
    statModNames?: string[];
    pickRate: number;
    winRate: number;
}

export interface ItemSet {
    ids: number[];
    names: string[];
    pickRate: number;
    winRate: number;
}

export interface SkillData {
    order: string[];       // e.g. ["Q","W","E","Q","Q","R",...]
    pickRate: number;
    winRate: number;
}

export interface SpellData {
    ids: number[];
    names: string[];
    pickRate: number;
    winRate: number;
}

export interface BuildData {
    runes: RuneData;
    starterItems: ItemSet;
    coreItems: ItemSet;
    boots: ItemSet | null;
    skills: SkillData;
    spells: SpellData;
    tips: string;           // LLM-generated lane tips
}

export interface GameplanPayload {
    championName: string;
    position: string;
    build: BuildData;
}

export interface SuggestionsPayload {
    suggestions: ChampionSuggestion[];
}
