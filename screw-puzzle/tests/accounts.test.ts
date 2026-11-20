import assert from "node:assert/strict";
import { test } from "node:test";
import { parseOnlineConfig } from "../src/online/config.ts";
import { normalizeNickname } from "../src/online/nickname.ts";
import { continueAsOnlineGuest, requestEmailAccount, startGoogleAccount, verifyEmailAccount } from "../src/online/accounts.ts";
import type { AccountAuth } from "../src/online/accounts.ts";

function authFixture(user: { id: string; is_anonymous: boolean } | null = null) {
  const calls: { name: string; args: unknown[] }[] = [];
  const success = (name: string) => async (...args: unknown[]) => { calls.push({ name, args }); return { data: { user }, error: null }; };
  const auth = { getSession: async () => ({ data: { session: user ? { user } : null }, error: null }),
    signInAnonymously: success("guest"), linkIdentity: success("link"), signInWithOAuth: success("oauth"),
    updateUser: success("update"), signInWithOtp: success("otp"), verifyOtp: success("verify") } as unknown as AccountAuth;
  return { auth, calls };
}

test("public configuration rejects secret keys and credential-bearing URLs without exposing their values", () => {
  assert.equal(parseOnlineConfig(), null);
  assert.deepEqual(parseOnlineConfig("https://game.supabase.co/", "sb_publishable_example"), { url: "https://game.supabase.co", publishableKey: "sb_publishable_example" });
  for (const key of ["sb_secret_never-print-me", "eyJservice-role", ""]) assert.throws(() => parseOnlineConfig("https://game.supabase.co", key), error => !String(error).includes(key || "unrelated-value"));
  for (const url of ["http://game.supabase.co", "https://user:password@game.supabase.co", "https://game.supabase.co/rest/v1", "https://game.supabase.co?token=secret"]) assert.throws(() => parseOnlineConfig(url, "sb_publishable_test"));
});

test("public nicknames are normalized and reject unsupported characters and excessive length", () => {
  assert.equal(normalizeNickname("  Screw   Hero  "), "Screw Hero");
  for (const name of ["ab", "<script>alert(1)</script>", "a".repeat(21), "_player", "a\nb"]) assert.throws(() => normalizeNickname(name));
});

test("online guests are explicit and CAPTCHA protected; an existing identity is preserved", async () => {
  const fresh = authFixture();
  await assert.rejects(continueAsOnlineGuest(fresh.auth));
  assert.equal(fresh.calls.length, 0);
  await continueAsOnlineGuest(fresh.auth, "captcha-proof");
  assert.equal(fresh.calls[0].name, "guest");
  const existing = authFixture({ id: "guest-id", is_anonymous: true });
  assert.equal((await continueAsOnlineGuest(existing.auth))?.id, "guest-id");
  assert.equal(existing.calls.length, 0);
});

test("Google upgrades link to the existing guest while fresh sign-ins use OAuth", async () => {
  const guest = authFixture({ id: "same-guest", is_anonymous: true });
  await startGoogleAccount(guest.auth, "https://game.example");
  assert.equal(guest.calls[0].name, "link");
  const fresh = authFixture();
  await startGoogleAccount(fresh.auth, "https://game.example");
  assert.equal(fresh.calls[0].name, "oauth");
});

test("guest email upgrades use the email-change challenge and never silently switch existing accounts", async () => {
  const guest = authFixture({ id: "guest-id", is_anonymous: true });
  const challenge = await requestEmailAccount(guest.auth, " Player@Example.com ", "https://game.example");
  assert.deepEqual(challenge, { email: "player@example.com", type: "email_change", guestUserId: "guest-id" });
  assert.equal(guest.calls[0].name, "update");
  await verifyEmailAccount(guest.auth, challenge, "123456");
  assert.deepEqual(guest.calls[1].args[0], { email: challenge.email, token: "123456", type: "email_change" });
  await assert.rejects(verifyEmailAccount(guest.auth, challenge, "invalid"));
  const registered = authFixture({ id: "existing-id", is_anonymous: false });
  await assert.rejects(requestEmailAccount(registered.auth, "other@example.com", "https://game.example"));
  await assert.rejects(verifyEmailAccount(registered.auth, challenge, "123456"));
  const fresh = authFixture();
  assert.equal((await requestEmailAccount(fresh.auth, "new@example.com", "https://game.example")).type, "email");
  assert.equal(fresh.calls[0].name, "otp");
});

test("a mismatched email verification restores the guest session instead of replacing it", async () => {
  let restored = false;
  const auth = {
    getSession: async () => ({ data: { session: { user: { id: "guest-id" }, access_token: "old-access", refresh_token: "old-refresh" } }, error: null }),
    verifyOtp: async () => ({ data: { user: { id: "other-id" } }, error: null }),
    setSession: async (session: unknown) => { assert.deepEqual(session, { access_token: "old-access", refresh_token: "old-refresh" }); restored = true; return { error: null }; },
  } as unknown as AccountAuth;
  await assert.rejects(verifyEmailAccount(auth, { email: "player@example.com", type: "email_change", guestUserId: "guest-id" }, "123456"));
  assert.ok(restored);
});
