import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AudioButton from "../components/AudioButton";
import DesktopCursor from "../components/DesktopCursor";
import GameOverlay from "../components/GameOverlay";
import GameScene from "../components/GameScene";
import GameTimer from "../components/GameTimer";
import GameUI from "../components/GameUI";
import ResetDialog from "../components/ResetDialog";
import { createGameAudio } from "../game/audio";
import { DEMO_LEVEL } from "../game/levels";
import { canOpenBonusBox } from "../game/rules";
import type { PartId } from "../game/types";
import type { CameraView } from "../scene/camera";
import { useRoom } from "./useRoom";

const wallClock = { now: Date.now };

export default function OnlineGame({ onBack }: { onBack: () => void }) {
  const room = useRoom();
  const { snapshot, player, connected, send, clockOffset } = room;
  const id = snapshot?.id;
  const round = snapshot?.round ?? 0;
  const started = snapshot?.started ?? false;
  const leader = snapshot?.leader === player;
  const view = started ? "house" : "title";
  const scene = `${id}:${round}`;
  const [arrival, setArrival] = useState<{ view: CameraView; round: number }>();
  const [confirmReset, setConfirmReset] = useState(false);
  const [pingMode, setPingMode] = useState(false);
  const [expiredPing, setExpiredPing] = useState(0);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "manual">("idle");
  const [muted, setMuted] = useState(false);
  const [finished, setFinished] = useState<{ scene: string; parts: PartId[] }>();
  const audio = useRef<ReturnType<typeof createGameAudio> | null>(null);
  const lastSound = useRef({ scene, count: 0, matched: 0 });
  const lastReady = useRef("");
  const project = useRef<(id: string) => [number, number]>(() => [0, 0]);
  const cameraReady = arrival?.view === view && arrival.round === round;
  const game = useMemo(() => {
    if (!snapshot) return null;
    const { colors, removed, ...state } = snapshot.game;
    const removedIds = new Set(removed);
    return { ...state, screws: DEMO_LEVEL.map((screw, index) => ({
      ...screw, color: colors[index], removed: removedIds.has(screw.id),
    })) };
  }, [snapshot]);
  const fallStarts = useMemo(() => Object.fromEntries(Object.entries(snapshot?.fallStarts ?? {})
    .map(([part, at]) => [part, at - clockOffset])) as Partial<Record<PartId, number>>, [snapshot, clockOffset]);
  const fallingParts = (Object.keys(fallStarts) as PartId[])
    .filter((part) => finished?.scene !== scene || !finished.parts.includes(part));
  const orbitable = started && cameraReady && game?.status === "playing" && !confirmReset;
  const playable = orbitable && connected && !snapshot?.paused;
  const removed = snapshot?.game.removed.length ?? 0;
  const matched = room.matched;
  const blocked = useCallback(() => audio.current?.play("blocked"), []);
  const cameraArrived = useCallback((view: CameraView, round: number) => setArrival({ view, round }), []);
  const sceneReady = useCallback((round: number) => {
    lastReady.current = `${id}:${round}`;
    send({ type: "ready", round });
  }, [id, send]);
  const finishFall = useCallback((part: PartId, round: number) => {
    const key = `${id}:${round}`;
    setFinished((previous) => ({ scene: key, parts: previous?.scene === key ? [...previous.parts, part] : [part] }));
  }, [id]);
  useEffect(() => {
    if (id && connected && lastReady.current === scene) send({ type: "ready", round });
  }, [id, connected, scene, round, send]);
  useEffect(() => {
    const previous = lastSound.current;
    if (scene === previous.scene && removed > previous.count) audio.current?.play("remove");
    if (matched > previous.matched) audio.current?.play("match");
    lastSound.current = { scene, count: removed, matched };
  }, [scene, removed, matched]);
  useEffect(() => { if (room.blocked) blocked(); }, [room.blocked, blocked]);
  useEffect(() => { audio.current?.setPlaying(started); }, [started]);
  useEffect(() => () => {
    audio.current?.close();
    audio.current = null;
  }, []);
  useEffect(() => {
    if (!room.ping) return;
    const sequence = room.ping.sequence;
    const timer = window.setTimeout(() => setExpiredPing(sequence), 4800);
    return () => window.clearTimeout(timer);
  }, [room.ping]);

  function enableAudio() {
    try {
      audio.current ??= createGameAudio();
      audio.current.unlock();
    } catch {
      // A browser can deny audio while the room remains playable.
    }
  }
  function toggleAudio() {
    if (muted && started) {
      enableAudio();
      audio.current?.setPlaying(true);
    }
    audio.current?.setMuted(!muted);
    setMuted(!muted);
  }
  function open() {
    if (!muted) enableAudio();
    room.open();
  }
  function start() {
    if (!muted) enableAudio();
    send({ type: "start", round });
  }
  function leave() {
    room.leave();
    onBack();
  }
  function select(screw: string) {
    if (!playable) return;
    if (!muted) {
      enableAudio();
      audio.current?.setPlaying(true);
    }
    send({ type: "select", round, screw });
  }
  function reset() {
    setConfirmReset(false);
    setPingMode(false);
    send({ type: "reset", round });
  }
  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(location.href);
      setCopyState("copied");
    } catch {
      setCopyState("manual");
    }
  }
  const pingScrew = room.ping && room.ping.round === round && room.ping.sequence !== expiredPing
    ? game?.screws.find((screw) => screw.id === room.ping?.screw && !screw.removed) : undefined;
  const result = game?.status === "lost" ? "lost" : game?.status === "won" && !fallingParts.length ? "won" : null;
  const sampledAt = (snapshot?.serverTime ?? 0) - clockOffset;
  return <div className="game-layout" onContextMenu={(event) => event.preventDefault()}>
    {game && <GameScene key={id} logical={game} fallingParts={fallingParts} fallStarts={fallStarts} round={round}
      view={view} playable={playable} orbitable={orbitable} onCameraArrive={cameraArrived} onReady={sceneReady}
      onFallFinished={finishFall} onScrewSelect={select} onBlockedScrew={blocked} projectorRef={project}
      pingMode={pingMode} pingScrew={pingScrew} rejectedScrew={room.blocked}
      onScrewPing={(screw) => { send({ type: "ping", round, screw }); setPingMode(false); }} />}
    {!started && <section className="room-lobby" aria-label="Two-player room">
      <h2>Two-player room</h2>
      {snapshot ? <>
        <p role="status">{snapshot.players.filter((seat) => seat.connected).length} / 2 connected
          {connected ? leader ? " · You’re the leader" : " · Guest" : " · Reconnecting…"}</p>
        {leader && <button className="room-button" onClick={() => void copyInvite()}>{copyState === "copied" ? "Link copied" : "Copy invite link"}</button>}
        {copyState === "manual" && <input aria-label="Invite link" readOnly value={location.href} onFocus={(event) => event.target.select()} />}
        {leader && <button className="room-button" disabled={!snapshot.canStart || !connected || !cameraReady} onClick={start}>Start together</button>}
        {!leader && <p>Waiting for the leader to start.</p>}
      </> : <button className="room-button" onClick={open} disabled={room.connecting}>
        {room.connecting ? "Connecting…" : room.invite ? "Join game" : "Create game"}
      </button>}
      {room.error && <p role="status">{room.error}</p>}
      <button className="room-button secondary" onClick={leave}>{snapshot ? "Leave room" : "Back to solo"}</button>
    </section>}
    {started && snapshot && game && <>
      {cameraReady && <GameUI game={game} totalScrews={game.screws.length} removed={removed} frame={null}
        lifelines={snapshot.lifelines} canBoost={playable && leader && snapshot.lifelines > 0 && canOpenBonusBox(game)}
        onBoost={() => send({ type: "boost", round })} />}
      <GameTimer key={scene} clock={wallClock} startedAt={sampledAt - snapshot.elapsedMs}
        stoppedAt={snapshot.clockRunning ? room.disconnectedAt : sampledAt} />
      {leader && <button className="reset-button" disabled={!connected} onClick={() => setConfirmReset(true)} aria-label="Reset level and return to title" title="Reset / Quit">
        <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M8 10a10 10 0 1 1-2 10M8 4v7H2" /></svg>
      </button>}
      <GameOverlay mode={result} onStart={start} onRestart={leader && connected ? () => setConfirmReset(true) : undefined} />
      <div className="room-tools">
        <button className="room-button" onClick={leave}>Leave</button>
        {snapshot.players.length === 2 && <button className="room-button" aria-pressed={pingMode} disabled={!playable}
          onClick={() => setPingMode(!pingMode)}>{pingMode ? "Tap a screw" : "Ping screw"}</button>}
        <span className="room-status" role="status">{!connected ? room.error || "Reconnecting…" : snapshot.paused ? "Partner reconnecting…" :
          leader ? "Leader" : "Guest"}</span>
      </div>
    </>}
    {pingScrew && <span className="room-ping" role="status">Your partner pinged a {pingScrew.color} screw</span>}
    {confirmReset && leader && <ResetDialog onCancel={() => setConfirmReset(false)} onConfirm={reset} />}
    <AudioButton muted={muted} onToggle={toggleAudio} started={started} leader={leader} />
    <DesktopCursor />
  </div>;
}
