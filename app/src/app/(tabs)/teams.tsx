// Teams — same direction as the Tournament screen: answer "who has won the most?" first,
// then one ruled table (rank, team, titles, events) with right-aligned tabular figures.
import { Link } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Empty, ErrorView, GameSwitcher, Loading, Screen, TeamAvatar, styles } from '@/components/ui';
import { api, useData } from '@/lib/api';
import { useGame } from '@/lib/game';
import { colors, fonts, gameColors, placeColor, space, type } from '@/lib/theme';
import type { TeamSummary } from '@/lib/types';

const PAGE = 50;

// Link asChild needs a single style object, not an array
const rowBase = { flexDirection: 'row' as const, alignItems: 'center' as const, gap: space.sm, minHeight: 52 };
const surface = { backgroundColor: colors.card, marginHorizontal: space.lg, paddingHorizontal: space.md };
const rowFirst = StyleSheet.flatten([surface, rowBase]);
const rowRuled = StyleSheet.flatten([surface, rowBase, { borderTopWidth: 1, borderTopColor: colors.rule }]);

export default function Teams() {
  const { game } = useGame();
  const { data, error, loading, reload } = useData(() => api.teams(), []);
  const [q, setQ] = useState('');
  const [shown, setShown] = useState(PAGE);

  const all = useMemo(() => (data ?? []).filter((t) => t.game === game), [data, game]);
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return all.map((t, i) => ({ ...t, rank: i + 1 })).filter((t) => !needle || t.name.toLowerCase().includes(needle));
  }, [all, q]);

  const top = all[0];
  const finding = top
    ? `${top.name} has the most titles: ${top.titles} from ${top.events} recorded results · ${all.length} teams`
    : null;
  const hue = gameColors[game].hue;

  return (
    <Screen>
      <FlatList
        data={loading || error ? [] : list.slice(0, shown)}
        keyExtractor={(t) => t.id}
        renderItem={({ item, index }) => <TeamRow t={item} first={index === 0} hue={hue} />}
        contentContainerStyle={{ paddingBottom: space.xl }}
        ListHeaderComponent={
          <View>
            <GameSwitcher />
            {finding && !q ? <Text style={[styles.text, s.finding]}>{finding}</Text> : null}
            <TextInput
              value={q}
              onChangeText={(v) => {
                setQ(v);
                setShown(PAGE);
              }}
              placeholder="Team search karein…"
              placeholderTextColor={colors.muted}
              accessibilityLabel="Search teams"
              style={styles.input}
            />
            <View style={[s.tableTop, rowBase, { minHeight: 36 }]}>
              <Text style={[s.rank, s.head]}>#</Text>
              <Text style={[s.head, { flex: 1 }]}>Team</Text>
              <Text style={[s.num, s.head]}>Titles</Text>
              <Text style={[s.num, s.head]}>Events</Text>
            </View>
          </View>
        }
        ListFooterComponent={
          list.length > shown ? (
            <Pressable onPress={() => setShown(shown + PAGE)} style={s.more} accessibilityRole="button">
              <Text style={styles.link}>Aur dikhao ({list.length - shown} baaki)</Text>
            </Pressable>
          ) : undefined
        }
        ListEmptyComponent={
          loading ? <Loading /> : error ? <ErrorView message={error} onRetry={reload} /> : <Empty text="Koi team nahi mili" />
        }
        style={{ backgroundColor: colors.bg }}
      />
    </Screen>
  );
}

function TeamRow({ t, first, hue }: { t: TeamSummary & { rank: number }; first: boolean; hue: string }) {
  return (
    <Link href={{ pathname: '/team/[id]', params: { id: t.id } }} asChild>
      <Pressable style={first ? rowFirst : rowRuled} android_ripple={{ color: colors.cardAlt }}>
        <Text style={[s.rank, { color: placeColor(t.rank) }]}>{t.rank}</Text>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <TeamAvatar name={t.name} size={28} />
          <Text style={[styles.text, t.rank === 1 && { fontFamily: fonts.bodyBold }]} numberOfLines={1}>
            {t.name}
          </Text>
        </View>
        <Text style={[s.num, { color: t.titles ? (t.rank === 1 ? hue : colors.text) : colors.faint }]}>{t.titles}</Text>
        <Text style={[s.num, { color: colors.muted, fontFamily: fonts.body }]}>{t.events}</Text>
      </Pressable>
    </Link>
  );
}

const s = StyleSheet.create({
  finding: { marginHorizontal: space.lg, marginBottom: space.md },
  // the table is drawn as one surface: header, then rows, on the card colour
  tableTop: { ...surface, borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  head: { fontFamily: fonts.body, color: colors.faint, fontSize: 12 },
  rank: { ...type.number, width: 28, textAlign: 'center' },
  num: { ...type.number, fontSize: 14, width: 52, textAlign: 'right' },
  more: { minHeight: 44, justifyContent: 'center', alignItems: 'center', marginTop: space.md },
});
