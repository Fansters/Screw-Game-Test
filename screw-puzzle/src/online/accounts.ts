import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeNickname } from "./nickname.ts";

export type AccountAuth = Pick<SupabaseClient["auth"], "getSession" | "signInAnonymously" | "signInWithOAuth" |
  "linkIdentity" | "updateUser" | "signInWithOtp" | "verifyOtp" | "setSession">;
export type EmailChallenge = { email: string; type: "email" | "email_change"; guestUserId?: string };

async function currentSession(auth: AccountAuth) {
  const { data, error } = await auth.getSession();
  if (error) throw error;
  return data.session;
}

function checkedEmail(value: string) {
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address.");
  return email;
}

// No automatic anonymous sign-up on page visits. A future Guest action must
// supply a fresh CAPTCHA token; an existing session is reused without changes.
export async function continueAsOnlineGuest(auth: AccountAuth, captchaToken?: string) {
  const session = await currentSession(auth);
  if (session) return session.user;
  if (!captchaToken?.trim()) throw new Error("Complete the verification before creating an online guest profile.");
  const { data, error } = await auth.signInAnonymously({ options: { captchaToken } });
  if (error) throw error;
  return data.user;
}

export async function startGoogleAccount(auth: AccountAuth, redirectTo: string) {
  const session = await currentSession(auth);
  // Linking preserves the guest UUID and its future server-verified results.
  // Never sign out first, or silently replace a guest with a new OAuth user.
  const result = session ? await auth.linkIdentity({ provider: "google", options: { redirectTo } }) :
    await auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
  if (result.error) throw result.error;
}

export async function requestEmailAccount(auth: AccountAuth, value: string, redirectTo: string, captchaToken?: string): Promise<EmailChallenge> {
  const email = checkedEmail(value), session = await currentSession(auth);
  if (session && !session.user.is_anonymous) throw new Error("You are already signed in. Account switching needs an explicit sign-out.");
  if (session) {
    const { error } = await auth.updateUser({ email }, { emailRedirectTo: redirectTo });
    if (error) throw error;
    return { email, type: "email_change", guestUserId: session.user.id };
  }
  const { error } = await auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo, captchaToken } });
  if (error) throw error;
  return { email, type: "email" };
}

export async function verifyEmailAccount(auth: AccountAuth, challenge: EmailChallenge, value: string) {
  const token = value.trim();
  if (!/^\d{6}$/.test(token)) throw new Error("Enter the six-digit email code.");
  const previous = challenge.guestUserId ? await currentSession(auth) : null;
  if (challenge.guestUserId && previous?.user.id !== challenge.guestUserId) {
    throw Object.assign(new Error("Account identity changed"), { code: "identity_changed" });
  }
  const { data, error } = await auth.verifyOtp({ email: challenge.email, token, type: challenge.type });
  if (error) throw error;
  if (challenge.guestUserId && data.user?.id !== challenge.guestUserId) {
    if (previous) {
      const restored = await auth.setSession({ access_token: previous.access_token, refresh_token: previous.refresh_token });
      if (restored.error) throw restored.error;
    }
    throw Object.assign(new Error("Guest link could not be confirmed"), { code: "identity_changed" });
  }
  return data.user;
}

export async function saveAccountNickname(client: SupabaseClient, value: string, expectedUserId?: string) {
  const nickname = normalizeNickname(value);
  const { data, error } = await client.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error("Choose an online guest profile or sign in first.");
  if (expectedUserId && data.user.id !== expectedUserId) throw Object.assign(new Error("Account identity changed"), { code: "identity_changed" });
  const result = await client.from("player_profiles").upsert({ id: data.user.id, nickname });
  if (result.error) throw result.error;
}
