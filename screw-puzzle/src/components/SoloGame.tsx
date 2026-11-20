import { useCallback, useEffect, useEffectEvent, useReducer, useRef, useState } from "react";
import GameScene from "./GameScene";
import type { HintControls } from "./GameScene";
import AbilityButtons from "./AbilityButtons";
import { queuePreviews } from "../game/abilities";
import GameUI from "./GameUI";
import TransferOverlay from "./TransferOverlay";
import GameOverlay from "./GameOverlay";
import GameTimer from "./GameTimer";
import GameBar from "./GameBar";
import DesktopCursor from "./DesktopCursor";
import ResetDialog from "./ResetDialog";
import GameControls from "./GameControls";
import LevelLoading from "./LevelLoading";
import type { useGameAudio } from "./useGameAudio";
import type { CameraView } from "../scene/camera";
import type { PartId } from "../game/types";
import { generateSoloPuzzle } from "../game/soloLevels";
import { createRun, currentFrame, elapsedRunTime, runReducer } from "../animation/run";
import { canOpenBonusBox } from "../game/rules";
import { recordSoloTime } from "../game/leaderboard";
import { CAMPAIGN_LEVELS, recordLevelClear } from "../game/campaign";
import type { LevelId } from "../game/campaign";


import { clearSoloSave, writeSoloSave } from "../game/soloSave";
import type { GameState } from "../game/types";
import type { RunCheckpoint } from "../animation/run";
export type SoloInitial = { game: GameState; seed: number; checkpoint?: RunCheckpoint };
function freshPuzzle(level: LevelId) { return generateSoloPuzzle(level, crypto.getRandomValues(new Uint32Array(1))[0]); }

