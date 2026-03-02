import { GoogleGenAI } from '@google/genai';
import * as dotenv from 'dotenv';
import type { MetaChampion } from './mcp.js';
import type { BuildData, ChampionSuggestion } from '../types/build-types.js';
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

let ai: GoogleGenAI | null = null;
if (apiKey) {
    ai = new GoogleGenAI({ apiKey });
} else {
    console.warn("GEMINI_API_KEY is not set in .env. LLM Features will not work.");
}

/**
 * Generate a short lane tips text for the gameplan (displayed alongside the build data).
 */
export async function generateLaneTips(
    championName: string,
    position: string,
    opponentChampion: string | null,
    matchupGuide: unknown
): Promise<string> {
    if (!ai) return "Add GEMINI_API_KEY to .env for AI tips.";

    const systemPrompt = `You are an expert high-elo League of Legends coach.
Give 2-3 SHORT, punchy bullet points on how to play the lane.
Focus on: trading patterns, power spikes, win conditions.
No fluff. No intro. Use **bold** for key concepts.`;

    let userPrompt = `Champion: ${championName} (${position}).\n`;
    if (opponentChampion) userPrompt += `Opponent: ${opponentChampion}.\n`;
    if (matchupGuide) {
        userPrompt += `Matchup data:\n${typeof matchupGuide === 'string' ? matchupGuide : JSON.stringify(matchupGuide, null, 2)}\n`;
    }
    userPrompt += `Give me 2-3 lane tips.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-lite',
            contents: [{ role: 'user', parts: [{ text: systemPrompt + "\n\n" + userPrompt }] }],
            config: { temperature: 0.7 }
        });
        return response.text ?? "No tips generated.";
    } catch (error) {
        console.error("Gemini Lane Tips Error:", error);
        return "Error generating lane tips.";
    }
}

/**
 * Generate champion suggestions with reasons, based on meta data + team context.
 * Returns structured suggestions matching the MetaChampion data.
 */
export async function generateDraftSuggestions(
    position: string,
    myTeamNames: string[],
    enemyTeamNames: string[],
    metaChampions: MetaChampion[]
): Promise<ChampionSuggestion[]> {
    // Take top 15 meta picks to feed to the LLM
    const top = metaChampions.slice(0, 15);

    if (!ai) {
        // No LLM — return top 5 with generic reasons
        return top.slice(0, 5).map(c => ({
            name: c.champion,
            tier: c.tier,
            winRate: c.winRate,
            pickRate: c.pickRate,
            banRate: c.banRate,
            kda: c.kda,
            reason: `Tier ${c.tier} — ${(c.winRate * 100).toFixed(1)}% win rate`
        }));
    }

    const systemPrompt = `You are an expert League of Legends draft coach.
Given the current draft state and meta tier list, pick the 5 best champions for this player.
For each, respond with EXACTLY this JSON format (no markdown, no explanation, just the JSON array):
[{"name":"ChampionName","reason":"One sentence reason"}]
Only use champion names from the provided tier list.`;

    const allies = myTeamNames.filter(n => n !== 'No Pick').join(', ') || 'None';
    const enemies = enemyTeamNames.filter(n => n !== 'No Pick').join(', ') || 'None';
    const tierList = top.map(c =>
        `${c.champion} (Tier ${c.tier}, ${(c.winRate * 100).toFixed(1)}% WR, ${(c.pickRate * 100).toFixed(1)}% PR)`
    ).join('\n');

    const userPrompt = `Position: ${position}\nAllies: ${allies}\nEnemies: ${enemies}\n\nTier List:\n${tierList}\n\nPick 5 best champions as JSON array:`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-lite',
            contents: [{ role: 'user', parts: [{ text: systemPrompt + "\n\n" + userPrompt }] }],
            config: { temperature: 0.6 }
        });

        const text = (response.text ?? "[]").trim();
        // Extract JSON from possible markdown code fences
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (!jsonMatch) throw new Error("No JSON array in LLM response");

        const llmPicks = JSON.parse(jsonMatch[0]) as Array<{ name: string; reason: string }>;

        // Merge LLM picks with meta data
        return llmPicks.slice(0, 5).map(pick => {
            const meta = metaChampions.find(c =>
                c.champion.toLowerCase() === pick.name.toLowerCase()
            );
            return {
                name: pick.name,
                tier: meta?.tier ?? 5,
                winRate: meta?.winRate ?? 0,
                pickRate: meta?.pickRate ?? 0,
                banRate: meta?.banRate ?? 0,
                kda: meta?.kda ?? 0,
                reason: pick.reason,
            };
        });
    } catch (error) {
        console.error("Gemini Draft Suggestion Error:", error);
        // Fallback: return top 5 from meta
        return top.slice(0, 5).map(c => ({
            name: c.champion,
            tier: c.tier,
            winRate: c.winRate,
            pickRate: c.pickRate,
            banRate: c.banRate,
            kda: c.kda,
            reason: `Strong meta pick (Tier ${c.tier})`,
        }));
    }
}
