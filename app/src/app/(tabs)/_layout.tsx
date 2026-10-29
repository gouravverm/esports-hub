import Ionicons from '@expo/vector-icons/Ionicons';
import { Link, Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, type ColorValue } from 'react-native';

import { Wordmark } from '@/components/showcase';
import { useGame } from '@/lib/game';
import { usePremium } from '@/lib/premium';
import { colors, fonts, gameColors } from '@/lib/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

// filled icon when selected, outline otherwise
const icon = (on: IconName, off: IconName) => ({ color, size, focused }: { color: ColorValue; size: number; focused: boolean }) => (
  <Ionicons name={focused ? on : off} size={size} color={color as string} />
);

/** Header button to the Premium screen; a filled diamond once the user is Premium. */
function PremiumButton({ hue }: { hue: string }) {
  const { isPremium } = usePremium();
  return (
    <Link href="/premium" asChild>
      <Pressable hitSlop={10} style={{ paddingHorizontal: 16, minHeight: 44, justifyContent: 'center' }} accessibilityLabel="Premium">
        <Ionicons name={isPremium ? 'diamond' : 'diamond-outline'} size={22} color={hue} />
      </Pressable>
    </Link>
  );
}

export default function TabLayout() {
  const { game } = useGame();
  const hue = gameColors[game].hue;
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        headerTitleStyle: { fontFamily: fonts.display },
        tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.border, height: 62, paddingTop: 6 },
        tabBarLabelStyle: { fontFamily: fonts.bodyBold, fontSize: 11 },
        tabBarActiveTintColor: hue,
        tabBarInactiveTintColor: colors.faint,
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Esports Hub',
          headerTitle: () => <Wordmark />,
          headerRight: () => <PremiumButton hue={hue} />,
          tabBarLabel: 'Home',
          tabBarIcon: icon('home', 'home-outline'),
        }}
      />
      <Tabs.Screen name="tournaments" options={{ title: 'Tournaments', tabBarIcon: icon('trophy', 'trophy-outline') }} />
      <Tabs.Screen name="teams" options={{ title: 'Teams', tabBarIcon: icon('shield', 'shield-outline') }} />
      <Tabs.Screen name="players" options={{ title: 'Players', tabBarIcon: icon('person', 'person-outline') }} />
    </Tabs>
  );
}
