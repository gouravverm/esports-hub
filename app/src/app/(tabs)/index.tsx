// Home: a swipeable hero of live / next / latest big events, then streams, the top fraggers and
// teams of the game, and compact lists of what is coming up and what just finished.
import { Link } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet, Text } from 'react-native';

import { AdBanner } from '@/components/AdBanner';
import { HeroCarousel, TopFraggers, TopTeams } from '@/components/showcase';
import { Card, EventRow, ErrorView, GameSwitcher, Loading, Screen, SectionTitle, SourceNote, styles } from '@/components/ui';
import { VideoRow } from '@/components/video';
import { api, useData } from '@/lib/api';
import { useGame } from '@/lib/game';
import { colors, space } from '@/lib/theme';
import type { TournamentSummary } from '@/lib/types';

const BIG = ['S-Tier', 'A-Tier'];

export default function Home() {
  const { game } = useGame();
  const { data, error, loading, reload } = useData((fresh) => api.index(fresh), []);

  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorView message={error ?? 'no data'} onRetry={reload} />;

  const g = data.games[game];
  // hero: everything live, the next two, then the latest big finals; no repeats, six at most
  const seen = new Set<number>();
  const hero = [...g.live, ...g.upcoming.slice(0, 2), ...g.recent.filter((t) => BIG.includes(t.tier ?? '')).slice(0, 3)]
    .filter((t: TournamentSummary) => !seen.has(t.id) && seen.add(t.id))
    .slice(0, 6);
  const upcoming = g.upcoming.filter((t) => !hero.slice(0, 3).some((h) => h.id === t.id)).slice(0, 6);
  const streams = g.streams ?? [];

  return (
    <Screen>
      <ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={colors.link} />}>
        <GameSwitcher />

        {hero.length ? <HeroCarousel items={hero} /> : null}

        {streams.length ? (
          <>
            <SectionTitle>Streams</SectionTitle>
            <VideoRow videos={streams} />
          </>
        ) : null}

        {g.topFraggers?.length ? (
          <>
            <SectionTitle
              right={
                <Link href="/players" style={[styles.link, s.more]}>
                  Players
                </Link>
              }
            >
              Top fraggers
            </SectionTitle>
            <TopFraggers players={g.topFraggers} />
          </>
        ) : null}

        <AdBanner />

        {g.topTeams?.length ? (
          <>
            <SectionTitle
              right={
                <Link href="/teams" style={[styles.link, s.more]}>
                  Teams
                </Link>
              }
            >
              Most titles
            </SectionTitle>
            <TopTeams teams={g.topTeams} />
          </>
        ) : null}

        {upcoming.length ? (
          <>
            <SectionTitle>Coming up</SectionTitle>
            <Card style={s.list}>
              {upcoming.map((t, i) => (
                <EventRow key={t.id} t={t} first={i === 0} />
              ))}
            </Card>
          </>
        ) : null}

        <SectionTitle
          right={
            <Link href="/tournaments" style={[styles.link, s.more]}>
              Sab dekho
            </Link>
          }
        >
          Recent results
        </SectionTitle>
        <Card style={s.list}>
          {g.recent.slice(0, 8).map((t, i) => (
            <EventRow key={t.id} t={t} first={i === 0} />
          ))}
        </Card>

        <AdBanner />

        {g.videos?.length ? (
          <>
            <SectionTitle>Latest videos</SectionTitle>
            <VideoRow videos={g.videos} />
          </>
        ) : null}

        <Text style={[styles.muted, { color: colors.faint, textAlign: 'center', marginTop: space.lg }]}>
          {g.count} tournaments · updated {data.updated.slice(0, 16).replace('T', ' ')} UTC
        </Text>
        <SourceNote />
        <Link href="/privacy" style={[styles.muted, { color: colors.faint, textAlign: 'center', paddingBottom: space.xl }]}>
          Privacy policy
        </Link>
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  list: { paddingVertical: space.xs },
  more: { paddingVertical: 12, paddingLeft: 12 },
});
