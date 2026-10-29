// Subscriptions on phones: RevenueCat over Google Play / App Store billing.
import { Platform } from 'react-native';
import Purchases, { type PurchasesPackage } from 'react-native-purchases';

import { PREMIUM } from './monetization';

export type StorePlan = { id: string; title: string; price: string };

let configured = false;
let packages: PurchasesPackage[] = [];

const key = () => (Platform.OS === 'ios' ? PREMIUM.iosKey : PREMIUM.androidKey);

/** True when the store is set up for this build (an SDK key exists). */
export function storeAvailable(): boolean {
  return Boolean(key());
}

export async function configureStore(): Promise<void> {
  if (configured || !storeAvailable()) return;
  Purchases.configure({ apiKey: key() });
  configured = true;
}

export async function isEntitled(): Promise<boolean> {
  if (!configured) return false;
  const info = await Purchases.getCustomerInfo();
  return typeof info.entitlements.active[PREMIUM.entitlement] !== 'undefined';
}

export async function loadPlans(): Promise<StorePlan[]> {
  if (!configured) return [];
  const offerings = await Purchases.getOfferings();
  packages = offerings.current?.availablePackages ?? [];
  return packages.map((p) => ({ id: p.identifier, title: p.product.title, price: p.product.priceString }));
}

/** Buys a plan; resolves true when the premium entitlement is active afterwards. */
export async function buy(planId: string): Promise<boolean> {
  const pkg = packages.find((p) => p.identifier === planId);
  if (!pkg) return false;
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return typeof customerInfo.entitlements.active[PREMIUM.entitlement] !== 'undefined';
}

export async function restore(): Promise<boolean> {
  if (!configured) return false;
  const info = await Purchases.restorePurchases();
  return typeof info.entitlements.active[PREMIUM.entitlement] !== 'undefined';
}
