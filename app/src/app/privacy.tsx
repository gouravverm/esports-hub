import { ScrollView, StyleSheet, Text } from 'react-native';

import { Card, Screen, styles as ui } from '@/components/ui';
import { colors, space, type } from '@/lib/theme';

// Plain-language privacy policy required by AdMob and the app stores. Keep it true to what the app does.
const SECTIONS: [string, string][] = [
  [
    'Kaun hain hum',
    'Esports Hub ek independent app hai jo Indian BGMI, Free Fire aur PUBG Mobile tournaments ke results, points tables, teams aur players dikhata hai. Ye Krafton, Garena ya kisi team se juda hua nahi hai.',
  ],
  [
    'Hum kya data lete hain',
    'App me koi account ya login nahi hai. Hum aapka naam, phone number, contacts ya location nahi lete. Tournament data public sources (Liquipedia, YouTube) se aata hai.',
  ],
  [
    'Ads (Google AdMob)',
    'Free version me Google AdMob ads dikhate hain. Google ads dikhane aur unhe naapne ke liye device ka advertising ID aur app use ki jaankari le sakta hai. Jahan kanoon zaroori kare (jaise Europe), app pehle aapki consent leta hai. Aap phone ki settings me ad personalisation band kar sakte ho. Google ki policy: https://policies.google.com/technologies/ads',
  ],
  [
    'Premium (subscription)',
    'Premium Google Play / App Store ke billing se khareeda jata hai; payment details sirf unke paas rehti hain, humare paas nahi. Subscription ka status RevenueCat (humara billing partner) ke through check hota hai, jo ek anonymous app user ID rakhta hai.',
  ],
  [
    'Videos aur links',
    'Streams aur videos YouTube pe khulte hain; wahan YouTube ki apni privacy policy lagti hai. Player ke social links unki public profiles pe le jate hain.',
  ],
  [
    'Bacche',
    'Ye app 13 saal se kam umar ke bacchon ke liye nahi bana hai.',
  ],
  [
    'Sampark',
    'Sawal ya data se judi request: https://github.com/gouravverm/esports-hub (Issues). Ye policy badalne pe isi page pe update hogi.',
  ],
];

export default function Privacy() {
  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingVertical: space.lg }}>
        <Text style={[type.display, s.title]} role="heading" aria-level={1}>
          Privacy Policy
        </Text>
        <Text style={[ui.muted, s.sub]}>Last updated: 29 Oct 2026</Text>
        <Card>
          {SECTIONS.map(([h, body], i) => (
            <Text key={h} style={[ui.text, i > 0 && { marginTop: space.lg }]}>
              <Text style={{ fontFamily: 'ChakraPetch_700Bold' }}>{h}</Text>
              {'\n'}
              {body}
            </Text>
          ))}
        </Card>
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  title: { color: colors.text, marginHorizontal: space.lg },
  sub: { marginHorizontal: space.lg, marginBottom: space.md },
});
