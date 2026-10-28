import { Link } from 'expo-router';
import { RefreshControl, ScrollView, Text } from 'react-native';

import {
  Empty,
  ErrorView,
  GameSwitcher,
  Loading,
  Screen,
  SectionTitle,
  SourceNote,
  TournamentCard,
  styles,
} from '@/components/ui';
import { VideoRow } from '@/components/video';
import { api, useData } from '@/lib/api';
import { useGame } from '@/lib/game';
import { colors } from '@/lib/theme';

export default function Home() {
  const { game } = useGame();
  const { data, error, loading, reload } = useData((fresh) => api.index(fresh), []);

  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorView message={error ?? 'no data'} onRetry={reload} />;

  const g = data.games[game];

  return (
    <Screen>
      <ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={colors.link} />}>
        <GameSwitcher />

        {g.streams?.length ? (
          <>
            <SectionTitle>Streams</SectionTitle>
            <VideoRow videos={g.streams} />
          </>
        ) : null}

        <SectionTitle>Live now</SectionTitle>
        {g.live.length ? g.live.map((t) => <TournamentCard key={t.id} t={t} />) : <Empty text="Abhi koi tournament live nahi hai" />}

        <SectionTitle>Upcoming</SectionTitle>
        {g.upcoming.length ? (
          g.upcoming.map((t) => <TournamentCard key={t.id} t={t} />)
        ) : (
          <Empty text="Koi upcoming tournament list nahi hua" />
        )}

        <SectionTitle
          right={
            <Link href="/tournaments" style={[styles.link, { paddingVertical: 12, paddingLeft: 12 }]}>
              Sab dekho
            </Link>
          }
        >
          Recent results
        </SectionTitle>
        {g.recent.map((t) => (
          <TournamentCard key={t.id} t={t} />
        ))}

        {g.videos?.length ? (
          <>
            <SectionTitle>Latest videos</SectionTitle>
            <VideoRow videos={g.videos} />
          </>
        ) : null}

        <Text style={[styles.muted, { textAlign: 'center', marginTop: 8 }]}>
          {g.count} tournaments · updated {data.updated.slice(0, 10)}
        </Text>
        <SourceNote />
      </ScrollView>
    </Screen>
  );
}
