import { Link } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Empty, ErrorView, GameSwitcher, Loading, Screen, TeamAvatar, Winner, styles } from '@/components/ui';
import { api, useData } from '@/lib/api';
import { useGame } from '@/lib/game';
import { colors, space } from '@/lib/theme';

// Link asChild needs a single style object, not an array
const row = StyleSheet.flatten([
  styles.card,
  { flexDirection: 'row' as const, alignItems: 'center' as const, gap: space.md, paddingVertical: space.md },
]);

export default function Teams() {
  const { game } = useGame();
  const { data, error, loading, reload } = useData(() => api.teams(), []);
  const [q, setQ] = useState('');

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data ?? []).filter((t) => t.game === game && (!needle || t.name.toLowerCase().includes(needle))).slice(0, 200);
  }, [data, game, q]);

  return (
    <Screen>
      <FlatList
        data={loading || error ? [] : list}
        keyExtractor={(t) => t.id}
        renderItem={({ item }) => (
          <Link href={{ pathname: '/team/[id]', params: { id: item.id } }} asChild>
            <Pressable style={row}>
              <TeamAvatar name={item.name} size={40} />
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.muted}>{item.events} results recorded</Text>
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
              placeholder="Team search karein…"
              placeholderTextColor={colors.muted}
              accessibilityLabel="Search teams"
              style={[styles.input, { marginBottom: space.md }]}
            />
          </View>
        }
        ListEmptyComponent={
          loading ? <Loading /> : error ? <ErrorView message={error} onRetry={reload} /> : <Empty text="Koi team nahi mili" />
        }
      />
    </Screen>
  );
}
