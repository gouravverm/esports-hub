// Esports graphics drawn in code (our own art, no team or publisher logos):
// team crests, tournament banners, game icons, map chips and the live pulse.
import { useEffect, useId, useRef } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Pattern, Rect, Stop } from 'react-native-svg';

import { initials } from '@/lib/format';
import { colors, fonts, gameColors, radius, space } from '@/lib/theme';
import type { GameKey } from '@/lib/types';

// ---------- team crests ----------

// deep fills with a bright trim; picked by the team name so a team always looks the same
const CREST_COLOURS: [string, string][] = [
  ['#7A1F2B', '#FF5A6E'], ['#1F3F7A', '#5AA8FF'], ['#1F6B4A', '#4DE3A0'], ['#7A5A1F', '#FFC14D'],
  ['#4A1F7A', '#B88CFF'], ['#1F6670', '#4DD8E8'], ['#7A3A1F', '#FF8A4D'], ['#3A3F4A', '#C8D0DC'],
  ['#5C1F5A', '#FF6FD8'], ['#2E5A1F', '#A6E34D'],
];

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return Math.abs(h);
}

const SHIELDS = [
  'M50 4 L92 18 L88 62 Q80 88 50 100 Q20 88 12 62 L8 18 Z', // classic
  'M50 2 L94 22 L94 58 Q90 86 50 100 Q10 86 6 58 L6 22 Z', // broad
  'M14 6 L86 6 L92 30 L80 82 L50 100 L20 82 L8 30 Z', // angular
];

/** A shield crest generated from the team name: shape, colours and band style all derive from it. */
export function TeamCrest({ name, size = 32 }: { name: string; size?: number }) {
  const h = hash(name || '?');
  const [fill, trim] = CREST_COLOURS[h % CREST_COLOURS.length];
  const shield = SHIELDS[(h >> 4) % SHIELDS.length];
  const band = (h >> 8) % 3; // 0 diagonal, 1 chevron, 2 split
  const text = initials(name);
  return (
    <View style={{ width: size, height: size * 1.1 }} aria-hidden>
      <Svg width={size} height={size * 1.1} viewBox="0 0 100 104">
        <Path d={shield} fill={fill} stroke={trim} strokeWidth={4} />
        <G opacity={0.35}>
          {band === 0 && <Path d="M8 70 L92 26 L92 42 L8 86 Z" fill={trim} />}
          {band === 1 && <Path d="M10 40 L50 64 L90 40 L90 54 L50 78 L10 54 Z" fill={trim} />}
          {band === 2 && <Path d="M50 4 L92 18 L88 62 Q80 88 50 100 Z" fill={trim} />}
        </G>
      </Svg>
      <View style={[StyleSheet.absoluteFill, s.crestText]}>
        <Text style={{ fontFamily: fonts.display, color: '#FFFFFF', fontSize: Math.max(10, size * 0.34) }}>{text}</Text>
      </View>
    </View>
  );
}

/** Round player badge in the colours of the name, so players read apart from team crests. */
export function PlayerBadge({ name, size = 32 }: { name: string; size?: number }) {
  const [fill, trim] = CREST_COLOURS[hash(name || '?') % CREST_COLOURS.length];
  return (
    <View style={[s.player, { width: size, height: size, borderRadius: size / 2, backgroundColor: fill, borderColor: trim }]}>
      <Text style={{ fontFamily: fonts.display, color: '#FFFFFF', fontSize: Math.max(10, size * 0.36) }}>{initials(name)}</Text>
    </View>
  );
}

// ---------- tournament banner ----------

/** Banner text: Liquipedia's short name, else the capitals of the name ("Google Play Arena" -> "GPA"). */
export function shortName(t: { ticker?: string | null; name: string }): string {
  if (t.ticker) return t.ticker.replace(/\s+20\d\d$/, '');
  const caps = t.name.split(/\s+/).filter((w) => /^[A-Za-z]/.test(w)).map((w) => w[0].toUpperCase()).join('');
  return caps.slice(0, 6) || t.name;
}

/** The tournament's official stream thumbnail when we have one, else generated key art:
 *  the ticker set large over a striped field in the game's colour. */
