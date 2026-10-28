// Team page — same direction as the Tournament screen: object header with one finding line,
// colour only on data (ranks, the game hue on titles), history as ruled rows in one card.
import { Link, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  Card,
  ErrorView,
  GameBadge,
  Loading,
  Pills,
  Screen,
  SectionTitle,
  SourceNote,
  SquadLine,
  TeamAvatar,
  styles as ui,
} from '@/components/ui';
import { api, useData } from '@/lib/api';
import { date, money, ordinal } from '@/lib/format';
import { colors, gameColors, placeColor, space, type } from '@/lib/theme';

type Filter = 'all' | 'titles' | 'podiums';

// Link asChild needs a single style object, not an array
const rowBase = { flexDirection: 'row' as const, alignItems: 'center' as const, gap: space.md, minHeight: 56, paddingVertical: space.sm };
const rowFirst = StyleSheet.flatten([rowBase]);
const rowRuled = StyleSheet.flatten([rowBase, { borderTopWidth: 1, borderTopColor: colors.rule }]);

export default function TeamScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error, loading, reload } = useData(() => api.team(id), [id]);
  const [filter, setFilter] = useState<Filter>('all');

  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorView message={error ?? 'no data'} onRetry={reload} />;

  const hue = gameColors[data.game].hue;
  const last = data.history[0];
  const finding = [
    `${data.titles} title${data.titles === 1 ? '' : 's'} and ${data.podiums} podium${data.podiums === 1 ? '' : 's'} in ${data.history.length} results`,
    last ? `latest: ${ordinal(last.place)} at ${last.name}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const stats: [string, string | number, string?][] = [
    ['Titles', data.titles, data.titles ? hue : undefined],
    ['Podiums', data.podiums],
    ['Events', data.history.length],
    ['Prize money', money(data.earnings) || '–'],
  ];
  const rows = data.history.filter((h) => (filter === 'titles' ? h.place === 1 : filter === 'podiums' ? h.place <= 3 : true));

  return (
    <Screen game={data.game}>
      <Stack.Screen options={{ title: data.name }} />
      <ScrollView>
        <Card style={{ marginTop: space.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <TeamAvatar name={data.name} size={56} />
            <View style={{ flex: 1 }}>
              <Text style={[type.display, { color: colors.text }]} role="heading" aria-level={1}>
                {data.name}
              </Text>
              <View style={[ui.cardTop, { marginTop: 4, marginBottom: 0 }]}>
                <GameBadge game={data.game} />
              </View>
            </View>
          </View>
          <Text style={[ui.text, { marginTop: space.md }]}>{finding}</Text>
          <View style={{ flexDirection: 'row', marginTop: space.lg }}>
            {stats.map(([k, v, c]) => (
              <View key={k} style={{ flex: 1 }}>
                <Text style={[type.heading, { color: c ?? colors.text }]}>{v}</Text>
                <Text style={[ui.muted, { color: colors.faint }]}>{k}</Text>
              </View>
            ))}
          </View>
          <Text style={[ui.muted, { color: colors.faint, marginTop: space.sm }]}>Prize money counts INR prizes only.</Text>
        </Card>

        {data.squad && (
          <>
            <SectionTitle>Latest squad</SectionTitle>
            <Card>
              <Text style={[ui.muted, { color: colors.faint, marginBottom: space.sm }]}>{data.squad.tournament}</Text>
              <SquadLine members={data.squad.players} />
            </Card>
          </>
        )}

        <SectionTitle>Results history</SectionTitle>
        <Pills
          small
          items={[
            { key: 'all' as Filter, label: `All ${data.history.length}` },
            { key: 'titles' as Filter, label: `Titles ${data.titles}` },
            { key: 'podiums' as Filter, label: `Podiums ${data.podiums}` },
          ]}
          value={filter}
          onChange={setFilter}
        />
        <Card style={{ paddingVertical: space.xs }}>
          {rows.map((h, i) => (
            <Link key={`${h.id}-${i}`} href={{ pathname: '/tournament/[id]', params: { id: String(h.id) } }} asChild>
              <Pressable style={i === 0 ? rowFirst : rowRuled} android_ripple={{ color: colors.cardAlt }}>
                <Text style={[type.number, { color: placeColor(h.place), width: 44 }]}>{ordinal(h.place)}</Text>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={ui.text} numberOfLines={2}>
                    {h.name}
                  </Text>
                  <Text style={[ui.muted, { color: colors.faint }]}>{[date(h.start), h.tier].filter(Boolean).join(' · ')}</Text>
                </View>
                {h.prize ? <Text style={[type.number, { color: colors.good }]}>{money(h.prize, h.currency)}</Text> : null}
              </Pressable>
            </Link>
          ))}
          {!rows.length ? <Text style={[ui.muted, { paddingVertical: space.md }]}>Is filter me koi result nahi</Text> : null}
        </Card>
        <SourceNote />
      </ScrollView>
    </Screen>
  );
}
