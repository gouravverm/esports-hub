import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

import { colors, fonts } from '@/lib/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

const icon = (name: IconName) => ({ color, size }: { color: ColorValue; size: number }) => (
  <Ionicons name={name} size={size} color={color as string} />
);

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        headerTitleStyle: { fontFamily: fonts.display },
        tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.border },
        tabBarLabelStyle: { fontFamily: fonts.body },
        tabBarActiveTintColor: colors.link,
        tabBarInactiveTintColor: colors.muted,
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Esports Hub', tabBarLabel: 'Home', tabBarIcon: icon('home-outline') }} />
      <Tabs.Screen name="tournaments" options={{ title: 'Tournaments', tabBarIcon: icon('trophy-outline') }} />
      <Tabs.Screen name="teams" options={{ title: 'Teams', tabBarIcon: icon('people-outline') }} />
      <Tabs.Screen name="players" options={{ title: 'Players', tabBarIcon: icon('person-outline') }} />
    </Tabs>
  );
}
