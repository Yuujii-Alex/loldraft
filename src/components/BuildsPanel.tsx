import type { BuildData } from '../types/build-types';
import ReactMarkdown from 'react-markdown';

const DDRAGON = "https://ddragon.leagueoflegends.com";
const VER = "16.4.1";

// Rune page ID → icon path mapping
const RUNE_PAGE_ICONS: Record<number, string> = {
    8000: "7201_Precision.png",
    8100: "7200_Domination.png",
    8200: "7202_Sorcery.png",
    8300: "7203_Whimsy.png",
    8400: "7204_Resolve.png",
};

function getRunePageIcon(pageId: number): string {
    const icon = RUNE_PAGE_ICONS[pageId];
    return icon ? `${DDRAGON}/cdn/img/perk-images/Styles/${icon}` : "";
}

// Summoner spell ID → key
const SPELL_KEYS: Record<number, string> = {
    1: "SummonerBoost", 3: "SummonerExhaust", 4: "SummonerFlash",
    6: "SummonerHaste", 7: "SummonerHeal", 11: "SummonerSmite",
    12: "SummonerTeleport", 14: "SummonerDot", 21: "SummonerBarrier",
    32: "SummonerSnowball",
};

function ItemIcon({ id, name }: { id: number; name?: string }) {
    return (
        <div className="relative group">
            <img
                src={`${DDRAGON}/cdn/${VER}/img/item/${id}.png`}
                alt={name ?? `Item ${id}`}
                className="w-8 h-8 rounded border border-white/10"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            {name && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-black/90 text-white text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    {name}
                </div>
            )}
        </div>
    );
}

function SpellIcon({ id }: { id: number }) {
    const key = SPELL_KEYS[id] ?? "SummonerFlash";
    return (
        <img
            src={`${DDRAGON}/cdn/${VER}/img/spell/${key}.png`}
            alt={key}
            className="w-8 h-8 rounded border border-white/10"
        />
    );
}

function StatLine({ label, value, format = 'percent' }: { label: string; value: number; format?: 'percent' | 'plain' }) {
    const display = format === 'percent' ? `${(value * 100).toFixed(1)}%` : value.toFixed(1);
    return (
        <span className="text-[11px] text-slate-400">
            <span className="text-slate-500">{label}</span> {display}
        </span>
    );
}

