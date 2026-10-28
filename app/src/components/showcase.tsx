// Home showcase pieces: the app wordmark, the swipeable hero carousel, top teams / fraggers strips,
// and the podium used on tournament pages. All art is drawn here, no team or publisher logos.
import { Link } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { ChickenIcon, KillIcon, LivePulse, PlayerBadge, shortName, TeamCrest, TournamentBanner } from '@/components/graphics';
import { dateRange, money } from '@/lib/format';
import { useGame } from '@/lib/game';
import { colors, fonts, gameColors, radius, space, type } from '@/lib/theme';
import type { PlayerSummary, Standing, TeamSummary, TournamentSummary } from '@/lib/types';

// ---------- wordmark ----------

/** App mark: a shield in the brand violet with a crosshair, and the name with HUB in the game's colour. */
export function Wordmark() {
  const { game } = useGame();
  const hue = gameColors[game].hue;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }} accessibilityRole="header" accessibilityLabel="Esports Hub">
      <Svg width={26} height={28} viewBox="0 0 100 108">
        <Defs>
          <LinearGradient id="mark" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors.brand} />
            <Stop offset="1" stopColor="#3B1A8A" />
          </LinearGradient>
        </Defs>
        <Path d="M50 4 L92 18 L88 62 Q80 88 50 104 Q20 88 12 62 L8 18 Z" fill="url(#mark)" stroke={hue} strokeWidth={5} />
        <Path d="M50 30 L50 44 M50 64 L50 78 M26 54 L40 54 M60 54 L74 54" stroke="#fff" strokeWidth={6} strokeLinecap="round" />
        <Path d="M50 54 m-11 0 a11 11 0 1 0 22 0 a11 11 0 1 0 -22 0" stroke="#fff" strokeWidth={5} fill="none" />
      </Svg>
      <Text style={{ fontFamily: fonts.display, fontSize: 19, color: colors.text, letterSpacing: 0.5 }}>
        ESPORTS <Text style={{ color: hue }}>HUB</Text>
      </Text>
    </View>
  );
}

// ---------- hero carousel ----------

function status(t: TournamentSummary): { label: string; live?: boolean } {
  if (t.status === 'ongoing') return { label: 'LIVE', live: true };
  if (t.status === 'upcoming' && t.start) {
    const d = Math.round((new Date(t.start.slice(0, 10) + 'T00:00:00').getTime() - new Date(new Date().toDateString()).getTime()) / 86400000);
    return { label: d <= 0 ? 'Today' : d === 1 ? 'Tomorrow' : `In ${d} days` };
  }
  return { label: t.winner ? 'Champion' : 'Finished' };
}

