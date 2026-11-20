# Google and leaderboard: live checklist (0.1.30)

## What the setup did

1. **Return URLs:** tell Supabase which game addresses it may return to after sign-in.
2. **Google OAuth:** Google checks the player's identity; Supabase keeps their session and account.
3. **Local play:** anyone can play immediately, without creating an account. Saves and personal times stay in that browser.
4. **Email/SMTP:** skipped. Google does not need it.
5. **Vercel variables:** connect the deployed frontend to Supabase and the existing co-op server.

Existing online guest accounts can still link Google. New online guests are no longer created. Account merging is not implemented: an already-linked Google identity cannot silently replace another guest.

## Before publishing

- The casual leaderboard migration is already applied; do not run it again manually.
- Vercel Config variables must include VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY. Keep VITE_ROOM_SERVER. No new variable or Turnstile setup is needed.
- Check Supabase Site URL/redirect allow-list and the Google callback URI: https://eviapvuviucbdgvsjcue.supabase.co/auth/v1/callback. Google secrets stay in Supabase, never in VITE_ values.
- Push the reviewed source to the connected GitHub production branch. Wait for Vercel Ready and confirm version 0.1.30. Local .env.local is ignored by Git; changed Vercel variables require a new build.
- Room protocol is still 26. This leaderboard release needs no Render configuration or room-server code change.

## Test 1: ordinary guest

1. Open a private window without signing in. Start/resume a solo level.
2. Open Leaderboard. Online should be readable without sign-in; choose any of the six levels.
3. Finish a level. Its time should appear under This device, with no public upload.
4. Sign in afterward. That earlier guest win must remain local.
5. Refresh a playing level: it should reopen the same level and offer/resume its saved progress.

## Test 2: Google and a real online result

1. Sign in with Google, save a public nickname, and leave the player card.
2. Finish any solo level while still signed in. Use an ability if you want to check the metadata.
3. The winning screen should show your time and confirm the online save. If the connection fails, it should show an upload waiting message.
4. Open Leaderboard → Online → that level. Confirm your nickname, time and ability counts; with an empty board you will be first.
5. Reload. Open the same board on another device; the public result should be there. Sign in there to see the You marker/personal placement.
6. A faster later win should improve your best. A slower win must not create a second public slot or replace the faster time.
7. Open This device: local history remains independent. Another device does not receive unfinished progress or old local history.

## Test 3: resume and retries

1. While signed in, remove some screws, exit to Home, and resume. Finish and confirm Resumed on the online entry if this result becomes your best.
2. Finish with the connection interrupted. Restore the network; the same account should upload its queued result once. Refreshing must not duplicate it.
3. If no nickname exists at the finish, choose one from the prompt/player card. The queued result should publish afterward.
4. Sign out with an upload pending, then sign into a different account. It must not receive the first account's result. Return to the original account to retry.
5. Changing your public nickname should update its display on your existing result.

## Test 4: regressions

Check phone, tablet and desktop menus and cards. Icons should share a starting rail, with nearby left-aligned labels. Leaderboard must scroll vertically without horizontal clipping. Verify local saves, Google session restoration/sign-out, and a co-op game with independent cameras and current shared boxes. Co-op wins must not enter this solo leaderboard.

## If something fails

| Symptom | Check |
| --- | --- |
| Old UI or no Online tab | Check the deployed commit/version, then reload. |
| Accounts/boards unavailable | Check both VITE_SUPABASE_* Config values and redeploy. |
| Google redirect error | Google's redirect is the Supabase callback; Supabase's redirects are the game's URLs. |
| Can't choose a public name | Use a unique 3–20 character nickname with letters, numbers, spaces, _ or -. |
| First finished time still waiting | Check connection, same Google account, nickname and Retry upload. Local time remains safe. |
| No public record after a guest win | Expected: Google sign-in is required at the finish; older guest history is not imported. |
| Result not in top 10 | Check Your best below the list, the selected level and current layout. |
| Same Google already belongs elsewhere | Use the existing account or a different Google identity; guests are never silently merged. |

Share the step, device/browser, visible message and app version when reporting a fault. Do not share access tokens, private keys or temporary OAuth callback URLs.
