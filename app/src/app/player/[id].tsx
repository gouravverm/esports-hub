import { Link, Stack, useLocalSearchParams } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Badge, Card, ErrorView, GameBadge, Loading, Screen, SectionTitle, SourceNote, TeamAvatar, styles as ui } from '@/components/ui';
import { api, useData } from '@/lib/api';
import { age, date, money, ordinal } from '@/lib/format';
import { colors, placeColor, space, type } from '@/lib/theme';

const LINK_LABEL: Record<string, string> = {
  instagram: 'Instagram', youtube: 'YouTube', twitter: 'X', twitch: 'Twitch', facebook: 'Facebook', kick: 'Kick',
};

// Link asChild needs a single style object, not an array
const eventRow = StyleSheet.flatten([ui.card, { flexDirection: 'row' as const, alignItems: 'center' as const, gap: space.md }]);

export default function PlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: p, error, loading, reload } = useData(() => api.player(id), [id]);

  if (loading && !p) return <Loading />;
  if (error || !p) return <ErrorView message={error ?? 'no data'} onRetry={reload} />;

  const years = age(p.birthDate);
  const facts = [
    ['Real name', [p.name, p.nativeName].filter(Boolean).join(' · ')],
    ['Age', years != null ? `${years} (born ${date(p.birthDate)})` : null],
    ['Country', p.country],
    ['Role', p.roles],
    ['Status', p.status],
    ['Active', p.yearsActive],
  ].filter(([, v]) => v) as [string, string][];
  const stats: [string, string | number][] = [
    ['Titles', p.titles],
    ['Podiums', p.podiums],
    ['Events', p.events],
    ['Team winnings', money(p.teamWinnings) || '–'],
  ];

  return (
    <Screen>
      <Stack.Screen options={{ title: p.tag }} />
      <ScrollView>
        <Card style={{ marginTop: space.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <TeamAvatar name={p.tag} size={56} />
            <View style={{ flex: 1 }}>
              <Text style={[type.display, { color: colors.text }]} role="heading" aria-level={1}>
                {p.tag}
              </Text>
              <View style={[ui.cardTop, { marginTop: 4, marginBottom: 0 }]}>
                <GameBadge game={p.game} />
                {p.status ? <Badge text={p.status} color={p.status === 'Active' ? colors.good : colors.muted} /> : null}
              </View>
            </View>
          </View>
          <Link href={{ pathname: '/team/[id]', params: { id: p.currentTeam.id } }} style={[ui.text, { marginTop: space.md }]}>
            {p.lastRole === 'coach' ? 'Coach' : 'Latest team'}: {p.currentTeam.name}
          </Link>
          <View style={{ marginTop: space.md, gap: 6 }}>
            {facts.map(([k, v]) => (
              <View key={k} style={{ flexDirection: 'row' }}>
                <Text style={[ui.muted, { width: 90, color: colors.faint }]}>{k}</Text>
                <Text style={[ui.text, { flex: 1 }]}>{v}</Text>
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', marginTop: space.lg }}>
            {stats.map(([k, v]) => (
              <View key={k} style={{ flex: 1 }}>
                <Text style={[type.heading, { color: colors.text }]}>{v}</Text>
                <Text style={[ui.muted, { color: colors.faint }]}>{k}</Text>
              </View>
            ))}
          </View>
          <Text style={[ui.muted, { color: colors.faint, marginTop: space.sm }]}>
            Team winnings = prize money won by the player's teams in events they played, not a personal share.
          </Text>
          {Object.keys(p.links).length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.lg, marginTop: space.md }}>
              {Object.entries(p.links).map(([k, url]) => (
                <Pressable key={k} onPress={() => Linking.openURL(url)} accessibilityRole="link" style={{ minHeight: 44, justifyContent: 'center' }}>
                  <Text style={ui.link}>{LINK_LABEL[k] ?? k}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </Card>

        <SectionTitle>Team history</SectionTitle>
        <Card style={{ paddingVertical: space.sm }}>
          {p.timeline.map((s, i) => (
            <View key={`${s.team.id}-${i}`} style={[st.row, i > 0 && st.ruled]}>
              <TeamAvatar name={s.team.name} size={28} />
              <View style={{ flex: 1 }}>
                <Link href={{ pathname: '/team/[id]', params: { id: s.team.id } }} style={ui.text} numberOfLines={1}>
                  {s.team.name}
                </Link>
                <Text style={[ui.muted, { color: colors.faint }]}>
                  {s.from === s.to ? date(s.from) : `${date(s.from)} – ${date(s.to)}`} · {s.events} event{s.events > 1 ? 's' : ''}
                </Text>
              </View>
            </View>
          ))}
        </Card>

        <SectionTitle>Tournaments</SectionTitle>
        {p.tournaments.map((e, i) => (
          <Link key={`${e.id}-${i}`} href={{ pathname: '/tournament/[id]', params: { id: String(e.id) } }} asChild>
            <Pressable style={eventRow}>
              <Text style={[type.number, { color: e.place ? placeColor(e.place) : colors.faint, width: 44 }]}>
                {e.place ? ordinal(e.place) : '–'}
              </Text>
              <View style={{ flex: 1 }}>
                <Text style={ui.text} numberOfLines={2}>
                  {e.name}
                </Text>
                <Text style={[ui.muted, { color: colors.faint }]} numberOfLines={1}>
                  {[date(e.start), e.team.name, e.role !== 'player' ? e.role : null].filter(Boolean).join(' · ')}
                </Text>
              </View>
              {e.prize ? <Text style={ui.prize}>{money(e.prize, e.currency)}</Text> : null}
            </Pressable>
          </Link>
        ))}
        <SourceNote />
      </ScrollView>
    </Screen>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 52 },
  ruled: { borderTopWidth: 1, borderTopColor: colors.rule },
});