/** Big swipeable cards: live, next and the latest big finals, each on its own key art. */
export function HeroCarousel({ items }: { items: TournamentSummary[] }) {
  const { width } = useWindowDimensions();
  const cardW = Math.min(width, 720) - space.lg * 2;
  const [page, setPage] = useState(0);
  return (
    <View>
      <FlatList
        horizontal
        data={items}
        keyExtractor={(t) => String(t.id)}
        showsHorizontalScrollIndicator={false}
        snapToInterval={cardW + space.md}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: space.lg, gap: space.md }}
        onScroll={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / (cardW + space.md)))}
        scrollEventThrottle={32}
        renderItem={({ item: t }) => {
          const st = status(t);
          const hue = gameColors[t.game].hue;
          return (
            <Link href={{ pathname: '/tournament/[id]', params: { id: String(t.id) } }} asChild>
              <Pressable style={StyleSheet.flatten([h.card, { width: cardW }])} accessibilityLabel={t.name}>
                <View style={h.art}>
                  <TournamentBanner ticker={shortName(t)} game={t.game} cover={t.cover} height={230} bare />
                </View>
                <View style={h.overlay}>
                  <View style={h.topRow}>
                    {st.live ? <LivePulse /> : <View style={[h.chip, { backgroundColor: hue }]}><Text style={h.chipText}>{st.label}</Text></View>}
                    {t.tier ? <View style={h.ghost}><Text style={h.ghostText}>{t.tier}</Text></View> : null}
                  </View>
                  <View>
                    <Text style={h.title} numberOfLines={2}>
                      {t.name}
                    </Text>
                    <View style={h.metaRow}>
                      <Text style={h.meta}>{dateRange(t.start, t.end)}{t.city ? ` · ${t.city}` : ''}</Text>
                      {t.prize ? <Text style={[h.prize, { color: hue }]}>{money(t.prize, t.currency)}</Text> : null}
                    </View>
                    {t.winner && t.status === 'finished' ? (
                      <View style={h.winner}>
                        <ChickenIcon size={14} />
                        <Text style={h.winnerText}>{t.winner}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </Pressable>
            </Link>
          );
        }}
      />
      {items.length > 1 ? (
        <View style={h.dots}>
          {items.map((t, i) => (
            <View key={t.id} style={[h.dot, i === page && { width: 18, backgroundColor: colors.text }]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

// ---------- strips ----------

export function TopTeams({ teams }: { teams: TeamSummary[] }) {
  const { game } = useGame();
  const hue = gameColors[game].hue;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space.lg, gap: space.md }}>
      {teams.map((t, i) => (
        <Link key={t.id} href={{ pathname: '/team/[id]', params: { id: t.id } }} asChild>
          <Pressable style={st.teamCard}>
            <Text style={[st.rank, { color: i === 0 ? hue : colors.faint }]}>#{i + 1}</Text>
            <TeamCrest name={t.name} size={52} />
            <Text style={st.name} numberOfLines={2}>
              {t.name}
            </Text>
            <Text style={[st.big, { color: i === 0 ? hue : colors.text }]}>{t.titles}</Text>
            <Text style={st.small}>titles</Text>
          </Pressable>
        </Link>
      ))}
    </ScrollView>
  );
}

export function TopFraggers({ players }: { players: PlayerSummary[] }) {
  const { game } = useGame();
  const hue = gameColors[game].hue;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space.lg, gap: space.md }}>
      {players.map((p, i) => (
        <Link key={p.id} href={{ pathname: '/player/[id]', params: { id: p.id } }} asChild>
          <Pressable style={st.playerCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <PlayerBadge name={p.tag} size={40} />
              <View style={{ flex: 1 }}>
                <Text style={st.tag} numberOfLines={1}>
                  {p.tag}
                </Text>
                <Text style={st.small} numberOfLines={1}>
                  {p.team}
                </Text>
              </View>
            </View>
            <View style={st.killRow}>
              <KillIcon size={16} color={hue} />
              <Text style={[st.big, { color: i === 0 ? hue : colors.text }]}>{p.kills}</Text>
              <Text style={st.small}>kills</Text>
            </View>
            <Text style={st.small}>{p.perMatch} per match · {p.matches} matches</Text>
          </Pressable>
        </Link>
      ))}
    </ScrollView>
  );
}

// ---------- podium ----------

/** Top three on blocks: 2nd, 1st, 3rd, block height by place, crest on top. */
export function Podium({ rows }: { rows: Standing[] }) {
  const top = rows.slice(0, 3);
  if (top.length < 3 || top[0].points == null) return null;
  const order = [
    { r: top[1], place: 2, h: 70, c: colors.silver },
    { r: top[0], place: 1, h: 100, c: colors.gold },
    { r: top[2], place: 3, h: 52, c: colors.bronze },
  ];
  return (
    <View style={pd.wrap}>
      {order.map(({ r, place, h: height, c }) => (
        <Link key={place} href={{ pathname: '/team/[id]', params: { id: r.team.id } }} asChild>
          <Pressable style={pd.col}>
            {place === 1 ? <ChickenIcon size={20} /> : null}
            <TeamCrest name={r.team.name} size={place === 1 ? 54 : 44} />
            <Text style={pd.name} numberOfLines={1}>
              {r.team.name}
            </Text>
            <Text style={[pd.pts, { color: c }]}>{r.points} pts</Text>
            <View style={[pd.block, { height }]}>
              <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
                <Defs>
                  <LinearGradient id={`p${place}`} x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor={c} stopOpacity="0.9" />
                    <Stop offset="1" stopColor={c} stopOpacity="0.25" />
                  </LinearGradient>
                </Defs>
                <Rect width="100%" height="100%" fill={`url(#p${place})`} />
              </Svg>
              <Text style={pd.place}>{place}</Text>
            </View>
          </Pressable>
        </Link>
      ))}
    </View>
  );
}

const h = StyleSheet.create({
  card: { height: 230, borderRadius: radius + 4, overflow: 'hidden', backgroundColor: colors.card },
  art: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  overlay: { flex: 1, justifyContent: 'space-between', padding: space.lg },
  topRow: { flexDirection: 'row', gap: space.sm, alignItems: 'center' },
  chip: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  chipText: { fontFamily: fonts.bodyBold, color: '#000', fontSize: 12 },
  ghost: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)', backgroundColor: 'rgba(0,0,0,0.35)' },
  ghostText: { fontFamily: fonts.bodyBold, color: '#fff', fontSize: 12 },
  title: { ...type.display, color: '#fff', fontSize: 24, lineHeight: 29, textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 8 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 4, gap: space.sm },
  meta: { fontFamily: fonts.body, color: '#E6E6E6', fontSize: 13, flexShrink: 1 },
  prize: { fontFamily: fonts.display, fontSize: 20 },
  winner: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  winnerText: { fontFamily: fonts.bodyBold, color: colors.gold, fontSize: 13 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: space.md },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)' },
});

const st = StyleSheet.create({
  teamCard: { width: 116, alignItems: 'center', padding: space.md, borderRadius: radius, backgroundColor: colors.card, gap: 4 },
  playerCard: { width: 190, padding: space.md, borderRadius: radius, backgroundColor: colors.card, gap: 6 },
  rank: { fontFamily: fonts.display, fontSize: 13, alignSelf: 'flex-start' },
  name: { fontFamily: fonts.bodyBold, color: colors.text, fontSize: 13, textAlign: 'center', minHeight: 34 },
  tag: { fontFamily: fonts.display, color: colors.text, fontSize: 16 },
  big: { fontFamily: fonts.display, fontSize: 26 },
  small: { fontFamily: fonts.body, color: colors.faint, fontSize: 12 },
  killRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 4 },
});

const pd = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm, marginHorizontal: space.lg, marginBottom: space.md },
  col: { flex: 1, alignItems: 'center', gap: 4 },
  name: { fontFamily: fonts.bodyBold, color: colors.text, fontSize: 12, maxWidth: '100%' },
  pts: { fontFamily: fonts.display, fontSize: 15 },
  block: { width: '100%', borderTopLeftRadius: 8, borderTopRightRadius: 8, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  place: { fontFamily: fonts.display, fontSize: 28, color: '#000', opacity: 0.75 },
});
