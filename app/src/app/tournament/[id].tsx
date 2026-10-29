// Tournament screen — design-system/esports-hub/pages/tournament.md (taste-skill, true-black-flat).
// Question: who won (or leads) and by how much. Colour only on data, in the game's own hue.
import Ionicons from '@expo/vector-icons/Ionicons';
import { Link, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import {
  Badge,
  Card,
  Empty,
  ErrorView,
  GameBadge,
  LiveDot,
  Loading,
  Pills,
  Screen,
  SourceNote,
  SquadLine,
  TeamAvatar,
  Winner,
  styles as ui,
} from '@/components/ui';
import { ChickenIcon, KillIcon, MapChip, shortName, TournamentBanner } from '@/components/graphics';
import { AdBanner } from '@/components/AdBanner';
import { PlayerStatsView } from '@/components/playerStats';
import { Podium } from '@/components/showcase';
import { VideoCard } from '@/components/video';
import { api, useData } from '@/lib/api';
import { dateRange, dateTime, money, ordinal } from '@/lib/format';
import { colors, fonts, gameColors, placeColor, space, type } from '@/lib/theme';
import type { GameKey, Stage, TeamRef, Tournament } from '@/lib/types';

type Tab = 'table' | 'matches' | 'results' | 'stats' | 'squads' | 'videos';

const WIDE = 900; // table and Finish-vs-Fight side by side from here

export default function TournamentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error, loading, reload } = useData(() => api.tournament(id), [id]);
  const [tab, setTab] = useState<Tab | null>(null);

  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorView message={error ?? 'no data'} onRetry={reload} />;

  const stages = orderStages(data.stages);
  const lead = stages[0];
  const tabs: { key: Tab; label: string }[] = [
    ...(stages.length ? [{ key: 'table' as Tab, label: 'Points table' }] : []),
    ...(stages.some((s) => s.matches.length) ? [{ key: 'matches' as Tab, label: 'Matches' }] : []),
    ...(data.placements.length ? [{ key: 'results' as Tab, label: 'Final results' }] : []),
    ...(data.playerStats?.length ? [{ key: 'stats' as Tab, label: 'Player stats' }] : []),
    ...(data.squads.length ? [{ key: 'squads' as Tab, label: 'Squads' }] : []),
    ...(data.videos?.length ? [{ key: 'videos' as Tab, label: 'Videos' }] : []),
  ];
  const current = tab && tabs.some((t) => t.key === tab) ? tab : tabs[0]?.key;

  return (
    <Screen game={data.game}>
      <ScrollView>
        <Header t={data} lead={lead} />
        {tabs.length ? <Pills items={tabs} value={current!} onChange={setTab} /> : null}
        {current === 'table' && <StagesView stages={stages} game={data.game} mode="table" />}
        {current === 'matches' && <StagesView stages={stages.filter((s) => s.matches.length)} game={data.game} mode="matches" />}
        {current === 'results' && <ResultsView t={data} />}
        {current === 'stats' && <PlayerStatsView tables={data.playerStats!} />}
        {current === 'squads' && <SquadsView t={data} />}
        {current === 'videos' && (
          <View style={{ gap: space.md, paddingHorizontal: space.lg }}>
            {data.videos!.map((v) => (
              <VideoCard key={v.id} v={v} />
            ))}
          </View>
        )}
        {!tabs.length && <Empty text="Is tournament ka detailed data abhi available nahi hai" />}
        <AdBanner />
        <SourceNote />
      </ScrollView>
    </Screen>
  );
}

// ---------- stage helpers ----------

const GENERIC = /^(results?|overall standings|standings|match standings|overview|leaderboard|overall)$/i;

