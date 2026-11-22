# Google and leaderboard: live checklist (0.1.35)

## What the setup did

1. **Return URLs:** tell Supabase which game addresses it may return to after sign-in.
2. **Google OAuth:** Google checks the player's identity; Supabase keeps their session and account.
3. **Local play:** anyone can play immediately, without creating an account. Unfinished progress stays in that browser; guest finish times are not stored.
4. **Email/SMTP:** skipped. Google does not need it.
5. **Vercel variables:** connect the deployed frontend to Supabase and the existing co-op server.

Existing online guest accounts can still link Google. New online guests are no longer created. Account merging is not implemented: an already-linked Google identity cannot silently replace another guest.

## Before publishing

- The casual leaderboard migration is already applied; do not run it again manually.
- Vercel Config variables must include VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY. Keep VITE_ROOM_SERVER. No new variable or Turnstile setup is needed.
- Check Supabase Site URL/redirect allow-list and the Google callback URI: https://eviapvuviucbdgvsjcue.supabase.co/auth/v1/callback. Google secrets stay in Supabase, never in VITE_ values.
- Push the reviewed source to the connected GitHub production branch. Wait for Vercel Ready and confirm version 0.1.35. Local .env.local is ignored by Git; changed Vercel variables require a new build.
- Room protocol is now 28. Deploy this revision to both Vercel and the Render room server; no new Render configuration is needed.

## Arctic acceptance (0.1.35)

Select Arctic Expedition in solo and co-op and confirm Level 8 / 150 screws. On a real phone/tablet, check first-screw picking, side/underside fixings, camera movement, loading and physics. Exit and resume the same checkpoint. In co-op, remove and ping a screw and use Find a Match without losing the connection; check the latency indicator. A real Google-signed-in solo finish should publish to the new Arctic board. Older levels' saves and scores should remain available. The board migration is already applied; no new environment variables are needed.

## Test 1: ordinary guest

1. Open a private window without signing in. Start/resume a solo level.
2. Open Leaderboard on Home: it is readable without sign-in, with all nine levels. Inside a level, only that level’s board is available; there is no selector.
3. Finish a level. Its elapsed time should be shown above the current level’s public board, with a guest explanation and no score upload or device leaderboard.
4. Sign in afterward. That earlier guest win must not be published.
5. Refresh a playing level: it should reopen the same level and offer/resume its saved progress.

## Castle release checks (0.1.32)

1. Confirm all nine cards appear in solo and room creation, including Royal Castle Courtyard with 225 screws and its actual scene preview.
2. Select the castle on a real phone/tablet. Check loading, orbit/zoom and side/inside screw picking; measure responsiveness with the requested high-detail geometry.
3. Remove a few screws, exit Home, then resume. Check the same seed/progress, elapsed time and ability charges return. Revisit other levels after leaving the castle to look for accumulating memory or slowdowns.
4. Create a castle room and invite a friend on another device. Both must load before Start together. Check simultaneous moves, matching boxes, object release, reset and reconnect.
5. Finish a real solo castle run while signed into Google. The current-level board should show your best after upload; Home should offer all nine boards. Do not add fabricated test scores to production.
6. Optionally finish separate runs on two devices with the same account. The faster time should remain the public best regardless of upload order. Unfinished checkpoints remain device-local; avoid simultaneous same-level tabs in one browser.

## Test 2: Google and a real online result

1. Sign in with Google, save a public nickname, and leave the player card.
2. Finish any solo level while still signed in. Use an ability if you want to check the metadata.
3. The winning screen should show your time and the current level’s leaderboard. After upload your best row is highlighted. If the connection fails, the upload remains pending; retrying refreshes the board.
4. Check the embedded board or in-game Leaderboard. Confirm your nickname, time and ability counts; with an empty board you will be first. There is no level selector in-game.
5. Reload. Open the same board on another device; the public result should be there. Sign in there to see the You marker/personal placement.
6. A faster later win should improve your best. A slower win must not create a second public slot or replace the faster time.
7. Check that there is no This device tab or local-best value on level cards. Another device receives online results, but not unfinished puzzle progress.

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
| First finished time still waiting | Check connection, same Google account, nickname and Retry upload. The pending result stays bound to the account that finished. |
| No public record after a guest win | Expected: Google sign-in is required at the finish; guest times are not recorded/imported. |
| Result not in top 10 | Check Your best below the list, the selected level and current layout. |
| Same Google already belongs elsewhere | Use the existing account or a different Google identity; guests are never silently merged. |

Share the step, device/browser, visible message and app version when reporting a fault. Do not share access tokens, private keys or temporary OAuth callback URLs.

## Nickname checks

Choose an available name in My account after Google sign-in. Rename it more than once; your results must keep the same times and show the new name. A name already taken, including a different capitalization, must be refused. Renaming frees the previous name. No rename cooldown has been added.
