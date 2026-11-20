import { useEffect, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent } from "react";
import { CAMPAIGN_LEVELS, levelStatus, readLevelProgress } from "../game/campaign";
import type { LevelId } from "../game/campaign";
import { LEVEL_PRESENTATION, savedScrewCount } from "../game/levelPresentation";
import { readSoloSave } from "../game/soloSave";

const horizontalQuery = "(min-width: 700px) and (min-height: 500px)";
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const arrow = <path d="m19 6-9 10 9 10" />;
const people = <><circle cx="12" cy="11" r="4" /><path d="M4 27v-3a8 8 0 0 1 16 0v3m2-20a4 4 0 0 1 0 8m2 4a7 7 0 0 1 4 6" /></>;

export default function LevelSelect({ onBack, onSelect, mode = "solo" }: {
  onBack: () => void; onSelect: (level: LevelId) => void; mode?: "solo" | "multiplayer";
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const track = useRef<HTMLOListElement>(null);
  const cards = useRef<(HTMLLIElement | null)[]>([]);
  const [completed] = useState(readLevelProgress);
  const [details] = useState(() => CAMPAIGN_LEVELS.map(({ id }) => ({
    save: mode === "solo" ? readSoloSave(id) : null,
  })));
  const [active, setActive] = useState(0);
  const frame = useRef(0);
  const navigation = useRef<number | null>(null);
  const stopSettling = useRef<() => void>(() => {});
  useEffect(() => {
    const element = dialog.current, list = track.current;
    element?.showModal();
    function nearestCard() {
      if (!list) return 0;
      const horizontal = window.matchMedia(horizontalQuery).matches;
      const box = list.getBoundingClientRect();
      const center = horizontal ? box.left + box.width / 2 : box.top + box.height / 2;
      let closest = 0, distance = Infinity;
      cards.current.forEach((card, index) => {
        if (!card) return;
        const bounds = card.getBoundingClientRect();
        const next = Math.abs((horizontal ? bounds.left + bounds.width / 2 : bounds.top + bounds.height / 2) - center);
        if (next < distance) { closest = index; distance = next; }
      });
      return closest;
    }
    function measure() { setActive(navigation.current ?? nearestCard()); }
    const changed = () => { cancelAnimationFrame(frame.current); frame.current = requestAnimationFrame(measure); };
    let wheelEnd: ReturnType<typeof setTimeout> | undefined;
    let suppressClick = false;
    let settling = false;
    let settleFrame = 0;
    stopSettling.current = () => {
      settling = false; cancelAnimationFrame(settleFrame);
      if (list) list.style.scrollSnapType = "";
    };
    let drag: { pointer: number; x: number; y: number; left: number; top: number; moved: boolean } | undefined;
    function finishSettle() {
      if (!list || !settling) return;
      settling = false; list.style.scrollSnapType = "";
      navigation.current = null; changed();
    }
    function settle() {
      if (!list) return;
      const index = nearestCard(), card = cards.current[index];
      if (!card) return;
      const bounds = card.getBoundingClientRect(), viewport = list.getBoundingClientRect();
      const horizontal = window.matchMedia(horizontalQuery).matches;
      const left = horizontal ? list.scrollLeft + bounds.left + bounds.width / 2 - viewport.left - viewport.width / 2 : 0;
      const top = horizontal ? 0 : list.scrollTop + bounds.top - viewport.top - 15;
      settling = true; navigation.current = index; setActive(index);
      // Keep native snap disabled until this animation finishes. Restoring it
      // on mouse-up makes Chromium immediately jump to a mandatory snap point.
      list.style.scrollSnapType = "none";
      if (reducedMotion() || Math.abs(list.scrollLeft - left) + Math.abs(list.scrollTop - top) < 1) {
        list.scrollTo({ left, top, behavior: "instant" }); finishSettle();
      } else {
        const fromLeft = list.scrollLeft, fromTop = list.scrollTop, start = performance.now();
        const animate = (now: number) => {
          if (!settling) return;
          const progress = Math.min(1, (now - start) / 320), eased = 1 - (1 - progress) ** 3;
          list!.scrollTo({ left: fromLeft + (left - fromLeft) * eased, top: fromTop + (top - fromTop) * eased, behavior: "instant" });
          if (progress < 1) settleFrame = requestAnimationFrame(animate);
          else finishSettle();
        };
        settleFrame = requestAnimationFrame(animate);
      }
    }
    function wheel(event: WheelEvent) {
      if (!list || !window.matchMedia(horizontalQuery).matches || event.ctrlKey) return;
      if (Math.abs(event.deltaX) >= Math.abs(event.deltaY)) {
        if (settling) stopSettling.current();
        return;
      }
      navigation.current = null;
      settling = false;
      cancelAnimationFrame(settleFrame);
      event.preventDefault();
      list.scrollTo({ left: list.scrollLeft, top: list.scrollTop, behavior: "instant" });
      list.style.scrollSnapType = "none";
      list.scrollLeft += event.deltaY * (event.deltaMode === 1 ? 18 : 1);
      clearTimeout(wheelEnd);
      wheelEnd = setTimeout(settle, 130);
    }
    function down(event: PointerEvent) {
      suppressClick = false;
      navigation.current = null;
      if (settling) stopSettling.current();
      if (!list || event.pointerType !== "mouse" || event.button !== 0 || (event.target instanceof Element && event.target.closest(".level-play-button"))) return;
      clearTimeout(wheelEnd); settling = false;
      cancelAnimationFrame(settleFrame);
      list.scrollTo({ left: list.scrollLeft, top: list.scrollTop, behavior: "instant" });
      drag = { pointer: event.pointerId, x: event.clientX, y: event.clientY, left: list.scrollLeft, top: list.scrollTop, moved: false };
    }
    function move(event: PointerEvent) {
      if (!list || !drag || event.pointerId !== drag.pointer) return;
      if (event.buttons === 0) { up(event); return; }
      const horizontal = window.matchMedia(horizontalQuery).matches;
      const delta = horizontal ? event.clientX - drag.x : event.clientY - drag.y;
      if (!drag.moved && Math.abs(delta) < 7) return;
      drag.moved = true; list.setPointerCapture(event.pointerId); list.style.scrollSnapType = "none"; list.dataset.dragging = "true";
      if (horizontal) list.scrollLeft = drag.left - delta;
      else list.scrollTop = drag.top - delta;
      event.preventDefault();
    }
    function up(event: PointerEvent) {
      if (!list || !drag || drag.pointer !== event.pointerId) return;
      suppressClick = drag.moved;
      const moved = drag.moved;
      drag = undefined; delete list.dataset.dragging;
      if (list.hasPointerCapture(event.pointerId)) list.releasePointerCapture(event.pointerId);
      if (moved) settle();
    }
    function click(event: MouseEvent) { if (suppressClick) { suppressClick = false; event.preventDefault(); event.stopPropagation(); } }
    function settled() { if (!settling && !drag) { navigation.current = null; changed(); } }
    list?.addEventListener("scroll", changed, { passive: true });
    list?.addEventListener("wheel", wheel, { passive: false });
    list?.addEventListener("pointerdown", down); list?.addEventListener("pointermove", move);
    list?.addEventListener("pointerup", up); list?.addEventListener("pointercancel", up); list?.addEventListener("click", click, true);
    list?.addEventListener("scrollend", settled);
    const resize = new ResizeObserver(changed);
    if (list) resize.observe(list);
    changed();
    return () => {
      element?.close(); list?.removeEventListener("scroll", changed); list?.removeEventListener("wheel", wheel);
      list?.removeEventListener("pointerdown", down); list?.removeEventListener("pointermove", move);
      list?.removeEventListener("pointerup", up); list?.removeEventListener("pointercancel", up); list?.removeEventListener("click", click, true);
      list?.removeEventListener("scrollend", settled);
      clearTimeout(wheelEnd); resize.disconnect(); cancelAnimationFrame(frame.current); cancelAnimationFrame(settleFrame);
      stopSettling.current = () => {};
    };
  }, []);

  function browse(index: number, keyboard = false) {
    stopSettling.current();
    const next = Math.max(0, Math.min(CAMPAIGN_LEVELS.length - 1, index));
    setActive(next);
    const card = cards.current[next], list = track.current;
    if (card && list) {
      // Cancel an old flight before starting a new one. Keep all movement inside
      // the gallery, rather than scrolling the dialog or page ancestors.
      list.scrollTo({ left: list.scrollLeft, top: list.scrollTop, behavior: "instant" });
      const bounds = card.getBoundingClientRect(), viewport = list.getBoundingClientRect();
      const horizontal = window.matchMedia(horizontalQuery).matches;
      navigation.current = next;
      list.scrollTo({ left: horizontal ? list.scrollLeft + bounds.left + bounds.width / 2 - viewport.left - viewport.width / 2 : 0,
        top: horizontal ? 0 : list.scrollTop + bounds.top - viewport.top - 15, behavior: reducedMotion() ? "instant" : "smooth" });
    }
    if (keyboard) card?.querySelector<HTMLButtonElement>("[data-level-preview]")?.focus({ preventScroll: true });
  }
  function keyNavigate(event: KeyboardEvent) {
    const horizontal = window.matchMedia(horizontalQuery).matches;
    const backwards = horizontal ? "ArrowLeft" : "ArrowUp", forwards = horizontal ? "ArrowRight" : "ArrowDown";
    if (event.key !== backwards && event.key !== forwards && event.key !== "Home" && event.key !== "End") return;
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    event.preventDefault();
    browse(event.key === "Home" ? 0 : event.key === "End" ? CAMPAIGN_LEVELS.length - 1 : active + (event.key === forwards ? 1 : -1), true);
  }

  return <dialog ref={dialog} className="help-dialog level-select level-gallery" aria-labelledby="level-select-title"
    onCancel={event => { event.preventDefault(); onBack(); }}>
    <header className="level-gallery-header">
      <h2 id="level-select-title">Choose your world</h2>
      <button className="icon-button" type="button" aria-label="Back from level select" onClick={onBack} autoFocus>×</button>
    </header>
    <ol ref={track} className="level-list" aria-label="Level previews" onKeyDown={keyNavigate}>
      {CAMPAIGN_LEVELS.map(({ id, title }, index) => {
        const playable = levelStatus(index) === "playable", { save } = details[index];
        const presentation = LEVEL_PRESENTATION[id], removed = savedScrewCount(save?.moves ?? []);
        const cleared = completed.has(id);
        const action = mode === "multiplayer" ? "Choose level" : save ? "Resume puzzle" : cleared ? "Play again" : "Let's play";
        return <li ref={node => { cards.current[index] = node; }} key={id} className={active === index ? "active-level" : ""}
          style={{ "--level-accent": presentation.accent } as CSSProperties}>
          <article className="level-card" aria-label={`Level ${index + 1}: ${title}`} onFocusCapture={() => setActive(index)}>
            <div className="level-card-top"><span className="level-number">Level {index + 1}</span>
              <span className={`level-badge${cleared ? " cleared" : ""}`}>{cleared ? "✓ Cleared" : save ? "◷ In progress" : "✦ Open"}</span></div>
            <button type="button" data-level-preview className="level-preview" aria-label={`Preview ${title}`}
              aria-pressed={active === index} onClick={() => browse(index)}>
              <img src={presentation.preview} alt={`${title} scene`} decoding="async" draggable={false} />
              <span className="level-preview-tag">{presentation.tag}</span>
            </button>
            <div className="level-card-copy"><h3>{title}</h3><p>{presentation.description}</p></div>
            <dl className="level-facts">
              <div><dt><svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="11" /><path d="M16 10v12M10 16h12" /></svg>Screws</dt><dd>{presentation.screws}</dd></div>
              <div><dt><svg viewBox="0 0 32 32" aria-hidden="true">{people}</svg>Mode</dt><dd>{mode === "multiplayer" ? "Co-op" : "Solo"}</dd></div>
            </dl>
            <div className="level-save-note">{mode === "multiplayer" ? "Two cameras · one shared puzzle" : save ? `${removed} / ${presentation.screws} screws · progress saved` : cleared ? "Another adventure? Chase the leaderboard." : "Fresh puzzle · all abilities included"}</div>
            {save && <div className="level-save-track" role="progressbar" aria-label={`${title} saved progress`} aria-valuemin={0} aria-valuemax={presentation.screws} aria-valuenow={removed}>
              <span style={{ width: `${Math.min(100, removed / presentation.screws * 100)}%` }} /></div>}
            <button className="level-play-button" type="button" disabled={!playable}
              aria-label={`${mode === "multiplayer" ? "Select" : save ? "Resume" : "Play"} ${title}`} onClick={() => onSelect(id)}>
              {playable ? action : "Coming soon"}<svg viewBox="0 0 32 32" aria-hidden="true"><path d="m12 7 10 9-10 9" /></svg></button>
          </article>
        </li>;
      })}
    </ol>
    <footer className="level-gallery-footer">
      <button className="icon-button level-previous" type="button" aria-label="Previous level" disabled={active === 0} onClick={() => browse(active - 1)}><svg viewBox="0 0 32 32" aria-hidden="true">{arrow}</svg></button>
      <div className="level-dots" aria-label="Go to level">{CAMPAIGN_LEVELS.map(({ id, title }, index) =>
        <button type="button" key={id} aria-label={`Show level ${index + 1}: ${title}`} aria-current={active === index ? "true" : undefined} onClick={() => browse(index)}><span /></button>)}</div>
      <button className="icon-button level-next" type="button" aria-label="Next level" disabled={active === CAMPAIGN_LEVELS.length - 1} onClick={() => browse(active + 1)}><svg viewBox="0 0 32 32" aria-hidden="true">{arrow}</svg></button>
      <span className="sr-only" role="status">Level {active + 1} of {CAMPAIGN_LEVELS.length}: {CAMPAIGN_LEVELS[active].title}</span>
    </footer>
  </dialog>;
}
