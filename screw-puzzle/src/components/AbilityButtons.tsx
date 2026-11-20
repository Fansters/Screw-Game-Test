import type { AbilityState } from "../game/abilities";
import type { ReactNode } from "react";

export default function AbilityButtons({ abilities, enabled, onFind, message }: {
  abilities: AbilityState; enabled: boolean; onFind: () => void; message?: string;
}) {
  const button = (name: string, count: number, active: boolean, onClick: () => void, icon: ReactNode) =>
    <button className="ability-button icon-button" disabled={!enabled || count === 0 || active} onClick={onClick}
      aria-label={`${name}, ${count} remaining${active ? ", active" : ""}`} title={`${name}${active ? " · active" : ""}`} aria-pressed={active}>
      <svg viewBox="0 0 32 32" aria-hidden="true">{icon}</svg><span>{count}</span>
    </button>;
  return <>
    {button("Find a match", abilities.finds, Boolean(abilities.hint), onFind, <><circle cx="14" cy="14" r="8" /><path d="m20 20 8 8M14 9v10M9 14h10" /></>)}
    {message && <span className="ability-message" role="status">{message}</span>}
  </>;
}
