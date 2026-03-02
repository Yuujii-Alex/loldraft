import { Ban, Users, Lock, ChevronRight } from 'lucide-react';
import type { DraftPhase } from '../types/champ-select-types';

interface PhaseIndicatorProps {
    phase: DraftPhase;
    hasBans: boolean;
}

export default function PhaseIndicator({ phase, hasBans }: PhaseIndicatorProps) {
    const steps = [];

    if (hasBans) {
        steps.push({ id: 'BANNING', label: 'Ban Phase', icon: Ban });
    }
    steps.push({ id: 'PICKING', label: 'Pick Phase', icon: Users });
    steps.push({ id: 'FINALIZATION', label: 'Locked In', icon: Lock });

    // Determine active index based on current phase
    let activeIndex = 0;
    if (phase === 'FINALIZATION') {
        activeIndex = steps.length - 1;
    } else if (phase === 'PICKING') {
        activeIndex = hasBans ? 1 : 0;
    } else if (phase === 'BANNING') {
        activeIndex = 0;
    } else {
        // 'PLANNING' or ''
        activeIndex = -1; // Or highlight the first step if preferred
    }

    return (
        <div className="flex items-center gap-2 justify-center py-4">
            {steps.map((step, index) => {
                const isActive = index === activeIndex;
                const Icon = step.icon;

                return (
                    <div key={step.id} className="flex items-center gap-2">
                        <div
                            className={`flex items-center gap-[6px] px-[14px] py-[6px] rounded-full font-medium transition-colors ${isActive
                                    ? 'bg-[#45b5c4] text-slate-900 border border-[#45b5c4]'
                                    : 'bg-[#1e1e24] text-slate-400 border border-transparent'
                                }`}
                        >
                            <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                            <span className="text-[13px] tracking-wide">{step.label}</span>
                        </div>
                        {index < steps.length - 1 && (
                            <ChevronRight size={14} className="text-slate-600" />
                        )}
                    </div>
                );
            })}
        </div>
    );
}
