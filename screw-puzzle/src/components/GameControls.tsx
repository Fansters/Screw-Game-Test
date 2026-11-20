import { useRef } from "react";
import type { AudioChannel } from "../game/audio";
import type { LevelId } from "../game/campaign";
import SettingsDialog from "./SettingsDialog";
import HelpDialog from "./HelpDialog";
import SoloLeaderboard from "./SoloLeaderboard";
import { useAccountCard } from "./accountContext";

const gearOutline = Array.from({ length: 32 }, (_, index) => {
  const angle = index * Math.PI / 16, radius = index % 4 === 1 || index % 4 === 2 ? 13 : 10;
  return `${16 + Math.cos(angle) * radius},${16 + Math.sin(angle) * radius}`;
}).join(" ");
const gear = <><polygon points={gearOutline} /><circle cx="16" cy="16" r="5" /></>;
const info = <path d="M16 10h.01M14 15h2v7m-2 0h4" />;
const person = <><circle cx="16" cy="11" r="5" /><path d="M6 27v-3a10 10 0 0 1 20 0v3" /></>;
const reset = <path d="M7 13a10 10 0 1 1 0 7M7 6v7h7" />;
const exit = <path d="M15 5H7a2 2 0 0 0-2 2v18a2 2 0 0 0 2 2h8m-3-11h15m-6-6 6 6-6 6" />;

export default function GameControls({ muted, toggle, onReset, onLeave, resetDisabled, leaderboardLevel = "cottage",
  home = false, showHomeActions = true, onMultiplayer }: {
  muted: Record<AudioChannel, boolean>; toggle: (channel: AudioChannel) => void;
  onReset?: () => void; onLeave?: () => void; resetDisabled?: boolean; leaderboardLevel?: LevelId;
  home?: boolean; showHomeActions?: boolean; onMultiplayer?: () => void;
}) {
  const help = useRef<HTMLDialogElement>(null), settings = useRef<HTMLDialogElement>(null), menu = useRef<HTMLDialogElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const account = useAccountCard();
  function showHelp() { help.current?.showModal(); if (help.current) help.current.scrollTop = 0; }
  function closeMenu() { menu.current?.close(); }
  const actionClass = home ? "room-button home-menu-button" : "menu-action";
  const helpButton = <button className={actionClass} type="button" onClick={showHelp} aria-label="How to play" aria-haspopup="dialog" aria-controls="game-help">
    <svg viewBox="0 0 32 32" aria-hidden="true">{info}</svg><span>How to play</span>
  </button>;
  const accountButton = <button className={`${actionClass} account-control`} type="button" aria-label="Player account" aria-haspopup="dialog" onClick={account.open}>
    <svg viewBox="0 0 32 32" aria-hidden="true">{person}</svg><span>{account.kind === "player" ? "My account" : "Login"}</span>
    {account.kind && <span className={`account-indicator ${account.kind}`} aria-hidden="true" />}
  </button>;
  const leaderboardButton = <SoloLeaderboard activeLevel={leaderboardLevel} launcherClass={actionClass} />;
  return <>
    <div className={`game-controls${home ? " home-controls" : ""}`} role="group" aria-label="Game controls">
      {home ? <button ref={launcher} className="icon-button settings-launch" type="button" onClick={() => settings.current?.showModal()}
        aria-label="Settings" title="Settings" aria-haspopup="dialog" aria-controls="game-settings"><svg viewBox="0 0 32 32" aria-hidden="true">{gear}</svg></button> :
        <button ref={launcher} className="icon-button game-menu-launch" type="button" aria-label="Open game menu" title="Game menu"
          aria-haspopup="dialog" aria-controls="game-menu" onClick={() => menu.current?.showModal()}>
          <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M7 9h18M7 16h18M7 23h18" /></svg>
        </button>}
    </div>
    {home && showHomeActions && <nav className="home-actions" aria-label="More ways to play">
      <button className={actionClass} type="button" onClick={onMultiplayer}>
        <svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="11" cy="11" r="4" /><path d="M3 26v-3a8 8 0 0 1 16 0v3m3-19a4 4 0 0 1 0 8m1 4a7 7 0 0 1 6 7" /></svg><span>Two-player game</span>
      </button>
      {helpButton}{accountButton}{leaderboardButton}
    </nav>}
    {!home && <dialog ref={menu} id="game-menu" className="help-dialog game-menu" aria-labelledby="game-menu-title">
      <header className="help-header"><h2 id="game-menu-title">Game Menu</h2></header>
      <div className="game-menu-content">
        <button className="room-button menu-resume" type="button" onClick={closeMenu} autoFocus><svg viewBox="0 0 32 32" aria-hidden="true"><path d="m11 7 14 9-14 9Z" /></svg><span>Keep playing</span></button>
        <div className="game-menu-actions">
          {onReset && <button className="menu-action" type="button" disabled={resetDisabled} onClick={() => { closeMenu(); onReset(); }} aria-label="Reset level">
            <svg viewBox="0 0 32 32" aria-hidden="true">{reset}</svg><span>Reset level</span></button>}
          {leaderboardButton}
          <button className="menu-action" type="button" onClick={() => settings.current?.showModal()} aria-label="Settings" aria-haspopup="dialog">
            <svg viewBox="0 0 32 32" aria-hidden="true">{gear}</svg><span>Settings</span></button>
          {helpButton}{accountButton}
          {onLeave && <button className="menu-action" type="button" onClick={() => { closeMenu(); onLeave(); }} aria-label="Exit game">
            <svg viewBox="0 0 32 32" aria-hidden="true">{exit}</svg><span>Exit game</span></button>}
        </div>
        <p className="menu-clock-note">The timer keeps running while you browse.</p>
      </div>
    </dialog>}
    <HelpDialog dialogRef={help} />
    <SettingsDialog dialogRef={settings} muted={muted} toggle={toggle} onClose={() => {
      if (!menu.current?.open) launcher.current?.focus();
    }} />
  </>;
}
