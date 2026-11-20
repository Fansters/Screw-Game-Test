import { useEffect, useEffectEvent, useRef, useState } from "react";
type TurnstileApi = {
  render: (node: HTMLElement, options: { sitekey: string; theme: string; size: string; callback: (token: string) => void;
    "expired-callback": () => void; "error-callback": () => void }) => string;
  remove: (id: string) => void;
};
declare global { interface Window { turnstile?: TurnstileApi } }
let scriptPromise: Promise<TurnstileApi> | undefined;
function loadWidget() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  return scriptPromise ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    const timer = window.setTimeout(() => { script.remove(); reject(new Error("Verification timed out")); }, 15000);
    script.onload = () => { clearTimeout(timer); if (window.turnstile) resolve(window.turnstile); else reject(new Error("Verification unavailable")); };
    script.onerror = () => { clearTimeout(timer); script.remove(); reject(new Error("Verification unavailable")); };
    document.head.append(script);
  }).catch(error => { scriptPromise = undefined; throw error; });
}
export default function Turnstile({ siteKey, onToken }: { siteKey: string; onToken: (token: string | null) => void }) {
  const root = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const changed = useEffectEvent(onToken);
  useEffect(() => {
    let alive = true, id: string | undefined, api: TurnstileApi | undefined;
    void loadWidget().then(widget => {
      if (!alive || !root.current) return;
      api = widget;
      id = widget.render(root.current, { sitekey: siteKey, theme: "light", size: matchMedia("(max-width: 380px)").matches ? "compact" : "normal",
        callback: token => { if (alive) { setError(false); changed(token); } },
        "expired-callback": () => { if (alive) changed(null); },
        "error-callback": () => { if (alive) { setError(true); changed(null); } },
      });
    }).catch(() => { if (alive) { setError(true); changed(null); } });
    return () => { alive = false; if (id && api) api.remove(id); };
  }, [siteKey, retry]);
  return <div className="account-verification"><div ref={root} />{error && <p role="status">Verification couldn’t load. <button type="button" className="account-link" onClick={() => { setError(false); setRetry(n => n + 1); }}>Try again</button></p>}</div>;
}
