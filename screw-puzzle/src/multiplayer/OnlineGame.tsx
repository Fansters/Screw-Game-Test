import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import GameControls from "../components/GameControls";
import DesktopCursor from "../components/DesktopCursor";
import GameOverlay from "../components/GameOverlay";
import GameScene from "../components/GameScene";
import GameTimer from "../components/GameTimer";
import GameUI from "../components/GameUI";
import ResetDialog from "../components/ResetDialog";
import TransferOverlay from "../components/TransferOverlay";
import { useGameAudio } from "../components/useGameAudio";
import { DEMO_LEVEL } from "../game/levels";
import { canOpenBonusBox } from "../game/rules";
import type { PartId } from "../game/types";
import type { CameraView } from "../scene/camera";
import { useRoom } from "./useRoom";

const wallClock = { now: Date.now };

export default function OnlineGame({ onBack }: { onBack: () => void }) {
  const room = useRoom();
  const { snapshot, player, connected, send, clockOffset, frame } = room;
  const id = snapshot?.id;
  const round = snapshot?.round ?? 0;
  const started = snapshot?.started ?? false;
  const leader = snapshot?.leader === player;
  const view = started ? "house" : "title";
  const scene = `${id}:${round}`;
  const [arrival, setArrival] = useState<{ view: CameraView; round: number }>();
  const [confirmation, setConfirmation] = useState<"reset" | "leave" | null>(null);
  const [pingScene, setPingScene] = useState<string | null>(null);
  const [expiredPing, setExpiredPing] = useState(0);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "manual">("idle");
  const [finished, setFinished] = useState<{ scene: string; parts: PartId[] }>();
  const { play, muted, enable, toggle } = useGameAudio(started);
  const lastSound = useRef({ scene, count: 0, matched: 0 });
  const lastMatch = useRef<typeof frame>(null);
  const lastReady = useRef("");
  const project = useRef<(id: string) => [number, number]>(() => [0, 0]);
  const getOrigin = useCallback((id: string) => project.current(id), []);
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
  const orbitable = started && cameraReady && game?.status === "playing" && !confirmation;
  const playable = orbitable && connected && !snapshot?.paused;
  const canPing = playable && snapshot?.players.length === 2;
  const pingMode = canPing && pingScene === scene;
  const removed = snapshot?.game.removed.length ?? 0;
  const matched = room.matched;
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
    if (scene === previous.scene && removed > previous.count) play("remove");
    if (matched > previous.matched) play("match");
    lastSound.current = { scene, count: removed, matched };
  }, [play, scene, removed, matched]);
  useEffect(() => {
    if (frame?.kind !== "complete" || lastMatch.current === frame) return;
    lastMatch.current = frame;
    play("match");
  }, [frame, play]);
  useEffect(() => { if (room.blocked) play("blocked"); }, [room.blocked, play]);
  useEffect(() => {
    if (!room.ping) return;
    const sequence = room.ping.sequence;
    const timer = window.setTimeout(() => setExpiredPing(sequence), 4800);
    return () => window.clearTimeout(timer);
  }, [room.ping]);

  function open() {
    enable();
    room.open();
  }
  function start() {
    enable();
    send({ type: "start", round });
  }
  function leave() {
    room.leave();
    onBack();
  }
  function select(screw: string) {
    if (!playable) return;
    enable();
    send({ type: "select", round, screw });
  }
  function reset() {
    setConfirmation(null);
    setPingScene(null);
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
  const result = game?.status === "lost" ? "lost" : game?.status === "won" && !frame && !fallingParts.length ? "won" : null;
  const sampledAt = (snapshot?.serverTime ?? 0) - clockOffset;
  const completedLifeline = room.completedLifeline?.round === round ? room.completedLifeline.box : undefined;
  return <div className="game-layout" onContextMenu={(event) => event.preventDefault()}>
    {game && <GameScene key={id} logical={game} fallingParts={fallingParts} fallStarts={fallStarts} round={round}
      view={view} playable={playable} orbitable={orbitable} onCameraArrive={cameraArrived} onReady={sceneReady}
      onFallFinished={finishFall} onScrewSelect={select} onBlockedScrew={() => play("blocked")} projectorRef={project}
      pingMode={pingMode} pingScrew={pingScrew} pingSequence={room.ping?.sequence} rejectedScrew={room.blocked}
      onScrewPing={(screw) => { if (room.pingScrew(round, screw)) setPingScene(null); }} />}
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
      {!snapshot && <button className="room-button secondary" onClick={leave}>Back to solo</button>}
    </section>}
    {started && snapshot && game && <>
      <span className="room-status" role="status">
        {!connected ? room.error || "Reconnecting…" : snapshot.paused ? "Partner reconnecting…" : leader ? "Game Leader" : "Guest"}
      </span>
      {cameraReady && <>
        <GameUI game={frame?.game ?? game} frame={frame}
          lifelines={snapshot.lifelines} completedLifeline={completedLifeline}
          canBoost={playable && leader && !completedLifeline && !room.bonusAnimating && snapshot.lifelines > 0 && canOpenBonusBox(game)}
          onBoost={() => send({ type: "boost", round })}
          ping={snapshot.players.length === 2 && <button className="room-button" aria-pressed={pingMode} disabled={!canPing}
            onClick={() => setPingScene(pingMode ? null : scene)}>{pingMode ? "Tap a screw" : "Ping screw"}</button>} />
        <TransferOverlay frame={frame} getOrigin={getOrigin} />
      </>}
      <GameTimer key={scene} clock={wallClock} startedAt={sampledAt - snapshot.elapsedMs}
        stoppedAt={snapshot.clockRunning ? room.disconnectedAt : sampledAt} removed={removed} total={game.screws.length} />
      <GameOverlay mode={result} onStart={start} onRestart={leader && connected ? () => setConfirmation("reset") : undefined} />
    </>}
    {pingScrew && <span className="room-ping" role="status">{room.ping?.own ? "You" : "Your partner"} pinged a {pingScrew.color} screw</span>}
    {confirmation && (confirmation === "leave" || leader) && <ResetDialog action={confirmation}
      onCancel={() => setConfirmation(null)} onConfirm={confirmation === "leave" ? leave : reset} />}
    <GameControls muted={muted} toggle={toggle} onReset={started && leader ? () => setConfirmation("reset") : undefined}
      resetDisabled={!connected} onLeave={snapshot ? () => setConfirmation("leave") : undefined} />
    <DesktopCursor />
  </div>;
}
