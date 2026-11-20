# Google and local play: live acceptance checklist (0.1.28)

## What the setup steps mean

| Original step | What you configured | In simple terms |
| --- | --- | --- |
| 1. Return URLs | Supabase Site URL and allowed redirect URLs | Tells Supabase which game address it may return the player to after Google sign-in. |
| 2. Google | Google OAuth web client, basic identity scopes, Supabase Google provider and manual identity linking | Google checks who the player is; Supabase remembers the account. Manual linking lets a new Google identity keep an existing guest ID. |
| 3. Local play | No account setup | Players start instantly; progress/times stay in this browser. The old online-guest widget is retired. |
| 5. Vercel settings | Public frontend environment variables | Connects the deployed game to the same services as local development. Local `.env.local` is not uploaded by Git. |

Step 4 (email delivery/templates/SMTP) is skipped. Google does not require it. Configuration being present is different from a completed live sign-in test.

## How players use it now

- **Just play:** Start works without opening the player card or creating any Supabase user. Solo saves and best times live in this browser. Co-op rooms use the existing room server and do not require Google.
- **Existing online guest:** New creation is removed. A previously stored guest can still open its card and link Google without losing its ID or nickname.
- **Google account:** Continue with Google, then choose a public nickname. Returning with the same Google account can retrieve that nickname on another device. Current casual saves/times remain browser-local; logging in does not upload or sync them.
- **Upgrade a guest:** Keep this guest with Google links a Google identity that is not already attached elsewhere, preserving the guest ID/nickname. If it already belongs to another account, expect a clear conflict and an intact guest. Account merging is not implemented.

The trophy is the **local** solo leaderboard. Global top-ten display, trusted ranked gameplay and public score submission are not active yet. A login does not make a casual run ranked. All seven database board records remain closed, including the archived Moonbase record; only six levels are playable. Do not enable them manually to test this UI, and do not upload local times as verified scores.

## Before pushing

1. In Vercel's game project, set these **Config** variables for Production (and Preview when testing there): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`. Keep `VITE_ROOM_SERVER` pointing to the working `wss://.../rooms` server. Use actual values, with no surrounding quotes or `KEY=` in the Value field.
2. In Supabase, the Site URL and allowed redirect must include the exact live game root, including the intended `https://` hostname and trailing `/`. Test the canonical production address first, rather than a changing preview deployment address.
3. In Google, the web client's redirect URI must be `https://eviapvuviucbdgvsjcue.supabase.co/auth/v1/callback`. Enter its Client ID/secret into Supabase's Google provider. Keep manual linking enabled. If Audience is Testing, add the Google accounts being used under Test users.
4. No Turnstile setup or new variables are needed for this update. Existing `VITE_TURNSTILE_SITE_KEY` is unused. Keep Google secrets and Supabase secret/service-role keys out of `VITE_` variables.
5. Push the reviewed source to the connected GitHub production branch. Let Vercel's Git integration build/deploy it. No extra manual CLI deploy is required. Changing Vercel variables requires a new build/redeploy. The game uses room protocol 26, introduced by removing the third ability. Removing the retired ability changes the room protocol: deploy both the Vercel frontend and Render room server for protocol 26. A client will refuse an older server.
6. Wait until Vercel reports Ready for the right commit. Open the live site and confirm the info card shows **0.1.28**. If you still see an old version, reload/clear the old page before testing.

## Test 1: ordinary anonymous play

1. Open a fresh private/incognito window. Do not open the account card yet.
2. Start a level. Check orbit/zoom, selecting a screw, matching boxes and abilities still work.
3. Refresh during a level: expect its loading animation and then the same level/checkpoint directly. Explicit Home should return to Home, while level selection still offers the saved progress.
4. Open the trophy: it should be the local solo leaderboard. A new private window may have no times, which is correct. A successful solo finish adds a time for that level in this browser; a loss or a co-op finish should not add one.

Expected: no forced login, no email prompts and no automatic guest creation. Closing private browsing normally removes its local data.

## Test 2: Google account and nickname

