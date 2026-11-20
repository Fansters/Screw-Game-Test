export default function LevelLoading({ title, stage, error, onCancel }: { title: string; stage?: string; error?: string; onCancel?: () => void }) {
  const progress = stage?.includes("puzzle") ? "72%" : stage?.includes("geometry") ? "46%" : stage?.includes("scene") || stage?.includes("camera") ? "90%" : "18%";
  return <div className="level-loading-screen"><section className="level-loading-card" aria-label={`Loading ${title}`} aria-busy={!error}>
    {!error && <div className="screw-loader" aria-hidden="true"><span className="loader-screw">+</span><span className="loader-screw">+</span><span className="loader-screw">+</span></div>}
    <small>{error ? "A little snag" : "Getting things screwed in"}</small>
    <strong>{title}</strong>
    {!error && <div className="screw-loading-track" role="progressbar" aria-label="Preparing level" aria-valuetext={stage ?? "Downloading level"}><span style={{ width: progress }} /><i aria-hidden="true">+</i></div>}
    <p role="status">{error ?? `${stage ?? "Preparing graphics"}…`}</p>
    {error && <button className="room-button" onClick={() => location.reload()}>Reload game</button>}
    {onCancel && <button className="room-button secondary" onClick={onCancel}>Back to levels</button>}
  </section></div>;
}
