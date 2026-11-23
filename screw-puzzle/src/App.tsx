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
import { restoreSoloSave } from "./game/soloSave";
import {useAccountCard} from "./components/accountContext";
import {useCloudProgress} from "./components/cloudContext";
import GuestProgressNotice from "./components/GuestProgressNotice";
import type {CloudSession} from "./game/cloudSession";
import { CAMPAIGN_LEVELS } from "./game/campaign";
import type { LevelId } from "./game/types";
import { soloRoute, soloRouteUrl } from "./game/soloRoute";
import { GAME_VERSION } from "./game/version";
import "./App.css";

type Session = { level: LevelId; initial: SoloInitial; lease: LevelLease; cloud?:CloudSession };
export default function App() {
  const account=useAccountCard(),cloud=useCloudProgress();
  const accountRef=useRef(account.playerId);accountRef.current=account.playerId;
  const previousAccount=useRef(account.playerId);
  const guestWarned=useRef(false);
  const [guestLevel,setGuestLevel]=useState<LevelId|null>(null);
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
    if(account.restoring)return;
    if(!account.playerId&&!guestWarned.current){setGuestLevel(level);setLevelsOpen(false);return;}
    const owner=account.playerId;
    const request = ++requestRef.current;
    route(level); setLevelsOpen(false); setPending({ level }); if (userAction) enable();
    let lease: LevelLease | undefined;
    try {
      const progress=owner?await cloud.begin(level):undefined;
      // Paint the loader before synchronous geometry/puzzle work begins.
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      if (request !== requestRef.current||accountRef.current!==owner) return;
      lease = await acquireLevel(level, stage => { if (request === requestRef.current) setPending({ level, stage }); });
      if (request !== requestRef.current||accountRef.current!==owner) { lease.release(); return; }
      setPending({ level, stage: "Preparing puzzle" });
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      if (request !== requestRef.current||accountRef.current!==owner) { lease.release(); return; }
      const save = progress?.initial.checkpoint, restored = save && restoreSoloSave(level, save);
      if(save&&!restored)throw Error("Saved puzzle does not match this layout");
      const puzzle = restored ?? (() => {
        const generated = generateSoloPuzzle(level, crypto.getRandomValues(new Uint32Array(1))[0]);
        return { game: generated.state, seed: generated.seed };
      })();
      setSession({ level, initial: puzzle, lease,cloud:progress }); setPending({ level, stage: "Warming scene" });
    } catch {
      lease?.release();
      if (request === requestRef.current) setPending({ level, error: owner?"Your cloud puzzle couldn’t load. Check your connection and reload, or return to level select.":"This level couldn’t load. Check your connection and reload, or choose another level." });
    }
  }
  const resumeInitial = useEffectEvent(() => { if (initialLevel) void selectLevel(initialLevel, false); });
  useEffect(() => {
    if(account.restoring)return;
    let active = true;
    queueMicrotask(() => { if (active) resumeInitial(); });
    return () => { active = false; };
  }, [account.restoring]);
  useEffect(()=>{
    if(account.restoring)return;
    const changed=previousAccount.current!==account.playerId;
    previousAccount.current=account.playerId;
    if(changed&&!session&&!pending)return;
    if(!changed&&(!session||(session.cloud?.playerId??null)===account.playerId))return;
    requestRef.current++;route(null);setPending(null);setSession(null);setLevelsOpen(true);
  },[account.playerId,account.restoring,session]);
  if (online) return <OnlineGame onBack={levels => { setLevelsOpen(levels); setOnline(false); }} />;
  return <>{session ? <SoloGame level={session.level} initial={session.initial} cloud={session.cloud} audio={audio} onLoadingStage={sceneLoading}
    onExit={levels => { route(null); setPending(null); setSession(null); setLevelsOpen(levels); }} /> :
    <div className="game-layout home-layout" onContextMenu={event => event.preventDefault()}>
    <HomeScene />
    <GameOverlay mode={pending || levelsOpen ? null : "start"} onStart={() => setLevelsOpen(true)} />
    {levelsOpen && <LevelSelect onBack={() => setLevelsOpen(false)} onSelect={level => void selectLevel(level)} />}
    {guestLevel&&<GuestProgressNotice onCancel={()=>{setGuestLevel(null);setLevelsOpen(true);}} onSignIn={()=>{setGuestLevel(null);account.open();}} onPlay={()=>{guestWarned.current=true;const level=guestLevel;setGuestLevel(null);void selectLevel(level);}}/>}
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