export function TournamentBanner({
  ticker,
  game,
  cover,
  height = 150,
  bare,
}: {
  ticker: string;
  game: GameKey;
  cover?: string | null;
  height?: number;
  /** fill the parent (hero cards): no card bleed, ticker as a faint watermark, darker foot for text */
  bare?: boolean;
}) {
  const { hue, soft } = gameColors[game];
  const uid = useId().replace(/[^a-zA-Z0-9]/g, ''); // SVG ids are page-global on web: one set per banner
  const frame = bare ? { height } : [s.banner, { height }];
  const shade = (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
      <Defs>
        <LinearGradient id={`fade${uid}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset={bare ? '0' : '0.45'} stopColor="#000" stopOpacity={bare ? '0.15' : '0'} />
          <Stop offset="1" stopColor="#0A0D12" stopOpacity="0.95" />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#fade${uid})`} />
    </Svg>
  );
  if (cover) {
    return (
      <View style={frame}>
        <Image source={{ uri: cover }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        {shade}
      </View>
    );
  }
  const size = ticker.length <= 7 ? 44 : ticker.length <= 12 ? 34 : 26; // web has no auto-fit
  return (
    <View style={[frame, { backgroundColor: '#0D0D0D' }]}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <Pattern id={`stripes${uid}`} width="18" height="18" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)">
            <Rect width="7" height="18" fill={soft} opacity="0.55" />
          </Pattern>
          <LinearGradient id={`glow${uid}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={hue} stopOpacity="0.35" />
            <Stop offset="1" stopColor="#000" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#stripes${uid})`} />
        <Rect width="100%" height="100%" fill={`url(#glow${uid})`} />
        <Rect x="0" y="0" width="6" height="100%" fill={hue} />
      </Svg>
      {bare ? (
        <>
          <View style={s.watermark}>
            <Text style={[s.ticker, { fontSize: size * 1.6, color: '#FFFFFF', opacity: 0.16 }]} numberOfLines={1}>
              {ticker}
            </Text>
          </View>
          {shade}
        </>
      ) : (
        <View style={s.bannerText}>
          <Text style={[s.ticker, { color: '#FFFFFF', textShadowColor: hue, fontSize: size }]} numberOfLines={2}>
            {ticker}
          </Text>
        </View>
      )}
    </View>
  );
}

// ---------- screen background ----------

/** Wavy topographic line across the 400-wide artboard (deterministic, so it never jumps). */
function contour(base: number, seed: number): string {
  const pts: string[] = [];
  for (let x = -20; x <= 420; x += 20) {
    const y = base + 14 * Math.sin(x / 47 + seed) + 8 * Math.sin(x / 19 + seed * 2.3) + 5 * Math.sin(x / 9 + seed * 0.7);
    pts.push(`${x === -20 ? 'M' : 'L'}${x} ${y.toFixed(1)}`);
  }
  return pts.join(' ');
}

const CONTOURS = Array.from({ length: 22 }, (_, i) => ({ d: contour(30 + i * 42, i * 1.7), strong: i % 4 === 0 }));

/** Map-style key art behind every screen: a battle-royale map grid, terrain contours and a glow
 *  in the game's colour, all faint enough that text on the glass cards stays easy to read. */
