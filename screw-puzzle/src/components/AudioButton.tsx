import type { AudioChannel } from "../game/audio";

export default function AudioButton({ channel, muted, onToggle }: {
  channel: AudioChannel; muted: boolean; onToggle: () => void;
}) {
  const label = channel === "music" ? "music" : "sound effects";
  return <button className="icon-button" onClick={onToggle}
    aria-label={`${muted ? "Unmute" : "Mute"} ${label}`} title={`${muted ? "Unmute" : "Mute"} ${label}`}>
    <svg viewBox="0 0 32 32" aria-hidden="true">
      {channel === "music" ? <path d="M12 23V8l13-3v15M12 12l13-3M12 23c0 2-2 3-4 3s-3-1-3-2 2-3 4-3 3 1 3 2Zm13-3c0 2-2 3-4 3s-3-1-3-2 2-3 4-3 3 1 3 2Z" /> :
        <path d="M5 12h5l6-5v18l-6-5H5z M21 12a6 6 0 0 1 0 8m4-12a11 11 0 0 1 0 16" />}
      {muted && <path d="M4 28 28 4" className="mute-slash" />}
    </svg>
  </button>;
}
