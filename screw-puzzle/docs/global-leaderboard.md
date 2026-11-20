# Casual global leaderboard (0.1.30)

## What is implemented

The game has Online and This device tabs in the same leaderboard card. Online shows up to ten players per current level/layout, plus your own best/place even outside that list. Anyone can view it. Only solo wins finished while signed into Google can publish, and a public nickname is required. Guest history stays local; signing in afterward does not import it.

Timing starts on the first accepted screw and stops on logical victory, before the final animations finish. Menus count while the level is open. Saved/resumed runs count using accumulated play time; time away from a closed game does not. Both abilities are allowed with their usual three uses and no penalty. Entries disclose extra-box uses, Find a Match uses and whether the run was resumed. Puzzles still use fresh random colours.

Each player occupies at most one spot per board: their fastest finish. Equal integer milliseconds share competition rank (1, 1, 3). Earliest server receipt and then run UUID keep ties stable; at most ten accounts appear even at a tied boundary. Nickname changes update displayed names without changing recorded times. Cloud syncing unfinished games remains separate work.

## How the pieces fit together

1. **Stable finish identity.** Each solo attempt gets a UUID. Checkpoints preserve it; reset creates a new one. Older checkpoints remain resumable and receive an ID when restored.
2. **Capture the finish once.** SoloGame records the local clear as before and snapshots the Google account at the first winning render. A later sign-in cannot claim a guest win. Co-op and lost runs do not submit.
3. **Reliable upload.** The device outbox stores an immutable result bound to that account. It retries after connection returns, every 30 seconds, on reload/sign-in to the same account, or with Retry upload. Missing nicknames wait for a name to be saved. Another account cannot adopt queued results. Storage denial falls back to memory for that visit.
4. **Authenticated database endpoint.** Supabase validates the Google identity, current nickname, active layout, expected account, integer duration, screw count and ability limits. A transaction lock and account/run primary key make concurrent retries idempotent. Conflicting payloads cannot overwrite a completed result. A ceiling of 120 new finishes per account/hour limits spam; exact retries do not consume it.
5. **Public projection.** A read-only function returns nicknames, times, ability/resume metadata and placement. It returns no email, account UUID or run UUID. Raw history has no browser-role access. The open board refreshes periodically and after upload changes.

These are friendly casual times reported by the game client. Authentication and field validation protect ownership; they do not verify that every move/time is honest. No server replay or anti-cheat claim is made.

## Database and deployment

The migration `supabase/migrations/20261120204702_casual_leaderboard.sql` is applied to the connected screw-it Supabase project. It adds six active casual boards and private finish history. The two historical ranked migrations and their seven closed boards remain untouched.

The exposed functions are `public.submit_casual_finish(jsonb, uuid)` (authenticated only) and `public.get_casual_leaderboard(text)` (public read). They are security-invoker wrappers around narrowly granted private functions with fixed empty search paths. Do not add leaderboard_private to the exposed API schemas or grant browser roles raw table access.

No Edge Function, database password, service-role key or new Render process is needed. Keep these existing Vercel Config variables for Production and any tested Preview: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, VITE_ROOM_SERVER. Local .env.local is not uploaded by Git. Publish the frontend through the connected production branch; this release does not change room protocol 26.

Local PostgreSQL tests cover permission denial, missing names, account-switch rejection, payload validation, duplicate/conflicting retries, faster/slower finishes, shared ties, public top-ten privacy, personal placement and nickname updates. Browser fixtures cover finish capture, reconnect/name retries and guest-then-login behavior without putting invented times in the live database. See [the live checklist](auth-live-testing.md) for the real Google completion test after deploying.

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
