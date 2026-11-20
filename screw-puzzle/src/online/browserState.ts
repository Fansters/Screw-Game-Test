import type { EmailChallenge } from "./accounts.ts";

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export const sessionStore: Store = {
  getItem: key => window.sessionStorage.getItem(key),
  setItem: (key, value) => window.sessionStorage.setItem(key, value),
  removeItem: key => window.sessionStorage.removeItem(key),
};
const FLOW = "screw-it:account-return", EMAIL = "screw-it:email-challenge";
const TTL = 10 * 60_000;
const authKeys = ["code", "sb_flow_id", "error", "error_code", "error_description", "access_token", "refresh_token", "id_token", "token_hash", "expires_in", "expires_at", "token_type", "provider_token", "provider_refresh_token"];
type Intent = { at: number; guestId?: string; room?: string };
function read<T extends { at: number }>(store: Store, key: string, now: number): T | null {
  try {
    const value = JSON.parse(store.getItem(key) ?? "null");
    return value && typeof value.at === "number" && now >= value.at && now - value.at <= TTL ? value : null;
  } catch { return null; }
}
export function readAccountIntent(store: Store, now = Date.now()): Intent | null {
  const value = read<Intent>(store, FLOW, now);
  return value ? { at: value.at, guestId: typeof value.guestId === "string" ? value.guestId : undefined,
    room: typeof value.room === "string" && /^[\w-]{24}$/.test(value.room) ? value.room : undefined } : null;
}
export function rememberAccountIntent(store: Store, href: string, guestId?: string, now = Date.now()) {
  const room = new URL(href).searchParams.get("room");
  store.setItem(FLOW, JSON.stringify({ at: now, guestId, room: room && /^[\w-]{24}$/.test(room) ? room : undefined }));
}
export function clearAccountIntent(store: Store) { try { store.removeItem(FLOW); } catch { /* Storage can be unavailable. */ } }
export function isAccountReturn(href: string) {
  const url = new URL(href), hash = new URLSearchParams(url.hash.slice(1));
  return authKeys.some(key => url.searchParams.has(key) || hash.has(key));
}
export function cleanAccountUrl(href: string, analytics = false) {
  const url = new URL(href);
  authKeys.forEach(key => url.searchParams.delete(key));
  if (analytics) { url.search = ""; url.hash = ""; }
  const hash = new URLSearchParams(url.hash.slice(1));
  if (authKeys.some(key => hash.has(key))) url.hash = "";
  return url.toString();
}
export function restoreAccountInvite(href: string, store: Store) {
  const url = new URL(href), intent = readAccountIntent(store);
  if (isAccountReturn(href) && intent?.room && !url.searchParams.has("room")) url.searchParams.set("room", intent.room);
  return url.toString();
}
export function rememberEmailChallenge(store: Store, challenge: EmailChallenge, now = Date.now()) {
  try { store.setItem(EMAIL, JSON.stringify({ ...challenge, at: now })); } catch { /* Current dialog still holds it in memory. */ }
}
export function readEmailChallenge(store: Store, now = Date.now()): EmailChallenge | null {
  const value = read<EmailChallenge & { at: number }>(store, EMAIL, now);
  if (!value || typeof value.email !== "string" || value.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email) || !["email", "email_change"].includes(value.type)) return null;
  if (value.guestUserId !== undefined && typeof value.guestUserId !== "string") return null;
  if (value.type === "email_change" && typeof value.guestUserId !== "string") return null;
  return { email: value.email, type: value.type, guestUserId: value.guestUserId };
}
export function clearEmailChallenge(store: Store) { try { store.removeItem(EMAIL); } catch { /* Storage can be unavailable. */ } }
