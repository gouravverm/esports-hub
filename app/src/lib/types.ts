// Shapes of the JSON files written by collector/publish.py

export type GameKey = 'bgmi' | 'freefire' | 'pubgm';
export type Status = 'ongoing' | 'upcoming' | 'finished' | null;

export interface TeamRef {
  id: string;
  name: string;
}

export interface TournamentSummary {
  id: number;
  game: GameKey;
  name: string;
  tier: string | null;
  type: string | null;
  organizer: string | null;
  city: string | null;
  start: string | null;
  end: string | null;
  status: Status;
  prize: number | null;
  currency: string | null;
  winner: string | null;
}

export interface Video {
  id: string;
  title: string;
  thumb: string | null;
  status: 'live' | 'upcoming' | 'video';
  channel: string | null;
  at: string | null; // ISO time: started, scheduled or published
  url: string;
  games: GameKey[];
  tournament: { id: number; name: string } | null;
  language?: string; // when the same broadcast exists in several languages
  languages?: { language: string; url: string }[];
}

export interface GameIndex {
  label: string;
  count: number;
  live: TournamentSummary[];
  upcoming: TournamentSummary[];
  recent: TournamentSummary[];
  streams?: Video[]; // live or about to start
  videos?: Video[]; // newest uploads
}

export interface Index {
  updated: string;
  source: string;
  games: Record<GameKey, GameIndex>;
}

export interface Standing {
  team: TeamRef;
  matches: number | null;
  wwcd: number | null;
  kills: number | null;
  start: number;
  points: number | null;
  placePts?: number; // points from placement (survival)
  killPts?: number; // points from kills (fights)
}

export interface MatchResult {
  team: TeamRef;
  place: number;
  kills: number;
  points: number | null;
}

export interface Match {
  no: number;
  at?: string | null;
  map?: string | null;
  results: MatchResult[];
}

export interface Stage {
  id: number;
  title: string;
  killPoints: number | null;
  placementPoints: Record<string, number> | null;
  standings: Standing[];
  matches: Match[];
}

export interface Tournament extends TournamentSummary {
  series: string | null;
  mode: string | null;
  perspective: string | null;
  teams: number | null;
  source: string;
  placements: { place: number; team: TeamRef; prize: number | null }[];
  stages: Stage[];
  squads: { team: TeamRef; players: SquadMember[] }[];
  videos?: Video[];
}

export interface SquadMember {
  player: string;
  role: string; // player | captain | substitute | coach | analyst | staff
  id?: string; // player profile id
}

export interface PlayerSummary {
  id: string;
  tag: string;
  name: string | null;
  game: GameKey;
  team: string;
  events: number;
  titles: number;
}

export interface PlayerEvent {
  id: number;
  name: string;
  tier: string | null;
  start: string | null;
  currency: string | null;
  team: TeamRef;
  role: string;
  place: number | null;
  prize: number | null;
}

export interface Player {
  id: string;
  game: GameKey;
  tag: string;
  name: string | null; // real name, romanised
  nativeName: string | null;
  birthDate: string | null;
  country: string | null;
  roles: string | null;
  status: string | null;
  yearsActive: string | null;
  links: Record<string, string>;
  source: string | null;
  currentTeam: TeamRef;
  lastRole: string;
  listedHistory: { from: string | null; to: string | null; team: string }[];
  timeline: { team: TeamRef; from: string | null; to: string | null; events: number }[];
  tournaments: PlayerEvent[];
  events: number;
  titles: number;
  podiums: number;
  teamWinnings: number;
}

export interface TeamSummary {
  id: string;
  name: string;
  game: GameKey;
  titles: number;
  events: number;
}

export interface Team extends TeamSummary {
  podiums: number;
  earnings: number;
  history: {
    id: number;
    name: string;
    tier: string | null;
    start: string | null;
    currency: string | null;
    place: number;
    prize: number | null;
  }[];
  squad: { tournament: string; players: SquadMember[] } | null;
}
