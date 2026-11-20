import type { ReactNode, RefObject } from "react";
import { LIFELINE_COUNT } from "../animation/run";
import { MATCH_SIZE, TRAY_CAPACITY } from "../game/rules";

import { GAME_VERSION } from "../game/version";

const icons = {
  match: <><path d="M10 4Q12 1 14 4l8 15q1 3-2 3H4q-3 0-2-3Z" /><path d="M12 8h.01M8 15h.01M16 15h.01" strokeWidth="3.5" /></>,
  lifeline: <path d="m13 3-8 11h6l-1 7 9-11h-6l1-7Z" fill="currentColor" strokeWidth="1" />,
  peek: <><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.5" /></>,
};
type HelpIconName = keyof typeof icons;

function HelpIcon({ name }: { name: HelpIconName }) {
  return <span className={`help-icon help-icon-${name}`} aria-hidden="true">
    <svg viewBox="0 0 24 24">{icons[name]}</svg>
  </span>;
}

function HelpTip({ icon, title, children }: { icon: HelpIconName; title: string; children: ReactNode }) {
  return <section className="help-tip">
    <HelpIcon name={icon} />
    <div>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  </section>;
}

export default function HelpDialog({ dialogRef }: { dialogRef: RefObject<HTMLDialogElement | null> }) {
  return <dialog ref={dialogRef} id="game-help" className="help-dialog" aria-labelledby="help-title">
    <header className="help-header">
      <h2 id="help-title">How to play</h2>
      <form method="dialog">
        <button className="icon-button" type="submit" aria-label="Close help" autoFocus>
          <svg viewBox="0 0 32 32" aria-hidden="true"><path d="m9 9 14 14M23 9 9 23" /></svg>
        </button>
      </form>
    </header>
    <div className="help-content">
      <div className="help-tips">
        <HelpTip icon="match" title="Match and clear">
          Match {MATCH_SIZE} of a color and clear every screw to win. If all {TRAY_CAPACITY} waiting slots stay full, the round ends.
        </HelpTip>
        <HelpTip icon="lifeline" title="Call in a lifeline">
          Tap lightning to open an extra box until it fills. You have {LIFELINE_COUNT} lifelines per round.
        </HelpTip>
        <HelpTip icon="peek" title="Peek behind a part">
          Tap a part to see through it, then tap again to restore it. Covered screws still need a clear path.
        </HelpTip>
        <HelpTip icon="match" title="Find a match · 3 uses">
          The magnifier points to a reachable match. “Show me” moves your camera; you do the unscrewing! In co-op, the leader uses abilities.
        </HelpTip>
      </div>
      <footer className="help-version">Version {GAME_VERSION}</footer>
    </div>
  </dialog>;
}
