export default function LevelLoading({ title, stage, error, onCancel }: { title: string; stage?: string; error?: string; onCancel?: () => void }) {
  return <section className="level-loading-card" aria-label={`Loading ${title}`}>
    {!error && <span className="loading-spinner" aria-hidden="true" />}
    <strong>{title}</strong><p role="status">{error ?? `${stage ?? "Preparing graphics"}…`}</p>
    {error && <button className="room-button" onClick={() => location.reload()}>Reload game</button>}
    {onCancel && <button className="room-button secondary" onClick={onCancel}>Back to levels</button>}
  </section>;
}
