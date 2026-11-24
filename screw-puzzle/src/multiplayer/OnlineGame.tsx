import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import GameControls from "../components/GameControls";
import DesktopCursor from "../components/DesktopCursor";
import CoopResults from "../components/CoopResults";
import RoomIdentityCard from "../components/RoomIdentityCard";
import { useRoomIdentity } from "../components/useRoomIdentity";
import {useCloudProgress} from "../components/cloudContext";
import GameScene from "../components/GameScene";
import HomeScene from "../components/HomeScene";
import LevelLoading from "../components/LevelLoading";
import ConnectionStatus from "../components/ConnectionStatus";
import { useLevelAssets } from "../components/useLevelAssets";
import type { HintControls } from "../components/GameScene";
import AbilityButtons from "../components/AbilityButtons";
import GameTimer, { ScrewCounter } from "../components/GameTimer";
import GameBar from "../components/GameBar";
import GameUI from "../components/GameUI";
import ResetDialog from "../components/ResetDialog";
import LevelSelect from "../components/LevelSelect";
import TransferOverlay from "../components/TransferOverlay";
import { useGameAudio } from "../components/useGameAudio";
import { soloLevelTemplate } from "../game/soloLevels";
import { canOpenBonusBox } from "../game/rules";
import { CAMPAIGN_LEVELS, recordLevelClear } from "../game/campaign";
import type { LevelId, PartId } from "../game/types";
import type { CameraView } from "../scene/camera";
import { useRoom } from "./useRoom";
import { ROOM_PHYSICS_DELAY_MS } from "./protocol";
import { boxOwner } from "./boxOwnership";

const wallClock = { now: Date.now };

