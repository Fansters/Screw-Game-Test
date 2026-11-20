export type OnlineConfig = { url: string; publishableKey: string };
export const accountStorageKey = (config: OnlineConfig) => `screw-it:auth:${new URL(config.url).hostname}`;
export function parseOnlineConfig(url?: string, key?: string): OnlineConfig | null {
  const endpoint = url?.trim(), publishableKey = key?.trim();
  if (!endpoint && !publishableKey) return null;
  let parsed: URL;
  try { parsed = new URL(endpoint ?? ""); } catch { throw new Error("Set a valid Supabase project URL."); }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash) {
    throw new Error("Use the HTTPS Supabase project URL without a path, credentials or query.");
  }
  if (!publishableKey?.startsWith("sb_publishable_") || publishableKey.length <= "sb_publishable_".length) {
    throw new Error("Use a Supabase publishable key in the browser, never a secret or service-role key.");
  }
  return { url: parsed.origin, publishableKey };
}