/** "League/Week 1 - Results" -> "Week 1"; "League - Overview - Super Weekend Leaderboard" -> "Super Weekend Leaderboard". */
function shortTitle(title: string): string {
  const parts = title.split(/\s+-\s+|\//).map((p) => p.trim()).filter((p) => p && !GENERIC.test(p));
  return parts[parts.length - 1] ?? title;
}

/** Grand Finals first (it decides the champion), then the page's own order; labels made unique. */
function orderStages(stages: Stage[]): Stage[] {
  const isFinal = (s: Stage) => /grand final/i.test(s.title);
  const sorted = [...stages.filter(isFinal).reverse(), ...stages.filter((s) => !isFinal(s))];
  const seen = new Map<string, number>();
  return sorted.map((s) => {
    const base = shortTitle(s.title);
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return { ...s, title: n > 1 ? `${base} (${n})` : base };
  });
}

/** One line that answers the screen's question from the lead table. */
function finding(t: Tournament, stage: Stage | undefined): string | null {
  const [first, second] = stage?.standings ?? [];
  if (!first || first.points == null) return null;
  const gap = second?.points != null ? first.points - second.points : null;
  const verb = t.status === 'finished' ? 'won' : 'leads';
  const parts = [gap != null && gap > 0 ? `${first.team.name} ${verb} by ${gap} pts` : `${first.team.name} ${verb}`];
  if (first.wwcd != null) parts.push(`${first.wwcd} WWCD${first.matches ? ` in ${first.matches} matches` : ''}`);
  return parts.join(' · ');
}

// ---------- header ----------

function Header({ t, lead }: { t: Tournament; lead?: Stage }) {
  const meta = [dateRange(t.start, t.end), t.city, t.organizer, t.teams ? `${t.teams} teams` : null]
    .filter(Boolean)
    .join(' · ');
  const line = finding(t, lead);
  return (
    <Card style={{ marginTop: space.lg, overflow: 'hidden' }}>
      <TournamentBanner ticker={shortName(t)} game={t.game} cover={t.cover} />
      <View style={ui.cardTop}>
        {t.status === 'ongoing' && <LiveDot />}
        <GameBadge game={t.game} />
        {t.tier && <Badge text={t.tier} color={t.tier === 'S-Tier' ? colors.gold : colors.muted} />}
        {t.type && <Badge text={t.type} />}
      </View>
      <View style={s.headRow}>
        <View style={{ flex: 1, minWidth: 220 }}>
          <Text style={[type.display, { color: colors.text }]} role="heading" aria-level={1}>
            {t.name}
          </Text>
          {line ? (
            <Text style={[ui.text, { marginTop: 6 }]}>{line}</Text>
          ) : t.winner ? (
            <View style={{ marginTop: 6 }}>
              <Winner name={t.winner} prefix="Champion: " />
            </View>
          ) : null}
          <Text style={[ui.muted, { color: colors.faint, marginTop: 6 }]}>{meta}</Text>
        </View>
        {t.prize ? (
          <View style={s.prize}>
            <Text style={[type.heading, { color: colors.text, fontSize: 22 }]}>{money(t.prize, t.currency)}</Text>
            <Text style={[ui.muted, { color: colors.faint }]}>prize pool</Text>
          </View>
        ) : null}
      </View>
    </Card>
  );
}

// ---------- points table + Finish vs Fight ----------

function TeamLink({ team, bold }: { team: TeamRef; bold?: boolean }) {
  return (
    <Link
      href={{ pathname: '/team/[id]', params: { id: team.id } }}
      style={[ui.text, bold && { fontFamily: fonts.bodyBold }]}
      numberOfLines={1}
    >
      {team.name}
    </Link>
  );
}

function StagesView({ stages, game, mode }: { stages: Stage[]; game: GameKey; mode: 'table' | 'matches' }) {
  const [sel, setSel] = useState<number | null>(null);
  const { width } = useWindowDimensions();
  const stage = stages.find((x) => x.id === sel) ?? stages[0];
  if (!stage) return <Empty text="Koi data nahi" />;
  const hasSplit = stage.standings.some((r) => r.placePts != null);
  const wide = width >= WIDE;
  return (
    <View>
      {stages.length > 1 && (
        <Pills small items={stages.map((x) => ({ key: x.id, label: x.title }))} value={stage.id} onChange={setSel} />
      )}
      {mode === 'matches' ? (
        <MatchList stage={stage} />
      ) : (
        <View style={wide ? s.grid : undefined}>
          <View style={wide ? { flex: 3, maxWidth: 760 } : undefined}>
            <Podium rows={stage.standings} />
            <StandingsTable stage={stage} game={game} />
          </View>
          {hasSplit && (
            <View style={wide ? { flex: 2, minWidth: 320 } : undefined}>
              <FinishVsFight stage={stage} game={game} limit={wide ? 16 : 8} />
            </View>
          )}
        </View>
      )}
    </View>
  );
}

function StandingsTable({ stage, game }: { stage: Stage; game: GameKey }) {
  // older tables only have some of these columns
  const has = (k: 'matches' | 'wwcd' | 'kills') => stage.standings.some((r) => r[k] != null);
  const { width } = useWindowDimensions();
  // on a phone the team name needs the room; when every team played the same number of
  // matches the count is already in the finding line, so the column can go
  const sameMatches = new Set(stage.standings.map((r) => r.matches)).size === 1;
  const [showM, showW, showK] = [has('matches') && !(width < 480 && sameMatches), has('wwcd'), has('kills')];
  // before the first result the order is only the page's list of teams: no ranks, no leader
  const started = stage.standings.some((r) => r.points != null);
  const hue = gameColors[game].hue;
  return (
    <Card style={{ paddingVertical: space.sm, paddingHorizontal: space.md, marginHorizontal: space.lg }}>
      <View style={[s.row, s.edge]}>
        <Text style={[s.rank, s.headText]}>#</Text>
        <Text style={[s.team, s.headText]}>Team</Text>
        {showM && <Text style={[s.num, s.headText]}>M</Text>}
        {showW && <Text style={[s.num, s.headText]}>Win</Text>}
        {showK && <Text style={[s.num, s.headText]}>Kills</Text>}
        <Text style={[s.pts, s.headText]}>Pts</Text>
      </View>
      {stage.standings.map((r, i) => (
        <View key={`${r.team.id}-${i}`} style={[s.row, s.ruled, started && i === 0 && { borderLeftColor: hue }]}>
          <Text style={[s.rank, { color: started ? placeColor(i + 1) : colors.faint }]}>{started ? i + 1 : '–'}</Text>
          <View style={[s.team, { flexDirection: 'row', alignItems: 'center', gap: space.sm }]}>
            <TeamAvatar name={r.team.name} size={28} />
            <View style={{ flex: 1 }}>
              <TeamLink team={r.team} bold={started && i === 0} />
            </View>
          </View>
          {showM && <Text style={s.num}>{r.matches ?? '–'}</Text>}
          {showW && <Text style={s.num}>{r.wwcd ?? '–'}</Text>}
          {showK && <Text style={s.num}>{r.kills ?? '–'}</Text>}
          <Text style={s.pts}>{r.points ?? '–'}</Text>
        </View>
      ))}
      {!stage.standings.some((r) => r.points != null) && (
        <Text style={[ui.muted, { color: colors.faint, paddingTop: space.md }]}>
          Abhi koi match nahi khela gaya. Points table pehle match ke result ke baad bharega.
        </Text>
      )}
      {stage.killPoints != null && (
        <Text style={[ui.muted, { color: colors.faint, paddingVertical: space.md }]}>
          {stage.killPoints} pt per kill
          {stage.placementPoints
            ? ' · placement ' + Object.entries(stage.placementPoints).slice(0, 8).map(([p, v]) => `#${p} ${v}`).join(', ')
            : ''}
          {stage.standings.some((r) => r.start) ? ' · totals include carry-over points' : ''}
        </Text>
      )}
    </Card>
  );
}

/** Signature element: each team's points split into survival (placement) and fights (kills). */
function FinishVsFight({ stage, game, limit }: { stage: Stage; game: GameKey; limit: number }) {
  const [all, setAll] = useState(false);
  const { hue, soft } = gameColors[game];
  const rows = stage.standings
    .filter((r) => r.placePts != null && r.killPts != null)
    .map((r) => ({ team: r.team, place: r.placePts!, kill: r.killPts!, total: r.placePts! + r.killPts! }))
    .sort((a, b) => b.total - a.total);
  const max = Math.max(...rows.map((r) => r.total), 1);
  const shown = all ? rows : rows.slice(0, limit);
  const carry = stage.standings.some((r) => r.start);
  return (
    <Card style={{ marginHorizontal: space.lg }}>
      <Text style={[type.heading, { color: colors.text }]}>Finish vs Fight</Text>
      <Text style={[ui.muted, { marginTop: 2 }]}>How each team scored: by surviving, or by killing</Text>
      <View style={s.legend}>
        <View style={s.legendItem}>
          <View style={[s.swatch, { backgroundColor: soft }]} />
          <Text style={ui.muted}>Placement</Text>
        </View>
        <View style={s.legendItem}>
          <View style={[s.swatch, { backgroundColor: hue }]} />
          <Text style={ui.muted}>Kills</Text>
        </View>
      </View>
      {shown.map((r) => (
        <View key={r.team.id} style={{ marginTop: space.md }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.sm }}>
            <Text style={[ui.text, { flex: 1 }]} numberOfLines={1}>
              {r.team.name}
            </Text>
            <Text style={[type.number, { color: colors.muted }]}>
              {r.place} + {r.kill}
            </Text>
          </View>
          <View style={s.track} accessibilityLabel={`${r.team.name}: ${r.place} placement points, ${r.kill} kill points`}>
            <View style={{ width: `${(r.place / max) * 100}%`, backgroundColor: soft }} />
            <View style={{ width: 2 }} />
            <View style={{ width: `${(r.kill / max) * 100}%`, backgroundColor: hue }} />
          </View>
        </View>
      ))}
      {rows.length > limit && (
        <Pressable onPress={() => setAll(!all)} style={s.more} accessibilityRole="button">
          <Text style={ui.link}>{all ? 'Kam dikhao' : `Sab ${rows.length} teams`}</Text>
        </Pressable>
      )}
      {carry && <Text style={[ui.muted, { color: colors.faint, marginTop: space.md }]}>Carry-over points not included</Text>}
    </Card>
  );
}

