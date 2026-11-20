# Player accounts: setup and deployment

The player-card UI ships in **0.1.23**. Open the round person icon in the game controls (inside the hamburger menu on phones/tablets). It supports Google sign-in, a CAPTCHA-protected online guest, a public nickname, reload/session restoration and confirmed sign-out. Casual play needs no account. Email sign-in is deferred: no SMTP or email templates are required for this release. Global score submission remains closed until the trusted ranked-run service is connected.

On 2026-11-20, a read-only public settings check reported Google and anonymous sign-in enabled, local Turnstile configuration present, and the live homepage returning 200. This does not verify Google's final redirect or the Turnstile secret/domain setup. No live test users or scores were created. Follow [the live testing checklist](auth-live-testing.md) after deployment.

## 1. Set the allowed return URLs

In your `screw-it` project, open **Authentication → URL Configuration**.

1. Set **Site URL** to your live game's HTTPS origin with a trailing `/`.
2. Add that same root URL to **Redirect URLs**.
3. For local testing, also add `http://localhost:5173/` and `http://127.0.0.1:5173/` (adjust the port if your Vite server uses another port).

The app returns to the root and processes its PKCE code once. It preserves a co-op invitation in this tab when leaving for sign-in. Use exact production return URLs; broad host wildcards are unnecessary. For phone sign-in testing, use the deployed HTTPS game.

## 2. Set up Google

1. Open [Google Cloud Console](https://console.cloud.google.com/) and create/select a project for the game.
2. In **Google Auth Platform**, configure **Branding** and **Audience**. Use an External audience for friends outside your organisation. While the application is in Testing, add the Google accounts you want to test under Test users.
3. In **Data Access → Add or remove scopes**, select `openid`, `https://www.googleapis.com/auth/userinfo.email` and `https://www.googleapis.com/auth/userinfo.profile`; add `openid` manually if needed. Click Update/Save. These are the basic identity scopes described in [Supabase's Google guide](https://supabase.com/docs/guides/auth/social-sign-in/auth-google). Extra Google API permissions are unnecessary for this game.
4. In **Clients**, create an OAuth client of type **Web application**.
5. Add your game origin under **Authorised JavaScript origins**. Add local origins when testing locally, without a path.
6. Under **Authorised redirect URIs**, add this Supabase callback URL:

   ```text
   https://eviapvuviucbdgvsjcue.supabase.co/auth/v1/callback
   ```

7. Copy the Google **Client ID** and **Client secret** into Supabase's **Authentication → Sign In / Providers → Google** configuration. Enable Google and save.
8. Enable **manual identity linking** in Supabase Auth settings so a guest can attach Google while keeping its user ID.
9. Reopen the player card or choose **Refresh sign-in options**. The Google button should become available.

Google's callback is the Supabase URL above. The app's Site URL/Redirect URLs are your game URLs. They serve different parts of the redirect flow. Google's client secret stays in Supabase; it is not a Vercel variable or something to paste into chat.

## 3. Set up Turnstile and online guests

1. In [Cloudflare Dashboard](https://dash.cloudflare.com/), open **Turnstile** and add a widget for the game. A Managed widget is suitable. Follow the [Turnstile setup guide](https://developers.cloudflare.com/turnstile/get-started/).
2. Configure the allowed game hostname(s). Use separate development/test configuration as needed for localhost; do not deploy test keys as production protection.
3. Put the public **site key** in `.env.local`:

   ```dotenv
   VITE_TURNSTILE_SITE_KEY=your_public_site_key
   ```

4. Put the private **secret key** in Supabase's **Authentication → CAPTCHA protection** settings, choose Turnstile and enable protection. Supabase performs the server-side token validation; merely displaying a widget does not secure sign-up.
5. Enable anonymous sign-ins in Supabase **after CAPTCHA protection is configured**. Keep manual linking enabled for guest upgrades.
6. Restart Vite after changing `.env.local`. On Vercel, add the public site key and redeploy as described below.

The account UI loads the widget only when needed. Expired/missing verification tokens disable guest creation, and failed challenges can be retried. Google can later link a new identity to the same guest. If that identity belongs to another account already, the app keeps the guest and reports the conflict; it does not merge two accounts without verified control of both.

## 4. Email sign-in — skipped for this release

The owner chose Google-only permanent accounts. There is no email field, OTP entry, resend or email-upgrade control in the current player card. Skip SMTP, email-template edits and mail-provider setup. Google's email/profile scopes identify the Google account; they do not require the game to send mail.

The Supabase Email provider may be disabled separately in the dashboard if unused. This frontend update does not change that hosted setting. Prepared email helpers remain inactive groundwork for a future, explicitly requested feature.

## 5. Vercel environment variables — required when publishing

Your `.env.local` is ignored by Git. Pushing code does not upload these values.

In **Vercel → your game project → Settings → Environment Variables**, set:

| Variable | Value | When needed |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Your Supabase project URL | Required for accounts. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Your `sb_publishable_...` key | Required for accounts; safe in the browser. |
| `VITE_TURNSTILE_SITE_KEY` | Cloudflare's public site key | Required for the online-guest verification widget. Google sign-in does not wait for this widget. |
| `VITE_ROOM_SERVER` | Keep your existing `wss://.../rooms` endpoint | Existing co-op setting; keep it when updating deployments. |

Choose **Config** for these four public frontend variables. Choose Production and any Preview environment where you intend to test accounts, then **redeploy**. Vite includes these values at build time, so changing Vercel settings does not change an already-built deployment. Add each test domain to the providers' allowed settings as appropriate.

Do not add Google client secrets, Turnstile secrets or a Supabase secret/service-role key as `VITE_` variables. Current account UI needs no Render server secret. The future trusted ranked service will have a separate server-only configuration step.

## Verification and current limits

- Browser checks cover desktop/tablet/phones, Google-only controls even when the backend Email provider is enabled, unique names, session reload, cross-tab sign-out, CAPTCHA expiry, guest upgrades, OAuth callback cleanup, one-time code exchange and identity mismatch rejection. A guest-link return with a missing original session is refused before consuming its OAuth code.
- Real provider settings and the publishable-key connection were checked read-only. Google/Turnstile sign-in still needs live acceptance tests after deployment. SMTP is out of scope.
- Auth/Turnstile downloads are deferred; opening the home screen does not create an anonymous account or load any level scenery. A stored session or sign-in callback can initialise Auth in the background.
- Emails are private in the account card. Only the deliberately chosen nickname can appear with future verified rankings.
- Sign-out affects this device; it keeps local game saves/times. Forgetting an anonymous guest requires confirmation because an unlinked guest cannot recover its identity after sign-out.
- OAuth navigation saves current solo progress through the existing page-hide handler. After returning, solo progress can be resumed through level selection. Co-op follows the existing reconnect/seat-expiry rules.
- Auth URL credentials are cleared after processing, excluded from analytics, and suppressed in outgoing referrers. Stale email UI challenges are cleared when Auth boots; the current UI never requests a code.

Run `npm run test:ranking`, `npm run build`, `npm run lint` and `npm test` for the automated checks.
