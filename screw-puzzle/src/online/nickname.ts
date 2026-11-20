export function normalizeNickname(value: string): string {
  const nickname = value.normalize("NFKC").trim().replace(/ +/g, " ");
  if (!/^[A-Za-z0-9][A-Za-z0-9 _-]{2,19}$/.test(nickname)) {
    throw new Error("Choose 3–20 letters A–Z, numbers, spaces, underscores or hyphens. Start with a letter or number.");
  }
  return nickname;
}
