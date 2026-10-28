import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Badge, LiveDot, styles as ui } from '@/components/ui';
import { ago } from '@/lib/format';
import { colors, fonts, radius, space } from '@/lib/theme';
import type { Video } from '@/lib/types';

/** One YouTube stream or upload; opens in YouTube (official player, its own ads and rules). */
export function VideoCard({ v, width }: { v: Video; width?: number }) {
  const when = v.status === 'upcoming' ? `starts ${ago(v.at)}` : v.status === 'live' ? `started ${ago(v.at)}` : ago(v.at);
  return (
    <Pressable
      onPress={() => Linking.openURL(v.url)}
      style={({ pressed }) => [s.card, width ? { width } : null, pressed && { opacity: 0.8 }]}
      accessibilityRole="link"
      accessibilityLabel={`${v.title}, ${v.channel ?? 'YouTube'}`}
    >
      <View style={s.thumbWrap}>
        {v.thumb ? <Image source={{ uri: v.thumb }} style={s.thumb} resizeMode="cover" /> : null}
        <View style={s.thumbBadge}>
          {v.status === 'live' ? <LiveDot /> : v.status === 'upcoming' ? <Badge text="Upcoming" color={colors.text} /> : null}
        </View>
      </View>
      <View style={{ padding: space.md, gap: 4 }}>
        <Text style={[ui.text, { fontFamily: fonts.bodyBold }]} numberOfLines={2}>
          {v.title}
        </Text>
        <Text style={[ui.muted, { color: colors.faint }]} numberOfLines={1}>
          {[v.channel, when].filter(Boolean).join(' · ')}
        </Text>
        {v.tournament ? (
          <Text style={ui.muted} numberOfLines={1}>
            {v.tournament.name}
          </Text>
        ) : null}
        {v.languages?.length ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: space.md }}>
            <Text style={[ui.muted, { color: colors.faint }]}>{v.language}</Text>
            {v.languages.map((l) => (
              <Pressable
                key={l.url}
                onPress={() => Linking.openURL(l.url)}
                accessibilityRole="link"
                hitSlop={{ top: 12, bottom: 12, left: 6, right: 6 }}
              >
                <Text style={ui.link}>{l.language}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

/** A sideways row of video cards (Home). */
export function VideoRow({ videos }: { videos: Video[] }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space.lg, gap: space.md }}>
      {videos.map((v) => (
        <VideoCard key={v.id} v={v} width={260} />
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius, overflow: 'hidden' },
  thumbWrap: { aspectRatio: 16 / 9, backgroundColor: colors.cardAlt },
  thumb: { width: '100%', height: '100%' },
  thumbBadge: { position: 'absolute', top: space.sm, left: space.sm, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 6 },
});