export default function SoloGame({ level, initial, audio, onExit }: { level: LevelId; initial: SoloInitial; audio: ReturnType<typeof useGameAudio>; onExit: (levels: boolean) => void }) {
  const [run, dispatch] = useReducer(runReducer, initial, saved => ({ ...createRun(saved.game, saved.seed), ...saved.checkpoint, started: true }));
  const [arrival, setArrival] = useState<{ view: CameraView; round: number } | null>(null);
  const [confirmation, setConfirmation] = useState<"reset" | "leave" | null>(null);

  const [abilityMessage, setAbilityMessage] = useState("");
  const hintControlsRef = useRef<HintControls>({ find: () => null, show: () => false });
  useEffect(() => {
    if (!abilityMessage) return;
    const timer = window.setTimeout(() => setAbilityMessage(""), 3200);
    return () => window.clearTimeout(timer);
  }, [abilityMessage]);
  const { play, muted, toggle } = audio;
  const lastSoundMove = useRef({ round: run.round, count: 0 });
  const lastMatch = useRef("");
  const recordedRound = useRef(-1);
  const cameraArrived = useCallback((view: CameraView, round: number) => setArrival({ view, round }), []);
  const view = run.round === 0 && !run.ready ? "title" : "house";
  const cameraReady = arrival?.view === view && arrival.round === run.round;
  const playable = run.started && run.ready && cameraReady && run.logical.status === "playing" && !confirmation;
  const project = useRef<(id: string) => [number, number]>(() => [0, 0]);
  const getOrigin = useCallback((id: string) => project.current(id), []);
  const sceneReady = useCallback((round: number) => dispatch({ type: "ready", round }), []);
  const finishFall = useCallback((part: PartId, round: number) => dispatch({ type: "fall-finished", part, round }), []);
  const frame = currentFrame(run);
  const job = run.jobs[0];
  const jobId = job?.id;
  const readyAt = job?.readyAt;
  const duration = frame?.duration;
  const index = run.frameIndex;
  const { bonusJob } = run;
  const removedCount = run.logical.screws.filter((screw) => screw.removed).length;
  // Appending another click does not restart the currently playing animation timer.
  useEffect(() => {
    if (jobId === undefined || readyAt === undefined) return;
    const delay = index === -1 ? Math.max(0, readyAt - performance.now()) : duration ?? 0;
    const timer = window.setTimeout(() => dispatch(index === -1 ? { type: "begin", job: jobId } :
      { type: "advance", job: jobId, index }), delay);
    return () => window.clearTimeout(timer);
  }, [jobId, readyAt, duration, index]);
  useEffect(() => {
    const previous = lastSoundMove.current;
    if (previous.round === run.round && removedCount > previous.count) play("remove");
    lastSoundMove.current = { round: run.round, count: removedCount };
  }, [play, removedCount, run.round]);
  useEffect(() => {
    const key = `${jobId}:${index}`;
    if (frame?.kind !== "complete" || lastMatch.current === key) return;
    lastMatch.current = key;
    play("match");
  }, [play, frame?.kind, jobId, index]);
  const { round, timerStartedAt, timerStoppedAt, elapsedBefore, ready, started, moves } = run;
  const won = run.logical.status === "won";
  const elapsedOnWin = timerStoppedAt === null ? null : elapsedRunTime(run, timerStoppedAt);
  useEffect(() => {
    if (!won || recordedRound.current === round) return;
    recordedRound.current = round;
    recordLevelClear(level);
    if (elapsedOnWin !== null) recordSoloTime(elapsedOnWin, level);
  }, [won, round, level, elapsedOnWin]);

  function saveProgress() {
    if (run.logical.status !== "playing") return;
    writeSoloSave(level, { seed: run.seed, moves, elapsedMs: Math.round(elapsedRunTime(run, performance.now())),
      legacyTitanicLayout: run.legacyTitanicLayout });
  }
  const saveCheckpoint = useEffectEvent(saveProgress);
  const running = started && ready && run.logical.status === "playing";
  useEffect(() => {
    if (running) saveCheckpoint();
    else if (started && run.logical.status !== "playing") clearSoloSave(level);
  }, [running, started, run.logical.status, level, moves]);
  useEffect(() => {
    if (playable) dispatch({ type: "resume-clock", now: performance.now(), round });
  }, [playable, round]);
  useEffect(() => {
    if (!running) return;
    const onHide = () => { if (document.visibilityState === "hidden") saveCheckpoint(); };
    const onPageHide = () => saveCheckpoint();
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onPageHide);
    const interval = window.setInterval(saveCheckpoint, 5000);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onPageHide);
      window.clearInterval(interval);
    };
  }, [running]);

  function returnToTitle(openLevels = false) { setConfirmation(null); onExit(openLevels); }
  function restart() {
    clearSoloSave(level);
    setConfirmation(null);
    const puzzle = freshPuzzle(level);
    dispatch({ type: "reset", game: puzzle.state, seed: puzzle.seed, enter: true });
  }
  function selectScrew(id: string, clearedParts?: readonly PartId[]) {
    if (playable) dispatch({ type: "select", id, now: performance.now(), clearedParts });
  }
  const mode = !run.ready ? null : run.logical.status === "lost" && !run.jobs.length ? "lost" :
    run.logical.status === "won" && !run.jobs.length && !run.fallingParts.length ? "won" : null;

  const revealed = run.ready && cameraReady;
  return <div className={`game-layout solo-layout${revealed ? " level-revealed" : ""}`} onPointerDownCapture={() => audio.enable()} onContextMenu={(event) => event.preventDefault()}>
    <GameScene level={level} logical={run.logical} fallingParts={run.fallingParts} round={run.round} onFallFinished={finishFall}
      releases={run.releases} onLooseDismiss={(part) => dispatch({ type: "dismiss", part, now: performance.now() })}
      view={view} onCameraArrive={cameraArrived} playable={playable} onReady={sceneReady} onScrewSelect={selectScrew}
      onBlockedScrew={() => play("blocked")} projectorRef={project} hint={run.abilities.hint} hintControlsRef={hintControlsRef} />
    {!revealed && <LevelLoading title={CAMPAIGN_LEVELS.find(({ id }) => id === level)!.title} stage={run.ready ? "Positioning camera" : "Warming scene"} />}
    {run.started && cameraReady && <><GameUI game={run.display} frame={frame} waitingCount={run.logical.tray.length}
      previews={run.abilities.peekAt !== null ? queuePreviews(run.logical) : undefined} />
      <GameBar key={run.round} level={level} lifelines={run.lifelines}
      progress={<GameTimer startedAt={timerStartedAt} stoppedAt={timerStoppedAt}
        elapsedBefore={elapsedBefore} removed={removedCount} total={run.logical.screws.length} />}
      abilities={<AbilityButtons abilities={run.abilities} enabled={playable} message={abilityMessage}
        canPeek={queuePreviews(run.logical).some(Boolean)}
        onFind={() => {
          const screw = hintControlsRef.current.find();
          if (screw) dispatch({ type: "find", screw });
          else setAbilityMessage("No reachable match yet. Try revealing another part. No use spent!");
        }} onPeek={() => dispatch({ type: "peek" })} />}
      canBoost={playable && bonusJob === null && run.lifelines > 0 && canOpenBonusBox(run.logical)}
      onBoost={() => dispatch({ type: "boost", now: performance.now() })} /></>}
    <TransferOverlay frame={frame} getOrigin={getOrigin} />
    <GameOverlay mode={mode} onStart={() => {}} onRestart={restart}
      onLevels={() => returnToTitle(true)} levelTitle={CAMPAIGN_LEVELS.find(({ id }) => id === level)!.title}
      elapsedMs={elapsedOnWin ?? undefined} />
    <GameControls muted={muted} toggle={toggle} leaderboardLevel={level} onReset={run.started ? () => setConfirmation("reset") : undefined}
      onLeave={run.started ? () => setConfirmation("leave") : undefined} />
    {confirmation && <ResetDialog action={confirmation} onCancel={() => setConfirmation(null)}
      onConfirm={confirmation === "reset" ? restart : () => { saveProgress(); returnToTitle(); }}
      onLevels={confirmation === "leave" ? () => { saveProgress(); returnToTitle(true); } : undefined} />}
    <DesktopCursor />
  </div>;
}
