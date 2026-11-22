import { useEffect, useState } from "react";

export default function ConnectionStatus({ connected, sample }: {
  connected: boolean; sample: { ms: number; at: number } | null;
}) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1500);
    return () => window.clearInterval(timer);
  }, []);
  const fresh = sample && now - sample.at < 15_000;
  const quality = !connected ? "offline" : !fresh ? "checking" : sample.ms < 100 ? "good" : sample.ms < 250 ? "fair" : "slow";
  const label = !connected ? "Reconnecting…" : !fresh ? "Checking…" : `${sample.ms} ms`;
  return <span className={`connection-status ${quality}`} title="Round-trip latency to the room server; not Wi-Fi signal strength"
    aria-label={`Room connection: ${label}`}>
    <span className="connection-dot" aria-hidden="true" />{label}
  </span>;
}