// ---------- matches ----------

function MatchList({ stage }: { stage: Stage }) {
  const [open, setOpen] = useState<number | null>(null);
  // played matches newest first, then the schedule of what is still to come
  const played = stage.matches.filter((m) => m.results.length).reverse();
  const upcoming = stage.matches.filter((m) => !m.results.length);
  return (
    <View>
      {upcoming.length ? (
        <Card style={{ paddingVertical: space.sm }}>
          <Text style={[ui.muted, { color: colors.faint, paddingVertical: space.xs }]}>
            {played.length ? 'Aage ke matches' : 'Schedule · results har match ke baad aayenge'}
          </Text>
          {upcoming.map((m, i) => (
            <View key={m.no} style={[s.row, i > 0 && s.ruled, { paddingLeft: 0, borderLeftWidth: 0 }]}>
              <Text style={[s.place, { color: colors.text }]}>M{m.no}</Text>
              <View style={{ flex: 1, alignItems: 'flex-start' }}>
                {m.map ? <MapChip map={m.map} /> : <Text style={ui.muted}>Map TBA</Text>}
              </View>
              <Text style={[ui.muted, { color: colors.faint }]}>{dateTime(m.at)}</Text>
            </View>
          ))}
        </Card>
      ) : null}
      {played.map((m) => {
        const winner = m.results.find((r) => r.place === 1);
        const topKills = [...m.results].sort((a, b) => b.kills - a.kills)[0];
        const expanded = open === m.no;
        return (
          <Pressable key={m.no} onPress={() => setOpen(expanded ? null : m.no)} accessibilityRole="button">
            <Card>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                  <Text style={[ui.cardTitle, { marginBottom: 0 }]}>Match {m.no}</Text>
                  <MapChip map={m.map} />
                </View>
                <Text style={[ui.muted, { color: colors.faint }]}>{dateTime(m.at)}</Text>
              </View>
              {winner && (
                <View style={s.matchLine}>
                  <ChickenIcon />
                  <Text style={ui.winner} numberOfLines={1}>
                    {winner.team.name} · {winner.kills} kills
                  </Text>
                </View>
              )}
              {topKills && (
                <View style={s.matchLine}>
                  <KillIcon />
                  <Text style={ui.muted} numberOfLines={1}>
                    Most kills: {topKills.team.name} – {topKills.kills}
                  </Text>
                </View>
              )}
              {expanded &&
                m.results.map((r, i) => (
                  <View key={`${r.team.id}-${i}`} style={[s.row, s.ruled, { paddingHorizontal: 0 }]}>
                    <Text style={[s.rank, { color: placeColor(r.place) }]}>{r.place}</Text>
                    <View style={s.team}>
                      <TeamLink team={r.team} />
                    </View>
                    <Text style={s.num}>{r.kills}K</Text>
                    <Text style={s.pts}>{r.points ?? '–'}</Text>
                  </View>
                ))}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: space.sm }}>
                <Text style={ui.link}>{expanded ? 'Kam dikhao' : 'Poora result'}</Text>
                <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={colors.link} />
              </View>
            </Card>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------- final results, squads ----------

function ResultsView({ t }: { t: Tournament }) {
  return (
    <Card style={{ paddingVertical: space.sm, paddingHorizontal: space.md }}>
      {t.placements.map((p, i) => (
        <View key={`${p.team.id}-${i}`} style={[s.row, i > 0 ? s.ruled : s.edge]}>
          <Text style={[s.place, { color: placeColor(p.place) }]}>{ordinal(p.place)}</Text>
          <View style={s.team}>
            <TeamLink team={p.team} bold={p.place <= 3} />
          </View>
          <Text style={[s.pts, { width: 90, color: colors.good }]}>{money(p.prize, t.currency) || '–'}</Text>
        </View>
      ))}
    </Card>
  );
}

function SquadsView({ t }: { t: Tournament }) {
  return (
    <View>
      {t.squads.map((sq, i) => (
        <Card key={`${sq.team.id}-${i}`}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.sm }}>
            <TeamAvatar name={sq.team.name} />
            <TeamLink team={sq.team} bold />
          </View>
          <SquadLine members={sq.players} />
        </Card>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  headRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', gap: space.lg, marginTop: space.xs },
  prize: { alignItems: 'flex-end' },
  grid: { flexDirection: 'row', alignItems: 'flex-start' },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 44, gap: space.xs, paddingLeft: space.xs },
  edge: { borderLeftWidth: 3, borderLeftColor: 'transparent' }, // room for the leader's hue mark
  ruled: { borderTopWidth: 1, borderTopColor: colors.rule, borderLeftWidth: 3, borderLeftColor: 'transparent' },
  headText: { fontFamily: fonts.body, color: colors.faint, fontSize: 12 },
  rank: { ...type.number, width: 24, color: colors.text, textAlign: 'center' },
  place: { ...type.number, width: 44 },
  team: { flex: 1, minWidth: 0 },
  num: { ...type.number, fontFamily: fonts.body, width: 36, textAlign: 'right', color: colors.muted },
  pts: { ...type.number, fontSize: 14, width: 40, textAlign: 'right', color: colors.text },
  legend: { flexDirection: 'row', gap: space.lg, marginTop: space.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 10, height: 10, borderRadius: 2 },
  track: { flexDirection: 'row', height: 8, marginTop: 6, borderRadius: 2, overflow: 'hidden' },
  more: { minHeight: 44, justifyContent: 'center', marginTop: space.sm },
  matchLine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
});
