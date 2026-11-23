import { useCallback, useEffect, useEffectEvent, useReducer, useRef, useState, useSyncExternalStore } from "react";
import { useAccountCard } from "./accountContext";
import { queueFinish } from "../online/casualScores";
import { casualBoardId } from "../game/casualLeaderboard";
import FinishLeaderboard from "./OnlineFinishNotice";
import type { FinishReceipt } from "./OnlineLeaderboard";
import { LIFELINE_COUNT } from "../animation/run";
import GameScene from "./GameScene";
import type { HintControls } from "./GameScene";
import AbilityButtons from "./AbilityButtons";
import GameUI from "./GameUI";
import TransferOverlay from "./TransferOverlay";
import GameOverlay from "./GameOverlay";
import GameTimer from "./GameTimer";
import GameBar from "./GameBar";
import DesktopCursor from "./DesktopCursor";
import ResetDialog from "./ResetDialog";
import GameControls from "./GameControls";
import type { useGameAudio } from "./useGameAudio";
import type { CameraView } from "../scene/camera";
import type { PartId } from "../game/types";
import { generateSoloPuzzle } from "../game/soloLevels";
import { createRun, currentFrame, elapsedRunTime, runReducer } from "../animation/run";
import { canOpenBonusBox } from "../game/rules";
import { CAMPAIGN_LEVELS, recordLevelClear } from "../game/campaign";
import type { LevelId } from "../game/campaign";


import type { CloudSession } from "../game/cloudSession";
import CloudSaveGuard from "./CloudSaveGuard";
import type { GameState } from "../game/types";
import type { RunCheckpoint } from "../animation/run";
import { LOOSE_LIFETIME_MS, SMOKE_DURATION_MS } from "../scene/loosePhysics";
export type SoloInitial = { game: GameState; seed: number; checkpoint?: RunCheckpoint };
function freshPuzzle(level: LevelId) { return generateSoloPuzzle(level, crypto.getRandomValues(new Uint32Array(1))[0]); }

