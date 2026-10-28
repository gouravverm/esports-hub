import { useMemo, useState } from 'react';
import { FlatList, TextInput, View } from 'react-native';

import { Empty, ErrorView, GameSwitcher, Loading, Pills, Screen, TournamentCard, styles } from '@/components/ui';
import { api, useData } from '@/lib/api';
import { useGame } from '@/lib/game';
import { colors } from '@/lib/theme';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'S-Tier', label: 'S-Tier' },
  { key: 'A-Tier', label: 'A-Tier' },
  { key: 'B-Tier', label: 'B-Tier' },
  { key: 'other', label: 'Others' },
];

export default function Tournaments() {
  const { game } = useGame();
  const { data, error, loading, reload } = useData(() => api.tournaments(game), [game]);
  const [tier, setTier] = useState('all');
  const [q, setQ] = useState('');

  const list = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    // live first, then upcoming soonest first, then finished newest first
    const rank = (s: string | null) => (s === 'ongoing' ? 0 : s === 'upcoming' ? 1 : 2);
    const ordered = [...(data ?? [])].sort((a, b) => {
      const r = rank(a.status) - rank(b.status);
      if (r) return r;
      const [x, y] = [a.start ?? '', b.start ?? ''];
      return a.status === 'upcoming' ? x.localeCompare(y) : y.localeCompare(x);
    });
    return ordered.filter((t) => {
      const tierOk =
        tier === 'all' || (tier === 'other' ? !['S-Tier', 'A-Tier', 'B-Tier'].includes(t.tier ?? '') : t.tier === tier);
      const hay = `${t.name} ${t.organizer ?? ''} ${t.start ?? ''}`.toLowerCase();
      return tierOk && words.every((w) => hay.includes(w));
    });
  }, [data, tier, q]);

  return (
    <Screen>
      <FlatList
        data={loading || error ? [] : list}
        keyExtractor={(t) => String(t.id)}
        renderItem={({ item }) => <TournamentCard t={item} />}
        ListHeaderComponent={
          <View>
            <GameSwitcher />
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="Search: naam, organizer, saal…"
              placeholderTextColor={colors.muted}
              accessibilityLabel="Search tournaments"
              style={styles.input}
            />
            <Pills items={FILTERS} value={tier} onChange={setTier} />
          </View>
        }
        ListEmptyComponent={
          loading ? <Loading /> : error ? <ErrorView message={error} onRetry={reload} /> : <Empty text="Koi tournament nahi mila" />
        }
      />
    </Screen>
  );
}
