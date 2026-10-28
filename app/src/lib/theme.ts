// Tokens from design-system/esports-hub/MASTER.md and pages/tournament.md
// (UI UX Pro Max type + taste-skill "true-black-flat"). Screens use these names only.
// Elevation is a lightness step (no borders or shadows on cards); colour goes on data,
// never on tabs or buttons; violet is the brand mark only (icon, wordmark).

export const colors = {
  bg: '#0A0D12', // deep charcoal under the map-style background art
  card: 'rgba(20, 23, 29, 0.88)', // "dark glass": the artwork shows faintly through
  cardAlt: '#2A2E36', // nested panel, pressed state, inputs
  border: '#1A1A1A', // structural 1px lines (tab rule)
  rule: '#1F1F1F', // table row rules
  text: '#FFFFFF',
  muted: '#B4B4B4', // secondary text
  faint: '#949494', // meta, table headers
  primary: '#FFFFFF', // the one primary action: inverted white pill
  onPrimary: '#000000',
  link: '#FFFFFF',
  brand: '#7C3AED', // logo / wordmark only, never on screens (owner's call) taste-skill-ignore
  live: '#F43F5E',
  gold: '#F5C04A',
  silver: '#C3CBD8',
  bronze: '#D08A52',
  good: '#3FC07A', // prize money
};

/** The one data hue per game (leader mark, Finish-vs-Fight bars), with a lighter step for the second part. */
export const gameColors = {
  bgmi: { hue: '#FF8A1F', soft: '#7A4613' },
  freefire: { hue: '#FFB020', soft: '#7A5814' },
  pubgm: { hue: '#F5C04A', soft: '#75602A' },
} as const;

export const placeColor = (place: number) =>
  place === 1 ? colors.gold : place === 2 ? colors.silver : place === 3 ? colors.bronze : colors.faint;

export const fonts = {
  display: 'RussoOne_400Regular',
  body: 'ChakraPetch_500Medium',
  bodyBold: 'ChakraPetch_700Bold',
};

export const type = {
  display: { fontFamily: fonts.display, fontSize: 22, lineHeight: 28 },
  heading: { fontFamily: fonts.display, fontSize: 17, lineHeight: 22 },
  body: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fonts.body, fontSize: 12, lineHeight: 16 },
  number: { fontFamily: fonts.bodyBold, fontSize: 13, fontVariant: ['tabular-nums' as const] },
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = 12;
export const touch = { min: 44, hitSlop: { top: 10, bottom: 10, left: 10, right: 10 } };
