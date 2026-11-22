import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import SoloGame from "./components/SoloGame";
import type { SoloInitial } from "./components/SoloGame";
import HomeScene from "./components/HomeScene";
import LevelLoading from "./components/LevelLoading";
import GameOverlay from "./components/GameOverlay";
import GameControls from "./components/GameControls";
import LevelSelect from "./components/LevelSelect";
import DesktopCursor from "./components/DesktopCursor";
import { useGameAudio } from "./components/useGameAudio";
import OnlineGame from "./multiplayer/OnlineGame";
import { acquireLevel } from "./game/levelLoader";
import type { LevelLease } from "./game/levelLoader";
import { generateSoloPuzzle } from "./game/soloLevels";
import { clearSoloSave, readSoloSave, restoreSoloSave } from "./game/soloSave";
import { CAMPAIGN_LEVELS } from "./game/campaign";
import type { LevelId } from "./game/types";
import { soloRoute, soloRouteUrl } from "./game/soloRoute";
import { GAME_VERSION } from "./game/version";
import "./App.css";

type Session = { level: LevelId; initial: SoloInitial; lease: LevelLease };
export default function App() {
  const [online, setOnline] = useState(() => new URLSearchParams(location.search).has("room"));
  const [initialLevel] = useState(() => soloRoute(location.href));
  const [levelsOpen, setLevelsOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [pending, setPending] = useState<{ level: LevelId; stage?: string; error?: string } | null>(null);
  const requestRef = useRef(0);
  const audio = useGameAudio(Boolean(session));
  const { muted, toggle, enable } = audio;
  const sceneLoading = useCallback((level: LevelId, stage: string | null) => {
    setPending(previous => stage ? { level, stage } : previous?.level === level ? { ...previous, stage: "Ready" } : previous);
  }, []);
  const finishLoading = useCallback(() => setPending(previous => previous?.stage === "Ready" ? null : previous), []);
  useEffect(() => () => session?.lease.release(), [session]);
  useEffect(() => () => { requestRef.current++; }, []);
  function route(level: LevelId | null) { history.replaceState(history.state, "", soloRouteUrl(location.href, level)); }
  function cancelLoading() { requestRef.current++; route(null); setPending(null); setLevelsOpen(true); }
  async function selectLevel(level: LevelId, userAction = true) {
    const request = ++requestRef.current;
    route(level); setLevelsOpen(false); setPending({ level }); if (userAction) enable();
    let lease: LevelLease | undefined;
    try {
      // Paint the loader before synchronous geometry/puzzle work begins.
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      if (request !== requestRef.current) return;
      lease = await acquireLevel(level, stage => { if (request === requestRef.current) setPending({ level, stage }); });
      if (request !== requestRef.current) { lease.release(); return; }
      setPending({ level, stage: "Preparing puzzle" });
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      if (request !== requestRef.current) { lease.release(); return; }
      const save = readSoloSave(level), restored = save && restoreSoloSave(level, save);
      if (save && !restored) clearSoloSave(level);
      const puzzle = restored ?? (() => {
        const generated = generateSoloPuzzle(level, crypto.getRandomValues(new Uint32Array(1))[0]);
        return { game: generated.state, seed: generated.seed };
      })();
      setSession({ level, initial: puzzle, lease }); setPending({ level, stage: "Warming scene" });
    } catch {
      lease?.release();
      if (request === requestRef.current) setPending({ level, error: "This level couldn’t load. Check your connection and reload, or choose another level." });
    }
  }
  const resumeInitial = useEffectEvent(() => { if (initialLevel) void selectLevel(initialLevel, false); });
  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) resumeInitial(); });
    return () => { active = false; };
  }, []);
  if (online) return <OnlineGame onBack={levels => { setLevelsOpen(levels); setOnline(false); }} />;
  return <>{session ? <SoloGame level={session.level} initial={session.initial} audio={audio} onLoadingStage={sceneLoading}
    onExit={levels => { route(null); setPending(null); setSession(null); setLevelsOpen(levels); }} /> :
    <div className="game-layout home-layout" onContextMenu={event => event.preventDefault()}>
    <HomeScene />
    <GameOverlay mode={pending || levelsOpen ? null : "start"} onStart={() => setLevelsOpen(true)} />
    {levelsOpen && <LevelSelect onBack={() => setLevelsOpen(false)} onSelect={level => void selectLevel(level)} />}
    {!pending && !levelsOpen && <small className="home-version">v{GAME_VERSION}</small>}
    <GameControls home muted={muted} toggle={toggle} leaderboardLevel="cottage" showHomeActions={!pending && !levelsOpen}
      onMultiplayer={() => { route(null); setPending(null); setOnline(true); }} />
    <DesktopCursor />
  </div>}
    {pending && <LevelLoading key={pending.level} title={CAMPAIGN_LEVELS.find(item => item.id === pending.level)!.title}
      stage={pending.stage} error={pending.error} ready={pending.stage === "Ready"} onFinished={finishLoading}
      onCancel={session ? undefined : cancelLoading} />}
  </>;
}
