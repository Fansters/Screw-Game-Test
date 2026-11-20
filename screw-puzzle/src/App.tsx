import { useEffect, useRef, useState } from "react";
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
import "./App.css";

type Session = { level: LevelId; initial: SoloInitial; lease: LevelLease };
export default function App() {
  const [online, setOnline] = useState(() => new URLSearchParams(location.search).has("room"));
  const [levelsOpen, setLevelsOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [pending, setPending] = useState<{ level: LevelId; stage?: string; error?: string } | null>(null);
  const requestRef = useRef(0);
  const audio = useGameAudio(Boolean(session));
  const { muted, toggle, enable } = audio;
  useEffect(() => () => session?.lease.release(), [session]);
  useEffect(() => () => { requestRef.current++; }, []);
  function cancelLoading() { requestRef.current++; setPending(null); setLevelsOpen(true); }
  async function selectLevel(level: LevelId) {
    const request = ++requestRef.current;
    setLevelsOpen(false); setPending({ level }); enable();
    let lease: LevelLease | undefined;
    try {
      lease = await acquireLevel(level, stage => { if (request === requestRef.current) setPending({ level, stage }); });
      if (request !== requestRef.current) { lease.release(); return; }
      const save = readSoloSave(level), restored = save && restoreSoloSave(level, save);
      if (save && !restored) clearSoloSave(level);
      const puzzle = restored ?? (() => {
        const generated = generateSoloPuzzle(level, crypto.getRandomValues(new Uint32Array(1))[0]);
        return { game: generated.state, seed: generated.seed };
      })();
      setSession({ level, initial: puzzle, lease }); setPending(null);
    } catch {
      lease?.release();
      if (request === requestRef.current) setPending({ level, error: "This level couldn’t load. Check your connection and reload, or choose another level." });
    }
  }
  if (online) return <OnlineGame onBack={levels => { setLevelsOpen(levels); setOnline(false); }} />;
  if (session) return <SoloGame level={session.level} initial={session.initial} audio={audio} onExit={levels => { setSession(null); setLevelsOpen(levels); }} />;
  return <div className="game-layout" onContextMenu={event => event.preventDefault()}>
    <HomeScene />
    <GameOverlay mode={pending || levelsOpen ? null : "start"} onStart={() => setLevelsOpen(true)} />
    {levelsOpen && <LevelSelect onBack={() => setLevelsOpen(false)} onSelect={level => void selectLevel(level)} />}
    {pending && <LevelLoading title={CAMPAIGN_LEVELS.find(item => item.id === pending.level)!.title} stage={pending.stage} error={pending.error} onCancel={cancelLoading} />}
    {!pending && !levelsOpen && <div className="online-entry"><button className="room-button" onClick={() => setOnline(true)}>Two-player game</button></div>}
    <GameControls muted={muted} toggle={toggle} leaderboardLevel="cottage" />
    <DesktopCursor />
  </div>;
}
