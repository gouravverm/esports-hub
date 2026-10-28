import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

import type { GameKey, Index, Player, PlayerSummary, Team, TeamSummary, Tournament, TournamentSummary } from './types';

// Where the published JSON lives: EXPO_PUBLIC_DATA_URL (set for production builds in
// .env.production), else public/api on the web dev server, else the hosted copy for phones.
const HOSTED = 'https://gouravverm.github.io/esports-hub/api';
const BASE = process.env.EXPO_PUBLIC_DATA_URL ?? (Platform.OS === 'web' ? '/api' : HOSTED);

const cache = new Map<string, unknown>();

async function getJson<T>(path: string, fresh = false): Promise<T> {
  if (!fresh && cache.has(path)) return cache.get(path) as T;
  if (!BASE) throw new Error('Data URL not set (EXPO_PUBLIC_DATA_URL)');
  const res = await fetch(`${BASE}/${path}`);
  if (!res.ok) throw new Error(`Could not load ${path} (${res.status})`);
  const data = (await res.json()) as T;
  cache.set(path, data);
  return data;
}

export const api = {
  index: (fresh?: boolean) => getJson<Index>('index.json', fresh),
  tournaments: (game: GameKey) => getJson<TournamentSummary[]>(`tournaments/${game}.json`),
  tournament: (id: string | number) => getJson<Tournament>(`t/${id}.json`),
  teams: () => getJson<TeamSummary[]>('teams/index.json'),
  team: (id: string) => getJson<Team>(`teams/${id}.json`),
  players: () => getJson<PlayerSummary[]>('players/index.json'),
  player: (id: string) => getJson<Player>(`players/${id}.json`),
};

/** Load data for a screen; `reload` re-fetches (pull to refresh). */
export function useData<T>(load: (fresh: boolean) => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const run = useCallback(
    (fresh: boolean) => {
      setLoading(true);
      setError(null);
      load(fresh)
        .then(setData)
        .catch((e: Error) => setError(e.message))
        .finally(() => setLoading(false));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps,
  );

  useEffect(() => run(false), [run]);
  return { data, error, loading, reload: () => run(true) };
}
