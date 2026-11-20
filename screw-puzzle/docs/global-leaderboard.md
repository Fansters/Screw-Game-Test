# Global leaderboard: agreed rules and implementation stages

## Status of this update (0.1.28)

The player card offers Google sign-in and a public nickname. Ordinary visitors play locally without creating an online identity. New online-guest creation is retired; old guest sessions can still link Google without deletion or merging. No new database migration or hosted Auth configuration change was required. Cloud saves, global top-ten display and trusted ranked gameplay are still pending; all boards remain closed. Logging in currently restores the account/nickname, not game saves or local times.

The owner’s current direction is logged-in social accounts for future cloud saves, friends and public scores. Start future ranked attempts only after Google sign-in and nickname completion; local guests keep local-only results. Do not import browser-local times into verified public records. Additional social providers need explicit account-linking flows, not a separate profile per provider.

The runtime rules manifest is now revision 2 because the ability set changed. Historical closed rules-1 board records and their migrations remain intact; provision rules-2 boards only with the trusted ranked rollout.

## Step 1: ranked contract

| Decision | Rule |
| --- | --- |
| Public boards | Solo only initially; a separate top 10 for each supported level/version. |
| Player limit | One best result per Supabase account per board. This identifies accounts, not unique humans. |
| Puzzles | A fresh random seed and box order for each attempt, assigned by the server. Different attempts can differ in difficulty; identical daily challenges are not part of this mode. |
| Clock starts | On the first **accepted** screw removal. Loading, shader compilation and camera arrival happen before gameplay. Thinking, orbiting and permitted previews before the first removal are untimed. |
| Clock stops | When an accepted move makes the logical game won, before its cosmetic animations finish. |
| Pausing | None after the clock starts. Menus, background tabs, thinking and network interruptions count. Use monotonic server time; never a browser-supplied duration. |
| Abilities | Three extra-box uses and three Find a Match uses; no time penalties or separate assisted board. Pre-clock ability uses still consume their normal charges. |
| Free assistance | High-contrast outlines, colour labels, part preview, translucency, camera tools and manual loose-object dismissal remain available. |
| Disconnect | Up to 30 seconds for automatic reconnection to the same in-memory attempt, with the clock continuing. No offline moves. Repeated disconnect notices do not extend the original deadline. Reconnection at exactly 30 seconds is allowed; later is ineligible. |
| Refresh/exit/reset | End the unfinished attempt's ranked eligibility. A reset creates a new attempt/seed. No ranked save/resume, including cross-device resume. Casual saving remains separate. |
| Failure/restart | A lost game cannot submit. A server restart ends unfinished ranked attempts; already verified database records survive. |
| Publication | Ordinary visitors play locally. Future ranked attempts and public records require a signed-in social account (Google currently) and a chosen nickname. Existing guest-to-Google linking preserves the old account ID, but local times are never treated as verified records. |
| Precision and ties | Store integer milliseconds, flooring the nonnegative server duration. Equal milliseconds share competition rank, e.g. 1, 1, 3. Sort equal times by earliest verification and then run UUID for stable display. Show at most ten accounts, including at a tied boundary. |

The first-screw start intentionally allows untimed planning before the first move. Fresh random puzzles intentionally permit easier/harder attempts. These are selected gameplay rules, not assumptions to change silently later.

### Versions

`src/game/layoutVersions.ts` is the single source of current layout revisions. The existing local storage key strings are preserved exactly, including archived ship saves. Geometry, fixing ownership/IDs/positions and reveal changes require a layout increment. Seed-generation changes require a generator increment; timer/ability/eligibility changes require a ranked-rules increment.

An example board ID is `space:layout-3:generator-1:rules-1:solo`. The random seed belongs to each run, not to its board ID. Cosmetic app versions and room protocol versions are independent. Older public boards can remain archived; never mix their times into a new version.

### Implementation files

- `src/ranking/rules.ts`: the approved policy and supported board IDs.
- `src/ranking/clock.ts`: waiting/running/won/lost/ineligible lifecycle, continuous timing and reconnect eligibility. A future server must call it only after validating real game events.
- `src/ranking/results.ts`: one best result per account, stable millisecond ties and top-ten selection. Sorting a record does not verify it.

