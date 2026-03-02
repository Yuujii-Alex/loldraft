import { createWebSocketConnection } from 'league-connect';
import type { LeagueWebSocket } from 'league-connect';

export async function createLcuWebSocket(): Promise<LeagueWebSocket> {
    return createWebSocketConnection({
        authenticationOptions: { awaitConnection: true },
        maxRetries: -1,
    });
}