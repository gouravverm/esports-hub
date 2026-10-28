import Ionicons from '@expo/vector-icons/Ionicons';
import { Link } from 'expo-router';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View, type ViewStyle } from 'react-native';

import { GameBackground, LivePulse, TeamCrest } from '@/components/graphics';
import { date, dateRange, money } from '@/lib/format';
import { GAMES, gameLabel, useGame } from '@/lib/game';
import { colors, fonts, gameColors, radius, space, touch, type } from '@/lib/theme';
import type { GameKey, SquadMember, TournamentSummary } from '@/lib/types';

/** Every screen sits on the game's map-style artwork; pages about one game pass it in. */
export function Screen({ children, game }: { children: ReactNode; game?: GameKey }) {
  const selected = useGame().game;
  return (
    <View style={styles.screen}>
      <GameBackground game={game ?? selected} />
      {children}
    </View>
  );
}

export function Loading() {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.link} />
    </View>
  );
}

export function ErrorView({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.center}>
      <Text style={styles.muted}>Data load nahi hua: {message}</Text>
      {onRetry && (
        <Pressable onPress={onRetry} style={styles.retry}>
          <Text style={styles.retryText}>Dobara try karein</Text>
        </Pressable>
      )}
    </View>
  );
}

export function Empty({ text }: { text: string }) {
  return <Text style={[styles.muted, { padding: space.lg, textAlign: 'center' }]}>{text}</Text>;
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.section}>{children}</Text>
      {right}
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/** Underline tabs on a full-width 1px rule. The selection is brightness plus a 2px white
 *  line, never a colour fill. The row scrolls sideways inside itself with end padding. */
export function Pills<T extends string | number>({
  items,
  value,
  onChange,
  small,
}: {
  items: { key: T; label: string }[];
  value: T;
  onChange: (key: T) => void;
  small?: boolean;
}) {
  // phones scroll the row sideways inside itself; wider screens have room, so the tabs wrap
  const { width } = useWindowDimensions();
  const Row = width >= 600 ? WrapRow : ScrollRow;
  return (
    <View style={styles.tabsWrap}>
      <Row>
        {items.map((it) => {
          const on = it.key === value;
          return (
            <Pressable
              key={String(it.key)}
              onPress={() => onChange(it.key)}
              style={({ pressed }) => [styles.tab, small && styles.tabSmall, on && styles.tabOn, pressed && { opacity: 0.7 }]}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
            >
              <Text style={[styles.tabText, small && { fontSize: 13 }, on && styles.tabTextOn]} numberOfLines={1}>
                {it.label}
              </Text>
            </Pressable>
          );
        })}
      </Row>
    </View>
  );
}

function ScrollRow({ children }: { children: ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
      {children}
    </ScrollView>
  );
}

function WrapRow({ children }: { children: ReactNode }) {
  return <View style={[styles.tabs, { flexWrap: 'wrap', columnGap: space.xl, rowGap: 0 }]}>{children}</View>;
}

export function GameSwitcher() {
  const { game, setGame } = useGame();
  return <Pills items={GAMES.map((g) => ({ key: g.key, label: g.label }))} value={game} onChange={setGame} />;
}

export function Badge({ text, color = colors.muted }: { text: string; color?: string }) {
  return (
    <View style={[styles.badge, { borderColor: color }]}>
      <Text style={[styles.badgeText, { color }]}>{text}</Text>
    </View>
  );
}

export function LiveDot() {
  return <LivePulse />;
}

/** Teams are shown with a generated crest (see graphics.tsx), never a real logo. */
export function TeamAvatar({ name, size = 32 }: { name: string; size?: number }) {
  return <TeamCrest name={name} size={size} />;
}

export function Winner({ name, prefix }: { name: string; prefix?: string }) {
  return (
    <View style={styles.winnerRow}>
      <Ionicons name="trophy" size={14} color={colors.gold} aria-hidden />
      <Text style={styles.winner} numberOfLines={1}>
        {prefix}
        {name}
      </Text>
    </View>
  );
}

export function GameBadge({ game }: { game: GameKey }) {
  return <Badge text={gameLabel(game)} color={gameColors[game].hue} />;
}

export function TournamentCard({ t }: { t: TournamentSummary }) {
  return (
    <Link href={{ pathname: '/tournament/[id]', params: { id: String(t.id) } }} asChild>
      <Pressable style={styles.card} android_ripple={{ color: colors.cardAlt }}>
        <View style={styles.cardTop}>
          {t.status === 'ongoing' ? <LiveDot /> : null}
          {t.tier ? <Badge text={t.tier} color={t.tier === 'S-Tier' ? colors.gold : colors.muted} /> : null}
          {t.type ? <Badge text={t.type} /> : null}
        </View>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {t.name}
        </Text>
        <Text style={styles.muted} numberOfLines={1}>
          {[dateRange(t.start, t.end), t.organizer, t.city].filter(Boolean).join(' · ')}
        </Text>
        <View style={styles.cardBottom}>
          {t.prize ? <Text style={styles.prize}>{money(t.prize, t.currency)}</Text> : <View />}
          {t.winner ? <Winner name={t.winner} /> : null}
        </View>
      </Pressable>
    </Link>
  );
}

const PLAYING = ['player', 'captain', 'substitute'];

