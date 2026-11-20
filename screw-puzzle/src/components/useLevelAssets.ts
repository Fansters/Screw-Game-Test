import { useEffect, useMemo, useState } from "react";
import type { LevelId } from "../game/types";
import { acquireLevel } from "../game/levelLoader";
export function useLevelAssets(level: LevelId | null) {
  const request = useMemo(() => ({ level }), [level]);
  const [state, setState] = useState<{ request: typeof request; ready: boolean; error?: string; stage?: string }>();
  useEffect(() => {
    if (!request.level) return;
    let active = true, release: (() => void) | undefined;
    void acquireLevel(request.level, stage => { if (active) setState({ request, ready: false, stage }); }).then(lease => {
      if (!active) { lease.release(); return; }
      release = lease.release; setState({ request, ready: true });
    }).catch(() => { if (active) setState({ request, ready: false, error: "This level couldn’t load. Check your connection and reload." }); });
    return () => { active = false; release?.(); };
  }, [request]);
  // A reconnect to the same level can see the previous ready state before its
  // effect runs. Match the acquisition request, not just the previous level ID.
  return level && state?.request === request ? state : null;
}
