import { Platform, StyleSheet, Text, View } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

import { ADS } from '@/lib/monetization';
import { usePremium } from '@/lib/premium';
import { colors, fonts, space } from '@/lib/theme';

/** An inline banner between sections. Hidden for Premium users and until consent + init. */
export function AdBanner() {
  const { isPremium, adsReady } = usePremium();
  if (isPremium || !adsReady) return null;
  const real = Platform.OS === 'ios' ? ADS.bannerIos : ADS.bannerAndroid;
  return (
    <View style={s.wrap}>
      <Text style={s.label}>Ad</Text>
      <BannerAd unitId={real || TestIds.ADAPTIVE_BANNER} size={BannerAdSize.INLINE_ADAPTIVE_BANNER} maxHeight={120} />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { alignItems: 'center', marginTop: space.xl, marginHorizontal: space.lg },
  label: { fontFamily: fonts.body, fontSize: 11, color: colors.faint, alignSelf: 'flex-start', marginBottom: 4 },
});
