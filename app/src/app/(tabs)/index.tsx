// Home — the same direction as the Tournament screen (design-system/esports-hub/pages/tournament.md):
// answer "what is on now, or next?" first, colour only on data, lists as ruled rows in one card.
import { Link } from 'expo-router';
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  Badge,
  Card,
  EventRow,
  ErrorView,
  GameBadge,
  GameSwitcher,
  LiveDot,
  Loading,
  Screen,
  SectionTitle,
  SourceNote,
  styles,
} from '@/components/ui';
import { VideoRow } from '@/components/video';
import { api, useData } from '@/lib/api';
import { dateRange, money } from '@/lib/format';
import { useGame } from '@/lib/game';
import { colors, space, type } from '@/lib/theme';
import type { TournamentSummary, Video } from '@/lib/types';

/** "Starts in 2 days", "Starts today", "Day 2 of 3". */
function when(t: TournamentSummary): string {
  if (!t.start) return 'Dates TBA';
  const day = (iso: string) => new Date(iso.slice(0, 10) + 'T00:00:00').getTime();
  const today = new Date(new Date().toDateString()).getTime();
  const d = Math.round((day(t.start) - today) / 86400000);
  if (t.status === 'ongoing') {
    const total = t.end && /^\d{4}-\d{2}-\d{2}$/.test(t.end) ? Math.round((day(t.end) - day(t.start)) / 86400000) + 1 : null;
    return total ? `Day ${1 - d} of ${total}` : 'On now';
  }
  if (d <= 0) return 'Starts today';
  return d === 1 ? 'Starts tomorrow' : `Starts in ${d} days`;
}

function Lead({ t, streams }: { t: TournamentSummary; streams: Video[] }) {
  const stream = streams.find((v) => v.tournament?.id === t.id);
  return (
    <Card style={{ marginTop: space.md }}>
      <View style={styles.cardTop}>
        {t.status === 'ongoing' ? <LiveDot /> : <Badge text={t.status === 'upcoming' ? 'Next up' : 'Latest'} color={colors.text} />}
        <GameBadge game={t.game} />
        {t.tier ? <Badge text={t.tier} color={t.tier === 'S-Tier' ? colors.gold : colors.muted} /> : null}
      </View>
      <Link href={{ pathname: '/tournament/[id]', params: { id: String(t.id) } }} style={[type.display, { color: colors.text }]}>
        {t.name}
      </Link>
      <Text style={[styles.text, { marginTop: 6 }]}>
        {when(t)} · {dateRange(t.start, t.end)}
      </Text>
      <Text style={[styles.muted, { color: colors.faint, marginTop: 2 }]}>
        {[t.organizer, t.city, t.type].filter(Boolean).join(' · ')}
      </Text>
      <View style={s.leadFoot}>
        {t.prize ? (
          <View>
            <Text style={[type.heading, { color: colors.text, fontSize: 20 }]}>{money(t.prize, t.currency)}</Text>
            <Text style={[styles.muted, { color: colors.faint }]}>prize pool</Text>
          </View>
        ) : (
          <View />
        )}
        {stream ? (
          <Pressable onPress={() => Linking.openURL(stream.url)} style={s.watch} accessibilityRole="link">
            <Text style={s.watchText}>{stream.status === 'live' ? 'Watch live' : 'Stream link'}</Text>
          </Pressable>
        ) : null}
      </View>
    </Card>
  );
}

export default function Home() {
  const { game } = useGame();
  const { data, error, loading, reload } = useData((fresh) => api.index(fresh), []);

  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorView message={error ?? 'no data'} onRetry={reload} />;

  const g = data.games[game];
  const streams = g.streams ?? [];
  const lead = g.live[0] ?? g.upcoming[0] ?? g.recent[0];
  const upcoming = [...g.live.slice(1), ...g.upcoming.filter((t) => t.id !== lead?.id)].slice(0, 6);

  return (
    <Screen>
      <ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={colors.link} />}>
        <GameSwitcher />

        {lead ? <Lead t={lead} streams={streams} /> : null}

        {streams.length ? (
          <>
            <SectionTitle>Streams</SectionTitle>
            <VideoRow videos={streams} />
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
            <Link href="/tournaments" style={[styles.link, { paddingVertical: 12, paddingLeft: 12 }]}>
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
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  list: { paddingVertical: space.xs },
  leadFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: space.lg },
  watch: { backgroundColor: colors.primary, borderRadius: 18, minHeight: 36, paddingHorizontal: space.lg, justifyContent: 'center' },
  watchText: { color: colors.onPrimary, fontFamily: 'ChakraPetch_700Bold', fontSize: 14 },
});
