# Casual global leaderboard (0.1.35)

## What is implemented

The game has one online-only leaderboard. Home offers all nine level boards; in-level menus show only that level. Solo victory embeds the current board directly, highlights your best result and retains your just-finished time above it. A slower attempt never appears to replace an earlier best. The completed gameplay HUD hides on the solo win screen so abilities/counters cannot cover replay controls; the corner game menu remains available. The card moves to your row once if needed, respects reduced motion and leaves later manual scrolling alone. Personal placement remains visible below the public top ten when necessary, including tied ranks at the ten-account cutoff. Anyone can view boards. Only solo wins finished while signed into Google can publish, and a public nickname is required. Guest finishes do not create persistent time records; later sign-in does not import past results. Puzzle progress and completion badges now belong to the Google account in the cloud. Guests keep neither after the visit. The account-bound pending score-upload queue remains separate.

Timing starts on the first accepted screw and stops on logical victory, before the final animations finish. Menus count while the level is open. Saved/resumed runs count using accumulated play time; time away from a closed game does not. Both abilities are allowed with their usual three uses and no penalty. Entries disclose extra-box uses, Find a Match uses and whether the run was resumed. Puzzles still use fresh random colours.

Each player occupies at most one spot per board: their fastest finish. Equal integer milliseconds share competition rank (1, 1, 3). Earliest server receipt and then run UUID keep ties stable; at most ten accounts appear even at a tied boundary. Nickname changes update displayed names without changing recorded times. Cloud syncing unfinished games remains separate work.

## How the pieces fit together

1. **Stable finish identity.** Each solo attempt gets a UUID. Checkpoints preserve it; reset creates a new one. Older checkpoints remain resumable and receive an ID when restored.
2. **Capture the finish once.** SoloGame records a completion badge (not a device time) and snapshots the Google account at the first winning render. A later sign-in cannot claim a guest win. Co-op and lost runs do not submit.
3. **Reliable upload.** The device outbox stores an immutable result bound to that account. It retries after connection returns, every 30 seconds, on reload/sign-in to the same account, or with Retry upload. Missing nicknames wait for a name to be saved. Another account cannot adopt queued results. Storage denial falls back to memory for that visit.
4. **Authenticated database endpoint.** Supabase validates the Google identity, current nickname, active layout, expected account, integer duration, screw count and ability limits. A transaction lock and account/run primary key make concurrent retries idempotent. Conflicting payloads cannot overwrite a completed result. A ceiling of 120 new finishes per account/hour limits spam; exact retries do not consume it.
5. **Public projection.** A read-only function returns nicknames, times, ability/resume metadata and placement. It returns no email, account UUID or run UUID. Raw history has no browser-role access. The open board refreshes periodically and after upload/name/connection changes. Background refresh preserves the visible table; account/level changes discard stale views and cancel outdated requests.

These are friendly casual times reported by the game client. Authentication and field validation protect ownership; they do not verify that every move/time is honest. No server replay or anti-cheat claim is made.

## Database and deployment

The migration `supabase/migrations/20261120204702_casual_leaderboard.sql` is applied to the connected screw-it Supabase project. It adds six active casual boards and private finish history. Release 0.1.32 adds the seventh board, `castle:layout-1:casual-1`, with 225 screws through the applied additive migration `20261120235418_add_castle_casual_board.sql`. The two historical ranked migrations and their seven closed boards remain untouched. Never reuse the retired Moonbase identity for the castle.

Release 0.1.35 adds the eighth board, `arctic:layout-1:casual-1`, with exactly 150 screws through applied migration `20261121235223_add_arctic_casual_board.sql`. Catalog metadata now allows whole-triple budgets between 140 and 240; the authenticated submission function still requires the selected board's exact screw count. Existing records, permissions and account ownership checks are unchanged. Moving a level within the campaign list keeps the same board and player records because IDs are independent of displayed level numbers.

The exposed functions are `public.submit_casual_finish(jsonb, uuid)` (authenticated only) and `public.get_casual_leaderboard(text)` (public read). They are security-invoker wrappers around narrowly granted private functions with fixed empty search paths. Do not add leaderboard_private to the exposed API schemas or grant browser roles raw table access.

No Edge Function, database password, service-role key or new Render process is needed. Keep these existing Vercel Config variables for Production and any tested Preview: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, VITE_ROOM_SERVER. Local .env.local is not uploaded by Git. Publish the frontend through the connected production branch; deploy matching frontend and Render room-server revisions with protocol 28. No new environment variables are needed.

Local PostgreSQL tests cover permission denial, missing names, account-switch rejection, payload validation, duplicate/conflicting retries, faster/slower finishes, shared ties, public top-ten privacy, personal placement and nickname updates. Browser fixtures cover finish capture, reconnect/name retries, guest-then-login behavior, current-level scoping and responsive win boards without putting invented times in the live database. See [the live checklist](auth-live-testing.md) for the real Google completion test after deploying.

## Co-op box ownership: future work

This release keeps shared boxes. The approved future rules are:

1. P1 owns the left standard box; P2 owns the right. Use stable seats, independent of leader status, with Your box/P1/P2 badges.
2. A partner's active colour is reserved: tapping it gives feedback and leaves the screw in place. Other colours may enter the shared five slots.
3. Waiting screws can fill either box when that colour becomes active. Those screws were unassigned when collected.
4. The leader activates the shared third box, which either player may fill. Keep three lifelines, one bonus box at a time.
5. Find a Match can help either owner and should identify who collects its hint.
6. Reconnection preserves seats. After departure/expiry, the remaining player controls both boxes.
7. Enforce this on the room server, test replacement/transfer/reconnect races, then bump the room protocol and deploy both services together.

Later achievements could recognize no-ability clears, personal improvements, finishing every world and cooperative teamwork. Keep these separate from the current timing rules.

