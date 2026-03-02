import type { ChampionSuggestion } from '../types/build-types';

const DDRAGON_BASE = "https://ddragon.leagueoflegends.com";
const DDRAGON_VERSION = "16.4.1"; // Will be updated when we integrate dynamic version

// Champion name → DDragon id mapping for common edge cases
function champNameToDDragonId(name: string): string {
    // DDragon uses PascalCase without spaces, with some exceptions
    const overrides: Record<string, string> = {
        "wukong": "MonkeyKing",
        "renata glasc": "Renata",
        "nunu & willump": "Nunu",
        "k'sante": "KSante",
        "bel'veth": "Belveth",
        "kai'sa": "Kaisa",
        "kha'zix": "Khazix",
        "cho'gath": "Chogath",
        "vel'koz": "Velkoz",
        "kog'maw": "KogMaw",
        "rek'sai": "RekSai",
        "lee sin": "LeeSin",
        "master yi": "MasterYi",
        "miss fortune": "MissFortune",
        "twisted fate": "TwistedFate",
        "xin zhao": "XinZhao",
        "jarvan iv": "JarvanIV",
        "dr. mundo": "DrMundo",
        "tahm kench": "TahmKench",
        "aurelion sol": "AurelionSol",
    };
    const key = name.toLowerCase();
    if (overrides[key]) return overrides[key];
    // Default: remove spaces and apostrophes, capitalize first letter of each word
    return name.replace(/['.\s]/g, '').replace(/^./, c => c.toUpperCase());
}

function getChampSquareUrl(name: string): string {
    const ddId = champNameToDDragonId(name);
    return `${DDRAGON_BASE}/cdn/${DDRAGON_VERSION}/img/champion/${ddId}.png`;
}

const tierColors: Record<number, { bg: string; text: string; label: string }> = {
    1: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'OP' },
    2: { bg: 'bg-teal-500/20', text: 'text-teal-400', label: 'S' },
    3: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'A' },
    4: { bg: 'bg-slate-500/20', text: 'text-slate-400', label: 'B' },
    5: { bg: 'bg-slate-700/20', text: 'text-slate-500', label: 'C' },
};

export default function SuggestionCard({ suggestion }: { suggestion: ChampionSuggestion }) {
    const tier = tierColors[suggestion.tier] ?? tierColors[5];

    return (
        <div className="flex flex-row items-start gap-3 bg-[#222] border border-white/5 rounded-lg p-3 hover:border-[#45b5c4]/30 transition-colors min-w-0">
            {/* Champion icon */}
            <div className="relative shrink-0">
                <img
                    src={getChampSquareUrl(suggestion.name)}
                    alt={suggestion.name}
                    className="w-12 h-12 rounded-lg object-cover border border-white/10"
                    onError={(e) => {
                        (e.target as HTMLImageElement).src = `${DDRAGON_BASE}/cdn/${DDRAGON_VERSION}/img/champion/Aatrox.png`;
                    }}
                />
                {/* Tier badge */}
                <span className={`absolute -top-1 -right-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${tier.bg} ${tier.text}`}>
                    {tier.label}
                </span>
            </div>

            {/* Info */}
            <div className="flex flex-col min-w-0 gap-0.5">
                <span className="text-white font-semibold text-sm truncate">{suggestion.name}</span>
                <div className="flex gap-2 text-[11px]">
                    <span className="text-emerald-400">{(suggestion.winRate * 100).toFixed(1)}% WR</span>
                    <span className="text-slate-400">{(suggestion.pickRate * 100).toFixed(1)}% PR</span>
                </div>
                <p className="text-slate-400 text-xs leading-snug mt-0.5 line-clamp-2">{suggestion.reason}</p>
            </div>
        </div>
    );
}
