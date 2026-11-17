import { useCallback, useEffect, useEffectEvent, useReducer, useRef, useState } from "react";
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
import { generateSoloPuzzle } from "./game/soloLevels";
import { createRun, currentFrame, elapsedRunTime, runReducer } from "./animation/run";
import { canOpenBonusBox } from "./game/rules";
import { recordSoloTime } from "./game/leaderboard";
import { recordLevelClear } from "./game/campaign";
import type { LevelId } from "./game/campaign";
import { clearSoloSave, readSoloSave, restoreSoloSave, writeSoloSave } from "./game/soloSave";
import "./App.css";

function freshPuzzle(level: LevelId = "cottage") {
  const seed = crypto.getRandomValues(new Uint32Array(1))[0];
  return generateSoloPuzzle(level, seed);
}
function initialRun() { const puzzle = freshPuzzle(); return createRun(puzzle.state, puzzle.seed); }

export default function App() {
  const [online, setOnline] = useState(() => new URLSearchParams(location.search).has("room"));
  return online ? <OnlineGame onBack={() => setOnline(false)} /> : <SoloGame onOnline={() => setOnline(true)} />;
}

function SoloGame({ onOnline }: { onOnline: () => void }) {
  const [run, dispatch] = useReducer(runReducer, undefined, initialRun);
  const [level, setLevel] = useState<LevelId>("cottage");
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
  const playable = run.started && run.ready && cameraReady && run.logical.status === "playing" && !confirmReset;
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

  function returnToTitle(openLevels = false) {
    setConfirmReset(false);
    setLevelsOpen(openLevels);
    setLevel("cottage");
    const puzzle = freshPuzzle();
    dispatch({ type: "reset", game: puzzle.state, seed: puzzle.seed });
  }
  function restart() {
    clearSoloSave(level);
    returnToTitle();
  }
  function startLevel(selected: LevelId) {
    setLevelsOpen(false);
    enable();
    const save = readSoloSave(selected);
    const restored = save && restoreSoloSave(selected, save);
    if (save && !restored) clearSoloSave(selected);
    setLevel(selected);
    if (restored) dispatch({ type: "reset", ...restored, enter: true });
    else if (selected === "cottage" && !run.started) dispatch({ type: "start" });
    else {
      const puzzle = freshPuzzle(selected);
      dispatch({ type: "reset", game: puzzle.state, seed: puzzle.seed, enter: true });
    }
  }
  function selectScrew(id: string, clearedParts?: readonly PartId[]) {
    if (playable) dispatch({ type: "select", id, now: performance.now(), clearedParts });
  }
  const mode = !run.ready ? "loading" : !run.started ? (cameraReady ? "start" : null) : run.logical.status === "lost" && !run.jobs.length ? "lost" :
    run.logical.status === "won" && !run.jobs.length && !run.fallingParts.length ? "won" : null;
  const chooseLevel = mode === "start" && levelsOpen;
  return <div className="game-layout" onContextMenu={(event) => event.preventDefault()}>
    <GameScene level={level} logical={run.logical} fallingParts={run.fallingParts} round={run.round} onFallFinished={finishFall}
      releases={run.releases} onLooseDismiss={(part) => dispatch({ type: "dismiss", part, now: performance.now() })}
      view={view} onCameraArrive={cameraArrived} playable={playable} onReady={sceneReady} onScrewSelect={selectScrew}
      onBlockedScrew={() => play("blocked")} projectorRef={project} />
    {run.started && cameraReady && <GameUI game={run.display} frame={frame}
      lifelines={run.lifelines}
      canBoost={playable && bonusJob === null && run.lifelines > 0 && canOpenBonusBox(run.logical)}
      onBoost={() => dispatch({ type: "boost", now: performance.now() })} />}
    {run.started && run.ready && <GameTimer key={run.round} startedAt={timerStartedAt} stoppedAt={timerStoppedAt}
      elapsedBefore={elapsedBefore} removed={removedCount} total={run.logical.screws.length} />}
    <TransferOverlay frame={frame} getOrigin={getOrigin} />
    <GameOverlay mode={chooseLevel ? null : mode} onStart={() => setLevelsOpen(true)} onRestart={restart}
      onLevels={() => returnToTitle(true)} levelTitle={level === "titanic" ? "Titanic" : "The cottage"}
      elapsedMs={elapsedOnWin ?? undefined} />
    {chooseLevel && <LevelSelect onBack={() => setLevelsOpen(false)} onSelect={startLevel} />}
    {mode === "start" && !levelsOpen && <div className="online-entry"><button className="room-button" onClick={onOnline}>Two-player game</button></div>}
    <GameControls muted={muted} toggle={toggle} leaderboardLevel={level} onReset={run.started ? () => setConfirmReset(true) : undefined} />
    {confirmReset && <ResetDialog onCancel={() => setConfirmReset(false)} onConfirm={restart}
      onSave={running ? () => { saveProgress(); returnToTitle(true); } : undefined} />}
    <DesktopCursor />
  </div>;
}