export default function OnlineGame({ onBack }: { onBack: (levels: boolean) => void }) {
  const room = useRoom();
  const { snapshot, player, connected, send, clockOffset, frame, onlineParts } = room;
  const looseNow = useCallback(() => Date.now() + clockOffset - ROOM_PHYSICS_DELAY_MS, [clockOffset]);
  const id = snapshot?.id;
  const round = snapshot?.round ?? 0;
  const started = snapshot?.started ?? false;
  const level = snapshot?.level ?? "cottage";
  const assets = useLevelAssets(snapshot?.level ?? null);
  const levelTitle = CAMPAIGN_LEVELS.find(({ id }) => id === level)!.title;
  const leader = snapshot?.leader === player;
  const view = started ? "house" : "title";
  const scene = `${id}:${round}`;
  const loadingKey = `${scene}:${view}`;
  const [loadedView, setLoadedView] = useState("");
  const finishLoading = useCallback(() => setLoadedView(loadingKey), [loadingKey]);
  const [arrival, setArrival] = useState<{ view: CameraView; round: number }>();
  const [confirmation, setConfirmation] = useState<"reset" | "leave" | null>(null);
  const [resetCameraSequence, setResetCameraSequence] = useState(0);
  const look = useRoomIdentity();
  const cloudProgress=useCloudProgress();
  const identityName = look.identity.name, identityAvatar = look.identity.avatar;
  useEffect(() => { if (snapshot && connected) send({type:"identity",identity:{name:identityName,avatar:identityAvatar}}); },[Boolean(snapshot),connected,send,identityName,identityAvatar]);
  const [levelsOpen, setLevelsOpen] = useState(false);
  const [pingScene, setPingScene] = useState<string | null>(null);
  const [expiredPing, setExpiredPing] = useState(0);
  const [expiredBlock, setExpiredBlock] = useState(0);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "manual">("idle");
  const [finished, setFinished] = useState<{ scene: string; parts: PartId[] }>();
  const [abilityMessage, setAbilityMessage] = useState("");
  const hintControlsRef = useRef<HintControls>({ find: () => null, show: () => false });
  useEffect(() => {
    if (!abilityMessage) return;
    const timer = window.setTimeout(() => setAbilityMessage(""), 3200);
    return () => window.clearTimeout(timer);
  }, [abilityMessage]);
  const { play, muted, enable, toggle } = useGameAudio(started);
  const lastSound = useRef({ scene, count: 0, matched: 0 });
  const lastMatch = useRef<typeof frame>(null);
  const lastReady = useRef("");
  const project = useRef<(id: string) => [number, number]>(() => [0, 0]);
  const getOrigin = useCallback((id: string) => project.current(id), []);
  const cameraReady = arrival?.view === view && arrival.round === round;
  const game = useMemo(() => {
    if (!snapshot || !assets?.ready) return null;
    const { colors, removed, ...state } = snapshot.game;
    const removedIds = new Set(removed);
    return { ...state, screws: soloLevelTemplate(snapshot.level).map((screw, index) => ({
      ...screw, color: colors[index], removed: removedIds.has(screw.id),
    })) };
  }, [snapshot, assets?.ready]);
  const fallingParts = (Object.keys(snapshot?.fallStarts ?? {}) as PartId[])
    .filter((part) => finished?.scene !== scene || !finished.parts.includes(part));
  const localReady = snapshot?.players.some((seat) => seat.id === player && seat.ready) ?? false;
  const orbitable = started && localReady && cameraReady && game?.status === "playing" && !confirmation;
  const playable = orbitable && connected && !snapshot?.paused;
  const canPing = playable && snapshot?.players.length === 2;
  const pingMode = canPing && pingScene === scene;
  const removed = snapshot?.game.removed.length ?? 0;
  const matched = room.matched;
  const won = game?.status === "won";
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
    if (won) {recordLevelClear(level);cloudProgress.markClear(level);}
  }, [won, scene, level, cloudProgress.markClear]);
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
    if (!room.blocked) return;
    const sequence = room.blocked.sequence;
    const timer = window.setTimeout(() => setExpiredBlock(sequence), 3600);
    return () => window.clearTimeout(timer);
  }, [room.blocked]);
  useEffect(() => {
    if (!room.ping) return;
    const sequence = room.ping.sequence;
    const timer = window.setTimeout(() => setExpiredPing(sequence), 4800);
    return () => window.clearTimeout(timer);
  }, [room.ping]);

  function open() {
    enable();
    if (room.invite) room.open();
    else setLevelsOpen(true);
  }
  function selectLevel(level: LevelId) {
    setLevelsOpen(false);
    enable();
    if (snapshot) send({ type: snapshot.game.status === "playing" ? "level" : "propose", round, level });
    else room.open(level);
  }
  function start() {
    enable();
    send({ type: "start", round });
  }
  function leave(levels = false) {
    room.leave();
    onBack(levels);
  }
  function select(screw: string) {
    if (!playable) return;
    enable();
    send({ type: "select", round, screw });
  }
  function reset(lobby = false) {
    setConfirmation(null);
    setPingScene(null);
    send({ type: "reset", round, lobby });
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
  const result = game?.status === "lost" && !frame ? "lost" : game?.status === "won" && !frame && !fallingParts.length ? "won" : null;
  const sampledAt = (snapshot?.serverTime ?? 0) - clockOffset;
  const completedLifeline = room.completedLifeline?.round === round ? room.completedLifeline.box : undefined;
  const revealed = Boolean(game && localReady && cameraReady);
  const owners = snapshot ? [0, 1, 2].map(slot => {
    const owner = boxOwner(snapshot.players, slot);
    return owner ? owner.id === player ? `P${owner.number} · You` : `P${owner.number}` : "Shared";
  }) : undefined;
  const hintColor = game?.screws.find(screw => screw.id === snapshot?.abilities.hint)?.color;
  const hintSlot = hintColor ? game?.boxes.findIndex(box => box?.color === hintColor) : undefined;
  const hintOwner = snapshot && hintSlot !== undefined && hintSlot >= 0 ? boxOwner(snapshot.players, hintSlot) : undefined;
  const blockNotice = room.blocked?.round === round && room.blocked.sequence !== expiredBlock ? room.blocked.reason : null;
  return <div className={`game-layout online-layout${revealed ? " level-revealed" : ""}`} onContextMenu={(event) => event.preventDefault()}>
    {!game && <HomeScene />}
    {snapshot && (loadedView !== loadingKey || !revealed) && <LevelLoading key={loadingKey} title={levelTitle}
      stage={assets?.ready ? localReady ? "Positioning camera" : "Warming scene" : assets?.stage} error={assets?.error}
      ready={revealed} onFinished={finishLoading} />}
    {game && <GameScene key={scene} level={level} logical={game} fallingParts={fallingParts} round={round}
      onlineParts={onlineParts} looseNow={looseNow} onLooseDismiss={(part) => send({ type: "dismiss", round, part })}
      resetCameraSequence={resetCameraSequence} view={view} playable={playable} orbitable={orbitable} onCameraArrive={cameraArrived} onReady={sceneReady}
      onFallFinished={finishFall} onScrewSelect={select} onBlockedScrew={() => play("blocked")} projectorRef={project}
      pingMode={pingMode} pingScrew={pingScrew} pingSequence={room.ping?.sequence} rejectedScrew={room.blocked?.round === round ? room.blocked : null}
      hint={snapshot?.abilities.hint} hintControlsRef={hintControlsRef}
      hintCollector={hintOwner ? hintOwner.id === player ? "Your match" : `Player ${hintOwner.number}'s match` : "Shared match"}
      onScrewPing={(screw) => { if (room.pingScrew(round, screw)) setPingScene(null); }} />}
    {!started && <section className="room-lobby" aria-label="Two-player room">
      <h2>Two-player room</h2>
      <RoomIdentityCard identity={look.identity} onChange={look.update} signedIn={Boolean(look.account.playerId)} onAccount={look.account.open}/>
      {snapshot ? <>
        <p className="room-level">{levelTitle}</p>
        <p className="room-rules">P1 takes the left box. P2 takes the right. Other colours wait in the shared slots; the extra box is shared too.</p>
        <p role="status">{snapshot.players.filter((seat) => seat.connected).length} / 2 connected
          {connected ? leader ? " · You’re the leader" : " · Guest" : " · Reconnecting…"}</p>
        {leader && <button className="room-button" onClick={() => void copyInvite()}>{copyState === "copied" ? "Link copied" : "Copy invite link"}</button>}
        {copyState === "manual" && <input aria-label="Invite link" readOnly value={location.href} onFocus={(event) => event.target.select()} />}
        {leader && <button className="room-button secondary" disabled={!connected} onClick={() => setLevelsOpen(true)}>Change level</button>}
        {leader && <button className="room-button" disabled={!snapshot.canStart || !connected || !cameraReady} onClick={start}>Start together</button>}
        {!leader && <p>Waiting for the leader to start.</p>}
      </> : <button className="room-button" onClick={open} disabled={room.connecting}>
        {room.connecting ? "Connecting…" : room.invite ? "Join game" : "Create game"}
      </button>}
      {room.error && <p role="status">{room.error}</p>}
      {!snapshot && <button className="room-button secondary" onClick={() => leave()}>Back to solo</button>}
    </section>}
    {levelsOpen && (!started || snapshot?.game.status !== "playing") && (!snapshot || leader || snapshot.game.status !== "playing") &&
      <LevelSelect mode="multiplayer" onBack={() => setLevelsOpen(false)} onSelect={selectLevel} />}
    {started && snapshot && game && <>
      <span className="room-status" role="status">
        {!connected ? room.error || "Reconnecting…" : snapshot.paused ? "Partner reconnecting…" : leader ? "Game Leader" : "Guest"}
      </span>
      {cameraReady && <>
        <GameUI game={frame?.game ?? game} frame={frame} waitingCount={game.tray.length}
          completedLifeline={completedLifeline} owners={owners} ownerProfiles={[0,1,2].map(slot=>boxOwner(snapshot.players,slot)?.id).map(id=>snapshot.players.find(seat=>seat.id===id)?.identity)} />
        <GameBar key={scene} level={level} lifelines={snapshot.lifelines} shared connection={<ConnectionStatus connected={connected} sample={room.latency} />}
          canResetCamera={orbitable} onResetCamera={() => setResetCameraSequence(sequence => sequence + 1)}
          progress={<ScrewCounter removed={removed} total={game.screws.length} />}
          timer={<GameTimer clock={wallClock} startedAt={sampledAt - snapshot.elapsedMs}
            stoppedAt={snapshot.clockRunning ? room.disconnectedAt : sampledAt} />}
          players={<ul className="player-counts" aria-label="Screws removed by each player">
            {[...snapshot.players].sort((a, b) => a.number - b.number).map((seat) =>
              <li key={seat.id} className={seat.id === player ? "own-score" : undefined}
                aria-label={`Player ${seat.number}${seat.id === player ? ", you" : ""}: ${seat.collected} screws`}>
                <span>P{seat.number}</span><strong>{seat.collected}</strong>
              </li>)}
          </ul>}
          abilities={<AbilityButtons abilities={snapshot.abilities} clockOffset={room.clockOffset} enabled={playable && leader} message={abilityMessage}
            onFind={() => {
              const screw = hintControlsRef.current.find();
              if (screw) send({ type: "find", round, screw });
              else setAbilityMessage("No reachable match yet. Reveal another part. No cooldown started.");
            }} />}
          canBoost={playable && leader && !completedLifeline && !room.bonusAnimating && snapshot.lifelines > 0 && canOpenBonusBox(game)}
          onBoost={() => send({ type: "boost", round })}
          ping={snapshot.players.length === 2 && <button className="navbar-ping-button" aria-pressed={pingMode} disabled={!canPing}
            aria-label={pingMode ? "Tap a screw to ping" : "Ping screw"} title={pingMode ? "Tap a screw" : "Ping screw"}
            onClick={() => setPingScene(pingMode ? null : scene)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" /><circle cx="12" cy="10" r="2.5" /></svg>
            <span>{pingMode ? "Tap a screw" : "Ping"}</span>
          </button>} />
        <TransferOverlay frame={frame} getOrigin={getOrigin} />
      </>}
      {result && <CoopResults snapshot={snapshot} player={player} connected={connected} send={send}
        syncError={won?cloudProgress.error:undefined} onRetrySave={()=>cloudProgress.markClear(level)}
        onLevels={()=>setLevelsOpen(true)} onHome={()=>setConfirmation("leave")}/>}
    </>}
    {pingScrew && !room.error && !blockNotice && <span className="room-ping" role="status">{room.ping?.own ? "You" : "Your partner"} pinged a {pingScrew.color} screw</span>}
    {started && (room.error || blockNotice) && <span className="room-ping" role="status">{room.error || blockNotice}</span>}
    {confirmation && (confirmation === "leave" || leader) && <ResetDialog action={confirmation} shared
      onCancel={() => setConfirmation(null)} onConfirm={() => confirmation === "leave" ? leave() : reset()}
      onLevels={confirmation === "leave" ? () => leave(true) : undefined} />}
    <GameControls muted={muted} toggle={toggle} leaderboardLevel={level} onReset={started && leader ? () => setConfirmation("reset") : undefined}
      resetDisabled={!connected} onLeave={snapshot ? () => setConfirmation("leave") : undefined} />
    <DesktopCursor />
  </div>;
}
