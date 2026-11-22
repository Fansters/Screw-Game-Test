import type { CSSProperties } from "react";
import { SCREW_COLORS } from "../game/colors";
import { BONUS_SLOT, MATCH_SIZE, TRAY_CAPACITY } from "../game/rules";
import type { CollectionState, MatchBox } from "../game/types";
import type { PlaybackFrame } from "../animation/sequence";
import { COLOR_CODES } from "../game/colorLabels";
import { useReadability } from "./readability";
import ScrewCross from "./ScrewCross";
export default function GameUI({ game, frame, completedLifeline, waitingCount = game.tray.length, owners }: {
  game: CollectionState; frame: PlaybackFrame<CollectionState> | null;
  waitingCount?: number; completedLifeline?: MatchBox;
  owners?: readonly string[];
}) {
  const readability = useReadability();
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
            aria-label={`${owners?.[slot] ? `${owners[slot]}, ` : ""}${appearance.label} ${bonus ? "lifeline" : "matching"} box: ${box.screws.length} of ${MATCH_SIZE}`}>
            {owners && <span className="box-owner">{owners[slot]}</span>}
            {readability.labels && <span className="box-color-code">{COLOR_CODES[box.color]}</span>}
            <div className="match-sockets" aria-hidden="true">{Array.from({ length: MATCH_SIZE }, (_, index) => {
              const entry = box.screws[index];
              return <span key={index} className="match-socket" data-socket={`box-${slot}-${index}`}>
                {entry && <b className="socket-screw" key={entry.screwId}><ScrewCross /></b>}
              </span>;
            })}</div>
          </section>;
        })}
      </div>
      <ol className={`tray${waitingCount >= TRAY_CAPACITY - 1 ? " tray-warning" : ""}`} aria-label="Five free screw slots">{Array.from({ length: TRAY_CAPACITY }, (_, index) => {
        const entry = game.tray[index];
        const appearance = entry ? SCREW_COLORS[entry.color] : null;
        const flying = frame?.kind === "fly" && frame.from?.kind === "tray" && frame.from.index === index;
        return <li key={index} aria-label={`Slot ${index + 1}: ${appearance?.label ?? "Free"}`}>
          <span className="free-socket" data-socket={`tray-${index}`}
            style={appearance ? { "--screw-color": appearance.color, "--recess-color": appearance.recess } as CSSProperties : undefined} aria-hidden="true">
            {entry && <b className={`socket-screw${flying ? " in-flight" : ""}`} key={entry.screwId}><ScrewCross /></b>}
          </span>
        </li>;
      })}</ol>
      {waitingCount === TRAY_CAPACITY - 1 && <span className="sr-only" role="status">One free slot remaining</span>}
    </aside>
  </>;
}
