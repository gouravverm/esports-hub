import { createContext, useContext, useState, type ReactNode } from 'react';

import type { GameKey } from './types';

export const GAMES: { key: GameKey; label: string; short: string }[] = [
  { key: 'bgmi', label: 'BGMI', short: 'BGMI' },
  { key: 'freefire', label: 'Free Fire', short: 'FF' },
  { key: 'pubgm', label: 'PUBG Mobile', short: 'PUBGM' },
];

export const gameLabel = (key: GameKey) => GAMES.find((g) => g.key === key)?.label ?? key;

const GameContext = createContext<{ game: GameKey; setGame: (g: GameKey) => void }>({
  game: 'bgmi',
  setGame: () => {},
});

/** The game picked on top of Home / Tournaments / Teams, shared across tabs. */
export function GameProvider({ children }: { children: ReactNode }) {
  const [game, setGame] = useState<GameKey>('bgmi');
  return <GameContext.Provider value={{ game, setGame }}>{children}</GameContext.Provider>;
}

export const useGame = () => useContext(GameContext);
