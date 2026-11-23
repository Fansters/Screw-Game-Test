import type { AbilityState } from "../game/abilities";
import { useEffect, useState } from "react";

export default function AbilityButtons({ abilities, enabled, onFind, message, clockOffset = 0 }: {
  abilities: AbilityState; enabled: boolean; onFind: () => void; message?: string; clockOffset?: number;
}) {
  const [, tick] = useState(0);
  const { findReadyAt, hint } = abilities;
  useEffect(() => {
    if (findReadyAt <= Date.now() + clockOffset) return;
    const timer = window.setInterval(() => {
      const now = Date.now(); tick(now);
      if (now + clockOffset >= findReadyAt) window.clearInterval(timer);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [findReadyAt, clockOffset]);
  const remaining = Math.max(0, Math.ceil((findReadyAt - Date.now() - clockOffset) / 1000));
  const cooling = remaining > 0, active = Boolean(hint);
  const countdown = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`;
  const label = `Find a match${active ? ", active" : ""}${cooling ? `, ready in ${countdown}` : active ? "" : ", ready"}`;
  return <>
    <button className={`ability-button icon-button${cooling ? " ability-cooling" : ""}`} disabled={!enabled || cooling || active} onClick={onFind}
      aria-label={label} title={label} aria-pressed={active}>
      <svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="14" cy="14" r="8" /><path d="m20 20 8 8M14 9v10M9 14h10" /></svg>
      <span className={cooling ? "ability-cooldown" : ""} aria-hidden="true">{cooling ? countdown : "∞"}</span>
    </button>
    {message && <span className="ability-message" role="status">{message}</span>}
  </>;
}