## One Google account on two devices

Multiple sessions are permitted. Each device has an independent puzzle seed, run UUID, timer, camera and local checkpoint. Both solo finishes can upload to the same account; only the fastest appears on that level/layout's public board. A slower finish uploaded later cannot replace the best. The database serializes submissions for each account and deduplicates immutable account/run IDs; local database regression tests cover concurrent-device-style distinct finishes and conflicting retries.

Unfinished solo progress is cloud-only for Google accounts: one checkpoint for each stable level/layout, restored with the same seed, ordered moves, elapsed time, ability state and run ID. Opening the same level on another device claims its writer; the older device pauses after detecting takeover. Revision checks and serialized writes reject stale overwrites. Different levels can be played independently. Offline moves wait only in memory while collection is paused; leaving/reloading can lose anything not confirmed by Cloud saved. Time between closing and resuming is excluded; open-level menus and thinking continue counting. Guests have no persistent puzzle progress or clear badges and are prompted to sign in. Old local checkpoints are retired without importing them. Auth sessions, device settings and immutable pending result uploads still use browser storage. Published records remain online. Signing out on one device does not sign out another physical device.

## Stronger verification: a future option

The current casual board accepts client-reported time after identity and payload validation. It does not prove the player made every move honestly. Stronger verification would give the backend control of run IDs, puzzle seeds/layout versions and the first accepted move's start timestamp; validate ordered screw/ability actions against authoritative inventory and physical-access rules; and derive the finishing time from the server clock after a valid win. Durable events/checkpoints and idempotent reconnection would survive network and server restarts.

A replay can prove that a move sequence is legal, but cannot independently prove an uploaded duration. Bots can still perform legal moves, so rate limits, anomaly review and moderation complement verification; no browser game is completely cheat-proof. Strong verification adds network dependence and backend work. Decide explicitly how offline play, accumulated resume time and untimed planning before the first screw should work before changing the present friendly casual rules. No verification service or anti-cheat restriction was added in 0.1.32.

## Public nicknames

Google identifies the account, not its public nickname. Players choose a unique 3–20 character name using letters A–Z, numbers, spaces, underscores or hyphens; it must start with a letter or number. Names are trimmed/normalized, and uniqueness is case-insensitive. There is no application rename limit or cooldown. Updating the name keeps the same account/results and changes its display on existing boards; the old name becomes available again. The database unique index settles simultaneous claims, and owner-only policies prevent changing someone else’s name. No live account/profile data was changed for this UI release.

Release 0.1.37 adds the ninth board, `oasis:layout-1:casual-1`, for exactly 198 screws. Migration `20261122195849_add_oasis_casual_board.sql` is applied. This is a catalog addition with no permission, account or historical-score changes.

## Player pass (0.1.38)

Profiles now store an allowlisted avatar ID and an optional ISO country code. Country starts as null; players explicitly choose whether to publish it, and can remove it with Not shared. No IP/location inference or uploaded avatar URLs are used. Membership date comes from Auth's server-created account timestamp; it is not editable. Nickname/avatar/country save together after verifying the current account, and existing owner-only RLS still applies. The public leaderboard projection includes only the selected avatar/country plus its existing safe result fields. Email and account/run IDs remain private.

The applied migration is 20261122214726_player_card_identity.sql. Existing records default to fox and no country, with no score changes. Database permission tests verify invalid avatars/countries, other-player edits and timestamp edits are rejected, and clearing country removes it from public results.

Frontend version 0.1.38 uses room protocol 31. Deploy matching Vercel and Render revisions. No new environment variables: retain VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY and VITE_ROOM_SERVER.

## Difficulty groups and cooldown hints (0.1.39)

All current boards and stable world IDs are retained. Visible level numbers now start at 1 inside Easy (Arctic), Medium (Cottage, Route 66, Construction, Carnival, Zoo, Castle) and Hard (Lakeside Camp, Egyptian Oasis). This is presentation metadata: results and checkpoint keys do not move or reset.

Find a Match now has unlimited uses, with one minute between successful hints. Its actual use count is still shown on results. Menus, refresh and time outside a solo level do not restart the cooldown; the absolute deadline is stored with the checkpoint. Old checkpoints without that field still resume. Co-op shares a server-enforced cooldown, retained on reconnect and leader handoff. The existing three extra boxes are unchanged.

Applied migration: 20261123121715_unlimited_match_hints.sql. It widens casual find_match_uses to integer and removes the former three-hint submission limit, preserving ownership checks, immutable retries, raw-score privacy and the three-extra-box constraint. Closed historical ranked rules and prior scores are unchanged. Frontend/Render protocol is now 32; publish matching revisions. No new environment variables.

## Cloud progress and team rounds (0.1.41)

The additive account-cloud migrations are applied: 20261123153418_account_cloud_progress.sql and 20261123153807_cloud_progress_member_read.sql. Each row has a writer token and monotonic revision; table reads require ownership and a non-anonymous session. The guarded RPC verifies a real Google identity and an active layout. Browser raw writes and anonymous reads/RPC calls are denied. No passwords or service-role keys are shipped to the browser. This is checkpoint storage, not anti-cheat proof. Existing casual score rules stay unchanged.

Co-op clears update the account badge without touching its solo checkpoint. Live co-op progress, cosmetic identities and per-round contributions remain in the existing room server, with its 30-second reconnect window; they are not durable cloud room saves. Finished teams stay in the same room, choose a proposed world, get leader approval and both ready before the next scene starts. Google names/avatars identify box owners visually; temporary guest room labels confer no account or public-score rights.

Deploy matching Vercel and Render source revisions (room protocol 33). No new environment variables: retain VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY and VITE_ROOM_SERVER. UI/camera preferences remain device-local on purpose.
