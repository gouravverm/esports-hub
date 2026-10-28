import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card, Pills, styles as ui } from '@/components/ui';
import { colors, fonts, placeColor, space, type } from '@/lib/theme';
import type { PlayerStatTable } from '@/lib/types';

const SHOW = 30;
const COL = 72;

/** Survival time is given in seconds on Liquipedia: 1219 -> 20:19. */
export function cell(column: string, value: string | null): string {
  if (value == null || value === '') return '–';
  if (/survival/i.test(column) && /^\d+$/.test(value)) {
    const s = Number(value);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }
  return value;
}

/** Tournament "Player stats" tab: pick a table (stage), scroll the columns sideways. */
export function PlayerStatsView({ tables }: { tables: PlayerStatTable[] }) {
  // the Grand Finals / Overall table first when there is one
  const preferred = tables.findIndex((t) => /grand final/i.test(t.title)) ;
  const [sel, setSel] = useState(preferred >= 0 ? preferred : 0);
  const [all, setAll] = useState(false);
  const table = tables[sel] ?? tables[0];
  const killCol = table.columns.findIndex((c) => /^finishes$/i.test(c)); // the ranking stat, set in bold
  // rank by finishes (the page's own order mixes in other tiebreakers)
  const ordered =
    killCol >= 0 ? [...table.rows].sort((a, b) => Number(b.values[killCol] ?? 0) - Number(a.values[killCol] ?? 0)) : table.rows;
  const rows = all ? ordered : ordered.slice(0, SHOW);
  return (
    <View>
      {tables.length > 1 && (
        <Pills small items={tables.map((t, i) => ({ key: i, label: t.title.replace(/ Finish Rankings$/, '') }))} value={sel} onChange={setSel} />
      )}
      <Card style={{ paddingHorizontal: 0, paddingVertical: space.sm }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View>
            <View style={[s.row, { minHeight: 36 }]}>
              <Text style={[s.rank, s.head]}>#</Text>
              <Text style={[s.player, s.head]}>Player</Text>
              {table.columns.map((c) => (
                <Text key={c} style={[s.num, s.head]} numberOfLines={2}>
                  {c}
                </Text>
              ))}
            </View>
            {rows.map((r, i) => (
              <View key={`${r.player.id}-${i}`} style={[s.row, s.ruled]}>
                <Text style={[s.rank, { color: placeColor(i + 1) }]}>{i + 1}</Text>
                <View style={s.player}>
                  <Link href={{ pathname: '/player/[id]', params: { id: r.player.id } }} style={[ui.text, i === 0 && { fontFamily: fonts.bodyBold }]} numberOfLines={1}>
                    {r.player.name}
                  </Link>
                  <Text style={[ui.muted, { color: colors.faint, fontSize: 12 }]} numberOfLines={1}>
                    {r.team.name}
                  </Text>
                </View>
                {r.values.map((v, j) => (
                  <Text key={j} style={[s.num, j === killCol && { color: colors.text, fontFamily: fonts.bodyBold }]}>
                    {cell(table.columns[j], v)}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
        {table.rows.length > SHOW && (
          <Pressable onPress={() => setAll(!all)} style={s.more} accessibilityRole="button">
            <Text style={ui.link}>{all ? 'Kam dikhao' : `Sab ${table.rows.length} players`}</Text>
          </Pressable>
        )}
      </Card>
      <Text style={[ui.muted, { color: colors.faint, marginHorizontal: space.lg }]}>
        Finishes = kills · FPM = finishes per match · Survival time in minutes
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 48, paddingHorizontal: space.md },
  ruled: { borderTopWidth: 1, borderTopColor: colors.rule },
  head: { fontFamily: fonts.body, color: colors.faint, fontSize: 11 },
  rank: { ...type.number, width: 28, textAlign: 'center', color: colors.text },
  player: { width: 140, paddingRight: space.sm },
  num: { ...type.number, fontFamily: fonts.body, width: COL, textAlign: 'right', color: colors.muted },
  more: { minHeight: 44, justifyContent: 'center', alignItems: 'center' },
});