## Step 2: create and connect Supabase

### A. Create a separate project

1. Sign in at [Supabase Dashboard](https://supabase.com/dashboard) and create a new project, for example `screw-it`.
2. Use your organisation/personal workspace and the Free plan if available and appropriate. Choose a European region near the Render room server. Keep the generated database password in your password manager.
3. Wait for provisioning. Find the project URL and **publishable** API key in the project's Connect/API settings.
4. Copy `.env.example` to `.env.local` beside `package.json`, and replace only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. If `.env.local` already exists, add these two settings without replacing its existing values. `.env.local` is ignored by Git. Never put a secret/service-role key in a `VITE_` variable, source file or chat.
5. Tell the developer the project is ready. The project URL is safe to identify; no database password or private key is needed in chat.

This project-creation/configuration step is complete for the current workspace. `.env.local` is the exact filename, including its leading dot and the ending `local`, not `locale`. The placeholder `.env.example` has been restored. Restart Vite after changing local environment settings. Use the [Vercel variable checklist](auth-setup.md#5-vercel-environment-variables--required-when-publishing) when deploying; Git-ignored local files are not uploaded by a Git push.

### B. Applied database migrations

The connected Supabase plugin applied both migrations, and the local filenames match cloud migration history:

- `supabase/migrations/20261119213725_ranked_foundation.sql`
- `supabase/migrations/20261119214116_harden_ranked_reader.sql`

Do not run these manually again. The hardening migration was created with Supabase CLI 3.2.0 and then applied through the connected plugin. For later CLI work, inspect that pinned CLI's `--help`: CLI v3 distinguishes local and hosted targets, so older deployment commands should not be reused by assumption. Do not add `ranking_private` to the exposed Data API schemas.

Live checks confirmed seven closed boards, RLS on all three tables, denied browser profile/raw-score access, denied privileged-reader execution for browser roles, and successful server-role reader execution. No users or fake scores were created for these checks. The latest public settings check on 2026-11-20 reported Google and anonymous enabled. Email remains enabled in Supabase's settings but is not offered by the game; the owner can disable that provider separately if unused.

### C. Configure authentication providers

1. Configure the production Site URL and exact development/production redirect destinations. Do not use unrestricted production redirect wildcards. The future OAuth callback handler must exchange its PKCE code before cleaning URL parameters.
2. Keep manual identity linking for existing guest upgrades. New anonymous creation is no longer offered; never create users automatically for site visitors.
3. Google-only player UI needs no Turnstile widget. Leave existing hosted settings/accounts intact; provider removal or guest cleanup is a separate decision. Follow [the setup steps](auth-setup.md).
4. Enable Google using a Google Cloud OAuth web client. Configure Google's authorised Supabase callback and the allowed application origins using Supabase's provider instructions. Keep Google's client secret in Supabase's provider configuration, never Vercel browser variables or Git.
5. Email sign-in is deferred by the owner. Do not require email delivery, SMTP or email-template setup for the Google-only release. Existing email helpers/tests are groundwork only, with no UI actions calling them.

An identity already attached to another account is a separate merge case. Do not sign a guest out automatically or transfer records based on an email supplied by the browser. Keep the guest identity/results until a later server flow verifies control of both accounts. `accounts.ts` propagates the linking error without replacing that identity; it does not implement cross-account merging.

### Data and access

Times, profiles and rules are structured **Postgres database** records. No Supabase file Storage bucket is needed for this leaderboard.

| Object | Access |
| --- | --- |
| `player_profiles` | An authenticated user, including an online guest, reads/creates/updates only their own nickname. No email or OAuth profile names are copied here. Nicknames are case-insensitively unique, 3–20 ASCII letters/numbers/spaces/underscores/hyphens, starting with a letter/number. |
| `ranking_boards` | Public read-only version catalogue. All initial boards are closed. Only an explicit administrator rollout should open them after trusted scoring is deployed. |
| `ranking_private.verified_runs` | Private, append-only server-verified finishes. No browser reads, inserts, updates or deletes. A run UUID cannot be overwritten. The trusted service gets SELECT/INSERT only. |
| `get_ranked_leaderboard(board_id)` | Server-only read RPC. Its public-schema wrapper uses SECURITY INVOKER and grants execution only to `service_role`. It calls a restricted private helper that returns only board status, ranks, nicknames, milliseconds and verification times. The helper filters to permanent accounts with verified email, selects each account's best run and returns at most ten entries. A future public HTTP endpoint will serve this filtered output; browsers must not call the privileged database reader directly. |

Row-level security and explicit grants are tested under actual PostgreSQL using PGlite, including permissive default grants and a server role without direct Auth-table access. Live HTTP and database-role checks also verified the hosted permissions. Google/Turnstile flows have not completed live owner acceptance yet; mocked browser checks cover the integration. The private read helper uses a fixed empty search path and schema-qualified references; only the trusted service can execute it, and browser roles cannot access its schema.

Security advisors report no warnings/errors after hardening. Two informational categories are expected at this stage: [RLS with no policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) on `ranking_private.verified_runs` intentionally denies all ordinary roles, while the privileged server uses its narrowly granted access; [unused indexes](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index) are new score indexes with no real scores yet. Keep these indexes for board-best and player foreign-key lookups.

The future ranked service's `SUPABASE_SECRET_KEY` belongs only in Render's secret environment. It must verify caller JWTs and game state before recording a result. RLS cannot protect against misuse of a privileged secret by an incorrectly implemented backend.

## Step 3: trusted ranked sessions (next, before opening public boards)

1. Add an explicit Ranked versus Casual choice. Reuse the existing level loading, game rules and server physics; keep casual saves and existing room pause behavior independent.
2. The server creates an attempt ID, fresh seed, current board version and cryptographically random continuation secret after authenticating a signed-in, non-anonymous social account with a nickname. It must choose a current board from its own manifest, not accept an arbitrary client-supplied board/version. An older board may remain readable for history without accepting new attempts. Keep the continuation secret in tab memory only: persisting it in local/session storage would accidentally permit ranked refresh/resume.
3. Start the clock on the first legal accepted removal. Validate all moves, charges, layers, loose covers and terminal state on the server. Do not accept a claimed client `won`, elapsed time, seed or arbitrary replay as a public result.
4. Allow same-page reconnection for the approved grace while time continues. Refresh cannot recover the in-memory continuation secret. Account sign-in after an already saved win can still publish the same identity's verified result; that is claiming a finish, not resuming play.
5. Persist a validated finish once with its attempt UUID. Retry storage safely after transient failures without overwriting the result or creating duplicates. Do not show a public-success message until persistence is confirmed.
6. Connect the global leaderboard tab to a public server endpoint. The account dialog, CAPTCHA, callback and nickname form are implemented. Their mocked-service browser tests pass; perform real provider/SMTP acceptance checks once the owner finishes setup, alongside the future ranked-run integration.
7. Open the boards deliberately only after these checks. Keep basic abuse limits and anomaly review. Server-authoritative results prevent fabricated times/state but do not prove human play or eliminate automation.

## Validation

```sh
npm run test:ranking
npm run build
npm run lint
npm test
```

PGlite is a development-only PostgreSQL test dependency. It is not bundled into the browser or deployed room server. The Supabase browser client loads on account interaction, a stored session or an auth return; it is not part of the ordinary first-visit title or level downloads.

## Primary documentation

- [Anonymous sign-ins and guest conversion](https://supabase.com/docs/guides/auth/auth-anonymous)
- [Identity linking](https://supabase.com/docs/guides/auth/auth-identity-linking)
- [Passwordless email](https://supabase.com/docs/guides/auth/auth-email-passwordless)
- [Google sign-in](https://supabase.com/docs/guides/auth/social-sign-in/auth-google)
- [CAPTCHA](https://supabase.com/docs/guides/auth/auth-captcha)
- [SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
- [API keys](https://supabase.com/docs/guides/getting-started/api-keys)
- [Row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security)
