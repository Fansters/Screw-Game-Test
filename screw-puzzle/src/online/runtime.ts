import { createOnlineClient } from "./client.ts";
import { parseOnlineConfig } from "./config.ts";
import { accountError } from "./errors.ts";
import { cleanAccountUrl, clearAccountIntent, clearEmailChallenge, isAccountReturn, readAccountIntent, sessionStore } from "./browserState.ts";

let boot: ReturnType<typeof initialize> | undefined;
async function initialize() {
  const config = parseOnlineConfig(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
  if (!config) throw new Error("Online accounts are unavailable.");
  const client = createOnlineClient(config);
  // Email sign-in is deferred. Retire old UI challenges without issuing mail.
  clearEmailChallenge(sessionStore);
  let callbackError = "";
  if (isAccountReturn(location.href)) {
    const url = new URL(location.href), intent = readAccountIntent(sessionStore);
    try {
      const before = await client.auth.getSession();
      if (before.error) throw before.error;
      // Another tab may have switched accounts while Google was open. Do not
      // consume a guest-link code into a different or missing local identity.
      if (intent?.guestId && before.data.session?.user.id !== intent.guestId) {
        throw Object.assign(new Error("Account identity changed"), { code: "identity_changed" });
      }
      const code = url.searchParams.get("code"), flowId = url.searchParams.get("sb_flow_id");
      if (!code || url.searchParams.has("error") || new URLSearchParams(url.hash.slice(1)).has("error")) throw new Error("Sign-in return failed");
      const { data, error } = await client.auth.exchangeCodeForSession(code, flowId ? { flowId } : undefined);
      if (error) throw error;
      const expected = intent?.guestId ?? (before.data.session?.user.is_anonymous ? before.data.session.user.id : undefined);
      if (expected && data.user?.id !== expected) {
        if (before.data.session?.user.id === expected) {
          const { access_token, refresh_token } = before.data.session;
          const restored = await client.auth.setSession({ access_token, refresh_token });
          if (restored.error) throw restored.error;
        }
        throw Object.assign(new Error("Account identity changed"), { code: "identity_changed" });
      }
      if (data.user && !data.user.is_anonymous) clearEmailChallenge(sessionStore);
    } catch (error) { callbackError = accountError(error); }
    finally {
      history.replaceState(history.state, "", cleanAccountUrl(location.href));
      clearAccountIntent(sessionStore);
    }
  }
  return { client, callbackError };
}
// One boot promise prevents Strict Mode and remounts exchanging a PKCE code twice.
export function bootAccount() { return boot ??= initialize().catch(error => { boot = undefined; throw error; }); }
export async function accountProviders() {
  const config = parseOnlineConfig(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
  if (!config) throw new Error("Online accounts are unavailable.");
  const response = await fetch(`${config.url}/auth/v1/settings`, { headers: { apikey: config.publishableKey }, signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error("Account settings unavailable");
  const data = await response.json();
  return { google: data.external?.google === true, anonymous: data.external?.anonymous_users === true };
}
