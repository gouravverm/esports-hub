import Ionicons from '@expo/vector-icons/Ionicons';
import { Link } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card, Screen, styles as ui } from '@/components/ui';
import { useGame } from '@/lib/game';
import { PREMIUM } from '@/lib/monetization';
import { usePremium } from '@/lib/premium';
import { colors, fonts, gameColors, radius, space, type } from '@/lib/theme';

export default function PremiumScreen() {
  const { game } = useGame();
  const hue = gameColors[game].hue;
  const { isPremium, storeReady, plans, purchase, restorePurchases } = usePremium();
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  // store prices when the store has them, otherwise the planned prices
  const shown = plans.length
    ? plans.map((p) => ({ id: p.id, label: p.title, price: p.price, per: '', note: undefined as string | undefined }))
    : PREMIUM.plans.map((p) => ({ ...p, note: 'note' in p ? p.note : undefined }));

  const onBuy = async (id: string) => {
    setBusy(id);
    setNote(null);
    try {
      const ok = await purchase(id);
      setNote(ok ? 'Premium active. Shukriya!' : 'Purchase complete nahi hua.');
    } catch {
      setNote('Purchase cancel ya fail ho gaya.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: space.xxl }}>
        <View style={s.hero}>
          <Ionicons name="diamond" size={44} color={hue} />
          <Text style={[type.display, { color: colors.text, fontSize: 28, marginTop: space.md }]}>Esports Hub Premium</Text>
          <Text style={[ui.text, { color: colors.muted, textAlign: 'center', marginTop: space.sm }]}>
            {isPremium ? 'Aap Premium member ho.' : 'Ads hatao, live alerts pao, aur app ko support karo.'}
          </Text>
        </View>

        <Card>
          {PREMIUM.perks.map((p, i) => (
            <View key={p.title} style={[s.perk, i > 0 && s.ruled]}>
              <Ionicons name={p.icon as never} size={22} color={hue} />
              <View style={{ flex: 1 }}>
                <Text style={[ui.text, { fontFamily: fonts.bodyBold }]}>{p.title}</Text>
                <Text style={[ui.muted, { color: colors.faint }]}>{p.text}</Text>
              </View>
            </View>
          ))}
        </Card>

        {!isPremium && (
          <View style={{ gap: space.md, marginHorizontal: space.lg, marginTop: space.md }}>
            {shown.map((p) => (
              <Pressable
                key={p.id}
                disabled={!storeReady || busy !== null}
                onPress={() => onBuy(p.id)}
                style={[s.plan, { borderColor: p.id === 'yearly' ? hue : colors.border }]}
                accessibilityRole="button"
                accessibilityState={{ disabled: !storeReady }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[ui.text, { fontFamily: fonts.bodyBold }]}>{p.label}</Text>
                  {p.note ? <Text style={[ui.muted, { color: hue }]}>{p.note}</Text> : null}
                </View>
                {busy === p.id ? (
                  <ActivityIndicator color={hue} />
                ) : (
                  <Text style={[type.heading, { color: colors.text }]}>
                    {p.price}
                    <Text style={ui.muted}>{p.per}</Text>
                  </Text>
                )}
              </Pressable>
            ))}
            {!storeReady && (
              <Text style={[ui.muted, { textAlign: 'center' }]}>
                {Platform.OS === 'web'
                  ? 'Premium Android aur iPhone app me milega.'
                  : 'Premium jald aa raha hai. Abhi ke liye app free hai.'}
              </Text>
            )}
            {note ? <Text style={[ui.text, { textAlign: 'center' }]}>{note}</Text> : null}
            {storeReady && (
              <Pressable onPress={() => restorePurchases().then((ok) => setNote(ok ? 'Premium restore ho gaya.' : 'Koi purchase nahi mili.'))} style={s.restore}>
                <Text style={ui.link}>Purani purchase restore karo</Text>
              </Pressable>
            )}
          </View>
        )}

        <Text style={[ui.muted, { color: colors.faint, textAlign: 'center', marginTop: space.xl, marginHorizontal: space.lg }]}>
          Subscription Google Play / App Store se chalti hai aur wahin se cancel ho sakti hai.{' '}
          <Link href="/privacy" style={ui.link}>
            Privacy policy
          </Link>
        </Text>
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  hero: { alignItems: 'center', paddingHorizontal: space.xl, paddingVertical: space.xl },
  perk: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  ruled: { borderTopWidth: 1, borderTopColor: colors.rule },
  plan: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius, borderWidth: 2, backgroundColor: colors.card, minHeight: 64 },
  restore: { minHeight: 44, justifyContent: 'center', alignItems: 'center' },
});
