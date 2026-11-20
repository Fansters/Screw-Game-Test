import { createClient } from "@supabase/supabase-js";
import type { OnlineConfig } from "./config.ts";
import { accountStorageKey, parseOnlineConfig } from "./config.ts";

// Instantiate only when online accounts/rankings are enabled. Import this
// module dynamically from that UI to keep Auth off the title/level load path.
export function createOnlineClient(config: OnlineConfig) {
  const checked = parseOnlineConfig(config.url, config.publishableKey);
  if (!checked) throw new Error("Configure the Supabase project before creating an account client.");
  return createClient(checked.url, checked.publishableKey, {
    auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true,
      detectSessionInUrl: false, storageKey: accountStorageKey(checked) },
  });
}
