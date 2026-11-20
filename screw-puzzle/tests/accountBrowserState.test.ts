import assert from "node:assert/strict";
import { test } from "node:test";
import { cleanAccountUrl, clearEmailChallenge, isAccountReturn, readAccountIntent, readEmailChallenge, rememberAccountIntent, rememberEmailChallenge, restoreAccountInvite } from "../src/online/browserState.ts";
import { accountError } from "../src/online/errors.ts";
function storage() {
  const data = new Map<string,string>();
  return { data, getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key,value); }, removeItem: (key: string) => { data.delete(key); } };
}
test("auth returns preserve room invitations while analytics and final URLs discard credentials", () => {
  const room = "abcdefghijklmnopqrstuvwx", store = storage();
  rememberAccountIntent(store, `https://game.example/?room=${room}`, "guest-id");
  const callback = `https://game.example/?code=private-code&sb_flow_id=private-flow#error=private-error`;
  assert.ok(isAccountReturn(callback));
  const restored = restoreAccountInvite(callback, store);
  assert.equal(new URL(restored).searchParams.get("room"), room);
  assert.equal(cleanAccountUrl(restored), `https://game.example/?room=${room}`);
  assert.equal(cleanAccountUrl(restored, true), "https://game.example/");
  assert.equal(cleanAccountUrl("https://game.example/?arbitrary=private#id_token=private", true), "https://game.example/");
  assert.equal(isAccountReturn("https://game.example/?room=ordinary"), false);
  assert.equal(restoreAccountInvite("https://game.example/", store), "https://game.example/");
});
test("guest linking intent and email challenges expire and never retain entered codes or passwords", () => {
  const store = storage();
  rememberAccountIntent(store, "https://game.example/?room=not-a-room", "guest-id", 1000);
  assert.equal(readAccountIntent(store, 1001)?.room, undefined);
  assert.equal(readAccountIntent(store, 700000), null);
  const challenge = { email: "player@example.com", type: "email_change" as const, guestUserId: "guest-id" };
  rememberEmailChallenge(store, challenge, 1000);
  assert.deepEqual(readEmailChallenge(store, 2000), challenge);
  assert.equal(readEmailChallenge(store, 999), null);
  assert.equal(readEmailChallenge(store, 700000), null);
  assert.ok([...store.data.values()].every(value => !value.includes("password") && !value.includes('"token"')));
  clearEmailChallenge(store);
  assert.equal(readEmailChallenge(store, 2000), null);
  const blocked = { getItem: () => { throw new Error("Storage denied"); }, setItem: () => {}, removeItem: () => {} };
  assert.equal(readEmailChallenge(blocked), null);
});
test("account error text is actionable without echoing untrusted provider messages", () => {
  assert.match(accountError({ code: "identity_already_exists", message: "secret-token" }), /not been merged/);
  assert.match(accountError({ code: "23505" }), /name is taken/);
  assert.match(accountError({ code: "otp_expired" }), /expired/);
  assert.ok(!accountError({ message: "<script>private-code</script>" }).includes("private-code"));
});
