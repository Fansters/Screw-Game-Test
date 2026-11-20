export function accountError(error: unknown): string {
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
  if (["identity_already_exists", "email_exists", "user_already_exists", "account_exists"].includes(code)) return "That Google account already belongs to another player. Choose a different Google account, or sign out of this guest to use your existing player. Your guest profile has not been merged or removed.";
  if (["access_denied", "user_cancelled"].includes(code)) return "Google sign-in was cancelled. Your current account is unchanged. You can try again or keep playing.";
  if (["otp_expired", "otp_disabled"].includes(code)) return "That code is invalid or has expired. Check it, or request a new email.";
  if (["over_email_send_rate_limit", "over_request_rate_limit"].includes(code)) return "A little too quick! Please wait a minute before trying again.";
  if (["captcha_failed", "captcha_required"].includes(code)) return "Verification didn’t complete. Please try it again.";
  if (code === "email_address_not_authorized") return "Email sign-in is not available for this address yet. You can keep playing without an account.";
  if (code === "23505") return "That player name is taken. Try another!";
  if (code === "identity_changed") return "The guest link couldn’t be confirmed. No results were moved to another account.";
  if (error instanceof TypeError) return "Couldn’t reach your account. Check your connection and try again.";
  return "That didn’t work this time. Please try again, or keep playing.";
}

export function accountReturnError(href: string) {
  const url = new URL(href), hash = new URLSearchParams(url.hash.slice(1));
  // Interpret codes only, never echo untrusted provider descriptions into the UI.
  return { code: url.searchParams.get("error_code") ?? hash.get("error_code") ?? url.searchParams.get("error") ?? hash.get("error") ?? "" };
}
