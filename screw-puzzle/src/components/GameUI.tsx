import type { CSSProperties, ReactNode } from "react";
import { SCREW_COLORS } from "../game/colors";
import { BONUS_SLOT, MATCH_SIZE, TRAY_CAPACITY } from "../game/rules";
import type { CollectionState, MatchBox } from "../game/types";
import type { PlaybackFrame } from "../animation/sequence";
export default function GameUI({ game, frame, lifelines, canBoost, onBoost, ping, completedLifeline }: {
  game: CollectionState; frame: PlaybackFrame<CollectionState> | null;
  lifelines: number; canBoost: boolean; onBoost: () => void; ping?: ReactNode; completedLifeline?: MatchBox;
}) {
  const boxes = completedLifeline && !game.boxes[BONUS_SLOT] ? [...game.boxes, completedLifeline] : game.boxes;
  const boosted = Boolean(boxes[BONUS_SLOT]);
  return <>
    <aside className={`game-ui${boosted ? " boosted" : ""}`} aria-label="Screw collection">
      <div className="match-boxes" aria-label="Active matching boxes">
        {boxes.map((box, slot) => {
          if (!box) return <div className="box-space" key={`empty-${slot}`} />;
          const appearance = SCREW_COLORS[box.color];
          const bonus = slot === BONUS_SLOT;
          const effect = box === completedLifeline ? " completed-on-open" : frame?.slot === slot ? frame.kind === "complete" ? " completing" :
            frame.kind === "replace" || frame.kind === "bonus-open" ? " arriving" : "" : "";
          return <section key={box.id} className={`match-box${bonus ? " lifeline-box" : ""}${effect}`}
            style={{ "--screw-color": appearance.color, "--recess-color": appearance.recess } as CSSProperties}
            aria-label={`${appearance.label} ${bonus ? "lifeline" : "matching"} box: ${box.screws.length} of ${MATCH_SIZE}`}>
            <div className="match-sockets" aria-hidden="true">{Array.from({ length: MATCH_SIZE }, (_, index) => {
              const entry = box.screws[index];
              return <span key={index} className="match-socket" data-socket={`box-${slot}-${index}`}>
                {entry && <b className="socket-screw" key={entry.screwId}>+</b>}
              </span>;
            })}</div>
          </section>;
        })}
      </div>
      <ol className="tray" aria-label="Five free screw slots">{Array.from({ length: TRAY_CAPACITY }, (_, index) => {
        const entry = game.tray[index];
        const appearance = entry ? SCREW_COLORS[entry.color] : null;
        const flying = frame?.kind === "fly" && frame.from?.kind === "tray" && frame.from.index === index;
        return <li key={index} aria-label={`Slot ${index + 1}: ${appearance?.label ?? "Free"}`}>
          <span className="free-socket" data-socket={`tray-${index}`}
            style={appearance ? { "--screw-color": appearance.color, "--recess-color": appearance.recess } as CSSProperties : undefined} aria-hidden="true">
            {entry && <b className={`socket-screw${flying ? " in-flight" : ""}`} key={entry.screwId}>+</b>}
          </span>
        </li>;
      })}</ol>
    </aside>
    <div className="game-dock">
      <button className="lifeline-button icon-button" onClick={onBoost} disabled={!canBoost}
        aria-label={`Open a lifeline box, ${lifelines} remaining`} title="Add a matching box">
        <svg viewBox="0 0 32 32" aria-hidden="true"><path d="m17 4-9 14h7l-1 10 10-15h-8z" /></svg>
        <span>{lifelines}</span>
      </button>
      {ping && <div className="dock-ping">{ping}</div>}
    </div>
  </>;
}
