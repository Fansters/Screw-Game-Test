import type { RefObject } from "react";
import type { AudioChannel } from "../game/audio";
import AudioButton from "./AudioButton";
import { updateReadability, useReadability } from "./readability";
import { updatePreferences, usePreferences } from "./preferences";
import { DEFAULT_PREFERENCES } from "../game/preferences";

export default function SettingsDialog({ dialogRef, muted, toggle, onClose }: {
  dialogRef: RefObject<HTMLDialogElement | null>; muted: Record<AudioChannel, boolean>; toggle: (channel: AudioChannel) => void;
  onClose: () => void;
}) {
  const readability = useReadability();
  const preferences = usePreferences();
  return <dialog ref={dialogRef} id="game-settings" className="help-dialog settings-dialog" aria-labelledby="settings-title" onClose={onClose}>
    <header className="help-header"><div><small>Make yourself at home</small><h2 id="settings-title">Settings</h2></div>
      <form method="dialog"><button className="icon-button" aria-label="Close settings">×</button></form></header>
    <div className="help-content settings-content">
      <section aria-labelledby="settings-comfort"><h3 id="settings-comfort">Your view, your way</h3>
        {([{key:"uiScale",label:"UI size",min:85,max:115},{key:"rotation",label:"Camera rotation",min:40,max:160},{key:"zoom",label:"Zoom sensitivity",min:40,max:160}] as const).map(setting => <label className="preference-slider" key={setting.key}>
          <span>{setting.label}<output>{Math.round(preferences[setting.key]*100)}%</output></span>
          <input type="range" aria-label={setting.label} min={setting.min} max={setting.max} step={5} value={Math.round(preferences[setting.key]*100)} onChange={event => updatePreferences({...preferences,[setting.key]:Number(event.target.value)/100})} />
        </label>)}
        <button className="account-link" type="button" onClick={() => updatePreferences(DEFAULT_PREFERENCES)}>Restore view defaults</button>
        <p>Saved on this device. Your 3D world stays the same size.</p>
      </section>
      <section aria-labelledby="settings-audio"><h3 id="settings-audio">Sound & music</h3>
        {(["music", "effects"] as const).map(channel => <div className="setting-row" key={channel}>
          <AudioButton channel={channel} muted={muted[channel]} onToggle={() => toggle(channel)} />
          <div><strong>{channel === "music" ? "Background music" : "Sound effects"}</strong><small>{channel === "music" ? "A little chill while you puzzle" : "Screws, matches and little moments"}</small></div>
          <button type="button" role="switch" aria-checked={!muted[channel]} aria-label={channel === "music" ? "Background music" : "Sound effects"}
            className="setting-switch" onClick={() => toggle(channel)}><span aria-hidden="true" /></button>
        </div>)}
      </section>
      <section aria-labelledby="settings-visibility"><h3 id="settings-visibility">See every colour</h3>
        <label className="setting-row"><span className="setting-symbol" aria-hidden="true">◉</span><span><strong>High-contrast outlines</strong><small>Give screw heads a clearer edge</small></span>
          <input type="checkbox" checked={readability.outlines} onChange={event => updateReadability({ ...readability, outlines: event.target.checked })} /></label>
        <label className="setting-row"><span className="setting-symbol" aria-hidden="true">Aa</span><span><strong>Colour codes</strong><small>Short labels on screws and boxes</small></span>
          <input type="checkbox" checked={readability.labels} onChange={event => updateReadability({ ...readability, labels: event.target.checked })} /></label>
        <p>Visibility options are free and saved on this device.</p>
      </section>
      <form method="dialog"><button className="room-button settings-done">All set</button></form>
    </div>
  </dialog>;
}