1. Open Login on Home or Player account inside the in-game menu. There should be no email/code entry. Google should be available even if Turnstile is still loading.
2. Choose Continue with Google and your test Google account. Complete Google's consent.
3. Expect to return to the same live game origin with the player card showing a verified account. The temporary `code` should disappear from the address bar.
4. Save a nickname using 3–20 letters A–Z, numbers, spaces, `_` or `-`, beginning with a letter/number. Your Google email stays private in the card.
5. Reload. Reopen the card: the account and nickname should remain. Optionally check Supabase Authentication → Users and Table Editor → `player_profiles`; the profile ID should match that user's ID.
6. Sign out: cancel the confirmation first, then repeat and confirm. The game should remain playable and local saves/times should remain.
7. Sign back into the same Google account. Expect the same nickname and user ID, not a new user each time.
8. Try on a phone/second browser with that account. The nickname should load; current local saves/times do **not** sync. Also try cancelling Google consent once: return/back to the game and confirm playing remains possible.

## Test 3: simpler login and existing guest compatibility

1. In a fresh private window, open Login. Expect Continue with Google and Keep playing; there must be no Create an online guest button, CAPTCHA or email input.
2. Keep playing must close the card and leave ordinary gameplay available. No new Supabase guest is created.
3. If a browser already has an old online guest session, expect that same nickname and **Keep this guest with Google**. Do not create a new test guest for this test.
4. Linking a new Google identity preserves the guest ID/nickname. If that Google identity already belongs to another user, expect a conflict and an intact guest. Do not silently merge accounts.
5. Existing guest sign-out still requires confirmation; ordinary local saves/times survive sign-out.

## Test 4: leaderboard boundary and regressions

1. Finish an ordinary solo round and check its time in the trophy's selected level. Reload and confirm it remains in that browser. Switch levels to confirm separate lists.
2. Sign in/out: the local time should remain. On a fresh browser/device the time should not appear automatically, even with the same Google login.
3. There should be no global submission-success message or global top ten yet. Do not expect this run to publish later: casual/local results are not trusted ranked runs.
4. Create/join a co-op room with a friend, then check independent cameras, screw collection, abilities and exit confirmation. Account UI should not change room leadership or permissions.
5. Repeat the core account-card/sign-in/game controls checks on phone, tablet and desktop. Check there is no horizontal card overflow and inputs/buttons remain usable.

## Common failures

| Symptom | Check |
| --- | --- |
| No player-account button/new version | Confirm the new commit was deployed to the production domain. |
| Accounts unavailable | Check the two `VITE_SUPABASE_*` values in Vercel, then redeploy. |
| Google disabled in the card | Enable/save the Google provider in Supabase; reopen or Refresh sign-in options. |
| Google `redirect_uri_mismatch` | Check Google's authorised redirect URI is the Supabase callback, not the game's URL. |
| Google access blocked while Testing | Check Audience/Test users and the exact selected Google account. |
| Return goes to localhost/wrong site | Check Supabase Site URL/allowed redirects and that the clicked page was the live game. |
| Online-guest button missing | Expected: new online guests were removed in 0.1.28. Ordinary local play remains available. |
| Google sign-in works, nickname cannot save | Check browser network errors, applied `player_profiles` migration/RLS and nickname validation/uniqueness. Do not turn off RLS. |
| No public scores | Expected in this release: trusted ranked sessions and the global UI are the next implementation stage. |

If a test fails, record the step, device/browser, visible error and deployed version. Do not share passwords, private keys, access tokens or the full temporary OAuth return URL.

## Account selection and guest retention

Google can reuse its browser session without an explicit prompt. The game now requests `prompt=select_account` for both Google sign-in and guest linking, asking Google to show its account chooser. Known existing-account conflicts show instructions to choose another account or explicitly sign out of the guest. Cancellation keeps the current guest intact; profiles are never silently merged. The owner confirmed the original Google/nickname/guest flows on live before this release; recheck the new chooser after deployment.

Supabase does not automatically clean up anonymous users. This project has no guest cleanup job, and the live project has no pg_cron extension installed. Forget guest means local sign-out, not deletion of its database row or reserved nickname. Losing a guest session does not remove that row. Google-linked accounts become permanent and are not anonymous cleanup candidates. A future retention policy should track activity and warn before expiring long-inactive unlinked guests; it requires a separate explicit decision. No users have been deleted in this update. See [Supabase automatic cleanup documentation](https://supabase.com/docs/guides/auth/auth-anonymous#automatic-cleanup).
