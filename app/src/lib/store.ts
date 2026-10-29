// Web build: in-app subscriptions exist only in the Android / iOS apps (store.native.ts).
export type StorePlan = { id: string; title: string; price: string };

export function storeAvailable(): boolean {
  return false;
}
export async function configureStore(): Promise<void> {}
export async function isEntitled(): Promise<boolean> {
  return false;
}
export async function loadPlans(): Promise<StorePlan[]> {
  return [];
}
export async function buy(_planId: string): Promise<boolean> {
  return false;
}
export async function restore(): Promise<boolean> {
  return false;
}
