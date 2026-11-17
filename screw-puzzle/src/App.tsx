import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import GameScene from "./components/GameScene";
import GameUI from "./components/GameUI";
import TransferOverlay from "./components/TransferOverlay";
import GameOverlay from "./components/GameOverlay";
import GameTimer from "./components/GameTimer";
import DesktopCursor from "./components/DesktopCursor";
import ResetDialog from "./components/ResetDialog";
import GameControls from "./components/GameControls";
import LevelSelect from "./components/LevelSelect";
import { useGameAudio } from "./components/useGameAudio";
import OnlineGame from "./multiplayer/OnlineGame";
import type { CameraView } from "./scene/camera";
import type { PartId } from "./game/types";
import { generatePuzzle } from "./game/randomize";
import { createRun, currentFrame, runReducer } from "./animation/run";
import { canOpenBonusBox } from "./game/rules";
import { recordSoloTime } from "./game/leaderboard";
import { recordLevelClear } from "./game/campaign";
import type { LevelId } from "./game/campaign";
import "./App.css";

function freshPuzzle() { const seed = crypto.getRandomValues(new Uint32Array(1))[0]; return generatePuzzle(seed); }
function initialRun() { const puzzle = freshPuzzle(); return createRun(puzzle.state, puzzle.seed); }

export default function App() {
  const [online, setOnline] = useState(() => new URLSearchParams(location.search).has("room"));
  return online ? <OnlineGame onBack={() => setOnline(false)} /> : <SoloGame onOnline={() => setOnline(true)} />;
}

function SoloGame({ onOnline }: { onOnline: () => void }) {
  const [run, dispatch] = useReducer(runReducer, undefined, initialRun);
  const [arrival, setArrival] = useState<{ view: CameraView; round: number } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [levelsOpen, setLevelsOpen] = useState(false);
  const { play, muted, enable, toggle } = useGameAudio(run.started);
  const lastSoundMove = useRef({ round: run.round, count: 0 });
  const lastMatch = useRef("");
  const recordedRound = useRef(-1);
  const cameraArrived = useCallback((view: CameraView, round: number) => setArrival({ view, round }), []);
  const view = run.started ? "house" : "title";
  const cameraReady = arrival?.view === view && arrival.round === run.round;
  const playable = run.started && cameraReady && run.logical.status === "playing" && !confirmReset;
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
    if (removedCount > (previous.round === run.round ? previous.count : 0)) play("remove");
    lastSoundMove.current = { round: run.round, count: removedCount };
  }, [play, removedCount, run.round]);
  useEffect(() => {
    const key = `${jobId}:${index}`;
    if (frame?.kind !== "complete" || lastMatch.current === key) return;
    lastMatch.current = key;
    play("match");
  }, [play, frame?.kind, jobId, index]);
  const { round, timerStartedAt, timerStoppedAt } = run;
  const won = run.logical.status === "won";
  useEffect(() => {
    if (!won || recordedRound.current === round) return;
    recordedRound.current = round;
    recordLevelClear("cottage");
    if (timerStartedAt !== null && timerStoppedAt !== null) recordSoloTime(timerStoppedAt - timerStartedAt);
  }, [won, round, timerStartedAt, timerStoppedAt]);

  function restart() {
    setConfirmReset(false);
    setLevelsOpen(false);
    const puzzle = freshPuzzle();
    dispatch({ type: "reset", game: puzzle.state, seed: puzzle.seed });
  }
  function startLevel(level: LevelId) {
    if (level !== "cottage") return;
    setLevelsOpen(false);
    enable();
    dispatch({ type: "start" });
  }
  function selectScrew(id: string, clearedParts?: readonly PartId[]) {
    if (playable) dispatch({ type: "select", id, now: performance.now(), clearedParts });
  }
  const mode = !run.ready ? "loading" : !run.started ? (cameraReady ? "start" : null) : run.logical.status === "lost" && !run.jobs.length ? "lost" :
    run.logical.status === "won" && !run.jobs.length && !run.fallingParts.length ? "won" : null;
  const chooseLevel = mode === "start" && levelsOpen;
  return <div className="game-layout" onContextMenu={(event) => event.preventDefault()}>
    <GameScene logical={run.logical} fallingParts={run.fallingParts} round={run.round} onFallFinished={finishFall}
      releases={run.releases} onLooseDismiss={(part) => dispatch({ type: "dismiss", part, now: performance.now() })}
      view={view} onCameraArrive={cameraArrived} playable={playable} onReady={sceneReady} onScrewSelect={selectScrew}
      onBlockedScrew={() => play("blocked")} projectorRef={project} />
    {run.started && cameraReady && <GameUI game={run.display} frame={frame}
      lifelines={run.lifelines}
      canBoost={playable && bonusJob === null && run.lifelines > 0 && canOpenBonusBox(run.logical)}
      onBoost={() => dispatch({ type: "boost", now: performance.now() })} />}
    {run.started && <GameTimer key={run.round} startedAt={run.timerStartedAt} stoppedAt={run.timerStoppedAt} removed={removedCount} total={run.logical.screws.length} />}
    <TransferOverlay frame={frame} getOrigin={getOrigin} />
    <GameOverlay mode={chooseLevel ? null : mode} onStart={() => setLevelsOpen(true)} onRestart={restart}
      onLevels={() => { restart(); setLevelsOpen(true); }}
      elapsedMs={timerStartedAt === null || timerStoppedAt === null ? undefined : timerStoppedAt - timerStartedAt} />
    {chooseLevel && <LevelSelect onBack={() => setLevelsOpen(false)} onSelect={startLevel} />}
    {mode === "start" && !levelsOpen && <div className="online-entry"><button className="room-button" onClick={onOnline}>Two-player game</button></div>}
    <GameControls muted={muted} toggle={toggle} showLeaderboard onReset={run.started ? () => setConfirmReset(true) : undefined} />
    {confirmReset && <ResetDialog onCancel={() => setConfirmReset(false)} onConfirm={restart} />}
    <DesktopCursor />
  </div>;
}
