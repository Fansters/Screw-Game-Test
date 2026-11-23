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
6. Optionally finish separate runs on two devices with the same account. The faster time should remain the public best regardless of upload order. Unfinished checkpoints are now cloud-only: opening the same world on a second device hands its active writer over (see the 0.1.41 checks below).

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

## Player card and difficulty tabs — 0.1.38

1. Open Login without signing in: ordinary local play still works. Click outside the player card to dismiss it, or use its visible X.
2. Sign in with your real Google account. Open My account: check the member-since month and the compact profile banner. Choose Customize your card, pick an animal, edit your available nickname, and optionally select your country. Save.
3. Reopen the card on this device and another device signed into the same account. The saved nickname, avatar and country should match. Unfinished puzzle progress now follows the Google account (see the 0.1.41 checks below).
4. Open Leaderboard. Your existing result should display the chosen avatar/country. Choose Not shared and save: the country should disappear from public results after refresh. Your result/time must remain unchanged.
5. On desktop/phone, check the X and backdrop dismissal. Clicking/dragging inside the card must keep it open. Keyboard Escape and tab focus should still work.
6. Open level select: Medium is selected and has all nine worlds. Easy/Hard show distinct gentle colour themes and no playable cards. Return to Medium, swipe horizontally and play normally.
7. In co-op, check the RTT badge inside the bottom navbar, beside the ping action. A disconnected partner must still pause the room rather than end it. A true dead end with four waiting screws, no safe move and no usable extra box ends both clients only after loose objects clear. Reset starts a fresh playable round.

The automated account UI checks use an intercepted Google session and fake browser-only rows, never invented live records. Local PostgreSQL tests cover profile ownership and public projection; a live read confirms the applied migration. Real OAuth and physical-device interaction remain the owner's live checks after deploying the matching frontend/room server (protocol 31). No new environment variables.

## Difficulty and Find a Match — 0.1.39

- Default Medium has six cards numbered 1–6. Easy has Arctic Expedition numbered 1; Hard has Lakeside Camp numbered 1 and Egyptian Oasis numbered 2. Check horizontal navigation and selecting these worlds in both solo and co-op. HUD numbers include their difficulty. Existing progress and leaderboard entries remain attached to the same named worlds.
- Use Find a Match: it starts a 1:00 countdown. Collect the highlighted screw; the button stays unavailable until the countdown ends. After one minute it can be used again, including a fourth/fifth use. Failed searches start no cooldown. Extra-box lifelines still have three charges.
- Save/refresh during the wait. The remaining cooldown must persist; leaving the game does not restart the minute. Reset starts a fresh level with Find ready. An active uncollected hint remains active after cooldown, as before.
- In co-op, guests cannot activate Find; both see the same cooldown. Refresh/rejoin or leave so leadership passes to the partner: the deadline must stay the same. At 60 seconds the current leader can activate it again.
- Finish a Google-signed-in run with more than three hints: its time should publish normally and show the full hint count. This can be done with separate real runs; never insert fake records into the live database for testing.

## Local view and picker polish — 0.1.40

- In solo or co-op, zoom toward an edge and orbit to a different side. Click Reset camera to the left of the abilities: it should smoothly restore the original zoomed-out overview. Drag/zoom during the flight should interrupt it. Your partner's camera, inventory, elapsed time and hint cooldown must not change.
- Each world's floating 3D title is its full name. The homepage still says Screw it!. Check long names on a phone; the navbar should show only Level N with Easy/Medium/Hard below.
- Switch difficulty tabs quickly: the coloured selected tab responds immediately and only the final requested group should appear after the gentle fade. Outgoing cards cannot be played during their fade. Close the picker during a transition and reopen it; no delayed switch should leak into the new picker.
- Keyboard arrows and horizontal phone swipes still select cards. With reduced motion enabled, camera resets and difficulty switches complete without their animated delay.

This release is frontend-only: protocol remains 32, with no new environment variables or database changes.

## Account progress and team rounds — 0.1.41

The Supabase migrations are already applied. Publish the same source revision to Vercel and Render: protocol 33 must match. No new environment variables; retain VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY and VITE_ROOM_SERVER. Never add a service-role key to the frontend. These live checks use your real accounts; automated session fixtures do not replace a real Google OAuth test.

1. **Guest play:** open a private window, choose a level and accept Play without saving. Remove screws, refresh or leave and re-enter: it starts fresh and prompts sign-in. No device puzzle-progress or completion-history keys should be created. Old device puzzles are retired, not imported.
2. **Cloud resume:** sign into Google, choose a level, remove several screws and wait for Cloud saved. Exit to Home/Select Level or refresh the level URL, then resume: seed/colours, removed parts, timer, lifelines and hint cooldown should match. Sign into the same account on another physical device; its card should offer Resume puzzle. Time while the level was closed is excluded.
3. **Same-level handoff:** keep device A open and resume that same world on device B. B gets the cloud checkpoint. Within the next save/periodic check (normally five seconds), A shows Playing on another device and stops collecting. It must not overwrite B. Different worlds have independent checkpoints.
4. **Connection loss:** disconnect during a save. Collection pauses with retry controls; the timer continues while the level is open. Reconnect without refreshing: the latest in-memory move should save, and play resumes. If you leave/refresh before confirmation, only the last cloud checkpoint is guaranteed. There is no persistent offline queue for puzzles.
5. **Reset/finish/account boundary:** reset replaces the account checkpoint with a fresh puzzle. Finish clears the active checkpoint and records its completion badge; the casual global leaderboard still publishes Google-at-finish solo runs only. The finish actions are Restart, Select Level and Home. Sign out: the account puzzle closes; it must not become guest progress or another account’s checkpoint. Co-op completion must not erase an unfinished solo puzzle of the same world.
6. **Player labels/settings:** check both owned matching boxes show the correct name/avatar; a lifeline box remains Shared. Guests can choose a room-only name/avatar without signing up. Settings sliders update UI size, rotation and zoom live and survive reload on that device. Check narrow-phone fitting at 85% and 115%, plus tablet touch rotation and independent partner cameras. Restore view defaults resets all three sliders.
7. **Shared results/next round:** finish or lose a co-op round. Check team time and both contributions. Let the guest suggest a world; only the leader can confirm. One ready player must not start the round. Disconnect/reconnect one ready seat: it must ready again. Both ready starts the chosen world in the same room/invite, waiting for both scene loads; stats reset and player labels remain. A departed contributor remains visible on that round’s results; the remaining player can continue as leader.

Focused automated coverage checks cloud RLS/Google guards, stale-write fencing, retry/coalescing, completion/reset races, restored puzzles, co-op proposals/stats/transport and responsive UI/camera controls. Production build, lint and unchanged level geometry audits are intentionally skipped.
