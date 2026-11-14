export default function AudioButton({ muted, onToggle, started, leader = true }: {
  muted: boolean; onToggle: () => void; started: boolean; leader?: boolean;
}) {
  return <button className={`audio-button icon-button${started && leader ? " playing" : ""}`} onClick={onToggle}
    aria-label={muted ? "Unmute game audio" : "Mute game audio"} title={muted ? "Unmute" : "Mute"}>
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M5 12h5l6-5v18l-6-5H5z" />
      {muted ? <path d="m21 13 6 6m0-6-6 6" /> : <path d="M21 12a6 6 0 0 1 0 8m4-12a11 11 0 0 1 0 16" />}
    </svg>
  </button>;
}
