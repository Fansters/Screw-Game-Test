import type { AbilityState } from "../game/abilities";
import type { ReactNode } from "react";

export default function AbilityButtons({ abilities, enabled, onFind, onPeek, message, canPeek = true }: {
  abilities: AbilityState; enabled: boolean; onFind: () => void; onPeek: () => void; message?: string;
  canPeek?: boolean;
}) {
  const button = (name: string, count: number, active: boolean, onClick: () => void, icon: ReactNode, available = true) =>
    <button className="ability-button icon-button" disabled={!enabled || count === 0 || active || !available} onClick={onClick}
      aria-label={`${name}, ${count} remaining${active ? ", active" : ""}`} title={`${name}${active ? " · active" : ""}`} aria-pressed={active}>
      <svg viewBox="0 0 32 32" aria-hidden="true">{icon}</svg><span>{count}</span>
    </button>;
  return <>
    {button("Find a match", abilities.finds, Boolean(abilities.hint), onFind, <><circle cx="14" cy="14" r="8" /><path d="m20 20 8 8M14 9v10M9 14h10" /></>)}
    {button("Queue Peek", abilities.peeks, abilities.peekAt !== null, onPeek, <><path d="M3 16s4-7 13-7 13 7 13 7-4 7-13 7S3 16 3 16Z" /><path d="m12 12 4 4-4 4m7-8 4 4-4 4" /></>, canPeek)}
    {message && <span className="ability-message" role="status">{message}</span>}
  </>;
}
