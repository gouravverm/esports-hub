import { Link } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { PlayerBadge } from '@/components/graphics';
import { Empty, ErrorView, GameSwitcher, Loading, Screen, Winner, styles } from '@/components/ui';
import { api, useData } from '@/lib/api';
import { useGame } from '@/lib/game';
import { colors, space } from '@/lib/theme';

// Link asChild needs a single style object, not an array
const row = StyleSheet.flatten([
  styles.card,
  { flexDirection: 'row' as const, alignItems: 'center' as const, gap: space.md, paddingVertical: space.md },
]);

export default function Players() {
  const { game } = useGame();
  const { data, error, loading, reload } = useData(() => api.players(), []);
  const [q, setQ] = useState('');

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data ?? [])
      .filter((p) => p.game === game || (game === 'bgmi' && p.game === 'pubgm'))
      .filter((p) => !needle || p.tag.toLowerCase().includes(needle) || (p.name ?? '').toLowerCase().includes(needle))
      .slice(0, 200);
  }, [data, game, q]);

  return (
    <Screen>
      <FlatList
        data={loading || error ? [] : list}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => (
          <Link href={{ pathname: '/player/[id]', params: { id: item.id } }} asChild>
            <Pressable style={row}>
              <PlayerBadge name={item.tag} size={40} />
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{item.tag}</Text>
                <Text style={styles.muted} numberOfLines={1}>
                  {[item.name, item.team].filter(Boolean).join(' · ')}
                </Text>
              </View>
              {item.titles ? <Winner name={String(item.titles)} /> : null}
            </Pressable>
          </Link>
        )}
        ListHeaderComponent={
          <View>
            <GameSwitcher />
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="Player ka naam ya asli naam…"
              placeholderTextColor={colors.muted}
              accessibilityLabel="Search players"
              style={styles.input}
            />
          </View>
        }
        ListEmptyComponent={
          loading ? <Loading /> : error ? <ErrorView message={error} onRetry={reload} /> : <Empty text="Koi player nahi mila" />
        }
      />
    </Screen>
  );
}
