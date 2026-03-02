export type LcuStatus = 'good' | 'disconnected';

export interface ChampSelectUpdatePayload {
    myRole: string | null;
    myTeamIds: number[];
    enemyTeamIds: number[];
    myTeamNames: string[];
    enemyTeamNames: string[];
    currentChampionId: number;
    currentChampionName: string;
}