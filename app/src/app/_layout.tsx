import { ChakraPetch_500Medium, ChakraPetch_700Bold } from '@expo-google-fonts/chakra-petch';
import { RussoOne_400Regular } from '@expo-google-fonts/russo-one';
import { useFonts } from 'expo-font';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, View } from 'react-native';

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

// navigation's own surfaces (card, header, borders) on the app's ground instead of the light defaults
const navTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.bg, card: colors.bg, border: colors.border, text: colors.text },
};
