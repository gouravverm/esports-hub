import { Link, Stack, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card, ErrorView, GameBadge, Loading, Screen, SectionTitle, SourceNote, TeamAvatar, styles as ui } from '@/components/ui';
import { api, useData } from '@/lib/api';
import { date, money, ordinal } from '@/lib/format';
import { colors, placeColor, space, type } from '@/lib/theme';

// Link asChild needs a single style object, not an array
const historyRow = StyleSheet.flatten([
  ui.card,
  { flexDirection: 'row' as const, alignItems: 'center' as const, gap: space.md },
]);

export default function TeamScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error, loading, reload } = useData(() => api.team(id), [id]);

  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorView message={error ?? 'no data'} onRetry={reload} />;

  const stats: [string, string | number][] = [
    ['Titles', data.titles],
    ['Podiums', data.podiums],
    ['Events', data.history.length],
    ['Earnings', money(data.earnings) || '-'],
  ];

  return (
    <Screen>
      <Stack.Screen options={{ title: data.name }} />
      <ScrollView>
        <Card style={{ marginTop: space.lg, alignItems: 'center' }}>
          <TeamAvatar name={data.name} size={72} />
          <Text style={[ui.cardTitle, { fontSize: 22, marginTop: space.md }]}>{data.name}</Text>
          <GameBadge game={data.game} />
          <View style={{ flexDirection: 'row', marginTop: space.lg, width: '100%' }}>
            {stats.map(([k, v]) => (
              <View key={k} style={{ flex: 1, alignItems: 'center' }}>
                <Text style={[type.heading, { color: colors.text }]}>{v}</Text>
                <Text style={ui.muted}>{k}</Text>
              </View>
            ))}
          </View>
        </Card>

        {data.squad && (
          <>
            <SectionTitle>Latest squad</SectionTitle>
            <Card>
              <Text style={[ui.muted, { marginBottom: 6 }]}>{data.squad.tournament}</Text>
              {data.squad.players.map((p, i) => (
                <Text key={`${p.player}-${i}`} style={[ui.text, { paddingVertical: 3 }]}>
                  {p.player}
                  {p.role !== 'player' ? <Text style={ui.muted}> · {p.role}</Text> : null}
                </Text>
              ))}
            </Card>
          </>
        )}

        <SectionTitle>Results history</SectionTitle>
        {data.history.map((h, i) => (
          <Link key={`${h.id}-${i}`} href={{ pathname: '/tournament/[id]', params: { id: String(h.id) } }} asChild>
            <Pressable style={historyRow}>
              <Text style={[type.number, { color: placeColor(h.place), width: 44 }]}>{ordinal(h.place)}</Text>
              <View style={{ flex: 1 }}>
                <Text style={ui.text} numberOfLines={2}>
                  {h.name}
                </Text>
                <Text style={ui.muted}>{[date(h.start), h.tier].filter(Boolean).join(' · ')}</Text>
              </View>
              {h.prize ? <Text style={ui.prize}>{money(h.prize, h.currency)}</Text> : null}
            </Pressable>
          </Link>
        ))}
        <SourceNote />
      </ScrollView>
    </Screen>
  );
}