/** A squad as linked names: players first (captain / sub marked), then staff with their role. */
export function SquadLine({ members }: { members: SquadMember[] }) {
  const name = (m: SquadMember, label?: string) =>
    m.id ? (
      <Link key={m.id + m.role} href={{ pathname: '/player/[id]', params: { id: m.id } }} style={styles.text}>
        {m.player}
        {label ? <Text style={styles.muted}> {label}</Text> : null}
      </Link>
    ) : (
      <Text key={m.player + m.role} style={styles.text}>
        {m.player}
        {label ? <Text style={styles.muted}> {label}</Text> : null}
      </Text>
    );
  const players = members.filter((m) => PLAYING.includes(m.role));
  const staff = members.filter((m) => !PLAYING.includes(m.role));
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: space.md, rowGap: 6 }}>
        {players.map((m) => name(m, m.role === 'captain' ? '(C)' : m.role === 'substitute' ? '(sub)' : undefined))}
      </View>
      {staff.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: space.md, rowGap: 6 }}>
          {staff.map((m) => name(m, `(${m.role})`))}
        </View>
      ) : null}
    </View>
  );
}

/** Compact tournament row for lists inside one card: date | name + meta | prize or winner. */
export function EventRow({ t, first }: { t: TournamentSummary; first?: boolean }) {
  return (
    <Link href={{ pathname: '/tournament/[id]', params: { id: String(t.id) } }} asChild>
      <Pressable style={first ? eventRow : eventRowRuled} android_ripple={{ color: colors.cardAlt }}>
        <View style={{ width: 52 }}>
          <Text style={[type.number, { color: colors.text }]}>{date(t.start, false)}</Text>
          {t.status === 'ongoing' ? <Text style={[styles.liveText, { marginTop: 2 }]}>LIVE</Text> : null}
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[styles.text, { fontFamily: fonts.bodyBold }]} numberOfLines={1}>
            {t.name}
          </Text>
          {t.winner ? (
            <Winner name={t.winner} />
          ) : (
            <Text style={[styles.muted, { color: colors.faint }]} numberOfLines={1}>
              {[t.tier, t.type, t.city].filter(Boolean).join(' · ')}
            </Text>
          )}
        </View>
        {t.prize ? <Text style={[type.number, { color: colors.good }]}>{money(t.prize, t.currency)}</Text> : null}
      </Pressable>
    </Link>
  );
}

const eventRow = StyleSheet.flatten([
  { flexDirection: 'row' as const, alignItems: 'center' as const, gap: space.md, minHeight: 60, paddingVertical: space.sm },
]);
const eventRowRuled = StyleSheet.flatten([eventRow, { borderTopWidth: 1, borderTopColor: colors.rule }]);

export function SourceNote() {
  return <Text style={styles.source}>Data: Liquipedia (CC-BY-SA 3.0)</Text>;
}

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl, backgroundColor: colors.bg },
  muted: { ...type.caption, color: colors.muted, fontSize: 13 },
  text: { ...type.body, color: colors.text },
  retry: { marginTop: space.md, paddingHorizontal: space.lg, minHeight: touch.min, justifyContent: 'center', borderRadius: 22, backgroundColor: colors.primary },
  retryText: { fontFamily: fonts.bodyBold, color: colors.onPrimary },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.xl, marginBottom: space.sm, paddingHorizontal: space.lg },
  section: { ...type.heading, color: colors.text },
  card: { backgroundColor: colors.card, borderRadius: radius, padding: space.lg, marginHorizontal: space.lg, marginBottom: space.md },
  cardTop: { flexDirection: 'row', gap: space.sm, marginBottom: space.sm, flexWrap: 'wrap', alignItems: 'center' },
  cardTitle: { ...type.heading, fontSize: 16, color: colors.text, marginBottom: space.xs },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: space.md, gap: space.sm },
  prize: { fontFamily: fonts.bodyBold, color: colors.good, fontSize: 14 },
  winner: { fontFamily: fonts.bodyBold, color: colors.gold, fontSize: 13, flexShrink: 1, textAlign: 'right' },
  winnerRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
  tabsWrap: { borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: space.md },
  tabs: { flexDirection: 'row', gap: space.xl, paddingHorizontal: space.lg },
  tab: { minHeight: touch.min, justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent', marginBottom: -1 },
  tabSmall: { minHeight: 40 },
  tabOn: { borderBottomColor: colors.text },
  tabText: { fontFamily: fonts.bodyBold, color: colors.faint, fontSize: 14 },
  tabTextOn: { color: colors.text },
  badge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.3 },
  liveWrap: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(244,63,94,0.15)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.live },
  liveText: { fontFamily: fonts.bodyBold, color: colors.live, fontSize: 11, letterSpacing: 0.5 },
  avatar: { backgroundColor: colors.cardAlt, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.display, color: colors.text },
  link: { fontFamily: fonts.bodyBold, color: colors.link },
  input: { ...type.body, marginHorizontal: space.lg, marginBottom: space.md, minHeight: touch.min, backgroundColor: colors.card, color: colors.text, borderRadius: 10, paddingHorizontal: space.md, borderWidth: 1, borderColor: '#444444' },
  source: { ...type.caption, color: colors.muted, fontSize: 11, textAlign: 'center', paddingVertical: space.xl },
});
