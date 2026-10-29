import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { initAds } from './adsInit';
import { buy, configureStore, isEntitled, loadPlans, restore, storeAvailable, type StorePlan } from './store';

type Premium = {
  isPremium: boolean;
  adsReady: boolean; // consent given and AdMob started (phones only)
  storeReady: boolean; // subscriptions can be bought in this build
  plans: StorePlan[];
  purchase: (planId: string) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
};

const PremiumContext = createContext<Premium>({
  isPremium: false,
  adsReady: false,
  storeReady: false,
  plans: [],
  purchase: async () => false,
  restorePurchases: async () => false,
});

/** Premium state for the whole app; ads start only for users without Premium. */
export function PremiumProvider({ children }: { children: ReactNode }) {
  const [isPremium, setPremium] = useState(false);
  const [adsReady, setAdsReady] = useState(false);
  const [plans, setPlans] = useState<StorePlan[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      let premium = false;
      try {
        await configureStore();
        premium = await isEntitled();
        if (alive) setPlans(await loadPlans());
      } catch {
        // store not reachable: treat as free user
      }
      if (!alive) return;
      setPremium(premium);
      if (!premium) setAdsReady(await initAds());
    })();
    return () => {
      alive = false;
    };
  }, []);

  const purchase = useCallback(async (planId: string) => {
    const ok = await buy(planId);
    if (ok) setPremium(true);
    return ok;
  }, []);

  const restorePurchases = useCallback(async () => {
    const ok = await restore();
    if (ok) setPremium(true);
    return ok;
  }, []);

  return (
    <PremiumContext.Provider value={{ isPremium, adsReady, storeReady: storeAvailable(), plans, purchase, restorePurchases }}>
      {children}
    </PremiumContext.Provider>
  );
}

export const usePremium = () => useContext(PremiumContext);
