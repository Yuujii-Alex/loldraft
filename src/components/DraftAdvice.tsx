import { useEffect, useState, useRef } from 'react';
import SuggestionCard from './SuggestionCard';
import BuildsPanel from './BuildsPanel';
import type { ChampSelectUpdatePayload } from '../renderer.d';
import type { ChampionSuggestion, GameplanPayload, SuggestionsPayload } from '../types/build-types';

interface DraftAdviceProps {
    payload: ChampSelectUpdatePayload | null;
}

type CoachMode = 'idle' | 'suggestions' | 'gameplan';

export default function DraftAdvice({ payload }: DraftAdviceProps) {
    const [mode, setMode] = useState<CoachMode>('idle');
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Structured data states
    const [suggestions, setSuggestions] = useState<ChampionSuggestion[]>([]);
    const [gameplan, setGameplan] = useState<GameplanPayload | null>(null);

    // Dedup refs
    const lastSuggestionKey = useRef('');
    const lastGameplanKey = useRef('');

    const phase = payload?.phase ?? '';
    const position = payload?.myRole ?? 'unknown';
    const currentChampionId = payload?.currentChampionId ?? 0;
    const currentChampionName = payload?.currentChampionName ?? 'No Pick';
    const myTeamNames = payload?.myTeamNames ?? [];
    const enemyTeamNames = payload?.enemyTeamNames ?? [];

    const isFinalization = phase === 'FINALIZATION';
    const isPicking = phase === 'PICKING' || phase === 'BANNING' || phase === 'PLANNING';

    // === FINALIZATION: fetch structured build data ===
    useEffect(() => {
        if (!isFinalization) return;
        if (currentChampionId === 0 || currentChampionName === 'No Pick') return;

        const key = `${currentChampionName}-${position}`;
        if (key === lastGameplanKey.current) return;
        lastGameplanKey.current = key;

        let isCancelled = false;
        setMode('gameplan');
        setIsLoading(true);
        setErrorMsg(null);

        const fetch = async () => {
            try {
                const opponent = enemyTeamNames.find(n => n !== 'No Pick') ?? null;
                const result = await window.loldraft.generateGameplan(currentChampionName, opponent, position);

                if (isCancelled) return;
                if (typeof result === 'string') {
                    setErrorMsg(result);
                    setGameplan(null);
                } else {
                    setGameplan(result);
                }
            } catch (err) {
                if (!isCancelled) setErrorMsg("Failed to generate gameplan.");
                console.error(err);
            } finally {
                if (!isCancelled) setIsLoading(false);
            }
        };

        void fetch();
        return () => { isCancelled = true; };
    }, [isFinalization, currentChampionId, currentChampionName, position, enemyTeamNames]);

    // === PICKING/BANNING: fetch champion suggestions ===
    useEffect(() => {
        if (!isPicking) return;

        const lockedEnemies = enemyTeamNames.filter(n => n !== 'No Pick').sort().join(',');
        const lockedAllies = myTeamNames
            .filter(n => n !== 'No Pick' && n !== currentChampionName)
            .sort().join(',');
        const key = `${position}|${lockedAllies}|${lockedEnemies}`;

        if (key === lastSuggestionKey.current) return;
        lastSuggestionKey.current = key;

        let isCancelled = false;
        setMode('suggestions');
        setIsLoading(true);
        setErrorMsg(null);

        const fetch = async () => {
            try {
                const result = await window.loldraft.getDraftSuggestions(position, myTeamNames, enemyTeamNames);

                if (isCancelled) return;
                if (typeof result === 'string') {
                    setErrorMsg(result);
                    setSuggestions([]);
                } else {
                    setSuggestions(result.suggestions);
                }
            } catch (err) {
                if (!isCancelled) setErrorMsg("Failed to generate suggestions.");
                console.error(err);
            } finally {
                if (!isCancelled) setIsLoading(false);
            }
        };

        void fetch();
        return () => { isCancelled = true; };
    }, [isPicking, position, myTeamNames, enemyTeamNames, currentChampionName]);

    // Reset on no payload
    useEffect(() => {
        if (!payload) {
            setMode('idle');
            setSuggestions([]);
            setGameplan(null);
            setErrorMsg(null);
            lastSuggestionKey.current = '';
            lastGameplanKey.current = '';
        }
    }, [payload]);

    const title = mode === 'gameplan'
        ? '🤖 AI Coach — Build & Gameplan'
        : mode === 'suggestions'
            ? '🎯 AI Coach — Draft Suggestions'
            : '🤖 AI Coach';

    const loadingText = mode === 'gameplan'
        ? 'Fetching OP.GG build data & generating tips...'
        : 'Fetching meta data & generating suggestions...';

    return (
        <section className="bg-[#1a1a1a] border border-white/5 rounded-lg p-6 w-full max-w-4xl mx-auto shadow-2xl mt-8 relative overflow-hidden">
            <h2 className="text-[#45b5c4] font-bold text-lg mb-4 flex items-center gap-2">
                {title}
            </h2>

            <div className="min-h-[100px]">
                {isLoading ? (
                    <div className="flex items-center gap-3 text-slate-400 text-sm">
                        <div className="w-4 h-4 rounded-full border-2 border-[#45b5c4] border-t-transparent animate-spin" />
                        {loadingText}
                    </div>
                ) : errorMsg ? (
                    <div className="text-red-400 text-sm">{errorMsg}</div>
                ) : mode === 'suggestions' && suggestions.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {suggestions.map((s, i) => (
                            <SuggestionCard key={i} suggestion={s} />
                        ))}
                    </div>
                ) : mode === 'gameplan' && gameplan ? (
                    <BuildsPanel build={gameplan.build} championName={gameplan.championName} />
                ) : (
                    <div className="text-slate-500 text-sm">Waiting for champion select...</div>
                )}
            </div>

            {/* Top-right accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#45b5c4]/10 to-transparent rounded-tr-lg pointer-events-none" />
        </section>
    );
}
