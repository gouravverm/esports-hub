// Ads on phones: ask for consent where the law needs it (Google UMP), then start AdMob.
import mobileAds, { AdsConsent } from 'react-native-google-mobile-ads';

/** Resolves true when ads may be requested. */
export async function initAds(): Promise<boolean> {
  try {
    const { canRequestAds } = await AdsConsent.gatherConsent();
    if (!canRequestAds) return false;
    await mobileAds().initialize();
    return true;
  } catch {
    return false; // no ads is always a safe fallback
  }
}
