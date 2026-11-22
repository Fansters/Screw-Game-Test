import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { PlayerKind } from "./accountContext";
import { PROFILE_CHANGED } from "../online/casualScores";
import AccountModal from "./AccountModal";
import { accountProviders, bootAccount } from "../online/runtime";
import { saveAccountNickname, startGoogleAccount } from "../online/accounts";
import { clearAccountIntent, rememberAccountIntent, sessionStore } from "../online/browserState";
import { accountError } from "../online/errors";
import { normalizeNickname } from "../online/nickname";
import { AVATARS, COUNTRY_CODES, countryName, isAvatar, isCountry } from "../game/playerIdentity";
import type { AvatarId } from "../game/playerIdentity";
import PlayerAvatar from "./PlayerAvatar";

type Providers = Awaited<ReturnType<typeof accountProviders>>;
export default function AccountDialog({ open, onClose, onKind }: { open: boolean; onClose: () => void; onKind: (kind: PlayerKind, playerId?: string | null) => void }) {
  const [client, setClient] = useState<SupabaseClient>();
  const [user, setUser] = useState<User | null>(null);
  const [providers, setProviders] = useState<Providers>();
  const [profile, setProfile] = useState<{ id: string; error?: string }>();
  const [nickname, setNickname] = useState("");
  const [avatar, setAvatar] = useState<AvatarId>("fox");
  const [country, setCountry] = useState("");
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [retry, setRetry] = useState(0);
  const [confirmOut, setConfirmOut] = useState(false);
  const anonymous = user?.is_anonymous === true;
  const permanent = Boolean(user && !anonymous);
  const confirmed = permanent && Boolean(user?.email_confirmed_at);
  const callbackUrl = `${location.origin}/`;

  useEffect(() => {
    let alive = true, unsubscribe: (() => void) | undefined;
    void bootAccount().then(async result => {
      if (!alive) return;
      setClient(result.client);
      if (result.callbackError) setMessage(result.callbackError);
      const adopt = (next: User | null) => {
        if (!alive) return;
        setUser(next);
        const google = next && !next.is_anonymous && (next.identities?.some(identity => identity.provider === "google") ||
          Array.isArray(next.app_metadata.providers) && next.app_metadata.providers.includes("google"));
        onKind(next ? next.is_anonymous ? "guest" : "player" : null, google ? next.id : null);
      };
      const listener = result.client.auth.onAuthStateChange((event, session) => {
        // No Supabase calls/awaits here: its Auth lock is still held.
        adopt(session?.user ?? null);
        if (event === "SIGNED_OUT") setConfirmOut(false);
      });
      unsubscribe = () => listener.data.subscription.unsubscribe();
      const saved = await result.client.auth.getSession();
      if (saved.error) throw saved.error;
      adopt(saved.data.session?.user ?? null);
      if (saved.data.session) {
        const verified = await result.client.auth.getUser();
        if (verified.error) throw verified.error;
        adopt(verified.data.user);
      }
    }).catch(error => { if (alive) setMessage(accountError(error)); })
      .finally(() => { if (alive) setInitializing(false); });
    return () => { alive = false; unsubscribe?.(); };
  }, [onKind, retry]);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    void accountProviders().then(next => { if (alive) setProviders(next); }).catch(() => {
      if (alive) setNotice("Sign-in options couldn’t load. Check your connection and try again.");
    });
    return () => { alive = false; };
  }, [open, retry]);

  const userId = user?.id;
  useEffect(() => {
    if (!client || !userId || !open) return;
    let alive = true;
    void Promise.resolve(client.from("player_profiles").select("nickname,avatar,country").eq("id", userId).maybeSingle()).then(({ data, error }) => {
      if (!alive) return;
      setProfile({ id: userId, error: error ? accountError(error) : undefined });
      setNickname(typeof data?.nickname === "string" ? data.nickname : "");
      setAvatar(isAvatar(data?.avatar) ? data.avatar : "fox");
      setCountry(isCountry(data?.country) ? data.country : "");
      setEditing(!data?.nickname);
    }).catch(() => { if (alive) setProfile({ id: userId, error: "Your player name couldn’t load. Please reopen your card to try again." }); });
    return () => { alive = false; };
  }, [client, userId, open]);

  async function action(task: () => Promise<void>) {
    if (busy || initializing) return;
    setBusy(true); setMessage(""); setNotice("");
    try { await task(); } catch (error) { setMessage(accountError(error)); }
    finally { setBusy(false); }
  }
  async function saveName(event: FormEvent) {
    event.preventDefault(); if (!client || !userId || profile?.id !== userId) return;
    let value: string;
    try { value = normalizeNickname(nickname); } catch { setMessage("Use 3–20 letters A–Z, numbers, spaces, underscores or hyphens. Start with a letter or number."); return; }
    await action(async () => { await saveAccountNickname(client, value, userId, { avatar, country: country || null }); setNickname(value); setEditing(false); setNotice("Player card saved."); window.dispatchEvent(new Event(PROFILE_CHANGED)); });
  }
  function closeCard() { onClose(); }
  return <AccountModal open={open} onClose={closeCard}>
    <div className={`player-pass player-banner${anonymous ? " guest-pass" : ""}`}>
      <span className="player-avatar"><PlayerAvatar avatar={profile?.id === userId ? avatar : "fox"} /></span>
      <div><span className="player-eyebrow">SCREW IT! · PLAYER PASS</span><strong>{permanent && profile?.id === userId ? nickname || "Your next adventure" : anonymous ? "Guest explorer" : "Hello, adventurer"}</strong>
        <span>{confirmed ? "Google connected" : permanent ? "Player account" : "Play freely. Make it yours."}</span></div>
    </div>
    {permanent && <dl className="player-meta"><div><dt>Member since</dt><dd>{new Intl.DateTimeFormat("en", { month: "short", year: "numeric" }).format(new Date(user!.created_at))}</dd></div><div><dt>Country</dt><dd>{profile?.id === userId && country ? countryName(country) : "Not shared"}</dd></div></dl>}
    {message && <p className="account-message error" role="alert">{message}</p>}
    {notice && <p className="account-message" role="status">{notice}</p>}
    {initializing ? <p role="status">Opening your player card…</p> : !client ?
      <button className="account-button" onClick={() => { setInitializing(true); setMessage(""); setRetry(value => value + 1); }}>Try again</button> : <>
      {!permanent && <>
        <button className="account-button google" disabled={busy || !providers?.google} onClick={() => void action(async () => {
          rememberAccountIntent(sessionStore, location.href, anonymous ? user?.id : undefined);
          try { await startGoogleAccount(client.auth, callbackUrl); } catch (error) { clearAccountIntent(sessionStore); throw error; }
        })}><span aria-hidden="true">G</span> {anonymous ? "Keep this guest with Google" : "Continue with Google"}</button>
        {providers && !providers.google && <p className="account-hint">Google sign-in isn’t available yet.</p>}
        {!user && <p className="account-hint">No account needed to play. Sign in with Google to save times on the leaderboard.</p>}
      </>}
      {user && <>
        {profile && profile.id === userId ? profile.error ? <p className="account-message error" role="alert">{profile.error}</p> :
          <><button type="button" className="account-button profile-edit-toggle" aria-expanded={editing} aria-controls="profile-editor" onClick={() => setEditing(value => !value)}>{editing ? "Done customizing" : "Customize your card"}</button>
          <form id="profile-editor" hidden={!editing} className="account-form nickname-form" onSubmit={saveName}>
            <fieldset className="avatar-picker" disabled={busy}><legend>Pick your sidekick</legend><div>{AVATARS.map(id => <button key={id} type="button" className={avatar === id ? "avatar-choice selected" : "avatar-choice"} aria-label={`Choose ${id} avatar`} aria-pressed={avatar === id} onClick={() => setAvatar(id)}><PlayerAvatar avatar={id} /></button>)}</div></fieldset>
            <label htmlFor="account-nickname">Player name</label>
            <input id="account-nickname" value={nickname} onChange={event => setNickname(event.target.value)} placeholder="ScrewHero" minLength={3} maxLength={20}
              autoComplete="nickname" required disabled={busy} aria-describedby="nickname-note" />
            <small id="nickname-note">Public · 3–20 letters, numbers, spaces, _ or -</small>
            <label htmlFor="account-country">Country <small>optional</small></label>
            <select id="account-country" value={country} disabled={busy} onChange={event => setCountry(event.target.value)} aria-describedby="country-note"><option value="">Not shared</option>{[...COUNTRY_CODES].sort((a,b) => countryName(a).localeCompare(countryName(b))).map(code => <option key={code} value={code}>{countryName(code)}</option>)}</select>
            <small id="country-note">Selected country appears on the leaderboard. No location tracking.</small>
            <button className="account-button primary" disabled={busy}>{busy ? "Saving…" : "Save player card"}</button>
          </form></> : <p role="status">Getting your player name…</p>}
        {confirmOut ? <div className="account-signout-check">
          <p>{anonymous ? "Forget this guest? Link Google first if you want to keep this profile. Signing out cannot be undone for a guest." : "Sign out on this device? Your online scores stay with your account, and your saved puzzle stays here."}</p>
          <button className="account-button danger" disabled={busy} onClick={() => void action(async () => {
            const result = await client.auth.signOut({ scope: "local" }); if (result.error) throw result.error;
            clearAccountIntent(sessionStore); setUser(null); onKind(null); setConfirmOut(false); setNotice("Signed out on this device.");
          })}>{anonymous ? "Forget guest" : "Sign out"}</button>
          <button className="account-link" disabled={busy} onClick={() => setConfirmOut(false)}>Keep my account here</button>
        </div> : <button className="account-link" disabled={busy} onClick={() => setConfirmOut(true)}>{anonymous ? "Forget this guest" : "Sign out on this device"}</button>}
      </>}
      {!permanent && <button className="account-link" disabled={busy} onClick={() => { setNotice(""); setRetry(value => value + 1); }}>Refresh sign-in options</button>}
    </>}
    <p className="account-footnote">Online times follow your account. Unfinished puzzles stay on this device.</p>
    <button className="account-button keep-playing" onClick={closeCard}>Keep playing</button>
  </AccountModal>;
}
