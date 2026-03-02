/* eslint-disable import/no-unresolved */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";
import type { BuildData, RuneData, ItemSet, SkillData, SpellData } from "../types/build-types.js";

class HttpTransport implements Transport {
    private url: string;
    onclose?: () => void;
    onerror?: (error: Error) => void;
    onmessage?: (message: JSONRPCMessage) => void;

    constructor(url: string) {
        this.url = url;
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    async start(): Promise<void> { }
    async close(): Promise<void> { this.onclose?.(); }

    async send(message: JSONRPCMessage): Promise<void> {
        try {
            const response = await fetch(this.url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(message)
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            const data = await response.json();
            this.onmessage?.(data as JSONRPCMessage);
        } catch (error) {
            this.onerror?.(error as Error);
        }
    }
}

let mcpClient: Client | null = null;

async function getOpggClient(): Promise<Client> {
    if (mcpClient) return mcpClient;

    const transport = new HttpTransport("https://mcp-api.op.gg/mcp");
    const client = new Client({ name: "loldraft-client", version: "1.0.0" }, { capabilities: {} });

    await client.connect(transport);
    mcpClient = client;
    return mcpClient;
}

// ═══════════════════════════════════════════════
// MCP Custom Text Format Parser
// ═══════════════════════════════════════════════
// OP.GG MCP returns data like:
//   class Runes: primary_page_id, primary_page_name, ...
//   LolGetChampionAnalysis(Data(Runes(8000,"Precision",...)))
//
// We parse the schema header to get field names,
// then extract values from the constructor calls.

interface McpSchema {
    [className: string]: string[];
}

function parseMcpSchema(text: string): McpSchema {
    const schema: McpSchema = {};
    const lines = text.split('\n');
    for (const line of lines) {
        const match = line.match(/^class\s+(\w+):\s*(.+)$/);
        if (match) {
            schema[match[1]] = match[2].split(',').map(f => f.trim());
        }
    }
    return schema;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseValue(val: string): any {
    val = val.trim();
    if (val === 'null' || val === 'None') return null;
    if (val === 'true') return true;
    if (val === 'false') return false;
    if (/^".*"$/.test(val)) return val.slice(1, -1);
    if (/^-?\d+(\.\d+)?$/.test(val)) return Number(val);
    return val;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractConstructorArgs(text: string, startIdx: number): { args: any[]; endIdx: number } {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const args: any[] = [];
    let i = startIdx;
    let depth = 0;
    let current = '';
    let inString = false;

    while (i < text.length) {
        const ch = text[i];

        if (ch === '"' && (i === 0 || text[i - 1] !== '\\')) {
            inString = !inString;
            current += ch;
        } else if (inString) {
            current += ch;
        } else if (ch === '(') {
            if (depth === 0 && current.trim()) {
                // This is a nested constructor call — ClassName(...)
                const className = current.trim();
                i++; // skip '('
                const nested = extractConstructorArgs(text, i);
                args.push({ __class: className, __args: nested.args });
                i = nested.endIdx; // skip past ')'
                current = '';
                continue;
            } else {
                depth++;
                current += ch;
            }
        } else if (ch === ')') {
            if (depth > 0) {
                depth--;
                current += ch;
            } else {
                // End of this level
                if (current.trim()) args.push(parseValue(current));
                return { args, endIdx: i + 1 };
            }
        } else if (ch === '[') {
            // Parse array
            i++;
            const arr = extractArray(text, i);
            args.push(arr.items);
            i = arr.endIdx;
            current = '';
            continue;
        } else if (ch === ',' && depth === 0) {
            if (current.trim()) args.push(parseValue(current));
            current = '';
        } else {
            current += ch;
        }
        i++;
    }
    if (current.trim()) args.push(parseValue(current));
    return { args, endIdx: i };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractArray(text: string, startIdx: number): { items: any[]; endIdx: number } {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items: any[] = [];
    let i = startIdx;
    let current = '';

    while (i < text.length) {
        const ch = text[i];
        if (ch === ']') {
            if (current.trim()) items.push(parseValue(current));
            return { items, endIdx: i + 1 };
        } else if (ch === '(') {
            // Constructor inside array: ClassName(...)
            const className = current.trim();
            i++; // skip '('
            const nested = extractConstructorArgs(text, i);
            items.push({ __class: className, __args: nested.args });
            i = nested.endIdx;
            current = '';
            // Skip trailing comma/space
            while (i < text.length && (text[i] === ',' || text[i] === ' ')) i++;
            continue;
        } else if (ch === ',') {
            if (current.trim()) items.push(parseValue(current));
            current = '';
        } else {
            current += ch;
        }
        i++;
    }
    if (current.trim()) items.push(parseValue(current));
    return { items, endIdx: i };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mcpObjectToJs(obj: any, schema: McpSchema): any {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(item => mcpObjectToJs(item, schema));

    if (obj.__class && obj.__args) {
        const fields = schema[obj.__class];
        if (!fields) {
            // Unknown class, return args directly
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return obj.__args.length === 1 ? mcpObjectToJs(obj.__args[0], schema) : obj.__args.map((a: any) => mcpObjectToJs(a, schema));
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result: Record<string, any> = {};
        for (let idx = 0; idx < fields.length && idx < obj.__args.length; idx++) {
            result[fields[idx]] = mcpObjectToJs(obj.__args[idx], schema);
        }
        return result;
    }
    return obj;
}

/**
 * Parse OP.GG MCP text format into a JS object.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseMcpText(text: string): any {
    if (typeof text !== 'string') return text;

    // Try JSON first
    try {
        return JSON.parse(text);
    } catch {
        // Not JSON, parse custom format
    }

    const schema = parseMcpSchema(text);

    // Find the first top-level constructor call (after the class definitions)
    const dataStart = text.search(/\n\n|\r\n\r\n/);
    if (dataStart === -1) return text;

    const dataSection = text.slice(dataStart).trim();
    if (!dataSection) return text;

    // Find the root constructor
    const rootMatch = dataSection.match(/^(\w+)\(/);
    if (!rootMatch) return text;

    const className = rootMatch[1];
    const argsStart = rootMatch[0].length;
    const { args } = extractConstructorArgs(dataSection, argsStart);

    const raw = { __class: className, __args: args };
    return mcpObjectToJs(raw, schema);
}

// ═══════════════════════════════════════════════
// MCP Response Helper
// ═══════════════════════════════════════════════

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getMcpResponseText(result: any, label: string): string {
    if (!result || !result.content || (result.content as any[]).length === 0) {
        throw new Error(`No data returned from OP.GG MCP (${label})`);
    }
    return (result.content as any[])[0].text as string;
}

// ═══════════════════════════════════════════════
// MCP API Functions
// ═══════════════════════════════════════════════

export async function getChampionAnalysis(championName: string, position: string): Promise<BuildData> {
    const client = await getOpggClient();

    const result = await client.callTool({
        name: "lol_get_champion_analysis",
        arguments: {
            game_mode: "RANKED",
            champion: championName.toUpperCase().replace(/\s+/g, "_"),
            position: position.toLowerCase(),
            lang: "en_US",
            desired_output_fields: [
                // Runes — IDs + names
                "data.runes.primary_page_id",
                "data.runes.primary_page_name",
                "data.runes.primary_rune_ids[]",
                "data.runes.primary_rune_names[]",
                "data.runes.secondary_page_id",
                "data.runes.secondary_page_name",
                "data.runes.secondary_rune_ids[]",
                "data.runes.secondary_rune_names[]",
                "data.runes.stat_mod_ids[]",
                "data.runes.stat_mod_names[]",
                "data.runes.pick_rate",
                "data.runes.win",
                // Items — IDs + names
                "data.starter_items.ids[]",
                "data.starter_items.ids_names[]",
                "data.starter_items.pick_rate",
                "data.starter_items.win",
                "data.core_items.ids[]",
                "data.core_items.ids_names[]",
                "data.core_items.pick_rate",
                "data.core_items.win",
                "data.boots.ids[]",
                "data.boots.ids_names[]",
                "data.boots.pick_rate",
                "data.boots.win",
                // Skills
                "data.skills.order[]",
                "data.skills.pick_rate",
                "data.skills.win",
                // Summoner spells
                "data.summoner_spells.ids[]",
                "data.summoner_spells.ids_names[]",
                "data.summoner_spells.pick_rate",
                "data.summoner_spells.win",
                // Summary stats
                "data.summary.average_stats.win_rate",
                "data.summary.average_stats.tier",
                "data.summary.average_stats.pick_rate",
                "data.summary.average_stats.ban_rate",
                "data.summary.average_stats.kda",
                // Counters
                "data.strong_counters[].champion_name",
                "data.strong_counters[].win_rate",
                "data.weak_counters[].champion_name",
                "data.weak_counters[].win_rate"
            ]
        }
    });

    const rawText = getMcpResponseText(result, `${championName} ${position}`);
    const parsed = parseMcpText(rawText);
    console.log("Parsed MCP analysis:", JSON.stringify(parsed).slice(0, 300));

    // Extract structured build data from parsed response
    return extractBuildData(parsed);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractBuildData(parsed: any): BuildData {
    // Navigate to the data object — structure varies but should be nested
    const data = parsed?.data ?? parsed;

    const runes: RuneData = {
        primaryPageId: data?.runes?.primary_page_id ?? 0,
        primaryPageName: data?.runes?.primary_page_name ?? "",
        primaryRuneIds: asNumberArray(data?.runes?.primary_rune_ids),
        primaryRuneNames: asStringArray(data?.runes?.primary_rune_names),
        secondaryPageId: data?.runes?.secondary_page_id ?? 0,
        secondaryPageName: data?.runes?.secondary_page_name ?? "",
        secondaryRuneIds: asNumberArray(data?.runes?.secondary_rune_ids),
        secondaryRuneNames: asStringArray(data?.runes?.secondary_rune_names),
        statModIds: asNumberArray(data?.runes?.stat_mod_ids),
        statModNames: asStringArray(data?.runes?.stat_mod_names),
        pickRate: data?.runes?.pick_rate ?? 0,
        winRate: data?.runes?.win ?? 0,
    };

    const starterItems: ItemSet = {
        ids: asNumberArray(data?.starter_items?.ids),
        names: asStringArray(data?.starter_items?.ids_names),
        pickRate: data?.starter_items?.pick_rate ?? 0,
        winRate: data?.starter_items?.win ?? 0,
    };

    const coreItems: ItemSet = {
        ids: asNumberArray(data?.core_items?.ids),
        names: asStringArray(data?.core_items?.ids_names),
        pickRate: data?.core_items?.pick_rate ?? 0,
        winRate: data?.core_items?.win ?? 0,
    };

    const boots: ItemSet | null = data?.boots ? {
        ids: asNumberArray(data.boots.ids),
        names: asStringArray(data.boots.ids_names),
        pickRate: data.boots.pick_rate ?? 0,
        winRate: data.boots.win ?? 0,
    } : null;

    const skills: SkillData = {
        order: asStringArray(data?.skills?.order),
        pickRate: data?.skills?.pick_rate ?? 0,
        winRate: data?.skills?.win ?? 0,
    };

    const spells: SpellData = {
        ids: asNumberArray(data?.summoner_spells?.ids),
        names: asStringArray(data?.summoner_spells?.ids_names),
        pickRate: data?.summoner_spells?.pick_rate ?? 0,
        winRate: data?.summoner_spells?.win ?? 0,
    };

    return { runes, starterItems, coreItems, boots, skills, spells, tips: "" };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function asNumberArray(val: any): number[] {
    if (!val) return [];
    if (Array.isArray(val)) return val.map(Number).filter(n => !isNaN(n));
    return [];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function asStringArray(val: any): string[] {
    if (!val) return [];
    if (Array.isArray(val)) return val.map(String);
    return [];
}

export async function getLaneMatchupGuide(myChampion: string, opponentChampion: string, position: string) {
    const client = await getOpggClient();

    const result = await client.callTool({
        name: "lol_get_lane_matchup_guide",
        arguments: {
            lang: "en_US",
            position: position.toLowerCase(),
            my_champion: myChampion.toUpperCase().replace(/\s+/g, "_"),
            opponent_champion: opponentChampion.toUpperCase().replace(/\s+/g, "_")
        }
    });

    const rawText = getMcpResponseText(result, `${myChampion} vs ${opponentChampion}`);
    return rawText; // Keep raw for LLM consumption
}

export interface MetaChampion {
    champion: string;
    tier: number;
    winRate: number;
    pickRate: number;
    banRate: number;
    kda: number;
    rank: number;
}

export async function getMetaChampions(position: string): Promise<MetaChampion[]> {
    const client = await getOpggClient();
    const pos = position.toLowerCase();

    const result = await client.callTool({
        name: "lol_list_lane_meta_champions",
        arguments: {
            lang: "en_US",
            position: pos,
            desired_output_fields: [
                `data.positions.${pos}[].champion`,
                `data.positions.${pos}[].tier`,
                `data.positions.${pos}[].win_rate`,
                `data.positions.${pos}[].pick_rate`,
                `data.positions.${pos}[].ban_rate`,
                `data.positions.${pos}[].kda`,
                `data.positions.${pos}[].rank`
            ]
        }
    });

    const rawText = getMcpResponseText(result, `meta ${position}`);
    const parsed = parseMcpText(rawText);
    console.log("Parsed meta champions:", JSON.stringify(parsed).slice(0, 300));

    // Extract the champion list
    const champions = extractMetaChampions(parsed, pos);
    return champions;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractMetaChampions(parsed: any, position: string): MetaChampion[] {
    // Navigate to the array of champions
    let list = parsed?.data?.positions?.[position];
    if (!list) {
        // Try alternate structures
        list = parsed?.positions?.[position];
    }
    if (!Array.isArray(list)) {
        console.warn("Could not extract meta champion list from parsed data");
        return [];
    }

    return list.map((c: any) => ({
        champion: c.champion ?? c.name ?? "Unknown",
        tier: c.tier ?? 5,
        winRate: c.win_rate ?? 0,
        pickRate: c.pick_rate ?? 0,
        banRate: c.ban_rate ?? 0,
        kda: c.kda ?? 0,
        rank: c.rank ?? 0,
    }));
}