const noSubscription=()=>()=>{};
const guestStatus=()=>"saved" as const;
export default function SoloGame({ level, initial, cloud, audio, onExit, onLoadingStage }: {
  level: LevelId; initial: SoloInitial; audio: ReturnType<typeof useGameAudio>; onExit: (levels: boolean) => void;
  onLoadingStage: (level: LevelId, stage: string | null) => void;
  cloud?:CloudSession;
}) {
  const { playerId } = useAccountCard();
  const cloudStatus=useSyncExternalStore(cloud?.subscribe??noSubscription,cloud?.status??guestStatus);
  const cloudBlocked=cloudStatus==="offline"||cloudStatus==="retrying"||cloudStatus==="moved";
  const [finishedRun, setFinishedRun] = useState<(FinishReceipt & {round:number}) | null>(null);
  const [run, dispatch] = useReducer(runReducer, initial, saved => ({ ...createRun(saved.game, saved.seed), ...saved.checkpoint, started: true }));
  const [arrival, setArrival] = useState<{ view: CameraView; round: number } | null>(null);
  const [confirmation, setConfirmation] = useState<"reset" | "leave" | null>(null);
  const [resetCameraSequence, setResetCameraSequence] = useState(0);

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
  const playable = run.started && run.ready && cameraReady && run.logical.status === "playing" && !confirmation && !cloudBlocked;
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
  useEffect(() => {
    if (!run.ready || !run.started || run.logical.status !== "playing" || run.jobs.length || run.fallingParts.length) return;
    const settledAt = Math.max(0, ...Object.values(run.releases).map(release => release ? (release.dismissedAt ?? release.releasedAt + LOOSE_LIFETIME_MS) + SMOKE_DURATION_MS : 0));
    const timer = window.setTimeout(() => dispatch({ type: "check-dead-end", round: run.round, now: performance.now() }), Math.max(0, settledAt - performance.now()) + 80);
    return () => window.clearTimeout(timer);
  }, [run.ready, run.started, run.logical, run.jobs.length, run.fallingParts.length, run.releases, run.lifelines, run.round]);
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
    if (elapsedOnWin !== null) {
      // Capture identity only on the first winning render; never claim guest history.
      const upload = playerId ? queueFinish(playerId,{runId:run.runId,boardId:casualBoardId(level),level,elapsedMs:Math.round(elapsedOnWin),
        extraBoxUses:LIFELINE_COUNT-run.lifelines,findMatchUses:run.abilities.findUses,resumed:run.resumed,
        screwCount:run.logical.screws.length}) : Promise.resolve();
      void upload.then(() => setFinishedRun(previous => previous && previous.round > round ? previous : {runId:run.runId,playerId,round,error:false}))
        .catch(() => setFinishedRun(previous => previous && previous.round > round ? previous : {runId:run.runId,playerId,round,error:true}));
    }
  }, [won, round, level, elapsedOnWin, playerId, run.runId, run.lifelines, run.abilities.findUses, run.resumed, run.logical.screws.length]);

  function saveProgress() {
    if (run.logical.status !== "playing") return;
    cloud?.submit({ runId: run.runId, seed: run.seed, moves, elapsedMs: Math.round(elapsedRunTime(run, performance.now())),
      findReadyAt: run.abilities.findReadyAt });
  }
  const saveCheckpoint = useEffectEvent(saveProgress);
  const running = started && ready && run.logical.status === "playing";
  useEffect(() => {
    if (running) saveCheckpoint();
    else if (started && run.logical.status !== "playing") cloud?.submit(null,run.logical.status==="won");
  }, [running, started, run.logical.status, level, moves, cloud]);
  useEffect(()=>()=>saveCheckpoint(),[cloud,level]);
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
  useEffect(() => {
    onLoadingStage(level, revealed ? null : run.ready ? "Positioning camera" : "Warming scene");
  }, [level, revealed, run.ready, onLoadingStage]);
  return <div className={`game-layout solo-layout${revealed ? " level-revealed" : ""}`} onPointerDownCapture={() => audio.enable()} onContextMenu={(event) => event.preventDefault()}>
    <GameScene level={level} resetCameraSequence={resetCameraSequence} logical={run.logical} fallingParts={run.fallingParts} round={run.round} onFallFinished={finishFall}
      releases={run.releases} onLooseDismiss={(part) => dispatch({ type: "dismiss", part, now: performance.now() })}
      view={view} onCameraArrive={cameraArrived} playable={playable} onReady={sceneReady} onScrewSelect={selectScrew}
      onBlockedScrew={() => play("blocked")} projectorRef={project} hint={run.abilities.hint} hintControlsRef={hintControlsRef} />
    {run.started && cameraReady && mode !== "won" && <><GameUI game={run.display} frame={frame} waitingCount={run.logical.tray.length} />
      <GameBar key={run.round} level={level} lifelines={run.lifelines}
      canResetCamera={playable} onResetCamera={() => setResetCameraSequence(sequence => sequence + 1)}
      progress={<><GameTimer startedAt={timerStartedAt} stoppedAt={timerStoppedAt}
        elapsedBefore={elapsedBefore} removed={removedCount} total={run.logical.screws.length} /><small className="cloud-save-status" role="status">{cloud?cloudStatus==="saved"?"Cloud saved":cloudStatus==="saving"?"Saving…":"Cloud paused":"Guest · not saved"}</small></>}
      abilities={<AbilityButtons abilities={run.abilities} enabled={playable} message={abilityMessage}
        onFind={() => {
          const screw = hintControlsRef.current.find();
          if (screw) dispatch({ type: "find", screw, now: Date.now() });
          else setAbilityMessage("No reachable match yet. Reveal another part. No cooldown started.");
        }} />}
      canBoost={playable && bonusJob === null && run.lifelines > 0 && canOpenBonusBox(run.logical)}
      onBoost={() => dispatch({ type: "boost", now: performance.now() })} /></>}
    <TransferOverlay frame={frame} getOrigin={getOrigin} />
    <GameOverlay mode={mode} lossReason={run.logical.lossReason} onStart={() => {}} onRestart={restart}
      onLevels={() => returnToTitle(true)} onHome={() => returnToTitle(false)} levelTitle={CAMPAIGN_LEVELS.find(({ id }) => id === level)!.title}
      elapsedMs={elapsedOnWin ?? undefined} finishNotice={<FinishLeaderboard level={level} elapsedMs={elapsedOnWin ?? 0}
        receipt={finishedRun?.round === round ? finishedRun : undefined} />} />
    <GameControls muted={muted} toggle={toggle} leaderboardLevel={level} onReset={run.started ? () => setConfirmation("reset") : undefined}
      onLeave={run.started ? () => setConfirmation("leave") : undefined} />
    {confirmation && <ResetDialog action={confirmation} onCancel={() => setConfirmation(null)}
      onConfirm={confirmation === "reset" ? restart : () => { saveProgress(); returnToTitle(); }}
      onLevels={confirmation === "leave" ? () => { saveProgress(); returnToTitle(true); } : undefined} />}
    {cloud&&cloudBlocked&&<CloudSaveGuard session={cloud} status={cloudStatus} onLevels={()=>returnToTitle(true)} onHome={()=>returnToTitle(false)}/>}
    <DesktopCursor />
  </div>;
}