export function GameBackground({ game }: { game: GameKey }) {
  const { hue } = gameColors[game];
  const uid = useId().replace(/[^a-zA-Z0-9]/g, ''); // other screens stay mounted: keep SVG ids apart
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" aria-hidden>
      <Svg width="100%" height="100%" viewBox="0 0 400 960" preserveAspectRatio="xMidYMin slice">
        <Defs>
          <LinearGradient id={`sky${uid}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={hue} stopOpacity="0.28" />
            <Stop offset="0.35" stopColor={hue} stopOpacity="0.08" />
            <Stop offset="1" stopColor="#000000" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect width="400" height="960" fill={`url(#sky${uid})`} />
        {/* map grid, like the squares on an in-game map */}
        <G stroke="#FFFFFF" strokeOpacity="0.05" strokeWidth="1">
          {Array.from({ length: 9 }, (_, i) => (
            <Line key={`v${i}`} x1={i * 50} y1="0" x2={i * 50} y2="960" />
          ))}
          {Array.from({ length: 20 }, (_, i) => (
            <Line key={`h${i}`} x1="0" y1={i * 50} x2="400" y2={i * 50} />
          ))}
        </G>
        {/* terrain contours */}
        <G fill="none">
          {CONTOURS.map((c, i) => (
            <Path key={i} d={c.d} stroke={hue} strokeOpacity={c.strong ? 0.24 : 0.11} strokeWidth={c.strong ? 1.6 : 1} />
          ))}
        </G>
      </Svg>
    </View>
  );
}

// ---------- icons ----------

/** Winner Winner Chicken Dinner: a drumstick. */
export function ChickenIcon({ size = 16, color = colors.gold }: { size?: number; color?: string }) {
  return (
    <View aria-hidden>
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M15.5 3.5a5 5 0 0 1 3.9 8.1c-1.2 1.5-3.2 2.4-5.3 2.2l-3.4 3.4.6 1.1a1.8 1.8 0 1 1-2.7 1.9 1.8 1.8 0 1 1-1.9-2.7l1.1.6 3.4-3.4c-.2-2.1.7-4.1 2.2-5.3a5 5 0 0 1 2.1-5.9z" fill={color} />
    </Svg>
    </View>
  );
}

/** Kills: a crosshair. */
export function KillIcon({ size = 14, color = colors.muted }: { size?: number; color?: string }) {
  return (
    <View aria-hidden>
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="12" cy="12" r="7" stroke={color} strokeWidth="2" fill="none" />
      <Line x1="12" y1="1" x2="12" y2="7" stroke={color} strokeWidth="2" />
      <Line x1="12" y1="17" x2="12" y2="23" stroke={color} strokeWidth="2" />
      <Line x1="1" y1="12" x2="7" y2="12" stroke={color} strokeWidth="2" />
      <Line x1="17" y1="12" x2="23" y2="12" stroke={color} strokeWidth="2" />
      <Circle cx="12" cy="12" r="1.6" fill={color} />
    </Svg>
    </View>
  );
}

// each map in its own terrain colour
const MAP_COLOURS: Record<string, string> = {
  erangel: '#4C8B3F', miramar: '#C8964A', sanhok: '#2F8A5B', vikendi: '#8FB8D8', livik: '#4FA3C7',
  rondo: '#C0653C', karakin: '#B98F55', nusa: '#3BA99C', taego: '#7FA34A', deston: '#5C7FA8',
  bermuda: '#3E9B6B', purgatory: '#7A8F3E', kalahari: '#D29A4C', alpine: '#8AB6D6', nexterra: '#6A82E0',
};

export function MapChip({ map }: { map: string | null | undefined }) {
  if (!map) return null;
  const c = MAP_COLOURS[map.toLowerCase().replace(/[^a-z]/g, '')] ?? colors.muted;
  return (
    <View style={[s.mapChip, { borderColor: c }]}>
      <View style={[s.mapDot, { backgroundColor: c }]} />
      <Text style={[s.mapText, { color: c }]}>{map}</Text>
    </View>
  );
}

/** LIVE badge whose dot pulses (opacity only, so it is cheap and respects layout). */
export function LivePulse() {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.25, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return (
    <View style={s.live}>
      <Animated.View style={[s.liveDot, { opacity: pulse }]} />
      <Text style={s.liveText}>LIVE</Text>
    </View>
  );
}

const s = StyleSheet.create({
  crestText: { alignItems: 'center', justifyContent: 'center', paddingBottom: '8%' },
  player: { alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  banner: { borderTopLeftRadius: radius, borderTopRightRadius: radius, overflow: 'hidden', marginHorizontal: -space.lg, marginTop: -space.lg, marginBottom: space.md },
  bannerText: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, justifyContent: 'flex-end', padding: space.lg },
  watermark: { position: 'absolute', top: space.md, right: space.lg, left: space.lg, alignItems: 'flex-end' },
  ticker: { fontFamily: fonts.display, fontSize: 40, letterSpacing: 1, textShadowRadius: 18, textShadowOffset: { width: 0, height: 0 } },
  mapChip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  mapDot: { width: 6, height: 6, borderRadius: 3 },
  mapText: { fontFamily: fonts.bodyBold, fontSize: 11 },
  live: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.live, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#FFFFFF' },
  liveText: { fontFamily: fonts.bodyBold, color: '#FFFFFF', fontSize: 11, letterSpacing: 0.6 },
});