export default function BuildsPanel({ build, championName }: { build: BuildData; championName: string }) {
    return (
        <div className="space-y-5">
            {/* ── Runes + Spells Row ── */}
            <div className="flex flex-wrap items-start gap-6">
                {/* Primary Rune Tree */}
                <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider">Primary</span>
                    <img
                        src={getRunePageIcon(build.runes.primaryPageId)}
                        alt={build.runes.primaryPageName}
                        className="w-7 h-7"
                    />
                    <span className="text-xs text-slate-300">{build.runes.primaryPageName}</span>
                    <div className="flex gap-1 mt-1">
                        {build.runes.primaryRuneNames.map((name, i) => (
                            <div key={i} className="relative group">
                                <div className="w-6 h-6 rounded-full bg-[#2a2a2a] border border-white/10 flex items-center justify-center text-[9px] text-[#45b5c4] font-bold">
                                    {i + 1}
                                </div>
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-black/90 text-white text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                    {name}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Secondary Rune Tree */}
                <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider">Secondary</span>
                    <img
                        src={getRunePageIcon(build.runes.secondaryPageId)}
                        alt={build.runes.secondaryPageName}
                        className="w-7 h-7"
                    />
                    <span className="text-xs text-slate-300">{build.runes.secondaryPageName}</span>
                    <div className="flex gap-1 mt-1">
                        {build.runes.secondaryRuneNames.map((name, i) => (
                            <div key={i} className="relative group">
                                <div className="w-6 h-6 rounded-full bg-[#2a2a2a] border border-white/10 flex items-center justify-center text-[9px] text-slate-400 font-bold">
                                    {i + 1}
                                </div>
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-black/90 text-white text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                    {name}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Divider */}
                <div className="w-px h-16 bg-white/5 self-center" />

                {/* Summoner Spells */}
                <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider">Spells</span>
                    <div className="flex gap-1.5">
                        {build.spells.ids.map((id, i) => (
                            <SpellIcon key={i} id={id} />
                        ))}
                    </div>
                    <StatLine label="WR" value={build.spells.winRate} />
                </div>
            </div>

            {/* ── Items ── */}
            <div className="space-y-3">
                {/* Starting Items */}
                {build.starterItems.ids.length > 0 && (
                    <div>
                        <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-xs text-slate-500 uppercase tracking-wider">Starting Items</span>
                            <StatLine label="WR" value={build.starterItems.winRate} />
                        </div>
                        <div className="flex gap-1.5">
                            {build.starterItems.ids.map((id, i) => (
                                <ItemIcon key={i} id={id} name={build.starterItems.names[i]} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Core Build */}
                {build.coreItems.ids.length > 0 && (
                    <div>
                        <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-xs text-slate-500 uppercase tracking-wider">Core Build</span>
                            <StatLine label="WR" value={build.coreItems.winRate} />
                        </div>
                        <div className="flex items-center gap-1">
                            {build.coreItems.ids.map((id, i) => (
                                <div key={i} className="flex items-center gap-1">
                                    <ItemIcon id={id} name={build.coreItems.names[i]} />
                                    {i < build.coreItems.ids.length - 1 && (
                                        <span className="text-slate-600 text-xs">›</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Boots */}
                {build.boots && build.boots.ids.length > 0 && (
                    <div>
                        <span className="text-xs text-slate-500 uppercase tracking-wider">Boots</span>
                        <div className="flex gap-1.5 mt-1.5">
                            {build.boots.ids.map((id, i) => (
                                <ItemIcon key={i} id={id} name={build.boots!.names[i]} />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* ── Skill Order ── */}
            {build.skills.order.length > 0 && (
                <div>
                    <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs text-slate-500 uppercase tracking-wider">Skill Order</span>
                        <StatLine label="WR" value={build.skills.winRate} />
                    </div>
                    <div className="flex gap-0.5">
                        {build.skills.order.slice(0, 18).map((skill, i) => {
                            const colors: Record<string, string> = {
                                'Q': 'bg-blue-500/30 text-blue-300',
                                'W': 'bg-teal-500/30 text-teal-300',
                                'E': 'bg-amber-500/30 text-amber-300',
                                'R': 'bg-purple-500/30 text-purple-300',
                            };
                            return (
                                <div
                                    key={i}
                                    className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center ${colors[skill] ?? 'bg-slate-700 text-slate-400'}`}
                                    title={`Level ${i + 1}: ${skill}`}
                                >
                                    {skill}
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex gap-0.5 mt-0.5">
                        {Array.from({ length: Math.min(build.skills.order.length, 18) }, (_, i) => (
                            <span key={i} className="w-5 text-center text-[8px] text-slate-600">{i + 1}</span>
                        ))}
                    </div>
                </div>
            )}

            {/* ── AI Lane Tips ── */}
            {build.tips && (
                <div className="border-t border-white/5 pt-3">
                    <span className="text-xs text-[#45b5c4] uppercase tracking-wider font-semibold">🤖 Lane Tips</span>
                    <div className="text-slate-200 text-sm leading-relaxed mt-1.5">
                        <ReactMarkdown
                            components={{
                                strong: ({ children }) => (
                                    <strong className="text-[#45b5c4] font-semibold">{children}</strong>
                                ),
                                ul: ({ children }) => (
                                    <ul className="list-disc list-inside space-y-1 my-1">{children}</ul>
                                ),
                                p: ({ children }) => (
                                    <p className="my-1">{children}</p>
                                ),
                            }}
                        >{build.tips}</ReactMarkdown>
                    </div>
                </div>
            )}
        </div>
    );
}
