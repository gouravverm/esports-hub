// Ads and Premium settings in one place.
//
// Ads: Google AdMob. Until the owner's AdMob account exists, app.json carries Google's published
// *sample* app IDs and the banners use the library's TestIds (test ads, no revenue). To go live,
// put the real app IDs in app.json and the real banner unit IDs in these env vars (EAS env /
// eas.json), then rebuild.
//
// Premium: RevenueCat on top of Google Play / App Store billing. Until the Play Console and
// RevenueCat projects exist the public SDK keys are empty and the Premium screen shows "coming soon".

export const ADS = {
  bannerAndroid: process.env.EXPO_PUBLIC_ADMOB_BANNER_ANDROID ?? '', // empty -> TestIds.ADAPTIVE_BANNER
  bannerIos: process.env.EXPO_PUBLIC_ADMOB_BANNER_IOS ?? '',
};

export const PREMIUM = {
  androidKey: process.env.EXPO_PUBLIC_RC_ANDROID_KEY ?? '', // RevenueCat public SDK keys (safe to ship)
  iosKey: process.env.EXPO_PUBLIC_RC_IOS_KEY ?? '',
  entitlement: 'premium',
  // shown until the store has the products; the store price wins once offerings load
  plans: [
    { id: 'monthly', label: 'Monthly', price: '₹49', per: '/month' },
    { id: 'yearly', label: 'Yearly', price: '₹399', per: '/year', note: 'Save 32%' },
  ],
  perks: [
    { icon: 'remove-circle-outline', title: 'No ads', text: 'Every screen without banners.' },
    { icon: 'notifications-outline', title: 'Live alerts', text: 'Match start, WWCD and final results for the teams you follow.' },
    { icon: 'stats-chart-outline', title: 'Pro stats', text: 'Full player stat tables and Finish vs Fight for every stage.' },
    { icon: 'heart-outline', title: 'Support the app', text: 'Keeps the data free and updated every 30 minutes.' },
  ],
} as const;
