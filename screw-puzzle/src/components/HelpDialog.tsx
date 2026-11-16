import type { ReactNode, RefObject } from "react";
import { LIFELINE_COUNT } from "../animation/run";
import { ACTIVE_BOX_COUNT, MATCH_SIZE, TRAY_CAPACITY } from "../game/rules";

const GAME_VERSION = "0.1.0";

const icons = {
  goal: <path d="M8 4h8v5a4 4 0 0 1-8 0V4ZM8 6H4v2a4 4 0 0 0 4 4m8-6h4v2a4 4 0 0 1-4 4m-4 1v5m-4 2h8" />,
  screw: <><circle cx="12" cy="12" r="8" /><path d="m9 9 6 6m0-6-6 6" /></>,
  match: <><rect x="3" y="3" width="18" height="18" rx="4" /><path d="M12 8h.01M8 15h.01M16 15h.01" strokeWidth="3.5" /></>,
  tray: <><rect x="2.5" y="7" width="19" height="10" rx="3" /><path d="M7 12h.01m5 0h.01m5 0h.01" strokeWidth="3" /></>,
  lifeline: <path d="m13 3-8 11h6l-1 7 9-11h-6l1-7Z" fill="currentColor" strokeWidth="1" />,
  orbit: <><circle cx="12" cy="12" r="2" /><path d="M19 8a8 8 0 1 0 1 6m0-10v5h-5" /></>,
  preview: <path d="M8 4H4v4m12-4h4v4M4 16v4h4m12-4v4h-4M9 12h6m-3-3v6" />,
  peek: <><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.5" /></>,
  team: <><path d="M3 20v-2a4 4 0 0 1 4-4h3a4 4 0 0 1 4 4v2m2-6a4 4 0 0 1 5 4v2" /><circle cx="8.5" cy="7.5" r="3.5" /><path d="M16 4a3.5 3.5 0 0 1 0 7" /></>,
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
      <div className="help-goal">
        <HelpIcon name="goal" />
        <p><strong>Let’s take this cottage apart!</strong> Get every screw out and clear every matching box to win.</p>
      </div>
      <div className="help-tips">
        <HelpTip icon="screw" title="Twist one out">
          Tap or click an exposed screw to pull it out. Pull the last one on a part and down it goes, revealing more of the cottage.
        </HelpTip>
        <HelpTip icon="match" title="Match a triple">
          You start with {ACTIVE_BOX_COUNT} colored boxes. Collect {MATCH_SIZE} screws of the same color to clear a box and bring in the next one.
        </HelpTip>
        <HelpTip icon="tray" title="Keep a slot free">
          Screws without a matching box wait in one of the {TRAY_CAPACITY} slots. They hop over when their box opens. If every slot stays full, you lose.
        </HelpTip>
        <HelpTip icon="lifeline" title="Call in a lifeline">
          The lightning button opens one extra box, favoring a color in your waiting slots. It closes when full. You have {LIFELINE_COUNT} charges per round.
        </HelpTip>
        <HelpTip icon="orbit" title="Find a better angle">
          Drag to turn the cottage. Scroll or pinch to zoom. Right-drag or use two fingers to slide your view sideways.
        </HelpTip>
        <HelpTip icon="preview" title="Preview a part">
          Hold a screw to outline the part it holds. The preview shows how many screws are still holding it in place.
        </HelpTip>
        <HelpTip icon="peek" title="Peek behind a part">
          Tap the part itself to see through it. Tap it again to restore it or tap another part to switch. Covered screws still need a clear path.
        </HelpTip>
        <HelpTip icon="team" title="Team up">
          Share the puzzle and control your own camera. Use <strong>Ping screw</strong> to guide your partner. The Game Leader starts and resets the round and uses lifelines.
        </HelpTip>
      </div>
      <footer className="help-version">Version {GAME_VERSION}</footer>
    </div>
  </dialog>;
}
