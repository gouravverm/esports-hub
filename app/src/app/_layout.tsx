import { ChakraPetch_500Medium, ChakraPetch_700Bold } from '@expo-google-fonts/chakra-petch';
import { RussoOne_400Regular } from '@expo-google-fonts/russo-one';
import { useFonts } from 'expo-font';
import { DarkTheme, Stack, ThemeProvider, type ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { GameProvider } from '@/lib/game';
import { PremiumProvider } from '@/lib/premium';
import { colors, fonts } from '@/lib/theme';

export default function RootLayout() {
  const [loaded, failed] = useFonts({ RussoOne_400Regular, ChakraPetch_500Medium, ChakraPetch_700Bold });
  useEffect(() => {
    // on web the page behind the app is otherwise white (overscroll, header measurements)
    if (Platform.OS === 'web') document.body.style.backgroundColor = colors.bg;
  }, []);
  // native needs the fonts registered before text uses them; web swaps them in when ready,
  // so it never shows a blank screen on a slow connection
  if (Platform.OS !== 'web' && !loaded && !failed) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;

  return (
    <ThemeProvider value={navTheme}>
      <GameProvider>
        <PremiumProvider>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.bg },
              headerShadowVisible: false,
              headerTintColor: colors.text,
              headerTitleStyle: { fontFamily: fonts.display },
              contentStyle: { backgroundColor: colors.bg },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            {/* the tournament's name is the screen's h1, so the bar shows only the back button */}
            <Stack.Screen name="tournament/[id]" options={{ title: 'Tournament', headerTitle: () => null }} />
            <Stack.Screen name="team/[id]" options={{ title: 'Team' }} />
            <Stack.Screen name="player/[id]" options={{ title: 'Player' }} />
            <Stack.Screen name="premium" options={{ title: 'Premium' }} />
            <Stack.Screen name="privacy" options={{ title: 'Privacy Policy' }} />
          </Stack>
        </PremiumProvider>
      </GameProvider>
    </ThemeProvider>
  );
}

/** Shown instead of closing the app when a screen throws: the message can be screenshotted and sent. */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 24, paddingTop: 64, gap: 12 }}>
      <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700' }}>Kuch galat ho gaya</Text>
      <Text style={{ color: colors.muted }}>Is screen ka screenshot bhej dein, taaki ise theek kiya ja sake.</Text>
      <Text selectable style={{ color: colors.live, fontFamily: Platform.OS === 'android' ? 'monospace' : undefined, fontSize: 12 }}>
        {String(error?.message ?? error)}
        {'\n\n'}
        {String(error?.stack ?? '').slice(0, 1500)}
      </Text>
      <Pressable onPress={retry} style={{ backgroundColor: colors.primary, borderRadius: 20, minHeight: 44, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: colors.onPrimary, fontWeight: '700' }}>Dobara try karein</Text>
      </Pressable>
    </ScrollView>
  );
}

// navigation's own surfaces (card, header, borders) on the app's ground instead of the light defaults
const navTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.bg, card: colors.bg, border: colors.border, text: colors.text },
};
